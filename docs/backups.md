# Firestore Backups

The production Firestore database (`aravadistillery-crm`) is shared by the CRM and the
Factory Control app. This document covers the automated backup workflow
(`.github/workflows/firestore-backup.yml`), the one-time setup it needs, and how to restore.

## What runs automatically

| Trigger | When | Artifact name |
|---------|------|------|
| Scheduled | Daily 02:00 UTC (05:00 Israel) | `firestore-backup-scheduled-<date-time>` |
| Release (`workflow_dispatch` with `app` + `version`) | Before each production release of either app | `firestore-backup-release-<app>-v<version>-<date-time>` |
| Manual (`workflow_dispatch`, no inputs) | On demand from the Actions tab | `firestore-backup-manual-<date-time>` |

Each run dumps every Firestore collection to JSON via the Admin SDK
(`scripts/backup/dump-firestore.mjs`) and uploads the result as a **GitHub Actions
artifact**, retained for 90 days. Download it from the workflow run's Summary page
(Actions tab → *Firestore Backup* → pick a run → *Artifacts*).

Per-release backups satisfy the "every version must be backed up" rule. Trigger from a
release script of either repo:

```bash
gh workflow run firestore-backup.yml -R guymaich-jpg/Aravadistillery---CRM \
  -f app=factory -f version=1.12.0
```

## Why artifacts instead of `gcloud firestore export`

Native Firestore export writes to a GCS bucket and requires the project to be on the
**Blaze (pay-as-you-go) plan**. As of this writing `aravadistillery-crm` has no billing
account attached at all, so that path doesn't work. A GitHub Actions artifact needs no
GCP billing — only a service account with **read-only** Firestore access
(`roles/datastore.viewer`), which this project already has provisioned. This is a
deliberate, permanent design choice, not a workaround pending a "real" fix:

- Simpler failure mode: nothing to misconfigure on the GCS side (bucket, lifecycle
  rules, IAM bindings on the bucket).
- Cheaper: this app's data volume is small; artifact storage is free within GitHub's
  standard limits.
- If Blaze billing is enabled later for other reasons, native export remains a valid
  option — it supports `gcloud firestore import` for large-scale/point-in-time restores,
  which this approach does not (see Restoring, below). Swap the "Dump Firestore" step in
  `firestore-backup.yml` for a `gcloud firestore export` step if that's ever wanted.

## One-time setup

1. **Service account** — reuse the existing `staging-refresh-reader` service account on
   `aravadistillery-crm` (already has `roles/datastore.viewer`, nothing more), or create
   a new one scoped the same way:

   ```bash
   gcloud iam service-accounts create firestore-backup-reader \
     --project=aravadistillery-crm --display-name="Firestore backup reader (GitHub Actions)"

   gcloud projects add-iam-policy-binding aravadistillery-crm \
     --member="serviceAccount:firestore-backup-reader@aravadistillery-crm.iam.gserviceaccount.com" \
     --role="roles/datastore.viewer" --condition=None

   gcloud iam service-accounts keys create /tmp/backup-reader-key.json \
     --iam-account=firestore-backup-reader@aravadistillery-crm.iam.gserviceaccount.com
   ```

2. **GitHub repo secret** (this repo → Settings → Secrets → Actions):
   - `FIRESTORE_BACKUP_SA_KEY` — the full contents of the key JSON file (then delete the
     local file: `rm /tmp/backup-reader-key.json`)

3. **Smoke test**: Actions tab → *Firestore Backup* → Run workflow (no inputs) → confirm
   it succeeds and an artifact appears on the run's Summary page.

## Restoring from a backup

1. Download and unzip the artifact — you get one `<collection>.json` file per top-level
   collection (subcollections nest under `_sub_<name>` keys inside their parent docs).
2. Restore with the Admin SDK (`firebase-admin`), writing each document back by its
   original `_id`. There's no single `gcloud` command for this format — write a small
   script (or extend `scripts/staging-refresh/refresh.mjs`, which already knows how to
   write batched Firestore data) if a restore is ever needed. Seeding **staging** from a
   known-good production snapshot is already fully automated —
   see `docs/staging-refresh.md`.

Notes:
- These backups do **not** include Firebase Auth users; those are managed separately.
- If billing is enabled later and native `gcloud firestore export`/`import` is preferred
  for a large-scale restore, see the "Why artifacts" section above for how to switch.
