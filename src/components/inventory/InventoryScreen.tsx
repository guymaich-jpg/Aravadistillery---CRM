import { useState } from 'react';
import { AlertTriangle, Package2, TrendingDown, ArrowUpDown } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useProducts';
import { StockMovementForm } from './StockMovementForm';
import { BatchList, AddBatchDialog } from './BatchCard';
import { formatDateShort } from '@/lib/date';
import type { StockMovementType } from '@/types/inventory';

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  inbound: 'קבלה',
  outbound: 'הוצאה',
  adjustment: 'תיקון',
  sale: 'מכירה',
};

const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  inbound: 'text-green-600',
  outbound: 'text-red-500',
  adjustment: 'text-blue-500',
  sale: 'text-amber-600',
};

export function InventoryScreen() {
  const { stockLevels, stockMovements, inventoryBatches, lowStockAlerts } = useInventory();
  const { activeProducts } = useProducts();

  const [movementOpen, setMovementOpen] = useState(false);
  const [movementProductId, setMovementProductId] = useState<string | undefined>();
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'stock' | 'movements' | 'batches'>('stock');

  function openMovement(productId?: string) {
    setMovementProductId(productId);
    setMovementOpen(true);
  }

  // Build display table: one row per active product
  const stockRows = activeProducts.map((product) => {
    const level = stockLevels.find((l) => l.productId === product.id);
    const current = level?.currentStock ?? 0;
    const minimum = level?.minimumStock ?? 0;
    const isLow = minimum > 0 && current <= minimum;
    const isCritical = current === 0;

    return { product, current, minimum, unit: level?.unit ?? product.unit, isLow, isCritical, lastUpdated: level?.lastUpdated };
  });

  const totalStock = stockRows.reduce((s, r) => s + r.current, 0);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      {/* Summary banner */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{activeProducts.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">מוצרים פעילים</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
          <p className="text-xs text-gray-400 mt-0.5">יחידות במלאי</p>
        </div>
        <div
          className={[
            'rounded-xl border p-4 shadow-sm text-center',
            lowStockAlerts.length > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-white border-gray-100',
          ].join(' ')}
        >
          <p className={`text-2xl font-bold ${lowStockAlerts.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {lowStockAlerts.length}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">התראות מלאי</p>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">התראות מלאי נמוך</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lowStockAlerts.map((alert) => (
              <div
                key={alert.productId}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{alert.productName}</p>
                  <p className="text-xs text-gray-400">
                    מלאי: <span className={alert.severity === 'critical' ? 'text-red-600 font-bold' : 'text-amber-600 font-medium'}>{alert.currentStock}</span>
                    {' '} / מינ׳: {alert.minimumStock}
                  </p>
                </div>
                <button
                  onClick={() => openMovement(alert.productId)}
                  className="text-xs bg-amber-600 text-white px-2 py-1 rounded-md hover:bg-amber-700 transition-colors"
                >
                  קבל מלאי
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'stock', label: 'רמות מלאי', icon: Package2 },
          { id: 'movements', label: 'תנועות', icon: ArrowUpDown },
          { id: 'batches', label: 'אצוות', icon: TrendingDown },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={[
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
              activeSection === id
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        <div className="mr-auto flex items-center pb-1">
          <button
            onClick={() => openMovement(undefined)}
            className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 transition-colors"
          >
            + תנועת מלאי
          </button>
        </div>
      </div>

      {/* Stock levels table */}
      {activeSection === 'stock' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">מוצר</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">מלאי נוכחי</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">מינימום</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">עדכון אחרון</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map(({ product, current, minimum, unit, isLow, isCritical, lastUpdated }) => (
                <tr key={product.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={[
                        'font-bold',
                        isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600',
                      ].join(' ')}
                    >
                      {current}
                    </span>
                    <span className="text-gray-400 text-xs mr-1">{unit}</span>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-500">{minimum}</td>
                  <td className="px-3 py-3 text-center text-xs text-gray-400">
                    {lastUpdated ? formatDateShort(lastUpdated) : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => openMovement(product.id)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline"
                    >
                      עדכן
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Movement history */}
      {activeSection === 'movements' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {stockMovements.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">אין תנועות מלאי מוקלטות</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">תאריך</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">מוצר</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">סוג</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-500">כמות</th>
                  <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">הערות</th>
                </tr>
              </thead>
              <tbody>
                {[...stockMovements].reverse().map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{formatDateShort(m.createdAt)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{m.productName}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs font-medium ${MOVEMENT_TYPE_COLORS[m.type]}`}>
                        {MOVEMENT_TYPE_LABELS[m.type]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium">
                      <span className={m.delta > 0 ? 'text-green-600' : 'text-red-500'}>
                        {m.delta > 0 ? '+' : ''}{m.delta}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{m.notes ?? m.reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Batches */}
      {activeSection === 'batches' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <BatchList batches={inventoryBatches} onAdd={() => setBatchDialogOpen(true)} />
        </div>
      )}

      {/* Dialogs */}
      <StockMovementForm
        open={movementOpen}
        onOpenChange={setMovementOpen}
        productId={movementProductId}
      />
      <AddBatchDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
      />
    </div>
  );
}
