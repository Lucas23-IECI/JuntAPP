import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processMemberDuePayment } from '@/lib/member-dues';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedResult = url.searchParams.get('result');
  const result = ['approved', 'pending', 'failure'].includes(requestedResult ?? '') ? requestedResult! : 'pending';
  const paymentId = url.searchParams.get('payment_id') ?? url.searchParams.get('collection_id');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? url.origin;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);

  // The redirect is only a user experience hint. The result shown to the user
  // is always reconciled against Mercado Pago's Payments API first.
  let finalResult = result === 'approved' ? 'pending' : result;
  if (paymentId && /^\d+$/.test(paymentId)) {
    try {
      const { data: profile } = await supabase.from('profiles').select('junta_id').eq('id', user.id).single();
      const { data: connection } = profile ? await createAdminClient()
        .from('mercadopago_junta_accounts')
        .select('mercadopago_user_id')
        .eq('junta_id', profile.junta_id)
        .maybeSingle() : { data: null };
      if (connection) {
        const paymentStatus = await processMemberDuePayment(paymentId, connection.mercadopago_user_id);
        if (paymentStatus === 'approved') finalResult = 'approved';
        else if (['rejected', 'cancelled'].includes(paymentStatus ?? '')) finalResult = 'failure';
        else finalResult = 'pending';
      }
    } catch {
      finalResult = 'pending';
    }
  }
  return NextResponse.redirect(`${appUrl}/tesoreria?cuota=${encodeURIComponent(finalResult)}`);
}
