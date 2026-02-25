import { Package } from 'lucide-react';
import { formatDateShort } from '@/lib/date';
import type { InventoryBatch } from '@/types/inventory';

interface BatchListProps {
  batches: InventoryBatch[];
}

export function BatchList({ batches }: BatchListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">אצוות</h3>
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
