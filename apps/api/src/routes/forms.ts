import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { ah, ok, parse } from '../lib/http.js';
import { email, personName } from '../lib/validators.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { sendMail } from '../lib/mail.js';
import { getStoreSettings } from '../services/settings.js';

export const formsRouter = Router();

formsRouter.post(
  '/newsletter',
  formLimiter,
  ah(async (req, res) => {
    const body = parse(z.object({ email, source: z.string().max(40).optional() }), req.body);
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email: body.email } });
    if (existing?.isActive) {
      return ok(res, { status: 'already_subscribed', message: 'You are already on our list — thank you.' });
    }
    if (existing) {
      await prisma.newsletterSubscriber.update({ where: { id: existing.id }, data: { isActive: true } });
    } else {
      await prisma.newsletterSubscriber.create({ data: { email: body.email, source: body.source ?? 'website' } });
    }
    ok(res, { status: 'subscribed', message: 'Welcome. Our next letter of rare finds is on its way to you.' }, 201);
  }),
);

formsRouter.post(
  '/contact',
  formLimiter,
  ah(async (req, res) => {
    const body = parse(
      z.object({
        name: personName,
        email,
        subject: z.string().trim().min(3, 'Enter a subject').max(120, 'Subject is too long'),
        message: z.string().trim().min(20, 'Please write at least 20 characters').max(4000, 'Message is too long'),
        // Honeypot field: real users never fill it.
        website: z.string().max(0, 'Spam detected').optional(),
      }),
      req.body,
    );
    const { website: _hp, ...data } = body;
    const submission = await prisma.contactSubmission.create({ data });
    const store = await getStoreSettings();
    await sendMail(store.supportEmail, `[Contact] ${data.subject}`, `${data.name} <${data.email}>\n\n${data.message}`);
    ok(res, { id: submission.id, message: 'Thank you — our team will reply within two business days.' }, 201);
  }),
);
