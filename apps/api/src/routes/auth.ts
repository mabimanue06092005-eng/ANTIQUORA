import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ah, ApiError, ok, parse } from '../lib/http.js';
import { email, password, personName } from '../lib/validators.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { clearGuestToken, createSession, destroySession, requireAuth } from '../middleware/session.js';
import { mergeGuestCart, mergeGuestWishlist } from '../services/cart.js';

export const authRouter = Router();

export const BCRYPT_ROUNDS = 12;
// Used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', 10);

const publicUser = (u: { id: string; email: string; name: string; phone: string | null; role: string; createdAt: Date }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone,
  role: u.role,
  createdAt: u.createdAt,
});

authRouter.get(
  '/me',
  ah(async (req, res) => {
    if (!req.user) return ok(res, null);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    ok(res, user ? publicUser(user) : null);
  }),
);

authRouter.post(
  '/register',
  authLimiter,
  ah(async (req, res) => {
    const body = parse(
      z
        .object({ name: personName, email, password, confirmPassword: z.string() })
        .refine((b) => b.password === b.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' }),
      req.body,
    );
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw new ApiError(409, 'VALIDATION_ERROR', 'An account with this email already exists.', { email: 'An account with this email already exists. Try signing in.' });
    // Role is never accepted from the client (mass-assignment protection): all sign-ups are customers.
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, passwordHash: await bcrypt.hash(body.password, BCRYPT_ROUNDS) },
    });
    await createSession(req, res, user.id);
    await mergeGuestCart(user.id, req.guestToken);
    await mergeGuestWishlist(user.id, req.guestToken);
    clearGuestToken(res);
    ok(res, publicUser(user), 201);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  ah(async (req, res) => {
    const body = parse(z.object({ email, password: z.string().min(1, 'Enter your password').max(128) }), req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const valid = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    if (user.isDisabled) throw new ApiError(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Please contact support.');
    if (req.sessionId) await destroySession(req, res);
    await createSession(req, res, user.id);
    await mergeGuestCart(user.id, req.guestToken);
    await mergeGuestWishlist(user.id, req.guestToken);
    clearGuestToken(res);
    ok(res, publicUser(user));
  }),
);

authRouter.post(
  '/logout',
  ah(async (req, res) => {
    await destroySession(req, res);
    ok(res, { signedOut: true });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  authLimiter,
  ah(async (req, res) => {
    const body = parse(
      z
        .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: password, confirmPassword: z.string() })
        .refine((b) => b.newPassword === b.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' }),
      req.body,
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    if (!(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      throw new ApiError(422, 'VALIDATION_ERROR', 'Your current password is incorrect.', { currentPassword: 'Incorrect password' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS) } });
    // Sign out every other session.
    await prisma.session.deleteMany({ where: { userId: user.id, id: { not: req.sessionId } } });
    ok(res, { changed: true });
  }),
);
