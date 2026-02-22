import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { ClientsScreen } from '@/components/clients/ClientsScreen';
import { OrdersScreen } from '@/components/orders/OrdersScreen';
import { NewOrderScreen } from '@/components/orders/NewOrderScreen';
import { InventoryScreen } from '@/components/inventory/InventoryScreen';
import { AnalyticsScreen } from '@/components/analytics/AnalyticsScreen';
import { FactoryScreen } from '@/components/factory/FactoryScreen';
import type { TabId } from '@/config/tabs';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>('clients');

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
      default:
        return <ClientsScreen />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#efefec]">
      <Header onNewOrder={() => setActiveTab('new-order')} />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto pb-[72px] sm:pb-0">
        {renderTab()}
      </main>
    </div>
  );
}
