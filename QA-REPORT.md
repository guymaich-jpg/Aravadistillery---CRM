# QA Bug Report
**Target:** https://guymaich-jpg.github.io/Aravadistillery---CRM/
**Date:** 2026-02-23
**Mode:** URL

## Summary
- Critical: 1
- High: 4
- Medium: 5
- Low: 4
- Info: 3

---

## Findings

### [CRITICAL] Firebase API Key & Full Config Exposed in JavaScript Bundle
**Category:** Security
**Evidence:** The complete Firebase configuration is embedded in the production JS bundle (`/assets/index-DoGyIkJA.js`):
```
apiKey: "AIzaSyDkUt6_q5s8vKOXedEG142U-uQgY_49SGI"
authDomain: "aravadistillery-crm.firebaseapp.com"
projectId: "aravadistillery-crm"
storageBucket: "aravadistillery-crm.firebasestorage.app"
messagingSenderId: "806102108846"
appId: "1:806102108846:web:ea6efb2363c1459dbdfb3f"
```
While Firebase API keys are intended to be public, this full config allows anyone to:
- Attempt authentication against the Firebase project
- Access Firestore/Realtime Database if rules are misconfigured
- Enumerate users via the Auth API

**Recommendation:** Ensure Firebase Security Rules are locked down (deny all unauthenticated access). Enable App Check to restrict API usage to your domain only. Consider adding domain restrictions in the Google Cloud Console for the API key.

---

### [HIGH] Missing Critical HTTP Security Headers
**Category:** Security
**Evidence:** Response headers from `curl -sI`:
```
server: GitHub.com
strict-transport-security: max-age=31556952
```
**Missing headers:**
| Header | Status |
|--------|--------|
| `Content-Security-Policy` | Only via `<meta>` tag, NOT as HTTP header |
| `X-Content-Type-Options` | Only via `<meta>` tag, NOT as HTTP header |
| `X-Frame-Options` | **MISSING entirely** |
| `Referrer-Policy` | Only via `<meta>` tag, NOT as HTTP header |
| `Permissions-Policy` | **MISSING entirely** |

Note: GitHub Pages does not allow custom HTTP headers. The CSP and X-Content-Type-Options are set via `<meta>` tags, which is a partial mitigation but `X-Frame-Options` and `Permissions-Policy` **cannot be set via meta tags** and are completely absent.

**Recommendation:** If clickjacking protection is needed, migrate to a hosting platform that supports custom HTTP headers (Cloudflare Pages, Netlify, Vercel) or add `frame-ancestors 'self'` to the CSP meta tag. For GitHub Pages, this is an inherent platform limitation.

---

### [HIGH] CSP Allows `unsafe-inline` for Styles
**Category:** Security
**Evidence:** From the HTML `<meta>` CSP tag:
```
style-src 'self' 'unsafe-inline'
```
This allows inline style injection which can be used for CSS-based data exfiltration attacks.

Additionally, the CSP is missing:
- `frame-ancestors` directive (clickjacking protection)
- `form-action` directive (form hijacking protection)
- `base-uri` directive (base tag injection protection)
- `upgrade-insecure-requests` directive

**Recommendation:** Remove `'unsafe-inline'` from `style-src` and use CSS classes instead of inline styles, or use nonce-based CSP. Add `frame-ancestors 'self'; form-action 'self'; base-uri 'self'; upgrade-insecure-requests` to the CSP.

---

### [HIGH] No Client-Side Rate Limiting on Authentication
**Category:** Login Security
**Evidence:** No rate-limiting headers (`X-RateLimit-*`, `Retry-After`) or client-side throttling logic found in the bundle. Firebase Auth has server-side rate limiting, but no client-side protection exists to prevent brute-force login attempts.

**Recommendation:** Implement client-side login attempt throttling (e.g., exponential backoff after 3 failed attempts, CAPTCHA after 5 failed attempts). Consider enabling Firebase App Check with reCAPTCHA Enterprise.

---

### [HIGH] Developer Email Addresses Exposed in Bundle
**Category:** Privacy
**Evidence:** Found in the JS bundle:
```
guymaich@gmail.com
yonatangarini@gmail.com
email@example.com
name@example.com
```
The first two are real developer email addresses hardcoded in the production code.

**Recommendation:** Remove hardcoded developer emails from the source code. Use environment variables or a configuration service for any email addresses that must be referenced.

---

### [MEDIUM] Email Enumeration via Registration Flow
**Category:** Login Security
**Evidence:** The registration error handling differentiates between new and existing emails:
```javascript
// auth/email-already-in-use → "כתובת אימייל זו כבר רשומה במערכת."
// (Translation: "This email address is already registered in the system.")
```
This allows an attacker to determine which email addresses have accounts.

Note: The login flow correctly uses a generic error message (`"אימייל או סיסמה שגויים"` = "Email or password incorrect") for both wrong-password and user-not-found.

**Recommendation:** Use a generic message for registration too, such as "If this email is not already registered, a verification email will be sent." Consider implementing email verification as the primary registration flow.

---

### [MEDIUM] Viewport Meta Tag Blocks User Zoom
**Category:** Accessibility
**Evidence:** From the HTML `<head>`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```
`maximum-scale=1.0` and `user-scalable=no` prevent users from zooming in. This is a WCAG 2.1 Level AA violation (Success Criterion 1.4.4 - Resize Text) and impacts users with low vision.

**Recommendation:** Change to `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — remove `maximum-scale=1.0` and `user-scalable=no`.

---

### [MEDIUM] Console Log/Error Statements in Production Bundle
**Category:** Resilience
**Evidence:** Found 14 `console.log`/`console.error`/`console.warn` calls in the production bundle. While some are from library code (React, Firebase), any custom application console statements may leak debug information to end users.

**Recommendation:** Strip `console.*` calls from the production build using a Vite plugin (e.g., `esbuild.drop: ['console']` in `vite.config.ts`).

---

### [MEDIUM] No Privacy Policy Link
**Category:** Privacy
**Evidence:** No reference to a privacy policy, cookie policy, or terms of service was found in the HTML or the JS bundle. The app collects user email addresses for authentication and stores customer data (CRM).

**Recommendation:** Add a Privacy Policy page/link, especially since the app processes personal customer data. This may be a legal requirement under GDPR/Israeli Privacy Protection Law.

---

### [MEDIUM] HTTP Version of Site Returns 404 Instead of Redirecting
**Category:** Reachability
**Evidence:**
```
curl http://guymaich-jpg.github.io/Aravadistillery---CRM/
→ HTTP 404
```
The HTTP (non-HTTPS) version returns a 404 instead of redirecting to HTTPS. While HSTS is set on the HTTPS version (`max-age=31556952`), first-time visitors using HTTP will see a 404 error.

**Recommendation:** This is a GitHub Pages limitation for project sites with a path prefix. Consider using a custom domain with GitHub Pages which handles HTTP→HTTPS redirects properly.

---

### [LOW] SPA 404 Page Exposes Redirect Logic
**Category:** Resilience
**Evidence:** Fetching `/Aravadistillery---CRM/404` returns:
```html
<script>
  sessionStorage.setItem('redirect', location.pathname);
  location.replace(location.origin + '/Aravadistillery---CRM/');
</script>
```
This is a common SPA workaround for GitHub Pages but reveals the routing mechanism. Not a direct vulnerability, but it means all unknown paths silently redirect to the app root instead of showing a 404.

**Recommendation:** Consider adding a proper 404 UI within the SPA router for unrecognized routes.

---

### [LOW] No Subresource Integrity (SRI) on Script/CSS Tags
**Category:** Security
**Evidence:** The main HTML page loads scripts and styles without `integrity` attributes:
```html
<script type="module" crossorigin src="/Aravadistillery---CRM/assets/index-DoGyIkJA.js"></script>
<link rel="stylesheet" crossorigin href="/Aravadistillery---CRM/assets/index-Dq7SVJnv.css">
```
No `integrity="sha384-..."` attribute is present.

**Recommendation:** Add SRI hashes to script and link tags. Vite can be configured to generate these automatically with a plugin like `vite-plugin-sri`.

---

### [LOW] Password Field Missing `autocomplete` Attribute
**Category:** Login Security
**Evidence:** The password input is defined as `type:"password"` in the React component but no `autocomplete` attribute was found (e.g., `autocomplete="current-password"` for login or `autocomplete="new-password"` for registration).

**Recommendation:** Add appropriate `autocomplete` attributes to help password managers and improve UX: `autocomplete="current-password"` for login, `autocomplete="new-password"` for registration.

---

### [LOW] `<body>` Has No Visible Content Without JavaScript
**Category:** Accessibility
**Evidence:** The HTML body contains only:
```html
<div id="root"></div>
```
Users with JavaScript disabled see a blank page with no fallback content.

**Recommendation:** Add a `<noscript>` tag with a message like "This application requires JavaScript to run."

---

### [INFO] Infrastructure Fingerprint
**Category:** Infrastructure
**Evidence:**
- **Hosting:** GitHub Pages (via `server: GitHub.com` header)
- **CDN:** Fastly (via `x-served-by: cache-chi-klot8100136-CHI`, `x-fastly-request-id`)
- **Proxy:** Envoy, Varnish (via `Via: 1.1 varnish`)
- **Framework:** React SPA (Vite build, `react.production.min.js` in bundle)
- **Backend:** Firebase Auth + Firestore
- **Cache:** 10-minute TTL (`cache-control: max-age=600`)

**Recommendation:** Informational only. GitHub Pages does not allow hiding server headers.

---

### [INFO] `robots.txt` Disallows All Crawlers
**Category:** Infrastructure
**Evidence:**
```
User-agent: *
Disallow: /
```
All search engine crawling is blocked. This is appropriate for a private CRM.

**Recommendation:** No action needed — correct configuration for a private app.

---

### [INFO] `security.txt` Present
**Category:** Infrastructure
**Evidence:** Found at `/.well-known/security.txt`:
```
Contact: mailto:admin@aravadistillery.com
Preferred-Languages: he, en
Canonical: https://guymaich-jpg.github.io/Aravadistillery---CRM/.well-known/security.txt
```
Good practice to have a security contact, but missing `Expires` field (recommended by RFC 9116).

**Recommendation:** Add an `Expires` field to security.txt per RFC 9116.

---

## Passed Checks

- **HTTPS:** Site is served over HTTPS with valid certificate
- **HSTS:** `strict-transport-security: max-age=31556952` is present and adequate
- **No source maps:** `.js.map` and `.css.map` files return 404 — not exposed
- **No directory listing:** `/assets/`, `/static/`, `/public/` all return 404
- **Sensitive files protected:** `.env` and `.git/config` return 404
- **Path traversal blocked:** `/../../../etc/passwd` returns 404
- **Reflected XSS in URL blocked:** `/<script>alert(1)</script>` returns 404
- **No JWT tokens in source:** No hardcoded JWT patterns found
- **No auth tokens in URL parameters:** No `?token=`, `?session=`, `?auth=` patterns
- **No third-party tracking scripts:** No Google Analytics, Facebook Pixel, Hotjar, etc.
- **Login error messages are generic:** Login uses same error for wrong-password and user-not-found
- **`X-Powered-By` not exposed:** Header is absent
- **HTML `lang` attribute present:** `<html lang="he" dir="rtl">`
- **Viewport meta tag present:** Set (though zoom is blocked — see finding above)
- **Title tag present:** `<title>Aravadistillery CRM</title>`
- **ARIA attributes used:** 13 `aria-*` attributes found in the bundle
- **PWA manifest valid:** `manifest.json` is well-formed with required fields
- **No AWS/OpenAI/GitHub tokens leaked:** No `AKIA*`, `sk-*`, or `ghp_*` patterns found
- **`Server` header does not reveal version:** Just says `GitHub.com`
- **No `sourceMappingURL` in bundle:** Clean production build
- **No paste-blocking on password fields:** No `onpaste="return false"` found
