import crypto from 'node:crypto';
import { config } from '../config.js';
import { ApiError } from '../lib/http.js';

/**
 * Minimal Razorpay integration over its REST API (no SDK dependency).
 * Only active when PAYMENT_PROVIDER=razorpay and both keys are configured.
 * Docs: https://razorpay.com/docs/payments/server-integration/
 */
export function razorpayConfigured() {
  const c = config();
  return c.PAYMENT_PROVIDER === 'razorpay' && !!c.RAZORPAY_KEY_ID && !!c.RAZORPAY_KEY_SECRET;
}

export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const c = config();
  if (!razorpayConfigured()) throw new ApiError(503, 'PAYMENT_UNAVAILABLE', 'The payment provider is not configured.');
  const auth = Buffer.from(`${c.RAZORPAY_KEY_ID}:${c.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt }),
  });
  if (!res.ok) throw new ApiError(502, 'PAYMENT_PROVIDER_ERROR', 'Could not start the payment. Please try again.');
  const body = (await res.json()) as { id: string };
  return { providerOrderId: body.id, keyId: c.RAZORPAY_KEY_ID! };
}

/** Verifies the checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyRazorpaySignature(providerOrderId: string, providerPaymentId: string, signature: string) {
  const expected = crypto
    .createHmac('sha256', config().RAZORPAY_KEY_SECRET ?? '')
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
