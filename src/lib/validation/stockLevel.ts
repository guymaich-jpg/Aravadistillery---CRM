// Runtime validation for StockLevel documents coming from Firestore.
// Factory Control pushes these docs — we cannot trust their shape.

import type { StockLevel } from '@/types/inventory';

/**
 * Validate a raw Firestore document and return a typed StockLevel or null.
 * On failure, logs a warning with details and returns null (graceful degradation).
 */
export function validateStockLevel(docId: string, data: unknown): StockLevel | null {
  if (data == null || typeof data !== 'object') {
    console.warn(`[stockLevel] Doc "${docId}" is not an object — skipping.`, data);
    return null;
  }

  const doc = data as Record<string, unknown>;

  // productId: required string
  if (typeof doc.productId !== 'string' || doc.productId.length === 0) {
    console.warn(`[stockLevel] Doc "${docId}" has invalid productId — skipping.`, doc.productId);
    return null;
  }

  // currentStock: required number >= 0
  if (typeof doc.currentStock !== 'number' || !isFinite(doc.currentStock) || doc.currentStock < 0) {
    console.warn(`[stockLevel] Doc "${docId}" has invalid currentStock — skipping.`, doc.currentStock);
    return null;
  }

  // unit: required string
  if (typeof doc.unit !== 'string' || doc.unit.length === 0) {
    console.warn(`[stockLevel] Doc "${docId}" has invalid unit — skipping.`, doc.unit);
    return null;
  }

  // lastUpdated: required — accepts ISO string or Firestore Timestamp object
  let lastUpdated: string;
  if (typeof doc.lastUpdated === 'string' && doc.lastUpdated.length > 0) {
    const parsedDate = new Date(doc.lastUpdated);
    if (isNaN(parsedDate.getTime())) {
      console.warn(`[stockLevel] Doc "${docId}" has unparseable lastUpdated — skipping.`, doc.lastUpdated);
      return null;
    }
    lastUpdated = doc.lastUpdated;
  } else if (doc.lastUpdated && typeof doc.lastUpdated === 'object' && typeof (doc.lastUpdated as { toDate?: unknown }).toDate === 'function') {
    // Firestore Timestamp object — convert to ISO string
    try {
      lastUpdated = ((doc.lastUpdated as { toDate: () => Date }).toDate()).toISOString();
    } catch {
      console.warn(`[stockLevel] Doc "${docId}" has invalid Timestamp lastUpdated — skipping.`, doc.lastUpdated);
      return null;
    }
  } else {
    console.warn(`[stockLevel] Doc "${docId}" has invalid lastUpdated — skipping.`, doc.lastUpdated);
    return null;
  }

  // minimumStock: optional number >= 0
  let minimumStock = 0;
  if (doc.minimumStock !== undefined && doc.minimumStock !== null) {
    if (typeof doc.minimumStock !== 'number' || !isFinite(doc.minimumStock) || doc.minimumStock < 0) {
      console.warn(`[stockLevel] Doc "${docId}" has invalid minimumStock — skipping.`, doc.minimumStock);
      return null;
    }
    minimumStock = doc.minimumStock;
  }

  // factoryLastSync: optional — accepts string or Firestore Timestamp
  let factoryLastSync: string | undefined;
  if (doc.factoryLastSync !== undefined && doc.factoryLastSync !== null) {
    if (typeof doc.factoryLastSync === 'string') {
      factoryLastSync = doc.factoryLastSync;
    } else if (typeof doc.factoryLastSync === 'object' && typeof (doc.factoryLastSync as { toDate?: unknown }).toDate === 'function') {
      try {
        factoryLastSync = ((doc.factoryLastSync as { toDate: () => Date }).toDate()).toISOString();
      } catch {
        // Non-critical — skip this field rather than rejecting the whole doc
      }
    }
    // If it's some other type, just ignore the field (don't reject the doc)
  }

  return {
    productId: doc.productId,
    currentStock: doc.currentStock,
    minimumStock,
    unit: doc.unit,
    lastUpdated,
    ...(factoryLastSync !== undefined && { factoryLastSync }),
  };
}
