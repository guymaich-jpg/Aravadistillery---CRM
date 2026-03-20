# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Vite dev server (localhost:5173)
npm run build         # TypeScript check + Vite production build
npm run lint          # ESLint (tsc & tsx)
npm test              # Vitest watch mode
npm run test:run      # Vitest single run (CI)
npm run test:coverage # Vitest with v8 coverage
```

## Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Firebase (optional)

**RTL-First Hebrew UI:** Document-level `dir="rtl"` and `lang="he"` set in `main.tsx`. All user-facing strings are Hebrew. Labels and enum mappings live in `src/lib/constants.ts`.

### Component Tree

`main.tsx` → `App.tsx` (ErrorBoundary → AuthGuard → RootProvider → Index)

`Index.tsx` is the tab router — no React Router. Tab definitions live in `src/config/tabs.ts` (single source of truth for navigation).

### State Management

Modular React Contexts in `src/store/`: ClientsContext, ProductsContext, OrdersContext, StockContext, InventoryBatchContext. `CRMContext` provides a unified backward-compatible interface over all of them. `root.provider.tsx` runs schema migrations on mount then renders the provider stack.

### Pluggable Storage

`StorageAdapter` interface (`src/lib/storage/adapter.ts`) with two implementations:
- **LocalStorageAdapter** — browser storage, works offline, used when no Firebase config
- **FirestoreAdapter** — real-time Firestore sync with persistent multi-tab cache

Auto-selected based on whether `VITE_FIREBASE_PROJECT_ID` is set. Tests always use LocalStorageAdapter.

### Authentication

Dual-mode in `src/lib/auth/simpleAuth.ts`:
- **Local dev:** SHA-256 hashing with hardcoded dev credentials (`admin@dev.local` / `user@dev.local`)
- **Production:** Firebase Auth (email/password), rate-limited (5 attempts → 1min lockout)

Manager role gated by `VITE_MANAGER_EMAILS` env var, checked via `src/lib/auth/managers.ts`.

### Schema Migrations

Chain of migrations (v3→v9) in `src/lib/migrations/`. Run automatically on app mount in `root.provider.tsx`. Current schema version: 9.

### Soft Deletes

Clients and orders use `deletedAt` timestamps — never hard-delete. `getActiveClients()`/`getActiveOrders()` filter them out. Financial reports include soft-deleted records.

## Key Conventions

- **Path alias:** `@/*` maps to `src/*`
- **Styling:** Tailwind with custom brand palette (brown/gold). Dark mode via class strategy. 48px touch targets.
- **Mobile breakpoint:** Custom `xs: 360px` for small Android phones. Bottom tab nav on mobile, top bar on desktop.
- **Icons:** Lucide React
- **CSV:** PapaParse for import/export with Hebrew column headers
- **Currency:** ILS formatting via `src/lib/currency.ts`
- **IDs:** UUID v4 via `src/lib/id.ts`

## Testing

Vitest with jsdom. Test setup in `src/test/setup.ts` mocks localStorage (in-memory) and crypto.subtle, forces LocalStorageAdapter. Tests cover auth security, session privacy, data isolation, XSS prevention, input sanitization, and scalability (1K+ records).

## Firebase Collections

clients, orders, products, stockLevels, stockMovements, inventoryBatches, invitations, meta

Firestore rules in `firestore.rules` — all collections require auth, invitations are manager-gated.

## Deployment

GitHub Actions CI/CD (`.github/workflows/deploy.yml`): lint → test → build+deploy to GitHub Pages. Firebase secrets injected via GitHub Secrets at build time. SRI integrity hashes added to production assets.
