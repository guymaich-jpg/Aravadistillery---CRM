import { RootProvider } from '@/store/root.provider';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import Index from '@/pages/Index';

export default function App() {
  return (
    <ErrorBoundary>
      <RootProvider>
        <Index />
      </RootProvider>
    </ErrorBoundary>
  );
}
