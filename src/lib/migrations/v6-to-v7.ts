// v6 → v7 migration: clear demo clients and orders from localStorage.
//
// ⚠️ RETIRED FIRESTORE PURGE (C1 fix): this migration originally deleted EVERY
// document in the Firestore `clients` and `orders` collections. That was a
// one-time demo-data cleanup that already executed in production (June 2026).
// Replaying it from a fresh device would wipe REAL production data, so the
// Firestore deletion has been permanently removed. Only the harmless
// localStorage cleanup remains (a fresh device has empty localStorage anyway).

import { LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';

export async function migrateV6ToV7(_adapter: LocalStorageAdapter): Promise<void> {
  // Clear localStorage demo data (belt-and-suspenders; v5→v6 already did this)
  localStorage.setItem(KEYS.CLIENTS, JSON.stringify([]));
  localStorage.setItem(KEYS.ORDERS, JSON.stringify([]));
}
