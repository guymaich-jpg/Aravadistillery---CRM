import { useState, useEffect } from 'react';
import { getSession, type CRMSession } from '@/lib/auth/simpleAuth';
import { LoginScreen } from './LoginScreen';
import { ApproveScreen } from './ApproveScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

interface ApproveParams {
  action: 'approve' | 'decline';
  requestId: string;
  token: string;
}

/** Parse ?action=approve&requestId=xxx&token=yyy from URL. */
function getApproveParams(): ApproveParams | null {
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const requestId = params.get('requestId');
  const token = params.get('token');
  if ((action === 'approve' || action === 'decline') && requestId && token) {
    return { action, requestId, token };
  }
  return null;
}

/** Remove approve/decline query params from the URL without reloading. */
function clearApproveParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete('action');
  url.searchParams.delete('requestId');
  url.searchParams.delete('token');
  window.history.replaceState({}, '', url.pathname + url.search);
}

export function AuthGuard({ children }: AuthGuardProps) {
  // undefined = still checking, null = not logged in, CRMSession = logged in
  const [session, setSession] = useState<CRMSession | null | undefined>(undefined);
  const [approveParams, setApproveParams] = useState<ApproveParams | null>(null);

  useEffect(() => {
    setSession(getSession());
    setApproveParams(getApproveParams());
  }, []);

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

  // Manager clicked approve/decline link from email — must be logged in first
  if (approveParams) {
    if (!session) {
      return <LoginScreen onLogin={() => setSession(getSession())} />;
    }
    return (
      <ApproveScreen
        requestId={approveParams.requestId}
        token={approveParams.token}
        action={approveParams.action}
        onDone={() => {
          clearApproveParams();
          setApproveParams(null);
        }}
      />
    );
  }

  if (!session) {
    return <LoginScreen onLogin={() => setSession(getSession())} />;
  }

  return <>{children}</>;
}
