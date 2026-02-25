import { Pencil, Trash2, Calendar, CreditCard, Truck } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_COLORS,
} from '@/lib/constants';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import type { Order } from '@/types/crm';

interface OrderCardProps {
  order: Order;
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onShip?: (order: Order) => void;
}

export function OrderCard({ order, onEdit, onDelete, onShip }: OrderCardProps) {
  const outstanding = order.total - order.amountPaid;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm text-gray-900">{order.clientName}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {formatDateShort(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900 text-sm">{formatCurrency(order.total)}</p>
          <div className="flex gap-1 mt-0.5 justify-end">
            <StatusBadge
              label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
              colorClass={PAYMENT_STATUS_COLORS[order.paymentStatus]}
            />
            <StatusBadge
              label={FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
              colorClass={FULFILLMENT_STATUS_COLORS[order.fulfillmentStatus]}
            />
          </div>
        </div>
      </div>

      {/* Items summary */}
      <div className="text-xs text-gray-400 mb-2 space-y-0.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>{formatCurrency(item.total)}</span>
            <span>{item.productName} × {item.quantity}</span>
          </div>
        ))}
      </div>

      {/* Payment info */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <CreditCard className="h-3 w-3" />
          <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
        </div>
        {order.paymentStatus === 'partial' && (
          <span className="text-amber-600 font-medium">
            יתרה: {formatCurrency(outstanding)}
          </span>
        )}
      </div>

      {order.notes && (
        <p className="text-xs text-gray-400 italic mt-2 line-clamp-1">{order.notes}</p>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-50 mt-2">
        {order.fulfillmentStatus === 'pending' && onShip && (
          <button
            onClick={() => onShip(order)}
            className="flex items-center gap-1.5 text-xs text-white bg-green-600 hover:bg-green-700 transition-colors px-2 py-1 rounded font-medium"
          >
            <Truck className="h-3.5 w-3.5" />
            שלח
          </button>
        )}
        <button
          onClick={() => onEdit(order)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 transition-colors px-2 py-1 rounded hover:bg-amber-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          עריכה
        </button>
        <button
          onClick={() => onDelete(order)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          מחיקה
        </button>
      </div>
    </div>
  );
}
