import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && serviceKey && anonKey, 'Faltan variables de Supabase.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const visitor = createClient(url, anonKey, { auth: { persistSession: false } });
const suffix = crypto.randomUUID();
const deviceKey = `notification-test-${suffix}`;
const eventKey = `notification-test:${suffix}`;
let deviceId;
let jobId;
let notificationId;

try {
  const { data: profile, error: profileError } = await admin.from('profiles').select('id, junta_id').eq('email', 'directiva.demo@juntapp.cl').single();
  assert.ifError(profileError);
  assert.ok(profile?.id && profile?.junta_id);

  const { data: device, error: deviceError } = await admin.from('app_devices').insert({ user_id: profile.id, device_key: deviceKey, platform: 'android', installation_status: 'installed', notifications_enabled: false }).select('id').single();
  assert.ifError(deviceError);
  deviceId = device.id;

  const jobRow = { junta_id: profile.junta_id, event_key: eventKey, notification_type: 'general', title: 'Prueba de cola push', message: 'Trabajo temporal de integración.', recipient_user_ids: [crypto.randomUUID()] };
  const { data: job, error: jobError } = await admin.from('push_notification_jobs').insert(jobRow).select('id, status').single();
  assert.ifError(jobError);
  jobId = job.id;
  assert.equal(job.status, 'pending');
  const { error: duplicateError } = await admin.from('push_notification_jobs').insert(jobRow);
  assert.equal(duplicateError?.code, '23505', 'La clave del evento debe ser idempotente.');

  const { data: notification, error: notificationError } = await admin.from('notifications').insert({ user_id: profile.id, type: 'general', title: 'Prueba general temporal', message: 'Validación del tipo general.', action: '/inicio' }).select('id').single();
  assert.ifError(notificationError);
  notificationId = notification.id;

  const { error: signInError } = await visitor.auth.signInWithPassword({ email: 'vecino.demo@juntapp.cl', password: 'VecinoDemo2026!' });
  assert.ifError(signInError);
  const { error: jobsReadError } = await visitor.from('push_notification_jobs').select('id').limit(1);
  assert.ok(jobsReadError, 'Los vecinos no deben leer la cola interna.');
  const { error: devicesReadError } = await visitor.from('app_devices').select('id').limit(1);
  assert.ok(devicesReadError, 'Los vecinos no deben leer dispositivos ajenos.');

  console.log('Notification database integration tests passed.');
} finally {
  if (notificationId) await admin.from('notifications').delete().eq('id', notificationId);
  if (jobId) await admin.from('push_notification_jobs').delete().eq('id', jobId);
  if (deviceId) await admin.from('app_devices').delete().eq('id', deviceId);
  await visitor.auth.signOut();
}
