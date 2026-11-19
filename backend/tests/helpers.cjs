/* global __dirname */
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const { Buffer } = require('node:buffer');
const { randomUUID } = require('node:crypto');
const { createApp } = require('../app');
const { catalog } = require('../sector-catalog');

async function loadQuestions() {
    // Módulo de dados puro, carregado como ESM sem depender do runtime Expo.
    const source = await readFile(path.join(__dirname, '../../src/data/questions.js'), 'utf8');
    return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).questions;
}

async function validBody() {
    const questions = await loadQuestions();
    return {
        mega_setor_id: 1,
        periodo_id: 1,
        respostas: questions.map((question, index) => ({ questao_numero: index + 1, alternativa: question.alternatives[0] })),
    };
}

async function startApp(t, options) {
    const server = createApp({ environment: 'test', demoSubmissionsEnabled: true, ...options }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    const url = `http://127.0.0.1:${server.address().port}`;
    return {
        url,
        get: route => fetch(url + route, { signal: AbortSignal.timeout(5000) }),
        post: (body, contentType = 'application/json', key = randomUUID()) => fetch(url + '/participacoes', {
            method: 'POST',
            headers: { 'Content-Type': contentType, ...(key === null ? {} : { 'Idempotency-Key': key }) },
            body: typeof body === 'string' ? body : JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
        }),
    };
}

function fakePool({ sectorExists = true, periodExists = true, active = true, failAt, failRollback = false, onCommit } = {}) {
    const calls = [];
    const client = {
        async query(sql, values) {
            sql = sql.trim().replace(/\s+/g, ' ');
            calls.push({ sql, values });
            if (failAt && sql.startsWith(failAt)) throw new Error('detalhe sigiloso do banco');
            if (failRollback && sql === 'ROLLBACK') throw new Error('rollback indisponível');
            if (sql.startsWith('SELECT conteudo_hash')) return { rowCount: 0, rows: [] };
            if (sql.includes('FROM macroareas')) return { rowCount: sectorExists ? 1 : 0, rows: sectorExists ? [{ id: 1 }] : [] };
            if (sql.includes('FROM periodos_coleta')) return { rowCount: periodExists ? 1 : 0, rows: periodExists ? [{ id: 1, vigente: active }] : [] };
            if (sql.startsWith('INSERT INTO participacoes')) return { rowCount: 1, rows: [{ id: '9007199254740993' }] };
            if (sql.startsWith('INSERT INTO respostas')) return { rowCount: 31, rows: [] };
            if (sql === 'COMMIT') await onCommit?.();
            return { rowCount: 0, rows: [] };
        },
        release(discard) { calls.push({ release: true, discard }); },
    };
    return {
        calls,
        async connect() {
            calls.push({ connect: true });
            if (failAt === 'connect') throw new Error('detalhe sigiloso do banco');
            return client;
        },
        async query(sql) {
            calls.push({ sql });
            if (failAt === 'query') throw new Error('detalhe sigiloso do banco');
            if (sql === 'SELECT NOW()') return { rows: [{ now: '2026-10-18T12:00:00.000Z' }] };
            if (sql.includes('FROM macroareas')) return { rows: catalog.macroareas.map((item, index) => ({ id: index + 1, nome: item.nome })) };
            return { rows: [] };
        },
    };
}

module.exports = { loadQuestions, validBody, startApp, fakePool };
