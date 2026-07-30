import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/auth/superadmin-')) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/superadmin')) {
    if (
      request.nextUrl.pathname !== '/superadmin/login' &&
      !request.cookies.has('juntapp_superadmin_session')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/superadmin/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|xml)$).*)',
  ],
};
