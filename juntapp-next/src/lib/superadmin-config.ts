export const SUPERADMIN_ACCOUNTS = [
  { email: 'diego.guzman@purocode.com', name: 'Diego Guzmán' },
  { email: 'lucas.mendez@purocode.com', name: 'Lucas Méndez' },
] as const;

export function normalizeSuperadminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? '';
}

export function getSuperadminAccount(email: string | null | undefined) {
  const normalizedEmail = normalizeSuperadminEmail(email);
  return SUPERADMIN_ACCOUNTS.find((account) => account.email === normalizedEmail) ?? null;
}

export function isSuperadminEmail(email: string | null | undefined) {
  return Boolean(getSuperadminAccount(email));
}
