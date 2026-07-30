import { NextResponse } from 'next/server';
import { publicAppUrl, sendEmailBestEffort } from '@/lib/email';
import { juntaTrialExpiredTemplate, juntaTrialExpiringTemplate } from '@/lib/email-templates';
import { expireJuntaTrialIfNeeded } from '@/lib/junta-trial';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const now = new Date();
  const warningLimit = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const admin = createAdminClient();
  const { data: trials, error } = await admin
    .from('juntas')
    .select('id, name, owner_id, subscription_status, subscription_price, billing_mode, trial_ends_at, trial_warning_sent_at, trial_expired_at, trial_expired_notice_sent_at')
    .eq('billing_mode', 'trial_then_subscription')
    .not('trial_ends_at', 'is', null)
    .or(`trial_warning_sent_at.is.null,trial_expired_notice_sent_at.is.null`);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ownerIds = [...new Set((trials ?? []).map((trial) => trial.owner_id).filter(Boolean))] as string[];
  const { data: owners } = ownerIds.length
    ? await admin.from('profiles').select('id, name, email').in('id', ownerIds)
    : { data: [] };
  const ownersById = new Map((owners ?? []).map((owner) => [owner.id, owner]));
  const results = { warned: 0, expired: 0, skipped: 0, errors: [] as string[] };

  for (const trial of trials ?? []) {
    if (!trial.trial_ends_at) continue;
    const owner = trial.owner_id ? ownersById.get(trial.owner_id) : null;
    const trialEnd = new Date(trial.trial_ends_at);

    try {
      if (trialEnd <= now) {
        const current = await expireJuntaTrialIfNeeded(trial);
        if (!owner?.email || current.trial_expired_notice_sent_at) {
          results.skipped += 1;
          continue;
        }
        const template = juntaTrialExpiredTemplate({
          name: owner.name,
          juntaName: trial.name,
          monthlyPrice: Number(trial.subscription_price),
          actionUrl: `${publicAppUrl()}/registro/pago`,
        });
        const delivery = await sendEmailBestEffort({
          to: owner.email,
          ...template,
          idempotencyKey: `junta-trial-expired:${trial.id}:${trial.trial_ends_at}`,
        });
        if (delivery.delivered) {
          await admin.from('juntas').update({ trial_expired_notice_sent_at: now.toISOString() }).eq('id', trial.id);
          results.expired += 1;
        } else {
          results.errors.push(`${trial.id}: no se pudo enviar el aviso de vencimiento`);
        }
        continue;
      }

      if (trialEnd <= warningLimit && !trial.trial_warning_sent_at && owner?.email) {
        const template = juntaTrialExpiringTemplate({
          name: owner.name,
          juntaName: trial.name,
          endsAt: trial.trial_ends_at,
          monthlyPrice: Number(trial.subscription_price),
          actionUrl: `${publicAppUrl()}/inicio`,
        });
        const delivery = await sendEmailBestEffort({
          to: owner.email,
          ...template,
          idempotencyKey: `junta-trial-warning:${trial.id}:${trial.trial_ends_at}`,
        });
        if (delivery.delivered) {
          await admin.from('juntas').update({ trial_warning_sent_at: now.toISOString() }).eq('id', trial.id);
          results.warned += 1;
        } else {
          results.errors.push(`${trial.id}: no se pudo enviar el aviso previo`);
        }
      }
    } catch (trialError) {
      results.errors.push(`${trial.id}: ${trialError instanceof Error ? trialError.message : 'error desconocido'}`);
    }
  }

  return NextResponse.json({ ok: results.errors.length === 0, ...results });
}
