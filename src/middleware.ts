import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_TTL_SEC,
  createSessionToken,
  getAdminEmail,
  getAuthSecret,
  getSessionEmail,
  sessionCookieOptions,
} from '@/lib/auth-session';

export async function middleware(request: NextRequest) {
  if (!getAdminEmail() || !getAuthSecret()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const email = await getSessionEmail(session);
  if (email) {
    const response = NextResponse.next();
    const refreshed = await createSessionToken(email);
    if (refreshed) {
      response.cookies.set(SESSION_COOKIE, refreshed, sessionCookieOptions(SESSION_TTL_SEC));
    }
    return response;
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*', '/minutes', '/minutes/:path*'],
};
