import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useProducts';
import type { StockMovementType } from '@/types/inventory';

const TYPE_OPTIONS: { value: StockMovementType; label: string; sign: '+' | '-' }[] = [
  { value: 'inbound',    label: 'קבלת מלאי',  sign: '+' },
  { value: 'adjustment', label: 'תיקון ידני',  sign: '+' },
  { value: 'outbound',   label: 'הוצאת מלאי', sign: '-' },
];

interface StockMovementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
}

export function StockMovementForm({ open, onOpenChange, productId }: StockMovementFormProps) {
  const { adjustStock, getStockForProduct } = useInventory();
  const { activeProducts } = useProducts();

  const [selectedProductId, setSelectedProductId] = useState(productId ?? '');
  const [type, setType] = useState<StockMovementType>('inbound');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const stockLevel = getStockForProduct(selectedProductId);
  const isOutbound = type === 'outbound';
  const sign = TYPE_OPTIONS.find((t) => t.value === type)?.sign ?? '+';

  function handleOpen(open: boolean) {
    if (open) {
      setSelectedProductId(productId ?? (activeProducts[0]?.id ?? ''));
      setType('inbound');
      setQuantity(1);
      setNotes('');
      setError('');
    }
    onOpenChange(open);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProductId || quantity <= 0) return;

    if (isOutbound && stockLevel && quantity > stockLevel.currentStock) {
      setError(`מלאי זמין: ${stockLevel.currentStock} יחידות בלבד`);
      return;
    }

    setSaving(true);
    const delta = sign === '+' ? quantity : -quantity;
    await adjustStock(selectedProductId, delta, type, notes || undefined);
    setSaving(false);
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-xl p-6"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-gray-900">
              תנועת מלאי
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 p-1 rounded">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">מוצר</label>
              <select
                value={selectedProductId}
                onChange={(e) => { setSelectedProductId(e.target.value); setError(''); }}
                className="field-input"
                required
              >
                <option value="">בחר מוצר…</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {stockLevel && (
                <p className="text-xs text-gray-400">
                  מלאי נוכחי: <span className="font-medium text-gray-700">{stockLevel.currentStock}</span> {stockLevel.unit}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">סוג תנועה</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setType(opt.value); setError(''); }}
                    className={[
                      'py-2 px-3 rounded-lg text-xs font-medium border transition-colors text-center',
                      type === opt.value
                        ? 'bg-amber-50 border-amber-400 text-amber-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
                    ].join(' ')}
                  >
                    <span className={opt.sign === '+' ? 'text-green-600' : 'text-red-500'}>
                      {opt.sign}
                    </span>{' '}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">כמות (יחידות)</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => { setQuantity(Math.max(1, Number(e.target.value))); setError(''); }}
                className="field-input"
                required
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">הערות (אופציונלי)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="סיבה לתנועה…"
                className="field-input"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !selectedProductId}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'שומר…' : 'שמור תנועה'}
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
