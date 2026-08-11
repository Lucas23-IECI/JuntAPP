import 'server-only';
import { createECDH, createHmac } from 'node:crypto';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export type PushPayload = {
  title: string;
  message: string;
  action?: string | null;
  tag?: string;
};

export type PushNotificationJobInput = PushPayload & {
  juntaId: string;
  eventKey: string;
  notificationType: 'asamblea' | 'votacion' | 'cuota' | 'seguridad' | 'registro' | 'propuesta' | 'general';
  recipientUserIds: string[];
  createdBy?: string | null;
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
};

type PushNotificationJob = {
  id: string;
  junta_id: string;
  event_key: string;
  notification_type: PushNotificationJobInput['notificationType'];
  title: string;
  message: string;
  action: string | null;
  tag: string | null;
  recipient_user_ids: string[];
  status: 'pending' | 'processing' | 'delivered' | 'partial' | 'failed';
  attempts: number;
  max_attempts: number;
};

function pushConfig() {
  let publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  let privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT ?? 'mailto:soporte@juntapp.cl';
  // A domain-separated derivation lets existing production installations enable
  // push safely before dedicated VAPID variables are added. Explicit VAPID keys
  // always take precedence and should remain stable once devices subscribe.
  const seed = process.env.WEB_PUSH_VAPID_SEED ?? process.env.MERCADOPAGO_CREDENTIALS_ENCRYPTION_KEY;
  if ((!publicKey || !privateKey) && seed?.length && seed.length >= 32) {
    const ecdh = createECDH('prime256v1');
    const derivedPrivateKey = createHmac('sha256', seed).update('juntapp:web-push:vapid:v1').digest();
    ecdh.setPrivateKey(derivedPrivateKey);
    privateKey = derivedPrivateKey.toString('base64url');
    publicKey = ecdh.getPublicKey().toString('base64url');
  }
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function webPushPublicKey() {
  return pushConfig()?.publicKey ?? null;
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  const config = pushConfig();
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (!config || !uniqueUserIds.length) {
    return { configured: Boolean(config), subscriptions: 0, delivered: 0, failed: 0 };
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const admin = createAdminClient();
  const subscriptions: StoredSubscription[] = [];
  for (let index = 0; index < uniqueUserIds.length; index += 500) {
    const { data, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, failure_count')
      .in('user_id', uniqueUserIds.slice(index, index + 500));
    if (error) {
      console.error('Web Push subscriptions could not be loaded', { error: error.message });
      return { configured: true, subscriptions: 0, delivered: 0, failed: uniqueUserIds.length };
    }
    subscriptions.push(...((data ?? []) as StoredSubscription[]));
  }

  let delivered = 0;
  let failed = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(payload), { TTL: 60 * 60 * 24, urgency: 'high' });
      delivered += 1;
      await admin.from('push_subscriptions').update({
        failure_count: 0,
        last_success_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', subscription.id);
    } catch (error) {
      failed += 1;
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number(error.statusCode)
        : 0;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      } else {
        await admin.from('push_subscriptions').update({
          failure_count: subscription.failure_count + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', subscription.id);
        console.error('Web Push delivery failed', { subscriptionId: subscription.id, statusCode });
      }
    }
  }));

  return { configured: true, subscriptions: subscriptions.length, delivered, failed };
}

function retryDate(attempt: number) {
  const delayMinutes = [5, 30, 120][Math.min(Math.max(attempt - 1, 0), 2)];
  return new Date(Date.now() + delayMinutes * 60_000).toISOString();
}

export async function processPushNotificationJob(jobId: string) {
  const admin = createAdminClient();
  const { data: loaded, error: loadError } = await admin
    .from('push_notification_jobs')
    .select('id, junta_id, event_key, notification_type, title, message, action, tag, recipient_user_ids, status, attempts, max_attempts')
    .eq('id', jobId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!loaded) return null;
  const job = loaded as PushNotificationJob;
  if (job.status === 'delivered' || job.status === 'processing') return job;

  const attempt = job.attempts + 1;
  const { data: claimed, error: claimError } = await admin
    .from('push_notification_jobs')
    .update({ status: 'processing', attempts: attempt, updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .neq('status', 'processing')
    .select('id')
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) return job;

  try {
    const result = await sendPushToUsers(job.recipient_user_ids, {
      title: job.title,
      message: job.message,
      action: job.action,
      tag: job.tag ?? job.event_key,
    });
    const exhausted = attempt >= job.max_attempts;
    const status = !result.configured
      ? (exhausted ? 'failed' : 'partial')
      : result.failed === 0
        ? 'delivered'
        : exhausted
          ? 'failed'
          : 'partial';
    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from('push_notification_jobs')
      .update({
        status,
        recipient_count: job.recipient_user_ids.length,
        subscription_count: result.subscriptions,
        delivered_count: result.delivered,
        failed_count: result.failed,
        last_error: result.configured ? (result.failed ? `${result.failed} dispositivo(s) no respondieron.` : null) : 'Web Push no está configurado.',
        next_attempt_at: status === 'delivered' || exhausted ? now : retryDate(attempt),
        completed_at: status === 'delivered' || exhausted ? now : null,
        updated_at: now,
      })
      .eq('id', job.id)
      .select('*')
      .single();
    if (updateError) throw new Error(updateError.message);
    return updated;
  } catch (error) {
    const exhausted = attempt >= job.max_attempts;
    const now = new Date().toISOString();
    const message = error instanceof Error ? error.message : 'Error desconocido de Web Push.';
    const { data: updated } = await admin.from('push_notification_jobs').update({
      status: exhausted ? 'failed' : 'partial',
      recipient_count: job.recipient_user_ids.length,
      last_error: message.slice(0, 1000),
      next_attempt_at: exhausted ? now : retryDate(attempt),
      completed_at: exhausted ? now : null,
      updated_at: now,
    }).eq('id', job.id).select('*').maybeSingle();
    return updated ?? { ...job, status: exhausted ? 'failed' : 'partial', last_error: message };
  }
}

export async function queuePushNotification(input: PushNotificationJobInput) {
  const admin = createAdminClient();
  const recipientUserIds = [...new Set(input.recipientUserIds)].filter(Boolean);
  const row = {
    junta_id: input.juntaId,
    event_key: input.eventKey,
    notification_type: input.notificationType,
    title: input.title,
    message: input.message,
    action: input.action ?? null,
    tag: input.tag ?? input.eventKey,
    recipient_user_ids: recipientUserIds,
    recipient_count: recipientUserIds.length,
    created_by: input.createdBy ?? null,
  };
  const { data, error } = await admin.from('push_notification_jobs').insert(row).select('*').maybeSingle();
  if (error && error.code !== '23505') throw new Error(error.message);
  const job = data ?? (await admin.from('push_notification_jobs')
    .select('*')
    .eq('junta_id', input.juntaId)
    .eq('event_key', input.eventKey)
    .single()).data;
  if (!job) throw new Error('No fue posible crear el trabajo de notificación.');
  if (job.status === 'delivered') return job;
  return processPushNotificationJob(job.id);
}

export async function processPendingPushJobs(limit = 10) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('push_notification_jobs')
    .select('id')
    .in('status', ['pending', 'partial'])
    .lte('next_attempt_at', new Date().toISOString())
    .order('next_attempt_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  const results = [];
  for (const job of data ?? []) {
    try {
      results.push(await processPushNotificationJob(job.id));
    } catch (error) {
      results.push({ id: job.id, error: error instanceof Error ? error.message : 'Error desconocido.' });
    }
  }
  return results;
}

export async function retryPushNotificationJob(jobId: string, juntaId: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin.from('push_notification_jobs').update({
    status: 'pending',
    attempts: 0,
    next_attempt_at: now,
    completed_at: null,
    last_error: null,
    updated_at: now,
  }).eq('id', jobId).eq('junta_id', juntaId).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Envío no encontrado.');
  return processPushNotificationJob(jobId);
}
