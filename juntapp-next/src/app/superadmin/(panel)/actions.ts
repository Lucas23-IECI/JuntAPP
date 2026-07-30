'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSuperadmin, SUPERADMIN_PATH } from '@/lib/superadmin';

const subscriptionSchema = z.object({
  juntaId: z.string().uuid(),
  status: z.enum(['pending', 'authorized', 'paused', 'cancelled', 'past_due']),
  plan: z.enum(['juntapp', 'juntapp_web', 'web']),
  whatsappAddon: z.boolean(),
  price: z.number().int().refine(
    (value) => [9990, 14990, 15000, 17980, 22980, 22990, 30980].includes(value),
    'Precio fuera del catálogo vigente',
  ),
  nextPaymentDate: z.string().nullable(),
});

const suspendSchema = z.object({
  userId: z.string().uuid(),
  suspended: z.boolean(),
});

const broadcastSchema = z.object({
  title: z.string().trim().min(3).max(90),
  message: z.string().trim().min(10).max(1000),
  juntaId: z.string().uuid().nullable(),
  role: z.enum(['all', 'dirigente', 'vecino']),
  plan: z.enum(['all', 'juntapp', 'juntapp_web', 'web']),
  action: z.string().trim().max(200).nullable(),
});

export type AdminActionResult = {
  ok: boolean;
  message: string;
};

export async function updateJuntaSubscriptionAction(
  input: z.input<typeof subscriptionSchema>,
): Promise<AdminActionResult> {
  await requireSuperadmin();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Los datos de la suscripción no son válidos.' };

  const admin = createAdminClient();
  const { juntaId, status, plan, whatsappAddon, price, nextPaymentDate } = parsed.data;
  const { error } = await admin
    .from('juntas')
    .update({
      subscription_status: status,
      subscription_plan: plan,
      whatsapp_addon: whatsappAddon,
      subscription_price: price,
      subscription_next_payment_date: nextPaymentDate || null,
      subscription_last_synced_at: new Date().toISOString(),
    })
    .eq('id', juntaId);

  if (error) return { ok: false, message: `No se pudo actualizar: ${error.message}` };

  revalidatePath(SUPERADMIN_PATH);
  revalidatePath(`${SUPERADMIN_PATH}/juntas`);
  revalidatePath(`${SUPERADMIN_PATH}/juntas/${juntaId}`);
  revalidatePath(`${SUPERADMIN_PATH}/suscripciones`);
  return { ok: true, message: 'Suscripción actualizada correctamente.' };
}

export async function setUserSuspendedAction(
  input: z.input<typeof suspendSchema>,
): Promise<AdminActionResult> {
  const currentAdmin = await requireSuperadmin();
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Usuario inválido.' };
  if (parsed.data.userId === currentAdmin.id) {
    return { ok: false, message: 'No puedes suspender tu propia cuenta de superadmin.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, {
    ban_duration: parsed.data.suspended ? '876000h' : 'none',
  });

  if (error) return { ok: false, message: `No se pudo cambiar el acceso: ${error.message}` };

  revalidatePath(`${SUPERADMIN_PATH}/usuarios`);
  return {
    ok: true,
    message: parsed.data.suspended ? 'Acceso suspendido.' : 'Acceso restaurado.',
  };
}

export async function sendPlatformBroadcastAction(
  input: z.input<typeof broadcastSchema>,
): Promise<AdminActionResult & { recipients?: number }> {
  const adminUser = await requireSuperadmin();
  const parsed = broadcastSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Revisa el título, mensaje y destinatarios.' };

  const admin = createAdminClient();
  let query = admin.from('profiles').select('id, junta_id, role');
  if (parsed.data.juntaId) query = query.eq('junta_id', parsed.data.juntaId);
  if (parsed.data.role !== 'all') query = query.eq('role', parsed.data.role);

  const { data: profiles, error: profilesError } = await query;
  if (profilesError) return { ok: false, message: `No se pudieron cargar los destinatarios: ${profilesError.message}` };

  let recipients = profiles ?? [];
  if (parsed.data.plan !== 'all') {
    const juntaIds = [...new Set(recipients.map((profile) => profile.junta_id))];
    const { data: juntas, error: juntasError } = await admin
      .from('juntas')
      .select('id')
      .in('id', juntaIds.length ? juntaIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('subscription_plan', parsed.data.plan);
    if (juntasError) return { ok: false, message: `No se pudo aplicar el filtro de plan: ${juntasError.message}` };
    const allowedJuntas = new Set((juntas ?? []).map((junta) => junta.id));
    recipients = recipients.filter((profile) => allowedJuntas.has(profile.junta_id));
  }

  if (recipients.length === 0) return { ok: false, message: 'La segmentación no encontró destinatarios.' };

  const now = new Date().toISOString();
  const rows = recipients.map((profile) => ({
    user_id: profile.id,
    type: 'seguridad',
    title: parsed.data.title,
    message: parsed.data.message,
    read: false,
    date: now,
    action: parsed.data.action || null,
  }));

  for (let index = 0; index < rows.length; index += 500) {
    const { error } = await admin.from('notifications').insert(rows.slice(index, index + 500));
    if (error) return { ok: false, message: `El envío quedó incompleto: ${error.message}` };
  }

  console.info('[Superadmin broadcast]', {
    adminId: adminUser.id,
    recipients: rows.length,
    juntaId: parsed.data.juntaId,
    role: parsed.data.role,
    plan: parsed.data.plan,
  });

  revalidatePath(`${SUPERADMIN_PATH}/comunicaciones`);
  return { ok: true, message: `Comunicado enviado a ${rows.length} personas.`, recipients: rows.length };
}
