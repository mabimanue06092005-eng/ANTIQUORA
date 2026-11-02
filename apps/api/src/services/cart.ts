import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { ApiError } from '../lib/http.js';
import { ensureGuestToken } from '../middleware/session.js';
import { computeTotals, type DeliveryMethod } from './pricing.js';
import { getShippingSettings } from './settings.js';
import { productCard, productInclude } from './serialize.js';

export const MAX_QTY_PER_LINE = 10;

/** Finds the cart for the current user or guest, optionally creating it. */
export async function findCart(req: Request, res: Response, create: boolean) {
  if (req.user) {
    const existing = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (existing || !create) return existing;
    return prisma.cart.create({ data: { userId: req.user.id } });
  }
  const token = create ? ensureGuestToken(req, res) : req.guestToken;
  if (!token) return null;
  const existing = await prisma.cart.findUnique({ where: { guestToken: token } });
  if (existing || !create) return existing;
  return prisma.cart.create({ data: { guestToken: token } });
}

/** Builds the full cart view, with server-side prices, stock clamps and totals. */
export async function cartView(cartId: string | null, method: DeliveryMethod = 'standard') {
  const shipping = await getShippingSettings();
  if (!cartId) {
    return { items: [], itemCount: 0, warnings: [], totals: computeTotals([], null, method, shipping) };
  }
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { product: { include: productInclude } }, orderBy: { createdAt: 'asc' } } },
  });
  if (!cart) return cartView(null, method);

  const warnings: string[] = [];
  const valid = [];
  for (const item of cart.items) {
    const p = item.product;
    if (p.status !== 'PUBLISHED' || p.stock <= 0) {
      warnings.push(`"${p.name}" is no longer available and was removed from your bag.`);
      await prisma.cartItem.delete({ where: { id: item.id } });
      continue;
    }
    if (item.quantity > p.stock) {
      warnings.push(`Only ${p.stock} of "${p.name}" available — quantity adjusted.`);
      await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: p.stock } });
      item.quantity = p.stock;
    }
    valid.push(item);
  }

  const coupon = cart.couponCode ? await prisma.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
  const totals = computeTotals(
    valid.map((i) => ({ productId: i.productId, unitPricePaise: i.product.pricePaise, quantity: i.quantity })),
    cart.couponCode ? coupon : null,
    method,
    shipping,
  );
  if (cart.couponCode && totals.couponError) warnings.push(totals.couponError);

  return {
    items: valid.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      lineTotalPaise: i.quantity * i.product.pricePaise,
      maxQuantity: Math.min(i.product.stock, MAX_QTY_PER_LINE),
      product: productCard(i.product),
    })),
    itemCount: valid.reduce((s, i) => s + i.quantity, 0),
    couponCode: cart.couponCode,
    warnings,
    totals,
  };
}

export async function addToCart(cartId: string, productId: string, quantity: number, mode: 'add' | 'set') {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== 'PUBLISHED') throw ApiError.notFound('This artifact is not available.');
  if (product.stock <= 0) throw ApiError.conflict('This artifact is currently out of stock.');
  const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  const desired = mode === 'add' ? (existing?.quantity ?? 0) + quantity : quantity;
  const limit = Math.min(product.stock, MAX_QTY_PER_LINE);
  if (desired > limit) {
    throw ApiError.conflict(
      product.stock < MAX_QTY_PER_LINE
        ? `Only ${product.stock} available${existing ? ` — you already have ${existing.quantity} in your bag` : ''}.`
        : `You can add up to ${MAX_QTY_PER_LINE} of this item per order.`,
      { available: product.stock },
    );
  }
  if (desired <= 0) {
    if (existing) await prisma.cartItem.delete({ where: { id: existing.id } });
    return;
  }
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    update: { quantity: desired },
    create: { cartId, productId, quantity: desired },
  });
}

/** Merges a guest cart into the signed-in user's cart, respecting stock limits. */
export async function mergeGuestCart(userId: string, guestToken: string | undefined) {
  if (!guestToken) return;
  const guest = await prisma.cart.findUnique({ where: { guestToken }, include: { items: { include: { product: true } } } });
  if (!guest) return;
  const userCart = (await prisma.cart.findUnique({ where: { userId } })) ?? (await prisma.cart.create({ data: { userId } }));
  for (const item of guest.items) {
    const existing = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId: userCart.id, productId: item.productId } } });
    const qty = Math.min((existing?.quantity ?? 0) + item.quantity, item.product.stock, MAX_QTY_PER_LINE);
    if (qty <= 0) continue;
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: userCart.id, productId: item.productId } },
      update: { quantity: qty },
      create: { cartId: userCart.id, productId: item.productId, quantity: qty },
    });
  }
  if (guest.couponCode && !userCart.couponCode) {
    await prisma.cart.update({ where: { id: userCart.id }, data: { couponCode: guest.couponCode } });
  }
  await prisma.cart.delete({ where: { id: guest.id } });
}

export async function mergeGuestWishlist(userId: string, guestToken: string | undefined) {
  if (!guestToken) return;
  const guest = await prisma.wishlist.findUnique({ where: { guestToken }, include: { items: true } });
  if (!guest) return;
  const wl = (await prisma.wishlist.findUnique({ where: { userId } })) ?? (await prisma.wishlist.create({ data: { userId } }));
  if (guest.items.length) {
    await prisma.wishlistItem.createMany({
      data: guest.items.map((i) => ({ wishlistId: wl.id, productId: i.productId })),
      skipDuplicates: true,
    });
  }
  await prisma.wishlist.delete({ where: { id: guest.id } });
}
