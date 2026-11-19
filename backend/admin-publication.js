const { alternatives, isDatabaseId } = require('./questionnaire');
const { rules, scoreMap } = require('./scoring');

// Individual answers stay inside PostgreSQL. Only aggregates by mega-sector
// and closed collection period are written to the immutable publication.
const aggregationSQL = `
WITH allowed AS (
    SELECT questao_numero, alternativa FROM jsonb_to_recordset($2::jsonb)
        AS a(questao_numero int, alternativa text)
), valid AS (
    SELECT p.id, COALESCE(p.macroarea_id, s.macroarea_id) AS macroarea_id FROM participacoes p
    JOIN periodos_coleta c ON c.id = p.periodo_id
    LEFT JOIN setores s ON s.id = p.setor_id
    JOIN respostas r ON r.participacao_id = p.id
    LEFT JOIN allowed a ON a.questao_numero = r.questao_numero AND a.alternativa = r.alternativa
    WHERE p.periodo_id = $1 AND p.enviado_em >= c.data_inicio AND p.enviado_em < c.data_fim
    GROUP BY p.id, COALESCE(p.macroarea_id, s.macroarea_id)
    HAVING COALESCE(p.macroarea_id, s.macroarea_id) IS NOT NULL
       AND COUNT(*) = 31 AND COUNT(DISTINCT r.questao_numero) = 31 AND COUNT(a.questao_numero) = 31
), counts AS (
    SELECT macroarea_id, COUNT(*)::int AS n FROM valid GROUP BY macroarea_id
), score_map AS (
    SELECT * FROM jsonb_to_recordset($3::jsonb)
        AS m(questao_numero int, alternativa text, dimensao text, valor numeric)
), individual_global AS (
    SELECT v.id, v.macroarea_id, AVG(m.valor) AS ier
    FROM valid v JOIN counts c ON c.macroarea_id = v.macroarea_id AND c.n >= 5
    JOIN respostas r ON r.participacao_id = v.id
    JOIN score_map m ON m.questao_numero = r.questao_numero AND m.alternativa = r.alternativa
    GROUP BY v.id, v.macroarea_id
), individual_dimensions AS (
    SELECT v.id, v.macroarea_id, m.dimensao, AVG(m.valor) AS ier
    FROM valid v JOIN counts c ON c.macroarea_id = v.macroarea_id AND c.n >= 5
    JOIN respostas r ON r.participacao_id = v.id
    JOIN score_map m ON m.questao_numero = r.questao_numero AND m.alternativa = r.alternativa
    GROUP BY v.id, v.macroarea_id, m.dimensao
), collective_global AS (
    SELECT macroarea_id, AVG(ier) AS ier FROM individual_global GROUP BY macroarea_id
), collective_dimensions AS (
    SELECT macroarea_id, dimensao, AVG(ier) AS ier FROM individual_dimensions GROUP BY macroarea_id, dimensao
), dimensions_json AS (
    SELECT macroarea_id, jsonb_object_agg(dimensao, ier) AS dimensoes
    FROM collective_dimensions GROUP BY macroarea_id
), alerts AS (
    SELECT v.macroarea_id,
        bool_or(r.alternativa = 'Sim') FILTER (WHERE r.questao_numero = 28) AS q28,
        bool_or(r.alternativa = 'Sim') FILTER (WHERE r.questao_numero = 29) AS q29,
        bool_or(r.alternativa = 'Sim') FILTER (WHERE r.questao_numero = 30) AS q30,
        bool_or(r.alternativa = 'Sim') FILTER (WHERE r.questao_numero = 31) AS q31
    FROM valid v JOIN counts c ON c.macroarea_id = v.macroarea_id AND c.n >= 5
    JOIN respostas r ON r.participacao_id = v.id AND r.questao_numero BETWEEN 28 AND 31
    GROUP BY v.macroarea_id
)
INSERT INTO admin_macrogrupos_publicados (periodo_id, macroarea_id, payload)
SELECT $1, m.id,
    CASE WHEN c.n >= 5 THEN jsonb_build_object('status', 'disponivel', 'participacoes_validas', c.n,
        'alertas', jsonb_build_object('Q28', a.q28, 'Q29', a.q29, 'Q30', a.q30, 'Q31', a.q31),
        'ier', jsonb_build_object('versao_regras', $4::text, 'global', g.ier, 'dimensoes', d.dimensoes))
    ELSE jsonb_build_object('status', 'protegido_ou_indisponivel') END
FROM macroareas m LEFT JOIN counts c ON c.macroarea_id = m.id
LEFT JOIN alerts a ON a.macroarea_id = m.id
LEFT JOIN collective_global g ON g.macroarea_id = m.id
LEFT JOIN dimensions_json d ON d.macroarea_id = m.id`;

async function publishPeriod(pool, periodId) {
    if (!isDatabaseId(periodId)) throw new Error('Periodo invalido.');
    const client = await pool.connect();
    let discard = false;
    try {
        await client.query('BEGIN');
        // Freeze one coherent view of period, mapping, answers and sectors.
        await client.query('LOCK TABLE periodos_coleta, setores, macroareas, participacoes, respostas IN SHARE MODE');
        const period = await client.query(`SELECT id, data_inicio, data_fim, data_fim <= CURRENT_TIMESTAMP AS encerrado
            FROM periodos_coleta WHERE id = $1`, [periodId]);
        if (period.rowCount !== 1 || !period.rows[0].encerrado) throw new Error('Periodo indisponivel para publicacao.');
        const row = period.rows[0];
        await client.query(`INSERT INTO admin_publicacoes (periodo_id, data_inicio, data_fim, politica, versao_regras, regras_calculo)
            VALUES ($1, $2, $3, 'mega_setor_periodo_fechado_v1', $4, $5::jsonb)`, [periodId, row.data_inicio, row.data_fim, rules.versao, JSON.stringify(rules)]);
        const allowed = alternatives.flatMap((items, index) => items.map(alternativa => ({ questao_numero: index + 1, alternativa })));
        await client.query(aggregationSQL, [periodId, JSON.stringify(allowed), JSON.stringify(scoreMap()), rules.versao]);
        await client.query('COMMIT');
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch { discard = true; }
        throw error;
    } finally {
        client.release(discard);
    }
}

module.exports = { publishPeriod, aggregationSQL };
