// SINGLE FILE TO CHANGE when switching from localStorage to a real API.
// Replace LocalStorageAdapter with ApiAdapter and update the import.

import { LocalStorageAdapter } from './localStorage.adapter';
import type { StorageAdapter } from './adapter';

export const storageAdapter: StorageAdapter = new LocalStorageAdapter();

// Re-export types and helpers for convenience
export type { StorageAdapter, StorageResult, ExportPayload, StorageErrorCode } from './adapter';
export { ok, err } from './adapter';
export { KEYS } from './localStorage.adapter';
