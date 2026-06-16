/**
 * Transaction Sound System - Professional Bank-like Sounds
 * Each transaction type has its own unique, calm sound
 * Sounds are loaded from /public/sounds/ directory
 */

export type TransactionSoundType =
  | 'transfer'      // تحويل أموال
  | 'deposit'       // إيداع
  | 'withdraw'      // سحب
  | 'payment'       // دفع فاتورة
  | 'recharge'      // شحن رصيد
  | 'purchase'      // شراء خدمة/منتج
  | 'code_redemption' // استرداد كود
  | 'exchange'      // صرف عملات
  | 'refund'        // استرجاع
  | 'notification'  // إشعار عام
  | 'security'      // تنبيه أمني
  | 'success'       // نجاح عام
  | 'error';        // خطأ

const soundMap: Record<TransactionSoundType, string> = {
  transfer: '/sounds/transfer.wav',
  deposit: '/sounds/deposit.wav',
  withdraw: '/sounds/withdraw.wav',
  payment: '/sounds/order.wav',
  recharge: '/sounds/deposit.wav',
  purchase: '/sounds/order.wav',
  code_redemption: '/sounds/success.wav',
  exchange: '/sounds/transfer.wav',
  refund: '/sounds/success.wav',
  notification: '/sounds/notification.wav',
  security: '/sounds/security.wav',
  success: '/sounds/success.wav',
  error: '/sounds/security.wav',
};

// Audio cache to prevent re-loading same sound
const audioCache: Record<string, HTMLAudioElement> = {};

// Volume levels per type - calm and quiet like a bank
const volumeMap: Record<TransactionSoundType, number> = {
  transfer: 0.4,
  deposit: 0.5,
  withdraw: 0.35,
  payment: 0.3,
  recharge: 0.4,
  purchase: 0.3,
  code_redemption: 0.4,
  exchange: 0.35,
  refund: 0.4,
  notification: 0.25,
  security: 0.5,
  success: 0.4,
  error: 0.3,
};

/**
 * Play a transaction sound
 * @param type - The type of transaction sound to play
 * @param customVolume - Optional custom volume (0-1), overrides default
 */
export function playTransactionSound(type: TransactionSoundType, customVolume?: number): void {
  try {
    const soundPath = soundMap[type];
    if (!soundPath) return;

    // Check if sounds are muted
    if (typeof window !== 'undefined') {
      const muted = localStorage.getItem('app-sounds-muted');
      if (muted === 'true') return;
    }

    // Use cached audio or create new one
    let audio = audioCache[soundPath];
    if (!audio) {
      audio = new Audio(soundPath);
      audioCache[soundPath] = audio;
    }

    // Reset playback position
    audio.currentTime = 0;
    audio.volume = customVolume ?? volumeMap[type] ?? 0.4;

    // Play with catch for browsers that require user interaction first
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay blocked - this is fine, sound will play next time
        // after user interaction
      });
    }

    // Vibrate on mobile for tactile feedback (short, subtle vibration)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const vibrationMap: Record<TransactionSoundType, number[]> = {
        transfer: [30],
        deposit: [50],
        withdraw: [20],
        payment: [25],
        recharge: [40],
        purchase: [25],
        code_redemption: [30, 50, 30],
        exchange: [20],
        refund: [30, 50],
        notification: [15],
        security: [50, 30, 50],
        success: [30, 50, 30],
        error: [50, 30, 50],
      };
      navigator.vibrate(vibrationMap[type] || [20]);
    }
  } catch (error) {
    // Non-critical - don't crash the app for a sound failure
    console.warn('Sound playback failed:', error);
  }
}

/**
 * Play sound based on transaction type string from Firebase
 */
export function playSoundForTransactionType(type: string): void {
  const typeMap: Record<string, TransactionSoundType> = {
    transfer: 'transfer',
    deposit: 'deposit',
    withdraw: 'withdraw',
    payment: 'payment',
    recharge: 'recharge',
    bill: 'payment',
    purchase: 'purchase',
    code_redemption: 'code_redemption',
    exchange: 'exchange',
    refund: 'refund',
  };
  const soundType = typeMap[type] || 'notification';
  playTransactionSound(soundType);
}

/**
 * Toggle sounds on/off
 */
export function setSoundsEnabled(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('app-sounds-muted', String(!enabled));
  }
}

/**
 * Check if sounds are enabled
 */
export function isSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('app-sounds-muted') !== 'true';
}
