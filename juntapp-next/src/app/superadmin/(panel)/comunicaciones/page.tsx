import { createAdminClient } from '@/lib/supabase/admin';
import ComunicacionesClient from './comunicaciones-client';

export const dynamic = 'force-dynamic';

export default async function ComunicacionesPage() {
  const admin = createAdminClient();
  const [{ data: juntas }, { data: profiles }, { data: notifications }] = await Promise.all([
    admin.from('juntas').select('id, name, subscription_plan, subscription_status').order('name'),
    admin.from('profiles').select('junta_id, role'),
    admin.from('notifications').select('title, message, action, date').eq('type', 'seguridad').order('date', { ascending: false }).limit(500),
  ]);

  const audience = new Map<string, { total: number; dirigentes: number; vecinos: number }>();
  for (const profile of profiles ?? []) {
    const current = audience.get(profile.junta_id) ?? { total: 0, dirigentes: 0, vecinos: 0 };
    current.total += 1;
    if (profile.role === 'dirigente') current.dirigentes += 1;
    else current.vecinos += 1;
    audience.set(profile.junta_id, current);
  }

  const grouped = new Map<string, { title: string; message: string; action: string | null; date: string; recipients: number }>();
  for (const notification of notifications ?? []) {
    const key = `${notification.title}|${notification.message}|${notification.date.slice(0, 16)}`;
    const current = grouped.get(key);
    if (current) current.recipients += 1;
    else grouped.set(key, { ...notification, recipients: 1 });
  }

  return (
    <ComunicacionesClient
      juntas={(juntas ?? []).map((junta) => ({ ...junta, ...audience.get(junta.id) ?? { total: 0, dirigentes: 0, vecinos: 0 } }))}
      recent={[...grouped.values()].slice(0, 8)}
    />
  );
}
