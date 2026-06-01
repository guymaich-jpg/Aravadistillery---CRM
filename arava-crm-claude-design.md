# Arava Distillery CRM — Complete Project Knowledge

> Upload this file to Claude Design / Claude Projects as project knowledge.
> It contains the full architecture, data models, source types, conventions, and Firestore rules.

---

## Product Overview

**Arava Distillery CRM** — a customer relationship management system for an Israeli craft distillery. Manages clients, orders, inventory, analytics, and user access. The CRM reads live inventory data from a separate factory control application via Firestore.

**Production URL:** `https://guymaich-jpg.github.io/Aravadistillery---CRM/`

**Current version:** 6.1.0 | **Schema version:** 9

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Firebase (optional)

**RTL-First Hebrew UI:** Document-level `dir="rtl"` and `lang="he"`. All user-facing strings are Hebrew. Labels and enum mappings live in `src/lib/constants.ts`.

---

## Commands

```bash
npm run dev           # Vite dev server (localhost:5173)
npm run build         # TypeScript check + Vite production build
npm run lint          # ESLint (tsc & tsx)
npm test              # Vitest watch mode
npm run test:run      # Vitest single run (CI)
npm run test:coverage # Vitest with v8 coverage
```

---

## Architecture

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

In production (Firebase enabled), the adapter is wrapped by **AuditedStorageAdapter** (`audited.adapter.ts`) — a decorator that logs every write to the `audit_log` Firestore collection and optionally to a Google Sheets webhook. Reads pass through unaudited.

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

### Audit & Backup System

Every data mutation is logged for compliance and disaster recovery:

1. **AuditLogger** (`src/lib/audit/audit-logger.ts`) — fire-and-forget writer. On each save/delete, writes an `AuditLogEntry` to the `audit_log` Firestore collection (append-only, no update/delete allowed per Firestore rules).
2. **Webhook** (`src/lib/audit/webhook.ts`) — if `VITE_BACKUP_WEBHOOK_URL` is set, each entry is also POSTed to a Google Apps Script endpoint that appends to a Google Sheet. Retries once on failure.
3. **AuditedStorageAdapter** (`src/lib/storage/audited.adapter.ts`) — decorator pattern. Wraps the real StorageAdapter and intercepts all write methods. Reads are delegated directly.
4. **Google Sheets receiver** (`google-apps-script/backup-receiver.js`) — deploy as a Google Apps Script Web App. Headers: Timestamp, Action, Collection, Record ID, User, Data (JSON).

`AuditLogEntry`: `{ id, timestamp, action: 'save'|'delete', collection, recordId, userEmail, snapshot, source: 'crm' }`

### Soft Deletes

Clients and orders use `deletedAt` timestamps — never hard-delete. `getActiveClients()`/`getActiveOrders()` filter them out. Financial reports include soft-deleted records.

---

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
Fulfillment: pending → shipped (stock managed by factory control app, not CRM).

### Inventory (`src/components/inventory/`)

**Read-only.** CRM does not write inventory — the factory control app writes stock levels to Firestore, and the CRM reads them in real time via `onSnapshot`.

- **InventoryScreen** — three sections:
  - Stock levels table: product, current stock, scheduled orders, gap (color-coded), factory sync timestamp. Live indicator: "נתוני מפעל בזמן אמת".
  - Stock movements history: inbound/outbound/adjustment/sale records (audit trail).
  - Batches: production batch records with batch number, dates, expiry.
- **Low stock alerts**: cards with current vs minimum thresholds, severity (warning/critical). Uses gap (currentStock - scheduledOrders) for threshold calculation.
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
- **AuthGuard** — validates invite tokens from URL `?invite=TOKEN`, manages Firebase Auth state restoration. Waits for `onAuthStateChanged` before rendering children (prevents race condition).

---

## Data Models — Full TypeScript Source

### CRM Types (`src/types/crm.ts`)

```typescript
export type ClientStatus = 'active' | 'inactive' | 'prospect';
export type ClientType = 'business' | 'private' | 'institutional';
export type Area = 'north' | 'center' | 'south' | 'jerusalem' | 'sharon' | 'shephelah';

export interface Client {
  id: string;
  businessName: string;      // שם מקום/עסק — primary identifier
  contactPerson: string;     // איש קשר
  phone: string;
  email: string;
  address: string;
  area: string;              // אזור — predefined region
  clientType: string;        // סוג לקוח — business / private / institutional
  status: ClientStatus;
  tags: string[];
  notes: string;
  createdAt: string;
  deletedAt?: string;
}

export type ProductCategory = 'whiskey' | 'gin' | 'vodka' | 'rum' | 'liqueur' | 'other';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  basePrice: number;         // ILS
  unit: string;              // e.g. 'בקבוק'
  isActive: boolean;         // false = soft-deleted (still appears on old orders)
  sku?: string;              // optional, for future inventory system linkage
}

export interface OrderItem {
  productId: string;
  productName: string;       // snapshot at order time
  quantity: number;
  unitPrice: number;         // ILS, snapshot at order time
  discount: number;          // percentage 0–100
  total: number;             // computed: qty * unitPrice * (1 - discount/100)
}

export type PaymentStatus = 'paid' | 'pending' | 'partial';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'bit';
export type FulfillmentStatus = 'pending' | 'shipped';

export interface Order {
  id: string;
  clientId: string;
  clientName: string;        // snapshot at order time
  items: OrderItem[];
  subtotal: number;          // sum of items before discounts
  totalDiscount: number;     // monetary value of total discount
  total: number;             // final ILS amount
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  fulfillmentStatus: FulfillmentStatus; // independent from payment — determines inventory
  amountPaid: number;        // tracks partial payments (= total for 'paid', 0 for 'pending')
  notes: string;
  createdAt: string;         // ISO date string
  updatedAt?: string;        // last modification timestamp
  deletedAt?: string;        // soft delete — financial records must never be hard-deleted
}

export interface ClientAnalytics {
  clientId: string;
  clientName: string;
  totalSales: number;        // sum of all order totals (including soft-deleted orders)
  orderCount: number;
  outstandingBalance: number; // sum of (order.total - order.amountPaid) for non-paid orders
  lastOrderDate: string | null;
  averageOrderValue: number;
}
```

### Inventory Types (`src/types/inventory.ts`)

```typescript
export type StockMovementType = 'inbound' | 'outbound' | 'adjustment' | 'sale';

export interface StockLevel {
  productId: string;
  currentStock: number;      // current bottle count
  minimumStock: number;      // alert threshold (0 = no alert)
  unit: string;              // inherited from product.unit
  lastUpdated: string;       // ISO timestamp
  factoryLastSync?: string;  // ISO timestamp — set by factory control app
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;       // snapshot
  type: StockMovementType;
  quantity: number;          // always positive; direction determined by type
  delta: number;             // signed: positive = stock increase, negative = decrease
  reference?: string;        // orderId for 'sale', batchNumber for 'inbound' from production
  notes?: string;
  createdAt: string;         // ISO timestamp
}

export interface InventoryBatch {
  id: string;
  productId: string;
  productName: string;       // snapshot
  batchNumber: string;       // e.g. "ARAQ-2026-001"
  quantity: number;          // bottles produced / received
  productionDate: string;    // ISO date
  expiryDate?: string;       // ISO date, optional
  notes?: string;
  createdAt: string;
}

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  severity: 'warning' | 'critical'; // warning: stock > 0 but low; critical: stock === 0
}
```

### Invitation Types (`src/types/invitation.ts`)

```typescript
export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export interface Invitation {
  token: string;
  email: string;
  status: InvitationStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  userName?: string;       // set when the invited user registers
}
```

---

## Hebrew Labels & Constants (`src/lib/constants.ts`)

```typescript
// Client Status
{ active: 'פעיל', inactive: 'לא פעיל', prospect: 'פוטנציאלי' }
// Colors: active=green, inactive=gray, prospect=blue

// Payment Status
{ paid: 'שולם', pending: 'ממתין', partial: 'חלקי' }
// Colors: paid=green, pending=red, partial=amber

// Payment Method
{ cash: 'מזומן', card: 'כרטיס', transfer: 'העברה בנקאית', check: 'צ׳ק', bit: 'ביט' }

// Product Category
{ whiskey: 'וויסקי', gin: 'ג׳ין', vodka: 'וודקה', rum: 'רום', liqueur: 'ליקר', other: 'אחר' }
// Colors: whiskey=#c9821a, gin=#4f86c6, vodka=#a8d8a8, rum=#d4a853, liqueur=#9b59b6, other=#95a5a6

// Client Type
{ business: 'עסקי', private: 'פרטי', institutional: 'מוסדי' }

// Area / Region
{ north: 'צפון', center: 'מרכז', south: 'דרום', jerusalem: 'ירושלים', sharon: 'שרון', shephelah: 'שפלה' }

// Fulfillment Status
{ pending: 'ממתין למשלוח', shipped: 'נשלח' }
// Colors: pending=blue, shipped=green

// Dropdown option arrays
PAYMENT_STATUS_OPTIONS: ['paid', 'pending', 'partial']
PAYMENT_METHOD_OPTIONS: ['cash', 'card', 'transfer', 'check', 'bit']
CLIENT_STATUS_OPTIONS: ['active', 'prospect', 'inactive']
CLIENT_TYPE_OPTIONS: ['business', 'private', 'institutional']
AREA_OPTIONS: ['north', 'center', 'south', 'jerusalem', 'sharon', 'shephelah']
FULFILLMENT_STATUS_OPTIONS: ['pending', 'shipped']
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() {
      return request.auth != null;
    }

    function isManager() {
      return isAuth() && request.auth.token.email in [
        'guymaich@gmail.com',
        'yonatangarini@gmail.com'
      ];
    }

    // All data collections — authenticated users only
    match /clients/{doc}          { allow read, write: if isAuth(); }
    match /orders/{doc}           { allow read, write: if isAuth(); }
    match /products/{doc}         { allow read, write: if isAuth(); }
    match /stockLevels/{doc}      { allow read, write: if isAuth(); }
    match /stockMovements/{doc}   { allow read, write: if isAuth(); }
    match /inventoryBatches/{doc} { allow read, write: if isAuth(); }
    match /meta/{doc}             { allow read, write: if isAuth(); }

    // Append-only audit log — no update/delete allowed
    match /audit_log/{doc} {
      allow create, read: if isAuth();
      allow update, delete: if false;
    }

    // Invitations — unauthenticated get allowed (UUID v4 tokens),
    // list/create restricted to managers, update for manager or invitee
    match /invitations/{token} {
      allow get: if true;
      allow list: if isManager();
      allow create: if isManager();
      allow update: if isAuth() && (
        isManager() || request.auth.token.email == resource.data.email
      );
    }
  }
}
```

---

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
- **No mailto links:** use clipboard copy for sharing. Never use `mailto:` — it auto-opens the mail client.

---

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
| `VITE_BACKUP_WEBHOOK_URL` | Google Apps Script webhook URL for external backup to Google Sheets |
| `VITE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 key for Firebase App Check |
| `VITE_BASE_PATH` | Build-time base URL (defaults to `/Aravadistillery---CRM/`) |

---

## Security

- **Vite dev server:** blocks `.git` and `.env` access (403 Forbidden) via custom middleware plugin + `server.fs.deny`.
- **Security headers:** X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo/payment disabled).
- **SRI:** `vite-plugin-sri` adds integrity hashes to production assets.
- **Production build:** strips `debugger` statements and `console.*` calls.
- **XSS prevention:** no `dangerouslySetInnerHTML` in codebase (verified by test scanner). React auto-escapes rendering.
- **Rate limiting:** 5 failed login attempts → 1min lockout, then exponential backoff.
- **Firebase App Check:** reCAPTCHA v3 (optional, enabled if `VITE_RECAPTCHA_SITE_KEY` set).
- **Firestore rules:** all collections require auth. Invitations are manager-gated. Manager emails hardcoded in rules (must sync with `VITE_MANAGER_EMAILS`).

---

## Testing

Vitest with jsdom. Test setup in `src/test/setup.ts` mocks localStorage (in-memory) and crypto.subtle, forces LocalStorageAdapter.

**12 test suites, 96 tests** covering:
- `auth.test.ts` — login security, password rejection, case-insensitive email, no plaintext passwords
- `session.test.ts` — session privacy, TTL expiry, cross-user isolation
- `data-isolation.test.ts` — collection separation, soft-delete behavior
- `xss-prevention.test.ts` — script tags, onerror handlers, dangerouslySetInnerHTML scanner
- `input-sanitization.test.ts` — empty strings, 100K char strings, zero amounts, negative discounts, unicode/RTL
- `scalability.test.ts` — 1K+ record operations
- `csv-import.test.ts` — column mapping, validation, deduplication
- `migrations.test.ts` — schema migration chain
- `contexts.test.tsx` — React context CRUD, backward compatibility
- `audit-logger.test.ts` — audit entry creation, Firestore writes, user email resolution
- `webhook.test.ts` — webhook POST, retry on failure, fire-and-forget behavior
- `audited-adapter.test.ts` — decorator pattern, read passthrough, write auditing

---

## Firebase Collections

clients, orders, products, stockLevels, stockMovements, inventoryBatches, invitations, meta, audit_log

---

## Deployment

GitHub Actions CI/CD (`.github/workflows/deploy.yml`):
1. **Lint** — ESLint with `max-warnings: 0`
2. **Test** — Vitest full suite (blocking)
3. **Build + Deploy** — tsc + Vite build → GitHub Pages artifact upload

Node.js 20, dependency cache enabled. Concurrency group: pages (serialized, no cancel-in-progress). Firebase secrets injected via GitHub Secrets. SRI integrity hashes on production assets.

---

## PWA

Manifest at `public/manifest.json`: standalone display, RTL Hebrew, Arava branding. Two SVG icons (192x192, 512x512) with maskable purpose. Theme: dark grey `#2c332f`, background: light beige `#efefec`.

---

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
| Audited storage | `src/lib/storage/audited.adapter.ts` |
| Real-time stock | `src/lib/storage/firestore.listener.ts` |
| Audit logging | `src/lib/audit/{audit-logger,webhook,types}.ts` |
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
| Security headers | `public/_headers` |
| Sheets backup | `google-apps-script/backup-receiver.js` |
| Env template | `.env.example` |

---

## Business Rules Summary

1. **Orders have two independent statuses:** payment (paid/pending/partial) and fulfillment (pending/shipped). An order can be paid but not shipped, or shipped but not paid.
2. **Inventory is read-only in the CRM.** Stock levels are written by the factory control app to Firestore. The CRM reads them via real-time `onSnapshot` listener.
3. **Scheduled orders** are computed (not stored) — sum of quantities from all pending (unshipped) orders per product.
4. **Gap = currentStock - scheduledOrders** — color-coded green (positive), amber (low), red (negative/zero).
5. **Soft deletes only** — clients and orders are never hard-deleted. `deletedAt` timestamp is set, `getActiveClients()`/`getActiveOrders()` filter them out. Financial reports include soft-deleted records.
6. **No mailto links** — the app uses clipboard copy for sharing invite URLs and contact info.
7. **Manager emails** are hardcoded in Firestore rules and must stay in sync with `VITE_MANAGER_EMAILS`.

---

## Known Bug History

### mailto: Links Auto-Opening Mail.app (RESOLVED)

Login and invitation screens previously had `mailto:` links that auto-opened the mail client. All three sources were removed (commit `e601cdc`). The invitation flow now uses clipboard copy for invite URLs. A post-fix false alarm occurred when a saved Mail.app draft was mistaken for a recurring bug — the draft was from a previous session and needed to be manually deleted.

**Lesson:** Never use `mailto:` links in web apps.
