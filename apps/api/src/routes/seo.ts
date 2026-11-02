import { Router } from 'express';
import { prisma } from '../db.js';
import { ah } from '../lib/http.js';
import { config } from '../config.js';

export const seoRouter = Router();

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

seoRouter.get(
  '/sitemap.xml',
  ah(async (_req, res) => {
    const base = config().PUBLIC_SITE_URL.replace(/\/$/, '');
    const [products, categories] = await Promise.all([
      prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
      prisma.category.findMany({ select: { slug: true } }),
    ]);
    const statics = ['/', '/shop', '/categories', '/our-story', '/contact', '/faq', '/shipping-returns', '/privacy', '/terms'];
    const urls = [
      ...statics.map((p) => `<url><loc>${esc(base + p)}</loc></url>`),
      ...categories.map((c) => `<url><loc>${esc(`${base}/shop?category=${c.slug}`)}</loc></url>`),
      ...products.map((p) => `<url><loc>${esc(`${base}/artifact/${p.slug}`)}</loc><lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`),
    ];
    res
      .type('application/xml')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
  }),
);
