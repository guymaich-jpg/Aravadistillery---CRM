import { useState } from 'react';
import { login } from '@/lib/auth/simpleAuth';

interface LoginScreenProps {
  onLogin: () => void;
  inviteError?: string;
}

export function LoginScreen({ onLogin, inviteError }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
      setShowRequest(true);
    }
  }

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

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <h2 className="text-base font-semibold text-[#252525] text-center">כניסה למערכת</h2>

          {inviteError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{inviteError}</p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-[#716a56] mb-1.5">אימייל</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setShowRequest(false);
                  setError('');
                }}
                required
                dir="ltr"
                autoComplete="username"
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
                autoComplete="current-password"
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
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                'כניסה'
              )}
            </button>
          </form>

          {/* Request Access — shown when unknown email tries to log in */}
          {showRequest && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <p className="text-xs text-[#716a56] text-center">
                המשתמש אינו מורשה. אם קיבלת קישור הזמנה, השתמש בו כדי ליצור חשבון.
              </p>
              <p className="text-xs text-[#716a56] text-center">
                לבקשת גישה, פנה למנהל המערכת.
              </p>
            </div>
          )}
        </div>

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
