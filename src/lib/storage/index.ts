// Storage adapter factory — uses Firestore when config is available,
// falls back to localStorage for local development.

import { FirestoreAdapter } from './firestore.adapter';
import { LocalStorageAdapter } from './localStorage.adapter';
import { hasFirebaseConfig } from '../firebase/config';
import type { StorageAdapter } from './adapter';

export const storageAdapter: StorageAdapter = hasFirebaseConfig()
  ? new FirestoreAdapter()
  : new LocalStorageAdapter();

// Re-export types and helpers for convenience
export type { StorageAdapter, StorageResult, ExportPayload, StorageErrorCode } from './adapter';
export { ok, err } from './adapter';
export { KEYS } from './localStorage.adapter';
