const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateSubmission } = require('../questionnaire');
const { loadQuestions, validBody, startApp, fakePool } = require('./helpers.cjs');
const { catalog } = require('../sector-catalog');

test('exemplo JSON versionado corresponde às alternativas atuais do aplicativo', async () => {
    const example = require('../examples/submissao-ficticia.json');
    assert.equal(validateSubmission(example), null);
    assert.deepEqual(example, await validBody());
});

test('contrato aceita todas as alternativas reais de Q1–Q31 e rejeita alternativas de outras escalas', async () => {
    const questions = await loadQuestions();
    const body = await validBody();
    assert.equal(questions.length, 31);
    questions.forEach((question, index) => {
        assert.equal(question.id, `Q${index + 1}`);
        for (const alternative of question.alternatives) {
            body.respostas[index].alternativa = alternative;
            assert.equal(validateSubmission(body), null, `${question.id}: ${alternative}`);
        }
        for (const alternative of new Set(questions.flatMap(item => item.alternatives))) {
            if (!question.alternatives.includes(alternative)) {
                body.respostas[index].alternativa = alternative;
                assert.equal(typeof validateSubmission(body), 'string', `${question.id}: ${alternative}`);
            }
        }
        body.respostas[index].alternativa = question.alternatives[0];
    });
});

test('GETs públicos preservam contratos e expõem os oito mega-setores do catálogo', async t => {
    const app = await startApp(t, { pool: fakePool() });
    for (const route of ['/health', '/db-health', '/mega-setores', '/periodos']) {
        const response = await app.get(route);
        assert.equal(response.status, 200);
        const body = await response.json();
        if (route === '/mega-setores') {
            assert.equal(body.length, 8);
            assert.deepEqual(body.map(item => item.nome), catalog.macroareas.map(item => item.nome));
        }
        if (route === '/periodos') assert.ok(Array.isArray(body));
        else if (route === '/health' || route === '/db-health') assert.equal(body.status, 'ok');
    }
});

test('falhas nos GETs de banco retornam JSON genérico', async t => {
    const app = await startApp(t, { pool: fakePool({ failAt: 'query' }) });
    for (const route of ['/db-health', '/mega-setores', '/periodos']) {
        const response = await app.get(route);
        assert.equal(response.status, 500);
        assert.doesNotMatch(JSON.stringify(await response.json()), /sigiloso|SELECT/);
    }
});

test('coleta desabilitada por padrão e em produção, mesmo com flag', async t => {
    for (const options of [{ demoSubmissionsEnabled: false }, { environment: 'production' }]) {
        const pool = fakePool();
        const app = await startApp(t, { pool, ...options });
        const response = await app.post(await validBody());
        assert.equal(response.status, 503);
        assert.equal((await response.json()).codigo, 'COLETA_DESABILITADA');
        assert.deepEqual(pool.calls, []);
    }
    // Confere também o default real da factory, sem o default de teste.
    const { createApp } = require('../app');
    const pool = fakePool();
    const server = createApp({ pool }).listen(0, '127.0.0.1');
    await require('node:events').once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/participacoes`, { method: 'POST' });
    assert.equal(response.status, 503);
    assert.deepEqual(pool.calls, []);
});

test('tipo de conteúdo, JSON inválido e tamanho são rejeitados antes do banco', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool });
    for (const [body, contentType, status] of [
        ['texto', 'text/plain', 415],
        ['{', 'application/json', 400],
        ['null', 'application/json', 400],
        ['true', 'application/json', 400],
        ['', 'application/json', 400],
        ['[]', 'application/json', 400],
        [JSON.stringify({ valor: 'x'.repeat(17000) }), 'application/json', 413],
    ]) {
        const response = await app.post(body, contentType);
        assert.equal(response.status, status);
        assert.match(response.headers.get('content-type'), /application\/json/);
    }
    assert.deepEqual(pool.calls, []);
});

test('entradas inválidas não abrem conexão nem transação', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool });
    const invalid = [
        ['campo extra pessoal', body => { body.nome = 'Pessoa fictícia'; }],
        ['contrato antigo de setor operacional', body => { body.setor_id = body.mega_setor_id; }],
        ['mega-setor ausente', body => { delete body.mega_setor_id; }],
        ['período ausente', body => { delete body.periodo_id; }],
        ['respostas ausentes', body => { delete body.respostas; }],
        ...['1', 0, -1, 1.5, true, null, 2147483648].flatMap(value => [
            [`mega-setor ${value}`, body => { body.mega_setor_id = value; }],
            [`período ${value}`, body => { body.periodo_id = value; }],
        ]),
        ['30 respostas', body => { body.respostas.pop(); }],
        ['32 respostas', body => { body.respostas.push(body.respostas[0]); }],
        ['respostas como objeto', body => { body.respostas = {}; }],
        ['resposta nula', body => { body.respostas[0] = null; }],
        ['campo extra na resposta', body => { body.respostas[0].extra = 'x'; }],
        ['questão duplicada e outra ausente', body => { body.respostas[1].questao_numero = 1; }],
        ...[0, -1, 32, 1.5, '1', true, null].map(value => [
            `número de questão ${value}`, body => { body.respostas[0].questao_numero = value; },
        ]),
        ...['Sim', 'sempre', ' Sempre ', '', null, 1, {}, "'); DROP TABLE respostas; --"].map(value => [
            `alternativa inválida ${JSON.stringify(value)}`, body => { body.respostas[0].alternativa = value; },
        ]),
        ['Q23 com frequência', body => { body.respostas[22].alternativa = 'Sempre'; }],
        ['Q28 com intensidade', body => { body.respostas[27].alternativa = 'Sempre/Totalmente'; }],
        ['Q31 com não sem acento', body => { body.respostas[30].alternativa = 'Nao'; }],
    ];
    for (const [name, mutate] of invalid) {
        await t.test(name, async () => {
            const body = await validBody();
            mutate(body);
            const response = await app.post(body);
            assert.equal(response.status, 400);
            assert.equal((await response.json()).codigo, 'ENTRADA_INVALIDA');
        });
    }
    assert.deepEqual(pool.calls, []);
});

test('sucesso grava as 31 respostas parametrizadas na mesma conexão, sem exigir ordem', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool });
    const body = await validBody();
    body.respostas.reverse();
    const response = await app.post(body);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json();
    assert.deepEqual(Object.keys(result).sort(), ['mensagem', 'modo', 'status']);
    assert.equal(result.modo, 'demonstracao');
    assert.equal(pool.calls.filter(call => call.connect).length, 1);
    const queries = pool.calls.filter(call => call.sql);
    assert.equal(queries[0].sql, 'BEGIN');
    assert.equal(queries.at(-1).sql, 'COMMIT');
    assert.deepEqual(queries[2].values, [body.mega_setor_id]);
    assert.deepEqual(queries[3].values, [body.periodo_id]);
    assert.deepEqual(queries[4].values.slice(0, 2), [body.mega_setor_id, body.periodo_id]);
    assert.match(queries[4].sql, /INSERT INTO participacoes \(macroarea_id, periodo_id/);
    assert.match(queries[4].values[3], /^[0-9a-f]{64}$/);
    assert.deepEqual(queries[5].values, body.respostas.flatMap(answer => ['9007199254740993', answer.questao_numero, answer.alternativa]));
    assert.ok(queries[5].sql.includes('$93'));
    for (const answer of body.respostas) assert.ok(!queries[5].sql.includes(answer.alternativa));
    assert.deepEqual(pool.calls.at(-1), { release: true, discard: false });
});

test('não confirma HTTP antes de concluir o COMMIT', async t => {
    let resolveCommit;
    let notifyCommit;
    const gate = new Promise(resolve => { resolveCommit = resolve; });
    const reachedCommit = new Promise(resolve => { notifyCommit = resolve; });
    const pool = fakePool({ onCommit: async () => { notifyCommit(); await gate; } });
    const app = await startApp(t, { pool });
    let responded = false;
    const request = app.post(await validBody()).then(response => { responded = true; return response; });
    try {
        await reachedCommit;
        assert.equal(responded, false);
        assert.equal(pool.calls.some(call => call.release), false);
    } finally {
        resolveCommit();
    }
    assert.equal((await request).status, 201);
});

test('mega-setor e período inexistentes ou fora de vigência fazem rollback sem INSERT', async t => {
    for (const [options, code] of [
        [{ sectorExists: false }, 'MEGA_SETOR_INVALIDO'],
        [{ periodExists: false }, 'PERIODO_INVALIDO'],
        [{ active: false }, 'PERIODO_INVALIDO'],
    ]) {
        const pool = fakePool(options);
        const app = await startApp(t, { pool });
        const response = await app.post(await validBody());
        assert.equal(response.status, 422);
        assert.equal((await response.json()).codigo, code);
        assert.ok(pool.calls.some(call => call.sql === 'ROLLBACK'));
        assert.ok(!pool.calls.some(call => call.sql?.startsWith('INSERT')));
        assert.equal(pool.calls.at(-1).release, true);
    }
});

test('falhas de conexão, BEGIN, INSERTs e COMMIT não confirmam sucesso nem vazam detalhes', async t => {
    for (const failAt of ['connect', 'BEGIN', 'INSERT INTO participacoes', 'INSERT INTO respostas', 'COMMIT']) {
        const pool = fakePool({ failAt });
        const app = await startApp(t, { pool });
        const response = await app.post(await validBody());
        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.codigo, 'FALHA_PERSISTENCIA');
        assert.doesNotMatch(JSON.stringify(body), /sigiloso|INSERT|SELECT/);
        if (!['connect', 'BEGIN'].includes(failAt)) assert.ok(pool.calls.some(call => call.sql === 'ROLLBACK'));
        if (failAt !== 'connect') assert.equal(pool.calls.at(-1).release, true);
        if (failAt !== 'COMMIT') assert.ok(!pool.calls.some(call => call.sql === 'COMMIT'));
    }
});

test('falha no rollback descarta a conexão em vez de devolvê-la ao pool', async t => {
    const pool = fakePool({ failAt: 'INSERT INTO respostas', failRollback: true });
    const app = await startApp(t, { pool });
    assert.equal((await app.post(await validBody())).status, 500);
    assert.deepEqual(pool.calls.at(-1), { release: true, discard: true });
});
