const http = require('node:http');

/**
 * Envolve a aplicação Express garantindo cabeçalhos CORS abertos para acesso
 * local via Expo Web e Expo Go, respondendo preflight OPTIONS com status 204.
 * @param {import('express').Express} app
 */
function createCorsServer(app) {
    return http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        delete req.headers.origin;
        app(req, res);
    });
}

module.exports = { createCorsServer };
