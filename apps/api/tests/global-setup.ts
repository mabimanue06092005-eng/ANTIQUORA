/**
 * Creates (if needed), migrates and seeds an isolated `<db>_test` database so tests
 * never touch development data. Requires DATABASE_URL (from the root .env).
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { testDatabaseUrl, loadRootEnv } from './test-env.js';

export default async function setup() {
  loadRootEnv();
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set. Copy .env.example to .env and start the database (npm run db:local).');
  const testUrl = testDatabaseUrl(base);
  const dbName = new URL(testUrl).pathname.slice(1);

  const admin = new PrismaClient({ datasources: { db: { url: base } } });
  try {
    const exists = await admin.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_database WHERE datname = ${dbName}`;
    if (!exists.length) await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
  } finally {
    await admin.$disconnect();
  }

  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const env = { ...process.env, DATABASE_URL: testUrl, NODE_ENV: 'test' };
  execSync('npx prisma migrate deploy', { cwd, env, stdio: 'ignore' });
  execSync('npx tsx prisma/seed.ts', { cwd, env, stdio: 'ignore' });
}
