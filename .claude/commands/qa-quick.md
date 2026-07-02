# QA Web App — Quick Health Check

You are a QA engineer doing a rapid security and infrastructure health check.

**Target:** `$ARGUMENTS`

## Determine Mode

- If the argument starts with `http://` or `https://` → **URL mode**: test directly.
- If the argument starts with `branch:` → **Branch mode**: `git checkout <branch>`, run `npm run dev &`, wait for `http://localhost:5173`, test against localhost. Kill the server and checkout back when done.
- If empty, ask the user for a URL or branch name.

## Quick Tests (run in parallel)

### 1. Reachability
`curl -o /dev/null -s -w "%{http_code} %{time_total}s %{redirect_url}" <URL>`
Flag: non-200 status, slow response (>3s), no HTTPS redirect.

### 2. Security Headers
`curl -sI <URL>` — check for:
- Content-Security-Policy (present, no unsafe-inline/eval)
- Strict-Transport-Security (present, max-age >= 31536000)
- X-Content-Type-Options (nosniff)
- X-Frame-Options (DENY or SAMEORIGIN)
- Referrer-Policy (present)
- Permissions-Policy (present)
- Cookie Secure/HttpOnly/SameSite flags
- X-Powered-By / Server (should NOT leak details)

### 3. SSL / HTTPS
Confirm HTTPS. Check page source for mixed `http://` content.

### 4. Login Security (if login form detected)
Fetch page with `WebFetch`, look for login forms:
- CSRF token present?
- Form action over HTTPS?
- Auth tokens leaked in URL params or page source?
- JWT patterns (`eyJ`) exposed in inline scripts?

### 5. Infrastructure Exposure
Try fetching (expect 403/404):
- `<URL>/.env`
- `<URL>/.git/config`
- `<URL>/robots.txt` (check for internal path disclosure)

### 6. CRM App & Factory Integration (⚠️ Critical)
Fetch the main URL with `WebFetch` and check:
- React root (`<div id="root">`) and JS bundle present
- Firebase SDK referenced (no Firebase = app is broken)
- Source contains `onSnapshot`, `subscribeToStockLevels`, `factoryLastSync` (real-time inventory listener is bundled)
- Hebrew string `נתוני מפעל בזמן אמת` present (inventory live-indicator component is bundled)
- No fatal crash markers: `ChunkLoadError`, `Cannot read properties of undefined`, `Application error`

Flag as CRITICAL if the real-time listener code or live-indicator string is missing from the bundle.

## Output

```
# Quick QA Report
**Target:** <URL>
**Date:** <date>

## Results
| Check | Status | Details |
|-------|--------|---------|
| Reachability | PASS/FAIL | ... |
| Security Headers | X/Y passed | missing: ... |
| HTTPS | PASS/FAIL | ... |
| Login Security | PASS/FAIL/N/A | ... |
| Infrastructure | PASS/FAIL | ... |
| CRM App & Factory Integration | PASS/FAIL | ... |

## Action Items
<numbered list of issues to fix, sorted by severity>
```

For branch mode: kill the dev server and checkout back when done.
