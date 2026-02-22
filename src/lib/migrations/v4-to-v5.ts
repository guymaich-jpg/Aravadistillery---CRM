// v4 → v5 migration: Migrates data from localStorage to Firestore.
// Idempotent — checks if data already exists before writing.
// Only runs when Firebase is configured.

import { LocalStorageAdapter, KEYS } from '../storage/localStorage.adapter';
import { FirestoreAdapter } from '../storage/firestore.adapter';
import { hasFirebaseConfig } from '../firebase/config';

export async function migrateV4ToV5(
  localAdapter: LocalStorageAdapter,
  firestoreAdapter: FirestoreAdapter,
): Promise<void> {
  // Skip if Firebase is not configured (local-only mode)
  if (!hasFirebaseConfig()) return;

  // Check if Firestore already has data (idempotent)
  const existingClients = await firestoreAdapter.getClients();
  if (existingClients.ok && existingClients.data.length > 0) {
    // Data already exists in Firestore — skip migration
    return;
  }

  // Read all data from localStorage
  const [clients, orders, products, stockLevels, stockMovements, batches] = await Promise.all([
    localAdapter.getClients(),
    localAdapter.getOrders(),
    localAdapter.getProducts(),
    localAdapter.getStockLevels(),
    localAdapter.getStockMovements(),
    localAdapter.getInventoryBatches(),
  ]);

  // Write each collection to Firestore
  if (clients.ok) {
    for (const client of clients.data) {
      await firestoreAdapter.saveClient(client);
    }
  }

  if (orders.ok) {
    for (const order of orders.data) {
      await firestoreAdapter.saveOrder(order);
    }
  }

  if (products.ok) {
    for (const product of products.data) {
      await firestoreAdapter.saveProduct(product);
    }
  }

  if (stockLevels.ok) {
    for (const level of stockLevels.data) {
      await firestoreAdapter.saveStockLevel(level);
    }
  }

  if (stockMovements.ok) {
    for (const movement of stockMovements.data) {
      await firestoreAdapter.saveStockMovement(movement);
    }
  }

  if (batches.ok) {
    for (const batch of batches.data) {
      await firestoreAdapter.saveInventoryBatch(batch);
    }
  }

  // Set schema version in Firestore
  await firestoreAdapter.setSchemaVersion('v5');

  // Also update localStorage version so future local runs don't re-migrate
  localStorage.setItem(KEYS.SCHEMA_VERSION, 'v5');
}
