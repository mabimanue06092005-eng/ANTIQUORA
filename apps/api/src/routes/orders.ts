import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ah, ApiError, ok, pageParams, parse } from '../lib/http.js';
import { requireAuth } from '../middleware/session.js';
import { cancelOrder, CUSTOMER_CANCELLABLE, orderDetailInclude } from '../services/orders.js';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get(
  '/',
  ah(async (req, res) => {
    const { page, pageSize } = parse(pageParams, req.query);
    const where = { userId: req.user!.id };
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: { select: { productName: true, imageUrl: true, quantity: true } } },
      }),
    ]);
    ok(
      res,
      orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalPaise: o.totalPaise,
        createdAt: o.createdAt,
        isDemo: o.isDemo,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        items: o.items.slice(0, 4),
      })),
      200,
      { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    );
  }),
);

ordersRouter.get(
  '/:orderNumber',
  ah(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.params.orderNumber, userId: req.user!.id },
      include: orderDetailInclude,
    });
    if (!order) throw ApiError.notFound('Order not found.');
    const { stockReleased: _s, userId: _u, ...rest } = order;
    ok(res, {
      ...rest,
      payments: order.payments.map((p) => ({
        id: p.id,
        provider: p.provider,
        status: p.status,
        amountPaise: p.amountPaise,
        isDemo: p.isDemo,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
      })),
      canCancel: CUSTOMER_CANCELLABLE.includes(order.status),
    });
  }),
);

ordersRouter.post(
  '/:orderNumber/cancel',
  ah(async (req, res) => {
    const { reason } = parse(z.object({ reason: z.string().trim().max(200).optional() }), req.body ?? {});
    const order = await prisma.order.findFirst({ where: { orderNumber: req.params.orderNumber, userId: req.user!.id } });
    if (!order) throw ApiError.notFound('Order not found.');
    const updated = await cancelOrder(order.id, 'customer', reason || 'Cancelled by customer', CUSTOMER_CANCELLABLE);
    ok(res, { orderNumber: updated.orderNumber, status: updated.status });
  }),
);
