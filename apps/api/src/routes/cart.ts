import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ah, ApiError, ok, parse } from '../lib/http.js';
import { addToCart, cartView, findCart, MAX_QTY_PER_LINE } from '../services/cart.js';
import { couponError } from '../services/pricing.js';

export const cartRouter = Router();

const methodQuery = z.object({ delivery: z.enum(['standard', 'express']).default('standard') });

cartRouter.get(
  '/',
  ah(async (req, res) => {
    const { delivery } = parse(methodQuery, req.query);
    const cart = await findCart(req, res, false);
    ok(res, await cartView(cart?.id ?? null, delivery));
  }),
);

cartRouter.post(
  '/items',
  ah(async (req, res) => {
    const body = parse(
      z.object({
        productId: z.string().min(1).max(40),
        quantity: z.number().int().min(1, 'Quantity must be at least 1').max(MAX_QTY_PER_LINE),
      }),
      req.body,
    );
    const cart = (await findCart(req, res, true))!;
    await addToCart(cart.id, body.productId, body.quantity, 'add');
    ok(res, await cartView(cart.id), 201);
  }),
);

cartRouter.patch(
  '/items/:itemId',
  ah(async (req, res) => {
    const body = parse(z.object({ quantity: z.number().int().min(0).max(MAX_QTY_PER_LINE) }), req.body);
    const cart = await findCart(req, res, false);
    const item = cart && (await prisma.cartItem.findFirst({ where: { id: req.params.itemId, cartId: cart.id } }));
    if (!cart || !item) throw ApiError.notFound('That item is not in your bag.');
    await addToCart(cart.id, item.productId, body.quantity, 'set');
    ok(res, await cartView(cart.id));
  }),
);

cartRouter.delete(
  '/items/:itemId',
  ah(async (req, res) => {
    const cart = await findCart(req, res, false);
    if (!cart) throw ApiError.notFound('Your bag is empty.');
    await prisma.cartItem.deleteMany({ where: { id: req.params.itemId, cartId: cart.id } });
    ok(res, await cartView(cart.id));
  }),
);

cartRouter.delete(
  '/',
  ah(async (req, res) => {
    const cart = await findCart(req, res, false);
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    }
    ok(res, await cartView(cart?.id ?? null));
  }),
);

cartRouter.post(
  '/coupon',
  ah(async (req, res) => {
    const { code } = parse(
      z.object({ code: z.string().trim().min(1, 'Enter a discount code').max(40).transform((s) => s.toUpperCase()) }),
      req.body,
    );
    const cart = await findCart(req, res, false);
    if (!cart) throw ApiError.badRequest('Add an item to your bag before applying a code.');
    const view = await cartView(cart.id);
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    const err = couponError(coupon, view.totals.subtotalPaise);
    if (err) throw new ApiError(422, 'VALIDATION_ERROR', err, { code: err });
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
    ok(res, await cartView(cart.id));
  }),
);

cartRouter.delete(
  '/coupon',
  ah(async (req, res) => {
    const cart = await findCart(req, res, false);
    if (cart) await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    ok(res, await cartView(cart?.id ?? null));
  }),
);
