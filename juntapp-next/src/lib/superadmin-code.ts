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
  if (!account) return null;

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
    return result.delivered ? challengeToken : null;
  } catch (error) {
    console.error('[Superadmin] No fue posible enviar el código de acceso.', error);
    return null;
  }
}
