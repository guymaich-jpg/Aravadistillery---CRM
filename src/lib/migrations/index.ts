// Migration runner — applies schema migrations in sequence.
// Called once on app mount from root.provider.tsx.
// Fast path: skip if already at CURRENT_VERSION.
//
// Version authority (C1 fix): localStorage alone is NOT trusted. A fresh
// browser/device starts at '' locally, but the shared Firestore database may
// already be fully migrated. When Firebase is configured, the runner reads
// the authoritative version from the Firestore meta/schema doc and uses the
// NEWER of (local, remote). If the remote version cannot be read, migrations
// are skipped entirely — never run destructive steps against a database whose
// state is unknown.

import { LocalStorageAdapter } from '../storage/localStorage.adapter';
import { FirestoreAdapter } from '../storage/firestore.adapter';
import { hasFirebaseConfig } from '../firebase/config';
import { migrateV3ToV4 } from './v3-to-v4';
import { migrateV4ToV5 } from './v4-to-v5';
import { migrateV5ToV6 } from './v5-to-v6';
import { migrateV6ToV7 } from './v6-to-v7';
import { migrateV7ToV8 } from './v7-to-v8';
import { migrateV8ToV9 } from './v8-to-v9';

export const CURRENT_VERSION = 'v9';

// Version ordering for migration chain
const VERSION_ORDER = ['', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9'];

function versionIndex(v: string): number {
  const idx = VERSION_ORDER.indexOf(v);
  if (idx >= 0) return idx;
  // Unknown version that looks like a future "vN" (e.g. v10, v11) means migrations
  // already ran past our current chain — treat as current to avoid replaying.
  const match = v.match(/^v(\d+)$/);
  if (match) {
    const currentMax = parseInt(CURRENT_VERSION.slice(1), 10);
    if (parseInt(match[1], 10) > currentMax) return VERSION_ORDER.length - 1;
  }
  return 0; // truly unknown: start from beginning
}

export async function runMigrations(localAdapter: LocalStorageAdapter): Promise<void> {
  const versionResult = await localAdapter.getSchemaVersion();
  let currentVersion = versionResult.ok ? versionResult.data : '';

  if (currentVersion === CURRENT_VERSION) return; // already up-to-date (fast path)

  // Firestore is the authoritative version source when Firebase is configured.
  // A fresh device must not replay the chain against an already-migrated database.
  let firestoreAdapter: FirestoreAdapter | null = null;
  if (hasFirebaseConfig()) {
    firestoreAdapter = new FirestoreAdapter();
    const remoteResult = await firestoreAdapter.getSchemaVersion();
    if (!remoteResult.ok) {
      // Unknown remote state — fail safe: run nothing, retry on next app mount.
      console.warn('[migrations] skipped: cannot read remote schema version:', remoteResult.error);
      return;
    }
    if (versionIndex(remoteResult.data) > versionIndex(currentVersion)) {
      currentVersion = remoteResult.data;
    }
  }

  const fromIdx = versionIndex(currentVersion);
  const toIdx   = versionIndex(CURRENT_VERSION);

  if (fromIdx >= toIdx) {
    // Remote is at (or past) current — just sync the local mirror and exit.
    await localAdapter.setSchemaVersion(CURRENT_VERSION);
    return;
  }

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
      if (firestoreAdapter) {
        await migrateV4ToV5(localAdapter, firestoreAdapter);
      }
      await localAdapter.setSchemaVersion('v5');
    }

    // v5 → v6: Clear legacy demo clients and orders (localStorage only)
    if (from === 'v5' && to === 'v6') {
      await migrateV5ToV6(localAdapter);
      await localAdapter.setSchemaVersion('v6');
    }

    // v6 → v7: Clear demo data (localStorage only — Firestore purge retired, see v6-to-v7.ts)
    if (from === 'v6' && to === 'v7') {
      await migrateV6ToV7(localAdapter);
      await localAdapter.setSchemaVersion('v7');
    }

    // v7 → v8: Rename name→businessName, remove company, add new client fields
    if (from === 'v7' && to === 'v8') {
      await migrateV7ToV8(localAdapter);
      await localAdapter.setSchemaVersion('v8');
    }

    // v8 → v9: Add fulfillmentStatus to orders (existing = 'shipped')
    if (from === 'v8' && to === 'v9') {
      await migrateV8ToV9(localAdapter);
      await localAdapter.setSchemaVersion('v9');
    }
  }

  // Record the completed version in Firestore so other devices skip the chain.
  if (firestoreAdapter) {
    const writeResult = await firestoreAdapter.setSchemaVersion(CURRENT_VERSION);
    if (!writeResult.ok) {
      console.warn('[migrations] could not write remote schema version:', writeResult.error);
    }
  }
}
