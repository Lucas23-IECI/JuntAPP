import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedTypes = new Set<EmailOtpType>(['invite', 'recovery', 'signup', 'magiclink', 'email_change', 'email']);

export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get('token_hash') ?? '');
  const type = String(form.get('type') ?? '') as EmailOtpType;
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('confirmation') ?? '');
  const origin = new URL(request.url).origin;
  const failureUrl = new URL('/confirmar-acceso?error=expired', origin);

  if (!tokenHash || !allowedTypes.has(type)) {
    return NextResponse.redirect(failureUrl, 303);
  }

  if (password.length < 8 || password !== confirmation) {
    const retryUrl = new URL('/confirmar-acceso', origin);
    retryUrl.searchParams.set('token_hash', tokenHash);
    retryUrl.searchParams.set('type', type);
    retryUrl.searchParams.set('error', 'password');
    return NextResponse.redirect(retryUrl, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(failureUrl, 303);

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) return NextResponse.redirect(new URL('/aceptar-invitacion', origin), 303);

  const { data: profile } = await supabase.from('profiles').select('role, juntas(subscription_plan)').single();
  const junta = Array.isArray(profile?.juntas) ? profile.juntas[0] : profile?.juntas;
  const destination = profile?.role === 'dirigente' && junta?.subscription_plan === 'web' ? '/mi-pagina' : '/inicio';
  return NextResponse.redirect(new URL(destination, origin), 303);
}
