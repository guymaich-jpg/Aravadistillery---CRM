import { useState, useEffect } from 'react';
import { getSession, type CRMSession } from '@/lib/auth/simpleAuth';
import { validateInvitation } from '@/lib/invitations';
import { hasFirebaseConfig } from '@/lib/firebase/config';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import type { Invitation } from '@/types/invitation';

interface AuthGuardProps {
  children: React.ReactNode;
}

type InviteState =
  | { mode: 'none' }
  | { mode: 'loading' }
  | { mode: 'valid'; token: string; invitation: Invitation }
  | { mode: 'invalid'; reason: string };

function clearInviteParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.pathname + url.search);
}

export function AuthGuard({ children }: AuthGuardProps) {
  // undefined = still checking, null = not logged in, CRMSession = logged in
  const [session, setSession] = useState<CRMSession | null | undefined>(undefined);
  const [inviteState, setInviteState] = useState<InviteState>({ mode: 'none' });

  useEffect(() => {
    const currentSession = getSession();
    setSession(currentSession);

    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');

    if (token && !currentSession && hasFirebaseConfig()) {
      setInviteState({ mode: 'loading' });
      validateInvitation(token).then(result => {
        if (result.valid) {
          setInviteState({ mode: 'valid', token, invitation: result.invitation });
        } else {
          setInviteState({ mode: 'invalid', reason: result.reason });
        }
      }).catch(() => {
        setInviteState({ mode: 'invalid', reason: 'שגיאה באימות ההזמנה.' });
      });
    } else if (token && currentSession) {
      clearInviteParam();
    }
  }, []);

  // Loading
  if (session === undefined) {
    return (
      <div className="min-h-screen bg-[#efefec] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex w-12 h-12 rounded-xl brand-gradient items-center justify-center text-white text-xl font-bold animate-pulse">
            A
          </div>
          <p className="text-sm text-[#716a56]">טוען…</p>
        </div>
      </div>
    );
  }

  // Invite validation loading
  if (!session && inviteState.mode === 'loading') {
    return (
      <div className="min-h-screen bg-[#efefec] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex w-12 h-12 rounded-xl brand-gradient items-center justify-center text-white text-xl font-bold animate-pulse">
            A
          </div>
          <p className="text-sm text-[#716a56]">מאמת הזמנה…</p>
        </div>
      </div>
    );
  }

  // Valid invite — show registration
  if (!session && inviteState.mode === 'valid') {
    return (
      <RegisterScreen
        token={inviteState.token}
        invitation={inviteState.invitation}
        onRegister={() => {
          clearInviteParam();
          setSession(getSession());
        }}
      />
    );
  }

  // Invalid invite — show login with error
  if (!session && inviteState.mode === 'invalid') {
    return (
      <LoginScreen
        onLogin={() => setSession(getSession())}
        inviteError={inviteState.reason}
      />
    );
  }

  // Not logged in
  if (!session) {
    return <LoginScreen onLogin={() => setSession(getSession())} />;
  }

  return <>{children}</>;
}
