const assert = require('node:assert/strict');
const { test, before } = require('node:test');
const { hashPassword, verifyPassword, createAdminAuth } = require('../admin-auth');
const { calculationStatus, meanAdjustedIER, rules } = require('../scoring');
const { createAdminRouter } = require('../admin');
const { startApp, fakePool } = require('./helpers.cjs');

const password = 'Senha inteiramente fictícia 2026!';
let accounts;
before(async () => {
    accounts = [{ usuario: 'profissional.ficticio', senha_hash: await hashPassword(password), papel: 'profissional_autorizado' }];
});
const login = (app, usuario = accounts[0].usuario, senha = password) => fetch(app.url + '/admin/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, senha }),
});
async function authorized(t, options = {}) {
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts, ...options });
    const response = await login(app);
    assert.equal(response.status, 200);
    const body = await response.json();
    return { app, headers: { Authorization: `Bearer ${body.token}` }, token: body.token };
}

test('scrypt com salt independente, verificação correta e senha curta rejeitada', async () => {
    const other = await hashPassword(password);
    assert.notEqual(other, accounts[0].senha_hash);
    assert.doesNotMatch(other, /fictícia/);
    assert.equal(await verifyPassword(password, other), true);
    assert.equal(await verifyPassword('senha errada', other), false);
    await assert.rejects(hashPassword('curta'));
});

test('admin desabilitado sem credencial local; nenhuma consulta ao banco', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool });
    assert.equal((await app.get('/admin/resultados?setor_id=1&periodo_id=1')).status, 503);
    assert.equal(pool.calls.length, 0);
});

test('login válido cria sessão, logout revoga e não há acesso por token revogado', async t => {
    const { app, headers } = await authorized(t);
    assert.equal((await fetch(app.url + '/admin/calculo', { headers })).status, 200);
    assert.equal((await fetch(app.url + '/admin/logout', { method: 'POST', headers })).status, 204);
    assert.equal((await fetch(app.url + '/admin/calculo', { headers })).status, 401);
});

test('senha/usuário inválidos têm a mesma resposta genérica; senha PostgreSQL recusada', async t => {
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts });
    const responses = [];
    for (const [user, pass] of [[accounts[0].usuario, 'errada'], ['inexistente', password]]) {
        const response = await login(app, user, pass);
        assert.equal(response.status, 401);
        responses.push(await response.json());
    }
    assert.deepEqual(responses[0], responses[1]);
    const other = await startApp(t, { pool: fakePool(), adminAccounts: accounts, databasePassword: password });
    assert.equal((await login(other)).status, 401);
});

test('todas as rotas administrativas exigem sessão, inclusive rotas desconhecidas e métodos', async t => {
    const pool = fakePool();
    const app = await startApp(t, { pool, adminAccounts: accounts });
    for (const path of ['/admin/calculo', '/admin/resultados?setor_id=1&periodo_id=3', '/admin/respostas', '/admin/participacoes/1', '/admin/logout']) {
        for (const method of ['GET', 'POST', 'DELETE']) {
            assert.equal((await fetch(app.url + path, { method })).status, 401);
        }
    }
    for (const token of ['errado', 'a'.repeat(64)]) {
        assert.equal((await fetch(app.url + '/admin/calculo', { headers: { Authorization: `Bearer ${token}` } })).status, 401);
    }
    assert.equal(pool.calls.length, 0);
});

test('sessão expira em 30 minutos e não é compartilhada entre processos', async t => {
    let now = 0;
    const { app, headers } = await authorized(t, { adminNow: () => now });
    now = 30 * 60 * 1000;
    assert.equal((await fetch(app.url + '/admin/calculo', { headers })).status, 401);
    const other = await startApp(t, { pool: fakePool(), adminAccounts: accounts });
    assert.equal((await fetch(other.url + '/admin/calculo', { headers })).status, 401);
});

test('limitação de tentativas e recuperação após janela, sem iniciar novas verificações', async t => {
    let now = 0;
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts, adminNow: () => now });
    for (let i = 0; i < 5; i++) assert.equal((await login(app, accounts[0].usuario, 'errada')).status, 401);
    const limited = await login(app);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('Retry-After'), '900');
    now += 15 * 60 * 1000;
    assert.equal((await login(app)).status, 200);
});

test('origens web administrativas recusadas, JSON limitado e erro sem credenciais', async t => {
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts });
    assert.equal((await fetch(app.url + '/admin/calculo', { headers: { Origin: 'http://localhost:8081' } })).status, 403);
    assert.equal((await fetch(app.url + '/admin/login', { method: 'POST', body: '{}' })).status, 415);
    for (const [body, status] of [['{', 400], ['x'.repeat(3000), 413], [JSON.stringify({ usuario: accounts[0].usuario, senha: password, papel: 'admin' }), 401]]) {
        const response = await fetch(app.url + '/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        assert.equal(response.status, status);
        assert.doesNotMatch(await response.text(), /fictícia|scrypt|SELECT/);
    }
});

test('HTTPS exigido em conexão remota e X-Forwarded-For não concede exceção local', () => {
    const router = createAdminRouter({ pool: fakePool(), accounts });
    let status;
    let body;
    router.handle({ method: 'GET', url: '/calculo', socket: { remoteAddress: '192.0.2.1' }, secure: false,
        get: key => key === 'X-Forwarded-For' ? '127.0.0.1' : undefined }, {
        set() {}, status(value) { status = value; return this; }, json(value) { body = value; },
    }, error => { throw error || new Error('Transporte inseguro passou pelo middleware.'); });
    assert.equal(status, 403);
    assert.deepEqual(body, { codigo: 'HTTPS_OBRIGATORIO' });
    assert.throws(() => createAdminAuth({ accounts: [{ ...accounts[0], papel: 'publico' }] }));
});

test('filtros arbitrários, arrays, totais, pais e sobreposição por datas recusados antes do banco', async t => {
    const pool = fakePool();
    const { app, headers } = await authorized(t, { pool });
    for (const query of ['', '?setor_id=1', '?setor_id=1&periodo_id=3&total=true', '?setor_id=1&setor_id=2&periodo_id=3',
        '?setor_id[]=1&periodo_id=3', '?setor_id=1,2&periodo_id=3', '?setor_id=0&periodo_id=3',
        '?setor_id=1&periodo_id=3&inicio=2026-01-01', '?macroarea_id=1&periodo_id=3', '?mega_setor_id=1&periodo_id=3&periodo_id=4',
        '?setor_id=2147483648&periodo_id=3', '?setor_id=1%20OR%201=1&periodo_id=3']) {
        assert.equal((await fetch(app.url + '/admin/resultados' + query, { headers })).status, 400, query);
    }
    assert.equal(pool.calls.length, 0);
});

test('resultados somente de snapshot, parametrizados; ausência e grupos 4/5/6 com whitelist', async t => {
    for (const n of [undefined, 4, 5, 6]) {
        const pool = { async query(sql, values) {
            assert.doesNotMatch(sql, /FROM respostas|FROM participacoes/);
            assert.deepEqual(values, [2, 3]);
            return { rows: n === undefined ? [] : [{ payload: { status: 'disponivel', participacoes_validas: n,
                alertas: { Q28: true, Q29: false, Q30: false, Q31: true, contagem: 1 },
                ier: { versao_regras: rules.versao, global: 50, dimensoes: Object.fromEntries(rules.dimensoes.map(dimension => [dimension.codigo, 50])) },
                participacao_id: '123', respostas: ['sigiloso'], percentual: 20 } }] };
        } };
        const { app, headers } = await authorized(t, { pool });
        const response = await fetch(app.url + '/admin/resultados?mega_setor_id=2&periodo_id=3', { headers });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        const body = await response.json();
        if (!n || n < 5) assert.deepEqual(body, { status: 'protegido_ou_indisponivel' });
        else {
            assert.equal(body.participacoes_validas, n);
            assert.deepEqual(body.alertas, { Q28: true, Q29: false, Q30: false, Q31: true });
            assert.equal(body.ier.disponivel, true);
            assert.equal(body.ier.global.valor, 50);
        }
        assert.doesNotMatch(JSON.stringify(body), /participacao_id|respostas|percentual|contagem|sigiloso/);
    }
});

test('rotas individuais, exportações, totais e escrita não existem após autenticação', async t => {
    const { app, headers } = await authorized(t);
    for (const route of ['/admin/respostas', '/admin/participacoes', '/admin/participacoes/1', '/admin/export', '/admin/totais', '/admin/resultados/1']) {
        assert.equal((await fetch(app.url + route, { headers })).status, 404);
    }
    assert.equal((await fetch(app.url + '/admin/resultados', { method: 'POST', headers })).status, 404);
});

test('falhas de banco não vazam SQL, respostas ou credenciais', async t => {
    const { app, headers } = await authorized(t, { pool: { async query() { throw new Error('SELECT senha sigilosa'); } } });
    const response = await fetch(app.url + '/admin/resultados?mega_setor_id=1&periodo_id=3', { headers });
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /SELECT|senha|sigilosa/);
});

test('IER versionado disponível; aritmética sem pesos aceita somente 27 valores ajustados', () => {
    assert.equal(calculationStatus().disponivel, true);
    // Valores sintéticos abstratos; não codificam alternativas do instrumento.
    const items = Array.from({ length: 27 }, (_, i) => ({ questao: i + 1, valor: i + 1, dimensao: i < 2 ? 'A fictícia' : 'B fictícia' }));
    const result = meanAdjustedIER(items);
    assert.equal(result.global, 14);
    assert.equal(result.dimensoes['A fictícia'], 1.5);
    assert.equal(result.dimensoes['B fictícia'], 15);
    assert.throws(() => meanAdjustedIER(items.slice(1)));
    assert.throws(() => meanAdjustedIER([...items, { questao: 28, valor: 1, dimensao: 'X' }]));
    assert.throws(() => meanAdjustedIER(items.map(item => ({ ...item, valor: NaN }))));
    assert.throws(() => meanAdjustedIER(items.map(item => ({ ...item, questao: 28 }))));
});
