const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { hashPassword, verifyPassword } = require('../admin-auth');
const { loadAdminAccounts } = require('../admin-config');
const { writeInitialAdminConfig } = require('../scripts/setup-admin');
const { startApp, fakePool } = require('./helpers.cjs');

const managerPassword = 'Senha exclusiva do gerenciador 2026!';
const professionalPassword = 'Senha de profissional autorizado 2026!';
const newPassword = 'Senha nova do profissional autorizado 2026!';

async function tempDirectory(t) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'inventario-admin-users-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    return directory;
}

async function login(app, usuario, senha) {
    const response = await fetch(app.url + '/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, senha }),
    });
    assert.equal(response.status, 200);
    return { Authorization: `Bearer ${(await response.json()).token}` };
}

test('Gerenciador lista e cadastra profissionais com hash scrypt, sem devolver segredo ou permitir outro papel', async t => {
    const accounts = [
        { usuario: 'gerenciador.teste', senha_hash: await hashPassword(managerPassword), papel: 'gerenciador' },
        { usuario: 'profissional.existente', senha_hash: await hashPassword(professionalPassword), papel: 'profissional_autorizado' },
    ];
    let persisted;
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts, saveAdminAccounts: async next => { persisted = next; } });
    const headers = await login(app, 'gerenciador.teste', managerPassword);

    const listed = await fetch(app.url + '/admin/usuarios', { headers });
    assert.equal(listed.status, 200);
    assert.deepEqual(await listed.json(), [{ usuario: 'profissional.existente', papel: 'profissional_autorizado' }]);

    const created = await fetch(app.url + '/admin/usuarios', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'profissional.novo', senha: newPassword }),
    });
    assert.equal(created.status, 201);
    const responseBody = await created.json();
    assert.deepEqual(responseBody, {
        usuario: 'profissional.novo', papel: 'profissional_autorizado', mensagem: 'Profissional autorizado cadastrado com sucesso.',
    });
    assert.doesNotMatch(JSON.stringify(responseBody), /senha|scrypt|hash/i);
    assert.equal(persisted.length, 3);
    assert.equal(persisted[0].usuario, 'gerenciador.teste');
    assert.equal(persisted[0].papel, 'gerenciador');
    assert.equal(persisted[1].senha_hash, accounts[1].senha_hash);
    assert.match(persisted[2].senha_hash, /^scrypt:131072:8:1:/);
    assert.equal(await verifyPassword(newPassword, persisted[2].senha_hash), true);

    const attemptPromotion = await fetch(app.url + '/admin/usuarios', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'gerenciador.extra', senha: newPassword, papel: 'gerenciador' }),
    });
    assert.equal(attemptPromotion.status, 400);
    assert.equal(persisted.length, 3);
});

test('profissional autorizado não lista nem cadastra contas', async t => {
    const accounts = [
        { usuario: 'gerenciador.teste', senha_hash: await hashPassword(managerPassword), papel: 'gerenciador' },
        { usuario: 'profissional.teste', senha_hash: await hashPassword(professionalPassword), papel: 'profissional_autorizado' },
    ];
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts });
    const headers = await login(app, 'profissional.teste', professionalPassword);
    const listed = await fetch(app.url + '/admin/usuarios', { headers });
    assert.equal(listed.status, 403);
    assert.deepEqual(await listed.json(), { codigo: 'PERMISSAO_NEGADA' });
    const created = await fetch(app.url + '/admin/usuarios', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'outro.profissional', senha: newPassword }),
    });
    assert.equal(created.status, 403);
});

test('operações de contas sem sessão são negadas e cadastro público não existe', async t => {
    const accounts = [{ usuario: 'gerenciador.teste', senha_hash: await hashPassword(managerPassword), papel: 'gerenciador' }];
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts });
    for (const method of ['GET', 'POST']) {
        const response = await fetch(app.url + '/admin/usuarios', {
            method, headers: { 'Content-Type': 'application/json' },
            ...(method === 'POST' ? { body: JSON.stringify({ usuario: 'profissional.novo', senha: newPassword }) } : {}),
        });
        assert.equal(response.status, 401);
    }
    const headers = await login(app, 'gerenciador.teste', managerPassword);
    const publicRegistration = await fetch(app.url + '/admin/cadastro', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'profissional.novo', senha: newPassword }),
    });
    assert.equal(publicRegistration.status, 404);
});

test('configuração antiga mantém as contas, promove o primeiro bootstrap a Gerenciador e grava atomicamente novos usuários', async t => {
    const directory = await tempDirectory(t);
    const targetPath = path.join(directory, '.admin.local.json');
    const oldHash = await hashPassword(managerPassword);
    const existingHash = await hashPassword(professionalPassword);
    const oldConfig = JSON.stringify({ contas: [
        { usuario: 'primeiro.usuario', senha_hash: oldHash, papel: 'profissional_autorizado' },
        { usuario: 'profissional.existente', senha_hash: existingHash, papel: 'profissional_autorizado' },
    ] });
    await writeFile(targetPath, oldConfig, { mode: 0o600 });

    const store = await loadAdminAccounts('senha banco diferente', targetPath);
    assert.deepEqual(store.accounts.map(({ usuario, papel }) => [usuario, papel]), [
        ['primeiro.usuario', 'gerenciador'], ['profissional.existente', 'profissional_autorizado'],
    ]);
    const newHash = await hashPassword(newPassword);
    await store.saveAccounts([...store.accounts, { usuario: 'profissional.novo', senha_hash: newHash, papel: 'profissional_autorizado' }]);

    const saved = JSON.parse(await readFile(targetPath, 'utf8'));
    assert.deepEqual(saved.contas.map(({ usuario, papel }) => [usuario, papel]), [
        ['primeiro.usuario', 'gerenciador'], ['profissional.existente', 'profissional_autorizado'], ['profissional.novo', 'profissional_autorizado'],
    ]);
    assert.equal(saved.contas[0].senha_hash, oldHash);
    assert.equal(saved.contas[1].senha_hash, existingHash);
    assert.equal(await verifyPassword(newPassword, saved.contas[2].senha_hash), true);
    assert.doesNotMatch(await readFile(targetPath, 'utf8'), new RegExp(newPassword));
});

test('bootstrap cria papel Gerenciador e preserva qualquer configuração que já exista', async t => {
    const directory = await tempDirectory(t);
    const targetPath = path.join(directory, '.admin.local.json');
    const created = await writeInitialAdminConfig('primeiro.admin', managerPassword, 'senha banco', targetPath);
    assert.deepEqual(created, { usuario: 'primeiro.admin', papel: 'gerenciador' });
    const original = await readFile(targetPath, 'utf8');
    const config = JSON.parse(original);
    assert.equal(config.contas[0].papel, 'gerenciador');
    assert.match(config.contas[0].senha_hash, /^scrypt:131072:8:1:/);
    await assert.rejects(writeInitialAdminConfig('outro.admin', newPassword, 'senha banco', targetPath), { code: 'EEXIST' });
    assert.equal(await readFile(targetPath, 'utf8'), original);
});

test('mudança externa na configuração impede gravação para não apagar alterações', async t => {
    const directory = await tempDirectory(t);
    const targetPath = path.join(directory, '.admin.local.json');
    const account = { usuario: 'gerenciador.teste', senha_hash: await hashPassword(managerPassword), papel: 'gerenciador' };
    await writeFile(targetPath, JSON.stringify({ contas: [account] }), { mode: 0o600 });
    const store = await loadAdminAccounts('senha banco', targetPath);
    const externalChange = JSON.stringify({ contas: [account, {
        usuario: 'externo.adicionado', senha_hash: await hashPassword(professionalPassword), papel: 'profissional_autorizado',
    }] });
    await writeFile(targetPath, externalChange);
    await assert.rejects(store.saveAccounts(store.accounts), /mudou/);
    assert.equal(await readFile(targetPath, 'utf8'), externalChange);
});

test('política de senha aceita 8 caracteres e rejeita senhas menores que 8 caracteres', async t => {
    const accounts = [{ usuario: 'gerenciador.teste', senha_hash: await hashPassword(managerPassword), papel: 'gerenciador' }];
    let persisted = accounts;
    const app = await startApp(t, { pool: fakePool(), adminAccounts: accounts, saveAdminAccounts: async next => { persisted = next; } });
    const headers = await login(app, 'gerenciador.teste', managerPassword);

    const shortAttempt = await fetch(app.url + '/admin/usuarios', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'medico.curto', senha: '1234567' }),
    });
    assert.equal(shortAttempt.status, 400);

    const validAttempt = await fetch(app.url + '/admin/usuarios', {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'medico.oito', senha: 'Senha123', nome: 'Dra. Ana' }),
    });
    assert.equal(validAttempt.status, 201);
    assert.equal(persisted.length, 2);
});
