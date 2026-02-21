// Migration runner — applies schema migrations in sequence.
// Called once on app mount from root.provider.tsx.
// Fast path: skip if already at CURRENT_VERSION.

import { LocalStorageAdapter } from '../storage/localStorage.adapter';
import { migrateV3ToV4 } from './v3-to-v4';

export const CURRENT_VERSION = 'v4';

// Version ordering for migration chain
const VERSION_ORDER = ['', 'v1', 'v2', 'v3', 'v4'];

function versionIndex(v: string): number {
  const idx = VERSION_ORDER.indexOf(v);
  return idx >= 0 ? idx : 0; // unknown version treated as oldest
}

export async function runMigrations(adapter: LocalStorageAdapter): Promise<void> {
  const versionResult = await adapter.getSchemaVersion();
  const currentVersion = versionResult.ok ? versionResult.data : '';

  if (currentVersion === CURRENT_VERSION) return; // already up-to-date (fast path)

  const fromIdx = versionIndex(currentVersion);
  const toIdx   = versionIndex(CURRENT_VERSION);

  // Apply migrations in sequence
  for (let i = fromIdx; i < toIdx; i++) {
    const from = VERSION_ORDER[i];
    const to   = VERSION_ORDER[i + 1];

    if (from === 'v3' || from === '' || from === 'v1' || from === 'v2') {
      if (to === 'v4') {
        await migrateV3ToV4(adapter);
        await adapter.setSchemaVersion('v4');
      }
    }
  }
}
