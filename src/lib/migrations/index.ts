// Migration runner — applies schema migrations in sequence.
// Called once on app mount from root.provider.tsx.
// Fast path: skip if already at CURRENT_VERSION.

import { LocalStorageAdapter } from '../storage/localStorage.adapter';
import { FirestoreAdapter } from '../storage/firestore.adapter';
import { hasFirebaseConfig } from '../firebase/config';
import { migrateV3ToV4 } from './v3-to-v4';
import { migrateV4ToV5 } from './v4-to-v5';
import { migrateV5ToV6 } from './v5-to-v6';

export const CURRENT_VERSION = 'v6';

// Version ordering for migration chain
const VERSION_ORDER = ['', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6'];

function versionIndex(v: string): number {
  const idx = VERSION_ORDER.indexOf(v);
  return idx >= 0 ? idx : 0; // unknown version treated as oldest
}

export async function runMigrations(localAdapter: LocalStorageAdapter): Promise<void> {
  const versionResult = await localAdapter.getSchemaVersion();
  const currentVersion = versionResult.ok ? versionResult.data : '';

  if (currentVersion === CURRENT_VERSION) return; // already up-to-date (fast path)

  const fromIdx = versionIndex(currentVersion);
  const toIdx   = versionIndex(CURRENT_VERSION);

  // Apply migrations in sequence
  for (let i = fromIdx; i < toIdx; i++) {
    const from = VERSION_ORDER[i];
    const to   = VERSION_ORDER[i + 1];

    // v3 → v4: Add new fields to existing localStorage data
    if (to === 'v4' && (from === 'v3' || from === '' || from === 'v1' || from === 'v2')) {
      await migrateV3ToV4(localAdapter);
      await localAdapter.setSchemaVersion('v4');
    }

    // v4 → v5: Migrate localStorage data to Firestore (if configured)
    if (from === 'v4' && to === 'v5') {
      if (hasFirebaseConfig()) {
        const firestoreAdapter = new FirestoreAdapter();
        await migrateV4ToV5(localAdapter, firestoreAdapter);
      }
      await localAdapter.setSchemaVersion('v5');
    }

    // v5 → v6: Clear legacy demo clients and orders
    if (from === 'v5' && to === 'v6') {
      await migrateV5ToV6(localAdapter);
      await localAdapter.setSchemaVersion('v6');
    }
  }
}
