const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createIsolatedDatabase } = require('../testing/isolated-database');
const { publishPeriod } = require('../admin-publication');
const { hashPassword } = require('../admin-auth');
const { startApp, validBody } = require('./helpers.cjs');
const { startAdminDemo } = require('../scripts/demo-admin');
const { rules } = require('../scoring');
const { alternatives } = require('../questionnaire');
const { catalog, importSectorCatalog } = require('../sector-catalog');

test('admin HTTP + PostgreSQL: grouping, minimum group size, periods and immutable results', async t => {
    const database = await createIsolatedDatabase();
    t.after(database.close);
    const pool = database.pool;
    const imported = await importSectorCatalog(pool);
    assert.equal(imported.macroareas, 8);

    const password = 'Credencial ficticia de teste 2026';
    const adminAccounts = [{ usuario: 'profissional.teste', senha_hash: await hashPassword(password), papel: 'profissional_autorizado' }];
    const app = await startApp(t, { pool, adminAccounts });
    const login = await fetch(app.url + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'profissional.teste', senha: password }) });
    assert.equal(login.status, 200);
    const headers = { Authorization: `Bearer ${(await login.json()).token}` };
    const get = async (megaSector, period, base = app.url) => {
        const response = await fetch(`${base}/admin/resultados?mega_setor_id=${megaSector}&periodo_id=${period}`, { headers });
        assert.equal(response.status, 200);
        return response.json();
    };
    const hidden = { status: 'protegido_ou_indisponivel' };
    const body = await validBody();
    const flags = index => ({ Q28: index === 0, Q29: index === 1, Q30: index === 2, Q31: index === 3 });
    const firstMega = catalog.macroareas[0];
    const secondMega = catalog.macroareas[1];
    const thirdMega = catalog.macroareas[2];
    const sectorIds = new Map();
    for (const mega of [firstMega, secondMega, thirdMega]) {
        const rows = await pool.query(`SELECT s.id FROM setores s JOIN macroareas m ON m.id = s.macroarea_id
            WHERE m.nome = $1 ORDER BY s.id`, [mega.nome]);
        sectorIds.set(mega.nome, rows.rows.map(row => row.id));
    }
    const firstSectors = sectorIds.get(firstMega.nome);
    const secondSectors = sectorIds.get(secondMega.nome);
    const thirdSector = sectorIds.get(thirdMega.nome)[0];

    const periods = await pool.query(`INSERT INTO periodos_coleta (nome, data_inicio, data_fim) VALUES
        ('Periodo ficticio separado', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
        ('Periodo ficticio sobreposto', CURRENT_TIMESTAMP - INTERVAL '36 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours')
        RETURNING id, nome`);
    const separatePeriod = periods.rows.find(row => row.nome.includes('separado')).id;
    const overlappingPeriod = periods.rows.find(row => row.nome.includes('sobreposto')).id;

    async function seed(sectorId, periodId = 3, answerFlags = {}, invalid = null, scoreLevel = null) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const participation = await client.query(`INSERT INTO participacoes(setor_id, periodo_id, enviado_em)
                SELECT $1, id, data_inicio + INTERVAL '1 hour' FROM periodos_coleta WHERE id = $2 RETURNING id`, [sectorId, periodId]);
            const id = participation.rows[0].id;
            for (const answer of body.respostas) {
                if (invalid === 'incompleta' && answer.questao_numero === 31) continue;
                const number = answer.questao_numero;
                let alternative = invalid === 'alternativa' && number === 1 ? 'Prefiro não responder'
                    : number >= 28 ? alternatives[number - 1][answerFlags[`Q${number}`] ? 0 : 1] : answer.alternativa;
                if (scoreLevel !== null && number <= 27) {
                    const high = scoreLevel(number) === 100;
                    alternative = alternatives[number - 1][rules.inversas.includes(number) ? high ? 4 : 0 : high ? 0 : 4];
                }
                await client.query('INSERT INTO respostas(participacao_id, questao_numero, alternativa) VALUES ($1,$2,$3)', [id, number, alternative]);
            }
            if (invalid === 'timestamp') await client.query(`UPDATE participacoes SET enviado_em = (
                SELECT data_fim FROM periodos_coleta WHERE id = $2) WHERE id = $1`, [id, periodId]);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally { client.release(); }
    }
    async function seedMega(macroareaId, periodId = 3) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const participation = await client.query(`INSERT INTO participacoes(macroarea_id, periodo_id, enviado_em)
                SELECT $1, id, data_inicio + INTERVAL '1 hour' FROM periodos_coleta WHERE id = $2 RETURNING id`, [macroareaId, periodId]);
            for (const answer of body.respostas) {
                await client.query('INSERT INTO respostas(participacao_id, questao_numero, alternativa) VALUES ($1,$2,$3)',
                    [participation.rows[0].id, answer.questao_numero, answer.alternativa]);
            }
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally { client.release(); }
    }

    // Four valid responses span two operational sectors within mega-sector 1.
    for (let i = 0; i < 2; i++) await seed(firstSectors[0], 3, { Q28: true });
    for (let i = 0; i < 2; i++) await seed(firstSectors[1], 3, { Q29: true });
    await seed(firstSectors[0], 3, {}, 'incompleta');
    await seed(firstSectors[1], 3, {}, 'timestamp');

    // Four legacy responses span two operational sectors within mega-sector 2.
    for (let i = 0; i < 2; i++) await seed(secondSectors[0], 3, flags(i));
    for (let i = 2; i < 4; i++) await seed(secondSectors[1], 3, flags(i));
    // A new-format row selects the mega-sector directly; publication must group
    // it with those four legacy operational-sector records.
    await seedMega(2, 3);
    // Mega-sector 3 is independent and clears the threshold with six entries.
    for (let i = 0; i < 6; i++) await seed(thirdSector, 3);
    // A separate period can clear the threshold even where period 3 cannot.
    for (let i = 0; i < 5; i++) await seed(firstSectors[i % 2], separatePeriod, { Q31: true });

    assert.deepEqual(await get(1, 3), hidden); // live results are never calculated by HTTP
    for (const period of [1, 2, 999]) await assert.rejects(publishPeriod(pool, period));
    await publishPeriod(pool, 3);
    await publishPeriod(pool, separatePeriod);

    await t.test('same mega-sector subdivisions aggregate; four hides and five releases', async () => {
        const result = await get(2, 3);
        assert.equal(result.participacoes_validas, 5);
        assert.deepEqual(result.alertas, { Q28: true, Q29: true, Q30: true, Q31: true });
        assert.equal(result.ier.disponivel, true);
        assert.equal(result.ier.dimensoes.length, 7);
        assert.deepEqual(await get(1, 3), hidden);
        assert.deepEqual(await pool.query(`SELECT payload FROM admin_macrogrupos_publicados
            WHERE macroarea_id = 1 AND periodo_id = 3`).then(r => r.rows[0].payload), hidden);
    });

    await t.test('different mega-sectors and periods never mix', async () => {
        const other = await get(3, 3);
        assert.equal(other.participacoes_validas, 6);
        assert.deepEqual(other.alertas, { Q28: false, Q29: false, Q30: false, Q31: false });
        assert.deepEqual(await get(1, 3), hidden);
        const separate = await get(1, separatePeriod);
        assert.equal(separate.participacoes_validas, 5);
        assert.deepEqual(separate.alertas, { Q28: false, Q29: false, Q30: false, Q31: true });
        assert.deepEqual(await get(2, separatePeriod), hidden);
    });

    await t.test('aggregate preserves scoring method and exposes no individual data', async () => {
        const result = await get(3, 3);
        assert.equal(result.ier.versao_regras, rules.versao);
        assert.ok(Math.abs(result.ier.global.valor - 1100 / 27) < 1e-12);
        assert.equal(result.ier.global.valor_arredondado, 40.7);
        assert.equal(result.ier.dimensoes.length, 7);
        assert.deepEqual(Object.keys(result).sort(), ['alertas', 'ier', 'participacoes_validas', 'status']);
        assert.doesNotMatch(JSON.stringify(result), /participacao_id|chave_envio|conteudo_hash|percentual|respostas|enviado_em/);
    });

    await t.test('authenticated metadata only lists eight mega-sectors and published periods', async () => {
        const megaSectors = await (await fetch(app.url + '/admin/mega-setores', { headers })).json();
        assert.equal(megaSectors.length, 8);
        assert.equal(megaSectors[1].nome, 'Administrativo e Gestão Corporal (Comum a todas as empresas)');
        const availablePeriods = await (await fetch(app.url + '/admin/periodos', { headers })).json();
        assert.deepEqual(availablePeriods.map(item => item.id).sort(), [3, separatePeriod].sort());
        assert.doesNotMatch(JSON.stringify(megaSectors), /setor_id|participacao|subdivisao/);
    });

    await t.test('login required; operational-sector and arbitrary aggregate filters are not offered', async () => {
        assert.equal((await fetch(app.url + '/admin/mega-setores')).status, 401);
        assert.equal((await fetch(app.url + '/admin/periodos')).status, 401);
        for (const query of ['setor_id=1&periodo_id=3', 'mega_setor_id=1,2&periodo_id=3',
            'mega_setor_id=1&periodo_id=3,4', 'mega_setor_id=1&periodo_id=3&total=true', 'periodo_id=3']) {
            assert.equal((await fetch(app.url + '/admin/resultados?' + query, { headers })).status, 400);
        }
        assert.deepEqual(await get(999, 3), hidden);
    });

    await t.test('publication is immutable, single per period and cannot overlap', async () => {
        const before = await get(2, 3);
        await assert.rejects(publishPeriod(pool, 3));
        await assert.rejects(publishPeriod(pool, overlappingPeriod));
        await assert.rejects(pool.query(`UPDATE admin_macrogrupos_publicados SET payload = '{}'::jsonb
            WHERE macroarea_id = 2 AND periodo_id = 3`));
        assert.deepEqual(await get(2, 3), before);
        assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM admin_publicacoes')).rows[0].n, 2);
    });
});

test('admin demo uses only fictional rows and demonstrates grouped mega-sector results across periods', async () => {
    const password = 'Credencial ficticia da demonstracao 2026';
    const accounts = [{ usuario: 'profissional.demo', senha_hash: await hashPassword(password), papel: 'profissional_autorizado' }];
    const demo = await startAdminDemo({ adminAccounts: accounts, port: 0 });
    const url = `http://127.0.0.1:${demo.server.address().port}`;
    try {
        const login = await fetch(url + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'profissional.demo', senha: password }) });
        assert.equal(login.status, 200);
        const headers = { Authorization: `Bearer ${(await login.json()).token}` };
        const periods = await (await fetch(url + '/admin/periodos', { headers })).json();
        assert.equal(periods.length, 2);
        const mainPeriod = periods.find(period => period.nome === 'Período fictício encerrado');
        const earlierPeriod = periods.find(period => period.nome === 'Período fictício encerrado anterior');
        assert.ok(mainPeriod && earlierPeriod);
        const megaSectors = await (await fetch(url + '/admin/mega-setores', { headers })).json();
        assert.equal(megaSectors.length, 8);
        for (const [mega, count] of [[1, 4], [2, 5], [3, 6]]) {
            const result = await (await fetch(`${url}/admin/resultados?mega_setor_id=${mega}&periodo_id=${mainPeriod.id}`, { headers })).json();
            if (count < 5) assert.deepEqual(result, { status: 'protegido_ou_indisponivel' });
            else assert.equal(result.participacoes_validas, count);
        }
        const earlier = await (await fetch(`${url}/admin/resultados?mega_setor_id=4&periodo_id=${earlierPeriod.id}`, { headers })).json();
        assert.equal(earlier.participacoes_validas, 5);
        const noMix = await (await fetch(`${url}/admin/resultados?mega_setor_id=4&periodo_id=${mainPeriod.id}`, { headers })).json();
        assert.deepEqual(noMix, { status: 'protegido_ou_indisponivel' });
    } finally { await demo.close(); }
});
