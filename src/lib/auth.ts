import { timingSafeEqual } from 'crypto';
import { getAdminSecret, safeEqualStrings } from './auth-config';

export { ADMIN_COOKIE, getAdminSecret, isAuthEnabled, verifyAdminCookie } from './auth-config';

/** Node routes — prefer timingSafeEqual when available. */
export function verifyAdminSecretNode(provided: string): boolean {
  const expected = getAdminSecret();
  if (!expected) return true;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return safeEqualStrings(provided, expected);
  }
}
