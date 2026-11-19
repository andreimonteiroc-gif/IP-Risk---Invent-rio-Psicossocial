const { Pool } = require('pg');
const { importSectorCatalog } = require('../sector-catalog');

async function main() {
    if (!process.env.CATALOG_DATABASE_URL) throw new Error('Conexão explícita de catálogo obrigatória.');
    const pool = new Pool({ connectionString: process.env.CATALOG_DATABASE_URL, connectionTimeoutMillis: 5000 });
    try {
        const result = await importSectorCatalog(pool);
        console.log(`Catálogo ${result.versao} configurado: oito macroáreas e 33 subdivisões, sem mesclar resultados.`);
    } finally { await pool.end(); }
}

if (require.main === module) main().catch(() => {
    console.error('Catálogo não importado. Confira conexão explícita, migração, nomes e vínculos existentes.');
    process.exitCode = 1;
});
