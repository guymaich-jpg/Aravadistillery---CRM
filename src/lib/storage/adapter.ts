// StorageAdapter interface — the swappable data layer contract.
// Swap one line in index.ts to switch from localStorage to any API.
// All methods return Promise<StorageResult<T>> so callers are always async-ready.

import type { Client, Product, Order } from '@/types/crm';
import type { StockLevel, StockMovement, InventoryBatch } from '@/types/inventory';

export type StorageErrorCode =
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export type StorageResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: StorageErrorCode };

export function ok<T>(data: T): StorageResult<T> {
  return { ok: true, data };
}

export function err(error: string, code: StorageErrorCode = 'UNKNOWN'): StorageResult<never> {
  return { ok: false, error, code };
}

export interface ExportPayload {
  clients: Client[];
  orders: Order[];
  products: Product[];
  stockLevels: StockLevel[];
  stockMovements: StockMovement[];
}

export interface StorageAdapter {
  isAvailable(): Promise<boolean>;

  // ── Clients ────────────────────────────────────────────────────────────
  getClients(): Promise<StorageResult<Client[]>>;
  saveClient(client: Client): Promise<StorageResult<Client>>;       // upsert by id
  deleteClient(id: string): Promise<StorageResult<void>>;           // sets deletedAt

  // ── Orders ─────────────────────────────────────────────────────────────
  getOrders(): Promise<StorageResult<Order[]>>;
  saveOrder(order: Order): Promise<StorageResult<Order>>;           // upsert by id
  deleteOrder(id: string): Promise<StorageResult<void>>;            // sets deletedAt

  // ── Products ───────────────────────────────────────────────────────────
  getProducts(): Promise<StorageResult<Product[]>>;
  saveProduct(product: Product): Promise<StorageResult<Product>>;   // upsert by id

  // ── Inventory ──────────────────────────────────────────────────────────
  getStockLevels(): Promise<StorageResult<StockLevel[]>>;
  saveStockLevel(level: StockLevel): Promise<StorageResult<StockLevel>>;
  getStockMovements(productId?: string): Promise<StorageResult<StockMovement[]>>;
  saveStockMovement(movement: StockMovement): Promise<StorageResult<StockMovement>>;
  getInventoryBatches(): Promise<StorageResult<InventoryBatch[]>>;
  saveInventoryBatch(batch: InventoryBatch): Promise<StorageResult<InventoryBatch>>;

  // ── Schema + Export ────────────────────────────────────────────────────
  getSchemaVersion(): Promise<StorageResult<string>>;
  setSchemaVersion(version: string): Promise<StorageResult<void>>;
  exportAll(): Promise<StorageResult<ExportPayload>>;
}
