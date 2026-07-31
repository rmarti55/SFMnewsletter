import { describe, it, expect } from 'vitest';
import { verifyAdminSecret, isAuthEnabled } from '../src/lib/auth-config';

describe('auth', () => {
  it('is disabled when ADMIN_SECRET unset', () => {
    const saved = process.env.ADMIN_SECRET;
    delete process.env.ADMIN_SECRET;
    expect(isAuthEnabled()).toBe(false);
    expect(verifyAdminSecret('anything')).toBe(true);
    process.env.ADMIN_SECRET = saved;
  });

  it('verifies matching secret', () => {
    process.env.ADMIN_SECRET = 'test-secret-value';
    expect(verifyAdminSecret('test-secret-value')).toBe(true);
    expect(verifyAdminSecret('wrong')).toBe(false);
  });
});
