import 'server-only';

import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const SUPERADMIN_PATH = '/superadmin';

function configuredEmails() {
  return (process.env.SUPERADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
export function isSuperadminUser(user: User | null): user is User {
  if (!user) return false;

  const metadata = user.app_metadata ?? {};
  const hasMetadataRole =
    metadata.role === 'superadmin' ||
    metadata.platform_role === 'superadmin' ||
    metadata.is_superadmin === true;
  const email = user.email?.toLowerCase();
  const isAllowlisted = Boolean(email && configuredEmails().includes(email));
  const isLocalDemo =
    process.env.NODE_ENV !== 'production' && email === 'admin@juntapp.cl';

  return hasMetadataRole || isAllowlisted || isLocalDemo;
}

export async function getSuperadminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return isSuperadminUser(user) ? user : null;
}

export async function requireSuperadmin() {
  const user = await getSuperadminUser();
  if (!user) redirect(`${SUPERADMIN_PATH}/login`);
  return user;
}

export function displayAdminName(user: User) {
  const name = user.user_metadata?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : 'Superadmin';
}
