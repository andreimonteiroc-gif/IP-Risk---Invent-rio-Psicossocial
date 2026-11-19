const catalog = require('./sector-catalog.json');

function validateCatalog(value) {
    const groups = value.macroareas;
    const sectors = groups?.flatMap(group => group.subdivisoes);
    const validName = name => typeof name === 'string' && name.trim() === name && name.length > 0 && [...name].length <= 100;
    if (!value.versao || !Array.isArray(groups) || groups.length !== 8 || sectors.length !== 33
        || new Set(groups.map(group => group.nome)).size !== 8 || new Set(sectors).size !== 33
        || groups.some(group => !validName(group.nome) || !Array.isArray(group.subdivisoes) || !group.subdivisoes.length)
        || sectors.some(name => !validName(name))) throw new Error('Catálogo deve conter oito macroáreas e 33 subdivisões únicas, com nomes válidos.');
    return value;
}
validateCatalog(catalog);

async function importSectorCatalog(pool, definition = catalog) {
    validateCatalog(definition);
    const client = await pool.connect();
    let discard = false;
    try {
        await client.query('BEGIN');
        for (const group of definition.macroareas) {
            const macroarea = await client.query(`INSERT INTO macroareas(nome) VALUES ($1)
                ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [group.nome]);
            for (const name of group.subdivisoes) {
                // Reutiliza somente correspondência exata; nunca renomeia, apaga,
                // reatribui outra macroárea nem consolida participações/resultados.
                const sector = await client.query(`INSERT INTO setores(nome, macroarea_id) VALUES ($1, $2)
                    ON CONFLICT (nome) DO UPDATE SET macroarea_id = EXCLUDED.macroarea_id
                    WHERE setores.macroarea_id IS NULL OR setores.macroarea_id = EXCLUDED.macroarea_id
                    RETURNING id`, [name, macroarea.rows[0].id]);
                if (sector.rowCount !== 1) throw new Error('Setor existente pertence a outra macroárea; importação cancelada.');
            }
        }
        await client.query('COMMIT');
        return { versao: definition.versao, macroareas: 8, subdivisoes: 33 };
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch { discard = true; }
        throw error;
    } finally { client.release(discard); }
}

module.exports = { catalog, validateCatalog, importSectorCatalog };
