/**
 * AirGuard PWA Service Worker (v1.1.0)
 * Features:
 * 1. Background Mobile Web Push Notifications for Critical Environmental Hazards.
 * 2. High-urgency haptic vibration cadences and immediate red danger alarm triggers.
 * 3. Offline-First Caching for static assets, application shell, and historical telemetry.
 * 4. Resilient fallback navigation: All views remain accessible offline.
 */

const CACHE_NAME = 'airguard-v1.1.0';
const OFFLINE_FALLBACK_PAGE = '/offline.html';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/dashboard',
  '/analytics',
  '/alerts',
  '/stations',
  '/weather',
  '/hardware-setup',
  '/docs',
  '/favicon.ico',
  '/favicon.svg',
  '/site.webmanifest',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// Helper to safely cache a valid response
function safeCachePut(cacheName, request, response) {
  if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
    return Promise.resolve();
  }

  if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
    return Promise.resolve();
  }

  return caches
    .open(cacheName)
    .then((cache) => cache.put(request, response.clone()))
    .catch((err) => {
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

  const url = new URL(request.url);

  // 2. Cross-origin API calls to backend: Let the browser handle network directly without SW interference
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Never cache auth sessions or local api mutable write requests
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // 4. SPA Navigation Requests (HTML Pages): Network-First, falling back to cached index.html
  if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            safeCachePut(CACHE_NAME, request, response);
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((res) => res || caches.match('/index.html'))
            .then((res) => res || caches.match(OFFLINE_FALLBACK_PAGE))
            .then((res) => res || caches.match('/offline.html'))
            .then((res) => res || caches.match('/'));
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
          .catch(() => {});
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

// 6. Background Sync API: Queued Telemetry
self.addEventListener('sync', (event) => {
  if (event.tag === 'airguard-sync-telemetry') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch('/api/readings/latest').catch(() => null);
      })
    );
  }
});

// 7. Periodic Background Sync API: Scheduled Environmental Monitoring Check
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'airguard-periodic-telemetry') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch('/api/readings/latest')
          .then((res) => {
            if (res && res.status === 200) cache.put('/api/readings/latest', res.clone());
          })
          .catch(() => null);
      })
    );
  }
});

// 8. Mobile Background Web Push Notifications: Red Danger Flash & Alert Trigger
self.addEventListener('push', (event) => {
  let payload = {
    title: '🚨 AirGuard Danger Alert',
    body: 'Critical pollution or atmospheric spike detected.',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-96x96.png',
    isDanger: true,
    url: '/dashboard?danger=true',
    tag: 'airguard-danger-alert',
  };

  try {
    if (event.data) {
      payload = Object.assign(payload, event.data.json());
    }
  } catch (e) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  // Emergency red danger strobe vibration pattern (SOS pulse rhythm)
  const dangerVibration = [500, 150, 500, 150, 500, 200, 800, 200, 800];
  const standardVibration = [250, 100, 250];

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/android-chrome-192x192.png',
    badge: payload.badge || '/favicon-96x96.png',
    vibrate: payload.isDanger ? dangerVibration : standardVibration,
    tag: payload.tag || 'airguard-danger-alert',
    renotify: true,
    requireInteraction: payload.isDanger !== false, // Stays visible until user acknowledges
    data: {
      url: payload.url || '/dashboard?danger=true',
      isDanger: payload.isDanger,
      alert: payload,
    },
    actions: [
      {
        action: 'open_danger',
        title: '🚨 View Danger Alert',
      },
      {
        action: 'dismiss',
        title: '✕ Dismiss',
      },
    ],
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, notificationOptions),
      // Broadcast to any active client windows to trigger the live red danger flash strobe immediately
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'AIRGUARD_DANGER_ALERT',
            payload: payload,
          });
        });
      }),
    ])
  );
});

// 9. Notification Click Handler: Open/focus mobile window and activate Red Danger Flash
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/dashboard?danger=true';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          // If a tab is already open, focus it and tell it to trigger the danger flash
          client.focus();
          client.postMessage({
            type: 'AIRGUARD_TRIGGER_DANGER_FLASH',
            payload: event.notification.data?.alert || {},
          });
          return client;
        }
      }
      // If no tab is open, open the full dashboard in danger flash mode
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
