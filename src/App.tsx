import { Auth0Provider } from '@auth0/auth0-react';
import { buildAuth0Config, isAuth0Configured } from '@/lib/auth/config';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { RootProvider } from '@/store/root.provider';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import Index from '@/pages/Index';

function AppCore() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <RootProvider>
          <Index />
        </RootProvider>
      </AuthGuard>
    </ErrorBoundary>
  );
}

export default function App() {
  // Auth0Provider requires a valid domain — skip it if env vars are missing.
  // AuthGuard will show a "misconfigured" error screen in that case.
  if (!isAuth0Configured()) {
    return <AppCore />;
  }

  return (
    <Auth0Provider {...buildAuth0Config()}>
      <AppCore />
    </Auth0Provider>
  );
}
