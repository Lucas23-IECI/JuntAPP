import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import OriginalAuthFrame from '@/components/auth/OriginalAuthFrame';
import PaymentActivation from '@/components/auth/PaymentActivation';
import { juntaHasActiveAccess } from '@/lib/junta-billing';
import { expireJuntaTrialIfNeeded } from '@/lib/junta-trial';

export const metadata: Metadata = { title: 'Suscripción mensual — JuntAPP' };

export default async function RegistrationPaymentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('email, juntas(*)').eq('id', user.id).single();
  const rawJunta = Array.isArray(profile?.juntas) ? profile.juntas[0] : profile?.juntas;
  if (!rawJunta) redirect('/registro');
  const junta = await expireJuntaTrialIfNeeded(rawJunta);
  if (juntaHasActiveAccess(junta)) redirect('/inicio');

  return <OriginalAuthFrame active="register"><PaymentActivation juntaName={junta.name} email={profile?.email ?? user.email ?? ''} plan={junta.subscription_plan ?? 'juntapp'} whatsapp={Boolean(junta.whatsapp_addon)} /></OriginalAuthFrame>;
}
