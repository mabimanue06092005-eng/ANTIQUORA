import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ah, ApiError, ok, parse } from '../lib/http.js';
import { addressInput, indianPhone, personName } from '../lib/validators.js';
import { requireAuth } from '../middleware/session.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);

accountRouter.patch(
  '/profile',
  ah(async (req, res) => {
    const body = parse(z.object({ name: personName, phone: indianPhone.optional().nullable().or(z.literal('')) }), req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name: body.name, phone: body.phone || null },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    });
    ok(res, user);
  }),
);

accountRouter.get(
  '/addresses',
  ah(async (req, res) => {
    ok(res, await prisma.address.findMany({ where: { userId: req.user!.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] }));
  }),
);

accountRouter.post(
  '/addresses',
  ah(async (req, res) => {
    const body = parse(addressInput, req.body);
    const count = await prisma.address.count({ where: { userId: req.user!.id } });
    if (count >= 10) throw ApiError.badRequest('You can save up to 10 addresses.');
    const isDefault = body.isDefault || count === 0;
    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
      return tx.address.create({ data: { ...body, isDefault, userId: req.user!.id } });
    });
    ok(res, address, 201);
  }),
);

accountRouter.put(
  '/addresses/:id',
  ah(async (req, res) => {
    const body = parse(addressInput, req.body);
    const existing = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) throw ApiError.notFound('Address not found.');
    const address = await prisma.$transaction(async (tx) => {
      if (body.isDefault) await tx.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
      return tx.address.update({ where: { id: existing.id }, data: { ...body, isDefault: body.isDefault ?? existing.isDefault } });
    });
    ok(res, address);
  }),
);

accountRouter.delete(
  '/addresses/:id',
  ah(async (req, res) => {
    const result = await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
    if (!result.count) throw ApiError.notFound('Address not found.');
    ok(res, { deleted: true });
  }),
);
