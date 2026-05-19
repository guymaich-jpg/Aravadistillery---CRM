import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/config', () => ({
  hasFirebaseConfig: vi.fn(() => false),
  getFirestoreDb: vi.fn(),
  getFirebaseAuth: vi.fn(() => ({ currentUser: { email: 'test@dev.local' } })),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(() => Promise.resolve()),
  collection: vi.fn(),
}));

import { AuditLogger } from '../audit-logger';
import { hasFirebaseConfig, getFirebaseAuth } from '@/lib/firebase/config';
import { setDoc } from 'firebase/firestore';

describe('AuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not log when Firebase is not configured', () => {
    vi.mocked(hasFirebaseConfig).mockReturnValue(false);
    const logger = new AuditLogger();

    logger.log({
      action: 'save',
      collection: 'clients',
      recordId: 'abc-123',
      snapshot: { id: 'abc-123', businessName: 'Test' },
    });

    expect(setDoc).not.toHaveBeenCalled();
  });

  it('logs to Firestore when Firebase is configured', async () => {
    vi.mocked(hasFirebaseConfig).mockReturnValue(true);
    const logger = new AuditLogger();

    logger.log({
      action: 'save',
      collection: 'clients',
      recordId: 'abc-123',
      snapshot: { id: 'abc-123', businessName: 'Test' },
    });

    // Give fire-and-forget Promise.all time to execute
    await new Promise(r => setTimeout(r, 50));

    expect(setDoc).toHaveBeenCalledTimes(1);
    const entry = vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(entry.action).toBe('save');
    expect(entry.collection).toBe('clients');
    expect(entry.recordId).toBe('abc-123');
    expect(entry.source).toBe('crm');
    expect(entry.userEmail).toBe('test@dev.local');
    expect(entry.timestamp).toBeDefined();
    expect(entry.id).toBeDefined();
  });

  it('includes correct user email from Firebase Auth', async () => {
    vi.mocked(hasFirebaseConfig).mockReturnValue(true);
    vi.mocked(getFirebaseAuth).mockReturnValue({
      currentUser: { email: 'manager@example.com' },
    } as ReturnType<typeof getFirebaseAuth>);
    const logger = new AuditLogger();

    logger.log({
      action: 'delete',
      collection: 'orders',
      recordId: 'order-1',
      snapshot: { id: 'order-1' },
    });

    await new Promise(r => setTimeout(r, 50));

    const entry = vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(entry.userEmail).toBe('manager@example.com');
    expect(entry.action).toBe('delete');
  });

  it('falls back to "unknown" when no auth user', async () => {
    vi.mocked(hasFirebaseConfig).mockReturnValue(true);
    vi.mocked(getFirebaseAuth).mockReturnValue({
      currentUser: null,
    } as ReturnType<typeof getFirebaseAuth>);
    const logger = new AuditLogger();

    logger.log({
      action: 'save',
      collection: 'products',
      recordId: 'prod-1',
      snapshot: { id: 'prod-1' },
    });

    await new Promise(r => setTimeout(r, 50));

    const entry = vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(entry.userEmail).toBe('unknown');
  });

  it('never throws even when Firestore write fails', () => {
    vi.mocked(hasFirebaseConfig).mockReturnValue(true);
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('Firestore offline'));
    const logger = new AuditLogger();

    expect(() => {
      logger.log({
        action: 'save',
        collection: 'clients',
        recordId: 'abc-123',
        snapshot: { id: 'abc-123' },
      });
    }).not.toThrow();
  });

  it('generates unique IDs for each entry', async () => {
    vi.mocked(hasFirebaseConfig).mockReturnValue(true);
    const logger = new AuditLogger();

    logger.log({ action: 'save', collection: 'clients', recordId: '1', snapshot: {} });
    logger.log({ action: 'save', collection: 'clients', recordId: '2', snapshot: {} });

    await new Promise(r => setTimeout(r, 50));

    const id1 = (vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>).id;
    const id2 = (vi.mocked(setDoc).mock.calls[1][1] as Record<string, unknown>).id;
    expect(id1).not.toBe(id2);
  });
});
