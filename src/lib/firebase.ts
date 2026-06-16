import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBY9UTcryFEoq8VA1zD7OVnku-fjLxw-p4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "southern-portfolio.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://southern-portfolio-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "southern-portfolio",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "southern-portfolio.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "501045825605",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:501045825605:android:a0b11c5db57c9831d3932c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize auth with explicit persistence for Capacitor/Android WebView
let auth;
try {
  if (getApps().length === 0) {
    // First initialization - use indexedDB persistence for better Capacitor support
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } else {
    auth = getAuth(app);
  }
} catch (error) {
  // If initializeAuth fails (e.g., already initialized), fall back to getAuth
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
