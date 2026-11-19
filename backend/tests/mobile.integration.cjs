const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const { createIsolatedDatabase } = require('../testing/isolated-database');
const { startApp, validBody } = require('./helpers.cjs');
const { createSession, button, card, findAll } = require('../../tests/helpers.cjs');

async function until(condition) {
    const deadline = Date.now() + 5000;
    while (!condition()) {
        if (Date.now() > deadline) throw new Error('Condição do fluxo não foi alcançada.');
        await delay(10);
    }
}

test('app real (runtime nativo simulado) → HTTP → PostgreSQL: envio, erros e idempotência', async t => {
    const database = await createIsolatedDatabase();
    const app = await startApp(t, { pool: database.pool });
    t.after(database.close);
    const totals = async () => (await database.pool.query(`SELECT
        (SELECT COUNT(*)::int FROM participacoes) AS participacoes,
        (SELECT COUNT(*)::int FROM respostas) AS respostas`)).rows[0];

    async function preparedSession(fetchImpl = fetch) {
        const session = createSession({ apiUrl: app.url, fetchImpl });
        const screen = session.mount('src/screens/SectorScreen.js');
        screen.render();
        await until(() => findAll(screen.render(), node => node.props.accessibilityRole === 'radio').length === 8);
        findAll(screen.render(), node => node.props.accessibilityRole === 'radio')[0].props.onPress();
        assert.equal(button(screen.render(), 'Continuar').disabled, false);
        button(screen.render(), 'Continuar').onPress();
        const questionnaire = session.mount('src/screens/QuestionnaireScreen.js');
        const questions = session.load('src/data/questions.js').questions;
        for (const [index, question] of questions.entries()) {
            card(questionnaire.render()).onSelect(question.alternatives[0]);
            button(questionnaire.render(), index === 30 ? 'Revisar respostas' : 'Avançar').onPress();
        }
        return session;
    }

    await t.test('seleção e 31 questões: duplo clique gera uma participação completa confirmada', async () => {
        const session = await preparedSession();
        const review = session.mount('src/screens/ReviewScreen.js');
        button(review.render(), 'Continuar para confirmação').onPress();
        const send = button(review.render(), 'Enviar');
        const first = send.onPress();
        const second = send.onPress();
        assert.equal(session.state().submissionStatus, 'sending');
        await Promise.all([first, second]);
        assert.equal(session.state().submissionStatus, 'success');
        assert.deepEqual(await totals(), { participacoes: 1, respostas: 31 });
        const saved = await database.pool.query('SELECT questao_numero, alternativa FROM respostas ORDER BY questao_numero');
        assert.deepEqual(saved.rows, JSON.parse(JSON.stringify(session.load('src/data/submission.js')
            .toSubmission(session.state().answers, session.state().sector, session.state().period).respostas)));
        const persistedSelection = await database.pool.query('SELECT setor_id, macroarea_id FROM participacoes');
        assert.equal(persistedSelection.rows[0].setor_id, null);
        assert.equal(persistedSelection.rows[0].macroarea_id, 1);
    });

    await t.test('resposta perdida após COMMIT: erro no app, reenvio confirma sem duplicar', async () => {
        const before = await totals();
        const keys = [];
        let lose = true;
        const session = await preparedSession(async (url, options) => {
            const response = await fetch(url, options);
            if (options.method === 'POST') {
                keys.push(options.headers['Idempotency-Key']);
                if (lose) {
                    lose = false;
                    assert.equal(response.status, 201);
                    await response.text();
                    throw new Error('Resposta HTTP descartada depois de o servidor confirmar a gravação.');
                }
            }
            return response;
        });
        const original = JSON.stringify(session.state().answers);
        await session.state().submit();
        assert.equal(session.state().submissionStatus, 'error');
        assert.equal(JSON.stringify(session.state().answers), original);
        const persisted = { participacoes: before.participacoes + 1, respostas: before.respostas + 31 };
        assert.deepEqual(await totals(), persisted);
        // Mesmo encerrando o período depois da gravação, a repetição confirma o envio anterior.
        await database.pool.query("UPDATE periodos_coleta SET data_fim = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = $1", [1]);
        try {
            const review = session.mount('src/screens/ReviewScreen.js');
            await button(review.render(), 'Tentar novamente').onPress();
            assert.equal(session.state().submissionStatus, 'success');
            assert.equal(keys[0], keys[1]);
            assert.deepEqual(await totals(), persisted);
        } finally {
            await database.pool.query("UPDATE periodos_coleta SET data_fim = CURRENT_TIMESTAMP + INTERVAL '1 day' WHERE id = $1", [1]);
        }
    });

    await t.test('requisições simultâneas com mesma chave e ordem diferente têm uma gravação', async () => {
        const before = await totals();
        const body = await validBody();
        const key = randomUUID();
        const results = await Promise.all(Array.from({ length: 5 }, (_, index) => app.post({
            ...body, respostas: index % 2 ? [...body.respostas].reverse() : body.respostas,
        }, 'application/json', index % 2 ? key.toUpperCase() : key)));
        assert.ok(results.every(response => response.status === 201));
        assert.deepEqual(await totals(), { participacoes: before.participacoes + 1, respostas: before.respostas + 31 });
        const conflict = await app.post({ ...body, mega_setor_id: 999 }, 'application/json', key);
        assert.equal(conflict.status, 409);
        assert.equal((await conflict.json()).codigo, 'CHAVE_REUTILIZADA');
        assert.deepEqual(await totals(), { participacoes: before.participacoes + 1, respostas: before.respostas + 31 });
    });

    await t.test('app preserva as 31 respostas em mega-setor inválido e período encerrado', async () => {
        const before = await totals();
        for (const kind of ['sector', 'period']) {
            const session = await preparedSession();
            const state = session.state();
            state.selectCollection(kind === 'sector' ? { id: 999, nome: 'Mega-setor inválido fictício' } : state.sector,
                kind === 'period' ? { ...state.period, id: 3 } : state.period);
            await session.state().submit();
            assert.equal(session.state().submissionStatus, 'error');
            assert.equal(session.state().submissionLocked, false);
            assert.equal(Object.keys(session.state().answers).length, 31);
            assert.deepEqual(await totals(), before);
        }
    });

    await t.test('questionários diferentes recebem chaves e hashes distintos mesmo com respostas iguais', async () => {
        const body = await validBody();
        const keys = [randomUUID(), randomUUID()];
        for (const key of keys) assert.equal((await app.post(body, 'application/json', key)).status, 201);
        const rows = (await database.pool.query('SELECT chave_envio, conteudo_hash FROM participacoes WHERE chave_envio = ANY($1::uuid[])', [keys])).rows;
        assert.equal(rows.length, 2);
        assert.notEqual(rows[0].conteudo_hash, rows[1].conteudo_hash);
    });

    await t.test('rollback não consome a chave; reenvio após erro SQL consegue gravar', async () => {
        const before = await totals();
        const body = await validBody();
        const key = randomUUID();
        await database.pool.query("ALTER TABLE respostas ADD CONSTRAINT erro_ficticio CHECK (questao_numero <> 31 OR alternativa <> 'Sim') NOT VALID");
        try {
            assert.equal((await app.post(body, 'application/json', key)).status, 500);
            assert.deepEqual(await totals(), before);
        } finally {
            await database.pool.query('ALTER TABLE respostas DROP CONSTRAINT erro_ficticio');
        }
        assert.equal((await app.post(body, 'application/json', key)).status, 201);
        assert.deepEqual(await totals(), { participacoes: before.participacoes + 1, respostas: before.respostas + 31 });
    });
});
