const { createApp } = require('./app');
const { createCorsServer } = require('./cors-server');
const pool = require('./db');
const { loadAdminAccounts } = require('./admin-config');

// Escritas somente no script de demonstração, que cria um schema isolado.
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

loadAdminAccounts(process.env.DB_PASSWORD).then(adminStore => {
    const app = createApp({ pool, adminAccounts: adminStore.accounts, saveAdminAccounts: adminStore.saveAccounts,
        databasePassword: process.env.DB_PASSWORD });
    createCorsServer(app).listen(port, host, () => console.log(`Servidor rodando em http://${host}:${port}`));
}).catch(() => {
    console.error('Configuração administrativa inválida. Servidor não iniciado.');
    process.exitCode = 1;
});
