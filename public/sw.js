const CACHE = 'pesach-v1';

// App shell + data to cache on install
const PRECACHE = [
  '/',
  '/categories',
  '/documents',
  '/medicine',
  '/scan',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, browser extensions, and API calls (those need live data)
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/api/')) return;

  // Stale-while-revalidate for everything else
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => null);

      return cached || (await networkPromise) || new Response('Offline', { status: 503 });
    })
  );
});
