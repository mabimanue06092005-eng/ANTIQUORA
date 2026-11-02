import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z
      .string({ error: 'DATABASE_URL is required (see .env.example)' })
      .min(1, 'DATABASE_URL is required (see .env.example)')
      .refine((v) => v.startsWith('postgres'), 'DATABASE_URL must be a PostgreSQL connection string'),
    SESSION_SECRET: z
      .string({ error: 'SESSION_SECRET is required (see .env.example)' })
      .min(32, 'SESSION_SECRET must be at least 32 characters'),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    PUBLIC_SITE_URL: z.string().url().default('http://localhost:5173'),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
    PAYMENT_PROVIDER: z.enum(['demo', 'razorpay']).default('demo'),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default('ANTIQUORA <no-reply@example.com>'),
  })
  .superRefine((env, ctx) => {
    if (env.PAYMENT_PROVIDER === 'razorpay' && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['RAZORPAY_KEY_ID'],
        message: 'PAYMENT_PROVIDER=razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
      });
    }
    if (env.NODE_ENV === 'production' && env.SESSION_SECRET.startsWith('change-me')) {
      ctx.addIssue({ code: 'custom', path: ['SESSION_SECRET'], message: 'Set a real SESSION_SECRET in production' });
    }
  });

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  • ${i.path.join('.') || 'env'}: ${i.message}`);
    const err = new Error(`Invalid environment configuration:\n${lines.join('\n')}\n\nCopy .env.example to .env and fill in the values.`);
    err.name = 'ConfigError';
    throw err;
  }
  return parsed.data;
}

let cached: Config | undefined;
export const config = (): Config => (cached ??= loadConfig());
export const setConfigForTests = (c: Config) => {
  cached = c;
};
