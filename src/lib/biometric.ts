/**
 * Biometric Authentication Utility
 *
 * Supports both native (Capacitor) and web platforms.
 * - Native: Uses @aparajita/capacitor-biometric-auth
 * - Web: Falls back to WebAuthn / navigator.credentials
 *
 * Preferences are stored in both localStorage AND Firebase.
 */

import { database } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';

// ── Platform Detection ──────────────────────────────────────────────
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { Capacitor?: unknown }).Capacitor;
}

// ── Biometric Availability ──────────────────────────────────────────

export interface BiometricAvailability {
  available: boolean;
  biometryType?: 'fingerprint' | 'face' | 'iris' | 'none';
  hasCredentials?: boolean;
  platform: 'native' | 'web' | 'unsupported';
  errorCode?: string; // e.g. 'biometryNotEnrolled', 'biometryNotAvailable'
  reason?: string;
}

/**
 * Check if biometric auth is available on the current device.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const result = await checkBiometricAvailability();
  return result.available;
}

/**
 * Detailed check of biometric availability.
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (typeof window === 'undefined') {
    return { available: false, platform: 'unsupported' };
  }

  // Native platform (Capacitor)
  if (isNativePlatform()) {
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      const result = await BiometricAuth.checkBiometry();
      const typeMap: Record<number, 'fingerprint' | 'face' | 'iris' | 'none'> = {
        0: 'none',
        1: 'fingerprint',
        2: 'face',
        3: 'fingerprint', // fingerprintAuthentication
        4: 'face',        // faceAuthentication
        5: 'iris',        // irisAuthentication
      };
      return {
        available: result.isAvailable && result.biometryType !== 0,
        biometryType: typeMap[result.biometryType] || 'none',
        hasCredentials: result.isAvailable,
        platform: 'native',
        errorCode: result.code || undefined,
        reason: result.reason || undefined,
      };
    } catch (err: unknown) {
      console.error('[Biometric] checkBiometry error:', err);
      // BiometricAuth not available, fall through to web
    }
  }

  // Web platform - check WebAuthn support
  if (window.PublicKeyCredential) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        available,
        biometryType: available ? 'fingerprint' : 'none',
        platform: 'web',
      };
    } catch {
      return { available: false, platform: 'web' };
    }
  }

  return { available: false, platform: 'unsupported' };
}

// ── Biometric Authentication ────────────────────────────────────────

export interface BiometricAuthResult {
  success: boolean;
  errorCode?: string;    // 'userCancel' | 'authenticationFailed' | 'biometryLockout' | etc.
  errorMessage?: string;
}

/**
 * Authenticate the user with biometrics.
 *
 * IMPORTANT: @aparajita/capacitor-biometric-auth uses a throw-based API:
 * - On SUCCESS: resolve(void) — no return value
 * - On FAILURE: reject(BiometryError) with code property
 *
 * This function wraps that API to return a structured result.
 *
 * @param reason - The reason to display to the user (native only)
 * @returns BiometricAuthResult with success flag and optional error info
 */
export async function authenticateWithBiometric(reason?: string): Promise<boolean> {
  const result = await authenticateWithBiometricDetailed(reason);
  return result.success;
}

/**
 * Detailed biometric authentication with error info.
 */
export async function authenticateWithBiometricDetailed(reason?: string): Promise<BiometricAuthResult> {
  if (typeof window === 'undefined') {
    return { success: false, errorCode: 'notAvailable', errorMessage: 'Window not available' };
  }

  // Native platform (Capacitor)
  if (isNativePlatform()) {
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');

      // IMPORTANT: checkBiometry() MUST be called before authenticate()
      // per the plugin documentation
      const biometryInfo = await BiometricAuth.checkBiometry();
      if (!biometryInfo.isAvailable) {
        console.warn('[Biometric] Not available:', biometryInfo.reason, biometryInfo.code);
        return {
          success: false,
          errorCode: biometryInfo.code || 'biometryNotAvailable',
          errorMessage: biometryInfo.reason || 'البصمة غير متاحة على هذا الجهاز',
        };
      }

      // authenticate() resolves void on success, throws BiometryError on failure
      await BiometricAuth.authenticate({
        reason: reason || 'يرجى التحقق من هويتك لاستخدام المحفظة',
        androidTitle: 'محفظة الجنوب',
        androidSubtitle: 'التحقق بالبصمة',
        cancelTitle: 'إلغاء',
        allowDeviceCredential: true,
        androidConfirmationRequired: false,
      });

      // If we get here, authentication succeeded
      console.log('[Biometric] Authentication succeeded');
      return { success: true };
    } catch (err: unknown) {
      // BiometryError has a .code property
      const error = err as { code?: string; message?: string };
      const errorCode = error.code || 'unknown';
      const errorMessage = error.message || 'فشل التحقق';

      console.warn('[Biometric] Authentication failed:', errorCode, errorMessage);

      // Map common error codes to user-friendly Arabic messages
      const userMessages: Record<string, string> = {
        'userCancel': 'تم إلغاء التحقق',
        'systemCancel': 'تم إلغاء التحقق من النظام',
        'authenticationFailed': 'فشل التحقق بالبصمة، حاول مرة أخرى',
        'biometryLockout': 'تم قفل البصمة مؤقتاً بسبب محاولات فاشلة كثيرة، حاول لاحقاً',
        'biometryNotAvailable': 'البصمة غير متاحة على هذا الجهاز',
        'biometryNotEnrolled': 'لم يتم تسجيل بصمة على هذا الجهاز، سجل بصمة من إعدادات الهاتف أولاً',
        'noDeviceCredential': 'لم يتم تعيين رمز PIN أو كلمة مرور للجهاز',
        'passcodeNotSet': 'لم يتم تعيين رمز مرور للجهاز',
        'userFallback': 'تم اختيار طريقة دخول بديلة',
      };

      return {
        success: false,
        errorCode,
        errorMessage: userMessages[errorCode] || errorMessage,
      };
    }
  }

  // Web platform - use WebAuthn
  if (window.PublicKeyCredential) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        return { success: false, errorCode: 'biometryNotAvailable', errorMessage: 'البصمة غير متاحة' };
      }

      // Create a simple authentication challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'محفظة الجنوب',
            id: window.location.hostname,
          },
          user: {
            id: new Uint8Array(16),
            name: 'biometric-auth',
            displayName: 'مستخدم محفظة الجنوب',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });

      return { success: !!credential };
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError') {
        return { success: false, errorCode: 'userCancel', errorMessage: 'تم إلغاء التحقق' };
      }
      return { success: false, errorCode: 'unknown', errorMessage: error.message || 'فشل التحقق' };
    }
  }

  return { success: false, errorCode: 'notAvailable', errorMessage: 'البصمة غير مدعومة' };
}

// ── Preference Management ───────────────────────────────────────────

const BIOMETRIC_STORAGE_KEY = 'biometric-login-enabled';

/**
 * Enable or disable biometric login for a user.
 * Stores preference in both localStorage and Firebase.
 */
export async function setBiometricEnabled(uid: string, enabled: boolean): Promise<void> {
  // localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(BIOMETRIC_STORAGE_KEY, String(enabled));
    localStorage.setItem(`${BIOMETRIC_STORAGE_KEY}-${uid}`, String(enabled));
  }

  // Firebase
  try {
    await update(ref(database, `users/${uid}`), {
      biometricEnabled: enabled,
    });
  } catch (error) {
    console.warn('Failed to update biometric preference in Firebase:', error);
  }
}

/**
 * Check if biometric login is enabled for a user.
 * Checks localStorage first, then Firebase.
 */
export async function isBiometricLoginEnabled(uid: string): Promise<boolean> {
  // Check localStorage first (fast) — check both key formats for compatibility
  if (typeof window !== 'undefined') {
    // Check the primary key used by setBiometricEnabled
    const localVal = localStorage.getItem(`${BIOMETRIC_STORAGE_KEY}-${uid}`);
    if (localVal !== null) {
      return localVal === 'true';
    }
    // Fallback: check the per-user key set by setBiometricEnabledForUser
    const perUserVal = localStorage.getItem(`biometric_enabled_${uid}`);
    if (perUserVal !== null) {
      return perUserVal === 'true';
    }
  }

  // Check Firebase
  try {
    const snapshot = await get(ref(database, `users/${uid}/biometricEnabled`));
    if (snapshot.exists()) {
      const val = snapshot.val();
      // Cache in localStorage (both keys for compatibility)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${BIOMETRIC_STORAGE_KEY}-${uid}`, String(val));
        localStorage.setItem(`biometric_enabled_${uid}`, String(val));
      }
      return !!val;
    }
  } catch (error) {
    console.warn('Failed to check biometric preference in Firebase:', error);
  }

  return false;
}

/**
 * Sync the biometric preference from Firebase to local state on app start.
 */
export async function syncBiometricPreference(uid: string): Promise<boolean> {
  try {
    const snapshot = await get(ref(database, `users/${uid}/biometricEnabled`));
    if (snapshot.exists()) {
      const enabled = !!snapshot.val();
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${BIOMETRIC_STORAGE_KEY}-${uid}`, String(enabled));
        localStorage.setItem(BIOMETRIC_STORAGE_KEY, String(enabled));
      }
      return enabled;
    }
  } catch (error) {
    console.warn('Failed to sync biometric preference:', error);
  }
  return false;
}

/**
 * Store user credentials securely for biometric login.
 * In a real native app, this would use the device keychain.
 * For web, we store a flag in localStorage (not the actual password).
 */
export async function storeBiometricCredentials(uid: string, email: string): Promise<void> {
  if (typeof window === 'undefined') return;
  // Store a marker that this user has set up biometric auth
  localStorage.setItem(`biometric-cred-${uid}`, JSON.stringify({
    uid,
    email,
    setupAt: new Date().toISOString(),
  }));
}

/**
 * Retrieve stored biometric credentials.
 */
export async function getBiometricCredentials(uid: string): Promise<{ uid: string; email: string } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`biometric-cred-${uid}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Remove stored biometric credentials.
 */
export async function removeBiometricCredentials(uid: string): Promise<void> {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`biometric-cred-${uid}`);
}

// ── Per-User Biometric Persistence ──────────────────────────────────

/**
 * Check if biometric is enabled for a specific user (from localStorage).
 * This persists across logout/re-login cycles.
 */
export function isBiometricEnabledForUser(uid: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`biometric_enabled_${uid}`) === 'true';
}

/**
 * Set or remove the biometric enabled flag for a specific user in localStorage.
 * When enabled, the flag persists even after logout.
 */
export function setBiometricEnabledForUser(uid: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem(`biometric_enabled_${uid}`, 'true');
  } else {
    localStorage.removeItem(`biometric_enabled_${uid}`);
  }
}

/**
 * Store the last logged-in user's UID so we know who to check biometric for.
 */
export function setLastLoggedInUser(uid: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('last_logged_in_uid', uid);
}

/**
 * Get the last logged-in user's UID from localStorage.
 */
export function getLastLoggedInUser(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('last_logged_in_uid');
}
