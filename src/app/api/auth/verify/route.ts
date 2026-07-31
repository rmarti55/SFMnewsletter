import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  createSessionToken,
  isAuthEnabled,
  sessionCookieOptions,
  verifyLoginToken,
} from '@/lib/auth-session';

export const runtime = 'nodejs';

const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const nextPath = request.nextUrl.searchParams.get('next') || '/admin';
  const loginUrl = new URL('/admin/login', request.url);

  if (!isAuthEnabled()) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    loginUrl.searchParams.set('error', 'missing');
    return NextResponse.redirect(loginUrl);
  }

  const email = await verifyLoginToken(token);
  if (!email) {
    loginUrl.searchParams.set('error', 'invalid');
    return NextResponse.redirect(loginUrl);
  }

  const session = await createSessionToken(email);
  if (!session) {
    loginUrl.searchParams.set('error', 'config');
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.redirect(new URL(nextPath, request.url));
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(SESSION_TTL_SEC));
  return res;
}
