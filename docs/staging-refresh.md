# Staging Data Refresh (Phase 5 of the staging plan)

`scripts/staging-refresh/` wipes the **staging** Firestore project and copies the
current **production** data into it, so staging always tests against realistic data
without ever touching production.

## One-time setup

1. Create a **read-only** service account in the prod project:

   ```bash
   gcloud iam service-accounts create staging-refresh-reader \
     --project=aravadistillery-crm --display-name="Staging refresh (read-only)"
   gcloud projects add-iam-policy-binding aravadistillery-crm \
     --member="serviceAccount:staging-refresh-reader@aravadistillery-crm.iam.gserviceaccount.com" \
     --role="roles/datastore.viewer"
   gcloud iam service-accounts keys create ~/keys/prod-readonly-sa.json \
     --iam-account=staging-refresh-reader@aravadistillery-crm.iam.gserviceaccount.com
   ```

2. In the **staging** project, create a service account with `roles/datastore.owner`
   (it must delete and write) and download its key to `~/keys/staging-sa.json`.

3. Install script deps once: `cd scripts/staging-refresh && npm install`

## Running a refresh

```bash
cd scripts/staging-refresh
PROD_SA_KEY=~/keys/prod-readonly-sa.json \
STAGING_SA_KEY=~/keys/staging-sa.json \
npm run refresh -- --yes
```

## Safety guarantees

- The prod credential is read-only — the script cannot write to production even with a bug.
- Refuses to run if the two keys point at the same project, or if the target
  project id does not contain `staging`.
- Requires an explicit `--yes` because the target project is wiped first.

## What is / isn't copied

| Copied | Skipped |
|--------|---------|
| clients, orders, products, stockLevels, stockMovements, inventoryBatches, meta (incl. `meta/schema`), all `factory_*` collections | `audit_log` (meaningless in staging), `invitations` (live signup tokens), Firebase **Auth users** (create staging users manually) |
