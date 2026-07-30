import { NextResponse } from 'next/server';
import {
  SUPERADMIN_CHALLENGE_COOKIE,
  SUPERADMIN_SESSION_COOKIE,
  superadminCookieOptions,
} from '@/lib/superadmin-session';

export async function POST() {
  const response = NextResponse.json({ message: 'Sesión cerrada.' });
  response.cookies.set(SUPERADMIN_SESSION_COOKIE, '', superadminCookieOptions(0));
  response.cookies.set(SUPERADMIN_CHALLENGE_COOKIE, '', superadminCookieOptions(0));
  return response;
}
