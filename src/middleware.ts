import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, getAdminSecret, verifyAdminCookie, verifyAdminSecret } from '@/lib/auth-config';

export function middleware(request: NextRequest) {
  if (!getAdminSecret()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login' || pathname === '/api/auth/login') {
    return NextResponse.next();
  }

  const bearer = request.headers.get('authorization');
  if (bearer?.startsWith('Bearer ') && verifyAdminSecret(bearer.slice(7))) {
    return NextResponse.next();
  }

  if (verifyAdminCookie(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
