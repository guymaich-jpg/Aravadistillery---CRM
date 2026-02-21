import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { OrderCard } from './OrderCard';
import { OrderEditDialog } from './OrderEditDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { PAYMENT_STATUS_LABELS } from '@/lib/constants';
import type { Order, PaymentStatus } from '@/types/crm';

const STATUS_TABS: { value: 'all' | PaymentStatus; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'paid', label: PAYMENT_STATUS_LABELS.paid },
  { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
  { value: 'partial', label: PAYMENT_STATUS_LABELS.partial },
];

interface OrdersScreenProps {
  onNewOrder: () => void;
}

export function OrdersScreen({ onNewOrder }: OrdersScreenProps) {
  const {
    filteredOrders,
    updateOrder,
    deleteOrder,
    paymentStatusFilter,
    setPaymentStatusFilter,
    searchQuery,
    setSearchQuery,
  } = useOrders();

  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [deletingOrder, setDeletingOrder] = useState<Order | undefined>();

  async function handleDelete() {
    if (!deletingOrder) return;
    await deleteOrder(deletingOrder.id);
    setDeletingOrder(undefined);
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="חיפוש לפי שם לקוח…"
          className="flex-1"
        />
        <button
          onClick={onNewOrder}
          className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <ShoppingCart className="h-4 w-4" />
          הזמנה חדשה
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPaymentStatusFilter(tab.value)}
            className={[
              'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              paymentStatusFilter === tab.value
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
        <span className="mr-auto self-center text-xs text-gray-400 pb-1">
          {filteredOrders.length} הזמנות
        </span>
      </div>

      {/* Orders grid */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="אין הזמנות"
          description={searchQuery ? 'לא נמצאו הזמנות התואמות לחיפוש' : 'צור את ההזמנה הראשונה'}
          action={!searchQuery ? { label: 'הזמנה חדשה', onClick: onNewOrder } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onEdit={setEditingOrder}
              onDelete={setDeletingOrder}
            />
          ))}
        </div>
      )}

      <OrderEditDialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(undefined)}
        order={editingOrder}
        onSubmit={updateOrder}
      />

      <ConfirmDialog
        open={!!deletingOrder}
        onOpenChange={(open) => !open && setDeletingOrder(undefined)}
        title="מחיקת הזמנה"
        description={`האם למחוק את ההזמנה של "${deletingOrder?.clientName}"? הפעולה אינה הפיכה.`}
        confirmLabel="מחק הזמנה"
        onConfirm={handleDelete}
      />
    </div>
  );
}
