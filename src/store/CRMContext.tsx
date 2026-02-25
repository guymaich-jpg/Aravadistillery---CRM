// CRMContext — backward-compatible composition hook over the 5 domain contexts.
// Components that need data from multiple domains can use useCRM() as before.
// For optimal re-rendering, prefer the domain-specific hooks (useClientsCtx, etc.).
// Note: Inventory is read-only — stock levels come from the factory control app.

import { useCallback, useMemo } from 'react';
import type { Client, Order, Product } from '@/types/crm';
import type {
  InventoryBatch,
  LowStockAlert,
  StockLevel,
  StockMovement,
} from '@/types/inventory';
import { useClientsCtx } from './ClientsContext';
import { useProductsCtx } from './ProductsContext';
import { useOrdersCtx } from './OrdersContext';
import { useStockCtx } from './StockContext';
import { useBatchCtx } from './InventoryBatchContext';

// ── Context value shape ──────────────────────────────────────────────────────

export interface CRMContextValue {
  // State
  clients: Client[];
  orders: Order[];
  products: Product[];
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
  inventoryBatches: InventoryBatch[];
  isLoading: boolean;
  migrationDone: boolean;
  storageError: string | null;

  // Client methods
  addClient(data: Omit<Client, 'id' | 'createdAt'>): Promise<void>;
  updateClient(id: string, partial: Partial<Client>): Promise<void>;
  deleteClient(id: string): Promise<void>;
  getActiveClients(): Client[];

  // Product methods
  addProduct(data: Omit<Product, 'id'>): Promise<void>;
  updateProduct(id: string, partial: Partial<Product>): Promise<void>;
  deactivateProduct(id: string): Promise<void>;
  getActiveProducts(): Product[];

  // Order methods
  addOrder(data: Omit<Order, 'id' | 'createdAt'>): Promise<void>;
  updateOrder(id: string, partial: Partial<Order>): Promise<void>;
  deleteOrder(id: string): Promise<void>;

  // Inventory (read-only — stock levels from factory)
  addInventoryBatch(data: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<void>;
  getLowStockAlerts(): LowStockAlert[];
}

// ── useCRM — backward-compatible unified hook ────────────────────────────────

export function useCRM(): CRMContextValue {
  const clientsCtx = useClientsCtx();
  const productsCtx = useProductsCtx();
  const ordersCtx = useOrdersCtx();
  const stockCtx = useStockCtx();
  const batchCtx = useBatchCtx();

  const isLoading =
    clientsCtx.isLoading ||
    productsCtx.isLoading ||
    ordersCtx.isLoading ||
    stockCtx.isLoading ||
    batchCtx.isLoading;

  const storageError =
    clientsCtx.storageError ??
    productsCtx.storageError ??
    ordersCtx.storageError ??
    stockCtx.storageError ??
    batchCtx.storageError;

  const getLowStockAlerts = useCallback(
    (): LowStockAlert[] => {
      const productMap = new Map(productsCtx.products.map(p => [p.id, p]));
      return stockCtx.stockLevels
        .filter(l => l.minimumStock > 0 && l.currentStock <= l.minimumStock)
        .map(l => ({
          productId: l.productId,
          productName: productMap.get(l.productId)?.name ?? l.productId,
          currentStock: l.currentStock,
          minimumStock: l.minimumStock,
          severity: l.currentStock === 0 ? 'critical' : 'warning',
        } as LowStockAlert));
    },
    [stockCtx.stockLevels, productsCtx.products],
  );

  return useMemo<CRMContextValue>(() => ({
    // State
    clients: clientsCtx.clients,
    orders: ordersCtx.orders,
    products: productsCtx.products,
    stockLevels: stockCtx.stockLevels,
    stockMovements: stockCtx.stockMovements,
    inventoryBatches: batchCtx.inventoryBatches,
    isLoading,
    migrationDone: true,
    storageError,

    // Client methods
    addClient: clientsCtx.addClient,
    updateClient: clientsCtx.updateClient,
    deleteClient: clientsCtx.deleteClient,
    getActiveClients: clientsCtx.getActiveClients,

    // Product methods
    addProduct: productsCtx.addProduct,
    updateProduct: productsCtx.updateProduct,
    deactivateProduct: productsCtx.deactivateProduct,
    getActiveProducts: productsCtx.getActiveProducts,

    // Order methods
    addOrder: ordersCtx.addOrder,
    updateOrder: ordersCtx.updateOrder,
    deleteOrder: ordersCtx.deleteOrder,

    // Inventory
    addInventoryBatch: batchCtx.addInventoryBatch,
    getLowStockAlerts,
  }), [
    clientsCtx, ordersCtx, productsCtx, stockCtx, batchCtx,
    isLoading, storageError, getLowStockAlerts,
  ]);
}
