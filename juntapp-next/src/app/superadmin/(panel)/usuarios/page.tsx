import { createAdminClient } from '@/lib/supabase/admin';
import UsuariosClient from './usuarios-client';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const admin = createAdminClient();
  const [{ data: profiles, error }, { data: juntas }] = await Promise.all([
    admin.from('profiles').select('id, name, email, phone, role, board_position, cuota_status, junta_id, created_at').order('created_at', { ascending: false }),
    admin.from('juntas').select('id, name'),
  ]);
  if (error) throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);

  const authUsers = new Map<string, { suspended: boolean; lastSignIn: string | null }>();
  let page = 1;
  while (page <= 10) {
    const { data, error: authError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (authError) break;
    for (const user of data.users) {
      const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
      authUsers.set(user.id, {
        suspended: Boolean(bannedUntil && bannedUntil > new Date()),
        lastSignIn: user.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  const juntaNames = new Map((juntas ?? []).map((junta) => [junta.id, junta.name]));

  return (
    <UsuariosClient
      users={(profiles ?? []).map((profile) => ({
        ...profile,
        juntaName: juntaNames.get(profile.junta_id) ?? 'Junta no disponible',
        suspended: authUsers.get(profile.id)?.suspended ?? false,
        lastSignIn: authUsers.get(profile.id)?.lastSignIn ?? null,
      }))}
    />
  );
}
