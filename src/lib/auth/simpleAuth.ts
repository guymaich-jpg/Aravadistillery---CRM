// Authentication module — uses Firebase Auth when available,
// falls back to local SHA-256 password-based auth.

import { hasFirebaseConfig } from '../firebase/config';

// ── Local auth fallback (no Firebase) ───────────────────────────────────────

const LOCAL_USERS = [
  {
    email: 'guymaich@gmail.com',
    name: 'גאי מאיך',
    // SHA-256 of "Guy1234"
    passwordHash: 'e1a6d50e701cf475352a154474c4ebee34e5997ca9e473b0042ca9abaa48002a',
  },
  {
    email: 'yonatangarini@gmail.com',
    name: 'יונתן גריני',
    // SHA-256 of "Yon1234"
    passwordHash: 'ac9680e7b18792f34240c10be30ae823542e9521adeb42090f66a265cad57853',
  },
];

const SESSION_KEY = 'crm_session_v1';

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
  const user = LOCAL_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return { ok: false, error: 'המשתמש אינו קיים במערכת' };
  }
  const hash = await sha256(password);
  if (hash !== user.passwordHash) {
    return { ok: false, error: 'סיסמה שגויה' };
  }
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
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      return { ok: false, error: 'המשתמש אינו קיים במערכת' };
    }
    if (error.code === 'auth/wrong-password') {
      return { ok: false, error: 'סיסמה שגויה' };
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
    return JSON.parse(raw) as CRMSession;
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

export function isKnownEmail(email: string): boolean {
  // In Firebase mode, we can't check locally — assume any email could be valid
  if (hasFirebaseConfig()) return false;
  return LOCAL_USERS.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
}
