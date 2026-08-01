import 'server-only';
import { createHash } from 'node:crypto';

type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  idempotencyKey?: string;
};

type AuthLinkProperties = {
  hashed_token?: string;
  verification_type?: string;
};

const DEFAULT_EMAIL_FROM = 'JuntAPP <solicitudes@juntapp.cl>';
const PRODUCTION_APP_URL = 'https://juntapp.cl';

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function publicAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  const pointsToLocalhost = configuredUrl
    ? /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(configuredUrl)
    : false;

  // Vercel must never emit auth links for a developer machine, even if a stale
  // NEXT_PUBLIC_APP_URL was copied into the project's production environment.
  if (process.env.VERCEL === '1') return PRODUCTION_APP_URL;

  if (configuredUrl && !pointsToLocalhost) {
    return configuredUrl;
  }

  return process.env.NODE_ENV === 'production' ? PRODUCTION_APP_URL : 'http://localhost:3000';
}

export function authActionUrl(properties: AuthLinkProperties) {
  if (!properties.hashed_token || !properties.verification_type) {
    throw new Error('Supabase no devolvió un token de acceso válido.');
  }

  const query = new URLSearchParams({
    token_hash: properties.hashed_token,
    type: properties.verification_type,
  });
  return `${publicAppUrl()}/confirmar-acceso?${query.toString()}`;
}

function recipientKey(email: string) {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
}

export async function sendTransactionalEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REGISTRATION_EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
  if (!apiKey) return { delivered: false as const, reason: 'not_configured' as const, ids: [] as string[] };

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
