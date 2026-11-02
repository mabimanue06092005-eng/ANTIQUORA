import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { ah, ApiError, ok, parse } from '../lib/http.js';
import { addressInput, email, indianPhone, personName } from '../lib/validators.js';
import { requireAuth } from '../middleware/session.js';
import { createOrderFromCart, markPaymentFailed, markPaymentSucceeded } from '../services/orders.js';
import { createRazorpayOrder, razorpayConfigured, verifyRazorpaySignature } from '../services/razorpay.js';
import { logger } from '../lib/logger.js';

export const checkoutRouter = Router();
checkoutRouter.use(requireAuth);

const checkoutSchema = z.object({
  customer: z.object({ name: personName, email, phone: indianPhone }),
  address: addressInput.omit({ label: true, isDefault: true }),
  saveAddress: z.boolean().optional(),
  deliveryMethod: z.enum(['standard', 'express'], { error: 'Choose a delivery method' }),
  notes: z.string().trim().max(500).optional().nullable(),
  expectedTotalPaise: z.number().int().nonnegative().optional(),
});

/** Creates the order (stock reserved, status PENDING_PAYMENT) and a payment intent. */
checkoutRouter.post(
  '/',
  ah(async (req, res) => {
    const body = parse(checkoutSchema, req.body);
    const provider = config().PAYMENT_PROVIDER === 'razorpay' && razorpayConfigured() ? 'RAZORPAY' : 'DEMO';
    const isDemo = provider === 'DEMO';

    const order = await createOrderFromCart(
      {
        userId: req.user!.id,
        email: body.customer.email,
        customerName: body.customer.name,
        phone: body.customer.phone,
        deliveryMethod: body.deliveryMethod,
        address: body.address,
        notes: body.notes,
        expectedTotalPaise: body.expectedTotalPaise,
      },
      isDemo,
    );

    if (body.saveAddress) {
      const dup = await prisma.address.findFirst({ where: { userId: req.user!.id, line1: body.address.line1, postalCode: body.address.postalCode } });
      if (!dup) {
        const count = await prisma.address.count({ where: { userId: req.user!.id } });
        if (count < 10) await prisma.address.create({ data: { ...body.address, userId: req.user!.id, isDefault: count === 0 } });
      }
    }

    let providerData: Record<string, unknown> = {};
    let providerOrderId: string | null = null;
    if (provider === 'RAZORPAY') {
      const rp = await createRazorpayOrder(order.totalPaise, order.orderNumber);
      providerOrderId = rp.providerOrderId;
      providerData = { keyId: rp.keyId, providerOrderId };
    }
    const payment = await prisma.payment.create({
      data: { orderId: order.id, provider, amountPaise: order.totalPaise, isDemo, providerOrderId },
    });

    ok(
      res,
      {
        order: { id: order.id, orderNumber: order.orderNumber, totalPaise: order.totalPaise, status: order.status },
        payment: { id: payment.id, provider, isDemo, ...providerData },
      },
      201,
    );
  }),
);

async function ownPayment(paymentId: string, userId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.order.userId !== userId) throw ApiError.notFound('Payment not found.');
  return payment;
}

/**
 * DEMO gateway. Simulates the provider's result. No card data is ever accepted or stored —
 * the request body carries only the scenario chosen on the demo payment screen.
 */
checkoutRouter.post(
  '/payments/:paymentId/demo',
  ah(async (req, res) => {
    const { outcome } = parse(z.object({ outcome: z.enum(['success', 'failure']) }), req.body);
    const payment = await ownPayment(req.params.paymentId, req.user!.id);
    if (payment.provider !== 'DEMO') throw ApiError.badRequest('This payment is not a demo payment.');
    const order =
      outcome === 'success'
        ? await markPaymentSucceeded(payment.id, `demo_pay_${Date.now().toString(36)}`)
        : await markPaymentFailed(payment.id, 'DEMO payment declined (simulated failure scenario)');
    ok(res, { orderNumber: order.orderNumber, status: order.status });
  }),
);

/** Real gateway verification (Razorpay). Never marks paid without a valid signature. */
checkoutRouter.post(
  '/payments/:paymentId/razorpay/verify',
  ah(async (req, res) => {
    const body = parse(
      z.object({ razorpay_order_id: z.string().max(64), razorpay_payment_id: z.string().max(64), razorpay_signature: z.string().max(256) }),
      req.body,
    );
    const payment = await ownPayment(req.params.paymentId, req.user!.id);
    if (payment.provider !== 'RAZORPAY' || payment.providerOrderId !== body.razorpay_order_id) throw ApiError.badRequest('Payment mismatch.');
    if (!verifyRazorpaySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      logger.warn({ paymentId: payment.id }, 'Razorpay signature verification failed');
      const order = await markPaymentFailed(payment.id, 'Payment signature verification failed');
      return ok(res, { orderNumber: order.orderNumber, status: order.status }, 400);
    }
    const order = await markPaymentSucceeded(payment.id, body.razorpay_payment_id);
    ok(res, { orderNumber: order.orderNumber, status: order.status });
  }),
);

checkoutRouter.post(
  '/payments/:paymentId/cancel',
  ah(async (req, res) => {
    const payment = await ownPayment(req.params.paymentId, req.user!.id);
    const order = await markPaymentFailed(payment.id, 'Payment cancelled by customer');
    ok(res, { orderNumber: order.orderNumber, status: order.status });
  }),
);
