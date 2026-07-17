import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMercadoPagoAuthorizedPayment, syncMercadoPagoSubscription } from '@/lib/mercadopago';
import { processMemberDuePayment } from '@/lib/member-dues';

function validSignature(request: Request, dataId: string) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const signature = request.headers.get('x-signature');
  const requestId = request.headers.get('x-request-id');
  if (!secret || !signature || !requestId) return false;
  const parts = Object.fromEntries(signature.split(',').map((part) => part.trim().split('=')));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  if (expected.length !== parts.v1.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

async function recordEvent(eventId: string, juntaId: string, payload: unknown) {
  const { error } = await createAdminClient().from('payment_events').insert({
    provider_event_id: eventId,
    junta_id: juntaId,
    payload,
  });
  if (error && error.code !== '23505') throw new Error(error.message);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => null) as { type?: string; action?: string; user_id?: string | number; data?: { id?: string | number } } | null;
  const dataId = String(url.searchParams.get('data.id') ?? body?.data?.id ?? '');
  const type = String(url.searchParams.get('type') ?? body?.type ?? '');
  if (!dataId || !['payment', 'subscription_preapproval', 'subscription_authorized_payment'].includes(type)) {
    return NextResponse.json({ received: true });
  }
  if (!validSignature(request, dataId)) return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });

  try {
    if (type === 'payment') {
      await processMemberDuePayment(dataId, body?.user_id ?? url.searchParams.get('user_id') ?? undefined);
      return NextResponse.json({ received: true });
    }
    if (type === 'subscription_preapproval') {
      const synced = await syncMercadoPagoSubscription(dataId);
      await recordEvent(`mercadopago-preapproval:${dataId}:${body?.action ?? 'updated'}`, synced.juntaId, body);
      return NextResponse.json({ received: true });
    }

    const invoice = await getMercadoPagoAuthorizedPayment(dataId);
    if (!invoice.preapproval_id) throw new Error('El cobro no informa su suscripción.');
    const synced = await syncMercadoPagoSubscription(invoice.preapproval_id);
    const paymentStatus = invoice.payment?.status ?? invoice.status ?? 'unknown';
    const admin = createAdminClient();
    const subscriptionStatus = paymentStatus === 'rejected'
      ? 'past_due'
      : paymentStatus === 'approved' && synced.subscription.status === 'authorized'
        ? 'authorized'
        : synced.status;
    const { error } = await admin.from('juntas').update({
      subscription_status: subscriptionStatus,
      subscription_last_payment_status: paymentStatus,
      mercadopago_payment_id: invoice.payment?.id ? String(invoice.payment.id) : null,
      subscription_last_synced_at: new Date().toISOString(),
    }).eq('id', synced.juntaId);
    if (error) throw new Error(error.message);
    await recordEvent(`mercadopago-authorized-payment:${dataId}`, synced.juntaId, invoice);
    return NextResponse.json({ received: true });
  } catch {
    // A non-2xx response asks Mercado Pago to retry a valid event that could not
    // be synchronized. The event ledger makes later deliveries idempotent.
    return NextResponse.json({ error: 'No fue posible sincronizar el evento.' }, { status: 500 });
  }
}
