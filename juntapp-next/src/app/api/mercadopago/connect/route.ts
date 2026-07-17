import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildMercadoPagoAuthorizationUrl } from '@/lib/mercadopago-connect';

function base64Url(buffer: Buffer) {
  return buffer.toString('base64url');
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, junta_id, role, board_position, juntas(owner_id)')
    .eq('id', user.id)
    .single();
  const junta = Array.isArray(profile?.juntas) ? profile.juntas[0] : profile?.juntas;
  const canConnect = profile?.role === 'dirigente'
    && (junta?.owner_id === user.id || profile.board_position === 'presidente');
  if (!profile || !canConnect) {
    return NextResponse.json({ error: 'Solo la presidencia puede conectar la cuenta de Mercado Pago.' }, { status: 403 });
  }

  try {
    const state = base64Url(randomBytes(32));
    const verifier = base64Url(randomBytes(64));
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const authorizationUrl = buildMercadoPagoAuthorizationUrl({
      state,
      codeChallenge: challenge,
      origin: new URL(request.url).origin,
    });
    const response = NextResponse.redirect(authorizationUrl);
    const secure = authorizationUrl.protocol === 'https:' && process.env.NODE_ENV === 'production';
    const options = { httpOnly: true, secure, sameSite: 'lax' as const, maxAge: 600, path: '/' };
    response.cookies.set('mp_oauth_state', state, options);
    response.cookies.set('mp_oauth_verifier', verifier, options);
    response.cookies.set('mp_oauth_junta', profile.junta_id, options);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No fue posible iniciar la conexión.' }, { status: 503 });
  }
}
