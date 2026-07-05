import { useState } from 'react';
import { ChevronLeft, Pencil, Trash2, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort, formatTime } from '@/lib/date';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  FULFILLMENT_STATUS_LABELS,
} from '@/lib/constants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { Order } from '@/types/crm';

const STATUS_COLORS: Record<string, string> = {
  paid: '#1f8a5b',
  pending: '#c0392b',
  partial: '#c9821a',
  shipped: '#1f8a5b',
};

const FULFILLMENT_COLORS: Record<string, string> = {
  pending: '#4f86c6',
  shipped: '#1f8a5b',
};

interface OrderRowProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onShip: (order: Order) => void;
}

export function OrderRow({ order, onEdit, onDelete, onShip }: OrderRowProps) {
  const [open, setOpen] = useState(false);
  const itemsLabel = order.items.length === 1 ? order.items[0].productName : `${order.items.length} פריטים`;
  const outstanding = order.total - order.amountPaid;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
        className={[
          'grid items-center gap-2.5 px-[18px] border-b border-[#f0e7d6] cursor-pointer text-[length:var(--row-fs)] hover:bg-[#fffaf0] transition-colors',
          'grid-cols-[minmax(150px,1.5fr)_92px_minmax(110px,1fr)_104px_128px_96px_104px]',
          'py-[var(--row-py)]',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 font-bold text-[#3d2206] min-w-0">
          <ChevronLeft className={`h-3.5 w-3.5 text-[#c9821a] flex-none transition-transform ${open ? '-rotate-90' : ''}`} />
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">{order.clientName}</span>
        </div>
        <div className="min-w-0">
          <div className="text-[#6b5e4d] overflow-hidden text-ellipsis whitespace-nowrap">{formatDateShort(order.createdAt)}</div>
          <div className="text-[11.5px] text-[#a49682] tabular-nums" dir="ltr">{formatTime(order.createdAt)}</div>
        </div>
        <div className="min-w-0">
          <span className="bg-[#f1e7d4] text-[#7d623a] rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold">
            {itemsLabel}
          </span>
        </div>
        <div><StatusBadge color={STATUS_COLORS[order.paymentStatus]} label={PAYMENT_STATUS_LABELS[order.paymentStatus]} /></div>
        <div><StatusBadge color={FULFILLMENT_COLORS[order.fulfillmentStatus]} label={FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]} /></div>
        <div className="text-[#6b5e4d] overflow-hidden text-ellipsis whitespace-nowrap">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</div>
        <div className="font-extrabold text-[#3d2206] tabular-nums">{formatCurrency(order.total)}</div>
      </div>

      {open && (
        <div className="bg-[#fbf6ec] border-b border-[#f0e7d6] px-[22px] py-3.5">
          <table className="w-full text-[13.5px] border-collapse">
            <thead>
              <tr>
                <th className="text-start text-[#6b5e4d] font-semibold px-2 py-1 border-b border-[#e9ddc9] text-[12.5px]">פריט</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-2 py-1 border-b border-[#e9ddc9] text-[12.5px]">כמות</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-2 py-1 border-b border-[#e9ddc9] text-[12.5px]">מחיר יח׳</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-2 py-1 border-b border-[#e9ddc9] text-[12.5px]">הנחה</th>
                <th className="text-start text-[#6b5e4d] font-semibold px-2 py-1 border-b border-[#e9ddc9] text-[12.5px]">סה״כ</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i}>
                  <td className="px-2 py-[7px] border-b border-[#f0e7d6] last:border-0">{it.productName}</td>
                  <td className="px-2 py-[7px] border-b border-[#f0e7d6]">{it.quantity}</td>
                  <td className="px-2 py-[7px] border-b border-[#f0e7d6]">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-2 py-[7px] border-b border-[#f0e7d6]">{it.discount ? it.discount + '%' : '—'}</td>
                  <td className="px-2 py-[7px] border-b border-[#f0e7d6]">{formatCurrency(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {order.paymentStatus !== 'paid' && (
            <div className="mt-2.5 text-[#c0392b] text-[13.5px]">
              יתרה לתשלום: <strong className="font-extrabold">{formatCurrency(outstanding)}</strong>
            </div>
          )}

          <div className="flex gap-2 mt-3 pt-2.5 border-t border-[#e9ddc9]">
            {order.fulfillmentStatus === 'pending' && (
              <button
                onClick={e => { e.stopPropagation(); onShip(order); }}
                className="btn-success !px-2.5 !py-1.5 !text-xs"
              >
                <Truck className="h-3.5 w-3.5" />
                שלח
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); onEdit(order); }}
              className="flex items-center gap-1.5 text-xs text-[#6b5e4d] hover:text-[#c9821a] px-2.5 py-1.5 rounded-lg hover:bg-[#fffaf0] transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              עריכה
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(order); }}
              className="flex items-center gap-1.5 text-xs text-[#6b5e4d] hover:text-[#c0392b] px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              מחיקה
            </button>
          </div>
        </div>
      )}
    </>
  );
}
