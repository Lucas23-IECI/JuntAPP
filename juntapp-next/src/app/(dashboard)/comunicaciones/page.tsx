import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ComunicacionesClient from '@/components/dashboard/comunicaciones/ComunicacionesClient';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Comunicaciones — JuntAPP',
};

export default async function ComunicacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .eq('junta_id', profile.junta_id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  return <ComunicacionesClient announcements={announcements ?? []} currentProfile={profile} />;
}
