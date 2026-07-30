import { createAdminClient } from '@/lib/supabase/admin';
import SuscripcionesClient from './suscripciones-client';

export const dynamic = 'force-dynamic';

export default async function SuscripcionesPage() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('juntas')
    .select('id, name, slug, subscription_status, subscription_plan, subscription_price, whatsapp_addon, subscription_next_payment_date, subscription_last_payment_status, subscription_last_synced_at, mercadopago_subscription_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`No se pudieron cargar las suscripciones: ${error.message}`);
  return <SuscripcionesClient subscriptions={data ?? []} />;
}
