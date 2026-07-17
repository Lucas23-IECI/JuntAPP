import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeMercadoPagoAuthorization } from '@/lib/mercadopago-connect';

function treasuryRedirect(request: Request, status: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? new URL(request.url).origin;
  const response = NextResponse.redirect(`${appUrl}/tesoreria?mercadopago=${status}`);
  response.cookies.delete('mp_oauth_state');
  response.cookies.delete('mp_oauth_verifier');
  response.cookies.delete('mp_oauth_junta');
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (url.searchParams.get('error') || !code || !state) return treasuryRedirect(request, 'cancelled');

  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = Object.fromEntries(cookieHeader.split(';').map((item) => item.trim().split('=').map(decodeURIComponent)));
  const expectedState = cookies.mp_oauth_state;
  const codeVerifier = cookies.mp_oauth_verifier;
  const juntaId = cookies.mp_oauth_junta;
  if (!expectedState || expectedState !== state || !codeVerifier || !juntaId) return treasuryRedirect(request, 'invalid_state');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return treasuryRedirect(request, 'session_expired');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, junta_id, role, board_position, juntas(owner_id)')
    .eq('id', user.id)
    .single();
  const junta = Array.isArray(profile?.juntas) ? profile.juntas[0] : profile?.juntas;
  const canConnect = Boolean(profile
    && profile.junta_id === juntaId
    && profile.role === 'dirigente'
    && (junta?.owner_id === user.id || profile.board_position === 'presidente'));
  if (!canConnect) return treasuryRedirect(request, 'forbidden');

  try {
    await exchangeMercadoPagoAuthorization({
      juntaId,
      code,
      codeVerifier,
      origin: new URL(request.url).origin,
    });
    return treasuryRedirect(request, 'connected');
  } catch {
    return treasuryRedirect(request, 'error');
  }
}
