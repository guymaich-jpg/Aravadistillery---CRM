# CRM Staging Environment

Staging runs as a **separate Vercel project** (`aravadistillery-crm-staging`)
pointed at a **separate staging Firebase project** — full isolation from
production by origin, pipeline, and database.

| | Production | Staging |
|---|---|---|
| Hosting | GitHub Pages (`guymaich-jpg.github.io/Aravadistillery---CRM/`) | Vercel (`aravadistillery-crm-staging.vercel.app`) |
| Deploys from | `main` branch (GitHub Actions) | `staging` branch (Vercel, production branch) |
| Firebase project | `aravadistillery-crm` | `arava-factory-staging` (shared with Factory Control staging) |
| Base path | `/Aravadistillery---CRM/` | `/` (auto-detected via `VERCEL` env) |
| Data | Live client data | Refreshable prod copy (`scripts/staging-refresh/`) |

Pull requests additionally get throwaway Vercel preview deploys for free.

## Promotion flow

```
feature branch ──PR──▶ staging ──verify on staging──▶ main ──▶ production
```

Both apps follow the same pattern (the factory app already stages on Vercel).

## One-time setup

### 1. Staging Firebase project (console)

Already exists: **`arava-factory-staging`** — shared by CRM staging and Factory
Control staging so live inventory sync works end-to-end in staging. It has
Firestore, email/password Auth (owner accounts registered), and a web app.

- Rules deploys go to it with:
  `firebase deploy --only firestore:rules --project arava-factory-staging`
  (both repos keep an identical `firestore.rules`; deploy from either).
- The refresh script needs two service-account keys — see
  `docs/staging-refresh.md`.

### 2. Vercel project settings

In `aravadistillery-crm-staging` → Settings:

- **Git → Production Branch:** `staging`
- **Environment Variables** (Production + Preview):

| Variable | Value |
|----------|-------|
| `VITE_APP_ENV` | `staging` |
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | the six values from the **staging** Firebase project |
| `VITE_ADMIN_EMAIL`, `VITE_MANAGER_EMAILS` | same as production |

Deliberately **not** set in staging:

- `VITE_BACKUP_WEBHOOK_URL` — staging must never write to the production
  Google Sheets backup.
- `VITE_RECAPTCHA_SITE_KEY` — the prod App Check key won't accept the staging
  Firebase config.
- `VITE_BASE_PATH` — not needed; `vite.config.ts` defaults to `/` when the
  `VERCEL` env var is present.

### 3. Seed staging data

Run the prod→staging copy script (wipes staging, excludes `audit_log` and
`invitations`): see `docs/staging-refresh.md`. Re-run whenever staging data
should be refreshed from production. Auth users are not copied — register
staging test users via the invitation flow or the Firebase console.

## Notes

- `VITE_APP_ENV=staging` prefixes every localStorage key (`staging_…`) via
  `src/lib/appEnv.ts` — defense in depth on top of origin isolation, and it
  keeps local dev against staging config separable.
- The GitHub Pages dual-build path (`/staging/` under the prod site, gated on
  `VITE_STG_*` secrets in `.github/workflows/deploy.yml`) is **dormant** and
  superseded by this setup. Never add `VITE_STG_*` secrets; the workflow steps
  will be removed once Vercel staging is verified end-to-end.
- Firestore rules changes must be deployed to **both** projects (staging first,
  verify, then prod — after a fresh backup, see `docs/backups.md`).
