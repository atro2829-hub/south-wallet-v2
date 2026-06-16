/**
 * Firebase — KEPT ONLY FOR CLOUD MESSAGING (FCM push notifications).
 *
 * All other Firebase services have been disconnected:
 *  - Auth          → @/lib/supabase-auth
 *  - Database      → @/lib/db-compat (routes to Supabase tables)
 *  - Storage       → @/lib/supabase (Storage buckets)
 *
 * FCM is the standard for Android push notifications and has no
 * Supabase-native replacement, so we keep it here.
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

export { app, messaging };

// Compatibility shims — these used to come from firebase/auth, firebase/database,
// firebase/storage. Now they're re-exported from our Supabase-backed shims so
// that any code still doing `import { auth, database, storage } from '@/lib/firebase'`
// keeps working without touching Firebase.
export { auth } from './supabase-auth';

// `database` is no longer a real Firebase database — it's a marker object that
// the db-compat functions accept and ignore. Callers pass it to ref(database, path)
// but the path string is what matters.
export const database = { __compat: true } as unknown;

// `storage` — re-export Supabase storage instance for code that did
// `import { storage } from '@/lib/firebase'`. Supabase storage is accessed via
// supabase.storage.from('bucket') — we provide a tiny proxy that forwards.
import { supabase } from './supabase';
export const storage = {
  refFromURL: (url: string) => ({ getDownloadURL: async () => url, delete: async () => {} }),
  ref: (path: string) => ({
    put: async (data: Blob | Uint8Array | ArrayBuffer) => {
      const [bucket, ...rest] = path.split('/').filter(Boolean);
      const filePath = rest.join('/');
      const { error } = await supabase.storage.from(bucket || 'avatars').upload(filePath, data, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(bucket || 'avatars').getPublicUrl(filePath);
      return { ref: { getDownloadURL: async () => pub.publicUrl } };
    },
    getDownloadURL: async () => {
      const [bucket, ...rest] = path.split('/').filter(Boolean);
      const filePath = rest.join('/');
      const { data } = supabase.storage.from(bucket || 'avatars').getPublicUrl(filePath);
      return data.publicUrl;
    },
    delete: async () => {
      const [bucket, ...rest] = path.split('/').filter(Boolean);
      const filePath = rest.join('/');
      await supabase.storage.from(bucket || 'avatars').remove([filePath]);
    },
  }),
};

export default app;
