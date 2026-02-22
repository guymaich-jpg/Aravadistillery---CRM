// Simple password-based auth — no external SSO.
// Passwords are stored as SHA-256 hashes, never as plaintext.

const USERS = [
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

export async function login(
  email: string,
  password: string,
): Promise<{ ok: true; user: CRMSession } | { ok: false; error: string }> {
  const user = USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
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
}

export function isKnownEmail(email: string): boolean {
  return USERS.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
}
