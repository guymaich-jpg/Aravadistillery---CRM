import { useState } from 'react';
import { login, register } from '@/lib/auth/simpleAuth';
import { hasFirebaseConfig } from '@/lib/firebase/config';
import {
  createAccessRequest,
  getApprovedRequest,
  getPendingRequest,
} from '@/lib/accessRequests';
import { sendAccessRequestEmails, isEmailServiceConfigured } from '@/lib/emailService';
import { Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

type Screen = 'login' | 'request' | 'pending' | 'create-account';

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [screen, setScreen] = useState<Screen>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Request access state
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestSending, setRequestSending] = useState(false);

  // Create account state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Privacy
  const [showPrivacy, setShowPrivacy] = useState(false);

  // ── Login handler ─────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      onLogin();
    } else {
      setError(result.error);
    }
  }

  // ── Check email for access request status ─────────────────────────────────

  async function handleCheckAccess() {
    if (!hasFirebaseConfig()) return;
    setLoading(true);
    setError('');

    // Check if already approved
    const approved = await getApprovedRequest(email).catch(() => null);
    if (approved) {
      setRegEmail(email);
      setRegName(approved.name);
      setScreen('create-account');
      setLoading(false);
      return;
    }

    // Check if pending
    const pending = await getPendingRequest(email).catch(() => null);
    if (pending) {
      setScreen('pending');
      setLoading(false);
      return;
    }

    // No request yet — show the request form
    setRequestEmail(email);
    setScreen('request');
    setLoading(false);
  }

  // ── Submit access request ─────────────────────────────────────────────────

  async function handleRequestAccess() {
    if (!requestName.trim() || !requestEmail.trim()) return;
    setRequestSending(true);
    setError('');
    try {
      const request = await createAccessRequest(requestEmail, requestName);
      await sendAccessRequestEmails(request);
      setScreen('pending');
    } catch {
      setError('שגיאה בשליחת הבקשה. נסה שוב.');
    }
    setRequestSending(false);
  }

  // ── Create account (after approval) ───────────────────────────────────────

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');
    if (regPassword !== regConfirm) {
      setRegError('הסיסמאות אינן תואמות.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }
    setRegLoading(true);
    const result = await register(regEmail, regPassword, regName);
    setRegLoading(false);
    if (result.ok) {
      onLogin();
    } else {
      setRegError(result.error);
    }
  }

  // ── Shared layout wrapper ─────────────────────────────────────────────────

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl brand-gradient items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
              A
            </div>
            <h1 className="text-2xl font-bold text-[#252525]">Aravadistillery CRM</h1>
            <p className="text-sm text-[#716a56] mt-1">מערכת ניהול לקוחות</p>
          </div>

          {children}

          <p className="text-center text-xs text-[#716a56] mt-6">
            גישה מורשית בלבד · Aravadistillery CRM © {new Date().getFullYear()}
            {' · '}
            <button onClick={() => setShowPrivacy(v => !v)} className="underline hover:text-[#252525] transition-colors">
              מדיניות פרטיות
            </button>
          </p>

          {showPrivacy && (
            <div className="mt-3 bg-white rounded-xl border border-gray-200 p-4 text-xs text-[#716a56] leading-relaxed space-y-2">
              <p className="font-semibold text-[#252525]">מדיניות פרטיות</p>
              <p>המערכת שומרת נתונים באופן מקומי בדפדפן או בשרתי Firebase מאובטחים. הנתונים אינם משותפים עם צדדים שלישיים.</p>
              <p>לבקשות הנוגעות לנתונים אישיים, ניתן לפנות למנהל המערכת.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Screen: Login ─────────────────────────────────────────────────────────

  if (screen === 'login') {
    return (
      <Wrapper>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <h2 className="text-base font-semibold text-[#252525] text-center">כניסה למערכת</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-[#716a56] mb-1.5">אימייל</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
                dir="ltr"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2c332f]/20 focus:border-[#2c332f] transition-all"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-[#716a56] mb-1.5">סיסמה</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                dir="ltr"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2c332f]/20 focus:border-[#2c332f] transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#2c332f] text-white rounded-xl text-sm font-semibold hover:bg-[#1e2420] active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'כניסה'
              )}
            </button>
          </form>

          {/* Request Access link */}
          <div className="border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-[#716a56] mb-2">אין לך חשבון?</p>
            <button
              onClick={() => {
                setRequestEmail(email);
                if (hasFirebaseConfig() && email.trim()) {
                  handleCheckAccess();
                } else {
                  setScreen('request');
                }
              }}
              className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              בקש גישה למערכת
            </button>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ── Screen: Request Access ────────────────────────────────────────────────

  if (screen === 'request') {
    return (
      <Wrapper>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <h2 className="text-base font-semibold text-[#252525] text-center">בקשת גישה למערכת</h2>
          <p className="text-xs text-[#716a56] text-center">
            מלא את הפרטים ובקשתך תישלח למנהלי המערכת לאישור.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">שם מלא</label>
              <input
                type="text"
                value={requestName}
                onChange={e => setRequestName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
                placeholder="שם מלא"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">אימייל</label>
              <input
                type="email"
                value={requestEmail}
                onChange={e => setRequestEmail(e.target.value)}
                dir="ltr"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
                placeholder="name@example.com"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleRequestAccess}
              disabled={!requestEmail.trim() || !requestName.trim() || requestSending}
              className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {requestSending ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'שלח בקשת גישה'
              )}
            </button>
          </div>

          {!isEmailServiceConfigured() && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center">
              שירות האימייל לא מוגדר. הבקשה תישמר אך לא תישלח הודעה למנהלים.
            </p>
          )}

          <button
            onClick={() => { setScreen('login'); setError(''); }}
            className="w-full text-center text-xs text-[#716a56] hover:text-[#252525] transition-colors"
          >
            חזור לכניסה
          </button>
        </div>
      </Wrapper>
    );
  }

  // ── Screen: Pending ───────────────────────────────────────────────────────

  if (screen === 'pending') {
    return (
      <Wrapper>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5 text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-amber-100 items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-base font-semibold text-[#252525]">הבקשה נשלחה</h2>
          <p className="text-sm text-[#716a56]">
            בקשת הגישה שלך נשלחה למנהלי המערכת.
            <br />
            תקבל גישה ברגע שאחד המנהלים יאשר את הבקשה.
          </p>
          <p className="text-xs text-[#716a56]">
            חזור לדף הכניסה ונסה להיכנס לאחר קבלת האישור.
          </p>
          <button
            onClick={() => { setScreen('login'); setError(''); }}
            className="w-full py-3 bg-[#2c332f] text-white rounded-xl text-sm font-semibold hover:bg-[#1e2420] active:scale-[0.98] transition-all shadow-sm"
          >
            חזור לכניסה
          </button>

          {/* Allow checking again */}
          <button
            onClick={async () => {
              const approved = await getApprovedRequest(requestEmail || email).catch(() => null);
              if (approved) {
                setRegEmail(approved.email);
                setRegName(approved.name);
                setScreen('create-account');
              }
            }}
            className="text-xs text-amber-600 hover:text-amber-700 transition-colors"
          >
            בדוק אם הבקשה אושרה
          </button>
        </div>
      </Wrapper>
    );
  }

  // ── Screen: Create Account (after approval) ───────────────────────────────

  if (screen === 'create-account') {
    return (
      <Wrapper>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-full bg-green-100 items-center justify-center mx-auto">
              <span className="text-xl text-green-600 font-bold">✓</span>
            </div>
            <h2 className="text-base font-semibold text-[#252525]">הבקשה אושרה!</h2>
            <p className="text-xs text-[#716a56]">צור חשבון כדי להיכנס למערכת.</p>
          </div>

          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">שם מלא</label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">אימייל</label>
              <input
                type="email"
                value={regEmail}
                readOnly
                dir="ltr"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-[#716a56]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">סיסמה</label>
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required
                dir="ltr"
                minLength={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all"
                placeholder="מינימום 6 תווים"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#716a56] mb-1.5">אישור סיסמה</label>
              <input
                type="password"
                value={regConfirm}
                onChange={e => setRegConfirm(e.target.value)}
                required
                dir="ltr"
                minLength={6}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 transition-all"
                placeholder="הזן סיסמה שוב"
              />
            </div>

            {regError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{regError}</p>
            )}

            <button
              type="submit"
              disabled={regLoading}
              className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
            >
              {regLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'צור חשבון והיכנס'
              )}
            </button>
          </form>

          <button
            onClick={() => { setScreen('login'); setRegError(''); }}
            className="w-full text-center text-xs text-[#716a56] hover:text-[#252525] transition-colors"
          >
            חזור לכניסה
          </button>
        </div>
      </Wrapper>
    );
  }

  return null;
}
