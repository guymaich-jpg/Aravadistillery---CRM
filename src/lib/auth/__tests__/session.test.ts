// Privacy tests — session management and data isolation

import { describe, it, expect, beforeEach } from 'vitest';
import { login, getSession, logout } from '../simpleAuth';

describe('Session Privacy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a session only for known users', async () => {
    const result = await login('guymaich@gmail.com', 'Guy1234');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.email).toBe('guymaich@gmail.com');
    }
  });

  it('rejects login for unknown users', async () => {
    const result = await login('unknown@example.com', 'password');
    expect(result.ok).toBe(false);
  });

  it('returns null session after logout', async () => {
    await login('guymaich@gmail.com', 'Guy1234');
    expect(getSession()).not.toBeNull();

    logout();
    expect(getSession()).toBeNull();
  });

  it('stores session under the correct key', async () => {
    await login('guymaich@gmail.com', 'Guy1234');
    const raw = localStorage.getItem('crm_session_v1');
    expect(raw).not.toBeNull();
    const session = JSON.parse(raw!);
    expect(session.email).toBe('guymaich@gmail.com');
  });

  it('does not leak data between different user sessions', async () => {
    // Login as user 1
    await login('guymaich@gmail.com', 'Guy1234');
    const session1 = getSession();
    expect(session1?.email).toBe('guymaich@gmail.com');

    // Logout and login as user 2
    logout();
    await login('yonatangarini@gmail.com', 'Yon1234');
    const session2 = getSession();
    expect(session2?.email).toBe('yonatangarini@gmail.com');
    expect(session2?.name).not.toBe(session1?.name);
  });

  it('returns null for invalid JSON in session storage', () => {
    localStorage.setItem('crm_session_v1', 'not-json{{{');
    expect(getSession()).toBeNull();
  });

  it('returns null when no session exists', () => {
    expect(getSession()).toBeNull();
  });
});
