import crypto from 'node:crypto';
import { Prisma, type OrderStatus } from '@prisma/client';
import { prisma, type Tx } from '../db.js';
import { ApiError } from '../lib/http.js';
import { logger } from '../lib/logger.js';
import { computeTotals, type DeliveryMethod } from './pricing.js';
import { getShippingSettings } from './settings.js';

/** Allowed admin transitions. Cancellation is handled separately (it releases stock). */
export const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  CONFIRMED: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
};
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED'];
export const ADMIN_CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'];
export const REVENUE_STATUSES: OrderStatus[] = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
export const PENDING_PAYMENT_TTL_MINUTES = 30;

export function newOrderNumber(date = new Date()) {
  const ymd = date.toISOString().slice(2, 10).replace(/-/g, '');
  return `AQ-${ymd}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export interface CheckoutInput {
  userId: string;
  email: string;
  customerName: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  address: { fullName: string; phone: string; line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: string };
  notes?: string | null;
  expectedTotalPaise?: number;
}

/**
 * Creates an order from the user's cart. Runs in a single transaction that locks the
 * affected product rows, re-validates stock and prices server-side, reserves stock and
 * snapshots item names/prices. The order starts as PENDING_PAYMENT.
 */
export async function createOrderFromCart(input: CheckoutInput, isDemo: boolean) {
  const shipping = await getShippingSettings();
  return prisma.$transaction(
    async (tx) => {
      const cart = await tx.cart.findUnique({ where: { userId: input.userId }, include: { items: true } });
      if (!cart || cart.items.length === 0) throw ApiError.badRequest('Your bag is empty.');

      const ids = cart.items.map((i) => i.productId);
      // Row-level locks prevent two checkouts from overselling the same artifact.
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id IN (${Prisma.join(ids)}) FOR UPDATE`;
      const products = await tx.product.findMany({ where: { id: { in: ids } }, include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } } });
      const byId = new Map(products.map((p) => [p.id, p]));

      const problems: string[] = [];
      for (const item of cart.items) {
        const p = byId.get(item.productId);
        if (!p || p.status !== 'PUBLISHED') problems.push('An item in your bag is no longer available.');
        else if (p.stock < item.quantity) problems.push(p.stock === 0 ? `"${p.name}" has just sold out.` : `Only ${p.stock} of "${p.name}" left.`);
      }
      if (problems.length) throw ApiError.conflict(problems.join(' '), { problems });

      const coupon = cart.couponCode ? await tx.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
      const totals = computeTotals(
        cart.items.map((i) => ({ productId: i.productId, unitPricePaise: byId.get(i.productId)!.pricePaise, quantity: i.quantity })),
        coupon,
        input.deliveryMethod,
        shipping,
      );
      if (cart.couponCode && totals.couponError) throw ApiError.conflict(totals.couponError);
      // The browser total is only used to detect stale prices; the server total is always charged.
      if (input.expectedTotalPaise != null && input.expectedTotalPaise !== totals.totalPaise) {
        throw ApiError.conflict('Prices or availability changed since you reviewed your order. Please review the updated total.', {
          totalPaise: totals.totalPaise,
        });
      }

      for (const item of cart.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity }, popularity: { increment: 5 } } });
      }

      const order = await tx.order.create({
        data: {
          orderNumber: newOrderNumber(),
          userId: input.userId,
          email: input.email,
          customerName: input.customerName,
          phone: input.phone,
          deliveryMethod: input.deliveryMethod,
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          shippingPaise: totals.shippingPaise,
          taxPaise: totals.taxPaise,
          totalPaise: totals.totalPaise,
          couponCode: totals.couponCode,
          shipName: input.address.fullName,
          shipPhone: input.address.phone,
          shipLine1: input.address.line1,
          shipLine2: input.address.line2 ?? null,
          shipCity: input.address.city,
          shipState: input.address.state,
          shipPostalCode: input.address.postalCode,
          shipCountry: input.address.country,
          notes: input.notes ?? null,
          isDemo,
          items: {
            create: cart.items.map((i) => {
              const p = byId.get(i.productId)!;
              return {
                productId: p.id,
                productName: p.name,
                productSku: p.sku,
                productSlug: p.slug,
                imageUrl: p.images[0]?.url ?? null,
                unitPricePaise: p.pricePaise,
                quantity: i.quantity,
                lineTotalPaise: p.pricePaise * i.quantity,
              };
            }),
          },
          events: { create: { status: 'PENDING_PAYMENT', note: 'Order placed — awaiting payment', actor: 'customer' } },
        },
      });
      return order;
    },
    { isolationLevel: 'ReadCommitted', timeout: 15_000 },
  );
}

async function releaseStock(tx: Tx, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.stockReleased) return;
  for (const item of order.items) {
    if (item.productId) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
  }
  await tx.order.update({ where: { id: orderId }, data: { stockReleased: true } });
}

/** Marks a payment successful: order → CONFIRMED, coupon usage counted, cart cleared. */
export async function markPaymentSucceeded(paymentId: string, providerPaymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
    if (payment.status === 'SUCCEEDED') return payment.order;
    if (payment.order.status !== 'PENDING_PAYMENT') {
      throw ApiError.conflict('This order can no longer be paid. Please place a new order.');
    }
    await tx.payment.update({ where: { id: paymentId }, data: { status: 'SUCCEEDED', providerPaymentId } });
    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'CONFIRMED', events: { create: { status: 'CONFIRMED', note: payment.isDemo ? 'DEMO payment approved (simulated — no money moved)' : 'Payment verified', actor: 'system' } } },
    });
    if (order.couponCode) await tx.coupon.update({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } }).catch(() => undefined);
    if (order.userId) {
      const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
      }
    }
    return order;
  });
}

/** Marks a payment failed: order → PAYMENT_FAILED and reserved stock released. The cart is kept so the customer can retry. */
export async function markPaymentFailed(paymentId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { order: true } });
    if (payment.status !== 'CREATED') return payment.order;
    await tx.payment.update({ where: { id: paymentId }, data: { status: 'FAILED', failureReason: reason } });
    if (payment.order.status !== 'PENDING_PAYMENT') return payment.order;
    await releaseStock(tx, payment.orderId);
    return tx.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAYMENT_FAILED', events: { create: { status: 'PAYMENT_FAILED', note: reason, actor: 'system' } } },
    });
  });
}

export async function cancelOrder(orderId: string, actor: string, reason: string, allowed: OrderStatus[]) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: true } });
    if (!allowed.includes(order.status)) {
      throw ApiError.conflict(`Orders that are ${order.status.replace('_', ' ').toLowerCase()} cannot be cancelled.`);
    }
    await releaseStock(tx, orderId);
    const paid = order.payments.find((p) => p.status === 'SUCCEEDED');
    if (paid) await tx.payment.update({ where: { id: paid.id }, data: { status: 'REFUNDED' } });
    for (const p of order.payments.filter((p) => p.status === 'CREATED')) {
      await tx.payment.update({ where: { id: p.id }, data: { status: 'FAILED', failureReason: 'Order cancelled' } });
    }
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
        events: {
          create: {
            status: 'CANCELLED',
            note: paid ? `${reason} — ${paid.isDemo ? 'DEMO refund recorded (no money moved)' : 'refund to be processed via payment provider'}` : reason,
            actor,
          },
        },
      },
    });
  });
}

export async function transitionOrder(orderId: string, to: OrderStatus, actor: string, note?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Order not found.');
  const allowed = ADMIN_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(to)) {
    throw ApiError.conflict(`Cannot move an order from ${order.status} to ${to}.`, { allowed });
  }
  return prisma.order.update({
    where: { id: orderId },
    data: { status: to, events: { create: { status: to, note: note ?? null, actor } } },
  });
}

/** Cancels unpaid orders older than the TTL so reserved stock returns to the shelf. */
export async function expireStalePendingOrders() {
  const cutoff = new Date(Date.now() - PENDING_PAYMENT_TTL_MINUTES * 60 * 1000);
  const stale = await prisma.order.findMany({ where: { status: 'PENDING_PAYMENT', createdAt: { lt: cutoff } }, select: { id: true } });
  for (const o of stale) {
    await cancelOrder(o.id, 'system', 'Payment not completed in time', ['PENDING_PAYMENT']).catch((err) =>
      logger.warn({ err, orderId: o.id }, 'Failed to expire pending order'),
    );
  }
  return stale.length;
}

export const orderDetailInclude = {
  items: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
  events: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OrderInclude;
