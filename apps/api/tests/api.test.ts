import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

let app: Express;

/** A cookie-jar agent that also echoes the CSRF cookie as a header, like the real frontend. */
async function client() {
  const agent = request.agent(app);
  const res = await agent.get('/api/csrf');
  const token = res.body.data.token as string;
  const h = { 'X-CSRF-Token': token };
  return {
    agent,
    get: (url: string) => agent.get(url),
    post: (url: string, body: object = {}) => agent.post(url).set(h).send(body),
    put: (url: string, body: object = {}) => agent.put(url).set(h).send(body),
    patch: (url: string, body: object = {}) => agent.patch(url).set(h).send(body),
    del: (url: string) => agent.delete(url).set(h),
  };
}

const uniqueEmail = (p: string) => `${p}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;
const PASSWORD = 'Collector123';
const address = { fullName: 'Test Buyer', phone: '9876543210', line1: '12 MG Road', city: 'Pune', state: 'Maharashtra', postalCode: '411001', country: 'India' };

async function registeredCustomer() {
  const c = await client();
  const email = uniqueEmail('buyer');
  const res = await c.post('/api/auth/register', { name: 'Test Buyer', email, password: PASSWORD, confirmPassword: PASSWORD });
  expect(res.status).toBe(201);
  return { c, email };
}

async function adminClient() {
  const email = uniqueEmail('admin');
  await prisma.user.create({ data: { email, name: 'Test Admin', role: 'ADMIN', passwordHash: await bcrypt.hash(PASSWORD, 4) } });
  const c = await client();
  expect((await c.post('/api/auth/login', { email, password: PASSWORD })).status).toBe(200);
  return c;
}

async function inStockProduct(minStock = 2) {
  return prisma.product.findFirstOrThrow({ where: { status: 'PUBLISHED', stock: { gte: minStock } }, orderBy: { pricePaise: 'asc' } });
}

beforeAll(() => {
  app = createApp();
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('catalogue', () => {
  it('lists published products with pagination meta', async () => {
    const res = await request(app).get('/api/products?pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(24);
  });

  it('combines search, category and price filters', async () => {
    const res = await request(app).get('/api/products?category=ancient-coins&maxPrice=70000&sort=price_asc');
    expect(res.status).toBe(200);
    const items = res.body.data as { category: { slug: string }; pricePaise: number }[];
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.category.slug === 'ancient-coins' && p.pricePaise <= 70_000_00)).toBe(true);
    expect(items.map((p) => p.pricePaise)).toEqual([...items.map((p) => p.pricePaise)].sort((a, b) => a - b));
    const search = await request(app).get('/api/products?q=AQ-CN-001');
    expect(search.body.data[0].sku).toBe('AQ-CN-001');
  });

  it('filters on-sale and in-stock items', async () => {
    const sale = await request(app).get('/api/products?onSale=true&pageSize=48');
    expect(sale.body.data.every((p: { compareAtPaise: number | null; pricePaise: number }) => p.compareAtPaise! > p.pricePaise)).toBe(true);
    const stock = await request(app).get('/api/products?inStock=true&pageSize=48');
    expect(stock.body.data.every((p: { stock: number }) => p.stock > 0)).toBe(true);
  });

  it('returns product detail with related items, and 404 for unknown slugs', async () => {
    const res = await request(app).get('/api/products/iznik-dish');
    expect(res.status).toBe(200);
    expect(res.body.data.product.provenanceType).toBe('ILLUSTRATIVE');
    expect(res.body.data.related.length).toBeGreaterThan(0);
    expect((await request(app).get('/api/products/does-not-exist')).status).toBe(404);
  });

  it('validates query parameters', async () => {
    const res = await request(app).get('/api/products?sort=hack');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('security', () => {
  it('rejects state-changing requests without a CSRF token', async () => {
    const res = await request(app).post('/api/cart/items').send({ productId: 'x', quantity: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_FAILED');
  });

  it('blocks anonymous and customer access to admin endpoints', async () => {
    expect((await request(app).get('/api/admin/dashboard')).status).toBe(401);
    const { c } = await registeredCustomer();
    expect((await c.get('/api/admin/dashboard')).status).toBe(403);
    expect((await c.post('/api/admin/products', {})).status).toBe(403);
    expect((await c.get('/api/admin/customers')).status).toBe(403);
  });

  it('ignores a client-supplied role on registration (mass assignment)', async () => {
    const c = await client();
    const email = uniqueEmail('sneaky');
    const res = await c.post('/api/auth/register', { name: 'Sneaky', email, password: PASSWORD, confirmPassword: PASSWORD, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('CUSTOMER');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('does not expose password hashes from /me', async () => {
    const { c } = await registeredCustomer();
    const me = await c.get('/api/auth/me');
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('auth', () => {
  it('validates registration input with field messages', async () => {
    const c = await client();
    const res = await c.post('/api/auth/register', { name: 'A', email: 'nope', password: 'short', confirmPassword: 'x' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('registers, logs out, rejects wrong password and logs back in', async () => {
    const { c, email } = await registeredCustomer();
    expect((await c.post('/api/auth/logout')).status).toBe(200);
    expect((await c.get('/api/auth/me')).body.data).toBeNull();
    expect((await c.post('/api/auth/login', { email, password: 'Wrong12345' })).status).toBe(401);
    const ok = await c.post('/api/auth/login', { email, password: PASSWORD });
    expect(ok.status).toBe(200);
    expect((await c.get('/api/auth/me')).body.data.email).toBe(email);
  });

  it('rejects duplicate registration', async () => {
    const { email } = await registeredCustomer();
    const c = await client();
    const res = await c.post('/api/auth/register', { name: 'Again', email, password: PASSWORD, confirmPassword: PASSWORD });
    expect(res.status).toBe(409);
  });
});

describe('cart & wishlist', () => {
  it('adds, updates and removes items with server-side totals', async () => {
    const c = await client();
    const p = await inStockProduct();
    const add = await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    expect(add.status).toBe(201);
    expect(add.body.data.totals.subtotalPaise).toBe(p.pricePaise);
    const itemId = add.body.data.items[0].id;
    const upd = await c.patch(`/api/cart/items/${itemId}`, { quantity: 2 });
    expect(upd.body.data.totals.subtotalPaise).toBe(p.pricePaise * 2);
    const del = await c.del(`/api/cart/items/${itemId}`);
    expect(del.body.data.items).toHaveLength(0);
  });

  it('prevents adding more than available stock', async () => {
    const c = await client();
    const p = await prisma.product.findFirstOrThrow({ where: { status: 'PUBLISHED', stock: 1 } });
    expect((await c.post('/api/cart/items', { productId: p.id, quantity: 1 })).status).toBe(201);
    const res = await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    expect(res.status).toBe(409);
  });

  it('applies valid coupons and rejects expired ones', async () => {
    const c = await client();
    const p = await inStockProduct();
    await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    const bad = await c.post('/api/cart/coupon', { code: 'EXPIRED50' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.message).toMatch(/expired/);
    const good = await c.post('/api/cart/coupon', { code: 'welcome10' });
    expect(good.status).toBe(200);
    expect(good.body.data.totals.discountPaise).toBe(Math.min(Math.floor(p.pricePaise / 10), 5_000_00));
  });

  it('merges a guest cart and wishlist into the account on login', async () => {
    const { email } = await registeredCustomer();
    const guest = await client();
    const p = await inStockProduct();
    await guest.post('/api/cart/items', { productId: p.id, quantity: 1 });
    await guest.post('/api/wishlist/items', { productId: p.id });
    await guest.post('/api/auth/login', { email, password: PASSWORD });
    expect((await guest.get('/api/cart')).body.data.items[0].product.id).toBe(p.id);
    expect((await guest.get('/api/wishlist')).body.data.productIds).toContain(p.id);
  });

  it('prevents duplicate wishlist entries and moves items to the cart', async () => {
    const { c } = await registeredCustomer();
    const p = await inStockProduct();
    await c.post('/api/wishlist/items', { productId: p.id });
    const again = await c.post('/api/wishlist/items', { productId: p.id });
    expect(again.body.data.productIds.filter((id: string) => id === p.id)).toHaveLength(1);
    const moved = await c.post(`/api/wishlist/items/${p.id}/move-to-cart`);
    expect(moved.body.data.wishlist.productIds).not.toContain(p.id);
    expect(moved.body.data.cart.items[0].product.id).toBe(p.id);
  });
});

describe('checkout & orders', () => {
  const checkoutBody = (expectedTotalPaise?: number) => ({
    customer: { name: 'Test Buyer', email: 'buyer@example.com', phone: '9876543210' },
    address,
    deliveryMethod: 'standard',
    expectedTotalPaise,
  });

  it('requires sign-in to check out', async () => {
    const c = await client();
    expect((await c.post('/api/checkout', checkoutBody())).status).toBe(401);
  });

  it('validates the address', async () => {
    const { c } = await registeredCustomer();
    const p = await inStockProduct();
    await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    const res = await c.post('/api/checkout', { ...checkoutBody(), address: { ...address, postalCode: '12', state: 'Atlantis' } });
    expect(res.status).toBe(422);
    expect(res.body.error.details['address.postalCode']).toMatch(/PIN/);
    expect(res.body.error.details['address.state']).toBeDefined();
  });

  it('completes a successful DEMO payment: confirms order, decrements stock, clears cart', async () => {
    const { c } = await registeredCustomer();
    const p = await inStockProduct();
    await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    const cart = await c.get('/api/cart?delivery=standard');
    const created = await c.post('/api/checkout', checkoutBody(cart.body.data.totals.totalPaise));
    expect(created.status).toBe(201);
    expect(created.body.data.payment.isDemo).toBe(true);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(p.stock - 1);

    const pay = await c.post(`/api/checkout/payments/${created.body.data.payment.id}/demo`, { outcome: 'success' });
    expect(pay.body.data.status).toBe('CONFIRMED');
    expect((await c.get('/api/cart')).body.data.items).toHaveLength(0);

    const order = await c.get(`/api/orders/${created.body.data.order.orderNumber}`);
    expect(order.body.data.payments[0]).toMatchObject({ status: 'SUCCEEDED', isDemo: true });
    expect(order.body.data.items[0].productName).toBe(p.name);
    const history = await c.get('/api/orders');
    expect(history.body.data[0].orderNumber).toBe(created.body.data.order.orderNumber);
  });

  it('a failed DEMO payment does not produce a paid order and releases stock', async () => {
    const { c } = await registeredCustomer();
    const p = await inStockProduct();
    await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    const created = await c.post('/api/checkout', checkoutBody());
    const pay = await c.post(`/api/checkout/payments/${created.body.data.payment.id}/demo`, { outcome: 'failure' });
    expect(pay.body.data.status).toBe('PAYMENT_FAILED');
    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: created.body.data.order.orderNumber }, include: { payments: true } });
    expect(order.payments.every((x) => x.status !== 'SUCCEEDED')).toBe(true);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(p.stock);
    // Cart is kept so the customer can retry, and the failed payment cannot be re-used.
    expect((await c.get('/api/cart')).body.data.items).toHaveLength(1);
    const retry = await c.post(`/api/checkout/payments/${created.body.data.payment.id}/demo`, { outcome: 'success' });
    expect(retry.status).toBe(409);
  });

  it('ignores browser totals and rejects stale ones', async () => {
    const { c } = await registeredCustomer();
    const p = await inStockProduct();
    await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    const res = await c.post('/api/checkout', checkoutBody(1));
    expect(res.status).toBe(409);
  });

  it('lets a customer cancel a confirmed order and restores stock', async () => {
    const { c } = await registeredCustomer();
    const p = await inStockProduct();
    await c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    const created = await c.post('/api/checkout', checkoutBody());
    await c.post(`/api/checkout/payments/${created.body.data.payment.id}/demo`, { outcome: 'success' });
    const res = await c.post(`/api/orders/${created.body.data.order.orderNumber}/cancel`, {});
    expect(res.body.data.status).toBe('CANCELLED');
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).stock).toBe(p.stock);
  });

  it("does not expose another customer's order", async () => {
    const a = await registeredCustomer();
    const b = await registeredCustomer();
    const p = await inStockProduct();
    await a.c.post('/api/cart/items', { productId: p.id, quantity: 1 });
    const created = await a.c.post('/api/checkout', checkoutBody());
    expect((await b.c.get(`/api/orders/${created.body.data.order.orderNumber}`)).status).toBe(404);
    expect((await b.c.post(`/api/checkout/payments/${created.body.data.payment.id}/demo`, { outcome: 'success' })).status).toBe(404);
  });
});

describe('admin', () => {
  it('creates, edits and archives a product, with audit log entries', async () => {
    const c = await adminClient();
    const cat = await prisma.category.findFirstOrThrow();
    const sku = `AQ-TS-${Date.now().toString().slice(-6)}`;
    const body = {
      name: 'Test Bronze Lamp', sku, shortDescription: 'A small test lamp for admin CRUD.', description: 'A longer description of this test lamp used by automated tests.',
      categoryId: cat.id, price: 12000, stock: 3, status: 'PUBLISHED', images: [{ url: '/images/placeholder-artifact.svg', alt: 'Test lamp' }],
    };
    const created = await c.post('/api/admin/products', body);
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect((await request(app).get(`/api/products/${created.body.data.slug}`)).status).toBe(200);

    const edited = await c.put(`/api/admin/products/${id}`, { ...body, price: 9500, compareAtPrice: 12000 });
    expect(edited.body.data.pricePaise).toBe(9_500_00);
    expect(edited.body.data.discountPercent).toBe(21);

    const archived = await c.patch(`/api/admin/products/${id}/status`, { status: 'ARCHIVED' });
    expect(archived.body.data.status).toBe('ARCHIVED');
    expect((await request(app).get(`/api/products/${created.body.data.slug}`)).status).toBe(404);

    const logs = await prisma.auditLog.findMany({ where: { entityId: id } });
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(['product.create', 'product.update', 'product.archived']));
  });

  it('validates product input', async () => {
    const c = await adminClient();
    const res = await c.post('/api/admin/products', { name: 'x', sku: '!!', price: -1 });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['name', 'sku', 'price']));
  });

  it('moves an order through the lifecycle and blocks invalid transitions', async () => {
    const c = await adminClient();
    const order = await prisma.order.findFirstOrThrow({ where: { status: 'CONFIRMED' } });
    expect((await c.patch(`/api/admin/orders/${order.id}/status`, { status: 'DELIVERED' })).status).toBe(409);
    expect((await c.patch(`/api/admin/orders/${order.id}/status`, { status: 'PROCESSING', note: 'Packing' })).body.data.status).toBe('PROCESSING');
    expect((await c.patch(`/api/admin/orders/${order.id}/status`, { status: 'SHIPPED' })).body.data.status).toBe('SHIPPED');
    expect((await c.patch(`/api/admin/orders/${order.id}/status`, { status: 'CANCELLED' })).status).toBe(409);
  });

  it('returns dashboard analytics from stored orders', async () => {
    const c = await adminClient();
    const res = await c.get('/api/admin/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.salesByDay).toHaveLength(30);
    expect(res.body.data.totals.revenuePaise).toBeGreaterThan(0);
  });

  it('disables a customer with a required reason and signs them out', async () => {
    const admin = await adminClient();
    const { c, email } = await registeredCustomer();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect((await admin.patch(`/api/admin/customers/${user.id}/status`, { disabled: true })).status).toBe(422);
    expect((await admin.patch(`/api/admin/customers/${user.id}/status`, { disabled: true, reason: 'Fraud test' })).status).toBe(200);
    expect((await c.get('/api/auth/me')).body.data).toBeNull();
    const login = await c.post('/api/auth/login', { email, password: PASSWORD });
    expect(login.status).toBe(403);
  });
});

describe('forms', () => {
  it('stores newsletter subscriptions and handles duplicates', async () => {
    const c = await client();
    const email = uniqueEmail('news');
    expect((await c.post('/api/newsletter', { email })).body.data.status).toBe('subscribed');
    expect((await c.post('/api/newsletter', { email })).body.data.status).toBe('already_subscribed');
    expect((await c.post('/api/newsletter', { email: 'bad' })).status).toBe(422);
  });

  it('validates and stores contact submissions', async () => {
    const c = await client();
    expect((await c.post('/api/contact', { name: 'A', email: 'x', subject: '', message: 'short' })).status).toBe(422);
    const ok = await c.post('/api/contact', { name: 'Asha Test', email: uniqueEmail('contact'), subject: 'Question', message: 'I would like to know more about this object please.' });
    expect(ok.status).toBe(201);
    expect(await prisma.contactSubmission.findUnique({ where: { id: ok.body.data.id } })).not.toBeNull();
  });
});
