// v3 → v4 migration: additive, never destructive.
// Adds new required fields to existing data while preserving all records.
// Called by migration runner in index.ts.

import type { Client, Product, Order } from '@/types/crm';
import { LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';
import { DEFAULT_CLIENTS, DEFAULT_PRODUCTS } from '../seed';

export async function migrateV3ToV4(adapter: LocalStorageAdapter): Promise<void> {
  // 1. Take pre-migration backup (writes once, never overwrites)
  const backupPayload: Record<string, unknown> = {};
  for (const key of Object.values(KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw) backupPayload[key] = JSON.parse(raw);
  }
  adapter.saveBackup(backupPayload);

  // 2. Migrate clients — add deletedAt field
  const rawClients = localStorage.getItem(KEYS.CLIENTS);
  if (rawClients) {
    try {
      const clients: Client[] = JSON.parse(rawClients);
      const migrated = clients.map((c): Client => ({
        ...c,
        deletedAt: (c as Client & { deletedAt?: string }).deletedAt ?? undefined,
      }));
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(migrated));
    } catch {
      // Corrupt clients data → reset to defaults
      localStorage.setItem(KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
    }
  } else {
    // First run — initialize with default clients
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(DEFAULT_CLIENTS));
  }

  // 3. Migrate orders — add amountPaid, updatedAt, deletedAt
  const rawOrders = localStorage.getItem(KEYS.ORDERS);
  if (rawOrders) {
    try {
      const orders: Order[] = JSON.parse(rawOrders);
      const migrated = orders.map((o): Order => ({
        ...o,
        // amountPaid: paid orders = full amount; pending/partial orders = 0
        // Partial orders must be reconciled manually via the UI
        amountPaid: typeof (o as Order & { amountPaid?: number }).amountPaid === 'number'
          ? (o as Order & { amountPaid?: number }).amountPaid!
          : o.paymentStatus === 'paid' ? o.total : 0,
        updatedAt: (o as Order & { updatedAt?: string }).updatedAt ?? o.createdAt,
        deletedAt: (o as Order & { deletedAt?: string }).deletedAt ?? undefined,
      }));
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(migrated));
    } catch {
      // Corrupt orders — preserve nothing, better than crashing
      localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
    }
  }

  // 4. Migrate products — add isActive, ensure sku field exists
  const rawProducts = localStorage.getItem(KEYS.PRODUCTS);
  if (rawProducts) {
    try {
      const products: Product[] = JSON.parse(rawProducts);
      const migrated = products.map((p): Product => ({
        ...p,
        isActive: typeof (p as Product & { isActive?: boolean }).isActive === 'boolean'
          ? (p as Product & { isActive?: boolean }).isActive!
          : true,
        sku: (p as Product & { sku?: string }).sku ?? undefined,
      }));
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(migrated));
    } catch {
      // Corrupt products → reset to defaults
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
    }
  } else {
    // First run
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
  }

  // 5. Initialize new inventory tables (empty, not destructive if already exist)
  if (!localStorage.getItem(KEYS.STOCK_LEVELS)) {
    localStorage.setItem(KEYS.STOCK_LEVELS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.STOCK_MOVEMENTS)) {
    localStorage.setItem(KEYS.STOCK_MOVEMENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.INV_BATCHES)) {
    localStorage.setItem(KEYS.INV_BATCHES, JSON.stringify([]));
  }
}
