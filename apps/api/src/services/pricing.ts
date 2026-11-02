import type { Coupon } from '@prisma/client';
import type { ShippingSettings } from './settings.js';

export type DeliveryMethod = 'standard' | 'express';

export interface PricedLine {
  productId: string;
  unitPricePaise: number;
  quantity: number;
}

export interface Totals {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  freeShippingApplied: boolean;
  couponCode: string | null;
  couponError: string | null;
}

/** Validates a coupon against a subtotal. Returns a user-facing error or null. */
export function couponError(coupon: Coupon | null, subtotalPaise: number, now = new Date()): string | null {
  if (!coupon || !coupon.isActive) return 'This discount code is not valid.';
  if (coupon.expiresAt && coupon.expiresAt < now) return 'This discount code has expired.';
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return 'This discount code has reached its usage limit.';
  if (subtotalPaise < coupon.minSubtotal)
    return `This code requires a minimum order of ₹${(coupon.minSubtotal / 100).toLocaleString('en-IN')}.`;
  return null;
}

export function couponDiscount(coupon: Coupon, subtotalPaise: number) {
  let d = coupon.type === 'PERCENT' ? Math.floor((subtotalPaise * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) d = Math.min(d, coupon.maxDiscount);
  return Math.min(d, subtotalPaise);
}

/**
 * Demo shipping rule: standard shipping is a flat fee, free when the discounted
 * subtotal reaches the threshold; express is always a flat (higher) fee.
 */
export function shippingFor(method: DeliveryMethod, discountedSubtotal: number, s: ShippingSettings) {
  if (discountedSubtotal === 0) return { shippingPaise: 0, free: false };
  if (method === 'express') return { shippingPaise: s.expressPaise, free: false };
  const free = discountedSubtotal >= s.freeShippingThresholdPaise;
  return { shippingPaise: free ? 0 : s.standardPaise, free };
}

export function computeTotals(
  lines: PricedLine[],
  coupon: Coupon | null,
  method: DeliveryMethod,
  shipping: ShippingSettings,
): Totals {
  const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);
  let discountPaise = 0;
  let couponCode: string | null = null;
  let err: string | null = null;
  if (coupon) {
    err = couponError(coupon, subtotalPaise);
    if (!err) {
      discountPaise = couponDiscount(coupon, subtotalPaise);
      couponCode = coupon.code;
    }
  }
  const discounted = subtotalPaise - discountPaise;
  const { shippingPaise, free } = shippingFor(method, discounted, shipping);
  const taxPaise = Math.round((discounted * shipping.taxRatePercent) / 100);
  return {
    subtotalPaise,
    discountPaise,
    shippingPaise,
    taxPaise,
    totalPaise: discounted + shippingPaise + taxPaise,
    freeShippingApplied: free,
    couponCode,
    couponError: err,
  };
}
