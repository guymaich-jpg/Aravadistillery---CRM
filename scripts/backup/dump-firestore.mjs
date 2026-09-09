// Firestore backup — dumps every collection (recursively, including
// subcollections) to local JSON files via the Admin SDK.
//
// Read-only against Firestore. Does NOT use `gcloud firestore export`, so it
// needs no GCS bucket and no Blaze billing plan — only a service account
// with `roles/datastore.viewer` on the target project. See docs/backups.md.
//
// Usage:
//   FIRESTORE_BACKUP_SA_KEY='<service account JSON>' node dump-firestore.mjs [output-dir]
//   FIRESTORE_BACKUP_SA_KEY_FILE=/path/to/key.json node dump-firestore.mjs [output-dir]
//
// Output: <output-dir>/<collection>.json (one file per top-level collection;
// subcollections nest under `_sub_<name>` keys inside their parent docs).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function loadKey() {
  if (process.env.FIRESTORE_BACKUP_SA_KEY) {
    return JSON.parse(process.env.FIRESTORE_BACKUP_SA_KEY);
  }
  if (process.env.FIRESTORE_BACKUP_SA_KEY_FILE) {
    return JSON.parse(readFileSync(process.env.FIRESTORE_BACKUP_SA_KEY_FILE, 'utf8'));
  }
  console.error('ERROR: set FIRESTORE_BACKUP_SA_KEY (JSON) or FIRESTORE_BACKUP_SA_KEY_FILE (path)');
  process.exit(1);
}

const key = loadKey();
const app = initializeApp({ credential: cert(key) }, 'backup');
const db = getFirestore(app);

const outRoot = process.argv[2] || './firestore-backup-out';
mkdirSync(outRoot, { recursive: true });

async function dumpCollection(colRef) {
  const snap = await colRef.get();
  const docs = [];
  for (const doc of snap.docs) {
    const entry = { _id: doc.id, ...doc.data() };
    const subcols = await doc.ref.listCollections();
    for (const sub of subcols) {
      entry[`_sub_${sub.id}`] = await dumpCollection(sub);
    }
    docs.push(entry);
  }
  return docs;
}

const collections = await db.listCollections();
let total = 0;
for (const col of collections) {
  const docs = await dumpCollection(col);
  writeFileSync(join(outRoot, `${col.id}.json`), JSON.stringify(docs, null, 1));
  console.log(`${col.id}: ${docs.length} docs`);
  total += docs.length;
}
console.log(`\nDumped ${total} docs from ${collections.length} collections`);
console.log(`Backup dir: ${outRoot}`);
