// Security tests — authentication validation

import { describe, it, expect, beforeEach } from 'vitest';
import { login, getSession, isKnownEmail } from '../simpleAuth';

describe('Authentication Security', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rejects incorrect passwords', async () => {
    const result = await login('guymaich@gmail.com', 'WrongPassword');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('סיסמה שגויה');
    }
  });

  it('rejects unknown email addresses', async () => {
    const result = await login('hacker@evil.com', 'password123');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('המשתמש אינו קיים במערכת');
    }
  });

  it('is case-insensitive for email matching', async () => {
    const result = await login('GuyMaich@Gmail.COM', 'Guy1234');
    expect(result.ok).toBe(true);
  });

  it('trims whitespace from email', async () => {
    const result = await login('  guymaich@gmail.com  ', 'Guy1234');
    expect(result.ok).toBe(true);
  });

  it('never stores password in plaintext in session', async () => {
    await login('guymaich@gmail.com', 'Guy1234');
    const raw = localStorage.getItem('crm_session_v1');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('Guy1234');
    // Also check it doesn't contain the hash
    expect(raw).not.toContain('e1a6d50e701cf475352a154474c4ebee34e5997ca9e473b0042ca9abaa48002a');
  });

  it('session token contains only email, name, and loginAt', async () => {
    const result = await login('guymaich@gmail.com', 'Guy1234');
    expect(result.ok).toBe(true);
    const session = getSession();
    expect(session).not.toBeNull();
    const keys = Object.keys(session!);
    expect(keys).toContain('email');
    expect(keys).toContain('name');
    expect(keys).toContain('loginAt');
    expect(keys).not.toContain('password');
    expect(keys).not.toContain('passwordHash');
  });

  it('isKnownEmail correctly identifies known and unknown emails', () => {
    expect(isKnownEmail('guymaich@gmail.com')).toBe(true);
    expect(isKnownEmail('yonatangarini@gmail.com')).toBe(true);
    expect(isKnownEmail('unknown@example.com')).toBe(false);
  });

  it('does not create session on failed login', async () => {
    await login('guymaich@gmail.com', 'WrongPassword');
    expect(getSession()).toBeNull();
  });
});
