const CACHE_NAME = 'buget-pwa-v1';
const ASSETS_TO_CACHE = [
  '.',
  './index.html',
  './offline.html',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  // For navigation requests, try network first then fallback to offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        // Update cache with latest HTML
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match('./offline.html'))
    );
    return;
  }

  // For other requests, try cache first then network
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).catch(() => cached))
  );
});
