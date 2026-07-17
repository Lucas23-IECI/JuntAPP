import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import SociosClient from '@/components/dashboard/socios/SociosClient';

export const metadata: Metadata = {
  title: 'Padrón de Socios — JuntAPP',
};

export default async function SociosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, juntas(*)')
    .eq('id', user!.id)
    .single();

  const { data: socios } = await supabase
    .from('profiles')
    .select('*')
    .eq('junta_id', profile?.junta_id)
    .order('name', { ascending: true });

  return (
    <SociosClient
      socios={socios || []}
      currentProfile={profile!}
      junta={(Array.isArray(profile?.juntas) ? profile.juntas[0] : profile?.juntas)!}
    />
  );
}
