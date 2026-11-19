const express = require('express');
const { validateSubmission, UUID_V4_REGEX } = require('./questionnaire');
const { saveSubmission, SubmissionError } = require('./submissions');
const { createAdminRouter } = require('./admin');
const { catalog } = require('./sector-catalog');

function createApp({ pool, adminAccounts = [], saveAdminAccounts, databasePassword, adminNow, demoSubmissionsEnabled = false, environment = process.env.NODE_ENV,
    webOrigins = ['http://localhost:8081', 'http://127.0.0.1:8081'] }) {
    const app = express();
    app.disable('x-powered-by');
    const enabled = demoSubmissionsEnabled && environment !== 'production';
    app.use('/admin', createAdminRouter({ pool, accounts: adminAccounts, databasePassword, now: adminNow, saveAccounts: saveAdminAccounts }));
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        const origin = req.get('Origin');
        if (origin) {
            res.vary('Origin');
            if (!enabled || !webOrigins.includes(origin)) {
                return res.status(403).json({ codigo: 'ORIGEM_NEGADA', mensagem: 'Origem web não autorizada para demonstração.' });
            }
            res.set('Access-Control-Allow-Origin', origin);
            res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
        }
        if (req.method === 'OPTIONS') return res.sendStatus(204);
        next();
    });

    app.get('/health', (req, res) => {
        res.json({ status: 'ok', mensagem: 'Backend do Inventario Psicossocial funcionando!',
            modo: enabled ? 'demonstracao' : 'desabilitado', recebimento_habilitado: enabled });
    });

    app.get('/db-health', async (req, res) => {
        try {
            const result = await pool.query('SELECT NOW()');
            res.json({ status: 'ok', mensagem: 'Conexao com PostgreSQL funcionando!', horario: result.rows[0].now });
        } catch {
            res.status(500).json({ status: 'erro', mensagem: 'Falha na conexao com o banco.' });
        }
    });

    for (const [route, query, message] of [
        ['/setores', 'SELECT id, nome FROM setores ORDER BY id', 'Erro ao consultar setores'],
        ['/periodos', 'SELECT *, (data_inicio <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP < data_fim) AS vigente FROM periodos_coleta', 'Erro ao consultar periodos'],
    ]) {
        app.get(route, async (req, res) => {
            try {
                const result = await pool.query(query);
                res.json(result.rows);
            } catch {
                res.status(500).json({ mensagem: message });
            }
        });
    }

    app.get('/mega-setores', async (req, res) => {
        try {
            const result = await pool.query('SELECT id, nome FROM macroareas ORDER BY id');
            const expectedNames = catalog.macroareas.map(item => item.nome).sort();
            if (result.rows.length !== expectedNames.length
                || result.rows.map(row => row.nome).sort().some((name, index) => name !== expectedNames[index])) {
                return res.status(503).json({ codigo: 'CATALOGO_INDISPONIVEL', mensagem: 'Catálogo de mega-setores indisponível.' });
            }
            res.json(result.rows);
        } catch {
            res.status(500).json({ mensagem: 'Erro ao consultar mega-setores' });
        }
    });

    app.post('/participacoes', (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        if (!enabled) {
            return res.status(503).json({ codigo: 'COLETA_DESABILITADA', mensagem: 'Recebimento desabilitado. Disponível somente para demonstração com dados fictícios.' });
        }
        if (!req.is('application/json')) {
            return res.status(415).json({ codigo: 'TIPO_INVALIDO', mensagem: 'Use Content-Type application/json.' });
        }
        next();
    }, express.json({ limit: '16kb' }), async (req, res) => {
        const headerKey = req.get('Idempotency-Key');
        const hasBodyKey = req.body !== null && typeof req.body === 'object' && !Array.isArray(req.body)
            && Object.hasOwn(req.body, 'idempotency_key') && req.body.idempotency_key !== undefined;
        const bodyKey = hasBodyKey ? req.body.idempotency_key : undefined;
        if (headerKey !== undefined && bodyKey !== undefined
            && (typeof bodyKey !== 'string' || headerKey.toLowerCase() !== bodyKey.toLowerCase())) {
            return res.status(400).json({ codigo: 'CHAVE_INVALIDA', mensagem: 'Idempotency-Key e idempotency_key devem coincidir.' });
        }
        const key = headerKey ?? bodyKey;
        if (typeof key !== 'string' || !UUID_V4_REGEX.test(key)) {
            return res.status(400).json({ codigo: 'CHAVE_INVALIDA', mensagem: 'Envie Idempotency-Key com UUID v4 válido.' });
        }
        const validationError = validateSubmission(req.body);
        if (validationError) {
            return res.status(400).json({ codigo: 'ENTRADA_INVALIDA', mensagem: validationError });
        }
        try {
            await saveSubmission(pool, req.body, key.toLowerCase());
            // Não retorna respostas ou identificadores de participações individuais.
            res.status(201).json({ status: 'ok', modo: 'demonstracao', mensagem: 'Questionário fictício salvo com sucesso.' });
        } catch (error) {
            if (error instanceof SubmissionError) {
                return res.status(error.status).json({ codigo: error.code, mensagem: error.message });
            }
            res.status(500).json({ codigo: 'FALHA_PERSISTENCIA', mensagem: 'Não foi possível confirmar o envio. Tente novamente mais tarde.' });
        }
    });

    // Não devolve nem registra o corpo recebido, SQL ou detalhes da conexão.
    // Express reconhece o middleware de erro pelos quatro argumentos.
    app.use((error, req, res, next) => {
        if (error.type === 'entity.too.large') {
            return res.status(413).json({ codigo: 'JSON_EXCESSIVO', mensagem: 'JSON excede o limite permitido.' });
        }
        if (error.type === 'entity.parse.failed') {
            return res.status(400).json({ codigo: 'JSON_INVALIDO', mensagem: 'Informe um objeto JSON válido.' });
        }
        const status = error.status >= 400 && error.status < 500 ? error.status : 500;
        res.status(status).json({ codigo: 'REQUISICAO_INVALIDA', mensagem: 'Não foi possível processar a requisição.' });
    });
    return app;
}

module.exports = { createApp };
