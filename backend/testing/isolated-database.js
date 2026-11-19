/* global __dirname */
// Infraestrutura exclusiva de testes/demonstração; não altera tabelas existentes.
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

async function createIsolatedDatabase(mode = 'test') {
    if (!['test', 'demo'].includes(mode)) throw new Error('Modo de banco isolado inválido.');
    const schema = `inventario_${mode}_${randomBytes(12).toString('hex')}`;
    // Nunca carrega db.js/.env ou usa a conexão principal implicitamente.
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error('Defina TEST_DATABASE_URL de um banco descartável separado; não use o banco principal.');
    const target = new URL(url);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
        || !/^\/inventario_test_[a-z0-9_]+$/.test(target.pathname)) {
        throw new Error('Testes exigem banco local separado inventario_test_* .');
    }
    const connectionOptions = { connectionString: url, connectionTimeoutMillis: 5000 };
    const admin = new Pool({ ...connectionOptions, max: 1 });
    const pool = new Pool({ ...connectionOptions, max: 2, options: `-c search_path=${schema}` });
    let created = false;
    let closed = false;
    const close = async () => {
        if (closed) return;
        closed = true;
        try {
            await pool.end();
            if (created) {
                // Identificador criado internamente, nunca vindo de entrada externa.
                if (!/^inventario_(test|demo)_[0-9a-f]{24}$/.test(schema)) throw new Error('Schema temporário inválido.');
                await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
            }
        } finally {
            await admin.end();
        }
    };
    try {
        await admin.query(`CREATE SCHEMA "${schema}"`);
        created = true;
        const sql = await fs.readFile(path.join(__dirname, '../sql/001_create_tables.sql'), 'utf8');
        await pool.query(sql);
        await pool.query(await fs.readFile(path.join(__dirname, '../sql/002_submission_idempotency.sql'), 'utf8'));
        await pool.query(await fs.readFile(path.join(__dirname, '../sql/003_admin_privacy_and_sectors.sql'), 'utf8'));
        await pool.query(await fs.readFile(path.join(__dirname, '../sql/004_admin_mega_sectors.sql'), 'utf8'));
        await pool.query(await fs.readFile(path.join(__dirname, '../sql/005_participation_mega_sector.sql'), 'utf8'));
        await require('../sector-catalog').importSectorCatalog(pool);
        await pool.query('INSERT INTO setores (nome) VALUES ($1)', ['Setor fictício de demonstração']);
        await pool.query(`
            INSERT INTO periodos_coleta (nome, data_inicio, data_fim) VALUES
            ($1, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day'),
            ($2, CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '2 days'),
            ($3, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
        `, ['Período fictício vigente', 'Período fictício futuro', 'Período fictício encerrado']);
        return { pool, close, schema };
    } catch (error) {
        await close();
        throw error;
    }
}

module.exports = { createIsolatedDatabase };
