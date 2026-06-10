// Integration tests for stock level validation (Factory → CRM data bridge)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateStockLevel } from '@/lib/validation/stockLevel';

describe('validateStockLevel — Factory stock doc validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('parses a valid Factory stock doc correctly', () => {
    const raw = {
      productId: 'prod-araq-750',
      currentStock: 120,
      minimumStock: 10,
      unit: 'bottles',
      lastUpdated: '2026-06-06T14:30:00Z',
      factoryLastSync: '2026-06-06T14:30:00Z',
    };

    const result = validateStockLevel('doc1', raw);
    expect(result).not.toBeNull();
    expect(result!.productId).toBe('prod-araq-750');
    expect(result!.currentStock).toBe(120);
    expect(result!.minimumStock).toBe(10);
    expect(result!.unit).toBe('bottles');
    expect(result!.lastUpdated).toBe('2026-06-06T14:30:00Z');
    expect(result!.factoryLastSync).toBe('2026-06-06T14:30:00Z');
  });

  it('rejects doc with missing productId — returns null', () => {
    const raw = {
      currentStock: 50,
      unit: 'bottles',
      lastUpdated: '2026-06-06T14:30:00Z',
    };

    const result = validateStockLevel('doc-no-pid', raw);
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('rejects doc with currentStock as string "50" — type mismatch', () => {
    const raw = {
      productId: 'prod-1',
      currentStock: '50', // string, not number
      unit: 'bottles',
      lastUpdated: '2026-06-06T14:30:00Z',
    };

    const result = validateStockLevel('doc-str-stock', raw);
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('accepts doc with factoryLastSync missing — optional field', () => {
    const raw = {
      productId: 'prod-2',
      currentStock: 30,
      unit: 'liters',
      lastUpdated: '2026-06-05T10:00:00Z',
    };

    const result = validateStockLevel('doc-no-sync', raw);
    expect(result).not.toBeNull();
    expect(result!.productId).toBe('prod-2');
    expect(result!.currentStock).toBe(30);
    expect(result!.factoryLastSync).toBeUndefined();
    expect(result!.minimumStock).toBe(0); // defaults to 0 when missing
  });

  it('rejects doc with negative currentStock', () => {
    const raw = {
      productId: 'prod-3',
      currentStock: -5,
      unit: 'bottles',
      lastUpdated: '2026-06-06T14:30:00Z',
    };

    const result = validateStockLevel('doc-neg-stock', raw);
    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });

  it('rejects null data', () => {
    const result = validateStockLevel('doc-null', null);
    expect(result).toBeNull();
  });

  it('rejects doc with empty unit string', () => {
    const raw = {
      productId: 'prod-4',
      currentStock: 10,
      unit: '',
      lastUpdated: '2026-06-06T14:30:00Z',
    };

    const result = validateStockLevel('doc-empty-unit', raw);
    expect(result).toBeNull();
  });

  it('rejects doc with invalid lastUpdated date string', () => {
    const raw = {
      productId: 'prod-5',
      currentStock: 10,
      unit: 'bottles',
      lastUpdated: 'not-a-date',
    };

    const result = validateStockLevel('doc-bad-date', raw);
    expect(result).toBeNull();
  });

  it('rejects doc with negative minimumStock', () => {
    const raw = {
      productId: 'prod-6',
      currentStock: 10,
      minimumStock: -1,
      unit: 'bottles',
      lastUpdated: '2026-06-06T14:30:00Z',
    };

    const result = validateStockLevel('doc-neg-min', raw);
    expect(result).toBeNull();
  });

  it('accepts Firestore Timestamp objects for lastUpdated', () => {
    const fakeTimestamp = {
      toDate: () => new Date('2026-06-06T14:30:00Z'),
      seconds: 1780847400,
      nanoseconds: 0,
    };
    const raw = {
      productId: 'prod-ts',
      currentStock: 25,
      unit: 'bottles',
      lastUpdated: fakeTimestamp,
    };

    const result = validateStockLevel('doc-timestamp', raw);
    expect(result).not.toBeNull();
    expect(result!.lastUpdated).toBe('2026-06-06T14:30:00.000Z');
    expect(result!.currentStock).toBe(25);
  });

  it('accepts Firestore Timestamp objects for factoryLastSync', () => {
    const fakeTimestamp = {
      toDate: () => new Date('2026-06-07T08:00:00Z'),
    };
    const raw = {
      productId: 'prod-ts2',
      currentStock: 10,
      unit: 'bottles',
      lastUpdated: '2026-06-07T08:00:00Z',
      factoryLastSync: fakeTimestamp,
    };

    const result = validateStockLevel('doc-ts-sync', raw);
    expect(result).not.toBeNull();
    expect(result!.factoryLastSync).toBe('2026-06-07T08:00:00.000Z');
  });

  it('ignores invalid factoryLastSync type without rejecting doc', () => {
    const raw = {
      productId: 'prod-ts3',
      currentStock: 10,
      unit: 'bottles',
      lastUpdated: '2026-06-07T08:00:00Z',
      factoryLastSync: 12345, // number, not string or Timestamp
    };

    const result = validateStockLevel('doc-bad-sync-type', raw);
    expect(result).not.toBeNull();
    expect(result!.factoryLastSync).toBeUndefined();
  });
});
