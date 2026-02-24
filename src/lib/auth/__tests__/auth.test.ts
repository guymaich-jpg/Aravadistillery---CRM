// Security tests — authentication validation

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, getSession, _resetLoginAttempts } from '../simpleAuth';

// Force local auth path in tests (Firebase may be configured via .env.local)
vi.mock('../../firebase/config', () => ({
  hasFirebaseConfig: () => false,
}));

describe('Authentication Security', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetLoginAttempts();
  });

  it('rejects incorrect passwords', async () => {
    const result = await login('admin@dev.local', 'WrongPassword');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('אימייל או סיסמה שגויים');
    }
  });

  it('rejects unknown email addresses', async () => {
    const result = await login('hacker@evil.com', 'password123');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('אימייל או סיסמה שגויים');
    }
  });

  it('returns same error for unknown email and wrong password', async () => {
    const unknownEmail = await login('unknown@example.com', 'password');
    _resetLoginAttempts();
    const wrongPassword = await login('admin@dev.local', 'WrongPass');
    expect(unknownEmail.ok).toBe(false);
    expect(wrongPassword.ok).toBe(false);
    if (!unknownEmail.ok && !wrongPassword.ok) {
      expect(unknownEmail.error).toBe(wrongPassword.error);
    }
  });

  it('is case-insensitive for email matching', async () => {
    const result = await login('Admin@Dev.LOCAL', 'Admin1234');
    expect(result.ok).toBe(true);
  });

  it('trims whitespace from email', async () => {
    const result = await login('  admin@dev.local  ', 'Admin1234');
    expect(result.ok).toBe(true);
  });

  it('never stores password in plaintext in session', async () => {
    await login('admin@dev.local', 'Admin1234');
    const raw = localStorage.getItem('crm_session_v1');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('Admin1234');
    expect(raw).not.toContain('60fe74406e7f353ed979f350f2fbb6a2e8690a5fa7d1b0c32983d1d8b3f95f67');
  });

  it('session token contains only email, name, and loginAt', async () => {
    const result = await login('admin@dev.local', 'Admin1234');
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

  it('does not create session on failed login', async () => {
    await login('admin@dev.local', 'WrongPassword');
    expect(getSession()).toBeNull();
  });
});

describe('Login Rate Limiting', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetLoginAttempts();
  });

  it('locks out after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await login('admin@dev.local', 'WrongPass');
    }
    const result = await login('admin@dev.local', 'Admin1234');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('נסיונות רבים מדי');
    }
  });

  it('lockout expires after timeout', async () => {
    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      await login('admin@dev.local', 'WrongPass');
    }
    // Still locked
    let result = await login('admin@dev.local', 'Admin1234');
    expect(result.ok).toBe(false);

    // Advance time past lockout
    vi.advanceTimersByTime(61_000);

    result = await login('admin@dev.local', 'Admin1234');
    expect(result.ok).toBe(true);
    vi.useRealTimers();
  });

  it('successful login resets attempt counter', async () => {
    // 4 failures (just under limit)
    for (let i = 0; i < 4; i++) {
      await login('admin@dev.local', 'WrongPass');
    }
    // Success resets counter
    await login('admin@dev.local', 'Admin1234');

    // 4 more failures should not trigger lockout
    for (let i = 0; i < 4; i++) {
      await login('admin@dev.local', 'WrongPass');
    }
    const result = await login('admin@dev.local', 'Admin1234');
    expect(result.ok).toBe(true);
  });
});
