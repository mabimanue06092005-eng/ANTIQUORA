import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { ApiError } from '../lib/http.js';

export const SESSION_COOKIE = 'aq_session';
export const CSRF_COOKIE = 'aq_csrf';
export const GUEST_COOKIE = 'aq_guest';
export const CSRF_HEADER = 'x-csrf-token';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
      guestToken?: string;
    }
  }
}

const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const hashToken = (token: string) =>
  crypto.createHmac('sha256', config().SESSION_SECRET).update(token).digest('hex');

const cookieBase = () => ({
  httpOnly: true,
  secure: config().NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
});

/** Creates a DB-backed session and sets the HTTP-only session cookie. */
export async function createSession(req: Request, res: Response, userId: string) {
  const token = randomToken();
  const ttlMs = config().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      csrfToken: randomToken(16),
      expiresAt: new Date(Date.now() + ttlMs),
      userAgent: req.get('user-agent')?.slice(0, 255),
      ip: req.ip,
    },
  });
  res.cookie(SESSION_COOKIE, token, { ...cookieBase(), maxAge: ttlMs });
}

export async function destroySession(req: Request, res: Response) {
  if (req.sessionId) await prisma.session.deleteMany({ where: { id: req.sessionId } });
  res.clearCookie(SESSION_COOKIE, cookieBase());
}

/** Resolves the current user (if any) from the session cookie. Disabled accounts are signed out. */
export async function loadSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token: string | undefined = req.cookies?.[SESSION_COOKIE];
    if (token) {
      const id = hashToken(token);
      const session = await prisma.session.findUnique({
        where: { id },
        include: { user: { select: { id: true, email: true, name: true, role: true, isDisabled: true } } },
      });
      if (session && session.expiresAt > new Date() && !session.user.isDisabled) {
        req.sessionId = id;
        const { isDisabled: _d, ...user } = session.user;
        req.user = user;
      } else {
        if (session) await prisma.session.delete({ where: { id } }).catch(() => undefined);
        res.clearCookie(SESSION_COOKIE, cookieBase());
      }
    }
    req.guestToken = req.cookies?.[GUEST_COOKIE];
    next();
  } catch (e) {
    next(e);
  }
}

/** Returns the guest token, issuing one (cookie) if the visitor has none yet. */
export function ensureGuestToken(req: Request, res: Response) {
  if (!req.guestToken) {
    req.guestToken = randomToken(24);
    res.cookie(GUEST_COOKIE, req.guestToken, { ...cookieBase(), maxAge: 60 * 24 * 60 * 60 * 1000 });
  }
  return req.guestToken;
}

export function clearGuestToken(res: Response) {
  res.clearCookie(GUEST_COOKIE, cookieBase());
}

/**
 * Double-submit CSRF protection. A random token is stored in a readable cookie;
 * state-changing requests must echo it in the X-CSRF-Token header. A cross-site
 * attacker cannot read the cookie, so cannot forge the header.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined = req.cookies?.[CSRF_COOKIE];
  if (!token) {
    token = randomToken(18);
    res.cookie(CSRF_COOKIE, token, { ...cookieBase(), httpOnly: false, maxAge: 365 * 24 * 60 * 60 * 1000 });
    req.cookies[CSRF_COOKIE] = token;
  }
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const header = req.get(CSRF_HEADER);
  const valid =
    !!header && header.length === token.length && crypto.timingSafeEqual(Buffer.from(header), Buffer.from(token));
  if (!valid) return next(new ApiError(403, 'CSRF_FAILED', 'Your session token is missing or expired. Please refresh the page and try again.'));
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'ADMIN') return next(ApiError.forbidden('Administrator access is required.'));
  next();
}
