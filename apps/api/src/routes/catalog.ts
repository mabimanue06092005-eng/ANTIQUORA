import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { ah, ApiError, ok, parse } from '../lib/http.js';
import { productCard, productDetail, productInclude } from '../services/serialize.js';
import { getShippingSettings, getStoreSettings } from '../services/settings.js';
import { config } from '../config.js';

export const catalogRouter = Router();

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')
  .optional();

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(200).optional(), // comma-separated slugs
  minPrice: z.coerce.number().min(0).max(1e9).optional(), // rupees
  maxPrice: z.coerce.number().min(0).max(1e9).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'featured']).default('featured'),
  featured: bool,
  onSale: bool,
  inStock: bool,
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

catalogRouter.get(
  '/products',
  ah(async (req, res) => {
    const q = parse(listQuery, req.query);
    const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };
    const and: Prisma.ProductWhereInput[] = [];

    if (q.q) {
      and.push({
        OR: [
          { name: { contains: q.q, mode: 'insensitive' } },
          { description: { contains: q.q, mode: 'insensitive' } },
          { shortDescription: { contains: q.q, mode: 'insensitive' } },
          { sku: { contains: q.q, mode: 'insensitive' } },
          { origin: { contains: q.q, mode: 'insensitive' } },
          { period: { contains: q.q, mode: 'insensitive' } },
        ],
      });
    }
    if (q.category) {
      const slugs = q.category.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);
      if (slugs.length) and.push({ category: { slug: { in: slugs } } });
    }
    if (q.minPrice != null || q.maxPrice != null) {
      and.push({
        pricePaise: {
          ...(q.minPrice != null ? { gte: Math.round(q.minPrice * 100) } : {}),
          ...(q.maxPrice != null ? { lte: Math.round(q.maxPrice * 100) } : {}),
        },
      });
    }
    if (q.featured) and.push({ isFeatured: true });
    if (q.inStock) and.push({ stock: { gt: 0 } });
    if (q.onSale) {
      // compareAt > price cannot be expressed as a column comparison in Prisma; pre-select ids.
      const rows = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "compareAtPaise" > "pricePaise" AND status = 'PUBLISHED'`;
      and.push({ id: { in: rows.map((r) => r.id) } });
    }
    if (and.length) where.AND = and;

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = {
      newest: [{ createdAt: 'desc' as const }],
      price_asc: [{ pricePaise: 'asc' as const }],
      price_desc: [{ pricePaise: 'desc' as const }],
      popular: [{ popularity: 'desc' as const }],
      featured: [{ isFeatured: 'desc' as const }, { popularity: 'desc' as const }],
    }[q.sort];
    orderBy.push({ id: 'asc' });

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        include: productInclude,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);

    ok(res, items.map(productCard), 200, {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    });
  }),
);

catalogRouter.get(
  '/products/curated',
  ah(async (_req, res) => {
    const [featured, curator] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'PUBLISHED', isFeatured: true },
        include: productInclude,
        orderBy: [{ popularity: 'desc' }],
        take: 8,
      }),
      prisma.product.findMany({
        where: { status: 'PUBLISHED', isCuratorPick: true },
        include: productInclude,
        orderBy: [{ updatedAt: 'desc' }],
        take: 3,
      }),
    ]);
    ok(res, { featured: featured.map(productCard), curatorPicks: curator.map(productDetail) });
  }),
);

catalogRouter.get(
  '/products/by-ids',
  ah(async (req, res) => {
    const { ids } = parse(z.object({ ids: z.string().max(2000) }), req.query);
    const list = ids.split(',').filter(Boolean).slice(0, 24);
    const items = await prisma.product.findMany({
      where: { id: { in: list }, status: 'PUBLISHED' },
      include: productInclude,
    });
    const byId = new Map(items.map((p) => [p.id, p]));
    ok(res, list.map((id) => byId.get(id)).filter(Boolean).map((p) => productCard(p!)));
  }),
);

catalogRouter.get(
  '/products/:slug',
  ah(async (req, res) => {
    const slug = parse(z.string().max(120), req.params.slug);
    const product = await prisma.product.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: productInclude,
    });
    if (!product) throw ApiError.notFound('This artifact could not be found or is no longer listed.');
    const related = await prisma.product.findMany({
      where: { status: 'PUBLISHED', categoryId: product.categoryId, id: { not: product.id } },
      include: productInclude,
      orderBy: { popularity: 'desc' },
      take: 4,
    });
    // Lightweight popularity signal for "sort by popularity".
    await prisma.product.update({ where: { id: product.id }, data: { popularity: { increment: 1 } } });
    ok(res, { product: productDetail(product), related: related.map(productCard) });
  }),
);

catalogRouter.get(
  '/categories',
  ah(async (_req, res) => {
    const cats = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: { where: { status: 'PUBLISHED' } } } } },
    });
    ok(
      res,
      cats.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        productCount: c._count.products,
      })),
    );
  }),
);

catalogRouter.get(
  '/store',
  ah(async (_req, res) => {
    const [store, shipping] = await Promise.all([getStoreSettings(), getShippingSettings()]);
    ok(res, { store, shipping, paymentProvider: config().PAYMENT_PROVIDER });
  }),
);
