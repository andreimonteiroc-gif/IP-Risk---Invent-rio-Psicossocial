const { once } = require('node:events');
const { createInterface } = require('node:readline');
const { createApp } = require('../app');
const { createCorsServer } = require('../cors-server');
const { createIsolatedDatabase } = require('../testing/isolated-database');

async function startDemo({ port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0' } = {}) {
    if (process.env.NODE_ENV === 'production') throw new Error('Demonstração indisponível em produção.');
    const database = await createIsolatedDatabase('demo');
    const webOrigins = process.env.DEMO_WEB_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean);
    const app = createApp({ pool: database.pool, demoSubmissionsEnabled: true, webOrigins });
    const server = createCorsServer(app).listen(port, host);
    try {
        await once(server, 'listening');
    } catch (error) {
        await database.close();
        throw error;
    }
    const close = async () => {
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await database.close();
    };
    return { server, close, schema: database.schema };
}

if (require.main === module) {
    startDemo().then(({ server, close, schema }) => {
        console.log(`Demonstração fictícia em http://${server.address().address}:${server.address().port}`);
        console.log(`Schema fictício para inspeção no pgAdmin: ${schema}`);
        console.log('Schema temporário separado das tabelas atuais. Setor 1 e período 1 são fictícios.');
        console.log('Use examples/submissao-ficticia.json. Digite sair e Enter, ou Ctrl+C, para remover o schema temporário.');
        const input = createInterface({ input: process.stdin, terminal: false });
        let closing = false;
        const stop = async () => {
            if (closing) return;
            closing = true;
            input.close();
            try {
                await close();
                console.log('Demonstração encerrada e schema temporário removido.');
            } catch {
                console.error('Falha ao encerrar a demonstração. Verifique os schemas temporários do banco de desenvolvimento.');
                process.exitCode = 1;
            }
        };
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
        input.on('line', line => { if (line.trim().toLowerCase() === 'sair') void stop(); });
    }).catch(() => {
        console.error('Não foi possível iniciar a demonstração. Configure TEST_DATABASE_URL de um banco descartável local inventario_test_* e confira a porta.');
        process.exitCode = 1;
    });
}

module.exports = { startDemo };
