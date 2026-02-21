import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/constants';
import type { Order, PaymentMethod, PaymentStatus } from '@/types/crm';

interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order;
  onSubmit: (id: string, partial: Partial<Order>) => Promise<void>;
}

export function OrderEditDialog({ open, onOpenChange, order, onSubmit }: OrderEditDialogProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && order) {
      setPaymentStatus(order.paymentStatus);
      setPaymentMethod(order.paymentMethod);
      setAmountPaid(order.amountPaid);
      setNotes(order.notes);
    }
  }, [open, order]);

  // Auto-set amountPaid when status changes
  function handleStatusChange(s: PaymentStatus) {
    setPaymentStatus(s);
    if (s === 'paid' && order) setAmountPaid(order.total);
    if (s === 'pending') setAmountPaid(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSaving(true);
    await onSubmit(order.id, { paymentStatus, paymentMethod, amountPaid, notes });
    setSaving(false);
    onOpenChange(false);
  }

  if (!order) return null;

  const statusOptions: PaymentStatus[] = ['paid', 'pending', 'partial'];
  const methodOptions: PaymentMethod[] = ['cash', 'card', 'transfer', 'check', 'bit'];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-xl p-6"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              עריכת הזמנה
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 rounded-lg p-1">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm">
            <p className="font-medium text-gray-700">{order.clientName}</p>
            <p className="text-gray-500 text-xs mt-1">
              {order.items.length} פריטים · סה״כ{' '}
              <span className="font-semibold text-gray-700">{formatCurrency(order.total)}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">סטטוס תשלום</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => handleStatusChange(e.target.value as PaymentStatus)}
                  className="field-input"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">אמצעי תשלום</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="field-input"
                >
                  {methodOptions.map((m) => (
                    <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
            </div>

            {paymentStatus === 'partial' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  סכום ששולם (מתוך {formatCurrency(order.total)})
                </label>
                <input
                  type="number"
                  min={0}
                  max={order.total}
                  step={1}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className="field-input"
                />
                {amountPaid > 0 && (
                  <p className="text-xs text-amber-600">
                    יתרה: {formatCurrency(order.total - amountPaid)}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">הערות</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="field-input resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'שומר…' : 'שמור שינויים'}
              </button>
              <Dialog.Close className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                ביטול
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
