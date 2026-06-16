// Firebase Cloud Messaging Service Worker for محفظة الجنوب
// This is REQUIRED for receiving push notifications when the app is in the background or closed

importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

// Firebase configuration - must match the client-side config
firebase.initializeApp({
  apiKey: "AIzaSyBaOm6cS4k-tEInE2GRq6NTl6mWf3FbENI",
  authDomain: "southern-portfolio.firebaseapp.com",
  databaseURL: "https://southern-portfolio-default-rtdb.firebaseio.com",
  projectId: "southern-portfolio",
  storageBucket: "southern-portfolio.firebasestorage.app",
  messagingSenderId: "501045825605",
  appId: "1:501045825605:android:a0b11c5db57c9831d3932c"
});

const messaging = firebase.messaging();

// Sound mapping based on notification type
const SOUNDS = {
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

// Vibration patterns based on type
const VIBRATION_PATTERNS = {
  transfer: [100, 50, 100, 50, 100],
  transaction: [100, 50, 100, 50, 100],
  deposit: [100, 50, 100],
  withdraw: [150, 50, 150],
  order: [100, 50, 100, 50, 100],
  security: [200, 100, 200, 100, 200],
  promo: [50],
  default: [100, 50, 100]
};

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM-SW] Background message received:', payload);

  const title = payload.data?.title || payload.notification?.title || 'محفظة الجنوب';
  const body = payload.data?.body || payload.notification?.body || '';
  const type = payload.data?.type || 'general';
  const url = payload.data?.url || '/';

  // Determine the appropriate sound
  const soundUrl = SOUNDS[type] || SOUNDS.default;
  const vibrate = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.default;

  const notificationOptions = {
    body: body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: vibrate,
    tag: `south-${type}-${Date.now()}`,
    data: {
      url: url,
      type: type,
      click_action: payload.data?.click_action || url,
      ...payload.data
    },
    actions: type === 'transaction' ? [
      { action: 'open', title: 'فتح' },
      { action: 'dismiss', title: 'إغلاق' }
    ] : []
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  if (action === 'dismiss') return;

  const url = event.notification.data?.url || event.notification.data?.click_action || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
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
