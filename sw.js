/* Mariah's Sourdough Co. — service worker
   Cache-first for the app shell and images so the app
   loads instantly and works offline. */

const CACHE = 'mariahs-v5';

const SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './classic.jpg',
  './chocolate.jpg',
  './cinnamon.webp',
  './mariah.jpg',
  './dough-hands.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
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

  // Never intercept the Formspree order submission or Venmo
  if (url.hostname.includes('formspree.io') || url.hostname.includes('venmo.com')) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: url.origin === location.origin }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache successful same-origin + CDN/image responses for offline use
        const cacheable =
          res.ok &&
          (url.origin === location.origin ||
           url.hostname === 'cdnjs.cloudflare.com' ||
           url.hostname === 'images.unsplash.com');
        if (cacheable) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback: serve the app shell for navigations
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
