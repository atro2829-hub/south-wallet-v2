// Service Worker for محفظة الجنوب (Southern Wallet)
// Provides offline capability, caching, and background sync

const CACHE_NAME = 'janoub-wallet-v2';
const STATIC_CACHE = 'janoub-static-v2';
const IMAGE_CACHE = 'janoub-images-v2';
const API_CACHE = 'janoub-api-v2';
const OFFLINE_URL = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/offline.html',
];

// Offline fallback HTML page
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#E60000">
  <title>محفظة الجنوب - غير متصل</title>
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
    .icon-container {
      position: relative;
      margin-bottom: 32px;
    }
    .pulse-ring {
      position: absolute;
      inset: -12px;
      border-radius: 50%;
      background: rgba(230,0,0,0.08);
      animation: pulse 2.5s ease-in-out infinite;
    }
    .pulse-ring:nth-child(2) {
      inset: -24px;
      animation-delay: 0.5s;
      background: rgba(230,0,0,0.04);
    }
    .icon-circle {
      position: relative;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: linear-gradient(145deg, rgba(230,0,0,0.15), rgba(139,0,0,0.1));
      border: 2px solid rgba(230,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-circle svg { width: 48px; height: 48px; color: #E60000; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 14px; color: #AAA; margin-bottom: 24px; line-height: 1.6; }
    .retry-btn {
      background: linear-gradient(135deg, #E60000, #8B0000);
      color: #FFF;
      border: none;
      padding: 14px 32px;
      border-radius: 16px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(230,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
    }
    .retry-btn:active { transform: scale(0.95); }
    .retry-btn svg { width: 18px; height: 18px; animation: spin 1s linear infinite; }
    .cached-info {
      margin-top: 24px;
      padding: 16px;
      background: #1A1A1A;
      border: 1px solid rgba(255,255,255,0.04);
      border-radius: 16px;
      width: 100%;
      max-width: 320px;
    }
    .cached-info .label {
      font-size: 11px;
      color: #666;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .balance-row {
      display: flex;
      justify-content: space-around;
    }
    .balance-item { text-align: center; }
    .balance-item .currency { font-size: 10px; color: #666; }
    .balance-item .amount { font-size: 14px; font-weight: 700; }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.5); opacity: 0; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="icon-container">
    <div class="pulse-ring"></div>
    <div class="pulse-ring"></div>
    <div class="icon-circle">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="2" y1="2" x2="22" y2="22"></line>
        <path d="M8.5 16.5a5 5 0 0 1 7 0"></path>
        <path d="M2 8.82a15 15 0 0 1 4.17-2.65"></path>
        <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"></path>
        <path d="M16.85 11.25a10 10 0 0 1 2.22 3.25"></path>
        <path d="M5.12 13.37a10 10 0 0 1 3.17-3.6"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
    </div>
  </div>
  <h1>لا يوجد اتصال بالإنترنت</h1>
  <p>تحقق من اتصالك بالشبكة وحاول مرة أخرى.<br>يمكنك تصفح البيانات المحفوظة مسبقاً.</p>
  <button class="retry-btn" onclick="window.location.reload()">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 4 23 10 17 10"></polyline>
      <polyline points="1 20 1 14 7 14"></polyline>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
    إعادة المحاولة
  </button>
  <div class="cached-info" id="cachedInfo" style="display:none;">
    <div class="label">الرصيد الأخير (غير محدث)</div>
    <div class="balance-row">
      <div class="balance-item">
        <div class="currency">ر.ي</div>
        <div class="amount" id="yerBal">-</div>
      </div>
      <div class="balance-item">
        <div class="currency">ر.س</div>
        <div class="amount" id="sarBal">-</div>
      </div>
      <div class="balance-item">
        <div class="currency">$</div>
        <div class="amount" id="usdBal">-</div>
      </div>
    </div>
  </div>
  <script>
    try {
      var cached = JSON.parse(localStorage.getItem('janoub-cached-balance'));
      if (cached) {
        document.getElementById('cachedInfo').style.display = '';
        document.getElementById('yerBal').textContent = (cached.YER || 0).toLocaleString();
        document.getElementById('sarBal').textContent = (cached.SAR || 0).toLocaleString();
        document.getElementById('usdBal').textContent = (cached.USD || 0).toLocaleString();
      }
    } catch(e) {}
  </script>
</body>
</html>`;

// Install event - cache static assets + offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets + offline page');
      // Cache the offline HTML page
      const offlineResponse = new Response(OFFLINE_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
      return Promise.all([
        cache.addAll(STATIC_ASSETS).catch(() => {
          // offline.html might not exist as a file, that's fine
          console.log('[SW] Some static assets failed to cache');
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
            console.log('[SW] Deleting old cache:', name);
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

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests (HTML pages) - Network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the successful response
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          // Try cache first
          const cached = await caches.match(request);
          if (cached) return cached;
          // Return offline page as last resort
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        })
    );
    return;
  }

  // Strategy routing for non-navigation requests
  if (isApiRequest(url)) {
    // Network-first for API calls
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isImageRequest(url, request)) {
    // Cache-first for images
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
  } else if (isStaticAsset(url)) {
    // Cache-first for static assets (CSS, JS, fonts)
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    // Stale-while-revalidate for other requests
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
  }
});

// Helper: detect API requests
function isApiRequest(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com')
  );
}

// Helper: detect image requests
function isImageRequest(url, request) {
  const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];
  return (
    imageExts.some((ext) => url.pathname.endsWith(ext)) ||
    url.hostname.includes('cdn1.codashop.com') ||
    url.hostname.includes('seagm-media') ||
    url.hostname.includes('img-cdn-sg.payermax.com') ||
    url.hostname.includes('static.eneba.games')
  );
}

// Helper: detect static assets
function isStaticAsset(url) {
  const staticExts = ['.css', '.js', '.woff2', '.woff', '.ttf', '.eot'];
  return (
    staticExts.some((ext) => url.pathname.endsWith(ext)) ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/manifest.json'
  );
}

// ─── Cache Strategies ───

// Cache-first: return from cache, fall back to network
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline fallback for images
    if (isImageRequest(new URL(request.url), request)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#1A1A1A"/><text x="24" y="28" text-anchor="middle" fill="#555" font-size="12">🖼</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first: try network, fall back to cache
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
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Stale-while-revalidate: return cache immediately, update in background
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

// ─── Background Sync for Pending Transactions ───
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // Notify clients that a sync is happening
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'BACKGROUND_SYNC',
      action: 'sync-transactions',
    });
  });
}

// ─── Sound & Vibration Configuration ───
const NOTIF_SOUNDS = {
  transfer: '/sounds/transfer.wav',
  transaction: '/sounds/transfer.wav',
  deposit: '/sounds/deposit.wav',
  withdraw: '/sounds/withdraw.wav',
  order: '/sounds/order.wav',
  security: '/sounds/security.wav',
  promo: '/sounds/promo.wav',
  success: '/sounds/success.wav',
  default: '/sounds/notification.wav'
};

const NOTIF_VIBRATION = {
  transfer: [100, 50, 100, 50, 100],
  transaction: [100, 50, 100, 50, 100],
  deposit: [100, 50, 100],
  withdraw: [150, 50, 150],
  order: [100, 50, 100, 50, 100],
  security: [200, 100, 200, 100, 200],
  promo: [50],
  default: [100, 50, 100]
};

// ─── Push Notification Support (with sounds & vibration) ───
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'محفظة الجنوب';
  const type = data.type || 'general';

  // Play notification sound using Audio API
  try {
    const soundUrl = NOTIF_SOUNDS[type] || NOTIF_SOUNDS.default;
    const sound = new Audio(soundUrl);
    sound.volume = 0.5;
    sound.play().catch(() => {});
  } catch (e) {
    console.warn('[SW] Could not play notification sound:', e);
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: NOTIF_VIBRATION[type] || NOTIF_VIBRATION.default,
    data: {
      url: data.url || '/',
      type: type,
    },
    actions: data.actions || (type === 'transaction' ? [
      { action: 'open', title: 'فتح' },
      { action: 'dismiss', title: 'إغلاق' }
    ] : []),
    tag: `south-${type}-${Date.now()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(STATIC_CACHE).then((cache) => {
      cache.addAll(urls);
    });
  }
});
