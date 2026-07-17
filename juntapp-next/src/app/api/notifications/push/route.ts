import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

const notificationSchema = z.object({
  type: z.enum(['asamblea', 'votacion', 'cuota', 'seguridad']),
  title: z.string().trim().min(3).max(160),
  message: z.string().trim().min(3).max(500),
  action: z.string().trim().max(250).nullable().optional(),
  onlyPending: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const limit = rateLimit(`notifications:${user.id}`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } },
    );
  }

  const parsed = notificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: z.flattenError(parsed.error) }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, junta_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'dirigente') {
    return NextResponse.json({ error: 'Se requiere rol de dirigente' }, { status: 403 });
  }

  const { data: recipients, error: recipientsError } = await supabase
    .from('profiles')
    .select('id, cuota_status')
    .eq('junta_id', profile.junta_id);

  if (recipientsError) {
    return NextResponse.json({ error: recipientsError.message }, { status: 500 });
  }

  const rows = (recipients ?? []).filter((recipient) => !parsed.data.onlyPending || recipient.cuota_status === 'pendiente').map((recipient) => ({
    user_id: recipient.id,
    type: parsed.data.type,
    title: parsed.data.title,
    message: parsed.data.message,
    action: parsed.data.action ?? null,
  }));

  if (rows.length) {
    const { error: insertError } = await supabase.from('notifications').insert(rows);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ delivered: rows.length });
}
