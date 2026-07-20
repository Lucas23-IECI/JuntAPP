import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional(),
}).refine((value) => value.decision === 'approve' || Boolean(value.reason), { message: 'Indica el motivo del rechazo.' });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const applicationId = (await params).id;
  if (!z.uuid().safeParse(applicationId).success) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  if (!rateLimit(`membership-decision:${user.id}`, 20, 60_000).allowed) return NextResponse.json({ error: 'Espera antes de resolver otra solicitud.' }, { status: 429 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'La decisión o su motivo no son válidos.' }, { status: 400 });
  const { data: secretary } = await supabase.from('profiles').select('id, junta_id, role, board_position').eq('id', user.id).single();
  if (!secretary || secretary.role !== 'dirigente' || secretary.board_position !== 'secretario') {
    return NextResponse.json({ error: 'Solo Secretaría puede aceptar o rechazar solicitudes de ingreso.' }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data: application } = await admin.from('membership_applications').select('*, juntas(invite_code, name)').eq('id', applicationId).eq('junta_id', secretary.junta_id).maybeSingle();
  if (!application) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
  if (application.status !== 'pending') return NextResponse.json({ error: 'La solicitud ya fue resuelta.' }, { status: 409 });

  const reviewedAt = new Date().toISOString();
  if (parsed.data.decision === 'reject') {
    const { error } = await admin.from('membership_applications').update({ status: 'rejected', reviewed_by: user.id, reviewed_at: reviewedAt, rejection_reason: parsed.data.reason, updated_at: reviewedAt }).eq('id', application.id).eq('status', 'pending');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: 'rejected' });
  }

  const junta = Array.isArray(application.juntas) ? application.juntas[0] : application.juntas;
  if (!junta?.invite_code) return NextResponse.json({ error: 'La junta no tiene un código de ingreso válido.' }, { status: 409 });
  const { data: claimedApplication, error: approvalError } = await admin.from('membership_applications').update({ status: 'approved', reviewed_by: user.id, reviewed_at: reviewedAt, rejection_reason: null, updated_at: reviewedAt }).eq('id', application.id).eq('status', 'pending').select('id').maybeSingle();
  if (approvalError) return NextResponse.json({ error: approvalError.message }, { status: 400 });
  if (!claimedApplication) return NextResponse.json({ error: 'La solicitud ya está siendo procesada.' }, { status: 409 });

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(application.email, {
    data: {
      name: application.name, rut: application.rut, address: application.address, phone: application.phone,
      junta_action: 'join', invite_code: junta.invite_code, approved_application_id: application.id,
    },
    redirectTo: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/aceptar-invitacion` : undefined,
  });
  if (inviteError || !invited.user) {
    await admin.from('membership_applications').update({ status: 'pending', reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() }).eq('id', application.id).eq('status', 'approved').eq('reviewed_by', user.id);
    return NextResponse.json({ error: inviteError?.message ?? 'No fue posible enviar la invitación de acceso.' }, { status: 400 });
  }
  await admin.from('notifications').insert({ user_id: invited.user.id, type: 'registro', title: 'Solicitud aprobada', message: 'Secretaría aprobó tu ingreso. Activa tu contraseña desde el correo de invitación.', read: false, date: new Date().toISOString(), action: '/inicio' });
  return NextResponse.json({ status: 'approved', userId: invited.user.id });
}
