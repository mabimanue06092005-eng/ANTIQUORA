import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ah, ApiError, ok, pageParams, parse } from '../lib/http.js';
import { slugify } from '../lib/slug.js';
import { requireAdmin } from '../middleware/session.js';
import { adminProduct, productInclude } from '../services/serialize.js';
import {
  ADMIN_CANCELLABLE,
  ADMIN_TRANSITIONS,
  cancelOrder,
  orderDetailInclude,
  REVENUE_STATUSES,
  transitionOrder,
} from '../services/orders.js';
import {
  getShippingSettings,
  getStoreSettings,
  saveSettings,
  shippingSettingsSchema,
  storeSettingsSchema,
} from '../services/settings.js';

export const adminRouter = Router();
// Every admin endpoint is protected server-side, regardless of what the UI shows.
adminRouter.use(requireAdmin);

async function audit(req: Request, action: string, entityType: string, entityId?: string, details?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({ data: { actorId: req.user!.id, action, entityType, entityId, details } });
}

const LOW_STOCK = 2;

/* ───────────────────────── Dashboard ───────────────────────── */

adminRouter.get(
  '/dashboard',
  ah(async (_req, res) => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);

    const [orders, products, customers, revenue, pending, lowStock, recent, daily, byCategory] = await Promise.all([
      prisma.order.count(),
      prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.order.aggregate({ _sum: { totalPaise: true }, where: { status: { in: REVENUE_STATUSES } } }),
      prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'] } } }),
      prisma.product.findMany({
        where: { status: 'PUBLISHED', stock: { lte: LOW_STOCK } },
        orderBy: { stock: 'asc' },
        take: 8,
        select: { id: true, name: true, sku: true, stock: true, slug: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, orderNumber: true, customerName: true, status: true, totalPaise: true, createdAt: true, isDemo: true },
      }),
      prisma.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day,
               COALESCE(SUM("totalPaise"), 0)::bigint AS revenue,
               COUNT(*)::bigint AS orders
        FROM "Order"
        WHERE "createdAt" >= ${since} AND status IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<{ name: string; revenue: bigint }[]>`
        SELECT c.name, COALESCE(SUM(oi."lineTotalPaise"), 0)::bigint AS revenue
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE o.status IN ('CONFIRMED','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY c.name ORDER BY 2 DESC`,
    ]);

    // Fill gaps so the chart has one point per day.
    const map = new Map(daily.map((d) => [d.day.toISOString().slice(0, 10), d]));
    const series = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      return { date: key, revenuePaise: Number(row?.revenue ?? 0), orders: Number(row?.orders ?? 0) };
    });

    ok(res, {
      totals: { orders, products, customers, revenuePaise: revenue._sum.totalPaise ?? 0, pendingOrders: pending },
      lowStock,
      recentOrders: recent,
      salesByDay: series,
      revenueByCategory: byCategory.map((r) => ({ name: r.name, revenuePaise: Number(r.revenue) })),
    });
  }),
);

/* ───────────────────────── Products ───────────────────────── */

const productInput = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(120),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,32}$/, 'SKU: 3–32 letters, numbers or dashes'),
  slug: z.string().trim().max(80).optional(),
  shortDescription: z.string().trim().min(10, 'Add a short description (10+ characters)').max(240),
  description: z.string().trim().min(30, 'Description should be at least 30 characters').max(5000),
  categoryId: z.string().min(1, 'Choose a category'),
  price: z.number({ error: 'Enter a price' }).positive('Price must be greater than zero').max(1e8),
  compareAtPrice: z.number().positive().max(1e8).nullable().optional(),
  stock: z.number({ error: 'Enter stock' }).int().min(0, 'Stock cannot be negative').max(10_000),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  isFeatured: z.boolean().default(false),
  isCuratorPick: z.boolean().default(false),
  materials: z.string().trim().max(200).nullable().optional(),
  dimensions: z.string().trim().max(200).nullable().optional(),
  period: z.string().trim().max(120).nullable().optional(),
  origin: z.string().trim().max(120).nullable().optional(),
  provenance: z.string().trim().max(2000).nullable().optional(),
  provenanceType: z.enum(['ILLUSTRATIVE', 'DOCUMENTED']).default('ILLUSTRATIVE'),
  condition: z.string().trim().max(1000).nullable().optional(),
  imageCredit: z.string().trim().max(300).nullable().optional(),
  images: z
    .array(z.object({ url: z.string().trim().max(500).regex(/^(\/|https:\/\/)/, 'Image URL must start with / or https://'), alt: z.string().trim().min(3, 'Alt text required').max(200) }))
    .max(8)
    .default([]),
});

function productData(body: z.infer<typeof productInput>) {
  const pricePaise = Math.round(body.price * 100);
  const compareAtPaise = body.compareAtPrice ? Math.round(body.compareAtPrice * 100) : null;
  if (compareAtPaise != null && compareAtPaise <= pricePaise) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.', { compareAtPrice: 'Original price must be higher than the selling price' });
  }
  // Explicit field mapping (no spreading of the request body) guards against mass assignment.
  return {
    name: body.name,
    sku: body.sku,
    slug: slugify(body.slug || body.name),
    shortDescription: body.shortDescription,
    description: body.description,
    categoryId: body.categoryId,
    pricePaise,
    compareAtPaise,
    stock: body.stock,
    status: body.status,
    isFeatured: body.isFeatured,
    isCuratorPick: body.isCuratorPick,
    materials: body.materials || null,
    dimensions: body.dimensions || null,
    period: body.period || null,
    origin: body.origin || null,
    provenance: body.provenance || null,
    provenanceType: body.provenanceType,
    condition: body.condition || null,
    imageCredit: body.imageCredit || null,
  };
}

adminRouter.get(
  '/products',
  ah(async (req, res) => {
    const q = parse(
      pageParams.extend({
        q: z.string().trim().max(100).optional(),
        status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'ALL']).default('ALL'),
        category: z.string().max(40).optional(),
        lowStock: z.enum(['true', 'false']).optional(),
      }),
      req.query,
    );
    const where: Prisma.ProductWhereInput = {
      ...(q.status !== 'ALL' ? { status: q.status } : {}),
      ...(q.category ? { categoryId: q.category } : {}),
      ...(q.lowStock === 'true' ? { stock: { lte: LOW_STOCK } } : {}),
      ...(q.q
        ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { sku: { contains: q.q, mode: 'insensitive' } }] }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    ok(res, items.map(adminProduct), 200, { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) });
  }),
);

adminRouter.get(
  '/products/:id',
  ah(async (req, res) => {
    const p = await prisma.product.findUnique({ where: { id: req.params.id }, include: productInclude });
    if (!p) throw ApiError.notFound('Product not found.');
    ok(res, adminProduct(p));
  }),
);

adminRouter.post(
  '/products',
  ah(async (req, res) => {
    const body = parse(productInput, req.body);
    const data = productData(body);
    const p = await prisma.product.create({
      data: {
        ...data,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        images: { create: body.images.map((img, i) => ({ ...img, sortOrder: i })) },
      },
      include: productInclude,
    });
    await audit(req, 'product.create', 'Product', p.id, { sku: p.sku, name: p.name });
    ok(res, adminProduct(p), 201);
  }),
);

adminRouter.put(
  '/products/:id',
  ah(async (req, res) => {
    const body = parse(productInput, req.body);
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Product not found.');
    const data = productData(body);
    const p = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: existing.id } });
      return tx.product.update({
        where: { id: existing.id },
        data: {
          ...data,
          publishedAt: data.status === 'PUBLISHED' ? existing.publishedAt ?? new Date() : existing.publishedAt,
          images: { create: body.images.map((img, i) => ({ ...img, sortOrder: i })) },
        },
        include: productInclude,
      });
    });
    const changed = Object.keys(data).filter((k) => (existing as Record<string, unknown>)[k] !== (data as Record<string, unknown>)[k]);
    await audit(req, 'product.update', 'Product', p.id, { changed });
    ok(res, adminProduct(p));
  }),
);

adminRouter.patch(
  '/products/:id/status',
  ah(async (req, res) => {
    const { status } = parse(z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) }), req.body);
    const p = await prisma.product.update({
      where: { id: req.params.id },
      data: { status, ...(status === 'PUBLISHED' ? { publishedAt: new Date() } : {}) },
      include: productInclude,
    });
    await audit(req, `product.${status.toLowerCase()}`, 'Product', p.id);
    ok(res, adminProduct(p));
  }),
);

/** Hard delete is only allowed for products never ordered; otherwise archive. */
adminRouter.delete(
  '/products/:id',
  ah(async (req, res) => {
    const used = await prisma.orderItem.count({ where: { productId: req.params.id } });
    if (used > 0) throw ApiError.conflict('This product appears in past orders. Archive it instead so order history stays intact.');
    await prisma.product.delete({ where: { id: req.params.id } });
    await audit(req, 'product.delete', 'Product', req.params.id);
    ok(res, { deleted: true });
  }),
);

/* ───────────────────────── Image upload ───────────────────────── */

export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(12).toString('hex')}${ALLOWED.get(file.mimetype)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(ApiError.badRequest('Only JPEG, PNG or WebP images are allowed.'));
  },
});

adminRouter.post(
  '/uploads',
  upload.single('image'),
  ah(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose an image to upload.');
    // Verify magic bytes so a renamed non-image cannot slip through on mimetype alone.
    const head = Buffer.alloc(12);
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, head, 0, 12, 0);
    fs.closeSync(fd);
    const isJpeg = head[0] === 0xff && head[1] === 0xd8;
    const isPng = head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const isWebp = head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) {
      fs.unlinkSync(req.file.path);
      throw ApiError.badRequest('The file does not look like a valid image.');
    }
    await audit(req, 'upload.image', 'Upload', req.file.filename);
    ok(res, { url: `/uploads/${req.file.filename}` }, 201);
  }),
);

/* ───────────────────────── Categories ───────────────────────── */

const categoryInput = z.object({
  name: z.string().trim().min(2, 'Name is required').max(60),
  slug: z.string().trim().max(60).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  imageUrl: z.string().trim().max(500).regex(/^(\/|https:\/\/)/, 'Image URL must start with / or https://').nullable().optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

adminRouter.get(
  '/categories',
  ah(async (_req, res) => {
    const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { products: true } } } });
    ok(res, cats.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })));
  }),
);

adminRouter.post(
  '/categories',
  ah(async (req, res) => {
    const b = parse(categoryInput, req.body);
    const c = await prisma.category.create({
      data: { name: b.name, slug: slugify(b.slug || b.name), description: b.description || null, imageUrl: b.imageUrl || null, sortOrder: b.sortOrder },
    });
    await audit(req, 'category.create', 'Category', c.id, { name: c.name });
    ok(res, c, 201);
  }),
);

adminRouter.put(
  '/categories/:id',
  ah(async (req, res) => {
    const b = parse(categoryInput, req.body);
    const c = await prisma.category.update({
      where: { id: req.params.id },
      data: { name: b.name, slug: slugify(b.slug || b.name), description: b.description || null, imageUrl: b.imageUrl || null, sortOrder: b.sortOrder },
    });
    await audit(req, 'category.update', 'Category', c.id, { name: c.name });
    ok(res, c);
  }),
);

adminRouter.delete(
  '/categories/:id',
  ah(async (req, res) => {
    const count = await prisma.product.count({ where: { categoryId: req.params.id } });
    if (count > 0) throw ApiError.conflict(`Move or delete the ${count} product(s) in this category first.`);
    await prisma.category.delete({ where: { id: req.params.id } });
    await audit(req, 'category.delete', 'Category', req.params.id);
    ok(res, { deleted: true });
  }),
);

/* ───────────────────────── Orders ───────────────────────── */

const ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED'] as const;

adminRouter.get(
  '/orders',
  ah(async (req, res) => {
    const q = parse(pageParams.extend({ q: z.string().trim().max(100).optional(), status: z.enum([...ORDER_STATUSES, 'ALL']).default('ALL') }), req.query);
    const where: Prisma.OrderWhereInput = {
      ...(q.status !== 'ALL' ? { status: q.status } : {}),
      ...(q.q
        ? {
            OR: [
              { orderNumber: { contains: q.q, mode: 'insensitive' } },
              { email: { contains: q.q, mode: 'insensitive' } },
              { customerName: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { _count: { select: { items: true } }, payments: { select: { status: true, provider: true, isDemo: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    ]);
    ok(
      res,
      items.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        email: o.email,
        status: o.status,
        totalPaise: o.totalPaise,
        itemCount: o._count.items,
        payment: o.payments[0] ?? null,
        isDemo: o.isDemo,
        createdAt: o.createdAt,
      })),
      200,
      { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
    );
  }),
);

adminRouter.get(
  '/orders/:id',
  ah(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { ...orderDetailInclude, user: { select: { id: true, name: true, email: true, createdAt: true } } },
    });
    if (!order) throw ApiError.notFound('Order not found.');
    ok(res, {
      ...order,
      allowedTransitions: ADMIN_TRANSITIONS[order.status] ?? [],
      canCancel: ADMIN_CANCELLABLE.includes(order.status),
    });
  }),
);

adminRouter.patch(
  '/orders/:id/status',
  ah(async (req, res) => {
    const b = parse(z.object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(300).optional() }), req.body);
    const updated =
      b.status === 'CANCELLED'
        ? await cancelOrder(req.params.id, req.user!.email, b.note || 'Cancelled by store', ADMIN_CANCELLABLE)
        : await transitionOrder(req.params.id, b.status, req.user!.email, b.note);
    await audit(req, 'order.status', 'Order', updated.id, { to: b.status, note: b.note ?? null });
    ok(res, { id: updated.id, status: updated.status });
  }),
);

/* ───────────────────────── Customers ───────────────────────── */

adminRouter.get(
  '/customers',
  ah(async (req, res) => {
    const q = parse(pageParams.extend({ q: z.string().trim().max(100).optional() }), req.query);
    const where: Prisma.UserWhereInput = {
      role: 'CUSTOMER',
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        select: { id: true, name: true, email: true, phone: true, isDisabled: true, isDemo: true, createdAt: true, _count: { select: { orders: true } } },
      }),
    ]);
    ok(res, users.map(({ _count, ...u }) => ({ ...u, orderCount: _count.orders })), 200, {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    });
  }),
);

adminRouter.get(
  '/customers/:id',
  ah(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'CUSTOMER' },
      select: {
        id: true, name: true, email: true, phone: true, isDisabled: true, disabledAt: true, disabledReason: true, isDemo: true, createdAt: true,
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, status: true, totalPaise: true, createdAt: true } },
      },
    });
    if (!user) throw ApiError.notFound('Customer not found.');
    const logs = await prisma.auditLog.findMany({
      where: { entityType: 'User', entityId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { email: true } } },
      take: 20,
    });
    ok(res, { ...user, auditLog: logs.map((l) => ({ id: l.id, action: l.action, actor: l.actor?.email ?? 'system', details: l.details, createdAt: l.createdAt })) });
  }),
);

adminRouter.patch(
  '/customers/:id/status',
  ah(async (req, res) => {
    const b = parse(
      z.object({ disabled: z.boolean(), reason: z.string().trim().max(300).optional() }).refine((v) => !v.disabled || (v.reason && v.reason.length >= 5), {
        path: ['reason'],
        message: 'Give a reason (5+ characters) for the audit log',
      }),
      req.body,
    );
    const user = await prisma.user.findFirst({ where: { id: req.params.id, role: 'CUSTOMER' } });
    if (!user) throw ApiError.notFound('Customer not found.');
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: b.disabled ? { isDisabled: true, disabledAt: new Date(), disabledReason: b.reason } : { isDisabled: false, disabledAt: null, disabledReason: null },
      }),
      // Disabling signs the customer out everywhere.
      ...(b.disabled ? [prisma.session.deleteMany({ where: { userId: user.id } })] : []),
    ]);
    await audit(req, b.disabled ? 'customer.disable' : 'customer.enable', 'User', user.id, { reason: b.reason ?? null });
    ok(res, { id: user.id, isDisabled: b.disabled });
  }),
);

/* ───────────────────────── Coupons ───────────────────────── */

const couponInput = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, 'Code: 3–20 letters or numbers'),
  description: z.string().trim().min(3).max(200),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number().positive(),
  minSubtotal: z.number().min(0).default(0),
  maxDiscount: z.number().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional().or(z.literal('')),
  usageLimit: z.number().int().positive().nullable().optional(),
}).refine((c) => c.type !== 'PERCENT' || c.value <= 90, { path: ['value'], message: 'Percent discount must be 90 or less' });

const couponData = (b: z.infer<typeof couponInput>) => ({
  code: b.code,
  description: b.description,
  type: b.type,
  value: b.type === 'PERCENT' ? Math.round(b.value) : Math.round(b.value * 100),
  minSubtotal: Math.round(b.minSubtotal * 100),
  maxDiscount: b.maxDiscount ? Math.round(b.maxDiscount * 100) : null,
  isActive: b.isActive,
  expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
  usageLimit: b.usageLimit ?? null,
});

adminRouter.get('/coupons', ah(async (_req, res) => ok(res, await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }))));
adminRouter.post(
  '/coupons',
  ah(async (req, res) => {
    const c = await prisma.coupon.create({ data: couponData(parse(couponInput, req.body)) });
    await audit(req, 'coupon.create', 'Coupon', c.id, { code: c.code });
    ok(res, c, 201);
  }),
);
adminRouter.put(
  '/coupons/:id',
  ah(async (req, res) => {
    const c = await prisma.coupon.update({ where: { id: req.params.id }, data: couponData(parse(couponInput, req.body)) });
    await audit(req, 'coupon.update', 'Coupon', c.id, { code: c.code });
    ok(res, c);
  }),
);
adminRouter.delete(
  '/coupons/:id',
  ah(async (req, res) => {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    await audit(req, 'coupon.delete', 'Coupon', req.params.id);
    ok(res, { deleted: true });
  }),
);

/* ───────────────────────── Newsletter & contact ───────────────────────── */

adminRouter.get(
  '/newsletter',
  ah(async (req, res) => {
    const q = parse(pageParams.extend({ q: z.string().trim().max(100).optional() }), req.query);
    const where: Prisma.NewsletterSubscriberWhereInput = q.q ? { email: { contains: q.q, mode: 'insensitive' } } : {};
    const [total, items] = await Promise.all([
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    ok(res, items, 200, { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) });
  }),
);

adminRouter.patch(
  '/newsletter/:id',
  ah(async (req, res) => {
    const { isActive } = parse(z.object({ isActive: z.boolean() }), req.body);
    const s = await prisma.newsletterSubscriber.update({ where: { id: req.params.id }, data: { isActive } });
    await audit(req, isActive ? 'newsletter.resubscribe' : 'newsletter.unsubscribe', 'NewsletterSubscriber', s.id);
    ok(res, s);
  }),
);

adminRouter.get(
  '/newsletter.csv',
  ah(async (_req, res) => {
    const subs = await prisma.newsletterSubscriber.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    // Prefix cells starting with formula characters to prevent CSV injection in spreadsheets.
    const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
    const csv = ['email,subscribed_at,source', ...subs.map((s) => `${safe(s.email)},${s.createdAt.toISOString()},${safe(s.source ?? '')}`)].join('\n');
    res.type('text/csv').attachment('newsletter-subscribers.csv').send(csv);
  }),
);

adminRouter.get(
  '/contact',
  ah(async (req, res) => {
    const q = parse(pageParams, req.query);
    const [total, items] = await Promise.all([
      prisma.contactSubmission.count(),
      prisma.contactSubmission.findMany({ orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    ok(res, items, 200, { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) });
  }),
);

adminRouter.patch(
  '/contact/:id',
  ah(async (req, res) => {
    const { isRead } = parse(z.object({ isRead: z.boolean() }), req.body);
    ok(res, await prisma.contactSubmission.update({ where: { id: req.params.id }, data: { isRead } }));
  }),
);

/* ───────────────────────── Settings & audit ───────────────────────── */

adminRouter.get(
  '/settings',
  ah(async (_req, res) => {
    const [store, shipping] = await Promise.all([getStoreSettings(), getShippingSettings()]);
    ok(res, { store, shipping });
  }),
);

adminRouter.put(
  '/settings',
  ah(async (req, res) => {
    const b = parse(
      z.object({
        store: storeSettingsSchema,
        shipping: z.object({
          standard: z.number().min(0).max(100000),
          express: z.number().min(0).max(100000),
          freeShippingThreshold: z.number().min(0).max(1e8),
          standardDays: z.string().trim().min(1).max(30),
          expressDays: z.string().trim().min(1).max(30),
          taxRatePercent: z.number().min(0).max(28),
        }),
      }),
      req.body,
    );
    const shipping = shippingSettingsSchema.parse({
      standardPaise: Math.round(b.shipping.standard * 100),
      expressPaise: Math.round(b.shipping.express * 100),
      freeShippingThresholdPaise: Math.round(b.shipping.freeShippingThreshold * 100),
      standardDays: b.shipping.standardDays,
      expressDays: b.shipping.expressDays,
      taxRatePercent: b.shipping.taxRatePercent,
    });
    await saveSettings('store', b.store);
    await saveSettings('shipping', shipping);
    await audit(req, 'settings.update', 'StoreSetting', undefined, { store: b.store, shipping });
    ok(res, { store: b.store, shipping });
  }),
);

adminRouter.get(
  '/audit-log',
  ah(async (req, res) => {
    const q = parse(pageParams, req.query);
    const [total, items] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { actor: { select: { email: true } } },
      }),
    ]);
    ok(
      res,
      items.map((l) => ({ id: l.id, action: l.action, entityType: l.entityType, entityId: l.entityId, details: l.details, actor: l.actor?.email ?? 'system', createdAt: l.createdAt })),
      200,
      { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) },
    );
  }),
);
