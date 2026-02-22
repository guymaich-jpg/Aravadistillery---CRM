import { useState, useEffect } from 'react';
import { getSession, type CRMSession } from '@/lib/auth/simpleAuth';
import { LoginScreen } from './LoginScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  // undefined = still checking, null = not logged in, CRMSession = logged in
  const [session, setSession] = useState<CRMSession | null | undefined>(undefined);

  useEffect(() => {
    setSession(getSession());
  }, []);

  if (session === undefined) {
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

  if (!session) {
    return <LoginScreen onLogin={() => setSession(getSession())} />;
  }

  return <>{children}</>;
}
