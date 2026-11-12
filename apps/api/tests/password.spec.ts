import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/password.js';

describe('password hashing', () => {
  it('stores a salted scrypt hash and verifies the original password', async () => {
    const passwordHash = await hashPassword('correct-horse-battery-staple');

    expect(passwordHash).toMatch(/^scrypt\$/);
    expect(passwordHash).not.toContain('correct-horse-battery-staple');
    await expect(verifyPassword('correct-horse-battery-staple', passwordHash)).resolves.toBe(true);
  });

  it('rejects an incorrect password and malformed hash', async () => {
    const passwordHash = await hashPassword('correct-horse-battery-staple');

    await expect(verifyPassword('incorrect-password', passwordHash)).resolves.toBe(false);
    await expect(verifyPassword('anything', 'invalid')).resolves.toBe(false);
  });
});
