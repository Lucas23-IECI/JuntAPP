import { createAdminClient } from '@/lib/supabase/admin';

export const MONTHLY_SUBSCRIPTION_PRICE_CLP = 15_000;

export type MercadoPagoSubscription = {
  id: string;
  status: string;
  external_reference?: string | null;
  payer_email?: string | null;
  date_created?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
};

export type MercadoPagoAuthorizedPayment = {
  id: number;
  preapproval_id?: string;
  status?: string;
  summarized?: string;
  payment?: { id?: number; status?: string; status_detail?: string };
  transaction_amount?: number;
  currency_id?: string;
};

function accessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error('Mercado Pago no está configurado.');
  return token;
}

export function subscriptionExternalReference(juntaId: string, userId: string) {
  return `juntapp-subscription:${juntaId}:${userId}`;
}

export function mercadoPagoAuthorization() {
  return `Bearer ${accessToken()}`;
}

export function mercadoPagoApiHeaders() {
  const token = accessToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(token.startsWith('TEST-') ? { 'X-scope': 'stage' } : {}),
  };
}

async function mercadoPagoJson<T>(url: string) {
  const response = await fetch(url, { headers: mercadoPagoApiHeaders(), cache: 'no-store' });
  const raw = await response.text();
  const result = (raw ? JSON.parse(raw) : {}) as T & { message?: string };
  if (!response.ok) throw new Error(result.message ?? 'Mercado Pago no pudo completar la verificación.');
  return result;
}

export function getMercadoPagoSubscription(subscriptionId: string) {
  if (!/^[A-Za-z0-9-]{8,100}$/.test(subscriptionId)) throw new Error('Identificador de suscripción inválido.');
  return mercadoPagoJson<MercadoPagoSubscription>(`https://api.mercadopago.com/preapproval/${subscriptionId}`);
}

export function getMercadoPagoAuthorizedPayment(paymentId: string) {
  if (!/^\d+$/.test(paymentId)) throw new Error('Identificador de cobro inválido.');
  return mercadoPagoJson<MercadoPagoAuthorizedPayment>(`https://api.mercadopago.com/authorized_payments/${paymentId}`);
}

function databaseStatus(status: string) {
  switch (status) {
    case 'authorized': return 'authorized';
    case 'paused': return 'paused';
    case 'cancelled':
    case 'canceled': return 'cancelled';
    default: return 'pending';
  }
}

export async function syncMercadoPagoSubscription(subscriptionId: string, expectedUserId?: string) {
  const subscription = await getMercadoPagoSubscription(subscriptionId);
  const reference = subscription.external_reference?.match(/^juntapp-subscription:([0-9a-f-]{36}):([0-9a-f-]{36})$/i);
  if (!reference) throw new Error('La suscripción no corresponde a un registro de JuntAPP.');

  const [, juntaId, ownerId] = reference;
  if (expectedUserId && ownerId !== expectedUserId) throw new Error('La suscripción pertenece a otra cuenta.');
  const recurring = subscription.auto_recurring;
  if (Number(recurring?.transaction_amount) !== MONTHLY_SUBSCRIPTION_PRICE_CLP
    || recurring?.currency_id !== 'CLP'
    || recurring?.frequency !== 1
    || recurring?.frequency_type !== 'months') {
    throw new Error('La frecuencia, monto o moneda de la suscripción no corresponde al plan JuntAPP.');
  }

  const admin = createAdminClient();
  const { data: junta, error: juntaError } = await admin
    .from('juntas')
    .select('id, owner_id, subscription_status, subscription_last_payment_status, mercadopago_subscription_id')
    .eq('id', juntaId)
    .single();
  if (juntaError || !junta || junta.owner_id !== ownerId) throw new Error('No se encontró la junta asociada a la suscripción.');
  if (junta.mercadopago_subscription_id
    && junta.mercadopago_subscription_id !== subscription.id
    && junta.subscription_status !== 'cancelled') {
    throw new Error('Esta junta ya tiene otra suscripción asociada.');
  }

  const mercadoPagoStatus = databaseStatus(subscription.status);
  const status = mercadoPagoStatus === 'authorized' && junta.subscription_last_payment_status === 'rejected'
    ? 'past_due'
    : mercadoPagoStatus;
  const { error: updateError } = await admin.from('juntas').update({
    subscription_status: status,
    mercadopago_subscription_id: subscription.id,
    subscription_next_payment_date: subscription.next_payment_date ?? null,
    subscription_last_synced_at: new Date().toISOString(),
    ...(status === 'authorized' ? { activated_at: subscription.date_created ?? new Date().toISOString() } : {}),
  }).eq('id', juntaId).eq('owner_id', ownerId);
  if (updateError) throw new Error(updateError.message);

  return { subscription, juntaId, ownerId, status, authorized: status === 'authorized' };
}
