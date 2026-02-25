// useInventory — inventory-domain hook built on top of CRMContext.
// Exposes stock data, computed low-stock alerts, and all mutators.

import { useCallback, useMemo } from 'react';
import { useStockCtx } from '@/store/StockContext';
import { useBatchCtx } from '@/store/InventoryBatchContext';
import { useProductsCtx } from '@/store/ProductsContext';
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
  const { stockLevels, stockMovements, adjustStock: rawAdjustStock } = useStockCtx();
  const { inventoryBatches, addInventoryBatch } = useBatchCtx();
  const { products } = useProductsCtx();

  // Wrap adjustStock to resolve productName from the products list
  const adjustStock = useCallback(
    async (
      productId: string,
      delta: number,
      type: StockMovementType,
      notes?: string,
      reference?: string,
    ) => {
      const product = products.find(p => p.id === productId);
      await rawAdjustStock(productId, delta, type, product?.name ?? productId, notes, reference, product?.unit);
    },
    [products, rawAdjustStock],
  );

  const lowStockAlerts = useMemo((): LowStockAlert[] => {
    const productMap = new Map(products.map(p => [p.id, p]));
    return stockLevels
      .filter(l => l.minimumStock > 0 && l.currentStock <= l.minimumStock)
      .map(l => ({
        productId: l.productId,
        productName: productMap.get(l.productId)?.name ?? l.productId,
        currentStock: l.currentStock,
        minimumStock: l.minimumStock,
        severity: l.currentStock === 0 ? 'critical' : 'warning',
      } as LowStockAlert));
  }, [stockLevels, products]);

  const getStockForProduct = useCallback(
    (productId: string): StockLevel | undefined =>
      stockLevels.find(l => l.productId === productId),
    [stockLevels],
  );

  return {
    stockLevels,
    stockMovements,
    inventoryBatches,
    lowStockAlerts,
    adjustStock,
    addInventoryBatch,
    getStockForProduct,
  };
}
