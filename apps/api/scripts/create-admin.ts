/* eslint-disable no-console */
/**
 * Development-only bootstrap for user accounts.
 *
 *   npm run admin:create                                  # admin, uses ADMIN_EMAIL/ADMIN_PASSWORD or prompts defaults
 *   npm run admin:create -- --email you@example.com --password 'S3cure-pass'
 *   npm run admin:create -- --role customer --email shopper@example.com
 *
 * If no password is supplied a strong random one is generated and printed ONCE.
 * Refuses to run when NODE_ENV=production unless --allow-production is passed.
 */
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  if (process.env.NODE_ENV === 'production' && !args.includes('--allow-production')) {
    throw new Error('admin:create is a development tool. Pass --allow-production to run it against production deliberately.');
  }
  const role = (arg('role') ?? 'admin').toUpperCase() === 'CUSTOMER' ? 'CUSTOMER' : 'ADMIN';
  const email = (arg('email') ?? process.env.ADMIN_EMAIL ?? (role === 'ADMIN' ? 'admin@antiquora.local' : 'customer@antiquora.local')).toLowerCase().trim();
  const supplied = arg('password') ?? (role === 'ADMIN' ? process.env.ADMIN_PASSWORD : undefined);
  const password = supplied || `${crypto.randomBytes(9).toString('base64url')}-7a`;
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Password must be at least 8 characters and include a letter and a number.');
  }
  const name = arg('name') ?? (role === 'ADMIN' ? 'Store Administrator' : 'Demo Customer');

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: { role, passwordHash, isDisabled: false },
      create: { email, name, role, passwordHash },
    });
    console.log(`\n✔ ${role === 'ADMIN' ? 'Administrator' : 'Customer'} account ready`);
    console.log(`  Email:    ${user.email}`);
    if (!supplied) console.log(`  Password: ${password}   ← generated; shown only once, store it safely`);
    else console.log('  Password: (the one you supplied)');
    if (role === 'ADMIN') console.log('  Sign in at /login, then open /admin\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(1);
});
