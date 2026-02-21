import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, X, Package } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useProducts';
import { formatDateShort } from '@/lib/date';
import type { InventoryBatch } from '@/types/inventory';

interface BatchListProps {
  batches: InventoryBatch[];
  onAdd: () => void;
}

export function BatchList({ batches, onAdd }: BatchListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">אצוות</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          אצווה חדשה
        </button>
      </div>
      {batches.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">אין אצוות מוקלטות</p>
      ) : (
        <div className="space-y-2">
          {[...batches].reverse().map((batch) => (
            <div
              key={batch.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="font-medium text-gray-800 text-xs">{batch.batchNumber}</p>
                  <p className="text-xs text-gray-400">{batch.productName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 text-xs">{batch.quantity} יח׳</p>
                <p className="text-xs text-gray-400">{formatDateShort(batch.productionDate)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AddBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBatchDialog({ open, onOpenChange }: AddBatchDialogProps) {
  const { addInventoryBatch } = useInventory();
  const { activeProducts } = useProducts();

  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState(24);
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function handleOpen(open: boolean) {
    if (open) {
      setProductId(activeProducts[0]?.id ?? '');
      setBatchNumber('');
      setQuantity(24);
      setProductionDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
    onOpenChange(open);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !batchNumber) return;
    const product = activeProducts.find((p) => p.id === productId);
    if (!product) return;
    setSaving(true);
    await addInventoryBatch({
      productId,
      productName: product.name,
      batchNumber,
      quantity,
      productionDate,
      notes: notes || undefined,
    });
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
              הוספת אצווה
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600 p-1 rounded">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">מוצר</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className="field-input" required>
                <option value="">בחר מוצר…</option>
                {activeProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">מספר אצווה</label>
                <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="ARAQ-2026-001" className="field-input" required />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">כמות (בקבוקים)</label>
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} className="field-input" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">תאריך ייצור</label>
              <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} className="field-input" required />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">הערות</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערות לאצווה…" className="field-input" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !productId || !batchNumber} className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors">
                {saving ? 'שומר…' : 'הוסף אצווה'}
              </button>
              <Dialog.Close className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">ביטול</Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
