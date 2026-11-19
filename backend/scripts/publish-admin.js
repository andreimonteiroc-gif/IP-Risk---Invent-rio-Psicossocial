// Publicação local explícita. Sem valor padrão, sem db.js e sem migração automática.
const { Pool } = require('pg');
const { publishPeriod } = require('../admin-publication');

async function main() {
    if (!process.env.ADMIN_PUBLICATION_DATABASE_URL) throw new Error('Conexão de publicação não configurada.');
    const periodId = Number(process.argv[2]);
    const pool = new Pool({ connectionString: process.env.ADMIN_PUBLICATION_DATABASE_URL, connectionTimeoutMillis: 5000 });
    try {
        await publishPeriod(pool, periodId);
        console.log('Publicação congelada concluída. Nenhum dado individual foi exibido.');
    } finally { await pool.end(); }
}

if (require.main === module) main().catch(() => {
    console.error('Publicação não concluída. Confira conexão, migração, período encerrado e ausência de publicação anterior/sobreposta.');
    process.exitCode = 1;
});
