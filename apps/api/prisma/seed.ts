/* eslint-disable no-console */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { PrismaClient, type OrderStatus, type Product } from '@prisma/client';
import { categories, coupons, demoCustomers, products } from './seed-data.js';
import { DEFAULT_SHIPPING, DEFAULT_STORE } from '../src/services/settings.js';

const prisma = new PrismaClient();
const here = path.dirname(fileURLToPath(import.meta.url));

type ManifestEntry = { objectID: number; title: string; date: string; culture: string; objectURL: string; files: string[] };
const manifestPath = path.join(here, 'image-manifest.json');
const manifest: Record<string, ManifestEntry> = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

const PLACEHOLDER = '/images/placeholder-artifact.svg';
const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to seed in production (this wipes data). Pass --force if you really mean it.');
  }

  console.log('› Clearing existing data');
  // Order matters for foreign keys. All customer accounts are removed (this is a dev reset);
  // admin users are preserved so a bootstrapped admin survives reseeding.
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.orderEvent.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.wishlist.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.newsletterSubscriber.deleteMany(),
    prisma.contactSubmission.deleteMany(),
    prisma.storeSetting.deleteMany(),
    prisma.user.deleteMany({ where: { role: 'CUSTOMER' } }),
  ]);

  console.log('› Store settings');
  await prisma.storeSetting.createMany({
    data: [
      { key: 'store', value: DEFAULT_STORE },
      { key: 'shipping', value: DEFAULT_SHIPPING },
    ],
  });

  console.log('› Categories');
  const catIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const img = manifest[c.imageKey]?.files[0] ?? PLACEHOLDER;
    const row = await prisma.category.create({ data: { slug: c.slug, name: c.name, description: c.description, imageUrl: img, sortOrder: i } });
    catIds.set(c.slug, row.id);
  }

  console.log('› Products');
  const productRows: Product[] = [];
  for (const p of products) {
    const m = manifest[p.key];
    const files = m?.files?.length ? m.files : [PLACEHOLDER];
    const views = ['front view', 'alternate view', 'detail view'];
    const row = await prisma.product.create({
      data: {
        sku: p.sku,
        slug: p.key,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        categoryId: catIds.get(p.category)!,
        pricePaise: p.price * 100,
        compareAtPaise: p.compareAt ? p.compareAt * 100 : null,
        stock: p.stock,
        status: 'PUBLISHED',
        isFeatured: !!p.featured,
        isCuratorPick: !!p.curator,
        materials: p.materials,
        dimensions: p.dimensions,
        period: p.period,
        origin: p.origin,
        provenance: p.provenance,
        provenanceType: 'ILLUSTRATIVE',
        condition: p.condition,
        imageCredit: m
          ? `Reference photograph: "${m.title}" (${m.date}), The Metropolitan Museum of Art, Open Access — public domain (CC0). ${m.objectURL}`
          : null,
        popularity: p.popularity,
        publishedAt: days(p.daysAgo),
        createdAt: days(p.daysAgo),
        images: {
          create: files.map((url, i) => ({ url, alt: `${p.name} — ${views[i] ?? 'view'}`, sortOrder: i })),
        },
      },
    });
    productRows.push(row);
  }

  console.log('› Coupons');
  for (const c of coupons) {
    await prisma.coupon.create({
      data: {
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.value,
        minSubtotal: c.minSubtotal,
        maxDiscount: 'maxDiscount' in c ? c.maxDiscount : null,
        expiresAt: 'expired' in c ? days(1) : null,
      },
    });
  }

  console.log('› Demo customers (cannot sign in — random unusable passwords)');
  const customers: ((typeof demoCustomers)[number] & { id: string })[] = [];
  for (const c of demoCustomers) {
    // Random throwaway password nobody knows; demo customers exist only to populate order history.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    const user = await prisma.user.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        passwordHash,
        isDemo: true,
        createdAt: days(45 + demoCustomers.indexOf(c) * 3),
        addresses: {
          create: { fullName: c.name, phone: c.phone, line1: '1 Demo Street (placeholder)', city: c.city, state: c.state, postalCode: c.pin, isDefault: true },
        },
      },
    });
    customers.push({ ...c, id: user.id });
  }

  console.log('› Illustrative orders');
  const plan: { daysAgo: number; status: OrderStatus; items: [number, number][]; method: 'standard' | 'express' }[] = [
    { daysAgo: 28, status: 'DELIVERED', items: [[4, 1], [27, 2]], method: 'standard' },
    { daysAgo: 25, status: 'DELIVERED', items: [[16, 1]], method: 'express' },
    { daysAgo: 22, status: 'DELIVERED', items: [[1, 1]], method: 'standard' },
    { daysAgo: 19, status: 'DELIVERED', items: [[18, 1], [26, 1]], method: 'standard' },
    { daysAgo: 16, status: 'SHIPPED', items: [[24, 1]], method: 'express' },
    { daysAgo: 14, status: 'CANCELLED', items: [[12, 1]], method: 'standard' },
    { daysAgo: 12, status: 'SHIPPED', items: [[3, 2]], method: 'standard' },
    { daysAgo: 9, status: 'DELIVERED', items: [[21, 1]], method: 'standard' },
    { daysAgo: 7, status: 'PROCESSING', items: [[5, 1]], method: 'express' },
    { daysAgo: 5, status: 'PAYMENT_FAILED', items: [[7, 1]], method: 'standard' },
    { daysAgo: 4, status: 'PROCESSING', items: [[19, 1], [27, 1]], method: 'standard' },
    { daysAgo: 2, status: 'CONFIRMED', items: [[22, 1]], method: 'standard' },
    { daysAgo: 1, status: 'CONFIRMED', items: [[13, 1]], method: 'express' },
    { daysAgo: 0, status: 'CONFIRMED', items: [[28, 1], [4, 1]], method: 'standard' },
  ];
  const lifecycle: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

  for (const [i, o] of plan.entries()) {
    const cust = customers[i % customers.length];
    const lines = o.items.map(([idx, qty]) => ({ p: productRows[idx], qty }));
    const subtotal = lines.reduce((s, l) => s + l.p.pricePaise * l.qty, 0);
    const shipping = o.method === 'express' ? DEFAULT_SHIPPING.expressPaise : subtotal >= DEFAULT_SHIPPING.freeShippingThresholdPaise ? 0 : DEFAULT_SHIPPING.standardPaise;
    const createdAt = new Date(days(o.daysAgo).getTime() - (i % 5) * 3600_000);
    const paid = !['PAYMENT_FAILED'].includes(o.status);
    const events =
      o.status === 'CANCELLED'
        ? (['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED'] as OrderStatus[])
        : o.status === 'PAYMENT_FAILED'
          ? (['PENDING_PAYMENT', 'PAYMENT_FAILED'] as OrderStatus[])
          : lifecycle.slice(0, lifecycle.indexOf(o.status) + 1);

    await prisma.order.create({
      data: {
        orderNumber: `AQ-DEMO-${String(1001 + i)}`,
        userId: cust.id,
        email: cust.email,
        customerName: cust.name,
        phone: cust.phone,
        status: o.status,
        deliveryMethod: o.method,
        subtotalPaise: subtotal,
        shippingPaise: shipping,
        totalPaise: subtotal + shipping,
        shipName: cust.name,
        shipPhone: cust.phone,
        shipLine1: '1 Demo Street (placeholder)',
        shipCity: cust.city,
        shipState: cust.state,
        shipPostalCode: cust.pin,
        shipCountry: 'India',
        isDemo: true,
        stockReleased: o.status === 'CANCELLED' || o.status === 'PAYMENT_FAILED',
        cancelledAt: o.status === 'CANCELLED' ? createdAt : null,
        cancelReason: o.status === 'CANCELLED' ? 'Customer request (illustrative)' : null,
        createdAt,
        items: {
          create: lines.map((l) => ({
            productId: l.p.id,
            productName: l.p.name,
            productSku: l.p.sku,
            productSlug: l.p.slug,
            imageUrl: manifest[l.p.slug]?.files[0] ?? PLACEHOLDER,
            unitPricePaise: l.p.pricePaise,
            quantity: l.qty,
            lineTotalPaise: l.p.pricePaise * l.qty,
          })),
        },
        payments: {
          create: {
            provider: 'DEMO',
            isDemo: true,
            amountPaise: subtotal + shipping,
            status: o.status === 'CANCELLED' ? 'REFUNDED' : paid ? 'SUCCEEDED' : 'FAILED',
            providerPaymentId: paid ? `demo_seed_${i}` : null,
            failureReason: paid ? null : 'DEMO payment declined (simulated failure scenario)',
            createdAt,
          },
        },
        events: {
          create: events.map((s, k) => ({
            status: s,
            note: k === 0 ? 'Order placed (seeded demo data)' : s === 'CONFIRMED' ? 'DEMO payment approved (simulated)' : null,
            actor: k === 0 ? 'customer' : 'system',
            createdAt: new Date(createdAt.getTime() + k * 26 * 3600_000),
          })),
        },
      },
    });
  }

  console.log('› Newsletter subscribers & contact messages (demo)');
  await prisma.newsletterSubscriber.createMany({
    data: ['collector.one@example.com', 'heritage.lover@example.com', 'map.enthusiast@example.com', 'numismatist@example.com', 'interiors.studio@example.com'].map(
      (email, i) => ({ email, source: i % 2 ? 'footer' : 'homepage', isDemo: true, createdAt: days(20 - i * 3) }),
    ),
  });
  await prisma.contactSubmission.createMany({
    data: [
      { name: 'Ishaan Kapoor (Demo)', email: 'ishaan.demo@example.com', subject: 'Question about the Iznik dish', message: 'Could you share additional photographs of the rim restoration on the Iznik dish? (Demo message)', isDemo: true, createdAt: days(3) },
      { name: 'Ananya Rao (Demo)', email: 'ananya.demo@example.com', subject: 'White-glove delivery to Pune', message: 'Do you offer insured delivery for the chest-on-chest to Pune, and how is it crated? (Demo message)', isDemo: true, createdAt: days(1), isRead: true },
    ],
  });

  const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
  console.log(`\n✔ Seed complete: ${categories.length} categories, ${products.length} products, ${plan.length} demo orders.`);
  if (!admins) console.log('ℹ No administrator yet. Create one with:  npm run admin:create');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
