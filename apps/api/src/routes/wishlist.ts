import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ah, ApiError, ok, parse } from '../lib/http.js';
import { ensureGuestToken } from '../middleware/session.js';
import { productCard, productInclude } from '../services/serialize.js';
import { addToCart, cartView, findCart } from '../services/cart.js';

export const wishlistRouter = Router();

async function findWishlist(req: Request, res: Response, create: boolean) {
  if (req.user) {
    const w = await prisma.wishlist.findUnique({ where: { userId: req.user.id } });
    return w ?? (create ? prisma.wishlist.create({ data: { userId: req.user.id } }) : null);
  }
  const token = create ? ensureGuestToken(req, res) : req.guestToken;
  if (!token) return null;
  const w = await prisma.wishlist.findUnique({ where: { guestToken: token } });
  return w ?? (create ? prisma.wishlist.create({ data: { guestToken: token } }) : null);
}

async function view(wishlistId: string | null) {
  if (!wishlistId) return { items: [], productIds: [] };
  const items = await prisma.wishlistItem.findMany({
    where: { wishlistId, product: { status: 'PUBLISHED' } },
    include: { product: { include: productInclude } },
    orderBy: { createdAt: 'desc' },
  });
  return {
    items: items.map((i) => ({ id: i.id, addedAt: i.createdAt, product: productCard(i.product) })),
    productIds: items.map((i) => i.productId),
  };
}

wishlistRouter.get(
  '/',
  ah(async (req, res) => {
    const w = await findWishlist(req, res, false);
    ok(res, await view(w?.id ?? null));
  }),
);

wishlistRouter.post(
  '/items',
  ah(async (req, res) => {
    const { productId } = parse(z.object({ productId: z.string().min(1).max(40) }), req.body);
    const product = await prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED' } });
    if (!product) throw ApiError.notFound('This artifact is not available.');
    const w = (await findWishlist(req, res, true))!;
    // Unique (wishlistId, productId) prevents duplicates; skipDuplicates makes this idempotent.
    await prisma.wishlistItem.createMany({ data: [{ wishlistId: w.id, productId }], skipDuplicates: true });
    ok(res, await view(w.id), 201);
  }),
);

wishlistRouter.delete(
  '/items/:productId',
  ah(async (req, res) => {
    const w = await findWishlist(req, res, false);
    if (w) await prisma.wishlistItem.deleteMany({ where: { wishlistId: w.id, productId: req.params.productId } });
    ok(res, await view(w?.id ?? null));
  }),
);

wishlistRouter.post(
  '/items/:productId/move-to-cart',
  ah(async (req, res) => {
    const w = await findWishlist(req, res, false);
    if (!w) throw ApiError.notFound('Your wishlist is empty.');
    const cart = (await findCart(req, res, true))!;
    await addToCart(cart.id, req.params.productId, 1, 'add');
    await prisma.wishlistItem.deleteMany({ where: { wishlistId: w.id, productId: req.params.productId } });
    ok(res, { wishlist: await view(w.id), cart: await cartView(cart.id) });
  }),
);
