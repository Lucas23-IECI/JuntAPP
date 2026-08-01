import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { publicAppUrl } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

const allowedTypes = new Set<EmailOtpType>(['invite', 'recovery', 'signup', 'magiclink', 'email_change', 'email']);

export async function POST(request: Request) {
  const form = await request.formData();
  const tokenHash = String(form.get('token_hash') ?? '');
  const type = String(form.get('type') ?? '') as EmailOtpType;
  const failureUrl = new URL('/confirmar-acceso?error=invalid', publicAppUrl());

  if (!tokenHash || !allowedTypes.has(type)) {
    return NextResponse.redirect(failureUrl, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return NextResponse.redirect(failureUrl, 303);

  return NextResponse.redirect(new URL('/aceptar-invitacion', publicAppUrl()), 303);
}
