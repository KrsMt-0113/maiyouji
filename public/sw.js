// Only the public app shell is cached. Member data and API requests never enter caches.
const CACHE = 'maiyouji-shell-v2';
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['/icon.svg', '/icon-192.png', '/manifest.webmanifest'])),
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const u = new URL(event.request.url);
  if (
    u.origin !== self.location.origin ||
    u.pathname.startsWith('/api/') ||
    event.request.method !== 'GET'
  )
    return;
  if (
    u.pathname.startsWith('/assets/') ||
    ['/icon.svg', '/icon-192.png', '/manifest.webmanifest'].includes(u.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (hit) =>
          hit ||
          fetch(event.request).then((r) => {
            if (r.ok) {
              const clone = r.clone();
              caches.open(CACHE).then((c) => c.put(event.request, clone));
            }
            return r;
          }),
      ),
    );
  }
});
