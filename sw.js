/* Mariah's Sourdough Co. — service worker
   Network-first for code (updates show up immediately),
   cache-first for images (fast + offline). */

const CACHE = 'mariahs-v9';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.hostname.includes('formspree.io') || url.hostname.includes('venmo.com')) return;

  const isCode = req.mode === 'navigate' ||
    url.pathname.endsWith('.js') || url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') || url.pathname.endsWith('.webmanifest');

  if (isCode) {
    // Network first: always try for the freshest version
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
  } else {
    // Images etc: cache first
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        });
      })
    );
  }
});
