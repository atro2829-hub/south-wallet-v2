import { database } from '@/lib/db-compat';
import { ref, set, update, get } from '@/lib/db-compat';
import { sendFCMDirect } from '@/lib/fcm-sender';

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'info' | 'transaction' | 'security' | 'promo';
  isRead?: boolean;
  navigationTarget?: string; // e.g., "transaction:abc123", "kyc", "url:https://..."
  navigationParams?: Record<string, unknown>;
  data?: Record<string, any>;
}

/**
 * Send FCM push notification directly to FCM tokens using the FCM HTTP v1 API.
 * This bypasses the /api/send-push route which doesn't work in static exports (Capacitor APKs).
 */
async function sendFCMPush(tokens: string[], title: string, body: string, type: string, data?: Record<string, any>): Promise<void> {
  if (!tokens || tokens.length === 0) return;

  try {
    await sendFCMDirect(tokens, title, body, type, data);
  } catch (error) {
    console.warn('FCM push failed (non-blocking):', error);
  }
}

/**
 * Get FCM token for a user — read directly from Supabase users.fcm_token.
 * Previously read from `users/{uid}/fcmToken` via db-compat which (a) returns
 * the entire user row, not the single field, and (b) looked for camelCase
 * `fcmToken` while Supabase stores snake_case `fcm_token`. Result: always
 * returned null → no push notifications ever delivered.
 */
async function getUserFCMToken(userId: string): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[getUserFCMToken] supabase error:', error.message);
      return null;
    }
    return data?.fcm_token || null;
  } catch (e) {
    console.warn('[getUserFCMToken] exception:', e);
    return null;
  }
}

/**
 * Get FCM tokens for all users (or filtered by role).
 */
async function getAllUserFCMTokens(roleFilter?: 'admin' | 'owner'): Promise<string[]> {
  try {
    const { supabaseService } = await import('@/lib/supabase');
    let query = supabaseService.from('users').select('fcm_token,role').not('fcm_token', 'is', null);
    if (roleFilter) {
      query = query.in('role', [roleFilter, 'admin', 'owner']);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('[getAllUserFCMTokens] supabase error:', error.message);
      return [];
    }
    if (roleFilter) {
      // Strict filter: only admins/owners
      return (data || [])
        .filter((u: any) => u.role === roleFilter || (roleFilter === 'admin' && u.role === 'owner'))
        .map((u: any) => u.fcm_token)
        .filter(Boolean);
    }
    return (data || []).map((u: any) => u.fcm_token).filter(Boolean);
  } catch (e) {
    console.warn('[getAllUserFCMTokens] exception:', e);
    return [];
  }
}

/**
 * Send a notification to a specific user (in-app + FCM push)
 *
 * In-app notification is persisted to the `notifications` Supabase table
 * (snake_case columns: user_id, is_read, navigation_target, navigation_params).
 * Previously wrote camelCase fields via db-compat which silently failed.
 */
export async function sendNotificationToUser(userId: string, notification: NotificationPayload): Promise<void> {
  // 1. Persist to Supabase notifications table so the user sees it in-app.
  try {
    const { supabaseService } = await import('@/lib/supabase');
    const { error } = await supabaseService.from('notifications').insert({
      user_id: userId,
      title: notification.title,
      body: notification.body,
      type: notification.type || 'info',
      is_read: false,
      navigation_target: notification.navigationTarget || null,
      navigation_params: notification.navigationParams || null,
      data: notification.data || null,
    });
    if (error) console.warn('[sendNotificationToUser] supabase insert failed:', error.message);
  } catch (e) {
    console.warn('[sendNotificationToUser] supabase insert exception:', e);
  }

  // 2. Send FCM push notification (works when app is closed).
  const fcmToken = await getUserFCMToken(userId);
  if (fcmToken) {
    await sendFCMPush([fcmToken], notification.title, notification.body, notification.type, {
      ...notification.data,
      navigationTarget: notification.navigationTarget,
      navigationParams: notification.navigationParams,
    });
  } else {
    console.warn(`[sendNotificationToUser] no FCM token for user ${userId} — push skipped`);
  }
}

/**
 * Send a notification to all users (in-app + FCM push).
 * Uses supabaseService to bypass RLS for the bulk insert.
 */
export async function sendNotificationToAll(notification: NotificationPayload): Promise<void> {
  try {
    const { supabaseService } = await import('@/lib/supabase');
    // 1. Fetch all user IDs + FCM tokens
    const { data: users, error } = await supabaseService.from('users')
      .select('id,fcm_token')
      .eq('is_blocked', false);
    if (error) {
      console.warn('[sendNotificationToAll] fetch users error:', error.message);
      return;
    }
    if (!users || users.length === 0) return;

    // 2. Bulk insert notifications
    const rows = users.map((u: any) => ({
      user_id: u.id,
      title: notification.title,
      body: notification.body,
      type: notification.type || 'info',
      is_read: false,
      navigation_target: notification.navigationTarget || null,
      navigation_params: notification.navigationParams || null,
      data: notification.data || null,
    }));
    const { error: insErr } = await supabaseService.from('notifications').insert(rows);
    if (insErr) console.warn('[sendNotificationToAll] bulk insert failed:', insErr.message);

    // 3. Send FCM push in batches of 500
    const tokens: string[] = users.map((u: any) => u.fcm_token).filter(Boolean);
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      await sendFCMPush(batch, notification.title, notification.body, notification.type, {
        ...notification.data,
        navigationTarget: notification.navigationTarget,
        navigationParams: notification.navigationParams,
      });
    }
  } catch (e) {
    console.warn('[sendNotificationToAll] exception:', e);
  }
}

/**
 * Get FCM tokens for all admin/owner users — read from Supabase users.fcm_token.
 */
async function getAdminFCMTokens(): Promise<string[]> {
  try {
    const { supabaseService } = await import('@/lib/supabase');
    const { data, error } = await supabaseService.from('users')
      .select('fcm_token')
      .in('role', ['admin', 'owner', 'super_admin'])
      .not('fcm_token', 'is', null);
    if (error) {
      console.warn('[getAdminFCMTokens] supabase error:', error.message);
      return [];
    }
    return (data || []).map((u: any) => u.fcm_token).filter(Boolean);
  } catch (e) {
    console.warn('[getAdminFCMTokens] exception:', e);
    return [];
  }
}

/**
 * Send a notification to admin (for admin/owner app) — in-app + FCM push
 *
 * Persists directly to the `admin_notifications` Supabase table using the
 * service-role client (bypasses RLS) so user-side notifications actually land.
 * The previous implementation went through db-compat which mapped
 * `adminNotifications/{id}` to an UPDATE — but the table PK is a UUID and
 * the supplied id was a string, so the UPDATE matched 0 rows. It also used
 * camelCase keys that don't exist in the table (which uses snake_case:
 * is_read, sent_at, navigation_target, navigation_params).
 */
export async function sendNotificationToAdmin(notification: NotificationPayload & { category?: string }): Promise<void> {
  // 1. Save to Supabase admin_notifications table (snake_case, service role)
  try {
    const { supabaseService } = await import('@/lib/supabase');
    const { error } = await supabaseService.from('admin_notifications').insert({
      title: notification.title,
      body: notification.body,
      type: notification.type || 'info',
      target_role: 'admin',
      is_read: false,
      sent_at: new Date().toISOString(),
      navigation_target: notification.navigationTarget || null,
      navigation_params: notification.navigationParams || null,
      data: {
        ...(notification.data || {}),
        category: notification.category || 'general',
      },
    });
    if (error) {
      console.warn('[sendNotificationToAdmin] supabase insert failed:', error.message);
    }
  } catch (e) {
    console.warn('[sendNotificationToAdmin] supabase insert exception:', e);
  }

  // 2. Send FCM push notification to all admin/owner devices
  try {
    const adminTokens = await getAdminFCMTokens();
    if (adminTokens.length > 0) {
      await sendFCMPush(adminTokens, notification.title, notification.body, notification.type, {
        ...notification.data,
        category: notification.category || 'general',
        target: 'admin',
      });
    }
  } catch (error) {
    console.warn('Failed to send FCM push to admin:', error);
  }
}

/**
 * Send notification when a deposit request is created
 */
export async function notifyDepositRequest(userId: string, userName: string, amount: number, currency: string): Promise<void> {
  // Notify the user
  await sendNotificationToUser(userId, {
    title: 'طلب إيداع جديد',
    body: `تم استلام طلب إيداعك بمبلغ ${amount} ${currency}. سيتم مراجعته قريباً.`,
    type: 'transaction',
    navigationTarget: 'deposit',
    data: { action: 'deposit_request', amount, currency },
  });

  // Notify admin
  await sendNotificationToAdmin({
    title: 'طلب إيداع جديد',
    body: `طلب إيداع جديد من ${userName} بمبلغ ${amount} ${currency}`,
    type: 'transaction',
    category: 'deposits',
    data: { action: 'deposit_request', userId, amount, currency },
  });
}

/**
 * Send notification when a deposit is approved/rejected
 */
export async function notifyDepositStatus(userId: string, amount: number, currency: string, status: 'approved' | 'rejected'): Promise<void> {
  const statusText = status === 'approved' ? 'تم قبول' : 'تم رفض';
  await sendNotificationToUser(userId, {
    title: `${statusText} طلب الإيداع`,
    body: `${statusText} طلب إيداعك بمبلغ ${amount} ${currency}`,
    type: 'transaction',
    navigationTarget: 'deposit',
    data: { action: 'deposit_status', amount, currency, status },
  });
}

/**
 * Send notification when an order is created
 */
export async function notifyOrderCreated(userId: string, packageName: string, amount: number, currency: string): Promise<void> {
  await sendNotificationToUser(userId, {
    title: 'طلب جديد',
    body: `تم إنشاء طلب ${packageName} بمبلغ ${amount} ${currency}`,
    type: 'transaction',
    navigationTarget: 'order',
    data: { action: 'order_created', packageName, amount, currency },
  });

  await sendNotificationToAdmin({
    title: 'طلب خدمة جديد',
    body: `طلب جديد: ${packageName} - ${amount} ${currency}`,
    type: 'transaction',
    category: 'orders',
    data: { action: 'order_created', userId, packageName, amount, currency },
  });
}

/**
 * Send notification when an order status changes
 */
export async function notifyOrderStatus(userId: string, packageName: string, status: string): Promise<void> {
  const statusMap: Record<string, string> = {
    completed: 'تم إكمال',
    cancelled: 'تم إلغاء',
    refunded: 'تم استرداد',
  };
  await sendNotificationToUser(userId, {
    title: `تحديث الطلب`,
    body: `${statusMap[status] || status} طلب ${packageName}`,
    type: 'transaction',
    navigationTarget: 'order',
    data: { action: 'order_status', packageName, status },
  });
}

/**
 * Send notification for money transfer
 */
export async function notifyTransfer(fromName: string, toUserId: string, amount: number, currency: string): Promise<void> {
  await sendNotificationToUser(toUserId, {
    title: 'تحويل وارد',
    body: `استلمت ${amount} ${currency} من ${fromName}`,
    type: 'transaction',
    navigationTarget: 'transaction',
    data: { action: 'transfer_received', amount, currency },
  });
}

/**
 * Send notification for money request
 */
export async function notifyMoneyRequest(fromName: string, fromUserId: string, toUserId: string, amount: number, currency: string): Promise<void> {
  await sendNotificationToUser(toUserId, {
    title: 'طلب تحويل',
    body: `${fromName} يطلب منك ${amount} ${currency}`,
    type: 'transaction',
    data: { action: 'money_request', fromUserId, amount, currency },
  });
}

/**
 * Send notification for gift code redemption
 */
export async function notifyGiftCodeRedeemed(userId: string, amount: number, currency: string, code: string): Promise<void> {
  await sendNotificationToUser(userId, {
    title: 'تم استرداد كود الهدية',
    body: `تم إضافة ${amount} ${currency} إلى رصيدك من كود الهدية ${code.substring(0, 4)}****`,
    type: 'transaction',
    navigationTarget: 'promo',
    data: { action: 'gift_code_redeemed', amount, currency },
  });
}

/**
 * Send notification for KYC status change
 */
export async function notifyKycStatus(userId: string, status: string): Promise<void> {
  const statusMessages: Record<string, { title: string; body: string }> = {
    verified: { title: 'تم توثيق حسابك', body: 'تهانينا! تم توثيق حسابك بنجاح. يمكنك الآن استخدام جميع مميزات التطبيق.' },
    rejected: { title: 'تم رفض التوثيق', body: 'تم رفض طلب توثيق حسابك. يرجى إعادة التقديم مع بيانات صحيحة.' },
    submitted: { title: 'تم تقديم طلب التوثيق', body: 'تم تقديم طلب التوثيق بنجاح. سيتم مراجعته قريباً.' },
  };
  const msg = statusMessages[status];
  if (!msg) return;

  await sendNotificationToUser(userId, {
    title: msg.title,
    body: msg.body,
    type: 'security',
    navigationTarget: 'kyc',
    data: { action: 'kyc_status', status },
  });
}

/**
 * Send notification for withdraw request
 */
export async function notifyWithdrawRequest(userId: string, userName: string, amount: number, currency: string): Promise<void> {
  await sendNotificationToUser(userId, {
    title: 'طلب سحب جديد',
    body: `تم استلام طلب سحبك بمبلغ ${amount} ${currency}. سيتم مراجعته قريباً.`,
    type: 'transaction',
    navigationTarget: 'withdraw',
    data: { action: 'withdraw_request', amount, currency },
  });

  await sendNotificationToAdmin({
    title: 'طلب سحب جديد',
    body: `طلب سحب جديد من ${userName} بمبلغ ${amount} ${currency}`,
    type: 'transaction',
    category: 'withdrawals',
    data: { action: 'withdraw_request', userId, amount, currency },
  });
}

/**
 * Send notification when account is blocked/unblocked
 */
export async function notifyAccountStatus(userId: string, isBlocked: boolean): Promise<void> {
  await sendNotificationToUser(userId, {
    title: isBlocked ? 'تم حظر حسابك' : 'تم إلغاء حظر حسابك',
    body: isBlocked
      ? 'تم حظر حسابك. يرجى التواصل مع الدعم للمزيد من المعلومات.'
      : 'تم إلغاء حظر حسابك. يمكنك الآن استخدام التطبيق بشكل طبيعي.',
    type: 'security',
    navigationTarget: isBlocked ? 'support' : 'profile',
    data: { action: 'account_status', isBlocked },
  });
}

/**
 * Send notification when a withdraw is approved/rejected
 */
export async function notifyWithdrawStatus(userId: string, amount: number, currency: string, status: 'approved' | 'rejected'): Promise<void> {
  const statusText = status === 'approved' ? 'تم قبول' : 'تم رفض';
  await sendNotificationToUser(userId, {
    title: `${statusText} طلب السحب`,
    body: `${statusText} طلب سحبك بمبلغ ${amount} ${currency}`,
    type: 'transaction',
    navigationTarget: 'withdraw',
    data: { action: 'withdraw_status', amount, currency, status },
  });
}

/**
 * Send notification to admin when a user creates a support ticket.
 * This was missing — admin had no push notification when users opened tickets.
 */
export async function notifySupportTicketCreated(
  userId: string,
  userName: string,
  ticketId: string,
  subject: string,
  category: string,
): Promise<void> {
  await sendNotificationToAdmin({
    title: 'تذكرة دعم فني جديدة',
    body: `${userName}: ${subject} (${category})`,
    type: 'support',
    category: 'support',
    navigationTarget: 'support_tickets',
    navigationParams: { ticketId },
    data: { action: 'support_ticket_created', userId, ticketId, subject, category },
  });
}

/**
 * Send notification to admin when a user sends a new message on an existing ticket.
 */
export async function notifySupportTicketReply(
  userId: string,
  userName: string,
  ticketId: string,
  messagePreview: string,
): Promise<void> {
  await sendNotificationToAdmin({
    title: 'رد جديد على تذكرة دعم',
    body: `${userName}: ${messagePreview.slice(0, 80)}${messagePreview.length > 80 ? '…' : ''}`,
    type: 'support',
    category: 'support',
    navigationTarget: 'support_tickets',
    navigationParams: { ticketId },
    data: { action: 'support_ticket_reply', userId, ticketId },
  });
}
