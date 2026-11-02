import { z } from 'zod';
import { prisma } from '../db.js';

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(60),
  supportEmail: z.string().trim().email(),
  supportPhone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(5).max(300),
  announcement: z.string().trim().max(140),
});

export const shippingSettingsSchema = z.object({
  standardPaise: z.number().int().min(0).max(10_000_00),
  expressPaise: z.number().int().min(0).max(10_000_00),
  freeShippingThresholdPaise: z.number().int().min(0).max(1_00_00_000_00),
  standardDays: z.string().trim().min(1).max(30),
  expressDays: z.string().trim().min(1).max(30),
  taxRatePercent: z.number().min(0).max(28),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;

export const DEFAULT_STORE: StoreSettings = {
  storeName: 'ANTIQUORA',
  supportEmail: 'hello@antiquora.example',
  supportPhone: '+91 00000 00000',
  address: 'Demo address — 12 Heritage Lane, Fort, Mumbai 400001, India (placeholder)',
  announcement: 'Discover rare finds. Every object tells a story.',
};

export const DEFAULT_SHIPPING: ShippingSettings = {
  standardPaise: 499_00,
  expressPaise: 1_299_00,
  freeShippingThresholdPaise: 25_000_00,
  standardDays: '5–8 business days',
  expressDays: '2–4 business days',
  taxRatePercent: 0,
};

async function read<T>(key: string, fallback: T, schema: z.ZodType<T>): Promise<T> {
  const row = await prisma.storeSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  const parsed = schema.safeParse({ ...fallback, ...(row.value as object) });
  return parsed.success ? parsed.data : fallback;
}

export const getStoreSettings = () => read('store', DEFAULT_STORE, storeSettingsSchema);
export const getShippingSettings = () => read('shipping', DEFAULT_SHIPPING, shippingSettingsSchema);

export async function saveSettings(key: 'store' | 'shipping', value: object) {
  await prisma.storeSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
