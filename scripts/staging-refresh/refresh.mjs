#!/usr/bin/env node
// staging-refresh — wipe the staging Firestore and copy production into it.
//
// Usage:
//   PROD_SA_KEY=path/to/prod-readonly-sa.json \
//   STAGING_SA_KEY=path/to/staging-sa.json \
//   npm run refresh -- --yes
//
// Safety model:
//   - The prod service account only needs datastore read (grant Viewer /
//     roles/datastore.viewer) — this script never writes to production.
//   - The staging project id MUST be different from prod and MUST contain
//     "staging"; otherwise the script refuses to run.
//   - Requires an explicit --yes flag because it DELETES all staging data.
//
// What is copied: every root collection except audit_log and invitations
// (audit history is meaningless in staging; invitations carry live signup
// tokens). Includes meta/schema so both apps see the right schema version.

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EXCLUDED_COLLECTIONS = new Set(['audit_log', 'invitations']);
const BATCH_SIZE = 400;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function loadKey(envVar) {
  const path = process.env[envVar];
  if (!path) fail(`${envVar} env var must point to a service-account JSON key file`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    fail(`Could not read ${envVar} (${path}): ${e.message}`);
  }
}

const prodKey = loadKey('PROD_SA_KEY');
const stagingKey = loadKey('STAGING_SA_KEY');

// ── Safety checks ─────────────────────────────────────────────────────────────
if (!process.argv.includes('--yes')) {
  fail('This wipes ALL data in the staging project. Re-run with --yes to confirm.');
}
if (stagingKey.project_id === prodKey.project_id) {
  fail(`Both keys point at the same project (${prodKey.project_id}) — refusing to wipe it.`);
}
if (!/staging/i.test(stagingKey.project_id)) {
  fail(`Target project "${stagingKey.project_id}" does not look like a staging project (id must contain "staging").`);
}

const prodApp = initializeApp({ credential: cert(prodKey) }, 'prod');
const stagingApp = initializeApp({ credential: cert(stagingKey) }, 'staging');
const prodDb = getFirestore(prodApp);
const stagingDb = getFirestore(stagingApp);

console.log(`Source (read-only): ${prodKey.project_id}`);
console.log(`Target (wiped):     ${stagingKey.project_id}\n`);

// ── Wipe staging ──────────────────────────────────────────────────────────────
const stagingCollections = await stagingDb.listCollections();
for (const col of stagingCollections) {
  await stagingDb.recursiveDelete(col);
  console.log(`wiped   ${col.id}`);
}

// ── Copy production → staging ─────────────────────────────────────────────────
const sourceCollections = await prodDb.listCollections();
let totalDocs = 0;

for (const col of sourceCollections) {
  if (EXCLUDED_COLLECTIONS.has(col.id)) {
    console.log(`skipped ${col.id} (excluded)`);
    continue;
  }
  const snapshot = await col.get();
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = stagingDb.batch();
    for (const doc of docs.slice(i, i + BATCH_SIZE)) {
      batch.set(stagingDb.collection(col.id).doc(doc.id), doc.data());
    }
    await batch.commit();
  }
  totalDocs += docs.length;
  console.log(`copied  ${col.id} (${docs.length} docs)`);
}

console.log(`\nDone — ${totalDocs} documents copied to ${stagingKey.project_id}.`);
console.log('Note: Firebase Auth users are NOT copied; manage staging users separately.');
process.exit(0);
