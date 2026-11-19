const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createIsolatedDatabase } = require('../testing/isolated-database');
const { validBody, startApp } = require('./helpers.cjs');
const { startDemo } = require('../scripts/demo');
const { randomUUID } = require('node:crypto');

test('API com PostgreSQL real em schema temporário e dados inteiramente fictícios', async t => {
    const database = await createIsolatedDatabase();
    const app = await startApp(t, { pool: database.pool });
    // Fecha o HTTP antes de remover o schema, inclusive quando uma asserção falha.
    t.after(database.close);
    const totals = async () => (await database.pool.query(`
        SELECT (SELECT COUNT(*)::int FROM participacoes) AS participacoes,
               (SELECT COUNT(*)::int FROM respostas) AS respostas
    `)).rows[0];

    await t.test('quatro GETs respondem sobre o banco de teste', async () => {
        for (const route of ['/health', '/db-health', '/mega-setores', '/periodos']) {
            const response = await app.get(route);
            assert.equal(response.status, 200);
            const body = await response.json();
            if (route === '/mega-setores') assert.equal(body.length, 8);
            if (route === '/periodos') assert.equal(body.length, 3);
        }
    });

    await t.test('201 corresponde a uma participação e suas 31 respostas já confirmadas', async () => {
        const body = await validBody();
        // Exercita acentos e as duas alternativas binárias sem calcular escores.
        body.respostas[0].alternativa = 'Às vezes';
        body.respostas[27].alternativa = 'Não';
        body.respostas.reverse();
        assert.equal((await app.post(body)).status, 201);
        assert.deepEqual(await totals(), { participacoes: 1, respostas: 31 });
        const saved = await database.pool.query('SELECT questao_numero, alternativa FROM respostas ORDER BY questao_numero');
        assert.deepEqual(saved.rows, [...body.respostas].sort((a, b) => a.questao_numero - b.questao_numero));
        const participation = await database.pool.query('SELECT setor_id, macroarea_id, periodo_id, enviado_em FROM participacoes');
        assert.equal(participation.rows[0].setor_id, null);
        assert.equal(participation.rows[0].macroarea_id, 1);
        assert.equal(participation.rows[0].periodo_id, 1);
        assert.ok(participation.rows[0].enviado_em instanceof Date);
    });

    await t.test('setor/período inexistentes, futuro e encerrado não deixam registros', async () => {
        const before = await totals();
        for (const changes of [{ mega_setor_id: 999 }, { periodo_id: 999 }, { periodo_id: 2 }, { periodo_id: 3 }]) {
            const body = { ...await validBody(), ...changes };
            assert.equal((await app.post(body)).status, 422);
            assert.deepEqual(await totals(), before);
        }
    });

    await t.test('vigência inclui início e exclui fim, usando o relógio PostgreSQL', async () => {
        const client = await database.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`INSERT INTO periodos_coleta (nome, data_inicio, data_fim) VALUES
                ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day'),
                ($2, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP)
            `, ['Fictício no início', 'Fictício no fim']);
            // Usa a API na mesma transação para fixar exatamente CURRENT_TIMESTAMP.
            const boundaryPool = {
                connect: async () => ({
                    query: async (sql, values) => {
                        if (sql === 'BEGIN') return client.query('SAVEPOINT boundary');
                        if (sql === 'COMMIT') return client.query('RELEASE SAVEPOINT boundary');
                        if (sql === 'ROLLBACK') return client.query('ROLLBACK TO SAVEPOINT boundary');
                        return client.query(sql, values);
                    },
                    release() {},
                }),
            };
            const boundaryApp = await startApp(t, { pool: boundaryPool });
            const result = await client.query("SELECT id FROM periodos_coleta WHERE nome = ANY($1) ORDER BY id", [['Fictício no início', 'Fictício no fim']]);
            assert.equal((await boundaryApp.post({ ...await validBody(), periodo_id: result.rows[0].id })).status, 201);
            assert.equal((await boundaryApp.post({ ...await validBody(), periodo_id: result.rows[1].id })).status, 422);
        } finally {
            await client.query('ROLLBACK');
            client.release();
        }
    });

    await t.test('erro SQL nas respostas desfaz também a participação inserida antes', async () => {
        const before = await totals();
        // Constraint só no schema temporário: falha em uma alternativa válida da API.
        await database.pool.query("ALTER TABLE respostas ADD CONSTRAINT falha_ficticia CHECK (questao_numero <> 31 OR alternativa <> 'Sim') NOT VALID");
        try {
            const response = await app.post(await validBody());
            assert.equal(response.status, 500);
            assert.equal((await response.json()).codigo, 'FALHA_PERSISTENCIA');
            assert.deepEqual(await totals(), before);
        } finally {
            await database.pool.query('ALTER TABLE respostas DROP CONSTRAINT falha_ficticia');
        }
        // A conexão continua utilizável depois do rollback.
        assert.equal((await app.post(await validBody())).status, 201);
        assert.deepEqual(await totals(), { participacoes: before.participacoes + 1, respostas: before.respostas + 31 });
    });

    await t.test('falha real no COMMIT desfaz participação e respostas', async () => {
        const before = await totals();
        // FK adiada provoca falha somente no COMMIT, depois dos dois INSERTs.
        await database.pool.query(`
            CREATE TABLE bloqueio_ficticio (id BIGINT PRIMARY KEY);
            INSERT INTO bloqueio_ficticio (id) SELECT id FROM participacoes;
            ALTER TABLE participacoes ADD CONSTRAINT falha_commit_ficticia
            FOREIGN KEY (id) REFERENCES bloqueio_ficticio(id) DEFERRABLE INITIALLY DEFERRED
        `);
        try {
            assert.equal((await app.post(await validBody())).status, 500);
            assert.deepEqual(await totals(), before);
        } finally {
            await database.pool.query('ALTER TABLE participacoes DROP CONSTRAINT falha_commit_ficticia');
            await database.pool.query('DROP TABLE bloqueio_ficticio');
        }
    });
});

test('demonstração isolada aceita o JSON documentado e encerra com limpeza do schema', async () => {
    const demo = await startDemo({ port: 0 });
    try {
        const response = await fetch(`http://127.0.0.1:${demo.server.address().port}/participacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() },
            body: JSON.stringify(require('../examples/submissao-ficticia.json')),
            signal: AbortSignal.timeout(5000),
        });
        assert.equal(response.status, 201);
        assert.equal((await response.json()).modo, 'demonstracao');
    } finally {
        await demo.close();
    }
});
