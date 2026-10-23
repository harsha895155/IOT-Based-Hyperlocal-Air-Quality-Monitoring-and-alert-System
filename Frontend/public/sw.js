/**
 * AirGuard PWA Service Worker (v1.0.1)
 * Provides offline navigation resilience, static asset caching,
 * and secure handling of real-time sensor streams without caching sensitive credentials.
 */

const CACHE_NAME = 'airguard-v1.0.1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon.svg',
  '/site.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// Helper to safely cache a valid response
function safeCachePut(cacheName, request, response) {
  // Cache API only supports http: and https: schemes
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return Promise.resolve();
  }

  // Only cache successful standard/CORS GET responses
  if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
    return Promise.resolve();
  }

  return caches
    .open(cacheName)
    .then((cache) => cache.put(request, response.clone()))
    .catch((err) => {
      // Gracefully ignore cache put errors (e.g. quota, aborted requests)
      console.debug('[SW] Cache put ignored:', err.message);
    });
}

// Install Event: Precaches essential application shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Precache failed:', err);
      })
  );
});

// Activate Event: Cleans up obsolete cache storage versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent routing between network and cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Strictly ignore non-http(s) requests (e.g. chrome-extension://, data:, blob:)
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return;
  }

  // 2. Never cache non-GET requests or sensitive auth/login endpoints
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/auth')) {
    return;
  }

  // 3. Dynamic Sensor Telemetry & Weather API: Network-First with Cache Fallback
  if (
    url.pathname.startsWith('/api/readings') ||
    url.pathname.startsWith('/api/devices') ||
    url.pathname.startsWith('/api/weather')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          safeCachePut(CACHE_NAME, request, response);
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. SPA Navigation Requests (HTML Pages): Network-First, falling back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html').then((res) => res || caches.match('/'));
      })
    );
    return;
  }

  // 5. Static Assets (JS, CSS, Web Fonts, Images): Cache-First with Background Revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch revalidation in background
        fetch(request)
          .then((networkResponse) => {
            safeCachePut(CACHE_NAME, request, networkResponse);
          })
          .catch(() => {
            // Ignore offline fetch errors during revalidation
          });
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          safeCachePut(CACHE_NAME, request, networkResponse);
          return networkResponse;
        })
        .catch(() => {
          return new Response('', { status: 503, statusText: 'Service Unavailable (Offline)' });
        });
    })
  );
});
