/* global __dirname */
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000
});

module.exports = pool;
