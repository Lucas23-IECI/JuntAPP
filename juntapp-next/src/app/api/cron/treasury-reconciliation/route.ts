import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncMercadoPagoTreasury } from '@/lib/mercadopago-treasury';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { data: accounts, error } = await createAdminClient()
    .from('mercadopago_junta_accounts')
    .select('junta_id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { imported: 0, requested: 0, pending: 0, errors: [] as string[] };
  for (const account of accounts ?? []) {
    try {
      const synced = await syncMercadoPagoTreasury(account.junta_id);
      results.imported += synced.imported;
      results.pending += synced.pending;
      if (synced.requested) results.requested += 1;
    } catch (syncError) {
      results.errors.push(`${account.junta_id}: ${syncError instanceof Error ? syncError.message : 'error desconocido'}`);
    }
  }
  return NextResponse.json({ ok: results.errors.length === 0, ...results });
}
