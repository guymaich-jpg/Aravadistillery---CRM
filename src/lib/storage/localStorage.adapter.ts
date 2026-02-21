// LocalStorageAdapter — full localStorage implementation of StorageAdapter.
// All methods wrap synchronous localStorage operations in Promise.resolve()
// so calling code is identical to what a real API adapter would use.

import type { Client, Product, Order } from '@/types/crm';
import type { StockLevel, StockMovement, InventoryBatch } from '@/types/inventory';
import {
  type StorageAdapter,
  type StorageResult,
  type ExportPayload,
  ok,
  err,
} from './adapter';

// ── Storage key constants ─────────────────────────────────────────────────────
export const KEYS = {
  CLIENTS:          'distillery_crm_clients',
  ORDERS:           'distillery_crm_orders',
  PRODUCTS:         'distillery_crm_products',
  STOCK_LEVELS:     'distillery_crm_stock_levels',
  STOCK_MOVEMENTS:  'distillery_crm_stock_movements',
  INV_BATCHES:      'distillery_crm_inventory_batches',
  SCHEMA_VERSION:   'distillery_crm_version',
  BACKUP_V3:        'distillery_crm_backup_v3',
} as const;

// ── Generic helpers ───────────────────────────────────────────────────────────

function readAll<T>(key: string): StorageResult<T[]> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return ok<T[]>([]);
    return ok<T[]>(JSON.parse(raw) as T[]);
  } catch {
    return err(`Failed to parse ${key}`, 'PARSE_ERROR');
  }
}

function writeAll<T>(key: string, data: T[]): StorageResult<void> {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return ok(undefined);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return err('Storage quota exceeded', 'QUOTA_EXCEEDED');
    }
    return err(String(e), 'UNKNOWN');
  }
}

function upsert<T extends { id: string }>(key: string, item: T): StorageResult<T> {
  const result = readAll<T>(key);
  if (!result.ok) return result as StorageResult<T>;
  const existing = result.data;
  const idx = existing.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    existing[idx] = item;
  } else {
    existing.push(item);
  }
  const writeResult = writeAll(key, existing);
  if (!writeResult.ok) return writeResult as StorageResult<T>;
  return ok(item);
}

// ── LocalStorageAdapter implementation ────────────────────────────────────────

export class LocalStorageAdapter implements StorageAdapter {

  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // ── Clients ──────────────────────────────────────────────────────────────

  async getClients(): Promise<StorageResult<Client[]>> {
    return Promise.resolve(readAll<Client>(KEYS.CLIENTS));
  }

  async saveClient(client: Client): Promise<StorageResult<Client>> {
    return Promise.resolve(upsert(KEYS.CLIENTS, client));
  }

  async deleteClient(id: string): Promise<StorageResult<void>> {
    // Soft delete: set deletedAt — never hard-delete client records
    const result = readAll<Client>(KEYS.CLIENTS);
    if (!result.ok) return result as StorageResult<void>;
    const updated = result.data.map(c =>
      c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c
    );
    return Promise.resolve(writeAll(KEYS.CLIENTS, updated));
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  async getOrders(): Promise<StorageResult<Order[]>> {
    return Promise.resolve(readAll<Order>(KEYS.ORDERS));
  }

  async saveOrder(order: Order): Promise<StorageResult<Order>> {
    return Promise.resolve(upsert(KEYS.ORDERS, order));
  }

  async deleteOrder(id: string): Promise<StorageResult<void>> {
    // Soft delete — orders are financial records, never hard-deleted
    const result = readAll<Order>(KEYS.ORDERS);
    if (!result.ok) return result as StorageResult<void>;
    const updated = result.data.map(o =>
      o.id === id ? { ...o, deletedAt: new Date().toISOString() } : o
    );
    return Promise.resolve(writeAll(KEYS.ORDERS, updated));
  }

  // ── Products ─────────────────────────────────────────────────────────────

  async getProducts(): Promise<StorageResult<Product[]>> {
    return Promise.resolve(readAll<Product>(KEYS.PRODUCTS));
  }

  async saveProduct(product: Product): Promise<StorageResult<Product>> {
    return Promise.resolve(upsert(KEYS.PRODUCTS, product));
  }

  // ── Inventory ────────────────────────────────────────────────────────────

  async getStockLevels(): Promise<StorageResult<StockLevel[]>> {
    return Promise.resolve(readAll<StockLevel>(KEYS.STOCK_LEVELS));
  }

  async saveStockLevel(level: StockLevel): Promise<StorageResult<StockLevel>> {
    // StockLevel uses productId as key (not an id field)
    const result = readAll<StockLevel>(KEYS.STOCK_LEVELS);
    if (!result.ok) return result as StorageResult<StockLevel>;
    const existing = result.data;
    const idx = existing.findIndex(l => l.productId === level.productId);
    if (idx >= 0) {
      existing[idx] = level;
    } else {
      existing.push(level);
    }
    const writeResult = writeAll(KEYS.STOCK_LEVELS, existing);
    if (!writeResult.ok) return writeResult as StorageResult<StockLevel>;
    return Promise.resolve(ok(level));
  }

  async getStockMovements(productId?: string): Promise<StorageResult<StockMovement[]>> {
    const result = readAll<StockMovement>(KEYS.STOCK_MOVEMENTS);
    if (!result.ok) return result;
    const data = productId
      ? result.data.filter(m => m.productId === productId)
      : result.data;
    return Promise.resolve(ok(data));
  }

  async saveStockMovement(movement: StockMovement): Promise<StorageResult<StockMovement>> {
    // Movements are append-only — never update existing ones
    const result = readAll<StockMovement>(KEYS.STOCK_MOVEMENTS);
    if (!result.ok) return result as StorageResult<StockMovement>;
    const writeResult = writeAll(KEYS.STOCK_MOVEMENTS, [...result.data, movement]);
    if (!writeResult.ok) return writeResult as StorageResult<StockMovement>;
    return Promise.resolve(ok(movement));
  }

  async getInventoryBatches(): Promise<StorageResult<InventoryBatch[]>> {
    return Promise.resolve(readAll<InventoryBatch>(KEYS.INV_BATCHES));
  }

  async saveInventoryBatch(batch: InventoryBatch): Promise<StorageResult<InventoryBatch>> {
    return Promise.resolve(upsert(KEYS.INV_BATCHES, batch));
  }

  // ── Schema ───────────────────────────────────────────────────────────────

  async getSchemaVersion(): Promise<StorageResult<string>> {
    try {
      const v = localStorage.getItem(KEYS.SCHEMA_VERSION);
      return Promise.resolve(ok(v ?? ''));
    } catch {
      return Promise.resolve(err('Failed to read schema version', 'UNKNOWN'));
    }
  }

  async setSchemaVersion(version: string): Promise<StorageResult<void>> {
    try {
      localStorage.setItem(KEYS.SCHEMA_VERSION, version);
      return Promise.resolve(ok(undefined));
    } catch {
      return Promise.resolve(err('Failed to write schema version', 'UNKNOWN'));
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────

  async exportAll(): Promise<StorageResult<ExportPayload>> {
    const [clients, orders, products, stockLevels, stockMovements] = await Promise.all([
      this.getClients(),
      this.getOrders(),
      this.getProducts(),
      this.getStockLevels(),
      this.getStockMovements(),
    ]);
    if (!clients.ok) return clients as StorageResult<ExportPayload>;
    if (!orders.ok)  return orders  as StorageResult<ExportPayload>;
    if (!products.ok) return products as StorageResult<ExportPayload>;
    if (!stockLevels.ok) return stockLevels as StorageResult<ExportPayload>;
    if (!stockMovements.ok) return stockMovements as StorageResult<ExportPayload>;
    return ok({
      clients: clients.data,
      orders: orders.data,
      products: products.data,
      stockLevels: stockLevels.data,
      stockMovements: stockMovements.data,
    });
  }

  // ── Backup helper (used by migration) ────────────────────────────────────

  saveBackup(payload: Record<string, unknown>): void {
    // Only write backup once — never overwrite existing backup
    if (localStorage.getItem(KEYS.BACKUP_V3)) return;
    try {
      localStorage.setItem(KEYS.BACKUP_V3, JSON.stringify(payload));
    } catch {
      // If backup fails due to quota, proceed with migration anyway
    }
  }
}
