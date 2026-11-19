/* global __dirname */
const fs = require('node:fs/promises');
const path = require('node:path');
const { emitKeypressEvents } = require('node:readline');
const { hashPassword, validateAccounts, usernamePattern } = require('../admin-auth');
const { configPath } = require('../admin-config');

async function writeInitialAdminConfig(username, password, databasePassword, targetPath = configPath) {
    if (!usernamePattern.test(username || '')) throw new Error('Nome de usuário inválido.');
    if (typeof password !== 'string' || [...password].length < 8 || [...password].length > 128) {
        throw new Error('Use uma senha independente com 8 a 128 caracteres.');
    }
    if (password === databasePassword) throw new Error('Não use a senha PostgreSQL.');
    const senha_hash = await hashPassword(password);
    const contas = validateAccounts([{ usuario: username, senha_hash, papel: 'gerenciador' }]);
    await fs.writeFile(targetPath, JSON.stringify({ contas }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return { usuario: username, papel: 'gerenciador' };
}

function hiddenPassword(prompt) {
    if (!process.stdin.isTTY) throw new Error('Execute em terminal interativo para ocultar a senha.');
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    return new Promise((resolve, reject) => {
        let value = '';
        const done = () => {
            process.stdin.removeListener('keypress', onKey);
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\n');
        };
        const onKey = (text, key) => {
            if (key?.ctrl && key.name === 'c') { done(); reject(new Error('Cancelado.')); }
            else if (key?.name === 'return') { done(); resolve(value); }
            else if (key?.name === 'backspace') value = [...value].slice(0, -1).join('');
            else if (text && !key?.ctrl && !/[\r\n\x00-\x1f]/.test(text)) value += text;
        };
        process.stdin.on('keypress', onKey);
    });
}

async function main() {
    const username = process.argv[2];
    if (!usernamePattern.test(username || '')) throw new Error('Uso: npm run admin:setup -- usuario (3–80 letras, números, _, . ou -).');
    // Lê somente configuração local; não importa o pool e não conecta no banco.
    require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
    const password = await hiddenPassword('Senha administrativa independente (8–128 caracteres): ');
    const confirmation = await hiddenPassword('Confirme a senha: ');
    if (password !== confirmation) throw new Error('Senhas diferentes.');
    if (password === process.env.DB_PASSWORD) throw new Error('Não use a senha PostgreSQL.');
    await writeInitialAdminConfig(username, password, process.env.DB_PASSWORD);
    console.log('Conta local criada. Reinicie o backend. Preserve o arquivo apenas para operadores autorizados.');
}

if (require.main === module) main().catch(error => {
    console.error(error.code === 'EEXIST' ? 'Configuração existente preservada; nenhuma conta foi sobrescrita.' : error.message);
    process.exitCode = 1;
});

module.exports = { hiddenPassword, writeInitialAdminConfig };
