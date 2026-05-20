// Storage adapter factory — uses Firestore when config is available,
// falls back to localStorage for local development.
// Wraps with audit logging in production for append-only backup.

import { FirestoreAdapter } from './firestore.adapter';
import { LocalStorageAdapter } from './localStorage.adapter';
import { AuditedStorageAdapter } from './audited.adapter';
import { hasFirebaseConfig } from '../firebase/config';
import { auditLogger } from '../audit';
import type { StorageAdapter } from './adapter';

function createAdapter(): StorageAdapter {
  const base = hasFirebaseConfig()
    ? new FirestoreAdapter()
    : new LocalStorageAdapter();

  if (hasFirebaseConfig()) {
    return new AuditedStorageAdapter(base, auditLogger);
  }
  return base;
}

export const storageAdapter: StorageAdapter = createAdapter();

// Re-export types and helpers for convenience
export type { StorageAdapter, StorageResult, ExportPayload, StorageErrorCode } from './adapter';
export { ok, err } from './adapter';
export { KEYS } from './localStorage.adapter';
