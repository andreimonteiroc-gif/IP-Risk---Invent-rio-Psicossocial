const { once } = require('node:events');
const { createInterface } = require('node:readline');
const { createIsolatedDatabase } = require('../testing/isolated-database');
const { createApp } = require('../app');
const { createCorsServer } = require('../cors-server');
const { hashPassword } = require('../admin-auth');
const { loadAdminAccounts } = require('../admin-config');
const { publishPeriod } = require('../admin-publication');

const DEMO_SUPERADMIN = {
    usuario: 'wellington.moreira',
    nome: 'Wellington Moreira',
    senha: 'DemoSuperAdmin2026!',
    papel: 'gerenciador',
};
const { catalog, importSectorCatalog } = require('../sector-catalog');
const example = require('../examples/submissao-ficticia.json');

// Seed only an isolated temporary database with fictional data.
async function seedDemo(pool) {
    await importSectorCatalog(pool);
    const secondPeriod = await pool.query(`INSERT INTO periodos_coleta (nome, data_inicio, data_fim)
        VALUES ('Período fictício encerrado anterior', CURRENT_TIMESTAMP - INTERVAL '4 days',
            CURRENT_TIMESTAMP - INTERVAL '3 days') RETURNING id`);
    const secondPeriodId = secondPeriod.rows[0].id;
    const sectorsByMega = [];
    for (const mega of catalog.macroareas) {
        const rows = await pool.query(`SELECT s.id FROM setores s JOIN macroareas m ON m.id = s.macroarea_id
            WHERE m.nome = $1 ORDER BY s.id`, [mega.nome]);
        sectorsByMega.push(rows.rows.map(row => row.id));
    }
    for (const [mega, count] of [[0, 4], [1, 5], [2, 6]]) {
        const sectors = sectorsByMega[mega].slice(0, 2);
        for (let i = 0; i < count; i++) {
            const sector = sectors[i % sectors.length];
            const participation = await pool.query(`INSERT INTO participacoes(setor_id, periodo_id, enviado_em)
                SELECT $1, 3, data_inicio + INTERVAL '1 hour' FROM periodos_coleta WHERE id = 3 RETURNING id`, [sector]);
            for (const answer of example.respostas) {
                const alternative = answer.questao_numero >= 28 && mega === 1 && i < 4 ? 'Sim' : answer.alternativa;
                await pool.query('INSERT INTO respostas(participacao_id, questao_numero, alternativa) VALUES ($1, $2, $3)',
                    [participation.rows[0].id, answer.questao_numero, alternative]);
            }
        }
    }
    // Outra janela fechada demonstra que o filtro de período não mistura dados.
    for (let i = 0; i < 5; i++) {
        const sector = sectorsByMega[3][i % Math.min(2, sectorsByMega[3].length)];
        const participation = await pool.query(`INSERT INTO participacoes(setor_id, periodo_id, enviado_em)
            SELECT $1, $2, data_inicio + INTERVAL '1 hour' FROM periodos_coleta WHERE id = $2 RETURNING id`, [sector, secondPeriodId]);
        for (const answer of example.respostas) {
            await pool.query('INSERT INTO respostas(participacao_id, questao_numero, alternativa) VALUES ($1, $2, $3)',
                [participation.rows[0].id, answer.questao_numero, answer.questao_numero >= 28 ? 'Sim' : answer.alternativa]);
        }
    }
    await publishPeriod(pool, 3);
    await publishPeriod(pool, secondPeriodId);
    return secondPeriodId;
}

async function startAdminDemo({ port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0', adminAccounts } = {}) {
    if (process.env.NODE_ENV === 'production') throw new Error('Demo blocked in production.');
    let demoCredentials = null;
    if (!adminAccounts) {
        const loaded = await loadAdminAccounts();
        if (loaded.accounts.length > 0) {
            adminAccounts = loaded.accounts;
        } else {
            adminAccounts = [{
                usuario: DEMO_SUPERADMIN.usuario,
                nome: DEMO_SUPERADMIN.nome,
                senha_hash: await hashPassword(DEMO_SUPERADMIN.senha),
                papel: DEMO_SUPERADMIN.papel,
            }];
            demoCredentials = { usuario: DEMO_SUPERADMIN.usuario, senha: DEMO_SUPERADMIN.senha, nome: DEMO_SUPERADMIN.nome };
        }
    }
    if (!adminAccounts.length) throw new Error('Create the local admin account first.');
    const database = await createIsolatedDatabase('demo');
    let server;
    try {
        await seedDemo(database.pool);
        const saveAdminAccounts = async nextAccounts => {
            adminAccounts.splice(0, adminAccounts.length, ...nextAccounts);
        };
        const app = createApp({ pool: database.pool, adminAccounts, saveAdminAccounts, demoSubmissionsEnabled: true });
        server = createCorsServer(app).listen(port, host);
        await once(server, 'listening');
    } catch (error) {
        if (server?.listening) await new Promise(resolve => server.close(resolve));
        await database.close();
        throw error;
    }
    let closed = false;
    return { server, adminAccounts, demoCredentials, async close() {
        if (closed) return;
        closed = true;
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await database.close();
    } };
}

if (require.main === module) startAdminDemo().then(({ server, adminAccounts, demoCredentials, close }) => {
    console.log(`Admin demo at http://127.0.0.1:${server.address().port}. Isolated database; fictional data only.`);
    if (demoCredentials) {
        console.log(`Superadministrador padrão (${demoCredentials.nome}): usuário="${demoCredentials.usuario}" | senha="${demoCredentials.senha}"`);
    } else {
        const manager = adminAccounts.find(account => account.papel === 'gerenciador');
        if (manager) console.log(`Superadministrador configurado: usuário="${manager.usuario}"`);
    }
    console.log('Period 3: mega-sector 1 protected (4); mega-sector 2 available (5); mega-sector 3 available (6).');
    console.log('Earlier closed period: mega-sector 4 available (5).');
    console.log('Type sair or press Ctrl+C to close and remove the temporary environment.');
    const input = createInterface({ input: process.stdin, terminal: false });
    let closing = false;
    const stop = async () => {
        if (closing) return;
        closing = true;
        input.close();
        try { await close(); } catch { console.error('Failed to stop the demo.'); process.exitCode = 1; }
    };
    input.on('line', line => { if (line.trim().toLowerCase() === 'sair') void stop(); });
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
}).catch(error => { console.error(error.message.startsWith('Create the local') ? error.message : 'Admin demo failed. Check local configuration, PostgreSQL and port.'); process.exitCode = 1; });

module.exports = { seedDemo, startAdminDemo };
