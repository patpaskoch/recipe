/* Service Worker für die Rezepte-PWA.
   Strategie:
   - HTML / JSON: "network-first" -> Änderungen erscheinen sofort, offline greift der Cache.
   - Rest (JS, Icons, Manifest): "cache-first" mit Netz als Fallback.
   - Fremd-Domains (Tailwind-CDN, Rezeptbilder): unangetastet ans Netz. */

const CACHE = 'rezepte-v1';
const CORE = [
  './',
  './index.html',
  './rezept.html',
  './einkaufsliste.html',
  './js/einkaufsliste.js',
  './js/pwa.js',
  './rezepte.json',
  './zutaten.json',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // CDN & Bilder normal laden

  const isDoc = req.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json');

  if (isDoc) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
