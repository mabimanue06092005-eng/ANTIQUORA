import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { prisma } from './db.js';
import { logger } from './lib/logger.js';
import { ok } from './lib/http.js';
import { csrfProtection, loadSession } from './middleware/session.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';
import { catalogRouter } from './routes/catalog.js';
import { cartRouter } from './routes/cart.js';
import { wishlistRouter } from './routes/wishlist.js';
import { checkoutRouter } from './routes/checkout.js';
import { ordersRouter } from './routes/orders.js';
import { formsRouter } from './routes/forms.js';
import { adminRouter, UPLOAD_DIR } from './routes/admin.js';
import { seoRouter } from './routes/seo.js';

export function createApp() {
  const cfg = config();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', cfg.TRUST_PROXY);
  // HTTPS-only headers would break a plain-HTTP demo deployment, so tie them to the public URL.
  const https = cfg.PUBLIC_SITE_URL.startsWith('https://');

  app.use(
    helmet({
      hsts: https,
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests: https ? [] : null,
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
          scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
          frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
          connectSrc: ["'self'", 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  const origins = cfg.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
      credentials: true,
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => !req.url?.startsWith('/api') }, customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info') }));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      ok(res, { status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is not reachable. Check DATABASE_URL and that PostgreSQL is running.' } });
    }
  });

  app.use('/api', apiLimiter, loadSession, csrfProtection);
  app.get('/api/csrf', (req, res) => ok(res, { token: req.cookies.aq_csrf }));
  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api', catalogRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api', formsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', notFoundHandler);

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }));
  app.use(seoRouter);

  // In production, serve the built storefront from the same origin (single-service deploy).
  const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
  if (fs.existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
