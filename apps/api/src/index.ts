import { loadConfig } from './config.js';

// Validate configuration first so missing env vars produce a clear message, not a stack trace.
let cfg;
try {
  cfg = loadConfig();
} catch (e) {
  console.error(`\n✖ ${(e as Error).message}\n`);
  process.exit(1);
}

const { createApp } = await import('./app.js');
const { prisma } = await import('./db.js');
const { logger } = await import('./lib/logger.js');
const { expireStalePendingOrders } = await import('./services/orders.js');

try {
  await prisma.$connect();
} catch (e) {
  logger.error(
    `Cannot connect to PostgreSQL at ${cfg.DATABASE_URL.replace(/:[^:@/]+@/, ':****@')}.\n` +
      '  • Start the local database with `npm run db:local` (or `docker compose up -d db`).\n' +
      '  • Then run `npm run db:migrate && npm run db:seed`.',
  );
  logger.debug(e);
  process.exit(1);
}

const app = createApp();
const server = app.listen(cfg.API_PORT, () => {
  logger.info(`ANTIQUORA API listening on http://localhost:${cfg.API_PORT} (payments: ${cfg.PAYMENT_PROVIDER})`);
});

const sweep = setInterval(() => {
  expireStalePendingOrders()
    .then((n) => n && logger.info(`Expired ${n} unpaid order(s)`))
    .catch((err) => logger.warn({ err }, 'Pending-order sweep failed'));
}, 5 * 60 * 1000);

const shutdown = () => {
  clearInterval(sweep);
  server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
