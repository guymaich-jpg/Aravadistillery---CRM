# Aravadistillery CRM

Customer Relationship Management system for Arava Distillery. Built with React 18, TypeScript, Vite, and Tailwind CSS. Supports Firebase Firestore as a cloud database with automatic localStorage fallback for offline use.

**Version:** 6.1.0
**Schema:** v8
**Stack:** React 18 | TypeScript 5 | Vite 5 | Tailwind CSS 3 | Firebase 10

---

## Login Credentials (Local Dev Mode)

| User | Email | Password |
|------|-------|----------|
| Dev Admin | admin@dev.local | Admin1234 |
| Dev User | user@dev.local | User1234 |

In local mode (no Firebase), passwords are verified via SHA-256 hash comparison. These credentials are stripped from production builds via `import.meta.env.DEV` guards.

In production (with Firebase), users are managed through Firebase Authentication and the invitation system.

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
git clone https://github.com/guymaich-jpg/Aravadistillery---CRM.git
cd Aravadistillery---CRM
npm install
```

### Run Locally (localStorage mode)

```bash
npm run dev
```

The app runs at `http://localhost:5173` with data stored in browser localStorage. No Firebase setup required.

### Run with Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Firestore Database** (production mode)
3. Enable **Authentication** with Email/Password provider
4. Register a Web App and copy the config
5. Deploy Firestore security rules: `firestore.rules`
6. Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

Fill in the Firebase values:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_MANAGER_EMAILS=manager1@example.com,manager2@example.com
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

Then run `npm run dev`. The app automatically detects Firebase config and switches to Firestore.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI mode) |
| `npm run test:coverage` | Run tests with V8 coverage report |

---

## Application Screens

### Clients (לקוחות)

Manage customer database. KPI cards show total clients, total sales revenue, and outstanding balances. Search by business name, contact person, or phone. Filter by status (active, prospect, inactive). Add, edit, and soft-delete clients. Export to CSV. Bulk import from CSV with column mapping, validation, and deduplication.

### Orders (הזמנות)

View and manage orders as responsive cards. Search by client name. Filter by payment status (paid, pending, partial). Edit payment details and notes. Soft-delete preserves financial records. Export to CSV.

### New Order (הזמנה חדשה)

Three-step order creation wizard:
1. **Select Client** — search and pick from the database
2. **Order Items** — add products with quantity, price, and discount; auto-calculated totals
3. **Payment** — choose method (cash, card, transfer, check, Bit), set status and amount

### Inventory (מלאי)

Track stock levels and movements. Summary KPIs show active products, total units, and low stock alerts. Three tabs: stock levels table, movement history, and production batches. Color-coded severity indicators for stock alerts.

### Analytics (ניתוח)

Business intelligence dashboard. Period selector (30 days, 90 days, YTD, all-time). Four chart visualizations: monthly revenue trend, top clients, product mix pie chart, and payment status distribution. Client rankings table sortable by revenue, orders, or balance.

### Factory (מפעל)

Placeholder for future hardware integration. Supports MQTT, HTTP Polling, WebSocket, and Modbus TCP adapter types. Displays sensor reading skeletons (temperature, pressure, flow, volume, ABV, runtime). Configuration dialog present but connection is disabled.

### Management (ניהול)

Manager-only screen for user and invitation management. Send email invitations to new users, view registered users, and revoke pending invitations. Gated by `VITE_MANAGER_EMAILS` env var.

---

## Default Products

The app ships with 6 real Arava Distillery products:

| Product | Category | Price (ILS) |
|---------|----------|-------------|
| ערק (Arak) | Other | 80 |
| ליקריץ (Licorice) | Liqueur | 80 |
| ADV | Other | 80 |
| ג'ין (Gin) | Gin | 110 |
| ברנדי (Brandy) | Other | 180 |
| שונות (Misc) | Other | 0 |

---

## Architecture

```
App.tsx
├── ErrorBoundary
├── AuthGuard (session check)
├── RootProvider (schema migrations → CRM context)
└── Index.tsx (page router)
    ├── Header (sticky, responsive)
    ├── Navigation (bottom tabs on mobile, top bar on desktop)
    └── Screen content
        ├── ClientsScreen
        ├── OrdersScreen
        ├── NewOrderScreen (3-step wizard)
        ├── InventoryScreen
        ├── AnalyticsScreen
        ├── FactoryScreen (stub)
        └── ManagementScreen (manager-only)
```

### Storage Layer

The app uses a pluggable `StorageAdapter` interface (`src/lib/storage/adapter.ts`). Two implementations:

- **LocalStorageAdapter** — browser localStorage, works offline, no server needed
- **FirestoreAdapter** — Google Firestore, real-time sync, requires Firebase project

Switching happens automatically in `src/lib/storage/index.ts` based on whether `VITE_FIREBASE_PROJECT_ID` is set.

### Data Model

All methods return `StorageResult<T>`:
```typescript
{ ok: true, data: T } | { ok: false, error: string, code: StorageErrorCode }
```

**Collections:** clients, orders, products, stockLevels, stockMovements, inventoryBatches, invitations

**Soft deletes:** Clients and orders are never physically deleted. A `deletedAt` timestamp is set to preserve financial records and audit trails.

### Schema Migrations

The app supports automatic data migrations between schema versions (current: **v8**):

| Migration | Changes |
|-----------|---------|
| v3 → v4 | Added soft deletes (`deletedAt`), `amountPaid` on orders, `isActive` on products |
| v4 → v5 | localStorage-to-Firestore data transfer (runs once when Firebase is configured) |
| v5 → v6 | Clear legacy demo clients and orders from localStorage |
| v6 → v7 | Clear demo data from both localStorage and Firestore |
| v7 → v8 | Rename `Client.name` → `businessName`, remove `company`, add `contactPerson`/`area`/`clientType` |

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```
push to main or claude/* → lint → test → build → deploy (GitHub Pages)
pull request to main     → lint → test (no deploy)
```

### GitHub Secrets Required

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_ADMIN_EMAIL`, `VITE_MANAGER_EMAILS`, `VITE_RECAPTCHA_SITE_KEY`

---

## Tests

35 tests across 6 suites. Run with `npm run test:run`.

### Auth Security (`src/lib/auth/__tests__/auth.test.ts`) — 8 tests
- Rejects incorrect passwords and unknown emails
- Case-insensitive email matching with whitespace trimming
- Password never stored in plaintext in session
- Session contains only: email, name, loginAt
- No session created on failed login

### Session Privacy (`src/lib/auth/__tests__/session.test.ts`) — 7 tests
- Session created only for known users
- Session cleared on logout
- No data leakage between user sessions
- Invalid/missing session returns null gracefully

### Data Isolation (`src/lib/storage/__tests__/data-isolation.test.ts`) — 5 tests
- Client data isolated from orders collection
- Soft-deleted records preserved with `deletedAt` timestamp
- `exportAll()` returns all collections correctly

### XSS Prevention (`src/lib/__tests__/xss-prevention.test.ts`) — 4 tests
- Script tags and HTML event handlers stored as plain text
- React escapes content during rendering (no encoding at storage layer)
- No `dangerouslySetInnerHTML` usage in source code
- Stock movement notes safe from injection

### Input Sanitization (`src/lib/__tests__/input-sanitization.test.ts`) — 6 tests
- Empty fields, 100K-character strings, zero amounts
- Negative discounts, Unicode/RTL characters
- Stock movement delta sign integrity

### Scalability (`src/lib/storage/__tests__/scalability.test.ts`) — 5 tests
- 1,000 clients stored and retrieved correctly
- 5,000 orders filtered within 200ms
- localStorage quota exceeded handled gracefully
- Large dataset export (100 clients + 500 orders)

---

## Mobile & PWA

- **Bottom tab navigation** on phones (< 640px), top bar on desktop
- **48px touch targets** per Google accessibility guidelines
- **Safe-area padding** for phones with notches
- **xs:360px breakpoint** for small Android devices
- **PWA manifest** (`public/manifest.json`) — installable on Android via "Add to Home Screen"
- **Sticky header** with responsive sizing

---

## Project Structure

```
src/
├── components/
│   ├── analytics/     # Charts, KPIs, client rankings
│   ├── auth/          # LoginScreen, RegisterScreen, AuthGuard
│   ├── clients/       # Client list, dialog, card, ImportWizard
│   ├── factory/       # Factory stub screen
│   ├── inventory/     # Stock levels, movements, batches
│   ├── layout/        # Header, Navigation, ErrorBoundary
│   ├── management/    # User invitation management (manager-only)
│   ├── orders/        # Order list, new order wizard, edit dialog
│   └── shared/        # ConfirmDialog, EmptyState, SearchInput, StatusBadge
├── config/
│   └── tabs.ts        # Navigation tab registry
├── hooks/             # useClients, useOrders, useProducts, useInventory, useClientAnalytics, useTotalAnalytics
├── lib/
│   ├── auth/          # Login, registration, session, SHA-256, managers
│   ├── firebase/      # Firebase config and initialization
│   ├── migrations/    # Schema version upgrades (v3→v4→v5→v6→v7→v8)
│   ├── storage/       # StorageAdapter interface + implementations
│   ├── constants.ts   # Hebrew labels for statuses, types, areas
│   ├── csv.ts         # CSV export (clients, orders)
│   ├── csv-import.ts  # CSV import engine (parsing, mapping, validation)
│   ├── currency.ts    # ILS currency formatting
│   ├── date.ts        # Hebrew date formatting helpers
│   ├── id.ts          # UUID generation
│   ├── invitations.ts # Firestore invitation CRUD
│   ├── seed.ts        # Default product catalog
│   └── utils.ts       # cn() class name utility
├── pages/
│   └── Index.tsx      # Main page router
├── store/
│   ├── CRMContext.tsx  # Global state provider
│   └── root.provider.tsx # Migration runner + CRM provider wrapper
├── test/
│   └── setup.ts       # Test environment setup
└── types/
    ├── crm.ts         # Client, Order, Product types
    ├── inventory.ts   # StockLevel, StockMovement, InventoryBatch
    ├── analytics.ts   # KPI, TimeSeries, Rankings
    ├── invitation.ts  # Invitation type
    └── factory.ts     # Factory adapter types (stub)
```

---

## License

Private repository. All rights reserved.
