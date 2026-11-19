const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const { validBody, startApp, fakePool } = require('./helpers.cjs');

function idempotentPool() {
    const participacoes = new Map();
    const respostas = [];
    const client = {
        async query(sql, values) {
            const normalized = sql.trim().replace(/\s+/g, ' ');
            if (normalized.startsWith('SELECT conteudo_hash FROM participacoes WHERE chave_envio = $1')) {
                const row = participacoes.get(values[0]);
                return { rowCount: row ? 1 : 0, rows: row ? [{ conteudo_hash: row.conteudo_hash }] : [] };
            }
            if (normalized.includes('FROM macroareas')) return { rowCount: 1, rows: [{ id: values[0] }] };
            if (normalized.includes('FROM periodos_coleta')) return { rowCount: 1, rows: [{ id: values[0], vigente: true }] };
            if (normalized.startsWith('INSERT INTO participacoes')) {
                const [macroareaId, periodoId, key, hash] = values;
                if (participacoes.has(key)) return { rowCount: 0, rows: [] };
                const id = String(participacoes.size + 1);
                participacoes.set(key, { id, macroarea_id: macroareaId, periodo_id: periodoId, conteudo_hash: hash });
                return { rowCount: 1, rows: [{ id }] };
            }
            if (normalized.startsWith('INSERT INTO respostas')) {
                for (let i = 0; i < values.length; i += 3) {
                    respostas.push({ participacao_id: values[i], questao_numero: values[i + 1], alternativa: values[i + 2] });
                }
                return { rowCount: values.length / 3, rows: [] };
            }
            return { rowCount: 0, rows: [] };
        },
        release() {},
    };
    return {
        participacoes,
        respostas,
        async connect() { return client; },
        async query() { return { rows: [] }; },
    };
}

test('Idempotency-Key ausente, inválida ou fora de UUID v4 é rejeitada antes do banco', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool });
    for (const key of [null, '', 'pessoa@example.test', '00000000-0000-1000-8000-000000000000', 'x'.repeat(200)]) {
        const response = await app.post(await validBody(), 'application/json', key);
        assert.equal(response.status, 400);
        assert.equal((await response.json()).codigo, 'CHAVE_INVALIDA');
    }
    assert.deepEqual(pool.calls, []);
});

test('CORS aceita somente origem explícita e preflight permite Idempotency-Key', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool });
    const response = await fetch(app.url + '/participacoes', { method: 'OPTIONS', headers: {
        Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,idempotency-key',
    } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8081');
    assert.match(response.headers.get('access-control-allow-headers'), /Idempotency-Key/);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
    const denied = await fetch(app.url + '/setores', { headers: { Origin: 'https://origem-desconhecida.test' } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.deepEqual(pool.calls, []);
});

test('/health informa modo e recebimento; /periodos calcula vigência no PostgreSQL', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool });
    const health = await (await app.get('/health')).json();
    assert.equal(health.modo, 'demonstracao');
    assert.equal(health.recebimento_habilitado, true);
    await app.get('/periodos');
    assert.ok(pool.calls.some(call => call.sql?.includes('CURRENT_TIMESTAMP') && call.sql.includes('AS vigente')));
    const disabled = await startApp(t, { pool, demoSubmissionsEnabled: false });
    assert.equal((await (await disabled.get('/health')).json()).recebimento_habilitado, false);
});

test('reenvio com mesma idempotency_key retorna resultado original sem duplicar participações', async t => {
    const pool = idempotentPool();
    const app = await startApp(t, { pool });
    const key = randomUUID();
    const body = { ...(await validBody()), idempotency_key: key };

    const first = await app.post(body, 'application/json', key);
    assert.equal(first.status, 201);
    const firstJson = await first.json();

    const replay = await app.post(body, 'application/json', key);
    assert.equal(replay.status, 201);
    assert.deepEqual(await replay.json(), firstJson);
    assert.equal(pool.participacoes.size, 1);
    assert.equal(pool.respostas.length, 31);
});

test('idempotency_key no payload funciona sem cabeçalho e bloqueia reutilização com conteúdo diferente', async t => {
    const pool = idempotentPool();
    const app = await startApp(t, { pool });
    const key = randomUUID();
    const body = { ...(await validBody()), idempotency_key: key };

    const first = await app.post(body, 'application/json', null);
    assert.equal(first.status, 201);

    const replay = await app.post(body, 'application/json', null);
    assert.equal(replay.status, 201);
    assert.equal(pool.participacoes.size, 1);

    const altered = { ...body, mega_setor_id: 2 };
    const conflict = await app.post(altered, 'application/json', null);
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).codigo, 'CHAVE_REUTILIZADA');
    assert.equal(pool.participacoes.size, 1);
});
