// FirestoreAdapter — Firestore implementation of StorageAdapter.
// Drop-in replacement for LocalStorageAdapter.

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import type { Client, Product, Order } from '@/types/crm';
import type { StockLevel, StockMovement, InventoryBatch } from '@/types/inventory';
import {
  type StorageAdapter,
  type StorageResult,
  type ExportPayload,
  ok,
  err,
} from './adapter';

const COLLECTIONS = {
  CLIENTS: 'clients',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  STOCK_LEVELS: 'stockLevels',
  STOCK_MOVEMENTS: 'stockMovements',
  INV_BATCHES: 'inventoryBatches',
  META: 'meta',
} as const;

function mapError(e: unknown): StorageResult<never> {
  const error = e as { code?: string; message?: string };
  if (error.code === 'permission-denied') {
    return err('Permission denied', 'VALIDATION_ERROR');
  }
  if (error.code === 'not-found') {
    return err('Document not found', 'NOT_FOUND');
  }
  return err(error.message ?? String(e), 'UNKNOWN');
}

async function getAllDocs<T>(collectionName: string): Promise<StorageResult<T[]>> {
  try {
    const db = getFirestoreDb();
    const snapshot = await getDocs(collection(db, collectionName));
    const items = snapshot.docs.map(d => d.data() as T);
    return ok(items);
  } catch (e) {
    return mapError(e);
  }
}

async function upsertDoc<T>(
  collectionName: string,
  id: string,
  data: T,
): Promise<StorageResult<T>> {
  try {
    const db = getFirestoreDb();
    await setDoc(doc(db, collectionName, id), data as Record<string, unknown>);
    return ok(data);
  } catch (e) {
    return mapError(e);
  }
}

export class FirestoreAdapter implements StorageAdapter {

  async isAvailable(): Promise<boolean> {
    try {
      const db = getFirestoreDb();
      await getDoc(doc(db, COLLECTIONS.META, 'schema'));
      return true;
    } catch {
      return false;
    }
  }

  // ── Clients ──────────────────────────────────────────────────────────────

  async getClients(): Promise<StorageResult<Client[]>> {
    return getAllDocs<Client>(COLLECTIONS.CLIENTS);
  }

  async saveClient(client: Client): Promise<StorageResult<Client>> {
    return upsertDoc(COLLECTIONS.CLIENTS, client.id, client);
  }

  async deleteClient(id: string): Promise<StorageResult<void>> {
    try {
      const db = getFirestoreDb();
      await updateDoc(doc(db, COLLECTIONS.CLIENTS, id), {
        deletedAt: new Date().toISOString(),
      });
      return ok(undefined);
    } catch (e) {
      return mapError(e);
    }
  }

  // ── Orders ───────────────────────────────────────────────────────────────

  async getOrders(): Promise<StorageResult<Order[]>> {
    return getAllDocs<Order>(COLLECTIONS.ORDERS);
  }

  async saveOrder(order: Order): Promise<StorageResult<Order>> {
    return upsertDoc(COLLECTIONS.ORDERS, order.id, order);
  }

  async deleteOrder(id: string): Promise<StorageResult<void>> {
    try {
      const db = getFirestoreDb();
      await updateDoc(doc(db, COLLECTIONS.ORDERS, id), {
        deletedAt: new Date().toISOString(),
      });
      return ok(undefined);
    } catch (e) {
      return mapError(e);
    }
  }

  // ── Products ─────────────────────────────────────────────────────────────

  async getProducts(): Promise<StorageResult<Product[]>> {
    return getAllDocs<Product>(COLLECTIONS.PRODUCTS);
  }

  async saveProduct(product: Product): Promise<StorageResult<Product>> {
    return upsertDoc(COLLECTIONS.PRODUCTS, product.id, product);
  }

  // ── Inventory ────────────────────────────────────────────────────────────

  async getStockLevels(): Promise<StorageResult<StockLevel[]>> {
    return getAllDocs<StockLevel>(COLLECTIONS.STOCK_LEVELS);
  }

  async saveStockLevel(level: StockLevel): Promise<StorageResult<StockLevel>> {
    return upsertDoc(COLLECTIONS.STOCK_LEVELS, level.productId, level);
  }

  async getStockMovements(productId?: string): Promise<StorageResult<StockMovement[]>> {
    try {
      const db = getFirestoreDb();
      const ref = collection(db, COLLECTIONS.STOCK_MOVEMENTS);
      const q = productId
        ? query(ref, where('productId', '==', productId))
        : ref;
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => d.data() as StockMovement);
      return ok(items);
    } catch (e) {
      return mapError(e);
    }
  }

  async saveStockMovement(movement: StockMovement): Promise<StorageResult<StockMovement>> {
    return upsertDoc(COLLECTIONS.STOCK_MOVEMENTS, movement.id, movement);
  }

  async getInventoryBatches(): Promise<StorageResult<InventoryBatch[]>> {
    return getAllDocs<InventoryBatch>(COLLECTIONS.INV_BATCHES);
  }

  async saveInventoryBatch(batch: InventoryBatch): Promise<StorageResult<InventoryBatch>> {
    return upsertDoc(COLLECTIONS.INV_BATCHES, batch.id, batch);
  }

  // ── Schema ───────────────────────────────────────────────────────────────

  async getSchemaVersion(): Promise<StorageResult<string>> {
    try {
      const db = getFirestoreDb();
      const snap = await getDoc(doc(db, COLLECTIONS.META, 'schema'));
      if (!snap.exists()) return ok('');
      return ok((snap.data().version as string) ?? '');
    } catch (e) {
      return mapError(e);
    }
  }

  async setSchemaVersion(version: string): Promise<StorageResult<void>> {
    try {
      const db = getFirestoreDb();
      await setDoc(doc(db, COLLECTIONS.META, 'schema'), { version });
      return ok(undefined);
    } catch (e) {
      return mapError(e);
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
    if (!orders.ok) return orders as StorageResult<ExportPayload>;
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
}
