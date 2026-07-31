import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth-session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/admin/login', request.url));
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
