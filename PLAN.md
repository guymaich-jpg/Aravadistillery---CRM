# QA Remediation Plan — Aravadistillery CRM

**Based on:** Full QA scan of the production app
**Scope:** All fixable issues in the CRM codebase (`/home/user/Aravadistillery---CRM`)
**Session timeout:** 24 hours (per user preference)

---

## Step 1: Fix Username Enumeration (CRITICAL)

**Files:** `src/lib/auth/simpleAuth.ts`, `src/components/auth/LoginScreen.tsx`

### 1a. Unify login error messages (`simpleAuth.ts`)

- **Line 47:** Change `'המשתמש אינו קיים במערכת'` → `'אימייל או סיסמה שגויים'`
- **Line 51:** Change `'סיסמה שגויה'` → `'אימייל או סיסמה שגויים'`
- **Lines 82-87:** Unify Firebase error messages similarly — both `auth/user-not-found` and `auth/wrong-password` return the same generic message

### 1b. Remove `isKnownEmail()` function (`simpleAuth.ts`)

- **Lines 126-130:** Remove the exported `isKnownEmail()` function entirely
- This function allows attackers to check if an email is registered

### 1c. Remove enumeration-based UI logic (`LoginScreen.tsx`)

- **Line 2:** Remove `isKnownEmail` from the import
- **Lines 28-31:** Remove the `if (!isKnownEmail(email))` conditional — always show "Request Access" option on any login failure instead of only for unknown emails

---

## Step 2: Add Session Expiration (CRITICAL)

**File:** `src/lib/auth/simpleAuth.ts`

### Changes to `getSession()` (lines 104-112):

- Add a 24-hour TTL check: parse `loginAt` from the stored session, compare with current time
- If session is older than 24 hours, call `logout()` and return `null`
- Add a constant: `const SESSION_TTL_MS = 24 * 60 * 60 * 1000;`

---

## Step 3: Remove Hardcoded PII (HIGH)

**Files:** `src/lib/auth/simpleAuth.ts`, `src/components/auth/LoginScreen.tsx`

### 3a. Replace hardcoded admin emails in LoginScreen.tsx

- **Line 41:** Replace `guymaich@gmail.com,yonatangarini@gmail.com` with a configurable contact — use a Vite env var `VITE_ADMIN_EMAIL` with a fallback to a generic string
- Add `const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@aravadistillery.com';`

### 3b. Add env var to `.env.example`

- Add `VITE_ADMIN_EMAIL=` entry to `.env.example`

---

## Step 4: Add Security Headers via Meta Tags (HIGH)

**File:** `index.html`

GitHub Pages doesn't support custom HTTP headers, but `<meta http-equiv>` tags provide partial coverage. Add the following inside `<head>`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com; img-src 'self' data: blob:">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="strict-origin-when-cross-origin">
```

**Note:** `X-Frame-Options` as a `<meta>` tag is NOT honored by browsers — it only works as an HTTP header. CSP `frame-ancestors` directive also does not work in `<meta>` tags. This is a known GitHub Pages limitation. Document it as an accepted risk.

---

## Step 5: Tighten Firestore Security Rules (HIGH)

**File:** `firestore.rules`

Replace the overly permissive wildcard rule with per-collection rules that enforce user ownership:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper: request is from authenticated user
    function isAuth() {
      return request.auth != null;
    }

    // All CRM collections: authenticated users can read/write
    // (future improvement: add per-user data isolation)
    match /clients/{doc} {
      allow read, write: if isAuth();
    }
    match /orders/{doc} {
      allow read, write: if isAuth();
    }
    match /products/{doc} {
      allow read, write: if isAuth();
    }
    match /stockLevels/{doc} {
      allow read, write: if isAuth();
    }
    match /stockMovements/{doc} {
      allow read, write: if isAuth();
    }
    match /inventoryBatches/{doc} {
      allow read, write: if isAuth();
    }
    match /meta/{doc} {
      allow read, write: if isAuth();
    }
    // Deny all other paths by default
  }
}
```

This replaces the `/{document=**}` wildcard with explicit collection paths, so new collections aren't accidentally exposed. It's the same permission level for now but follows the principle of least privilege.

---

## Step 6: Create PWA Icons (MEDIUM)

**Files:** New `public/icon-192.svg`, new `public/icon-512.svg`

Create simple SVG icons matching the brand identity (dark green rounded square with "A" letter, matching the login screen logo). The manifest already references these paths.

---

## Step 7: Fix Hardcoded Manifest Paths (MEDIUM)

**File:** `public/manifest.json`

- **Line 5:** Change `"/Aravadistillery---CRM/"` → `"./"` (relative path)
- **Line 6:** Remove the `scope` line or set to `"./"`
- **Lines 15, 21:** Change icon `src` to relative paths: `"./icon-192.svg"`, `"./icon-512.svg"`

**File:** `index.html`
- **Line 13:** Change `href="/Aravadistillery---CRM/manifest.json"` → `href="manifest.json"`

Vite handles base path resolution via `VITE_BASE_PATH` at build time; the manifest should use relative paths.

---

## Step 8: Clean Test Files (MEDIUM)

**Files:** `src/lib/auth/__tests__/auth.test.ts`, `src/lib/auth/__tests__/session.test.ts`

- Replace real email addresses with test-only emails: `testuser@example.com`, `admin@example.com`
- Replace real names with generic test names
- Update password hashes to match test passwords (recompute SHA-256 for test password strings)
- Tests should NOT reference real user credentials

---

## Step 9: Add Privacy Policy Link (LOW)

**File:** `src/components/auth/LoginScreen.tsx`

Add a small link in the footer area (line 159-161) next to the copyright notice:

```tsx
<p className="text-center text-xs text-[#716a56] mt-6">
  גישה מורשית בלבד · Aravadistillery CRM © 2026 · <a href="/privacy" className="underline">מדיניות פרטיות</a>
</p>
```

**Note:** The actual privacy policy page content is a business/legal decision — this step only adds the link. A placeholder route/page can be created.

---

## Out of Scope (Documented Risks)

These issues require architectural changes beyond this PR:

| Issue | Reason | Mitigation |
|-------|--------|------------|
| Client-side auth bypass | Requires server-side auth; local auth is dev-only, Firebase Auth is used in production | Document that local auth is dev-only |
| SHA-256 without salt | Requires bcrypt/scrypt which needs a backend | Local auth is dev-only fallback; production uses Firebase Auth |
| localStorage session (XSS theft) | httpOnly cookies need a backend | CSP headers reduce XSS risk; session TTL limits exposure window |
| No rate limiting | Needs server-side enforcement | Firebase Auth has built-in rate limiting; local auth is dev-only |
| CSRF protection | SPAs with no cookies don't need traditional CSRF tokens | Not applicable to this architecture |
| SRI for Google Fonts | Google Fonts API generates dynamic CSS with changing hashes | Self-hosting fonts is a future option |
| X-Frame-Options | Cannot set via meta tag, GitHub Pages doesn't support custom headers | Accepted platform limitation |

---

## Verification

After all changes:
1. Run `npm run lint` — must pass
2. Run `npm run test:run` — all 35 tests must pass (some tests need updating in Step 8)
3. Run `npm run build` — must succeed
4. Manual check: login with test credentials, verify unified error messages, verify session expires
