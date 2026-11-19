const { randomBytes, scrypt, timingSafeEqual, createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { Buffer } = require('node:buffer');
const derive = promisify(scrypt);
const cost = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const usernamePattern = /^[a-zA-Z0-9_.-]{3,80}$/;

async function hashPassword(password) {
    if (typeof password !== 'string' || [...password].length < 8 || [...password].length > 128) {
        throw new Error('Use uma senha independente com 8 a 128 caracteres.');
    }
    const salt = randomBytes(16).toString('hex');
    const key = await derive(password, salt, 64, cost);
    return `scrypt:131072:8:1:${salt}:${key.toString('hex')}`;
}

function validHash(hash) {
    return typeof hash === 'string' && /^scrypt:131072:8:1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash);
}

async function verifyPassword(password, hash) {
    if (!validHash(hash)) return false;
    const parts = hash.split(':');
    const key = await derive(password, parts[4], 64, cost);
    return timingSafeEqual(key, Buffer.from(parts[5], 'hex'));
}

function validateAccounts(accounts) {
    if (!Array.isArray(accounts) || accounts.length > 50) throw new Error('Configuração administrativa inválida.');
    const names = new Set();
    let managers = 0;
    for (const account of accounts) {
        if (typeof account?.usuario !== 'string' || !usernamePattern.test(account.usuario) || !validHash(account.senha_hash)
            || !['gerenciador', 'profissional_autorizado'].includes(account.papel) || names.has(account.usuario)) {
            throw new Error('Configuração administrativa inválida.');
        }
        if (account.papel === 'gerenciador') managers++;
        names.add(account.usuario);
    }
    if (managers > 1) throw new Error('Configuração administrativa inválida.');
    return accounts;
}

// Um processo no MVP: reiniciar revoga todas as sessões. Não registra tokens,
// senhas ou corpos. O arquivo local define explicitamente quem é autorizado.
function createAdminAuth({ accounts = [], databasePassword, now = Date.now, saveAccounts = async () => {} } = {}) {
    let currentAccounts = validateAccounts(accounts).map(account => ({ ...account }));
    const sessions = new Map();
    const attempts = new Map();
    let activeVerifications = 0;
    let accountQueue = Promise.resolve();
    const ttl = 30 * 60 * 1000;
    const windowMs = 15 * 60 * 1000;
    const digest = token => createHash('sha256').update(token).digest('hex');
    const deny = res => res.status(401).json({ codigo: 'NAO_AUTORIZADO' });
    const tokenFrom = req => /^Bearer ([a-f0-9]{64})$/.exec(req.get('Authorization') || '')?.[1];
    const cleanup = () => {
        for (const [key, value] of attempts) if (value.until <= now()) attempts.delete(key);
        for (const [key, value] of sessions) if (value.expires <= now()) sessions.delete(key);
    };
    return {
        enabled: currentAccounts.length > 0,
        async login(req, res) {
            cleanup();
            const body = req.body;
            if (!body || Object.keys(body).length !== 2 || typeof body.usuario !== 'string' || !usernamePattern.test(body.usuario)
                || typeof body.senha !== 'string' || [...body.senha].length > 128) return deny(res);
            const keys = [`ip:${req.socket.remoteAddress}`, `user:${body.usuario}`, 'global'];
            if (activeVerifications >= 2 || attempts.size > 1000 || keys.some(key => (attempts.get(key)?.count || 0) >= (key === 'global' ? 30 : 5))) {
                res.set('Retry-After', '900');
                return res.status(429).json({ codigo: 'TENTATIVAS_LIMITADAS' });
            }
            for (const key of keys) {
                const attempt = attempts.get(key) || { count: 0, until: now() + windowMs };
                attempt.count++;
                attempts.set(key, attempt);
            }
            const account = currentAccounts.find(item => item.usuario === body.usuario);
            // Mesmo custo para usuário inexistente, usando hash local válido.
            activeVerifications++;
            let valid;
            try {
                valid = await verifyPassword(body.senha, (account || currentAccounts[0]).senha_hash);
            } finally {
                activeVerifications--;
            }
            if (!account || account.ativo === false || !valid || (databasePassword && body.senha === databasePassword)) return deny(res);
            if (sessions.size >= 100) return res.status(429).json({ codigo: 'SESSOES_LIMITADAS' });
            const token = randomBytes(32).toString('hex');
            sessions.set(digest(token), { expires: now() + ttl, usuario: account.usuario, papel: account.papel });
            return res.json({ token, tipo: 'Bearer', expira_em_segundos: ttl / 1000 });
        },
        requireSession(req, res, next) {
            cleanup();
            const token = tokenFrom(req);
            const session = token && sessions.get(digest(token));
            const account = session && currentAccounts.find(item => item.usuario === session.usuario);
            if (!session || account?.ativo === false) return deny(res);
            req.admin = { usuario: session.usuario, papel: session.papel };
            next();
        },
        requireManager(req, res, next) {
            if (req.admin?.papel !== 'gerenciador') return res.status(403).json({ codigo: 'PERMISSAO_NEGADA' });
            next();
        },
        currentUser(req, res) {
            res.json({ usuario: req.admin.usuario, papel: req.admin.papel });
        },
        listProfessionals() {
            return currentAccounts.filter(account => account.papel === 'profissional_autorizado')
                .map(account => ({
                    usuario: account.usuario,
                    papel: account.papel,
                    ...(account.nome ? { nome: account.nome } : {}),
                    ...(typeof account.ativo === 'boolean' ? { ativo: account.ativo } : {}),
                }));
        },
        async createProfessional(usuario, password, nome) {
            const operation = accountQueue.then(async () => {
                const trimmedName = typeof nome === 'string' ? nome.trim() : '';
                if (typeof usuario !== 'string' || !usernamePattern.test(usuario)) {
                    return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'O usuário deve ter de 3 a 80 caracteres (letras, números, ponto, hífen ou sublinhado).' };
                }
                if (typeof password !== 'string' || [...password].length < 8 || [...password].length > 128) {
                    return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'A senha deve ter de 8 a 128 caracteres.' };
                }
                if (nome !== undefined && (typeof nome !== 'string' || trimmedName.length > 100)) {
                    return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'O nome completo deve ter no máximo 100 caracteres.' };
                }
                if (currentAccounts.some(account => account.usuario === usuario)) {
                    return { ok: false, status: 409, codigo: 'USUARIO_EXISTENTE' };
                }
                if (currentAccounts.length >= 50) return { ok: false, status: 409, codigo: 'LIMITE_DE_USUARIOS' };
                if (databasePassword && password === databasePassword) {
                    return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'A senha do médico deve ser diferente da senha do banco de dados.' };
                }
                const account = {
                    usuario,
                    senha_hash: await hashPassword(password),
                    papel: 'profissional_autorizado',
                    ...(trimmedName ? { nome: trimmedName } : {}),
                };
                const nextAccounts = validateAccounts([...currentAccounts, account]).map(item => ({ ...item }));
                await saveAccounts(nextAccounts);
                currentAccounts = nextAccounts;
                return {
                    ok: true,
                    account: {
                        usuario: account.usuario,
                        papel: account.papel,
                        ...(account.nome ? { nome: account.nome } : {}),
                    },
                };
            });
            accountQueue = operation.then(() => undefined, () => undefined);
            return operation;
        },
        async updateProfessional(usuario, updates = {}, actorUsuario) {
            const operation = accountQueue.then(async () => {
                if (typeof usuario !== 'string' || !usernamePattern.test(usuario)
                    || !updates || typeof updates !== 'object' || Array.isArray(updates)) {
                    return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS' };
                }
                const allowedKeys = ['ativo', 'nome', 'novoUsuario', 'novaSenha'];
                const keys = Object.keys(updates);
                if (keys.length === 0 || !keys.every(key => allowedKeys.includes(key))) {
                    return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'Informe ao menos um campo válido para atualizar.' };
                }
                const hasAtivo = Object.hasOwn(updates, 'ativo');
                const hasNome = Object.hasOwn(updates, 'nome');
                const hasNovoUsuario = Object.hasOwn(updates, 'novoUsuario');
                const hasNovaSenha = Object.hasOwn(updates, 'novaSenha');

                if (hasAtivo && typeof updates.ativo !== 'boolean') {
                    return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'Informe o status ativo válido.' };
                }
                if (usuario === actorUsuario) {
                    return { ok: false, status: 403, codigo: 'AUTO_DESATIVACAO_NEGADA' };
                }
                const target = currentAccounts.find(account => account.usuario === usuario);
                if (!target) {
                    return { ok: false, status: 404, codigo: 'USUARIO_NAO_ENCONTRADO' };
                }
                if (target.papel === 'gerenciador') {
                    return { ok: false, status: 403, codigo: 'PERMISSAO_NEGADA' };
                }

                let nextUsuario = target.usuario;
                if (hasNovoUsuario) {
                    if (typeof updates.novoUsuario !== 'string' || !usernamePattern.test(updates.novoUsuario)) {
                        return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'O usuário deve ter de 3 a 80 caracteres (letras, números, ponto, hífen ou sublinhado).' };
                    }
                    if (updates.novoUsuario !== target.usuario && currentAccounts.some(account => account.usuario === updates.novoUsuario)) {
                        return { ok: false, status: 409, codigo: 'USUARIO_EXISTENTE', mensagem: 'Este nome de usuário já está cadastrado.' };
                    }
                    nextUsuario = updates.novoUsuario;
                }

                let nextNome = target.nome;
                if (hasNome) {
                    if (typeof updates.nome !== 'string') {
                        return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'O nome completo deve ter no máximo 100 caracteres.' };
                    }
                    const trimmedName = updates.nome.trim();
                    if (trimmedName.length > 100) {
                        return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'O nome completo deve ter no máximo 100 caracteres.' };
                    }
                    nextNome = trimmedName || undefined;
                }

                let nextPasswordHash = target.senha_hash;
                const passwordChanged = hasNovaSenha && typeof updates.novaSenha === 'string' && updates.novaSenha.length > 0;
                if (hasNovaSenha) {
                    if (typeof updates.novaSenha !== 'string') {
                        return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'A senha deve ter de 8 a 128 caracteres.' };
                    }
                    if (updates.novaSenha.length > 0) {
                        if ([...updates.novaSenha].length < 8 || [...updates.novaSenha].length > 128) {
                            return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'A senha deve ter de 8 a 128 caracteres.' };
                        }
                        if (databasePassword && updates.novaSenha === databasePassword) {
                            return { ok: false, status: 400, codigo: 'DADOS_INVALIDOS', mensagem: 'A senha do médico deve ser diferente da senha do banco de dados.' };
                        }
                        nextPasswordHash = await hashPassword(updates.novaSenha);
                    }
                }

                const nextAtivo = hasAtivo ? updates.ativo : target.ativo;
                const updatedAccount = {
                    ...target,
                    usuario: nextUsuario,
                    senha_hash: nextPasswordHash,
                    ...(typeof nextAtivo === 'boolean' ? { ativo: nextAtivo } : {}),
                };
                if (nextNome) updatedAccount.nome = nextNome;
                else delete updatedAccount.nome;

                const nextAccounts = validateAccounts(
                    currentAccounts.map(account => account.usuario === usuario ? updatedAccount : { ...account })
                ).map(item => ({ ...item }));
                await saveAccounts(nextAccounts);
                currentAccounts = nextAccounts;

                const usernameChanged = nextUsuario !== target.usuario;
                const deactivated = hasAtivo && nextAtivo === false;
                if (usernameChanged || passwordChanged || deactivated) {
                    for (const [tokenDigest, session] of sessions) {
                        if (session.usuario === usuario) sessions.delete(tokenDigest);
                    }
                }

                return {
                    ok: true,
                    account: {
                        usuario: updatedAccount.usuario,
                        papel: updatedAccount.papel,
                        ...(updatedAccount.nome ? { nome: updatedAccount.nome } : {}),
                        ...(typeof updatedAccount.ativo === 'boolean' ? { ativo: updatedAccount.ativo } : {}),
                    },
                };
            });
            accountQueue = operation.then(() => undefined, () => undefined);
            return operation;
        },
        updateProfessionalStatus(usuario, ativo, actorUsuario) {
            return this.updateProfessional(usuario, { ativo }, actorUsuario);
        },
        logout(req, res) {
            sessions.delete(digest(tokenFrom(req)));
            res.sendStatus(204);
        },
    };
}

module.exports = { hashPassword, verifyPassword, validateAccounts, createAdminAuth, usernamePattern };
