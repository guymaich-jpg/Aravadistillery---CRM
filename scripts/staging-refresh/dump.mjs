// Dump every Firestore collection (recursively) to local JSON files.
//
// A safety-net backup that needs no billing account — unlike the native
// `gcloud firestore export` pipeline (.github/workflows/firestore-backup.yml),
// which requires Blaze. Reads only; never writes to Firestore.
//
// Usage:
//   PROD_SA_KEY=~/.arava-keys/prod-reader.json node dump.mjs [output-dir]
//
// Output: <output-dir or ~/Arava-backups>/<project>-<timestamp>/<collection>.json

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const keyPath = process.env.PROD_SA_KEY;
if (!keyPath) {
  console.error('ERROR: set PROD_SA_KEY to the service-account key path');
  process.exit(1);
}
const key = JSON.parse(readFileSync(keyPath.replace(/^~/, homedir()), 'utf8'));

const app = initializeApp({ credential: cert(key) }, 'dump');
const db = getFirestore(app);

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
const outRoot = join(
  process.argv[2] || join(homedir(), 'Arava-backups'),
  `${key.project_id}-${stamp}`,
);
mkdirSync(outRoot, { recursive: true });

/** Read all docs in a collection, recursing into subcollections. */
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
