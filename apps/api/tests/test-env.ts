import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Loads the repository-root .env into process.env (without overriding existing values). */
export function loadRootEnv() {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}

export function testDatabaseUrl(base: string) {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const u = new URL(base);
  u.pathname = `${u.pathname.replace(/_test$/, '')}_test`;
  return u.toString();
}
