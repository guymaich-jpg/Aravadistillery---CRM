// Migration chain tests — verifies each step and the full migration runner.

import { vi } from 'vitest';
import { LocalStorageAdapter, KEYS } from '@/lib/storage/localStorage.adapter';
import { migrateV3ToV4 } from '../v3-to-v4';
import { migrateV5ToV6 } from '../v5-to-v6';
import { migrateV7ToV8 } from '../v7-to-v8';
import { runMigrations, CURRENT_VERSION } from '../index';

// Force local-only path — no Firestore in tests
vi.mock('@/lib/firebase/config', () => ({
  hasFirebaseConfig: () => false,
}));

describe('v3 → v4 migration', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
  });

  it('migrates clients without destroying data', async () => {
    const oldClients = [
      {
        id: 'c1',
        name: 'Test',
        phone: '050',
        email: '',
        address: '',
        status: 'active',
        tags: [],
        notes: '',
        createdAt: '2025-01-01',
      },
    ];
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(oldClients));

    await migrateV3ToV4(adapter);

    const migrated = JSON.parse(localStorage.getItem(KEYS.CLIENTS)!);
    expect(migrated).toHaveLength(1);
    // Client data is preserved; deletedAt defaults to undefined (omitted in JSON)
    expect(migrated[0].id).toBe('c1');
    expect(migrated[0].name).toBe('Test');
    expect(migrated[0].deletedAt).toBeUndefined();
  });

  it('adds amountPaid to orders (paid = full amount)', async () => {
    const oldOrders = [
      {
        id: 'o1',
        clientId: 'c1',
        clientName: 'Test',
        items: [],
        subtotal: 100,
        totalDiscount: 0,
        total: 100,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        notes: '',
        createdAt: '2025-01-01',
      },
    ];
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(oldOrders));

    await migrateV3ToV4(adapter);

    const migrated = JSON.parse(localStorage.getItem(KEYS.ORDERS)!);
    expect(migrated).toHaveLength(1);
    expect(migrated[0].amountPaid).toBe(100);
  });

  it('sets amountPaid to 0 for pending orders', async () => {
    const oldOrders = [
      {
        id: 'o2',
        clientId: 'c1',
        clientName: 'Test',
        items: [],
        subtotal: 200,
        totalDiscount: 0,
        total: 200,
        paymentStatus: 'pending',
        paymentMethod: 'cash',
        notes: '',
        createdAt: '2025-01-01',
      },
    ];
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(oldOrders));

    await migrateV3ToV4(adapter);

    const migrated = JSON.parse(localStorage.getItem(KEYS.ORDERS)!);
    expect(migrated[0].amountPaid).toBe(0);
  });

  it('seeds default products with isActive when no products exist', async () => {
    // No PRODUCTS key in localStorage
    await migrateV3ToV4(adapter);

    const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS)!);
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.isActive).toBe(true);
    }
  });

  it('initializes empty inventory tables', async () => {
    await migrateV3ToV4(adapter);

    expect(JSON.parse(localStorage.getItem(KEYS.STOCK_LEVELS)!)).toEqual([]);
    expect(JSON.parse(localStorage.getItem(KEYS.STOCK_MOVEMENTS)!)).toEqual([]);
    expect(JSON.parse(localStorage.getItem(KEYS.INV_BATCHES)!)).toEqual([]);
  });
});

describe('v5 → v6 migration', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
  });

  it('clears localStorage clients and orders (demo data cleanup)', async () => {
    // Seed some demo data
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify([{ id: 'demo1' }]));
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([{ id: 'demo-order1' }]));
    localStorage.setItem(KEYS.PRODUCTS, JSON.stringify([{ id: 'p1', name: 'Arak' }]));

    await migrateV5ToV6(adapter);

    expect(JSON.parse(localStorage.getItem(KEYS.CLIENTS)!)).toEqual([]);
    expect(JSON.parse(localStorage.getItem(KEYS.ORDERS)!)).toEqual([]);
    // Products should remain untouched
    const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS)!);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Arak');
  });
});

describe('v7 → v8 migration', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
  });

  it('renames name → businessName and adds new client fields', async () => {
    const oldClients = [
      {
        id: 'c1',
        name: 'OldName',
        company: 'OldCo',
        phone: '050',
        email: '',
        address: '',
        status: 'active',
        tags: [],
        notes: '',
        createdAt: '2025-01-01',
      },
    ];
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(oldClients));

    await migrateV7ToV8(adapter);

    const migrated = JSON.parse(localStorage.getItem(KEYS.CLIENTS)!);
    expect(migrated).toHaveLength(1);

    const client = migrated[0];
    expect(client.businessName).toBe('OldName');
    expect(client.contactPerson).toBe('');
    expect(client.area).toBe('');
    expect(client.clientType).toBe('business');
    // Old fields should be removed
    expect(client).not.toHaveProperty('name');
    expect(client).not.toHaveProperty('company');
  });

  it('preserves deletedAt if present on old client', async () => {
    const oldClients = [
      {
        id: 'c2',
        name: 'Deleted',
        company: '',
        phone: '050',
        email: '',
        address: '',
        status: 'active',
        tags: [],
        notes: '',
        createdAt: '2025-01-01',
        deletedAt: '2025-06-01',
      },
    ];
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(oldClients));

    await migrateV7ToV8(adapter);

    const migrated = JSON.parse(localStorage.getItem(KEYS.CLIENTS)!);
    expect(migrated[0].deletedAt).toBe('2025-06-01');
  });
});

describe('Full migration chain (runMigrations)', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
  });

  it('CURRENT_VERSION is v8', () => {
    expect(CURRENT_VERSION).toBe('v8');
  });

  it('starting from no version, sets schema to v8', async () => {
    // No SCHEMA_VERSION in localStorage → treated as earliest version
    await runMigrations(adapter);

    const version = localStorage.getItem(KEYS.SCHEMA_VERSION);
    expect(version).toBe('v8');
  });

  it('skips migrations when already at v8', async () => {
    localStorage.setItem(KEYS.SCHEMA_VERSION, 'v8');
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify([{ id: 'keep-me' }]));

    await runMigrations(adapter);

    // Data should be untouched — migrations did not run
    const clients = JSON.parse(localStorage.getItem(KEYS.CLIENTS)!);
    expect(clients).toEqual([{ id: 'keep-me' }]);
  });
});
