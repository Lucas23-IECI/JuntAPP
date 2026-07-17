import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const targetId = (await params).id;
  if (!z.uuid().safeParse(targetId).success) return NextResponse.json({ error: 'Identificador inválido.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  if (!rateLimit(`delete-member:${user.id}`, 5, 60_000).allowed) {
    return NextResponse.json({ error: 'Espera un momento antes de eliminar otro vecino.' }, { status: 429 });
  }
  if (targetId === user.id) return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta desde el padrón.' }, { status: 400 });

  const { data: currentProfile } = await supabase.from('profiles').select('junta_id, role').eq('id', user.id).single();
  if (!currentProfile || currentProfile.role !== 'dirigente') {
    return NextResponse.json({ error: 'Solo la directiva puede eliminar vecinos.' }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data: target } = await admin.from('profiles').select('id, junta_id, role, name').eq('id', targetId).maybeSingle();
  if (!target || target.junta_id !== currentProfile.junta_id) return NextResponse.json({ error: 'Vecino no encontrado en tu junta.' }, { status: 404 });
  if (target.role !== 'vecino') return NextResponse.json({ error: 'Los cargos de directiva deben administrarse antes de eliminar esa cuenta.' }, { status: 409 });

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ deleted: true, name: target.name });
}
