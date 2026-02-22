import { useAuth0 } from '@auth0/auth0-react';

export function LoginScreen() {
  const { loginWithRedirect, isLoading } = useAuth0();

  return (
    <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl brand-gradient items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
            א
          </div>
          <h1 className="text-2xl font-bold text-[#252525]">אראבה מזקקה</h1>
          <p className="text-sm text-[#716a56] mt-1">מערכת ניהול לקוחות</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-5">
          <div className="text-center">
            <h2 className="text-base font-semibold text-[#252525]">כניסה למערכת</h2>
            <p className="text-xs text-[#716a56] mt-1">
              ההתחברות מאובטחת באמצעות Auth0 SSO
            </p>
          </div>

          <button
            onClick={() => loginWithRedirect()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 bg-[#2c332f] text-white rounded-xl text-sm font-semibold hover:bg-[#1e2420] active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            )}
            <span>כניסה / Sign In</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-gray-300">
            <div className="flex-1 h-px bg-gray-200" />
            <span>מאובטח</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { icon: '🔒', label: 'HTTPS מוצפן' },
              { icon: '🛡️', label: 'Auth0 SSO' },
              { icon: '👤', label: 'רב-משתמשים' },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-[#efefec] rounded-lg py-2 px-1">
                <div className="text-lg mb-0.5">{icon}</div>
                <div className="text-[10px] text-[#716a56] font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-[#716a56] mt-6">
          גישה מורשית בלבד · Arava Distillery © 2026
        </p>
      </div>
    </div>
  );
}
