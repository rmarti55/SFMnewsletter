import { afterEach, describe, expect, it } from 'vitest';
import {
  createLoginToken,
  createSessionToken,
  getAdminEmail,
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
    expect(await verifySessionToken(session!)).toBe(true);
    expect(await verifySessionToken(undefined)).toBe(false);
  });

  it('rejects wrong admin email in token payload', async () => {
    process.env.ADMIN_EMAIL = 'ramonlorenzomartinez@gmail.com';
    process.env.AUTH_SECRET = 'test-secret-for-auth-session';

    const login = await createLoginToken('other@example.com');
    expect(login).toBeTruthy();
    expect(await verifyLoginToken(login!)).toBeNull();
  });
});
