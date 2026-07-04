// C1 regression tests — Firestore-authoritative schema versioning.
// A fresh device (empty localStorage) must NEVER replay the migration chain
// against an already-migrated shared Firestore database.

import { vi } from 'vitest';
import { LocalStorageAdapter, KEYS } from '@/lib/storage/localStorage.adapter';
import { runMigrations, CURRENT_VERSION } from '../index';

const mockGetSchemaVersion = vi.fn();
const mockSetSchemaVersion = vi.fn(async (_v: string) => ({ ok: true as const, data: undefined }));

vi.mock('@/lib/firebase/config', () => ({
  hasFirebaseConfig: () => true,
}));

vi.mock('@/lib/storage/firestore.adapter', () => ({
  FirestoreAdapter: class {
    getSchemaVersion = () => mockGetSchemaVersion();
    setSchemaVersion = (v: string) => mockSetSchemaVersion(v);
  },
}));

describe('runMigrations — Firestore-authoritative versioning (C1)', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
    mockGetSchemaVersion.mockReset();
    mockSetSchemaVersion.mockClear();
  });

  it('fresh device + fully migrated Firestore ⇒ chain NOT replayed, zero deletes', async () => {
    // Fresh browser: no local version. Shared database already at v9.
    mockGetSchemaVersion.mockResolvedValue({ ok: true, data: 'v9' });

    await runMigrations(adapter);

    // Local mirror synced to current — but the chain did not run:
    expect(localStorage.getItem(KEYS.SCHEMA_VERSION)).toBe(CURRENT_VERSION);
    // v3→v4 initializes CLIENTS/ORDERS keys — their absence proves no replay
    expect(localStorage.getItem(KEYS.CLIENTS)).toBeNull();
    expect(localStorage.getItem(KEYS.ORDERS)).toBeNull();
  });

  it('remote version unreadable ⇒ fail safe, nothing runs', async () => {
    mockGetSchemaVersion.mockResolvedValue({ ok: false, error: 'Missing or insufficient permissions', code: 'PERMISSION_DENIED' });

    await runMigrations(adapter);

    // No version written, no migration side effects
    expect(localStorage.getItem(KEYS.SCHEMA_VERSION)).toBeNull();
    expect(localStorage.getItem(KEYS.CLIENTS)).toBeNull();
    expect(mockSetSchemaVersion).not.toHaveBeenCalled();
  });

  it('remote version ahead of local chain (v10) ⇒ treated as current, no replay', async () => {
    mockGetSchemaVersion.mockResolvedValue({ ok: true, data: 'v10' });

    await runMigrations(adapter);

    expect(localStorage.getItem(KEYS.SCHEMA_VERSION)).toBe(CURRENT_VERSION);
    expect(localStorage.getItem(KEYS.CLIENTS)).toBeNull();
  });

  it('device mid-chain (v8) runs remaining migrations and records v9 remotely', async () => {
    localStorage.setItem(KEYS.SCHEMA_VERSION, 'v8');
    mockGetSchemaVersion.mockResolvedValue({ ok: true, data: 'v8' });
    localStorage.setItem(KEYS.ORDERS, JSON.stringify([
      { id: 'o1', clientId: 'c1', total: 100, paymentStatus: 'paid', createdAt: '2026-01-01' },
    ]));

    await runMigrations(adapter);

    expect(localStorage.getItem(KEYS.SCHEMA_VERSION)).toBe('v9');
    const orders = JSON.parse(localStorage.getItem(KEYS.ORDERS)!);
    expect(orders[0].fulfillmentStatus).toBe('shipped'); // v8→v9 ran
    expect(orders[0].id).toBe('o1');                     // data preserved
    expect(mockSetSchemaVersion).toHaveBeenCalledWith('v9'); // remote recorded
  });
});
