/**
 * AirGuard PWA Service Worker (v1.0.0)
 * Provides offline navigation resilience, static asset caching,
 * and secure handling of real-time sensor streams without caching sensitive credentials.
 */

const CACHE_NAME = 'airguard-v1.0.0';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon.svg',
  '/site.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// Install Event: Precaches essential application shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
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
  const url = new URL(request.url);

  // 1. Never cache non-GET requests or sensitive auth/login endpoints
  if (request.method !== 'GET' || url.pathname.startsWith('/api/auth')) {
    return;
  }

  // 2. Dynamic Sensor Telemetry & Weather API: Network-First with Cache Fallback
  if (url.pathname.startsWith('/api/readings') || url.pathname.startsWith('/api/devices') || url.pathname.startsWith('/api/weather')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 3. SPA Navigation Requests (HTML Pages): Network-First, falling back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 4. Static Assets (JS, CSS, Web Fonts, Images): Cache-First with Network Revalidation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch revalidation in background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          })
          .catch(() => {
            // Ignore offline fetch errors during revalidation
          });
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });
    })
  );
});
