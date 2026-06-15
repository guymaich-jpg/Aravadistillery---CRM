// Contract test: verifies the CRM accepts the exact data format
// that the Factory Control app writes to Firestore stockLevels.
// If this test fails, the two apps are out of sync.

import { describe, it, expect } from 'vitest';
import { validateStockLevel } from '../stockLevel';

// This is the exact shape Factory Control's syncCrmStockLevels() writes:
//   fbSetDoc('stockLevels', productId, { productId, currentStock, unit, lastUpdated, factoryLastSync }, true)
function makeFactoryDoc(productId: string, currentStock: number) {
  return {
    productId,
    currentStock,
    unit: 'בקבוק',
    lastUpdated: new Date().toISOString(),
    factoryLastSync: new Date().toISOString(),
  };
}

describe('Factory→CRM stock level contract', () => {
  it('accepts all 7 factory product IDs', () => {
    const mapping = { '1': 54, '2': 54, '3': 34, '4': 34, '5': 20, '6': 15, '7': 10 };
    for (const [pid, stock] of Object.entries(mapping)) {
      const result = validateStockLevel(pid, makeFactoryDoc(pid, stock));
      expect(result, `product ${pid} should validate`).not.toBeNull();
      expect(result!.productId).toBe(pid);
      expect(result!.currentStock).toBe(stock);
    }
  });

  it('preserves exact currentStock values through validation', () => {
    const doc = makeFactoryDoc('5', 303);
    const result = validateStockLevel('5', doc);
    expect(result!.currentStock).toBe(303);
  });

  it('accepts zero stock', () => {
    const result = validateStockLevel('6', makeFactoryDoc('6', 0));
    expect(result).not.toBeNull();
    expect(result!.currentStock).toBe(0);
  });

  it('defaults minimumStock to 0 when not sent by factory', () => {
    const result = validateStockLevel('1', makeFactoryDoc('1', 50));
    expect(result!.minimumStock).toBe(0);
  });

  it('preserves CRM-set minimumStock from merged doc', () => {
    const doc = { ...makeFactoryDoc('1', 50), minimumStock: 10 };
    const result = validateStockLevel('1', doc);
    expect(result!.minimumStock).toBe(10);
  });

  it('returns factoryLastSync as ISO string', () => {
    const result = validateStockLevel('1', makeFactoryDoc('1', 50));
    expect(result!.factoryLastSync).toBeDefined();
    expect(new Date(result!.factoryLastSync!).getTime()).not.toBeNaN();
  });

  it('rejects doc missing productId', () => {
    const doc = { currentStock: 50, unit: 'בקבוק', lastUpdated: new Date().toISOString() };
    expect(validateStockLevel('1', doc)).toBeNull();
  });

  it('rejects doc with negative currentStock', () => {
    expect(validateStockLevel('1', makeFactoryDoc('1', -5))).toBeNull();
  });

  it('rejects doc missing lastUpdated', () => {
    const doc = { productId: '1', currentStock: 50, unit: 'בקבוק' };
    expect(validateStockLevel('1', doc)).toBeNull();
  });

  it('full round-trip: factory writes → CRM validates → inventory screen joins', () => {
    // Simulate what the Factory writes (7 products, 1:1 mapping)
    const factoryWrites = [
      makeFactoryDoc('1', 54),  // ערק
      makeFactoryDoc('2', 54),  // ליקוריץ
      makeFactoryDoc('3', 34),  // EDV
      makeFactoryDoc('4', 34),  // ג'ין
      makeFactoryDoc('5', 20),  // ברנדי VS
      makeFactoryDoc('6', 15),  // ברנדי VSOP
      makeFactoryDoc('7', 10),  // ברנדי ים תיכוני
    ];

    // CRM validates each doc (same as onSnapshot path)
    const validated = factoryWrites
      .map((doc, i) => validateStockLevel(String(i + 1), doc))
      .filter(l => l !== null);

    expect(validated).toHaveLength(7);

    // CRM InventoryScreen builds a levelMap for join
    const levelMap = new Map(validated.map(l => [l!.productId, l!]));

    // Simulate CRM products (from seed.ts)
    const crmProducts = [
      { id: '1', name: 'ערק' },
      { id: '2', name: 'ליקוריץ' },
      { id: '3', name: 'EDV' },
      { id: '4', name: "ג'ין" },
      { id: '5', name: 'ברנדי VS' },
      { id: '6', name: 'ברנדי VSOP' },
      { id: '7', name: 'ברנדי ים תיכוני' },
    ];

    // Build stock rows same as InventoryScreen.tsx line 48-63
    const stockRows = crmProducts.map(product => {
      const level = levelMap.get(product.id);
      return {
        name: product.name,
        current: level?.currentStock ?? 0,
      };
    });

    expect(stockRows).toEqual([
      { name: 'ערק', current: 54 },
      { name: 'ליקוריץ', current: 54 },
      { name: 'EDV', current: 34 },
      { name: "ג'ין", current: 34 },
      { name: 'ברנדי VS', current: 20 },
      { name: 'ברנדי VSOP', current: 15 },
      { name: 'ברנדי ים תיכוני', current: 10 },
    ]);
  });
});
