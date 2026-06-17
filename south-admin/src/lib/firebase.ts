/**
 * Firebase — FCM (Push Notifications) ONLY.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  THIS FILE IS THE ONLY PLACE FIREBASE IS USED IN THE ENTIRE APP.  ║
 * ║  Firebase handles ONLY:                                           ║
 * ║    1. App identity (package name / google-services.json)          ║
 * ║    2. FCM push notification sending + receiving                   ║
 * ║                                                                   ║
 * ║  ALL data operations go through Supabase:                         ║
 * ║    - Auth          → @/lib/supabase-auth                          ║
 * ║    - Database      → @/lib/db-compat (routes to Supabase tables)  ║
 * ║    - Storage       → @/lib/supabase (Storage buckets)             ║
 * ║    - Realtime      → @/lib/supabase (Supabase Realtime)           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { initializeApp, getApps } from 'firebase/app';
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

export { app, messaging };
export default app;
