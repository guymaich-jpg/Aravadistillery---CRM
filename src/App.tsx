import { AuthGuard } from '@/components/auth/AuthGuard';
import { RootProvider } from '@/store/root.provider';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import Index from '@/pages/Index';

export default function App() {
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
