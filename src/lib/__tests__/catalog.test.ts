import { describe, it, expect } from 'vitest';
import { CATALOG, priceForClientType } from '../catalog';
import { CLIENT_TYPE_LABELS, CLIENT_TYPE_OPTIONS } from '../constants';

describe('catalog', () => {
  it('has the 19 finished-product SKUs with unique ids and non-negative prices', () => {
    expect(CATALOG).toHaveLength(19);
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(19);
    for (const p of CATALOG) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.basePrice).toBeGreaterThanOrEqual(0);
      expect(p.wholesalePrice).toBeGreaterThanOrEqual(0);
      expect(p.isActive).toBe(true);
      expect(p.unit).toBe('בקבוק');
    }
  });

  it('matches a few known prices from the catalog', () => {
    const byName = (n: string) => CATALOG.find((p) => p.name === n)!;
    expect(byName('ערק 500 מ"ל').basePrice).toBe(80);
    expect(byName('ערק 200 מ"ל').basePrice).toBe(40);
    expect(byName('ג\'ין 200 מ"ל').basePrice).toBe(50);
    expect(byName('גין עידו').basePrice).toBe(110);
    expect(byName('ערק גלי').basePrice).toBe(40);
  });
});

describe('priceForClientType', () => {
  const product = { id: 'x', name: 't', category: 'other' as const, basePrice: 100, wholesalePrice: 70, unit: 'בקבוק', isActive: true };

  it('returns the wholesale price for wholesaler clients', () => {
    expect(priceForClientType(product, 'wholesaler')).toBe(70);
  });

  it('returns the base price for every other client type', () => {
    expect(priceForClientType(product, 'business')).toBe(100);
    expect(priceForClientType(product, 'private')).toBe(100);
    expect(priceForClientType(product, undefined)).toBe(100);
  });

  it('falls back to base price when a wholesaler product has no wholesale price', () => {
    const noWholesale = { ...product, wholesalePrice: undefined };
    expect(priceForClientType(noWholesale, 'wholesaler')).toBe(100);
  });
});

describe('client type', () => {
  it('includes wholesaler (סיטונאי)', () => {
    expect(CLIENT_TYPE_OPTIONS).toContain('wholesaler');
    expect(CLIENT_TYPE_LABELS.wholesaler).toBe('סיטונאי');
  });
});
