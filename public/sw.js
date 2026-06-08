// Service Worker — offline asset caching for Aravadistillery CRM.
//
// Strategy:
//   - Static assets (JS, CSS, images, fonts, SVG): cache-first (with runtime caching,
//     because Vite hashes filenames so each build produces unique URLs).
//   - Navigation / HTML requests: network-first, falling back to cached app shell.
//   - API / Firestore requests: network-only (Firestore SDK manages its own IndexedDB cache).
//
// Cache is versioned — old caches are removed on activate.

const CACHE_VERSION = 'crm-cache-v1';

// ── Install ────────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Activate immediately — don't wait for old SW to be released.
  self.skipWaiting();

  // Pre-cache just the root HTML (app shell). Everything else is cached at runtime.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(['./']),
    ),
  );
});

// ── Activate ───────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  // Claim all open tabs so the SW takes effect without a reload.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────

// Patterns that should always go to the network (Firestore, Auth, APIs).
const NETWORK_ONLY_RE =
  /\/(firestore|identitytoolkit|securetoken|googleapis|google\.com)\b/;

// Static asset extensions — eligible for cache-first.
const STATIC_ASSET_RE = /\.(?:js|css|woff2?|ttf|eot|svg|png|jpe?g|gif|ico|webp|avif)(\?|$)/;

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-only for Firestore / auth / external API traffic.
  if (NETWORK_ONLY_RE.test(url.href)) return;

  // Navigation requests (HTML) — network-first, fallback to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./').then((r) => r || new Response('Offline', { status: 503 }))),
    );
    return;
  }

  // Static assets — cache-first, fall back to network (and cache the response).
  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            // Only cache successful responses from same origin.
            if (response.ok && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else — default browser behaviour (network).
});
