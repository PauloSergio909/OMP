import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

function createTransport() {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null;

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const transporter = createTransport();
  if (!transporter) {
    logger.warn('SMTP não configurado — e-mail não enviado', { subject: opts.subject });
    return;
  }

  try {
    await transporter.sendMail({ from: env.SMTP_FROM, ...opts });
    logger.info('E-mail enviado', { to: opts.to, subject: opts.subject });
  } catch (err) {
    logger.error('Falha ao enviar e-mail', { err, to: opts.to });
  }
}
