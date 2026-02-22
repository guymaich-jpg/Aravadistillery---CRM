// v5 → v6 migration: clear legacy demo/seed clients and orders.
// Previous versions shipped with fake Hebrew clients baked into localStorage.
// Real users haven't been onboarded yet, so any client/order data at this
// point is leftover demo data.  Products (real distillery catalog) are kept.

import { LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';

export async function migrateV5ToV6(_adapter: LocalStorageAdapter): Promise<void> {
  // Wipe demo clients and orders — the app starts clean for real users
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify([]));
  localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));

  // Leave products, stock levels, movements, and batches intact —
  // products are the real Arava Distillery catalog, not demo data.
}
