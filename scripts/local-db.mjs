// Starts a real PostgreSQL server locally without Docker, using the
// `embedded-postgres` npm package (official PostgreSQL binaries).
// Data lives in ./.local-pg and survives restarts. Stop with Ctrl+C.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, '.local-pg');
const port = Number(process.env.LOCAL_PG_PORT ?? 5433);
const isNew = !existsSync(path.join(dataDir, 'PG_VERSION'));

// If a server is already listening (e.g. left running by an earlier session), reuse it
// instead of failing on the cluster lock.
const inUse = await new Promise((resolve) => {
  const s = net.connect({ host: '127.0.0.1', port }, () => (s.end(), resolve(true)));
  s.on('error', () => resolve(false));
});
if (inUse) {
  console.log(`[local-db] PostgreSQL is already running on port ${port} — nothing to do.`);
  process.exit(0);
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'antiquora',
  password: 'antiquora',
  port,
  persistent: true,
  // UTF-8 regardless of the OS code page (Windows would otherwise default to WIN1252).
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
});

if (isNew) {
  console.log('[local-db] Initialising new PostgreSQL cluster in .local-pg …');
  await pg.initialise();
}
await pg.start();
if (isNew) await pg.createDatabase('antiquora');
console.log(`[local-db] PostgreSQL ready on postgresql://antiquora:antiquora@localhost:${port}/antiquora`);
console.log('[local-db] Press Ctrl+C to stop.');
// Tell scripts/dev.mjs we accept connections (the port opens slightly before that).
process.send?.('ready');

let stopping = false;
const shutdown = async () => {
  if (stopping) return;
  stopping = true;
  console.log('\n[local-db] Stopping PostgreSQL …');
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// When launched by scripts/dev.mjs, a "stop" message gives a clean shutdown on every OS
// (Windows cannot deliver SIGTERM to a child, so postgres would otherwise be orphaned).
process.on('message', (m) => m === 'stop' && shutdown());
setInterval(() => {}, 1 << 30);
