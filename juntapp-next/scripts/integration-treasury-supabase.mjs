import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Faltan credenciales Supabase para la prueba de integración.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const board = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const neighbor = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const insertedIds = [];

try {
  const { data: boardSession, error: boardAuthError } = await board.auth.signInWithPassword({ email: 'directiva.demo@juntapp.cl', password: 'DirectivaDemo2026!' });
  if (boardAuthError) throw boardAuthError;
  const { data: neighborSession, error: neighborAuthError } = await neighbor.auth.signInWithPassword({ email: 'vecino.demo@juntapp.cl', password: 'VecinoDemo2026!' });
  if (neighborAuthError) throw neighborAuthError;

  const { data: profile, error: profileError } = await admin.from('profiles').select('id, junta_id, role').eq('id', boardSession.user.id).single();
  if (profileError) throw profileError;
  assert.equal(profile.role, 'dirigente');

  const { data: manual, error: manualError } = await admin.from('transactions').insert({
    junta_id: profile.junta_id,
    type: 'ingreso',
    description: '[TEST] Movimiento manual conciliación',
    amount: 123,
    date: new Date().toISOString().slice(0, 10),
    created_by: profile.id,
  }).select('id, source, accounting_kind, gross_amount, fee_amount, net_amount, verification_status, is_immutable').single();
  if (manualError) throw manualError;
  insertedIds.push(manual.id);
  assert.deepEqual(
    { source: manual.source, kind: manual.accounting_kind, gross: Number(manual.gross_amount), fee: Number(manual.fee_amount), net: Number(manual.net_amount), verification: manual.verification_status, immutable: manual.is_immutable },
    { source: 'manual', kind: 'income', gross: 123, fee: 0, net: 123, verification: 'manual', immutable: false },
  );

  const { error: manualUpdateError } = await board.from('transactions').update({ description: '[TEST] Movimiento manual actualizado' }).eq('id', manual.id);
  assert.equal(manualUpdateError, null, 'la directiva debe poder corregir la descripción de un movimiento manual');
  const { error: manualDeleteError } = await board.from('transactions').delete().eq('id', manual.id);
  assert.equal(manualDeleteError, null, 'Supabase representa el bloqueo RLS como una eliminación de cero filas');
  const { data: manualAfterDelete } = await admin.from('transactions').select('id').eq('id', manual.id).single();
  assert.equal(manualAfterDelete.id, manual.id, 'la directiva no debe poder borrar movimientos');

  const providerEventKey = randomUUID();
  const { data: verified, error: verifiedError } = await admin.from('transactions').insert({
    junta_id: profile.junta_id,
    type: 'ingreso',
    description: '[TEST] Movimiento verificado Mercado Pago',
    amount: 1000,
    date: new Date().toISOString().slice(0, 10),
    created_by: null,
    source: 'mercadopago',
    accounting_kind: 'income',
    account_code: 'mercadopago',
    category: 'cuota_social',
    gross_amount: 1000,
    fee_amount: 50,
    net_amount: 950,
    provider: 'mercadopago',
    provider_transaction_id: `test-${providerEventKey}`,
    provider_event_key: providerEventKey,
    external_reference: `test-private-${providerEventKey}`,
    verification_status: 'reconciled',
    verified_at: new Date().toISOString(),
    is_immutable: true,
  }).select('id').single();
  if (verifiedError) throw verifiedError;
  insertedIds.push(verified.id);

  const { error: verifiedUpdateError } = await board.from('transactions').update({ description: 'No debe cambiar' }).eq('id', verified.id);
  assert.equal(verifiedUpdateError, null, 'Supabase representa el bloqueo RLS como una actualización de cero filas');
  const { data: verifiedAfterUpdate } = await admin.from('transactions').select('description').eq('id', verified.id).single();
  assert.equal(verifiedAfterUpdate.description, '[TEST] Movimiento verificado Mercado Pago', 'un movimiento verificado no debe poder editarse');

  const { data: safeProjection, error: safeProjectionError } = await neighbor.from('transactions').select('id, source, accounting_kind, net_amount, verification_status').eq('id', verified.id).single();
  if (safeProjectionError) throw safeProjectionError;
  assert.equal(safeProjection.source, 'mercadopago');
  assert.equal(safeProjection.verification_status, 'reconciled');

  const { error: privateProjectionError } = await neighbor.from('transactions').select('id, provider_event_key').eq('id', verified.id).single();
  assert.ok(privateProjectionError, 'los vecinos no deben poder consultar referencias privadas del proveedor');
  assert.equal(neighborSession.user.email, 'vecino.demo@juntapp.cl');

  console.log('Supabase treasury integration tests passed.');
} finally {
  if (insertedIds.length) await admin.from('transactions').delete().in('id', insertedIds);
  await Promise.all([board.auth.signOut(), neighbor.auth.signOut()]);
}
