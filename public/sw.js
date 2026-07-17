/* Neovale PWA Service Worker — minimal, NetworkFirst for HTML.
   Only registers in production (guard in main.tsx). */

const VERSION = 'neovale-sw-v2';
const STATIC_CACHE = `${VERSION}-static`;
const HTML_CACHE = `${VERSION}-html`;
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  // Do NOT skipWaiting here — wait for user to confirm via SKIP_WAITING message.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll([OFFLINE_URL]))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache cross-origin (Supabase API, edge functions, etc.)
  if (url.origin !== self.location.origin) return;

  // Never cache the manifest (always fetch fresh from edge function)
  if (url.pathname === '/manifest.webmanifest') return;

  // HTML navigation: NetworkFirst with generous timeout; only show offline page
  // when navigator is actually offline OR network truly failed AND nothing in cache.
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith((async () => {
      try {
        // 10s timeout — only meant to avoid hanging forever on dead networks.
        const network = await Promise.race([
          fetch(req),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ]);
        const cache = await caches.open(HTML_CACHE);
        cache.put(req, network.clone());
        return network;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Only serve offline page when the browser confirms it's offline.
        if (self.navigator && self.navigator.onLine === false) {
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
        // Otherwise let the browser surface the real network error.
        return Response.error();
      }
    })());
    return;
  }

  // Static assets (JS/CSS/fonts/images): StaleWhileRevalidate
  if (/\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|webp|gif|ico)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
  }
});

