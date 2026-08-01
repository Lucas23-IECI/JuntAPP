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

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
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
