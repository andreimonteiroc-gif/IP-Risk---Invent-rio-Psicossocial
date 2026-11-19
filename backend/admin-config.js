/* global __dirname */
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { validateAccounts, verifyPassword } = require('./admin-auth');
const configPath = path.join(__dirname, '.admin.local.json');

function fingerprint(value) {
    return createHash('sha256').update(value).digest('hex');
}

function normalizeAccounts(accounts) {
    const normalized = validateAccounts(accounts).map(account => ({ ...account }));
    // Configurações anteriores usavam profissional_autorizado para a conta criada no bootstrap.
    // Como o script antigo só criava uma conta, a primeira conta legada passa a ser Gerenciador.
    if (normalized.length > 0 && !normalized.some(account => account.papel === 'gerenciador')) {
        normalized[0].papel = 'gerenciador';
    }
    return validateAccounts(normalized);
}

async function loadAdminAccounts(databasePassword, targetPath = configPath) {
    let raw;
    try {
        raw = await fs.readFile(targetPath, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { accounts: [], saveAccounts: async () => { throw new Error('Configuração administrativa inexistente.'); } };
        }
        throw new Error('Não foi possível carregar a configuração administrativa local.');
    }

    let config;
    try { config = JSON.parse(raw); }
    catch { throw new Error('Não foi possível carregar a configuração administrativa local.'); }
    let accounts;
    try { accounts = normalizeAccounts(config.contas); }
    catch { throw new Error('Não foi possível carregar a configuração administrativa local.'); }

    for (const account of accounts) {
        if (databasePassword && await verifyPassword(databasePassword, account.senha_hash)) {
            throw new Error('A senha administrativa deve ser diferente da senha PostgreSQL.');
        }
    }

    let expectedFingerprint = fingerprint(raw);
    let queue = Promise.resolve();
    async function writeAccounts(nextAccounts) {
        const operation = queue.then(async () => {
            const validated = validateAccounts(nextAccounts);
            const directory = path.dirname(targetPath);
            const lockPath = `${targetPath}.lock`;
            let lock;
            let tempPath;
            try {
                lock = await fs.open(lockPath, 'wx', 0o600);
            } catch {
                throw new Error('A configuração administrativa está sendo atualizada. Tente novamente.');
            }
            try {
                const currentRaw = await fs.readFile(targetPath, 'utf8');
                if (fingerprint(currentRaw) !== expectedFingerprint) {
                    throw new Error('A configuração administrativa mudou; reinicie o backend antes de continuar.');
                }
                const output = `${JSON.stringify({ contas: validated }, null, 2)}\n`;
                tempPath = path.join(directory, `${path.basename(targetPath)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`);
                const temporary = await fs.open(tempPath, 'wx', 0o600);
                try {
                    await temporary.writeFile(output, 'utf8');
                    await temporary.sync();
                } finally {
                    await temporary.close();
                }
                await fs.rename(tempPath, targetPath);
                tempPath = undefined;
                expectedFingerprint = fingerprint(output);
            } finally {
                if (tempPath) await fs.rm(tempPath, { force: true }).catch(() => {});
                await lock.close().catch(() => {});
                await fs.rm(lockPath, { force: true }).catch(() => {});
            }
        });
        queue = operation.then(() => undefined, () => undefined);
        return operation;
    }

    return { accounts, saveAccounts: writeAccounts };
}

module.exports = { configPath, loadAdminAccounts, normalizeAccounts };
