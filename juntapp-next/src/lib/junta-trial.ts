import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { isJuntaTrialExpired, type JuntaAccessState } from '@/lib/junta-billing';

export async function expireJuntaTrialIfNeeded<T extends JuntaAccessState & { id: string }>(junta: T): Promise<T> {
  if (!isJuntaTrialExpired(junta)) return junta;

  const expiredAt = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from('juntas')
    .update({
      subscription_status: 'past_due',
      trial_expired_at: expiredAt,
      subscription_next_payment_date: null,
      subscription_last_synced_at: expiredAt,
    })
    .eq('id', junta.id)
    .eq('subscription_status', 'authorized')
    .eq('billing_mode', 'trial_then_subscription')
    .lte('trial_ends_at', expiredAt);

  if (error) throw new Error(`No fue posible cerrar el período gratuito: ${error.message}`);
  return { ...junta, subscription_status: 'past_due', trial_expired_at: expiredAt } as T;
}
