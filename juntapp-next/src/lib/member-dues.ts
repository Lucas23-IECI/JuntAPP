import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getJuntaMercadoPagoAccount } from '@/lib/mercadopago-connect';
import { publicAppUrl, sendEmailBestEffort } from '@/lib/email';
import { duePaymentTemplate } from '@/lib/email-templates';

type MercadoPagoPayment = {
  id: number;
  status: string;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id: string;
  collector_id: number;
  date_approved?: string | null;
};

export async function processMemberDuePayment(paymentId: string, mercadoPagoUserId?: string | number) {
  if (!/^\d+$/.test(paymentId) || !mercadoPagoUserId) return false;
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from('mercadopago_junta_accounts')
    .select('junta_id, mercadopago_user_id')
    .eq('mercadopago_user_id', Number(mercadoPagoUserId))
    .maybeSingle();
  if (!connection) return false;

  const account = await getJuntaMercadoPagoAccount(connection.junta_id);
  if (!account) return false;
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${account.access_token}` },
    cache: 'no-store',
  });
  const payment = await response.json() as MercadoPagoPayment & { message?: string };
  if (!response.ok) throw new Error(payment.message ?? 'No fue posible verificar el pago de cuota.');

  const reference = payment.external_reference?.match(/^juntapp-due:([0-9a-f-]{36}):([0-9a-f-]{36}):([0-9a-f-]{36})$/i);
  if (!reference) return false;
  const [, dueId, juntaId, householdId] = reference;
  if (juntaId !== connection.junta_id || Number(payment.collector_id) !== Number(connection.mercadopago_user_id)) {
    throw new Error('El pago pertenece a otra junta o cuenta recaudadora.');
  }

  const { data: due, error: dueError } = await admin
    .from('member_dues')
    .select('id, junta_id, household_id, profile_id, period, amount, status, mercadopago_payment_id')
    .eq('id', dueId)
    .single();
  if (dueError || !due || due.junta_id !== juntaId || due.household_id !== householdId) {
    throw new Error('No se encontró la cuota por domicilio asociada al pago.');
  }
  if (payment.currency_id !== 'CLP' || Number(payment.transaction_amount) !== Number(due.amount)) {
    throw new Error('El monto o moneda no coincide con la cuota registrada.');
  }

  if (payment.status === 'approved') {
    const { error } = await admin.rpc('record_approved_member_due', {
      p_due_id: due.id,
      p_payment_id: String(payment.id),
      p_paid_at: payment.date_approved ?? new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  } else if (payment.status === 'refunded') {
    const { error } = await admin.rpc('record_refunded_member_due', {
      p_due_id: due.id,
      p_payment_id: String(payment.id),
    });
    if (error) throw new Error(error.message);
  } else if (['rejected', 'cancelled'].includes(payment.status) && due.status !== 'paid') {
    const { error } = await admin.from('member_dues').update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    }).eq('id', due.id);
    if (error) throw new Error(error.message);
  }

  const { error: eventError } = await admin.from('payment_events').insert({
    provider_event_id: `mercadopago-due:${payment.id}:${payment.status}`,
    junta_id: juntaId,
    payload: payment,
  });
  if (eventError?.code === '23505') return true;
  if (eventError) throw new Error(eventError.message);

  const emailStatus = payment.status === 'approved'
    ? 'approved'
    : payment.status === 'refunded'
      ? 'refunded'
      : ['rejected', 'cancelled'].includes(payment.status) && due.status !== 'paid'
        ? 'rejected'
        : null;
  if (emailStatus) {
    const [{ data: recipients }, { data: junta }] = await Promise.all([
      admin.from('profiles').select('id, name, email').eq('household_id', householdId),
      admin.from('juntas').select('name').eq('id', juntaId).single(),
    ]);
    const periodLabel = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(due.period));
    await Promise.all((recipients ?? []).map((recipient) => {
      const template = duePaymentTemplate({
        name: recipient.name,
        juntaName: junta?.name ?? 'tu junta vecinal',
        period: periodLabel,
        amount: Number(due.amount),
        status: emailStatus,
        paymentId: String(payment.id),
        actionUrl: `${publicAppUrl()}/tesoreria`,
      });
      return sendEmailBestEffort({
        to: recipient.email,
        ...template,
        idempotencyKey: `mercadopago-due-email:${payment.id}:${payment.status}:${recipient.id}`,
      });
    }));
  }
  return true;
}
