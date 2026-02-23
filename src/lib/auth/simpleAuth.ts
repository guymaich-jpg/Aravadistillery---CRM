// Authentication module — uses Firebase Auth when available,
// falls back to local SHA-256 password-based auth.
//
// NOTE: Local auth is a **development-only** fallback for environments where
// Firebase is not configured. In production, always set VITE_FIREBASE_PROJECT_ID
// so that Firebase Authentication is used instead.

import { hasFirebaseConfig } from '../firebase/config';

// ── Local auth fallback (no Firebase) ───────────────────────────────────────

// Dev-only fallback users — used when Firebase is not configured.
// Passwords: Admin1234 / User1234
// Guarded by import.meta.env.DEV so Vite eliminates credentials from production builds.
const LOCAL_USERS = import.meta.env.DEV
  ? [
      {
        email: 'admin@dev.local',
        name: 'Dev Admin',
        passwordHash: '60fe74406e7f353ed979f350f2fbb6a2e8690a5fa7d1b0c32983d1d8b3f95f67',
      },
      {
        email: 'user@dev.local',
        name: 'Dev User',
        passwordHash: 'bd5cf8347e036cabe6cd37323186a02ef6c3589d19daaee31eeb2ae3b1507ebe',
      },
    ]
  : [];

const SESSION_KEY = 'crm_session_v1';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Rate limiting (local auth only) ──────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000; // 1 minute
const _loginAttempts = { count: 0, lockedUntil: 0 };

/** Exported for testing — do not use in production code. */
export function _resetLoginAttempts() {
  if (!import.meta.env.DEV) return;
  _loginAttempts.count = 0;
  _loginAttempts.lockedUntil = 0;
}

export interface CRMSession {
  email: string;
  name: string;
  loginAt: string;
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loginLocal(
  email: string,
  password: string,
): Promise<{ ok: true; user: CRMSession } | { ok: false; error: string }> {
  // Local auth is stripped from production builds
  if (!import.meta.env.DEV) {
    return { ok: false, error: 'Local auth is not available.' };
  }

  // Rate limiting
  if (Date.now() < _loginAttempts.lockedUntil) {
    return { ok: false, error: 'נסיונות רבים מדי. נסה שוב בעוד דקה.' };
  }

  const user = LOCAL_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    _loginAttempts.count++;
    if (_loginAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      _loginAttempts.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    return { ok: false, error: 'אימייל או סיסמה שגויים' };
  }
  const hash = await sha256(password);
  if (hash !== user.passwordHash) {
    _loginAttempts.count++;
    if (_loginAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      _loginAttempts.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    return { ok: false, error: 'אימייל או סיסמה שגויים' };
  }

  // Success — reset counter
  _loginAttempts.count = 0;
  _loginAttempts.lockedUntil = 0;

  const session: CRMSession = {
    email: user.email,
    name: user.name,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

// ── Firebase Auth ───────────────────────────────────────────────────────────

async function loginFirebase(
  email: string,
  password: string,
): Promise<{ ok: true; user: CRMSession } | { ok: false; error: string }> {
  try {
    const { getFirebaseAuth } = await import('../firebase/config');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const auth = getFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const session: CRMSession = {
      email: credential.user.email ?? email.trim(),
      name: credential.user.displayName ?? email.trim().split('@')[0],
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, user: session };
  } catch (e) {
    const error = e as { code?: string };
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password'
    ) {
      return { ok: false, error: 'אימייל או סיסמה שגויים' };
    }
    return { ok: false, error: 'שגיאה בהתחברות. נסה שוב.' };
  }
}

// ── Public API (unchanged interface) ────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; user: CRMSession } | { ok: false; error: string }> {
  if (hasFirebaseConfig()) {
    return loginFirebase(email, password);
  }
  return loginLocal(email, password);
}

export function getSession(): CRMSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as CRMSession;
    // Enforce session TTL
    if (session.loginAt) {
      const elapsed = Date.now() - new Date(session.loginAt).getTime();
      if (elapsed > SESSION_TTL_MS) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    }
    return session;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  // Also sign out of Firebase if available
  if (hasFirebaseConfig()) {
    import('../firebase/config').then(({ getFirebaseAuth }) => {
      import('firebase/auth').then(({ signOut }) => {
        signOut(getFirebaseAuth()).catch(() => {});
      });
    });
  }
}

