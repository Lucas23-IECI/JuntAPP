import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OriginalDashboardShell from '@/components/original/OriginalDashboardShell';
import DashboardBodyState from '@/components/original/DashboardBodyState';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*, juntas(*)').eq('id', user.id).single();
  if (!profile) redirect('/login');
  const junta = Array.isArray(profile.juntas) ? profile.juntas[0] : profile.juntas;
  if (junta?.subscription_status !== 'authorized') redirect('/registro/pago');

  return (
    <>
      <DashboardBodyState role={profile.role} />
      <OriginalDashboardShell profile={profile} junta={junta}>{children}</OriginalDashboardShell>
    </>
  );
}
