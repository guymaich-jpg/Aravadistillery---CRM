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
