export const ADMIN_COOKIE = 'sfn_admin';

export function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET?.trim() || undefined;
}

export function isAuthEnabled(): boolean {
  return Boolean(getAdminSecret());
}

/** Edge-safe constant-time string compare (middleware). */
export function safeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function verifyAdminCookie(cookieValue: string | undefined): boolean {
  const secret = getAdminSecret();
  if (!secret) return true;
  if (!cookieValue) return false;
  return safeEqualStrings(cookieValue, secret);
}

export function verifyAdminSecret(provided: string): boolean {
  const expected = getAdminSecret();
  if (!expected) return true;
  return safeEqualStrings(provided, expected);
}
