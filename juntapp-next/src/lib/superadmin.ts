import 'server-only';

import { redirect } from 'next/navigation';
import { getSuperadminSession, type SuperadminSession } from '@/lib/superadmin-session';

export const SUPERADMIN_PATH = '/superadmin';

export async function getSuperadminUser() {
  return getSuperadminSession();
}

export async function requireSuperadmin() {
  const user = await getSuperadminUser();
  if (!user) redirect(`${SUPERADMIN_PATH}/login`);
  return user;
}

export function displayAdminName(user: SuperadminSession) {
  return user.name;
}
