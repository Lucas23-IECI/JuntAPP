import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanRUT, validateRUT } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';
import { sendRegistrationLetter } from '@/lib/registration-letter';

const schema = z.object({
  name: z.string().trim().min(3).max(160),
  rut: z.string().trim().refine(validateRUT),
  address: z.string().trim().min(3).max(300),
  phone: z.string().trim().max(40).refine((value) => /^(?:56)?9\d{8}$/.test(value.replace(/\D/g, ''))),
  email: z.email().trim().toLowerCase(),
  inviteCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/),
});

export async function POST(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!rateLimit(`membership-request:${forwardedFor}`, 5, 60 * 60_000).allowed) {
    return NextResponse.json({ error: 'Alcanzaste el límite de solicitudes. Intenta más tarde.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos de la solicitud.' }, { status: 400 });

  const admin = createAdminClient();
  const rut = cleanRUT(parsed.data.rut).toUpperCase();
  const { data: junta } = await admin.from('juntas').select('id, name, subscription_status').eq('invite_code', parsed.data.inviteCode).maybeSingle();
  if (!junta) return NextResponse.json({ error: 'El código no corresponde a una junta registrada.' }, { status: 404 });
  if (junta.subscription_status !== 'authorized') return NextResponse.json({ error: 'La junta no tiene una suscripción activa.' }, { status: 409 });

  const [{ data: existingProfile }, { data: existingApplication }, { data: board }] = await Promise.all([
    admin.from('profiles').select('id').or(`rut.eq.${rut},email.ilike.${parsed.data.email}`).maybeSingle(),
    admin.from('membership_applications').select('id').eq('junta_id', junta.id).eq('status', 'pending').or(`rut.eq.${rut},email.ilike.${parsed.data.email}`).maybeSingle(),
    admin.from('profiles').select('id, email, board_position').eq('junta_id', junta.id).eq('role', 'dirigente'),
  ]);
  if (existingProfile) return NextResponse.json({ error: 'El RUT o correo ya pertenece a un socio registrado.' }, { status: 409 });
  if (existingApplication) return NextResponse.json({ error: 'Ya existe una solicitud pendiente para este RUT o correo.' }, { status: 409 });
  const secretary = board?.find((member) => member.board_position === 'secretario');
  if (!secretary) return NextResponse.json({ error: 'La junta aún no ha designado a Secretaría. Contacta a su directiva.' }, { status: 409 });

  const { data: application, error } = await admin.from('membership_applications').insert({
    junta_id: junta.id, name: parsed.data.name, rut, address: parsed.data.address,
    phone: parsed.data.phone, email: parsed.data.email,
  }).select('*').single();
  if (error || !application) return NextResponse.json({ error: error?.message ?? 'No fue posible crear la solicitud.' }, { status: 400 });

  await admin.from('notifications').insert((board ?? []).map((member) => ({
    user_id: member.id,
    type: 'registro',
    title: member.board_position === 'secretario' ? 'Solicitud pendiente de tu aprobación' : 'Copia: nueva solicitud de socio',
    message: `${application.name} solicita ingresar desde ${application.address}. ${member.board_position === 'secretario' ? 'Revisa y resuelve la solicitud.' : 'Secretaría debe resolverla.'}`,
    read: false, date: new Date().toISOString(), action: '/socios',
  })));

  let deliveryStatus: 'sent' | 'in_app' | 'failed' = 'in_app';
  try {
    const delivery = await sendRegistrationLetter({
      secretaryEmail: secretary.email, boardEmails: (board ?? []).map((member) => member.email),
      juntaName: junta.name, applicantName: application.name, applicantRut: application.rut,
      applicantAddress: application.address, applicantPhone: application.phone,
      applicantEmail: application.email, applicationId: application.id,
    });
    deliveryStatus = delivery.delivered ? 'sent' : 'in_app';
  } catch { deliveryStatus = 'failed'; }
  await admin.from('membership_applications').update({ letter_delivery_status: deliveryStatus }).eq('id', application.id);
  return NextResponse.json({ applicationId: application.id, status: 'pending', message: 'Solicitud enviada a Secretaría con copia a la directiva. Recibirás una invitación solo si Secretaría la aprueba.' }, { status: 201 });
}
