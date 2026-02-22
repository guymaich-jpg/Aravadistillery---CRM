import { useState } from 'react';
import { login, isKnownEmail } from '@/lib/auth/simpleAuth';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);

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
      if (!isKnownEmail(email)) {
        setShowRequest(true);
        setRequestEmail(email);
      }
    }
  }

  function handleRequestAccess() {
    const name = requestName.trim() || requestEmail;
    const subject = encodeURIComponent('בקשת גישה למערכת אראבה מזקקה');
    const body = encodeURIComponent(
      `שלום,\n\n${name} מבקש/ת גישה למערכת אראבה מזקקה.\n\nאימייל: ${requestEmail}\n\nאנא אשרו את הבקשה.\n\nתודה`,
    );
    window.location.href = `mailto:guymaich@gmail.com,yonatangarini@gmail.com?subject=${subject}&body=${body}`;
    setRequestSent(true);
  }

  return (
    <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl brand-gradient items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
            א
          </div>
          <h1 className="text-2xl font-bold text-[#252525]">אראבה מזקקה</h1>
          <p className="text-sm text-[#716a56] mt-1">מערכת ניהול לקוחות</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <h2 className="text-base font-semibold text-[#252525] text-center">כניסה למערכת</h2>

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
                  setRequestSent(false);
                }}
                required
                dir="ltr"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2c332f]/20 focus:border-[#2c332f] transition-all"
                placeholder="user@gmail.com"
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
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                'כניסה'
              )}
            </button>
          </form>

          {/* Request Access — shown when unknown email tries to log in */}
          {showRequest && (
            <div className="border-t border-gray-100 pt-5 space-y-3">
              {requestSent ? (
                <div className="bg-green-50 rounded-xl px-4 py-3 text-center space-y-1">
                  <p className="text-sm font-semibold text-green-700">הבקשה נשלחה ✓</p>
                  <p className="text-xs text-green-600">
                    אחד מהמנהלים יצור איתך קשר בהקדם.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#716a56] text-center">
                    המשתמש אינו מורשה. מלא פרטים ושלח בקשת גישה למנהל.
                  </p>
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
                    <label className="block text-xs font-medium text-[#716a56] mb-1.5">אימייל לתשובה</label>
                    <input
                      type="email"
                      value={requestEmail}
                      onChange={e => setRequestEmail(e.target.value)}
                      dir="ltr"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleRequestAccess}
                    disabled={!requestEmail.trim()}
                    className="w-full py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    שלח בקשת גישה
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[#716a56] mt-6">
          גישה מורשית בלבד · אראבה מזקקה © 2026
        </p>
      </div>
    </div>
  );
}
