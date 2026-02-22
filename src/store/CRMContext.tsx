// CRMContext — single unified context for all CRM state.
// Domain-organised internally. All async operations go through storageAdapter.
// addOrder also creates StockMovements and updates StockLevels atomically within
// the same logical transaction (sequential awaits, then full reload).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { Client, Order, Product } from '@/types/crm';
import type {
  InventoryBatch,
  LowStockAlert,
  StockLevel,
  StockMovement,
  StockMovementType,
} from '@/types/inventory';

import type { StorageResult } from '@/lib/storage/adapter';
import { storageAdapter } from '@/lib/storage';
import { generateId } from '@/lib/id';

// ── Context shape ─────────────────────────────────────────────────────────────

export interface CRMContextValue {
  // ── State ──────────────────────────────────────────────────────────────────
  clients: Client[];
  orders: Order[];
  products: Product[];
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
  inventoryBatches: InventoryBatch[];
  isLoading: boolean;
  migrationDone: boolean;
  storageError: string | null;

  // ── Client methods ─────────────────────────────────────────────────────────
  addClient(data: Omit<Client, 'id' | 'createdAt'>): Promise<void>;
  bulkAddClients(rows: Omit<Client, 'id' | 'createdAt'>[]): Promise<number>;
  updateClient(id: string, partial: Partial<Client>): Promise<void>;
  deleteClient(id: string): Promise<void>;
  getActiveClients(): Client[];

  // ── Product methods ────────────────────────────────────────────────────────
  addProduct(data: Omit<Product, 'id'>): Promise<void>;
  updateProduct(id: string, partial: Partial<Product>): Promise<void>;
  deactivateProduct(id: string): Promise<void>;
  getActiveProducts(): Product[];

  // ── Order methods ──────────────────────────────────────────────────────────
  addOrder(data: Omit<Order, 'id' | 'createdAt'>): Promise<void>;
  updateOrder(id: string, partial: Partial<Order>): Promise<void>;
  deleteOrder(id: string): Promise<void>;

  // ── Inventory methods ──────────────────────────────────────────────────────
  adjustStock(
    productId: string,
    delta: number,
    type: StockMovementType,
    notes?: string,
    reference?: string,
  ): Promise<void>;
  addInventoryBatch(data: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<void>;
  getLowStockAlerts(): LowStockAlert[];
}

// ── Context creation ──────────────────────────────────────────────────────────

export const CRMContext = createContext<CRMContextValue | null>(null);

// ── useCRM hook ───────────────────────────────────────────────────────────────

export function useCRM(): CRMContextValue {
  const ctx = useContext(CRMContext);
  if (!ctx) {
    throw new Error('useCRM must be used inside CRMProvider');
  }
  return ctx;
}

// ── CRMProvider ───────────────────────────────────────────────────────────────

interface CRMProviderProps {
  children: React.ReactNode;
  /** Set to true once root.provider.tsx has completed migrations */
  migrationDone?: boolean;
}

export function CRMProvider({
  children,
  migrationDone: migrationDoneProp = false,
}: CRMProviderProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [migrationDone] = useState(migrationDoneProp);
  const [storageError, setStorageError] = useState<string | null>(null);

  /** Returns result.data on success, or sets storageError and returns undefined. */
  function unwrap<T>(result: StorageResult<T>): T | undefined {
    if (result.ok) return result.data;
    setStorageError(result.error);
    return undefined;
  }

  // ── loadAll ─────────────────────────────────────────────────────────────────
  // Fetches all collections from storage in parallel and sets state.
  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        clientsResult,
        ordersResult,
        productsResult,
        stockLevelsResult,
        stockMovementsResult,
        inventoryBatchesResult,
      ] = await Promise.all([
        storageAdapter.getClients(),
        storageAdapter.getOrders(),
        storageAdapter.getProducts(),
        storageAdapter.getStockLevels(),
        storageAdapter.getStockMovements(),
        storageAdapter.getInventoryBatches(),
      ]);

      if (clientsResult.ok) setClients(clientsResult.data);
      else setStorageError(clientsResult.error);

      if (ordersResult.ok) setOrders(ordersResult.data);
      else setStorageError(ordersResult.error);

      if (productsResult.ok) setProducts(productsResult.data);
      else setStorageError(productsResult.error);

      if (stockLevelsResult.ok) setStockLevels(stockLevelsResult.data);
      else setStorageError(stockLevelsResult.error);

      if (stockMovementsResult.ok) setStockMovements(stockMovementsResult.data);
      else setStorageError(stockMovementsResult.error);

      if (inventoryBatchesResult.ok) setInventoryBatches(inventoryBatchesResult.data);
      else setStorageError(inventoryBatchesResult.error);
    } catch (e) {
      setStorageError(e instanceof Error ? e.message : 'שגיאה לא ידועה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load all data on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Client methods ──────────────────────────────────────────────────────────

  const addClient = useCallback(
    async (data: Omit<Client, 'id' | 'createdAt'>) => {
      const client: Client = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      if (!unwrap(await storageAdapter.saveClient(client))) return;
      setClients(prev => [...prev, client]);
    },
    [],
  );

  const bulkAddClients = useCallback(
    async (rows: Omit<Client, 'id' | 'createdAt'>[]): Promise<number> => {
      const newClients: Client[] = rows.map(data => ({
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }));
      const savedClients: Client[] = [];
      for (const client of newClients) {
        const result = await storageAdapter.saveClient(client);
        if (result.ok) savedClients.push(client);
      }
      if (savedClients.length > 0) {
        setClients(prev => [...prev, ...savedClients]);
      }
      return savedClients.length;
    },
    [],
  );

  const updateClient = useCallback(
    async (id: string, partial: Partial<Client>) => {
      const existing = clients.find(c => c.id === id);
      if (!existing) return;
      const updated: Client = { ...existing, ...partial };
      if (!unwrap(await storageAdapter.saveClient(updated))) return;
      setClients(prev => prev.map(c => (c.id === id ? updated : c)));
    },
    [clients],
  );

  const deleteClient = useCallback(
    async (id: string) => {
      if (!unwrap(await storageAdapter.deleteClient(id))) return;
      setClients(prev =>
        prev.map(c =>
          c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c,
        ),
      );
    },
    [],
  );

  const getActiveClients = useCallback(
    (): Client[] => clients.filter(c => !c.deletedAt),
    [clients],
  );

  // ── Product methods ─────────────────────────────────────────────────────────

  const addProduct = useCallback(
    async (data: Omit<Product, 'id'>) => {
      const product: Product = { ...data, id: generateId() };
      if (!unwrap(await storageAdapter.saveProduct(product))) return;
      setProducts(prev => [...prev, product]);
    },
    [],
  );

  const updateProduct = useCallback(
    async (id: string, partial: Partial<Product>) => {
      const existing = products.find(p => p.id === id);
      if (!existing) return;
      const updated: Product = { ...existing, ...partial };
      if (!unwrap(await storageAdapter.saveProduct(updated))) return;
      setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    },
    [products],
  );

  const deactivateProduct = useCallback(
    async (id: string) => {
      const existing = products.find(p => p.id === id);
      if (!existing) return;
      const updated: Product = { ...existing, isActive: false };
      if (!unwrap(await storageAdapter.saveProduct(updated))) return;
      setProducts(prev => prev.map(p => (p.id === id ? updated : p)));
    },
    [products],
  );

  const getActiveProducts = useCallback(
    (): Product[] => products.filter(p => p.isActive),
    [products],
  );

  // ── Order methods ───────────────────────────────────────────────────────────

  const addOrder = useCallback(
    async (data: Omit<Order, 'id' | 'createdAt'>) => {
      const order: Order = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      if (!unwrap(await storageAdapter.saveOrder(order))) return;

      // Create stock movements and update stock levels for each order item
      for (const item of order.items) {
        const movement: StockMovement = {
          id: generateId(),
          productId: item.productId,
          productName: item.productName,
          type: 'sale',
          quantity: item.quantity,
          delta: -item.quantity,
          reference: order.id,
          createdAt: new Date().toISOString(),
        };

        // Continue processing remaining items even if one movement fails
        unwrap(await storageAdapter.saveStockMovement(movement));

        // Update the stock level for this product
        const levelResult = await storageAdapter.getStockLevels();
        if (levelResult.ok) {
          const existing = levelResult.data.find(l => l.productId === item.productId);
          if (existing) {
            const updatedLevel: StockLevel = {
              ...existing,
              currentStock: Math.max(0, existing.currentStock - item.quantity),
              lastUpdated: new Date().toISOString(),
            };
            await storageAdapter.saveStockLevel(updatedLevel);
          }
        }
      }

      // Reload all data to reflect all changes
      await loadAll();
    },
    [loadAll],
  );

  const updateOrder = useCallback(
    async (id: string, partial: Partial<Order>) => {
      const existing = orders.find(o => o.id === id);
      if (!existing) return;
      const updated: Order = {
        ...existing,
        ...partial,
        updatedAt: new Date().toISOString(),
      };
      if (!unwrap(await storageAdapter.saveOrder(updated))) return;
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)));
    },
    [orders],
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      if (!unwrap(await storageAdapter.deleteOrder(id))) return;
      setOrders(prev =>
        prev.map(o =>
          o.id === id ? { ...o, deletedAt: new Date().toISOString() } : o,
        ),
      );
    },
    [],
  );

  // ── Inventory methods ───────────────────────────────────────────────────────

  const adjustStock = useCallback(
    async (
      productId: string,
      delta: number,
      type: StockMovementType,
      notes?: string,
      reference?: string,
    ) => {
      const product = products.find(p => p.id === productId);

      const movement: StockMovement = {
        id: generateId(),
        productId,
        productName: product?.name ?? productId,
        type,
        quantity: Math.abs(delta),
        delta,
        notes,
        reference,
        createdAt: new Date().toISOString(),
      };

      if (!unwrap(await storageAdapter.saveStockMovement(movement))) return;

      // Update stock level
      const levelResult = await storageAdapter.getStockLevels();
      if (levelResult.ok) {
        const existing = levelResult.data.find(l => l.productId === productId);
        if (existing) {
          const updatedLevel: StockLevel = {
            ...existing,
            currentStock: Math.max(0, existing.currentStock + delta),
            lastUpdated: new Date().toISOString(),
          };
          await storageAdapter.saveStockLevel(updatedLevel);
        } else {
          // Create a new stock level entry for this product
          const newLevel: StockLevel = {
            productId,
            currentStock: Math.max(0, delta),
            minimumStock: 0,
            unit: product?.unit ?? 'יחידה',
            lastUpdated: new Date().toISOString(),
          };
          await storageAdapter.saveStockLevel(newLevel);
        }
      }

      await loadAll();
    },
    [products, loadAll],
  );

  const addInventoryBatch = useCallback(
    async (data: Omit<InventoryBatch, 'id' | 'createdAt'>) => {
      const batch: InventoryBatch = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      if (!unwrap(await storageAdapter.saveInventoryBatch(batch))) return;

      // Inbound batch also increases stock level
      await adjustStock(
        data.productId,
        data.quantity,
        'inbound',
        data.notes,
        data.batchNumber,
      );
    },
    [adjustStock],
  );

  const getLowStockAlerts = useCallback(
    (): LowStockAlert[] => {
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
    },
    [stockLevels, products],
  );

  // ── Context value ───────────────────────────────────────────────────────────

  const value: CRMContextValue = {
    // State
    clients,
    orders,
    products,
    stockLevels,
    stockMovements,
    inventoryBatches,
    isLoading,
    migrationDone,
    storageError,

    // Client methods
    addClient,
    bulkAddClients,
    updateClient,
    deleteClient,
    getActiveClients,

    // Product methods
    addProduct,
    updateProduct,
    deactivateProduct,
    getActiveProducts,

    // Order methods
    addOrder,
    updateOrder,
    deleteOrder,

    // Inventory methods
    adjustStock,
    addInventoryBatch,
    getLowStockAlerts,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
