// useInventory — inventory-domain hook built on top of CRMContext.
// Exposes stock data, computed low-stock alerts, and all mutators.

import { useCallback } from 'react';
import { useCRM } from '@/store/CRMContext';
import type { InventoryBatch, LowStockAlert, StockLevel, StockMovement, StockMovementType } from '@/types/inventory';

export interface UseInventoryReturn {
  /** Current stock levels for all tracked products */
  stockLevels: StockLevel[];
  /** All stock movements (append-only audit trail) */
  stockMovements: StockMovement[];
  /** All inventory batches (production / inbound receipts) */
  inventoryBatches: InventoryBatch[];
  /** Products at or below their minimum stock threshold */
  lowStockAlerts: LowStockAlert[];
  /** Manually adjust stock for a product (creates a StockMovement) */
  adjustStock: (
    productId: string,
    delta: number,
    type: StockMovementType,
    notes?: string,
    reference?: string,
  ) => Promise<void>;
  /** Add a new production / inbound batch (also adjusts stock level) */
  addInventoryBatch: (data: Omit<InventoryBatch, 'id' | 'createdAt'>) => Promise<void>;
  /** Return the StockLevel record for a specific product, or undefined */
  getStockForProduct: (productId: string) => StockLevel | undefined;
}

export function useInventory(): UseInventoryReturn {
  const {
    stockLevels,
    stockMovements,
    inventoryBatches,
    getLowStockAlerts,
    adjustStock,
    addInventoryBatch,
  } = useCRM();

  const getStockForProduct = useCallback(
    (productId: string): StockLevel | undefined =>
      stockLevels.find(l => l.productId === productId),
    [stockLevels],
  );

  return {
    stockLevels,
    stockMovements,
    inventoryBatches,
    lowStockAlerts: getLowStockAlerts(),
    adjustStock,
    addInventoryBatch,
    getStockForProduct,
  };
}
