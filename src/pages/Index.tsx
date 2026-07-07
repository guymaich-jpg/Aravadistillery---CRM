import { lazy, Suspense, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ClientsScreen } from '@/components/clients/ClientsScreen';
import { OrdersScreen } from '@/components/orders/OrdersScreen';
import { NewOrderScreen } from '@/components/orders/NewOrderScreen';
import { StorageErrorBanner } from '@/components/shared/StorageErrorBanner';
import { getSession } from '@/lib/auth/simpleAuth';
import { isManager } from '@/lib/auth/managers';
import type { TabId } from '@/config/tabs';

// Lazy-loaded screens (less frequently used, heavier bundles)
const InventoryScreen = lazy(() => import('@/components/inventory/InventoryScreen').then(m => ({ default: m.InventoryScreen })));
const AnalyticsScreen = lazy(() => import('@/components/analytics/AnalyticsScreen').then(m => ({ default: m.AnalyticsScreen })));
const FactoryScreen = lazy(() => import('@/components/factory/FactoryScreen').then(m => ({ default: m.FactoryScreen })));
const ManagementScreen = lazy(() => import('@/components/management/ManagementScreen').then(m => ({ default: m.ManagementScreen })));
const ProductsScreen = lazy(() => import('@/components/products/ProductsScreen').then(m => ({ default: m.ProductsScreen })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <span className="inline-block w-6 h-6 border-2 border-[#716a56]/30 border-t-[#716a56] rounded-full animate-spin" />
    </div>
  );
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const segment = window.location.pathname.split('/').filter(Boolean).pop() ?? '';
    const deepLinkable: TabId[] = ['clients', 'orders', 'inventory', 'analytics', 'products', 'management'];
    return deepLinkable.includes(segment as TabId) ? (segment as TabId) : 'clients';
  });

  function renderTab() {
    switch (activeTab) {
      case 'clients':
        return <ClientsScreen />;
      case 'orders':
        return <OrdersScreen onNewOrder={() => setActiveTab('new-order')} />;
      case 'new-order':
        return (
          <NewOrderScreen
            onSuccess={() => setActiveTab('orders')}
            onCancel={() => setActiveTab('orders')}
          />
        );
      case 'inventory':
        return <InventoryScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'factory':
        return <FactoryScreen />;
      case 'products': {
        const session = getSession();
        if (!session || !isManager(session.email)) {
          setActiveTab('clients');
          return <ClientsScreen />;
        }
        return <ProductsScreen />;
      }
      case 'management': {
        const session = getSession();
        if (!session || !isManager(session.email)) {
          setActiveTab('clients');
          return <ClientsScreen />;
        }
        return <ManagementScreen />;
      }
      default:
        return <ClientsScreen />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#efefec]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm">
        דלג לתוכן ראשי
      </a>
      <Header onNewOrder={() => setActiveTab('new-order')} />
      <OfflineBanner />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main id="main-content" className="flex-1 overflow-y-auto pb-16 sm:pb-0">
        <StorageErrorBanner />
        <Suspense fallback={<TabFallback />}>
          {renderTab()}
        </Suspense>
      </main>
    </div>
  );
}
