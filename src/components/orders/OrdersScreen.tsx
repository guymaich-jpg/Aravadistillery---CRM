import { useState } from 'react';
import { ShoppingCart, LayoutList, LayoutGrid } from 'lucide-react';
import { useOrderFilters } from '@/hooks/useOrderFilters';
import { useOrdersCtx } from '@/store/OrdersContext';
import { useClientsCtx } from '@/store/ClientsContext';
import { useProductsCtx } from '@/store/ProductsContext';
import { OrderRow } from './OrderRow';
import { OrderEditDialog } from './OrderEditDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SearchInput } from '@/components/shared/SearchInput';
import { MultiSelect } from '@/components/shared/MultiSelect';
import { SingleSelect } from '@/components/shared/SingleSelect';
import { RangeFilter } from '@/components/shared/RangeFilter';
import { DateRangeFilter } from '@/components/shared/DateRangeFilter';
import { ChipsBar } from '@/components/shared/ChipsBar';
import { formatCurrency } from '@/lib/currency';
import {
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_OPTIONS,
  FULFILLMENT_STATUS_LABELS,
  AREA_OPTIONS,
  AREA_LABELS,
} from '@/lib/constants';
import type { Order, PaymentStatus, FulfillmentStatus, Area } from '@/types/crm';

const DENSITY_KEY = 'crm_orders_density';

interface OrdersScreenProps {
  onNewOrder: () => void;
}

export function OrdersScreen({ onNewOrder }: OrdersScreenProps) {
  const { filters, setFilter, reset, filtered, allCount, chips, summary } = useOrderFilters();
  const { updateOrder, deleteOrder, shipOrder } = useOrdersCtx();
  const { getActiveClients } = useClientsCtx();
  const { products } = useProductsCtx();
  const activeClients = getActiveClients();

  const [density, setDensity] = useState<'comfortable' | 'compact'>(() =>
    (localStorage.getItem(DENSITY_KEY) as 'compact') || 'comfortable',
  );
  const [editingOrder, setEditingOrder] = useState<Order | undefined>();
  const [deletingOrder, setDeletingOrder] = useState<Order | undefined>();
  const [shippingOrder, setShippingOrder] = useState<Order | undefined>();
  const [error, setError] = useState<string | null>(null);

  function toggleDensity() {
    const next = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    localStorage.setItem(DENSITY_KEY, next);
  }

  async function handleDelete() {
    if (!deletingOrder) return;
    try {
      await deleteOrder(deletingOrder.id);
      setDeletingOrder(undefined);
    } catch {
      setError('שגיאה במחיקת ההזמנה. נסה שוב.');
    }
  }

  async function handleShip() {
    if (!shippingOrder) return;
    try {
      await shipOrder(shippingOrder.id);
      setShippingOrder(undefined);
    } catch {
      setError('שגיאה בסימון ההזמנה כנשלחה. נסה שוב.');
    }
  }

  return (
    <div className="p-5 max-w-[1320px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[26px] font-bold text-[#3d2206]">הזמנות</h1>
          <p className="text-sm text-[#8a7a66] mt-1">{filtered.length} מתוך {allCount} הזמנות</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDensity}
            className="p-2 text-[#8a7a66] hover:text-[#3d2206] rounded-lg hover:bg-[#fdf8ef] transition-colors"
            title={density === 'comfortable' ? 'תצוגה צפופה' : 'תצוגה מרווחת'}
          >
            {density === 'comfortable' ? <LayoutList className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </button>
          <button
            onClick={onNewOrder}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#c9821a] text-white rounded-lg text-sm font-semibold hover:bg-[#b3720f] transition-colors shadow-sm whitespace-nowrap"
          >
            <ShoppingCart className="h-4 w-4" />
            הזמנה חדשה
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3.5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-xs font-medium">סגור</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border border-[#e9ddc9] rounded-xl p-3 mb-3.5 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)] flex gap-3 items-center flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <SearchInput value={filters.search} onChange={v => setFilter('search', v)} placeholder="חיפוש לפי שם לקוח…" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <MultiSelect
            label="תשלום"
            options={PAYMENT_STATUS_OPTIONS}
            value={filters.paymentStatus}
            onChange={v => setFilter('paymentStatus', v)}
            render={s => PAYMENT_STATUS_LABELS[s as PaymentStatus]}
          />
          <MultiSelect
            label="אספקה"
            options={FULFILLMENT_STATUS_OPTIONS}
            value={filters.fulfillment}
            onChange={v => setFilter('fulfillment', v)}
            render={s => FULFILLMENT_STATUS_LABELS[s as FulfillmentStatus]}
          />
          <MultiSelect
            label="אזור"
            options={[...AREA_OPTIONS]}
            value={filters.area}
            onChange={v => setFilter('area', v)}
            render={a => AREA_LABELS[a as Area]}
          />
          <MultiSelect
            label="פריט"
            options={products.map(p => p.id)}
            value={filters.products}
            onChange={v => setFilter('products', v)}
            render={id => products.find(p => p.id === id)?.name ?? id}
          />
          <SingleSelect
            label="לקוח"
            options={activeClients.map(c => c.id)}
            value={filters.client}
            onChange={v => setFilter('client', v)}
            render={id => activeClients.find(c => c.id === id)?.businessName ?? id}
          />
          <RangeFilter label="סכום" value={filters.amount} onChange={v => setFilter('amount', v)} />
          <DateRangeFilter label="תאריך" value={filters.date} onChange={v => setFilter('date', v)} />
        </div>
      </div>

      {/* Chips */}
      <ChipsBar chips={chips} onClearAll={reset} />

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
          <div className="text-[13px] text-[#8a7a66] font-semibold">הזמנות מסוננות</div>
          <div className="text-[25px] font-extrabold text-[#3d2206] mt-1">{summary.count}</div>
        </div>
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
          <div className="text-[13px] text-[#8a7a66] font-semibold">שווי כולל</div>
          <div className="text-[25px] font-extrabold text-[#c9821a] mt-1">{formatCurrency(summary.totalValue)}</div>
        </div>
        <div className="bg-white border border-[#e9ddc9] rounded-xl p-4 shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]">
          <div className="text-[13px] text-[#8a7a66] font-semibold">יתרה לגבייה</div>
          <div className={`text-[25px] font-extrabold mt-1 ${summary.outstanding > 0 ? 'text-[#c0392b]' : 'text-[#1f8a5b]'}`}>
            {formatCurrency(summary.outstanding)}
          </div>
        </div>
      </div>

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[#e9ddc9] rounded-xl py-11 text-center text-[#8a7a66] text-[15px]">
          לא נמצאו הזמנות התואמות לסינון
        </div>
      ) : (
        <div
          className="bg-white border border-[#e9ddc9] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(61,34,6,.06),0_6px_18px_rgba(61,34,6,.05)]"
          style={{
            '--row-py': density === 'compact' ? '7px' : '13px',
            '--row-fs': density === 'compact' ? '13px' : '14.5px',
          } as React.CSSProperties}
        >
          {/* Header */}
          <div className="grid grid-cols-[minmax(150px,1.5fr)_92px_minmax(110px,1fr)_104px_128px_96px_104px] items-center gap-2.5 px-[18px] py-[var(--row-py)] bg-[#faf3e6] font-bold text-[#8a7a66] text-[12.5px] sticky top-[60px] z-[5] border-b border-[#f0e7d6]">
            <div>לקוח</div>
            <div>תאריך</div>
            <div>פריטים</div>
            <div>תשלום</div>
            <div>אספקה</div>
            <div>אמצעי</div>
            <div>סה״כ</div>
          </div>
          {filtered.map(o => (
            <OrderRow
              key={o.id}
              order={o}
              onEdit={setEditingOrder}
              onDelete={setDeletingOrder}
              onShip={setShippingOrder}
            />
          ))}
        </div>
      )}

      <OrderEditDialog
        open={!!editingOrder}
        onOpenChange={open => !open && setEditingOrder(undefined)}
        order={editingOrder}
        onSubmit={updateOrder}
      />

      <ConfirmDialog
        open={!!deletingOrder}
        onOpenChange={open => !open && setDeletingOrder(undefined)}
        title="מחיקת הזמנה"
        description={`האם למחוק את ההזמנה של "${deletingOrder?.clientName}"? הפעולה אינה הפיכה.`}
        confirmLabel="מחק הזמנה"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!shippingOrder}
        onOpenChange={open => !open && setShippingOrder(undefined)}
        title="שליחת הזמנה"
        description={`לסמן את ההזמנה של "${shippingOrder?.clientName}" כנשלחה?`}
        confirmLabel="שלח הזמנה"
        onConfirm={handleShip}
      />
    </div>
  );
}
