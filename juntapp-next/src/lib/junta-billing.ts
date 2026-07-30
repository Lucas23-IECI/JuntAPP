export type JuntaBillingMode = 'subscription' | 'trial_then_subscription' | 'complimentary';

export type JuntaAccessState = {
  subscription_status: string;
  billing_mode?: string | null;
  trial_ends_at?: string | null;
};

export const BILLING_MODE_LABELS: Record<JuntaBillingMode, string> = {
  subscription: 'Suscripción',
  trial_then_subscription: 'Período gratis',
  complimentary: 'Cortesía',
};

export function isJuntaTrialExpired(junta: JuntaAccessState, now = new Date()) {
  return (
    junta.subscription_status === 'authorized' &&
    junta.billing_mode === 'trial_then_subscription' &&
    Boolean(junta.trial_ends_at) &&
    new Date(junta.trial_ends_at!).getTime() <= now.getTime()
  );
}

export function juntaHasActiveAccess(junta: JuntaAccessState, now = new Date()) {
  return junta.subscription_status === 'authorized' && !isJuntaTrialExpired(junta, now);
}

export function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result;
}

export function billingSummary(junta: JuntaAccessState) {
  if (junta.billing_mode === 'complimentary') return 'Cortesía sin vencimiento';
  if (junta.billing_mode === 'trial_then_subscription' && junta.trial_ends_at) {
    return `Gratis hasta ${new Intl.DateTimeFormat('es-CL').format(new Date(junta.trial_ends_at))}`;
  }
  return 'Suscripción mensual';
}
