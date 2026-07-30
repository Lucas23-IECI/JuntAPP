import { createAdminClient } from '@/lib/supabase/admin';
import JuntasClient from './juntas-client';

export const dynamic = 'force-dynamic';

export default async function JuntasPage() {
  const admin = createAdminClient();
  const [{ data: juntas, error }, { data: profiles }] = await Promise.all([
    admin
      .from('juntas')
      .select('id, name, slug, comuna, region, invite_code, subscription_status, subscription_plan, subscription_price, whatsapp_addon, created_at')
      .order('created_at', { ascending: false }),
    admin.from('profiles').select('junta_id, role'),
  ]);

  if (error) throw new Error(`No se pudieron cargar las juntas: ${error.message}`);
  const counts = new Map<string, { members: number; leaders: number }>();
  for (const profile of profiles ?? []) {
    const current = counts.get(profile.junta_id) ?? { members: 0, leaders: 0 };
    current.members += 1;
    if (profile.role === 'dirigente') current.leaders += 1;
    counts.set(profile.junta_id, current);
  }

  return (
    <JuntasClient
      juntas={(juntas ?? []).map((junta) => ({
        ...junta,
        members: counts.get(junta.id)?.members ?? 0,
        leaders: counts.get(junta.id)?.leaders ?? 0,
      }))}
    />
  );
}
