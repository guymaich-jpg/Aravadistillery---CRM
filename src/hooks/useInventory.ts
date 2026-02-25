// useInventory — inventory-domain hook built on top of CRMContext.
// Exposes stock data, scheduled-orders-per-product, computed low-stock alerts, and all mutators.

import { useCallback, useMemo } from 'react';
import { useStockCtx } from '@/store/StockContext';
import { useBatchCtx } from '@/store/InventoryBatchContext';
import { useProductsCtx } from '@/store/ProductsContext';
import { useOrdersCtx } from '@/store/OrdersContext';
import type { InventoryBatch, LowStockAlert, StockLevel, StockMovement, StockMovementType } from '@/types/inventory';

export interface UseInventoryReturn {
  /** Current stock levels for all tracked products */
  stockLevels: StockLevel[];
  /** All stock movements (append-only audit trail) */
  stockMovements: StockMovement[];
  /** All inventory batches (production / inbound receipts) */
  inventoryBatches: InventoryBatch[];
  /** Products at or below their minimum stock threshold (accounts for scheduled orders) */
  lowStockAlerts: LowStockAlert[];
  /** Scheduled (pending) order quantities per product — Map<productId, totalQty> */
  scheduledOrdersByProduct: Map<string, number>;
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
  const { orders } = useOrdersCtx();

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

  // Compute total scheduled (pending) quantities per product from unshipped orders
  const scheduledOrdersByProduct = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    for (const order of orders) {
      if (order.deletedAt || order.fulfillmentStatus !== 'pending') continue;
      for (const item of order.items) {
        map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
      }
    }
    return map;
  }, [orders]);

  // Low stock alerts now use gap (currentStock − scheduled) instead of just currentStock
  const lowStockAlerts = useMemo((): LowStockAlert[] => {
    const productMap = new Map(products.map(p => [p.id, p]));
    return stockLevels
      .filter(l => {
        if (l.minimumStock <= 0) return false;
        const scheduled = scheduledOrdersByProduct.get(l.productId) ?? 0;
        const available = l.currentStock - scheduled;
        return available <= l.minimumStock;
      })
      .map(l => {
        const scheduled = scheduledOrdersByProduct.get(l.productId) ?? 0;
        const available = l.currentStock - scheduled;
        return {
          productId: l.productId,
          productName: productMap.get(l.productId)?.name ?? l.productId,
          currentStock: l.currentStock,
          minimumStock: l.minimumStock,
          severity: available <= 0 ? 'critical' : 'warning',
        } as LowStockAlert;
      });
  }, [stockLevels, products, scheduledOrdersByProduct]);

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
    scheduledOrdersByProduct,
    adjustStock,
    addInventoryBatch,
    getStockForProduct,
  };
}
