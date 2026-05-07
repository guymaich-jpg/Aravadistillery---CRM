# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Overview

**Arava Distillery CRM** — a customer relationship management system for an Israeli craft distillery. Manages clients, orders, inventory, analytics, and user access. The CRM reads live inventory data from a separate factory control application via Firestore.

**Production URL:** `https://guymaich-jpg.github.io/Aravadistillery---CRM/`

**Current version:** 6.1.0 | **Schema version:** 9

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

Provider nesting order: Migrations → Clients → Products → Stock → Orders → InventoryBatch → children

### Pluggable Storage

`StorageAdapter` interface (`src/lib/storage/adapter.ts`) with two implementations:
- **LocalStorageAdapter** (`localStorage.adapter.ts`) — browser storage, works offline, used when no Firebase config. Keys prefixed `distillery_crm_*`.
- **FirestoreAdapter** (`firestore.adapter.ts`) — real-time Firestore sync with persistent multi-tab cache (`persistentLocalCache` + `persistentMultipleTabManager`).

Auto-selected in `src/lib/storage/index.ts` based on whether `VITE_FIREBASE_PROJECT_ID` is set. Tests always use LocalStorageAdapter.

All methods return `StorageResult<T> = { ok: true; data: T } | { ok: false; error: string; code: StorageErrorCode }`.

### Authentication

Dual-mode in `src/lib/auth/simpleAuth.ts`:
- **Local dev:** SHA-256 hashing with hardcoded dev credentials (`admin@dev.local` / `user@dev.local`)
- **Production:** Firebase Auth (email/password), rate-limited (5 attempts → 1min lockout, then exponential backoff)

Manager role gated by `VITE_MANAGER_EMAILS` env var, checked via `src/lib/auth/managers.ts`. Session TTL: 24 hours (key: `crm_session_v1`).

### Invitation System

Invitation-only user registration via Firestore tokens (`src/lib/invitations.ts`):
1. Manager creates invitation on ManagementScreen → generates 7-day token
2. Admin copies invite URL (clipboard) and shares manually
3. New user opens `?invite=TOKEN` → AuthGuard validates → shows RegisterScreen
4. User registers → invitation marked as accepted

Functions: `createInvitation()`, `validateInvitation()`, `listInvitations()`, `revokeInvitation()`, `buildInviteUrl()`, `markInvitationAccepted()`.

### Schema Migrations

Chain of migrations in `src/lib/migrations/`. Run automatically on app mount in `root.provider.tsx`. All migrations are idempotent and fail gracefully on Firestore errors.

| From → To | File | Purpose |
|-----------|------|---------|
| v3 → v4 | `v3-to-v4.ts` | Add `deletedAt`, `amountPaid`, `updatedAt`; init inventory tables; create backup |
| v4 → v5 | `v4-to-v5.ts` | Copy localStorage data to Firestore (skips if Firestore already has data) |
| v5 → v6 | `v5-to-v6.ts` | Purge demo seed data from localStorage (keeps real product catalog) |
| v6 → v7 | `v6-to-v7.ts` | Purge demo data from Firestore |
| v7 → v8 | `v7-to-v8.ts` | Rename `Client.name` → `businessName`, remove `company`, add `contactPerson`, `area`, `clientType` |
| v8 → v9 | `v8-to-v9.ts` | Add `fulfillmentStatus` to orders (defaults to `'shipped'` for existing) |

Version tracked via localStorage key `distillery_crm_version`. Backup created once before destructive migrations (key: `distillery_crm_backup_v3`).

### Soft Deletes

Clients and orders use `deletedAt` timestamps — never hard-delete. `getActiveClients()`/`getActiveOrders()` filter them out. Financial reports include soft-deleted records.

## Screens & Features

### Navigation (`src/config/tabs.ts`)

| Tab ID | Hebrew Label | Icon | Visible | Access |
|--------|-------------|------|---------|--------|
| `clients` | לקוחות | Users | Yes | All |
| `orders` | הזמנות | ShoppingCart | Yes | All |
| `new-order` | הזמנה חדשה | Plus | No (programmatic) | All |
| `inventory` | מלאי | Package | Yes | All |
| `analytics` | ניתוח | BarChart2 | Yes | All |
| `factory` | מפעל | Factory | No (admin) | Admin |
| `management` | ניהול | UserPlus | Yes | Managers only |

Navigation: top bar on desktop, bottom tab bar on mobile. Low-stock alert badge on inventory tab.

### Clients (`src/components/clients/`)

- **ClientsScreen** — searchable/filterable client list with KPI cards (total clients, revenue, outstanding balance). Per-row analytics: sales, orders, balance.
- **ClientDialog** — create/edit form: business name, contact person, phone, email, address, area (north/center/south/jerusalem/sharon/shephelah), client type (business/private/institutional), status, tags, notes.
- **ImportWizard** — multi-step CSV import: drag-drop upload (5MB limit) → auto-detect column mapping → preview with validation → progress → results with error export.
- **CSV Export** — `exportClientsToCSV()` and `exportOrdersToCSV()` with BOM for Hebrew Excel compatibility.

### Orders (`src/components/orders/`)

- **OrdersScreen** — order list with payment/fulfillment status filters, search by client name, grid of OrderCards. Mark-as-shipped action.
- **NewOrderScreen** — 3-step wizard: client selection → line items editor (product, qty, unit price, discount per line) → payment details (method, status, amount paid, notes).
- **OrderCard** — displays client, total, status badges, item summary, outstanding balance. Edit/ship/delete actions.
- **OrderEditDialog** — edit payment status, method, amount paid, notes.

Payment methods: cash, card, transfer, check, bit.
Fulfillment: pending → shipped (no stock deduction — factory handles inventory).

### Inventory (`src/components/inventory/`)

**Read-only.** CRM does not write inventory — the factory control app writes stock levels to Firestore, and the CRM reads them in real time via `onSnapshot`.

- **InventoryScreen** — three sections:
  - Stock levels table: product, current stock, scheduled orders, gap (color-coded), factory sync timestamp. Live indicator: "נתוני מפעל בזמן אמת".
  - Stock movements history: inbound/outbound/adjustment/sale records (audit trail).
  - Batches: production batch records with batch number, dates, expiry.
- **Low stock alerts**: cards with current vs minimum thresholds, severity (warning/critical).
- **Real-time listener**: `src/lib/storage/firestore.listener.ts` → `subscribeToStockLevels()` using Firestore `onSnapshot`. Falls back to one-time fetch for localStorage dev mode.

### Analytics (`src/components/analytics/`)

- **AnalyticsScreen** — business intelligence dashboard with period selector (30d, 90d, year, all-time).
- **KPI cards**: total revenue, outstanding balance, order count, active clients (with growth deltas).
- **Charts** (Recharts): sales bar chart (paid vs outstanding by month), top 10 clients, product mix pie chart, payment status by month.
- **Client rankings table**: sortable by revenue, orders, outstanding balance.

### Factory (`src/components/factory/`)

- **FactoryScreen** — factory integration dashboard (stub). Connection status, sensor readings grid (temperature, pressure, flow, volume, ABV), production runs. Config dialog for adapter type (MQTT/HTTP-polling/WebSocket/Modbus-TCP). Status: "Coming Soon" for direct hardware integration.

### Management (`src/components/management/`)

- **ManagementScreen** — invitation-only user management. Create invitations, copy invite links, manage pending/accepted/revoked invitations, role assignment. Managers only.

### Auth (`src/components/auth/`)

- **LoginScreen** — email/password form with error handling. "Request access" plain text message (no mailto links).
- **RegisterScreen** — triggered by valid invite link. Pre-filled email, name + password fields.
- **AuthGuard** — validates invite tokens from URL `?invite=TOKEN`, manages Firebase Auth state restoration.

## Data Models (`src/types/`)

### Client (`crm.ts`)
`id, businessName, contactPerson, phone, email, address, area, clientType, status, tags[], notes, createdAt, deletedAt?`

### Order (`crm.ts`)
`id, clientId, clientName, items[], subtotal, totalDiscount, total, paymentStatus, paymentMethod, fulfillmentStatus, amountPaid, notes, createdAt, updatedAt?, deletedAt?`

### OrderItem (`crm.ts`)
`productId, productName, quantity, unitPrice, discount (0-100%), total`

### Product (`crm.ts`)
`id, name, category (whiskey/gin/vodka/rum/liqueur/other), basePrice (ILS), unit, isActive, sku?`

### StockLevel (`inventory.ts`)
`productId, currentStock, minimumStock, unit, lastUpdated, factoryLastSync?`

### StockMovement (`inventory.ts`)
`id, productId, productName, type (inbound/outbound/adjustment/sale), quantity, delta (signed), reference?, notes?, createdAt`

### InventoryBatch (`inventory.ts`)
`id, productId, productName, batchNumber, quantity, productionDate, expiryDate?, notes?, createdAt`

### Invitation (`invitation.ts`)
`token, email, status (pending/accepted/revoked), createdBy, createdAt, expiresAt, acceptedAt?, userName?`

### Factory types (`factory.ts`)
`ProductionRun, SensorReading, FactorySystemStatus, FactoryAdapter` — for future hardware integration.

### Analytics types (`analytics.ts`)
`KPISnapshot, SalesTimeSeries, ClientRankRow, CategorySales, PaymentStatusByMonth`

## Key Conventions

- **Path alias:** `@/*` maps to `src/*`
- **Styling:** Tailwind with custom brand palette (brown/gold). Dark mode via class strategy. 48px touch targets.
- **Mobile breakpoint:** Custom `xs: 360px` for small Android phones. Bottom tab nav on mobile, top bar on desktop.
- **Breakpoints:** xs: 360px, sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1440px
- **Brand colors:** brown/gold palette — primary: `#c9821a` (brand-500), dark: `#3d2206` (brand-900), cream: `#fdf8ef` (brand-50)
- **Font:** Heebo Variable (self-hosted, Hebrew-optimized sans-serif)
- **Icons:** Lucide React
- **CSV:** PapaParse for import/export with Hebrew column headers and BOM encoding
- **Currency:** ILS formatting via `src/lib/currency.ts`
- **IDs:** UUID v4 via `src/lib/id.ts`
- **No mailto links:** use clipboard copy for sharing. See `context/bug-mailto-auto-open.md`.

## Environment Variables

All `VITE_*` prefixed (client-safe, injected via GitHub Secrets at build time):

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase SDK credential |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Feature flag: enables Firestore/Firebase Auth |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app identifier |
| `VITE_ADMIN_EMAIL` | Admin contact email |
| `VITE_MANAGER_EMAILS` | Comma-separated manager email allowlist |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 key for Firebase App Check |
| `VITE_BASE_PATH` | Build-time base URL (defaults to `/Aravadistillery---CRM/`) |

## Security

- **Vite dev server:** blocks `.git` and `.env` access (403 Forbidden) via custom middleware plugin + `server.fs.deny`.
- **Security headers:** X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo/payment disabled).
- **SRI:** `vite-plugin-sri` adds integrity hashes to production assets.
- **Production build:** strips `debugger` statements and `console.*` calls.
- **XSS prevention:** no `dangerouslySetInnerHTML` in codebase (verified by test scanner). React auto-escapes rendering.
- **Rate limiting:** 5 failed login attempts → 1min lockout, then exponential backoff.
- **Firebase App Check:** reCAPTCHA v3 (optional, enabled if `VITE_RECAPTCHA_SITE_KEY` set).
- **Firestore rules:** all collections require auth. Invitations are manager-gated. Manager emails hardcoded in rules (must sync with `VITE_MANAGER_EMAILS`).

## Testing

Vitest with jsdom. Test setup in `src/test/setup.ts` mocks localStorage (in-memory) and crypto.subtle, forces LocalStorageAdapter.

**9 test suites, 70 tests** covering:
- `auth.test.ts` — login security, password rejection, case-insensitive email, no plaintext passwords
- `session.test.ts` — session privacy, TTL expiry, cross-user isolation
- `data-isolation.test.ts` — collection separation, soft-delete behavior
- `xss-prevention.test.ts` — script tags, onerror handlers, dangerouslySetInnerHTML scanner
- `input-sanitization.test.ts` — empty strings, 100K char strings, zero amounts, negative discounts, unicode/RTL
- `scalability.test.ts` — 1K+ record operations
- `csv-import.test.ts` — column mapping, validation, deduplication
- `migrations.test.ts` — schema migration chain
- `contexts.test.tsx` — React context CRUD, backward compatibility

## Firebase Collections

clients, orders, products, stockLevels, stockMovements, inventoryBatches, invitations, meta

Firestore rules in `firestore.rules` — all collections require auth, invitations are manager-gated. Manager emails: `guymaich@gmail.com`, `yonatangarini@gmail.com` (hardcoded in rules, must sync with env var).

## Deployment

GitHub Actions CI/CD (`.github/workflows/deploy.yml`):
1. **Lint** — ESLint with `max-warnings: 0`
2. **Test** — Vitest full suite (blocking)
3. **Build + Deploy** — tsc + Vite build → GitHub Pages artifact upload

Node.js 20, dependency cache enabled. Concurrency group: pages (serialized, no cancel-in-progress). Firebase secrets injected via GitHub Secrets. SRI integrity hashes on production assets.

## PWA

Manifest at `public/manifest.json`: standalone display, RTL Hebrew, Arava branding. Two SVG icons (192x192, 512x512) with maskable purpose. Theme: dark grey `#2c332f`, background: light beige `#efefec`.

## Context Documents

- `context/bug-mailto-auto-open.md` — mailto link bug lifecycle: root cause, fix (commit `e601cdc`), false alarm from cached Mail.app draft, lesson learned.

## Key Files Reference

| Area | Files |
|------|-------|
| Entry | `main.tsx` → `App.tsx` → `Index.tsx` |
| Tabs config | `src/config/tabs.ts` |
| State | `src/store/{Clients,Products,Orders,Stock,InventoryBatch}Context.tsx` |
| Unified state | `src/store/CRMContext.tsx` |
| Provider stack | `src/store/root.provider.tsx` |
| Storage interface | `src/lib/storage/adapter.ts` |
| Storage impls | `src/lib/storage/{localStorage,firestore}.adapter.ts` |
| Real-time stock | `src/lib/storage/firestore.listener.ts` |
| Auth | `src/lib/auth/simpleAuth.ts`, `managers.ts` |
| Invitations | `src/lib/invitations.ts` |
| Migrations | `src/lib/migrations/*.ts` |
| Types | `src/types/{crm,inventory,factory,analytics,invitation}.ts` |
| Constants | `src/lib/constants.ts` |
| CSV | `src/lib/csv.ts`, `src/lib/csv-import.ts` |
| Firebase config | `src/lib/firebase/config.ts` |
| Firestore rules | `firestore.rules` |
| CI/CD | `.github/workflows/deploy.yml` |
| Tailwind | `tailwind.config.ts` |
| Vite | `vite.config.ts` |
