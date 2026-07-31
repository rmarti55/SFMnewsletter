import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { appBaseUrl, createLoginToken, getAdminEmail, isAuthEnabled } from '@/lib/auth-session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ ok: true, authDisabled: true });
  }

  let body: { email?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const adminEmail = getAdminEmail();
  const generic = { ok: true, message: 'If that address is allowed, check your inbox for a login link.' };

  if (!adminEmail || email !== adminEmail) {
    return NextResponse.json(generic);
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 503 });
  }

  const from = process.env.EMAIL_FROM?.trim();
  if (process.env.VERCEL && !from) {
    return NextResponse.json({ error: 'EMAIL_FROM is required in production' }, { status: 503 });
  }

  const token = await createLoginToken(email);
  if (!token) {
    return NextResponse.json({ error: 'Auth is not configured' }, { status: 503 });
  }

  const origin = appBaseUrl(request.url);
  const loginUrl = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: from || 'Santa Fe Newsletter <onboarding@resend.dev>',
    to: email,
    subject: 'Santa Fe Newsletter admin login',
    text: `Sign in to the Santa Fe Newsletter admin:\n\n${loginUrl}\n\nThis link expires in 15 minutes. If you did not request this, ignore this email.`,
  });

  if (error) {
    console.error('auth request-link send error:', error);
    return NextResponse.json({ error: 'Failed to send login email' }, { status: 500 });
  }

  return NextResponse.json(generic);
}
