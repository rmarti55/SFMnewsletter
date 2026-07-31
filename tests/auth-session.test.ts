import { afterEach, describe, expect, it } from 'vitest';
import {
  SESSION_TTL_SEC,
  createLoginToken,
  createSessionToken,
  getAdminEmail,
  getSessionEmail,
  isAuthEnabled,
  verifyLoginToken,
  verifySessionToken,
} from '../src/lib/auth-session';

describe('auth-session', () => {
  const savedAdmin = process.env.ADMIN_EMAIL;
  const savedSecret = process.env.AUTH_SECRET;

  afterEach(() => {
    process.env.ADMIN_EMAIL = savedAdmin;
    process.env.AUTH_SECRET = savedSecret;
  });

  it('is disabled when env vars are missing', () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.AUTH_SECRET;
    expect(isAuthEnabled()).toBe(false);
    expect(getAdminEmail()).toBeUndefined();
  });

  it('creates and verifies login and session tokens', async () => {
    process.env.ADMIN_EMAIL = 'ramonlorenzomartinez@gmail.com';
    process.env.AUTH_SECRET = 'test-secret-for-auth-session';

    expect(isAuthEnabled()).toBe(true);

    const login = await createLoginToken('ramonlorenzomartinez@gmail.com');
    expect(login).toBeTruthy();
    expect(await verifyLoginToken(login!)).toBe('ramonlorenzomartinez@gmail.com');
    expect(await verifyLoginToken('bad.token')).toBeNull();

    const session = await createSessionToken('ramonlorenzomartinez@gmail.com');
    expect(session).toBeTruthy();
    expect(await getSessionEmail(session!)).toBe('ramonlorenzomartinez@gmail.com');
    expect(await verifySessionToken(session!)).toBe(true);
    expect(await verifySessionToken(undefined)).toBe(false);
    expect(await getSessionEmail(undefined)).toBeNull();
  });

  it('uses a 400-day session TTL', () => {
    expect(SESSION_TTL_SEC).toBe(400 * 24 * 60 * 60);
  });

  it('rejects wrong admin email in token payload', async () => {
    process.env.ADMIN_EMAIL = 'ramonlorenzomartinez@gmail.com';
    process.env.AUTH_SECRET = 'test-secret-for-auth-session';

    const login = await createLoginToken('other@example.com');
    expect(login).toBeTruthy();
    expect(await verifyLoginToken(login!)).toBeNull();
  });
});
