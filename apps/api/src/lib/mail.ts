import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Email delivery. No SMTP library is bundled; when SMTP_URL is not configured the
 * message is logged (development) so flows remain testable without a provider.
 * To send real email, wire a provider (e.g. nodemailer, Resend) here.
 */
export async function sendMail(to: string, subject: string, text: string) {
  if (!config().SMTP_URL) {
    if (config().NODE_ENV !== 'production') logger.info({ to, subject }, `[mail:dev] ${text.slice(0, 500)}`);
    return { delivered: false as const };
  }
  logger.warn({ to, subject }, 'SMTP_URL is set but no mail transport is wired; message not sent');
  return { delivered: false as const };
}
