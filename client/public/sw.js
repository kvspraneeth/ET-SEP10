const CACHE_NAME = 'pocket-ledger-v3.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/manifest.json?v=3.0.0',
  '/icons/v3_logo_192.png',
  '/icons/v3_logo_512.png',
  '/icons/v3_maskable_192.png',
  '/icons/v3_maskable_512.png',
  '/shortcuts/widgets.png',
  '/shortcuts/add.png',
  '/shortcuts/dues.png',
  '/shortcuts/charts.png',
  '/shortcuts/budget.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache resources and activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Failed to cache resources during install:', error);
      })
  );
});

// Activate event - clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch event - network first for HTML / dynamic API, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Background sync for offline expense submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'expense-sync') {
    event.waitUntil(syncExpenses());
  }
});

async function syncExpenses() {
  try {
    console.log('[SW] Syncing offline expenses...');
  } catch (error) {
    console.error('[SW] Failed to sync expenses:', error);
  }
}

// Push notifications for budget alerts & smart prompts
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'You have a new update from Pocket Ledger.',
        icon: '/icons/v3_logo_512.png',
        badge: '/icons/v3_logo_192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'pocket-ledger-alert',
        data: {
          url: data.url || '/',
        },
        actions: [
          {
            action: 'view',
            title: 'Open Ledger'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Pocket Ledger', options)
      );
    } catch (e) {
      console.warn('[SW] Failed to parse push data:', e);
    }
  }
});

// Handle notification clicks (deep-linking to tabs or focus open window)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
