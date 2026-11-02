// One command for local development: `npm run dev`.
//  1. Makes sure PostgreSQL is reachable. If DATABASE_URL points at the embedded server
//     (localhost:5433) and nothing is listening, it starts scripts/local-db.mjs.
//  2. Applies pending Prisma migrations.
//  3. Starts the API (:4000) and the web dev server (:5173) — or reuses ones already running.
// Ctrl+C stops everything this script started, including the database (no orphans on Windows).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const C = { db: '\x1b[35m', api: '\x1b[33m', web: '\x1b[36m', dev: '\x1b[32m', reset: '\x1b[0m' };
const say = (msg) => console.log(`${C.dev}[dev]${C.reset} ${msg}`);

function readEnv() {
  const file = path.join(root, '.env');
  if (!existsSync(file)) {
    console.error('\n✖ No .env file found. Create one first:  cp .env.example .env  (then set SESSION_SECRET)\n');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return env;
}

// 'localhost' may resolve to IPv6 only (Vite binds [::1] on some Windows setups), so probe both.
const portOpen = async (port, host) => (host ? probe(port, host) : (await probe(port, '127.0.0.1')) || (await probe(port, '::1')));
const probe = (port, host) =>
  new Promise((resolve) => {
    const s = net.connect({ host, port }, () => (s.end(), resolve(true)));
    s.on('error', () => resolve(false));
    s.setTimeout(1500, () => (s.destroy(), resolve(false)));
  });

async function waitFor(check, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const httpOk = async (url) => {
  for (const host of ['127.0.0.1', '[::1]']) {
    try {
      const res = await fetch(url.replace('localhost', host), { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      /* try the other address family */
    }
  }
  return false;
};

const children = [];
function run(name, command, args, opts = {}) {
  // With a shell, pass one command string (avoids Node's DEP0190 warning about unescaped args).
  const p = spawn(opts.shell ? [command, ...args].join(' ') : command, opts.shell ? [] : args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe', ...(opts.ipc ? ['ipc'] : [])], shell: opts.shell ?? false, env: { ...process.env, ...opts.env } });
  const tag = `${C[name]}[${name}]${C.reset} `;
  const pipe = (stream, out) => stream.on('data', (d) => out.write(d.toString().replace(/^(?=.)/gm, tag)));
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    if (stopping) return;
    console.log(`${tag}exited with code ${code}`);
    shutdown(code || 1);
  });
  children.push({ name, p, ipc: !!opts.ipc });
  return p;
}

/** Kill a process and everything it spawned (npm → cmd → node on Windows). */
function killTree(p) {
  if (p.exitCode !== null || !p.pid) return;
  if (isWin) spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try {
      process.kill(-p.pid, 'SIGTERM');
    } catch {
      p.kill('SIGTERM');
    }
  }
}

let stopping = false;
async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  say('Stopping…');
  // Servers first, database last (and gracefully, so its data files stay consistent).
  for (const c of children.filter((c) => c.name !== 'db')) killTree(c.p);
  const db = children.find((c) => c.name === 'db');
  if (db && db.p.exitCode === null) {
    db.p.send?.('stop');
    await Promise.race([new Promise((r) => db.p.once('exit', r)), new Promise((r) => setTimeout(r, 8000))]);
    killTree(db.p);
  }
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  const env = readEnv();
  let dbUrl;
  try {
    dbUrl = new URL(env.DATABASE_URL);
  } catch {
    console.error('\n✖ DATABASE_URL in .env is missing or invalid (see .env.example).\n');
    process.exit(1);
  }
  const dbHost = dbUrl.hostname === 'localhost' ? '127.0.0.1' : dbUrl.hostname;
  const dbPort = Number(dbUrl.port || 5432);

  // 1. Database
  if (await portOpen(dbPort, ['127.0.0.1', '::1'].includes(dbHost) ? undefined : dbHost)) {
    say(`PostgreSQL already running on ${dbUrl.hostname}:${dbPort}`);
  } else if (['127.0.0.1', '::1'].includes(dbHost) && dbPort === 5433) {
    say('Starting the embedded PostgreSQL (data in .local-pg)…');
    const db = run('db', process.execPath, [path.join('scripts', 'local-db.mjs')], { ipc: true });
    // Wait for the explicit ready message: the port opens before connections are accepted.
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timed out waiting for PostgreSQL')), 90_000);
      db.on('message', (m) => m === 'ready' && (clearTimeout(t), resolve()));
    });
  } else {
    console.error(
      `\n✖ PostgreSQL is not reachable at ${dbUrl.hostname}:${dbPort}.\n` +
        '  Start it (for Docker: docker compose up -d db), or point DATABASE_URL at localhost:5433 to use the embedded server.\n',
    );
    process.exit(1);
  }

  // 2. Migrations (idempotent and fast when up to date)
  const mig = spawnSync('npm run db:migrate', { cwd: root, shell: true, encoding: 'utf8' });
  if (mig.status !== 0) {
    console.error(mig.stdout + mig.stderr);
    console.error('\n✖ Database migrations failed — see the output above.\n');
    return shutdown(1);
  }
  say('Database schema is up to date.');

  // 3. API
  const apiPort = Number(env.API_PORT || 4000);
  if (await httpOk(`http://localhost:${apiPort}/api/health`)) say(`API already running on :${apiPort}`);
  else if (await portOpen(apiPort)) {
    console.error(`\n✖ Port ${apiPort} is in use by another program that is not the ANTIQUORA API. Free it or change API_PORT.\n`);
    return shutdown(1);
  } else {
    run('api', 'npm', ['run', 'dev:api'], { shell: true });
    await waitFor(() => httpOk(`http://localhost:${apiPort}/api/health`), 90_000, 'the API');
  }

  // 4. Web
  if (await httpOk('http://localhost:5173/')) say('Web dev server already running on :5173');
  else if (await portOpen(5173)) {
    console.error('\n✖ Port 5173 is in use by another program. Free it and run npm run dev again.\n');
    return shutdown(1);
  } else {
    run('web', 'npm', ['run', 'dev:web'], { shell: true });
    await waitFor(() => httpOk('http://localhost:5173/'), 90_000, 'the web dev server');
  }

  const products = await fetch(`http://localhost:${apiPort}/api/products?pageSize=1`).then((r) => r.json()).catch(() => null);
  if (products?.meta?.total === 0) say('The catalogue is empty — load the demo data with:  npm run db:seed');
  say(`ANTIQUORA is ready → http://localhost:5173   (Ctrl+C to stop${children.length ? '' : '; nothing was started by this command'})`);
  if (!children.length) process.exit(0);
}

main().catch((e) => {
  console.error(`\n✖ ${e.message}\n`);
  shutdown(1);
});
