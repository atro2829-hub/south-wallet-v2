/**
 * Supabase Auth — Drop-in replacement for `firebase/auth`.
 *
 * What this module does:
 *  - signUp(email, password, metadata): creates a Supabase Auth user AND a row
 *    in public.users with a fresh 6-digit card_number.
 *  - signIn(email, password): signs in via Supabase Auth.
 *  - signOut(): clears the Supabase session.
 *  - getCurrentUser(): returns the current Supabase user (or null).
 *  - onAuthStateChange(cb): subscribes to Supabase auth state changes.
 *  - resetPassword(email): sends a Supabase password-reset email.
 *
 * Why this exists:
 *  We are disconnecting Firebase Auth completely. All authentication is now
 *  handled by Supabase Auth. The card_number (6-digit account number) is the
 *  public identifier shown to users; the Supabase UUID stays internal.
 */

import { supabase, supabaseService } from './supabase';

export type AuthUser = {
  uid: string;        // Supabase auth.users.id (UUID)
  email: string | null;
  emailVerified: boolean;
  metadata: Record<string, unknown>;
};

export type AuthStateCallback = (user: AuthUser | null) => void;
export type Unsubscribe = () => void;

/**
 * Sign up a new user. Creates an auth.users entry and a public.users row
 * with a freshly generated 6-digit card_number.
 */
export async function signUp(
  email: string,
  password: string,
  metadata: {
    firstName?: string;
    secondName?: string;
    thirdName?: string;
    familyName?: string;
    phone?: string;
    nationalId?: string;
    role?: 'user' | 'admin' | 'owner';
    displayName?: string;
  } = {}
): Promise<{ user: AuthUser | null; error: { code?: string; message: string } | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata.firstName || '',
          second_name: metadata.secondName || '',
          third_name: metadata.thirdName || '',
          family_name: metadata.familyName || '',
          phone: metadata.phone || '',
          national_id: metadata.nationalId || '',
          display_name: metadata.displayName || '',
          role: metadata.role || 'user',
        },
      },
    });

    if (error) {
      return { user: null, error: { code: error.code || 'unknown', message: error.message } };
    }

    if (!data.user) {
      return { user: null, error: { message: 'لم يتم إنشاء المستخدم' } };
    }

    // Insert the public.users row with a 6-digit card_number
    const cardNumber = await supabaseService.generateUniqueCardNumber();
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      firebase_uid: data.user.id, // For backward-compat with any code that reads firebase_uid
      email,
      phone: metadata.phone || null,
      first_name: metadata.firstName || '',
      second_name: metadata.secondName || '',
      third_name: metadata.thirdName || '',
      family_name: metadata.familyName || '',
      display_name: metadata.displayName || '',
      national_id: metadata.nationalId || null,
      card_number: cardNumber,
      card_issued_at: new Date().toISOString(),
      role: metadata.role || 'user',
      kyc_status: 'pending',
      is_active: true,
      is_blocked: false,
      theme: 'light',
      language: 'ar',
    });

    if (profileError) {
      console.error('[supabase-auth] Failed to create users row:', profileError);
      // Don't fail the whole signup — the auth user exists, the row can be repaired.
    }

    const authUser: AuthUser = {
      uid: data.user.id,
      email: data.user.email || null,
      emailVerified: data.user.email_confirmed_at != null,
      metadata: (data.user.user_metadata || {}) as Record<string, unknown>,
    };
    return { user: authUser, error: null };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    return { user: null, error: { code: e.code, message: e.message || 'حدث خطأ غير متوقع' } };
  }
}

/**
 * Sign in with email + password.
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: { code?: string; message: string } | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { user: null, error: { code: error.code || 'unknown', message: error.message } };
    }
    if (!data.user) {
      return { user: null, error: { message: 'فشل تسجيل الدخول' } };
    }

    // Update last_login_at
    try {
      await supabase.from('users').update({
        last_login_at: new Date().toISOString(),
      }).eq('id', data.user.id);
    } catch {}

    const authUser: AuthUser = {
      uid: data.user.id,
      email: data.user.email || null,
      emailVerified: data.user.email_confirmed_at != null,
      metadata: (data.user.user_metadata || {}) as Record<string, unknown>,
    };
    return { user: authUser, error: null };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    return { user: null, error: { code: e.code, message: e.message || 'حدث خطأ غير متوقع' } };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[supabase-auth] signOut error:', err);
  }
}

/**
 * Get the current authenticated user (or null).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return {
      uid: data.user.id,
      email: data.user.email || null,
      emailVerified: data.user.email_confirmed_at != null,
      metadata: (data.user.user_metadata || {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(callback: AuthStateCallback): { unsubscribe: () => void } {
  // Fire once immediately with current state
  supabase.auth.getSession().then(({ data }) => {
    const session = data.session;
    if (session?.user) {
      callback({
        uid: session.user.id,
        email: session.user.email || null,
        emailVerified: session.user.email_confirmed_at != null,
        metadata: (session.user.user_metadata || {}) as Record<string, unknown>,
      });
    } else {
      callback(null);
    }
  }).catch(() => callback(null));

  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        uid: session.user.id,
        email: session.user.email || null,
        emailVerified: session.user.email_confirmed_at != null,
        metadata: (session.user.user_metadata || {}) as Record<string, unknown>,
      });
    } else {
      callback(null);
    }
  });

  return { unsubscribe: () => sub.subscription.unsubscribe() };
}

/**
 * Send a password-reset email.
 */
export async function resetPassword(email: string): Promise<{ error: { message: string } | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    if (error) return { error: { message: error.message } };
    return { error: null };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: { message: e.message || 'حدث خطأ غير متوقع' } };
  }
}

/**
 * Resend email verification.
 */
export async function resendEmailVerification(email: string): Promise<{ error: { message: string } | null }> {
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { error: { message: error.message } };
    return { error: null };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: { message: e.message || 'حدث خطأ غير متوقع' } };
  }
}

/**
 * Update the current user's password.
 */
export async function updatePassword(newPassword: string): Promise<{ error: { message: string } | null }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: { message: error.message } };
    return { error: null };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { error: { message: e.message || 'حدث خطأ غير متوقع' } };
  }
}

// ============================================================
// Firebase-compatible aliases (so existing imports keep working)
// ============================================================

/** Alias for `signInWithEmailAndPassword(auth, email, password)` */
export async function signInWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: { code?: string; message: string } | null }> {
  return signIn(email, password);
}

/** Alias for `createUserWithEmailAndPassword(auth, email, password)` */
export async function createUserWithEmailAndPassword(
  _auth: unknown,
  email: string,
  password: string,
  metadata?: ConstructorParameters<typeof Object>[0] & Record<string, unknown>
): Promise<{ user: AuthUser | null; error: { code?: string; message: string } | null }> {
  return signUp(email, password, metadata as Parameters<typeof signUp>[2] || {});
}

/** Alias for `sendPasswordResetEmail(auth, email)` */
export async function sendPasswordResetEmail(_auth: unknown, email: string): Promise<void> {
  const { error } = await resetPassword(email);
  if (error) console.warn('[supabase-auth] sendPasswordResetEmail:', error.message);
}

/** Alias for `onAuthStateChanged(auth, callback)` — returns unsubscribe function */
export function onAuthStateChanged(_auth: unknown, callback: (user: AuthUser | null) => void): Unsubscribe {
  const sub = onAuthStateChange(callback);
  return sub.unsubscribe;
}

// Re-export the Supabase auth instance (so `auth` import works)
export const auth = {
  currentUser: null as AuthUser | null,
};

// Helper to keep `auth.currentUser` updated
if (typeof window !== 'undefined') {
  onAuthStateChange((u) => {
    auth.currentUser = u;
  });
}

// Unused Firebase-compat exports (no-ops / placeholders)
export const browserLocalPersistence = 'browserLocalPersistence';
export const indexedDBLocalPersistence = 'indexedDBLocalPersistence';
export function initializeAuth(_app: unknown, _opts?: unknown) { return auth; }
export function getAuth(_app?: unknown) { return auth; }
export const EmailAuthProvider = {
  credential: (email: string, password: string) => ({ email, password, providerId: 'password' }),
  PROVIDER_ID: 'password',
};
export async function reauthenticateWithCredential(_user: unknown, cred: { email: string; password: string }) {
  return signIn(cred.email, cred.password);
}
