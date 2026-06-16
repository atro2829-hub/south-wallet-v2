// Service Worker for محفظة الجنوب - الإدارة (Admin App)
// Provides offline capability, caching, and background notification support

const CACHE_NAME = 'janoub-admin-v2';
const STATIC_CACHE = 'janoub-admin-static-v2';
const IMAGE_CACHE = 'janoub-admin-images-v2';
const API_CACHE = 'janoub-admin-api-v2';
const OFFLINE_URL = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// Offline fallback HTML page
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#6C3CE1">
  <title>محفظة الجنوب - الإدارة - غير متصل</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif;
      background: #0A0A0A;
      color: #FFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      direction: rtl;
    }
    .icon-circle {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: linear-gradient(145deg, rgba(108,60,225,0.15), rgba(26,10,46,0.1));
      border: 2px solid rgba(108,60,225,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
    }
    .icon-circle svg { width: 48px; height: 48px; color: #6C3CE1; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 14px; color: #AAA; margin-bottom: 24px; line-height: 1.6; }
    .retry-btn {
      background: linear-gradient(135deg, #6C3CE1, #1A0A2E);
      color: #FFF;
      border: none;
      padding: 14px 32px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(108,60,225,0.3);
      font-family: inherit;
    }
    .retry-btn:active { transform: scale(0.95); }
  </style>
</head>
<body>
  <div class="icon-circle">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"></line>
      <path d="M8.5 16.5a5 5 0 0 1 7 0"></path>
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65"></path>
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"></path>
    </svg>
  </div>
  <h1>لا يوجد اتصال بالإنترنت</h1>
  <p>تحقق من اتصالك بالشبكة وحاول مرة أخرى.</p>
  <button class="retry-btn" onclick="window.location.reload()">إعادة المحاولة</button>
</body>
</html>`;

// Install event - cache static assets + offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Admin-SW] Caching static assets + offline page');
      const offlineResponse = new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
      return Promise.all([
        cache.addAll(STATIC_ASSETS).catch(() => {
          console.log('[Admin-SW] Some static assets failed to cache');
        }),
        cache.put(OFFLINE_URL, offlineResponse),
      ]);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name !== CACHE_NAME && name !== STATIC_CACHE && name !== IMAGE_CACHE && name !== API_CACHE;
          })
          .map((name) => {
            console.log('[Admin-SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests - Network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return;
  }

  // Strategy routing
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isImageRequest(url, request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
  }
});

function isApiRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com')
  );
}

function isImageRequest(url, request) {
  const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
  return imageExts.some((ext) => url.pathname.endsWith(ext));
}

function isStaticAsset(url) {
  const staticExts = ['.css', '.js', '.woff2', '.woff', '.ttf', '.eot'];
  return staticExts.some((ext) => url.pathname.endsWith(ext));
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ─── Sound & Vibration Configuration ───
const NOTIF_SOUNDS = {
  transaction: '/sounds/transfer.wav',
  security: '/sounds/security.wav',
  promo: '/sounds/promo.wav',
  default: '/sounds/notification.wav'
};

const NOTIF_VIBRATION = {
  transaction: [100, 50, 100, 50, 100],
  security: [200, 100, 200, 100, 200],
  promo: [50],
  default: [100, 50, 100]
};

// ─── Push Notification Support ───
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'محفظة الجنوب - الإدارة';
  const type = data.type || 'general';

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: NOTIF_VIBRATION[type] || NOTIF_VIBRATION.default,
    data: {
      url: data.url || '/',
      type: type,
    },
    tag: `south-admin-${type}-${Date.now()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
