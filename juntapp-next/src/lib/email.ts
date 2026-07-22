import 'server-only';
import { createHash } from 'node:crypto';

type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  idempotencyKey?: string;
};

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.REGISTRATION_EMAIL_FROM);
}

export function publicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

function recipientKey(email: string) {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
}

export async function sendTransactionalEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REGISTRATION_EMAIL_FROM;
  if (!apiKey || !from) return { delivered: false as const, reason: 'not_configured' as const, ids: [] as string[] };

  const recipients = [...new Set((Array.isArray(message.to) ? message.to : [message.to])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean))];
  const ids: string[] = [];

  for (const recipient of recipients) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
        ...(message.idempotencyKey
          ? { 'Idempotency-Key': `${message.idempotencyKey}:${recipientKey(recipient)}`.slice(0, 256) }
          : {}),
      },
      body: JSON.stringify({ from, to: [recipient], subject: message.subject, html: message.html }),
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok || !result.id) {
      throw new Error(result.message ?? `Resend rechazó el correo (HTTP ${response.status}).`);
    }
    ids.push(result.id);
  }

  return { delivered: true as const, ids };
}

export async function sendEmailBestEffort(message: EmailMessage) {
  try {
    return await sendTransactionalEmail(message);
  } catch (error) {
    console.error('No fue posible enviar el correo transaccional.', error);
    return { delivered: false as const, reason: 'provider_error' as const, ids: [] as string[] };
  }
}
