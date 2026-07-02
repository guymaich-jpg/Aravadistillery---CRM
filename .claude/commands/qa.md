# QA Web App — Full Scan

You are a QA engineer. Your job is to break the target web app and find every bug you can.

**Target:** `$ARGUMENTS`

## Determine Mode

- If the argument starts with `http://` or `https://` → **URL mode**: test that URL directly.
- If the argument starts with `branch:` → **Branch mode**: extract the branch name, run `git checkout <branch>`, start the dev server with `npm run dev &`, wait for it to be ready on `http://localhost:5173`, then test against localhost. When all tests are done, kill the dev server process.
- If the argument is empty or unclear, ask the user for a URL or branch name.

## Test Execution

Run ALL of the following test categories. For each, use `Bash` with `curl` for header/response analysis and `WebFetch` to analyze page content. Execute tests in parallel where possible.

---

### A. Reachability & Health

1. `curl -o /dev/null -s -w "%{http_code} %{time_total}s %{redirect_url}" <URL>` — record status code, response time, and any redirect.
2. Check if HTTP redirects to HTTPS (try `http://` version if given `https://`).
3. Flag: status != 200, response time > 3s, no HTTPS redirect.

### B. Security Headers

Run `curl -sI <URL>` and check for the presence and correctness of:

| Header | Expected |
|--------|----------|
| Content-Security-Policy | Present, not `unsafe-inline unsafe-eval` |
| Strict-Transport-Security | Present, `max-age` >= 31536000 |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` or `SAMEORIGIN` |
| Referrer-Policy | Present (e.g. `strict-origin-when-cross-origin`) |
| Permissions-Policy | Present |
| Set-Cookie | Must have `Secure; HttpOnly; SameSite` flags |
| X-Powered-By | Should NOT be present |
| Server | Should NOT reveal version details |

Flag every missing or misconfigured header.

### C. SSL / HTTPS

1. Confirm the site is served over HTTPS.
2. Fetch page source with `WebFetch` and search for `http://` references (mixed content).
3. Flag any mixed content URLs found.

### D. Authentication & Login Security

1. Fetch the main page and look for login forms (`<form>` with password inputs, or SPA login components).
2. Check login form:
   - Does the form action (or fetch endpoint) use HTTPS?
   - Is there a CSRF token (hidden input or meta tag)?
   - Does the password field have `autocomplete="off"` or `autocomplete="new-password"`?
   - Does the password field block paste? (look for `onpaste="return false"` or similar — this is BAD, paste should be allowed)
3. Look for session/auth tokens leaked in:
   - URL query parameters (check page source for `?token=`, `?session=`, `?auth=`)
   - HTML source or inline scripts (JWT patterns: `eyJ...`)
   - References to `localStorage.setItem('token'` or `sessionStorage` with auth data in plaintext
4. Check for username enumeration: if you can detect different error messages for "user not found" vs "wrong password" from client-side code.
5. Look for rate-limiting headers on any login API endpoints found in the source (`X-RateLimit-*`, `Retry-After`).
6. Check if there's a password reset flow and whether it leaks info.

### E. Privacy & Data Protection

1. Search page source for exposed PII patterns:
   - Email addresses (regex: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
   - Phone numbers in comments or hidden fields
   - Hardcoded names, user IDs, or internal identifiers
2. Check for third-party tracking scripts (Google Analytics, Facebook Pixel, Hotjar, etc.):
   - If found, look for a cookie consent banner/mechanism
   - Flag tracking without consent mechanism as a privacy issue
3. Check if third-party scripts use Subresource Integrity (`integrity=` attribute on `<script>` tags).
4. Check for a Privacy Policy link on the page.
5. Look for analytics/pixel trackers that pass data in query params (e.g., `?email=` in tracking URLs).
6. Check sensitive form fields for appropriate `autocomplete` attributes.

### F. Functionality & Resilience

1. Search page source for:
   - Exposed API endpoints (fetch/axios calls to `/api/`, Firebase URLs, etc.)
   - Debug info: `console.log`, `console.error`, stack traces, `sourceMappingURL`
   - Hardcoded secrets: API keys, Firebase config in source, AWS keys, passwords
   - Exposed `.map` files (try fetching `<script-src>.map`)
2. Test error handling — fetch these paths and check responses:
   - `<URL>/404`
   - `<URL>/undefined`
   - `<URL>/../../../etc/passwd` (path traversal)
   - `<URL>/<script>alert(1)</script>` (reflected XSS in URL)
   - Check if error pages leak server info (stack traces, framework versions)
3. Check for directory listing: try `<URL>/assets/`, `<URL>/static/`, `<URL>/public/`

### G. Infrastructure Fingerprinting

1. From the `curl -sI` headers, identify:
   - Server technology (nginx, Apache, cloudflare, etc.)
   - Framework hints (X-Powered-By, Via, etc.)
2. Try fetching sensitive paths:
   - `<URL>/.env` — should return 403/404
   - `<URL>/.git/config` — should return 403/404
   - `<URL>/robots.txt` — note any `Disallow` entries that reveal internal paths
   - `<URL>/sitemap.xml` — check if it exposes internal/admin URLs
   - `<URL>/.well-known/security.txt` — note if it exists (good practice)
3. Flag any exposed infrastructure details.

### H. HTML Quality & Accessibility

1. Check for:
   - `<html lang="...">` attribute
   - `<meta name="viewport">` tag
   - `<title>` tag
   - Images without `alt` attributes
   - Form inputs without associated `<label>` elements
   - Interactive elements without `aria-label` or `role`
2. Keep this section brief — focus on critical a11y gaps only.

### I. CRM Functional Checks

Use `WebFetch` to load the main app URL and verify the SPA shell renders correctly.

1. **App shell loads:** Confirm the HTML response contains the React root (`<div id="root">`) and the main JS bundle script tag. Flag if missing.
2. **Firebase SDK present:** Search the page source or bundle script tags for `firebase` or `firebasestorage.googleapis.com`. Flag if no Firebase SDK is referenced — the app cannot function without it.
3. **Firebase config not exposed in HTML:** Confirm Firebase API keys are NOT embedded in the raw HTML response (they should only appear inside the JS bundle, not in `<script>` inline blocks in the HTML). Flag if `apiKey` or `VITE_FIREBASE` appear in the HTML source.
4. **No fatal error state:** Search the fetched source for obvious crash markers: `ChunkLoadError`, `Unexpected token`, `Cannot read properties of undefined`, `Application error`. Flag any found.
5. **PWA manifest:** Fetch `<URL>/manifest.json` — expect 200 with `name`, `short_name`, `display`, `icons` fields. Flag if missing or malformed.
6. **Auth gate present:** Search page source for the Hebrew string `התחברות` (login) or `כניסה` — confirms the AuthGuard/LoginScreen is included in the bundle. Flag if absent.

### J. Factory → CRM Real-Time Inventory Integration ⚠️ CRITICAL

This is the most important integration in the app. The Factory Control app writes live stock levels to Firestore (`stockLevels` collection); the CRM reads them in real time via `onSnapshot`. A failure here means inventory data is stale or invisible to CRM users.

**Static checks (curl/WebFetch):**

1. Fetch `<URL>` with `WebFetch` and search the JS bundle references for `onSnapshot`, `stockLevels`, and `firestore.listener` — confirms the real-time listener code is included in the production build. Flag if missing.
2. Search the source for `subscribeToStockLevels` — this is the function that sets up the live listener. Flag if absent.
3. Search for the Hebrew live-indicator string `נתוני מפעל בזמן אמת` ("Factory data in real time") — confirms the inventory UI component is bundled. Flag if missing.
4. Search for `factoryLastSync` — confirms the field that tracks when the factory last wrote is handled in the client code. Flag if missing.
5. Fetch `<URL>/.git/config` and `<URL>/firebase.json` — both should return 403/404. Flag if either returns 200 (infrastructure exposure).

**Live browser verification (manual steps — include these in the report as a checklist):**

Open the app in a browser, log in, and navigate to the מלאי (Inventory) tab. Verify:

- [ ] The inventory table renders with product rows (not empty/loading indefinitely)
- [ ] Each row shows a "סנכרון מפעל" (factory sync) timestamp — confirms `factoryLastSync` is being read from Firestore
- [ ] The live indicator badge "נתוני מפעל בזמן אמת" is visible and green/active
- [ ] The refresh button is present and clickable
- [ ] After clicking refresh, the sync timestamp updates (confirms the manual refresh path works)
- [ ] Stock values match what is expected from the factory (spot-check at least one product)
- [ ] Low-stock alert badges appear on the inventory tab nav if any product is below minimum threshold
- [ ] Open browser DevTools → Network tab → filter by `firestore.googleapis.com` — confirm WebSocket or long-poll connections are open (real-time listener is active, not just a one-time fetch)
- [ ] In DevTools Console — confirm no Firebase permission errors (`Missing or insufficient permissions`) or `onSnapshot` failure messages

**Flag as CRITICAL if:**
- Inventory table is empty when it should have data
- `factoryLastSync` timestamps are missing or older than 24 hours
- DevTools shows no Firestore connections
- Console shows Firebase permission denied errors

---

## Output Format

Present results as a **QA Bug Report** using this exact format:

```
# QA Bug Report
**Target:** <URL tested>
**Date:** <current date>
**Mode:** <URL / Branch: name>

## Summary
- Critical: <count>
- High: <count>
- Medium: <count>
- Low: <count>
- Info: <count>

## Findings

### [CRITICAL] <Title>
**Category:** <Security | Login | Privacy | Resilience | Infrastructure>
**Evidence:** <what you found — include the actual header, code snippet, or response>
**Recommendation:** <specific fix>

### [HIGH] <Title>
...

(continue for all findings, grouped by severity)

## Passed Checks
<List checks that passed — brief, one line each>
```

**Rules:**
- Be specific. Include actual header values, code snippets, and URLs as evidence.
- Don't report theoretical issues — only report what you actually found.
- If a test category finds nothing wrong, list it under "Passed Checks."
- For branch mode: remember to kill the dev server when done and checkout back to the original branch.
