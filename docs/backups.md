# Firestore Backups (Phase 1 of the staging plan)

The production Firestore database (`aravadistillery-crm`) is shared by the CRM and the
Factory Control app. This document covers the automated export workflow
(`.github/workflows/firestore-backup.yml`), the one-time setup it needs, and how to restore.

## What runs automatically

| Trigger | When | Lands in |
|---------|------|----------|
| Scheduled | Daily 02:00 UTC (05:00 Israel) | `gs://<bucket>/scheduled/<date-time>/` |
| Release (`workflow_dispatch` with `app` + `version`) | Before each production release of either app | `gs://<bucket>/releases/<app>-v<version>-<date-time>/` |
| Manual (`workflow_dispatch`, no inputs) | On demand from the Actions tab | `gs://<bucket>/manual/<date-time>/` |

Per-release exports satisfy the "every version must be backed up" rule. Trigger from a
release script of either repo:

```bash
gh workflow run firestore-backup.yml -R guymaich-jpg/Aravadistillery---CRM \
  -f app=factory -f version=1.12.0
```

## One-time setup (Google Cloud console / gcloud)

Firestore export requires the **Blaze plan** on the `aravadistillery-crm` project
(exports themselves cost cents/month at this data size).

1. **Enable Blaze** on `aravadistillery-crm` (Firebase console → Usage and billing).

2. **Create the bucket** (pick the same region as Firestore):

   ```bash
   gcloud storage buckets create gs://aravadistillery-crm-backups \
     --project=aravadistillery-crm --location=europe-west1 \
     --uniform-bucket-level-access
   ```

3. **Lifecycle rule** — auto-delete *scheduled* exports after 90 days; release exports
   are kept forever:

   ```bash
   cat > /tmp/lifecycle.json <<'EOF'
   {
     "rule": [
       {
         "action": { "type": "Delete" },
         "condition": { "age": 90, "matchesPrefix": ["scheduled/", "manual/"] }
       }
     ]
   }
   EOF
   gcloud storage buckets update gs://aravadistillery-crm-backups \
     --lifecycle-file=/tmp/lifecycle.json
   ```

4. **Service account** dedicated to backups (least privilege — it can export and write
   to the bucket, nothing else):

   ```bash
   gcloud iam service-accounts create firestore-backup \
     --project=aravadistillery-crm --display-name="Firestore backup (GitHub Actions)"

   gcloud projects add-iam-policy-binding aravadistillery-crm \
     --member="serviceAccount:firestore-backup@aravadistillery-crm.iam.gserviceaccount.com" \
     --role="roles/datastore.importExportAdmin"

   gcloud storage buckets add-iam-policy-binding gs://aravadistillery-crm-backups \
     --member="serviceAccount:firestore-backup@aravadistillery-crm.iam.gserviceaccount.com" \
     --role="roles/storage.objectAdmin"

   gcloud iam service-accounts keys create /tmp/backup-sa-key.json \
     --iam-account=firestore-backup@aravadistillery-crm.iam.gserviceaccount.com
   ```

5. **GitHub repo secrets** (this repo → Settings → Secrets → Actions):
   - `GCP_BACKUP_SA_KEY` — the full contents of `backup-sa-key.json` (then delete the local file)
   - `GCS_BACKUP_BUCKET` — `aravadistillery-crm-backups`

6. **Smoke test**: Actions tab → *Firestore Backup* → Run workflow (no inputs) → confirm
   an export appears under `manual/` in the bucket.

## Restoring from a backup

Import merges into the target database (it does not wipe first). To restore production:

```bash
gcloud firestore import gs://aravadistillery-crm-backups/scheduled/<TIMESTAMP>/ \
  --project=aravadistillery-crm
```

To restore into **staging** instead (e.g. seeding staging from a known-good snapshot),
the staging project's service account needs `roles/storage.objectViewer` on the backup
bucket, then run the same import with `--project=aravadistillery-staging`.

Notes:
- Import overwrites documents that exist in the export and leaves other documents in
  place. For a clean-slate restore, wipe the target first (staging only — never wipe prod).
- Exports do **not** include Firebase Auth users; those are managed separately.
