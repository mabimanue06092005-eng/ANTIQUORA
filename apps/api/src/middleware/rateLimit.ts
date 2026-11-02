import rateLimit from 'express-rate-limit';

const make = (windowMinutes: number, limit: number, message: string) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === '1' ? 10_000 : limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message } }),
  });

export const authLimiter = make(15, 20, 'Too many sign-in attempts. Please wait a few minutes and try again.');
export const formLimiter = make(10, 10, 'Too many submissions. Please wait a few minutes and try again.');
export const apiLimiter = make(1, 600, 'Too many requests. Please slow down.');
