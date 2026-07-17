import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import TesoreriaClient from '@/components/dashboard/tesoreria/TesoreriaClient';

export const metadata: Metadata = {
  title: 'Tesorería — JuntAPP',
};

export default async function TesoreriaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('junta_id', profile?.junta_id)
    .order('date', { ascending: false });

  const { data: memberStatuses } = await supabase
    .from('profiles')
    .select('cuota_status')
    .eq('junta_id', profile?.junta_id);

  const { data: files } = await supabase.storage
    .from('transparency_reports')
    .list(profile?.junta_id, { sortBy: { column: 'created_at', order: 'desc' } });

  const documents = await Promise.all((files ?? []).map(async (file) => {
    const path = `${profile!.junta_id}/${file.name}`;
    const { data } = await supabase.storage.from('transparency_reports').createSignedUrl(path, 3600);
    return {
      name: file.name.replace(/^[0-9a-f-]{36}-/, ''),
      path,
      size: Number(file.metadata?.size ?? 0),
      created_at: file.created_at ?? null,
      signedUrl: data?.signedUrl ?? null,
    };
  }));

  return (
    <TesoreriaClient
      transactions={transactions || []}
      documents={documents}
      currentProfile={profile!}
      totalMembers={memberStatuses?.length ?? 0}
      paidMembers={memberStatuses?.filter((member) => member.cuota_status === 'al_dia').length ?? 0}
    />
  );
}
