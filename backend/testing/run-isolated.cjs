// PostgreSQL descartável em cluster independente, sem acessar db.js ou .env.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
let activeChild;

function run(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { windowsHide: true, stdio: 'inherit', ...options });
        activeChild = child;
        child.on('error', reject);
        child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Processo terminou com código ${code}.`)));
    });
}

async function freePort() {
    const server = net.createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    return port;
}

async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'inventario-pg-test-'));
    const data = path.join(root, 'data');
    const bin = process.env.PG_BIN || (process.platform === 'win32' ? 'C:\\Program Files\\PostgreSQL\\18\\bin' : '');
    const exe = name => bin ? path.join(bin, name + (process.platform === 'win32' ? '.exe' : '')) : name;
    let started = false;
    try {
        await run(exe('initdb'), ['-D', data, '-U', 'inventario_test', '--auth=trust', '--encoding=UTF8', '--no-locale']);
        const port = await freePort();
        await run(exe('pg_ctl'), ['-D', data, '-l', path.join(root, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
        started = true;
        await run(exe('createdb'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'inventario_test', 'inventario_test_isolated']);
        const env = { ...process.env, TEST_DATABASE_URL: `postgresql://inventario_test@127.0.0.1:${port}/inventario_test_isolated` };
        await run(process.execPath, process.argv.includes('--demo') ? ['scripts/demo-admin.js'] : ['--test', 'tests/*.integration.cjs'], { env });
    } finally {
        if (started) await run(exe('pg_ctl'), ['-D', data, '-m', 'fast', '-w', 'stop']);
        // Apaga exclusivamente o diretório temporário criado nesta execução.
        const resolved = await fs.realpath(root);
        const parent = await fs.realpath(os.tmpdir());
        if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('inventario-pg-test-')) {
            throw new Error('Caminho temporário inesperado; limpeza recusada.');
        }
        await fs.rm(resolved, { recursive: true, force: true });
    }
}

// O filho recebe Ctrl+C e encerra HTTP/schema; o pai fica vivo para parar o cluster.
process.on('SIGINT', () => {});
process.on('SIGTERM', () => activeChild?.kill('SIGTERM'));
main().catch(() => { console.error('Execução isolada falhou; confira PostgreSQL/PG_BIN e a saída acima.'); process.exitCode = 1; });
