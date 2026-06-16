// Firebase Configuration for South Admin App
// IMPORTANT: This admin app uses a DIFFERENT appId than the user app.
// The admin app has its own Firebase App ID so it can be sold/distributed separately.
// Both apps share the SAME Firebase Realtime Database for data, but authentication
// is tracked separately via different appIds.
// Admin appId: "1:501045825605:android:161bf71e15799e25d3932c"
// User appId: (different - check user app config)

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBY9UTcryFEoq8VA1zD7OVnku-fjLxw-p4",
  authDomain: "southern-portfolio.firebaseapp.com",
  databaseURL: "https://southern-portfolio-default-rtdb.firebaseio.com",
  projectId: "southern-portfolio",
  storageBucket: "southern-portfolio.firebasestorage.app",
  messagingSenderId: "501045825605",
  // Admin-specific appId - different from user app so they are separate Firebase apps
  appId: "1:501045825605:android:161bf71e15799e25d3932c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth;
try {
  if (getApps().length === 0) {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } else {
    auth = getAuth(app);
  }
} catch (error) {
  auth = getAuth(app);
}

// Initialize Firebase Cloud Messaging (only supported in browsers)
let messaging: any = null;
try {
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        messaging = getMessaging(app);
      }
    }).catch(() => {});
  }
} catch (error) {
  console.warn('Firebase Messaging not available:', error);
}

export { auth, messaging };
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
