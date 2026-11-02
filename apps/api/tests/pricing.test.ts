import { describe, expect, it } from 'vitest';
import type { Coupon } from '@prisma/client';
import { computeTotals, couponError, shippingFor } from '../src/services/pricing.js';
import { DEFAULT_SHIPPING } from '../src/services/settings.js';
import { loadConfig } from '../src/config.js';

const coupon = (over: Partial<Coupon>): Coupon => ({
  id: 'c', code: 'TEST', description: '', type: 'PERCENT', value: 10, minSubtotal: 0, maxDiscount: null,
  isActive: true, expiresAt: null, usageLimit: null, usedCount: 0, createdAt: new Date(), ...over,
});

describe('pricing', () => {
  it('charges standard shipping below the free threshold', () => {
    const t = computeTotals([{ productId: 'a', unitPricePaise: 10_000_00, quantity: 1 }], null, 'standard', DEFAULT_SHIPPING);
    expect(t).toMatchObject({ subtotalPaise: 10_000_00, shippingPaise: 499_00, totalPaise: 10_499_00, freeShippingApplied: false });
  });

  it('makes standard shipping free at the threshold, but not express', () => {
    const lines = [{ productId: 'a', unitPricePaise: 25_000_00, quantity: 1 }];
    expect(computeTotals(lines, null, 'standard', DEFAULT_SHIPPING).shippingPaise).toBe(0);
    expect(computeTotals(lines, null, 'express', DEFAULT_SHIPPING).shippingPaise).toBe(1_299_00);
  });

  it('applies a capped percentage coupon', () => {
    const t = computeTotals([{ productId: 'a', unitPricePaise: 1_00_000_00, quantity: 1 }], coupon({ value: 10, maxDiscount: 5_000_00 }), 'standard', DEFAULT_SHIPPING);
    expect(t.discountPaise).toBe(5_000_00);
    expect(t.totalPaise).toBe(95_000_00);
  });

  it('evaluates free shipping on the discounted subtotal', () => {
    const t = computeTotals([{ productId: 'a', unitPricePaise: 26_000_00, quantity: 1 }], coupon({ type: 'FIXED', value: 2_000_00 }), 'standard', DEFAULT_SHIPPING);
    expect(t.shippingPaise).toBe(499_00);
    expect(t.totalPaise).toBe(24_000_00 + 499_00);
  });

  it('rejects expired, exhausted and under-minimum coupons', () => {
    expect(couponError(coupon({ expiresAt: new Date(Date.now() - 1000) }), 100)).toMatch(/expired/);
    expect(couponError(coupon({ usageLimit: 1, usedCount: 1 }), 100)).toMatch(/usage limit/);
    expect(couponError(coupon({ minSubtotal: 20_000_00 }), 100)).toMatch(/minimum/);
    expect(couponError(null, 100)).toMatch(/not valid/);
  });

  it('never discounts below zero and adds tax when configured', () => {
    const t = computeTotals([{ productId: 'a', unitPricePaise: 1_000_00, quantity: 1 }], coupon({ type: 'FIXED', value: 5_000_00 }), 'standard', { ...DEFAULT_SHIPPING, taxRatePercent: 12 });
    expect(t.discountPaise).toBe(1_000_00);
    expect(t.totalPaise).toBe(0);
    expect(shippingFor('standard', 0, DEFAULT_SHIPPING).shippingPaise).toBe(0);
  });
});

describe('config', () => {
  it('reports missing environment variables clearly', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL is required/);
    expect(() => loadConfig({ DATABASE_URL: 'postgresql://x', SESSION_SECRET: 'short' } as NodeJS.ProcessEnv)).toThrow(/at least 32/);
    expect(() =>
      loadConfig({ DATABASE_URL: 'postgresql://x', SESSION_SECRET: 'x'.repeat(40), PAYMENT_PROVIDER: 'razorpay' } as NodeJS.ProcessEnv),
    ).toThrow(/RAZORPAY_KEY_ID/);
  });

  it('listens on the host-assigned PORT unless API_PORT is set', () => {
    const base = { DATABASE_URL: 'postgresql://x', SESSION_SECRET: 'x'.repeat(40) };
    expect(loadConfig({ ...base } as NodeJS.ProcessEnv).API_PORT).toBe(4000);
    expect(loadConfig({ ...base, PORT: '10000' } as NodeJS.ProcessEnv).API_PORT).toBe(10000);
    expect(loadConfig({ ...base, PORT: '10000', API_PORT: '4100' } as NodeJS.ProcessEnv).API_PORT).toBe(4100);
    expect(loadConfig({ ...base } as NodeJS.ProcessEnv).TRUST_PROXY).toBe(1);
    expect(loadConfig({ ...base, TRUST_PROXY: '2' } as NodeJS.ProcessEnv).TRUST_PROXY).toBe(2);
  });
});
