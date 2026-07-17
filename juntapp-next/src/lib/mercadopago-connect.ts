import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  public_key?: string;
  expires_in?: number;
  user_id: number;
  message?: string;
};

export type JuntaMercadoPagoAccount = {
  junta_id: string;
  mercadopago_user_id: number;
  access_token: string;
  refresh_token: string | null;
  public_key: string | null;
  expires_at: string | null;
};

function oauthConfig() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('La conexión OAuth de Mercado Pago todavía no está configurada.');
  }
  return { clientId, clientSecret };
}

function credentialsEncryptionKey() {
  const key = process.env.MERCADOPAGO_CREDENTIALS_ENCRYPTION_KEY;
  if (!key || key.length < 32) throw new Error('Falta configurar el cifrado de credenciales de Mercado Pago.');
  return key;
}

export function mercadoPagoConnectConfigured() {
  try { oauthConfig(); return true; } catch { return false; }
}

export function mercadoPagoOAuthRedirectUri(origin?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? origin?.replace(/\/$/, '');
  if (!appUrl) throw new Error('Falta configurar NEXT_PUBLIC_APP_URL.');
  return `${appUrl}/api/mercadopago/connect/callback`;
}

export function buildMercadoPagoAuthorizationUrl({ state, codeChallenge, origin }: { state: string; codeChallenge: string; origin?: string }) {
  const { clientId } = oauthConfig();
  const url = new URL('https://auth.mercadopago.com/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', mercadoPagoOAuthRedirectUri(origin));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url;
}

async function requestOAuthToken(body: Record<string, unknown>) {
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const raw = await response.text();
  const result = (raw ? JSON.parse(raw) : {}) as OAuthTokenResponse;
  if (!response.ok || !result.access_token || !result.user_id) {
    throw new Error(result.message ?? `Mercado Pago rechazó la autorización (HTTP ${response.status}).`);
  }
  return result;
}

async function storeAccount(juntaId: string, token: OAuthTokenResponse) {
  const encryptionKey = credentialsEncryptionKey();
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;
  const { error } = await createAdminClient().rpc('store_mercadopago_junta_account', {
    p_junta_id: juntaId,
    p_mercadopago_user_id: token.user_id,
    p_access_token: token.access_token,
    p_refresh_token: token.refresh_token ?? null,
    p_public_key: token.public_key ?? null,
    p_expires_at: expiresAt,
    p_encryption_key: encryptionKey,
  });
  if (error) throw new Error(error.message);
}

export async function exchangeMercadoPagoAuthorization({ juntaId, code, codeVerifier, origin }: { juntaId: string; code: string; codeVerifier: string; origin?: string }) {
  const { clientId, clientSecret } = oauthConfig();
  const token = await requestOAuthToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: mercadoPagoOAuthRedirectUri(origin),
    test_token: process.env.MERCADOPAGO_OAUTH_TEST_MODE === 'true',
  });
  await storeAccount(juntaId, token);
  return token;
}

export async function getJuntaMercadoPagoAccount(juntaId: string) {
  const encryptionKey = credentialsEncryptionKey();
  const { data, error } = await createAdminClient().rpc('get_mercadopago_junta_account', {
    p_junta_id: juntaId,
    p_encryption_key: encryptionKey,
  });
  if (error) throw new Error(error.message);
  const account = (Array.isArray(data) ? data[0] : data) as JuntaMercadoPagoAccount | undefined;
  if (!account) return null;

  const expiresSoon = account.expires_at && new Date(account.expires_at).getTime() <= Date.now() + 5 * 60_000;
  if (!expiresSoon) return account;
  if (!account.refresh_token) throw new Error('La autorización de Mercado Pago expiró. Conecta la cuenta nuevamente.');

  const { clientId, clientSecret } = oauthConfig();
  const refreshed = await requestOAuthToken({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: account.refresh_token,
  });
  await storeAccount(juntaId, refreshed);
  return {
    ...account,
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? account.refresh_token,
    public_key: refreshed.public_key ?? account.public_key,
    expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
    mercadopago_user_id: refreshed.user_id,
  };
}
