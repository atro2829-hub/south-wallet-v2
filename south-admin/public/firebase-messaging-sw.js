// Firebase Cloud Messaging Service Worker for محفظة الجنوب - الإدارة
// This is REQUIRED for receiving push notifications when the admin app is in the background or closed

importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.14.0/firebase-messaging-compat.js');

// Firebase configuration for Admin app
firebase.initializeApp({
  apiKey: "AIzaSyBY9UTcryFEoq8VA1zD7OVnku-fjLxw-p4",
  authDomain: "southern-portfolio.firebaseapp.com",
  databaseURL: "https://southern-portfolio-default-rtdb.firebaseio.com",
  projectId: "southern-portfolio",
  storageBucket: "southern-portfolio.firebasestorage.app",
  messagingSenderId: "501045825605",
  appId: "1:501045825605:android:161bf71e15799e25d3932c"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Admin-FCM-SW] Background message received:', payload);

  const title = payload.data?.title || payload.notification?.title || 'محفظة الجنوب - الإدارة';
  const body = payload.data?.body || payload.notification?.body || '';
  const type = payload.data?.type || 'general';
  const url = payload.data?.url || '/';

  const notificationOptions = {
    body: body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: type === 'security' ? [200, 100, 200, 100, 200] : [100, 50, 100],
    tag: `south-admin-${type}-${Date.now()}`,
    data: {
      url: url,
      type: type,
      ...payload.data
    }
  };

  return self.registration.showNotification(title, notificationOptions);
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
