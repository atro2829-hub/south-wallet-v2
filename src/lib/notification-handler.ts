/**
 * Notification Deep-Linking Handler
 *
 * Parses notification navigation targets and performs in-app navigation
 * when a push notification (FCM) is received or a notification is tapped
 * in the notifications list.
 *
 * Supported navigation targets:
 *   transaction:{transactionId}  → Transaction receipt screen
 *   deposit:{depositId}          → Deposit screen
 *   withdraw:{withdrawId}        → Wallet screen (withdraw tab)
 *   order:{orderId}              → Orders screen
 *   kyc                         → KYC verification screen
 *   profile                     → Account screen
 *   exchange                    → Exchange screen
 *   services                    → Services screen
 *   promo:{code}                → Promo screen (with code pre-filled)
 *   support:{ticketId}          → Support screen
 *   url:{https://...}           → Open external URL in new tab
 */

import { useAppStore } from '@/lib/store';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Parsed result of a navigation target string */
export interface ParsedNavigationTarget {
  /** The target screen/route type */
  type:
    | 'transaction'
    | 'deposit'
    | 'withdraw'
    | 'order'
    | 'kyc'
    | 'profile'
    | 'exchange'
    | 'services'
    | 'promo'
    | 'support'
    | 'url'
    | 'unknown';
  /** The identifier extracted after the colon (e.g., transactionId, orderId) */
  id?: string;
  /** The original raw navigation target string */
  raw: string;
}

/** Extended notification type that includes deep-link fields */
export interface DeepLinkNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'transaction' | 'security' | 'promo';
  isRead: boolean;
  createdAt: string;
  navigationTarget?: string;
  navigationParams?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/** Result of handling a notification deep link */
export interface NavigationResult {
  success: boolean;
  screen?: string;
  error?: string;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse a navigation target string into a structured object.
 *
 * @example
 *   parseNavigationTarget('transaction:abc123') → { type: 'transaction', id: 'abc123', raw: '...' }
 *   parseNavigationTarget('kyc')                → { type: 'kyc', id: undefined, raw: '...' }
 *   parseNavigationTarget('url:https://example.com') → { type: 'url', id: 'https://example.com', raw: '...' }
 */
export function parseNavigationTarget(target: string): ParsedNavigationTarget {
  if (!target || typeof target !== 'string') {
    return { type: 'unknown', raw: target || '' };
  }

  const trimmed = target.trim();
  const colonIndex = trimmed.indexOf(':');

  // No colon → simple target like "kyc", "profile", "exchange"
  if (colonIndex === -1) {
    const simpleTargets: ParsedNavigationTarget['type'][] = [
      'kyc', 'profile', 'exchange', 'services',
    ];
    const lowerType = trimmed.toLowerCase();
    if (simpleTargets.includes(lowerType as ParsedNavigationTarget['type'])) {
      return { type: lowerType as ParsedNavigationTarget['type'], raw: trimmed };
    }
    return { type: 'unknown', raw: trimmed };
  }

  // Has colon → compound target like "transaction:abc123"
  const prefix = trimmed.substring(0, colonIndex).toLowerCase();
  const id = trimmed.substring(colonIndex + 1);

  const compoundTargets: ParsedNavigationTarget['type'][] = [
    'transaction', 'deposit', 'withdraw', 'order', 'promo', 'support', 'url',
  ];

  if (compoundTargets.includes(prefix as ParsedNavigationTarget['type'])) {
    return { type: prefix as ParsedNavigationTarget['type'], id: id || undefined, raw: trimmed };
  }

  return { type: 'unknown', raw: trimmed };
}

// ─── FCM Data Payload Parser ────────────────────────────────────────────────

/**
 * Extract the navigation target from an FCM data payload.
 *
 * FCM messages can carry the navigation target in various places:
 *   - data.navigationTarget   (set by our backend)
 *   - data.navigation_target  (snake_case variant)
 *   - data.target             (shorthand)
 *   - data.action             (legacy fallback)
 */
export function extractNavigationTargetFromFCM(
  fcmData: Record<string, unknown> | undefined | null,
): string | undefined {
  if (!fcmData || typeof fcmData !== 'object') return undefined;

  return (
    (fcmData.navigationTarget as string) ||
    (fcmData.navigation_target as string) ||
    (fcmData.target as string) ||
    (fcmData.action as string) ||
    undefined
  );
}

// ─── Navigator ──────────────────────────────────────────────────────────────

/** Screen name mapping for the app's setActiveScreen() */
const SCREEN_MAP: Record<ParsedNavigationTarget['type'], string | null> = {
  transaction: 'transaction-detail',
  deposit: 'deposit',
  withdraw: 'wallet',
  order: 'orders',
  kyc: 'kyc',
  profile: 'account',
  exchange: 'exchange',
  services: 'services',
  promo: 'promo',
  support: 'support',
  url: null, // handled specially
  unknown: null,
};

/**
 * Navigate to the appropriate screen based on a parsed navigation target.
 *
 * Uses `useAppStore.getState()` to call navigation methods synchronously
 * without requiring a React component context.
 */
export function navigateToTarget(parsed: ParsedNavigationTarget): NavigationResult {
  const store = useAppStore.getState();

  // Handle external URLs
  if (parsed.type === 'url' && parsed.id) {
    try {
      const url = parsed.id;
      // Validate URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank', 'noopener,noreferrer');
        return { success: true, screen: 'external-url' };
      }
      return { success: false, error: `Invalid URL scheme: ${url}` };
    } catch (err) {
      return { success: false, error: `Failed to open URL: ${err}` };
    }
  }

  const screenName = SCREEN_MAP[parsed.type];
  if (!screenName) {
    return { success: false, error: `Unknown navigation target: ${parsed.raw}` };
  }

  // Set context-specific state before navigating
  switch (parsed.type) {
    case 'transaction': {
      // Store the transaction ID so transaction-detail-screen can find it
      (store as any).selectedTransactionId = parsed.id || null;
      break;
    }
    case 'deposit': {
      // Could store depositId for deposit detail view in the future
      if (parsed.id) {
        (store as any).selectedDepositId = parsed.id;
      }
      break;
    }
    case 'withdraw': {
      // Navigate to wallet screen which contains withdraw functionality
      if (parsed.id) {
        (store as any).selectedWithdrawId = parsed.id;
      }
      break;
    }
    case 'order': {
      // Store orderId so orders screen can highlight it
      if (parsed.id) {
        (store as any).selectedOrderId = parsed.id;
      }
      break;
    }
    case 'promo': {
      // Store promo code for the promo screen to pick up
      if (parsed.id) {
        (store as any).promoCode = parsed.id;
      }
      break;
    }
    case 'support': {
      // Store ticketId so support screen can open the ticket
      if (parsed.id) {
        (store as any).selectedTicketId = parsed.id;
      }
      break;
    }
  }

  store.setActiveScreen(screenName);
  return { success: true, screen: screenName };
}

// ─── High-level Handlers ────────────────────────────────────────────────────

/**
 * Handle a notification tap from the notifications list.
 *
 * 1. Marks the notification as read
 * 2. Parses the navigation target
 * 3. Navigates to the appropriate screen
 *
 * @returns NavigationResult indicating where the user was taken
 */
export function handleNotificationTap(notification: DeepLinkNotification): NavigationResult {
  const store = useAppStore.getState();

  // 1. Mark as read
  if (!notification.isRead) {
    store.markNotificationRead(notification.id);
  }

  // 2. Resolve navigation target
  const target = notification.navigationTarget ||
    extractNavigationTargetFromFCM(notification.data as Record<string, unknown>) ||
    inferTargetFromType(notification);

  if (!target) {
    // No navigation target — just mark as read, stay on screen
    return { success: true, screen: undefined };
  }

  // 3. Parse and navigate
  const parsed = parseNavigationTarget(target);
  return navigateToTarget(parsed);
}

/**
 * Handle an incoming FCM push notification data payload.
 *
 * Called when a push notification is received while the app is in the
 * foreground. Returns the parsed navigation target so the UI can show
 * an in-app deep-link banner.
 */
export function handleFCMDataPayload(
  fcmData: Record<string, unknown>,
): { parsed: ParsedNavigationTarget; notification?: DeepLinkNotification } | null {
  const target = extractNavigationTargetFromFCM(fcmData);
  if (!target) return null;

  const parsed = parseNavigationTarget(target);
  const notification: DeepLinkNotification = {
    id: (fcmData.id as string) || `fcm_${Date.now()}`,
    title: (fcmData.title as string) || '',
    body: (fcmData.body as string) || '',
    type: (fcmData.type as DeepLinkNotification['type']) || 'info',
    isRead: false,
    createdAt: new Date().toISOString(),
    navigationTarget: target,
    navigationParams: (fcmData.navigationParams as Record<string, unknown>) ||
      (fcmData.navigation_params as Record<string, unknown>) || undefined,
    data: fcmData,
  };

  return { parsed, notification };
}

// ─── Inference Helper ───────────────────────────────────────────────────────

/**
 * Infer a navigation target from the notification type and data
 * when no explicit navigationTarget is set.
 *
 * This provides backwards compatibility for notifications created
 * before the navigation_target field was added.
 */
function inferTargetFromType(notification: DeepLinkNotification): string | undefined {
  const data = notification.data || {};

  // Check for action-based inference
  const action = data.action as string | undefined;
  if (action) {
    const actionMap: Record<string, string> = {
      deposit_request: 'deposit',
      deposit_status: 'deposit',
      withdraw_request: 'withdraw',
      withdraw_status: 'withdraw',
      order_created: 'order',
      order_status: 'order',
      transfer_received: 'transaction',
      money_request: undefined,
      gift_code_redeemed: 'promo',
      kyc_status: 'kyc',
      account_status: notification.type === 'security' ? 'support' : 'profile',
    };
    const mapped = actionMap[action];
    if (mapped) return mapped;
  }

  // Fall back to notification type inference
  switch (notification.type) {
    case 'transaction':
      return 'services'; // Generic transaction → services
    case 'security':
      return 'profile'; // Security notifications → account
    case 'promo':
      return 'promo'; // Promo notifications → promo screen
    default:
      return undefined;
  }
}

// ─── Event System for Foreground Notifications ─────────────────────────────

type NotificationListener = (parsed: ParsedNavigationTarget, notification: DeepLinkNotification) => void;

const listeners: Set<NotificationListener> = new Set();

/**
 * Subscribe to foreground notification events.
 * Used by the home-screen banner to show when a notification arrives.
 */
export function onForegroundNotification(listener: NotificationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Emit a foreground notification event to all subscribers.
 */
export function emitForegroundNotification(
  parsed: ParsedNavigationTarget,
  notification: DeepLinkNotification,
): void {
  listeners.forEach((listener) => {
    try {
      listener(parsed, notification);
    } catch (err) {
      console.error('Foreground notification listener error:', err);
    }
  });
}
