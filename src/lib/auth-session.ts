export const SESSION_COOKIE = 'sfn_session';

const LOGIN_TTL_SEC = 15 * 60;
export const SESSION_TTL_SEC = 400 * 24 * 60 * 60;

type TokenPurpose = 'login' | 'session';

interface TokenPayload {
  email: string;
  exp: number;
  purpose: TokenPurpose;
}

export function isAuthEnabled(): boolean {
  return Boolean(getAdminEmail() && getAuthSecret());
}

export function getAdminEmail(): string | undefined {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || undefined;
}

export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || undefined;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

async function createToken(email: string, purpose: TokenPurpose, ttlSec: number): Promise<string | null> {
  const secret = getAuthSecret();
  if (!secret) return null;
  const payload: TokenPayload = {
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSec,
    purpose,
  };
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSign(body, secret);
  return `${body}.${sig}`;
}

async function parseToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  const secret = getAuthSecret();
  if (!secret) return null;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(body, secret);
  if (!timingSafeEqual(sig, expected)) return null;

  const raw = base64UrlDecode(body);
  if (!raw) return null;

  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw)) as TokenPayload;
  } catch {
    return null;
  }

  if (payload.purpose !== purpose) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  const admin = getAdminEmail();
  if (!admin || payload.email !== admin) return null;
  return payload.email;
}

export async function createLoginToken(email: string): Promise<string | null> {
  return createToken(email, 'login', LOGIN_TTL_SEC);
}

export async function verifyLoginToken(token: string): Promise<string | null> {
  return parseToken(token, 'login');
}

export async function createSessionToken(email: string): Promise<string | null> {
  return createToken(email, 'session', SESSION_TTL_SEC);
}

export async function getSessionEmail(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  return parseToken(token, 'session');
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return Boolean(await getSessionEmail(token));
}

export function sessionCookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  };
}

export function appBaseUrl(requestUrl?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (requestUrl) return new URL(requestUrl).origin;
  return 'http://localhost:3000';
}
