const express = require('express');
const { createAdminAuth } = require('./admin-auth');
const { calculationStatus, formatCollectiveIER } = require('./scoring');

function createAdminRouter({ pool, accounts = [], databasePassword, now, saveAccounts }) {
    const router = express.Router();
    const auth = createAdminAuth({ accounts, databasePassword, now, saveAccounts });
    router.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        res.set('X-Content-Type-Options', 'nosniff');
        // The Next.js BFF forwards requests without Origin; direct browser origins remain blocked.
        if (req.get('Origin')) return res.status(403).json({ codigo: 'ORIGEM_NEGADA' });
        const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
        if (!req.secure && !loopback) return res.status(403).json({ codigo: 'HTTPS_OBRIGATORIO' });
        if (!auth.enabled) return res.status(503).json({ codigo: 'ADMIN_DESABILITADO' });
        next();
    });
    router.post('/login', (req, res, next) => {
        if (!req.is('application/json')) return res.status(415).json({ codigo: 'TIPO_INVALIDO' });
        next();
    }, express.json({ limit: '2kb' }), auth.login);
    router.use(auth.requireSession);
    router.post('/logout', auth.logout);
    router.get('/sessao', auth.currentUser);
    router.get('/usuarios', auth.requireManager, (req, res) => res.json(auth.listProfessionals()));
    router.post('/usuarios', auth.requireManager, (req, res, next) => {
        if (!req.is('application/json')) return res.status(415).json({ codigo: 'TIPO_INVALIDO' });
        next();
    }, express.json({ limit: '2kb' }), async (req, res) => {
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Envie os dados de cadastro em formato JSON válido.' });
        }
        const keys = Object.keys(body);
        if (!keys.every(key => ['usuario', 'senha', 'nome', 'papel'].includes(key))) {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Campos não permitidos no cadastro.' });
        }
        if (Object.hasOwn(body, 'papel') && body.papel !== 'profissional_autorizado') {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Não é permitido cadastrar usuários com papel diferente de Médico / Profissional Autorizado.' });
        }
        if (!Object.hasOwn(body, 'usuario')) {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Informe o nome de usuário.' });
        }
        if (!Object.hasOwn(body, 'senha')) {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Informe a senha (8 a 128 caracteres).' });
        }
        try {
            const result = await auth.createProfessional(body.usuario, body.senha, body.nome);
            if (!result.ok) {
                const messages = {
                    DADOS_INVALIDOS: result.mensagem || 'Confira o nome de usuário e a senha informados.',
                    USUARIO_EXISTENTE: 'Este nome de usuário já está cadastrado.',
                    LIMITE_DE_USUARIOS: 'O limite de usuários autorizados foi atingido.',
                };
                return res.status(result.status).json({ codigo: result.codigo, mensagem: messages[result.codigo] });
            }
            res.status(201).json({
                usuario: result.account.usuario,
                papel: result.account.papel,
                ...(result.account.nome ? { nome: result.account.nome } : {}),
                mensagem: 'Profissional autorizado cadastrado com sucesso.',
            });
        } catch {
            res.status(503).json({ codigo: 'CONFIGURACAO_INDISPONIVEL', mensagem: 'Não foi possível salvar a nova conta. A configuração anterior foi preservada.' });
        }
    });
    router.patch('/usuarios/:usuario', auth.requireManager, (req, res, next) => {
        if (!req.is('application/json')) return res.status(415).json({ codigo: 'TIPO_INVALIDO' });
        next();
    }, express.json({ limit: '2kb' }), async (req, res) => {
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Envie os dados de atualização em formato JSON válido.' });
        }
        const keys = Object.keys(body);
        if (keys.length === 0 || !keys.every(key => ['ativo', 'nome', 'novoUsuario', 'novaSenha'].includes(key))) {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Informe apenas campos válidos para atualização.' });
        }
        if (Object.hasOwn(body, 'ativo') && typeof body.ativo !== 'boolean') {
            return res.status(400).json({ codigo: 'DADOS_INVALIDOS', mensagem: 'Informe o status ativo válido.' });
        }
        try {
            const result = await auth.updateProfessional(req.params.usuario, body, req.admin.usuario);
            if (!result.ok) {
                const messages = {
                    DADOS_INVALIDOS: result.mensagem || 'Solicitação inválida.',
                    AUTO_DESATIVACAO_NEGADA: 'O Superadministrador não pode desativar a própria conta.',
                    USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado.',
                    USUARIO_EXISTENTE: result.mensagem || 'Este nome de usuário já está cadastrado.',
                    PERMISSAO_NEGADA: 'Não é possível alterar esta conta.',
                };
                return res.status(result.status).json({ codigo: result.codigo, mensagem: messages[result.codigo] || 'Não foi possível atualizar o usuário.' });
            }
            const onlyStatusUpdate = keys.length === 1 && Object.hasOwn(body, 'ativo');
            res.json({
                ...result.account,
                mensagem: onlyStatusUpdate
                    ? (result.account.ativo ? 'Acesso do médico reativado com sucesso.' : 'Acesso do médico desativado com sucesso.')
                    : 'Dados do médico atualizados com sucesso.',
            });
        } catch {
            res.status(503).json({ codigo: 'CONFIGURACAO_INDISPONIVEL', mensagem: 'Não foi possível atualizar a conta.' });
        }
    });
    router.get('/calculo', (req, res) => res.json(calculationStatus()));
    router.get('/mega-setores', async (req, res) => {
        const result = await pool.query('SELECT id, nome FROM macroareas ORDER BY id');
        res.json(result.rows.map(row => ({ id: row.id, nome: row.nome })));
    });
    router.get('/periodos', async (req, res) => {
        const result = await pool.query(`SELECT p.id, p.nome, ap.data_inicio, ap.data_fim
            FROM admin_publicacoes ap JOIN periodos_coleta p ON p.id = ap.periodo_id
            WHERE ap.politica = 'mega_setor_periodo_fechado_v1'
            ORDER BY ap.data_fim DESC, p.id DESC`);
        res.json(result.rows.map(row => ({ id: row.id, nome: row.nome, data_inicio: row.data_inicio, data_fim: row.data_fim })));
    });
    router.get('/resultados', async (req, res) => {
        const keys = Object.keys(req.query);
        const id = value => typeof value === 'string' && /^[1-9][0-9]{0,9}$/.test(value) && Number(value) <= 2147483647;
        if (keys.length !== 2 || !keys.includes('mega_setor_id') || !keys.includes('periodo_id')
            || !id(req.query.mega_setor_id) || !id(req.query.periodo_id)) {
            return res.status(400).json({ codigo: 'FILTRO_INVALIDO', mensagem: 'Informe somente um mega_setor_id e um periodo_id exatos.' });
        }
        const result = await pool.query(`SELECT g.payload FROM admin_macrogrupos_publicados g
            WHERE g.macroarea_id = $1 AND g.periodo_id = $2`, [Number(req.query.mega_setor_id), Number(req.query.periodo_id)]);
        const payload = result.rows[0]?.payload;
        // Não revela se grupo inexistente, vazio, pequeno ou não publicado.
        const hidden = { status: 'protegido_ou_indisponivel' };
        if (!payload || payload.status !== 'disponivel' || !Number.isSafeInteger(payload.participacoes_validas)
            || payload.participacoes_validas < 5
            || !['Q28', 'Q29', 'Q30', 'Q31'].every(key => typeof payload.alertas?.[key] === 'boolean')) {
            return res.json(hidden);
        }
        // Lista explícita: nunca repassa JSON armazenado, IDs individuais ou respostas.
        res.json({ status: 'disponivel', participacoes_validas: payload.participacoes_validas,
            alertas: Object.fromEntries(['Q28', 'Q29', 'Q30', 'Q31'].map(key => [key, payload.alertas[key]])),
            ier: formatCollectiveIER(payload.ier) });
    });
    router.use((req, res) => res.status(404).json({ codigo: 'ROTA_INEXISTENTE' }));
    return router;
}

module.exports = { createAdminRouter };
