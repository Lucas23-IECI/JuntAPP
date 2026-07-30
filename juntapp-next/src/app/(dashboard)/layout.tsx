import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OriginalDashboardShell from '@/components/original/OriginalDashboardShell';
import DashboardBodyState from '@/components/original/DashboardBodyState';
import { juntaHasActiveAccess } from '@/lib/junta-billing';
import { expireJuntaTrialIfNeeded } from '@/lib/junta-trial';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, juntas(*)').eq('id', user.id).single();
  if (!profile) redirect('/login');
  const rawJunta = Array.isArray(profile.juntas) ? profile.juntas[0] : profile.juntas;
  if (!rawJunta) redirect('/registro/pago');
  const junta = await expireJuntaTrialIfNeeded(rawJunta);
  if (!juntaHasActiveAccess(junta)) redirect('/registro/pago');
  const trialEndsAt = junta.billing_mode === 'trial_then_subscription' ? junta.trial_ends_at : null;

  return (
    <>
      <DashboardBodyState role={profile.role} />
      <OriginalDashboardShell profile={profile} junta={junta} trialEndsAt={trialEndsAt}>{children}</OriginalDashboardShell>
    </>
  );
}
