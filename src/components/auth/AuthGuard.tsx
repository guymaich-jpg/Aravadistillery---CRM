import { useAuth0 } from '@auth0/auth0-react';
import { LoginScreen } from './LoginScreen';
import { isAuth0Configured } from '@/lib/auth/config';

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Full-page loading spinner shown while Auth0 checks session. */
function LoadingGate() {
  return (
    <div className="min-h-screen bg-[#efefec] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex w-12 h-12 rounded-xl brand-gradient items-center justify-center text-white text-xl font-bold animate-pulse">
          א
        </div>
        <p className="text-sm text-[#716a56]">טוען…</p>
      </div>
    </div>
  );
}

/** Shown if VITE_AUTH0_DOMAIN / VITE_AUTH0_CLIENT_ID are not set. */
function MisconfiguredGate() {
  return (
    <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-sm w-full text-center space-y-3">
        <div className="text-3xl">⚠️</div>
        <h2 className="font-semibold text-[#252525]">Auth0 לא מוגדר</h2>
        <p className="text-sm text-[#716a56]">
          חסרים משתני הסביבה{' '}
          <code className="bg-gray-100 px-1 rounded text-xs">VITE_AUTH0_DOMAIN</code> ו-
          <code className="bg-gray-100 px-1 rounded text-xs">VITE_AUTH0_CLIENT_ID</code>.
        </p>
        <p className="text-xs text-gray-400">
          הוסף אותם כסודות ב-GitHub Actions ונסה שוב.
        </p>
      </div>
    </div>
  );
}

/**
 * AuthGuard — wraps the entire app.
 * - If Auth0 env vars are missing: shows a configuration error.
 * - While Auth0 loads: shows a branded spinner.
 * - If not authenticated: shows LoginScreen.
 * - If authenticated: renders children.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  if (!isAuth0Configured()) {
    return <MisconfiguredGate />;
  }

  return <AuthGuardInner>{children}</AuthGuardInner>;
}

function AuthGuardInner({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated, error } = useAuth0();

  if (isLoading) return <LoadingGate />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#efefec] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-sm w-full text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h2 className="font-semibold text-[#252525]">שגיאת אימות</h2>
          <p className="text-sm text-red-600">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-[#2c332f] text-white text-sm rounded-lg hover:bg-[#1e2420] transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  return <>{children}</>;
}
