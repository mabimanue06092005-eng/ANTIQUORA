import { loadRootEnv, testDatabaseUrl } from './test-env.js';

loadRootEnv();
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl(process.env.DATABASE_URL ?? '');
process.env.PAYMENT_PROVIDER = 'demo';
process.env.SESSION_SECRET ??= 'test-secret-test-secret-test-secret-123';
