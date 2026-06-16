/**
 * Email Notifications System for محفظة الجنوب
 * Saves email queue to Firebase at emailQueue/{autoId}
 * Simulates Firebase Function triggers for email delivery
 */

import { ref, push, set, get, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { currencySymbols } from '@/lib/utils';

// Email template types
export type EmailTemplateType =
  | 'deposit_approved'
  | 'withdraw_processed'
  | 'transfer_received'
  | 'order_completed'
  | 'kyc_verified'
  | 'security_alert';

export interface EmailQueueEntry {
  id?: string;
  to: string;
  userName: string;
  subject: string;
  body: string;
  templateType: EmailTemplateType;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export interface EmailNotificationPreferences {
  depositApproved: boolean;
  withdrawProcessed: boolean;
  transferReceived: boolean;
  orderCompleted: boolean;
  kycVerified: boolean;
  securityAlert: boolean;
}

export const defaultEmailPreferences: EmailNotificationPreferences = {
  depositApproved: true,
  withdrawProcessed: true,
  transferReceived: true,
  orderCompleted: true,
  kycVerified: true,
  securityAlert: true,
};

// Arabic labels for email types
export const emailTypeLabels: Record<EmailTemplateType, string> = {
  deposit_approved: 'إيداع مقبول',
  withdraw_processed: 'سحب معالج',
  transfer_received: 'تحويل مستلم',
  order_completed: 'طلب مكتمل',
  kyc_verified: 'توثيق الحساب',
  security_alert: 'تنبيه أمني',
};

// Email template generator
function generateEmailTemplate(
  type: EmailTemplateType,
  data: Record<string, any>
): { subject: string; body: string } {
  const templates: Record<EmailTemplateType, (d: Record<string, any>) => { subject: string; body: string }> = {
    deposit_approved: (d) => ({
      subject: 'تم قبول إيداعك - محفظة الجنوب',
      body: `
مرحباً ${d.userName}،

تم قبول طلب الإيداع الخاص بك بنجاح.

تفاصيل الإيداع:
- المبلغ: ${d.amount?.toLocaleString() || '0'} ${currencySymbols[d.currency || 'YER']}
- طريقة الدفع: ${d.method || '-'}
- تاريخ القبول: ${new Date().toLocaleDateString('ar-SA')}

تم إضافة المبلغ إلى رصيدك في المحفظة.

مع تحيات،
فريق محفظة الجنوب
      `.trim(),
    }),

    withdraw_processed: (d) => ({
      subject: 'تم معالجة سحبك - محفظة الجنوب',
      body: `
مرحباً ${d.userName}،

تم معالجة طلب السحب الخاص بك بنجاح.

تفاصيل السحب:
- المبلغ: ${d.amount?.toLocaleString() || '0'} ${currencySymbols[d.currency || 'YER']}
- طريقة السحب: ${d.method || '-'}
- تاريخ المعالجة: ${new Date().toLocaleDateString('ar-SA')}

سيتم تحويل المبلغ إلى حسابك البنكي خلال 24-48 ساعة عمل.

مع تحيات،
فريق محفظة الجنوب
      `.trim(),
    }),

    transfer_received: (d) => ({
      subject: 'لقد استلمت تحويلاً - محفظة الجنوب',
      body: `
مرحباً ${d.userName}،

لقد استلمت تحويلاً في محفظتك.

تفاصيل التحويل:
- المبلغ: ${d.amount?.toLocaleString() || '0'} ${currencySymbols[d.currency || 'YER']}
- المرسل: ${d.senderName || '-'}
- تاريخ الاستلام: ${new Date().toLocaleDateString('ar-SA')}

تم إضافة المبلغ إلى رصيدك فوراً.

مع تحيات،
فريق محفظة الجنوب
      `.trim(),
    }),

    order_completed: (d) => ({
      subject: 'تم تنفيذ طلبك - محفظة الجنوب',
      body: `
مرحباً ${d.userName}،

تم تنفيذ طلبك بنجاح!

تفاصيل الطلب:
- الخدمة: ${d.packageName || '-'}
- المزود: ${d.providerName || '-'}
- المبلغ: ${d.amount?.toLocaleString() || '0'} ${currencySymbols[d.currency || 'YER']}
- رقم المرجع: ${d.orderId || '-'}
- تاريخ التنفيذ: ${new Date().toLocaleDateString('ar-SA')}

شكراً لاستخدامك محفظة الجنوب!

مع تحيات،
فريق محفظة الجنوب
      `.trim(),
    }),

    kyc_verified: (d) => ({
      subject: 'تم توثيق حسابك - محفظة الجنوب',
      body: `
مرحباً ${d.userName}،

تهانينا! تم توثيق حسابك بنجاح.

يمكنك الآن الاستفادة من جميع خدمات المحفظة:
- حدود تحويل أعلى
- سحب الأموال
- الوصول لجميع الخدمات

تاريخ التوثيق: ${new Date().toLocaleDateString('ar-SA')}

مع تحيات،
فريق محفظة الجنوب
      `.trim(),
    }),

    security_alert: (d) => ({
      subject: '⚠️ تنبيه أمني - محفظة الجنوب',
      body: `
مرحباً ${d.userName}،

تم رصد نشاط أمني في حسابك.

تفاصيل التنبيه:
- النوع: ${d.alertType || 'نشاط مشبوه'}
- الوقت: ${new Date().toLocaleString('ar-SA')}
- ${d.details || 'إذا لم تكن أنت من قام بهذا النشاط، يرجى تغيير كلمة المرور فوراً.'}

إذا كنت أنت من قام بهذا النشاط، يمكنك تجاهل هذا التنبيه.

مع تحيات،
فريق محفظة الجنوب
      `.trim(),
    }),
  };

  return templates[type](data);
}

/**
 * Queue an email for sending (saves to Firebase)
 */
export async function queueEmail(
  to: string,
  userName: string,
  templateType: EmailTemplateType,
  templateData: Record<string, any>
): Promise<string | null> {
  try {
    const { subject, body } = generateEmailTemplate(templateType, templateData);
    const entry: Omit<EmailQueueEntry, 'id'> = {
      to,
      userName,
      subject,
      body,
      templateType,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };

    const emailRef = ref(database, 'emailQueue');
    const newRef = push(emailRef);
    await set(newRef, { ...entry, id: newRef.key });
    return newRef.key;
  } catch (error) {
    console.error('Failed to queue email:', error);
    return null;
  }
}

/**
 * Fetch all email queue entries from Firebase
 */
export async function fetchEmailQueue(): Promise<EmailQueueEntry[]> {
  try {
    const emailRef = ref(database, 'emailQueue');
    const snapshot = await get(emailRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const entries: EmailQueueEntry[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        to: val.to || '',
        userName: val.userName || '',
        subject: val.subject || '',
        body: val.body || '',
        templateType: val.templateType || 'security_alert',
        status: val.status || 'queued',
        createdAt: val.createdAt || '',
        sentAt: val.sentAt,
        error: val.error,
      }));
      return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch email queue:', error);
    return [];
  }
}

/**
 * Mark an email as sent in the queue
 */
export async function markEmailSent(emailId: string): Promise<void> {
  try {
    await update(ref(database, `emailQueue/${emailId}`), {
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to mark email as sent:', error);
  }
}

/**
 * Mark an email as failed in the queue
 */
export async function markEmailFailed(emailId: string, error: string): Promise<void> {
  try {
    await update(ref(database, `emailQueue/${emailId}`), {
      status: 'failed',
      error,
    });
  } catch (err) {
    console.error('Failed to mark email as failed:', err);
  }
}

/**
 * Delete an email from the queue
 */
export async function deleteEmailFromQueue(emailId: string): Promise<void> {
  try {
    await remove(ref(database, `emailQueue/${emailId}`));
  } catch (error) {
    console.error('Failed to delete email from queue:', error);
  }
}

/**
 * Get email notification preferences for a user
 */
export async function getEmailPreferences(userId: string): Promise<EmailNotificationPreferences> {
  try {
    const prefRef = ref(database, `emailPreferences/${userId}`);
    const snapshot = await get(prefRef);
    if (snapshot.exists()) {
      return { ...defaultEmailPreferences, ...snapshot.val() };
    }
    return defaultEmailPreferences;
  } catch (error) {
    console.error('Failed to get email preferences:', error);
    return defaultEmailPreferences;
  }
}

/**
 * Save email notification preferences for a user
 */
export async function saveEmailPreferences(userId: string, prefs: EmailNotificationPreferences): Promise<void> {
  try {
    await set(ref(database, `emailPreferences/${userId}`), prefs);
  } catch (error) {
    console.error('Failed to save email preferences:', error);
  }
}
