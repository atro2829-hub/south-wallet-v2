/**
 * Notifications Service - محفظة الجنوب
 * Uses Supabase for in-app notification storage
 * Uses Firebase FCM for push notifications (kept as-is)
 */

import { supabase } from './supabase';
import { sendFCMDirect } from '@/lib/fcm-sender';

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'info' | 'transaction' | 'security' | 'promo';
  isRead?: boolean;
  data?: Record<string, any>;
}

/**
 * Send FCM push notification directly to FCM tokens using the FCM HTTP v1 API.
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
 * Get FCM token for a user from Supabase
 */
async function getUserFCMToken(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data.fcm_token || null;
  } catch {
    return null;
  }
}

/**
 * Get FCM tokens for all users from Supabase
 */
async function getAllUserFCMTokens(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('fcm_token')
      .not('fcm_token', 'is', null);

    if (error || !data) return [];
    return data.map((u: any) => u.fcm_token).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Send a notification to a specific user (in-app + FCM push)
 */
export async function sendNotificationToUser(userId: string, notification: NotificationPayload): Promise<void> {
  // 1. Save to Supabase (in-app notification)
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      is_read: false,
      data: notification.data || null,
    });

  if (error) {
    console.error('Error saving notification to Supabase:', error);
  }

  // 2. Send FCM push notification (works when app is closed)
  const fcmToken = await getUserFCMToken(userId);
  if (fcmToken) {
    await sendFCMPush([fcmToken], notification.title, notification.body, notification.type, notification.data);
  }
}

/**
 * Send a notification to all users (in-app + FCM push)
 */
export async function sendNotificationToAll(notification: NotificationPayload): Promise<void> {
  // 1. Get all users from Supabase
  const { data: users, error } = await supabase
    .from('users')
    .select('id, fcm_token')
    .eq('is_active', true);

  if (error || !users || users.length === 0) return;

  // 2. Save in-app notification for each user via Supabase
  const notifInserts = users.map((user: any) => ({
    user_id: user.id,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    is_read: false,
    data: notification.data || null,
  }));

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifInserts);

  if (insertError) {
    console.error('Error saving notifications to Supabase:', insertError);
  }

  // 3. Send FCM push notifications
  const tokens = users.map((u: any) => u.fcm_token).filter(Boolean);
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    await sendFCMPush(batch, notification.title, notification.body, notification.type, notification.data);
  }
}

/**
 * Get FCM tokens for all admin users (role = admin or owner) from Supabase
 */
async function getAdminFCMTokens(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('fcm_token')
      .in('role', ['admin', 'owner'])
      .not('fcm_token', 'is', null);

    if (error || !data) return [];
    return data.map((u: any) => u.fcm_token).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Send a notification to admin (for admin/owner app) — in-app + FCM push
 */
export async function sendNotificationToAdmin(notification: NotificationPayload & { category?: string }): Promise<void> {
  // 1. Save to Supabase admin_notifications or app_config for admin panel
  // Use the notifications table with a special admin user or app_config
  const { error } = await supabase
    .from('app_config')
    .upsert({
      key: `admin_notif_${Date.now()}`,
      value: {
        title: notification.title,
        body: notification.body,
        type: notification.type,
        category: notification.category || 'general',
        is_read: false,
        created_at: new Date().toISOString(),
        data: notification.data || null,
      },
      description: 'Admin notification',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) {
    console.error('Error saving admin notification:', error);
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
 * Send notification when a deposit is approved/rejected
 */
export async function notifyDepositStatus(userId: string, amount: number, currency: string, status: 'approved' | 'rejected'): Promise<void> {
  const statusText = status === 'approved' ? 'تم قبول' : 'تم رفض';
  await sendNotificationToUser(userId, {
    title: `${statusText} طلب الإيداع`,
    body: `${statusText} طلب إيداعك بمبلغ ${amount} ${currency}`,
    type: 'transaction',
    data: { action: 'deposit_status', amount, currency, status },
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
    data: { action: 'order_status', packageName, status },
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
    data: { action: 'withdraw_status', amount, currency, status },
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
    data: { action: 'kyc_status', status },
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
    data: { action: 'account_status', isBlocked },
  });
}

/**
 * Send notification for money transfer (used when admin sends push from panel)
 */
export async function notifyTransfer(fromName: string, toUserId: string, amount: number, currency: string): Promise<void> {
  await sendNotificationToUser(toUserId, {
    title: 'تحويل وارد',
    body: `استلمت ${amount} ${currency} من ${fromName}`,
    type: 'transaction',
    data: { action: 'transfer_received', amount, currency },
  });
}

/**
 * Send notification when a deposit request is created
 */
export async function notifyDepositRequest(userId: string, userName: string, amount: number, currency: string): Promise<void> {
  await sendNotificationToUser(userId, {
    title: 'طلب إيداع جديد',
    body: `تم استلام طلب إيداعك بمبلغ ${amount} ${currency}. سيتم مراجعته قريباً.`,
    type: 'transaction',
    data: { action: 'deposit_request', amount, currency },
  });

  await sendNotificationToAdmin({
    title: 'طلب إيداع جديد',
    body: `طلب إيداع جديد من ${userName} بمبلغ ${amount} ${currency}`,
    type: 'transaction',
    category: 'deposits',
    data: { action: 'deposit_request', userId, amount, currency },
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
 * Send notification when a withdraw request is created
 */
export async function notifyWithdrawRequest(userId: string, userName: string, amount: number, currency: string): Promise<void> {
  await sendNotificationToUser(userId, {
    title: 'طلب سحب جديد',
    body: `تم استلام طلب سحبك بمبلغ ${amount} ${currency}. سيتم مراجعته قريباً.`,
    type: 'transaction',
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
