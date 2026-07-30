import 'server-only';

import { getSuperadminAccount } from '@/lib/superadmin-config';
import { sendTransactionalEmail } from '@/lib/email';
import { superadminLoginCodeTemplate } from '@/lib/email-templates';
import {
  createSixDigitSuperadminCode,
  createSuperadminChallenge,
  SUPERADMIN_CODE_TTL_SECONDS,
} from '@/lib/superadmin-session';

export async function requestSuperadminLoginCode(email: string) {
  const account = getSuperadminAccount(email);
  if (!account) return { status: 'not_authorized' as const };

  const code = createSixDigitSuperadminCode();
  const challengeToken = createSuperadminChallenge(account.email, code);
  const template = superadminLoginCodeTemplate({
    name: account.name,
    code,
    expiresInMinutes: SUPERADMIN_CODE_TTL_SECONDS / 60,
  });

  try {
    const result = await sendTransactionalEmail({
      to: account.email,
      ...template,
      idempotencyKey: `superadmin-login:${account.email}:${Date.now()}`,
    });
    if (!result.delivered) {
      console.error('[Superadmin] El servicio de correo no está configurado.');
      return { status: 'not_configured' as const };
    }

    console.info('[Superadmin] Código de acceso enviado.', { emailProviderIds: result.ids });
    return { status: 'sent' as const, challengeToken };
  } catch (error) {
    console.error('[Superadmin] No fue posible enviar el código de acceso.', error);
    return { status: 'provider_error' as const };
  }
}
