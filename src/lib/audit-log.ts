/**
 * Audit Log System for محفظة الجنوب
 * Stores audit events in Firebase at auditLog/{autoId}
 */

import { ref, push, set, get, query, orderByChild, limitToLast, startAt, endAt } from 'firebase/database';
import { database } from '@/lib/firebase';

// Predefined action types
export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  BALANCE_ADJUST = 'BALANCE_ADJUST',
  ORDER_APPROVE = 'ORDER_APPROVE',
  ORDER_REJECT = 'ORDER_REJECT',
  DEPOSIT_APPROVE = 'DEPOSIT_APPROVE',
  WITHDRAW_APPROVE = 'WITHDRAW_APPROVE',
  KYC_APPROVE = 'KYC_APPROVE',
  RATE_CHANGE = 'RATE_CHANGE',
  BANNER_CHANGE = 'BANNER_CHANGE',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
  USER_BLOCK = 'USER_BLOCK',
  USER_UNBLOCK = 'USER_UNBLOCK',
  PRODUCT_ADD = 'PRODUCT_ADD',
  PRODUCT_TOGGLE = 'PRODUCT_TOGGLE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
  PROVIDER_ADD = 'PROVIDER_ADD',
  PROVIDER_TOGGLE = 'PROVIDER_TOGGLE',
  PROVIDER_DELETE = 'PROVIDER_DELETE',
  PROMO_TOGGLE = 'PROMO_TOGGLE',
  BANK_UPDATE = 'BANK_UPDATE',
  BULK_NOTIF = 'BULK_NOTIF',
  ROLE_CHANGE = 'ROLE_CHANGE',
}

export interface AuditLogEntry {
  id?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

// Arabic labels for action types
export const auditActionLabels: Record<string, string> = {
  [AuditAction.USER_LOGIN]: 'تسجيل دخول',
  [AuditAction.USER_LOGOUT]: 'تسجيل خروج',
  [AuditAction.BALANCE_ADJUST]: 'تعديل رصيد',
  [AuditAction.ORDER_APPROVE]: 'موافقة على طلب',
  [AuditAction.ORDER_REJECT]: 'رفض طلب',
  [AuditAction.DEPOSIT_APPROVE]: 'موافقة على إيداع',
  [AuditAction.WITHDRAW_APPROVE]: 'موافقة على سحب',
  [AuditAction.KYC_APPROVE]: 'موافقة تحقق',
  [AuditAction.RATE_CHANGE]: 'تغيير أسعار الصرف',
  [AuditAction.BANNER_CHANGE]: 'تغيير البانرات',
  [AuditAction.SETTINGS_CHANGE]: 'تغيير الإعدادات',
  [AuditAction.USER_BLOCK]: 'حظر مستخدم',
  [AuditAction.USER_UNBLOCK]: 'إلغاء حظر مستخدم',
  [AuditAction.PRODUCT_ADD]: 'إضافة منتج',
  [AuditAction.PRODUCT_TOGGLE]: 'تفعيل/تعطيل منتج',
  [AuditAction.PRODUCT_DELETE]: 'حذف منتج',
  [AuditAction.PROVIDER_ADD]: 'إضافة مزود',
  [AuditAction.PROVIDER_TOGGLE]: 'تفعيل/تعطيل مزود',
  [AuditAction.PROVIDER_DELETE]: 'حذف مزود',
  [AuditAction.PROMO_TOGGLE]: 'تفعيل/تعطيل كود ترويجي',
  [AuditAction.BANK_UPDATE]: 'تحديث بنك',
  [AuditAction.BULK_NOTIF]: 'إشعار جماعي',
  [AuditAction.ROLE_CHANGE]: 'تغيير دور',
};

// Action type colors for visual display
export const auditActionColors: Record<string, string> = {
  [AuditAction.USER_LOGIN]: '#10B981',
  [AuditAction.USER_LOGOUT]: '#6B7280',
  [AuditAction.BALANCE_ADJUST]: '#F59E0B',
  [AuditAction.ORDER_APPROVE]: '#10B981',
  [AuditAction.ORDER_REJECT]: '#5C1A1B',
  [AuditAction.DEPOSIT_APPROVE]: '#10B981',
  [AuditAction.WITHDRAW_APPROVE]: '#3B82F6',
  [AuditAction.KYC_APPROVE]: '#8B5CF6',
  [AuditAction.RATE_CHANGE]: '#F59E0B',
  [AuditAction.BANNER_CHANGE]: '#EC4899',
  [AuditAction.SETTINGS_CHANGE]: '#6B7280',
  [AuditAction.USER_BLOCK]: '#5C1A1B',
  [AuditAction.USER_UNBLOCK]: '#10B981',
  [AuditAction.PRODUCT_ADD]: '#10B981',
  [AuditAction.PRODUCT_TOGGLE]: '#F59E0B',
  [AuditAction.PRODUCT_DELETE]: '#5C1A1B',
  [AuditAction.PROVIDER_ADD]: '#10B981',
  [AuditAction.PROVIDER_TOGGLE]: '#F59E0B',
  [AuditAction.PROVIDER_DELETE]: '#5C1A1B',
  [AuditAction.PROMO_TOGGLE]: '#F59E0B',
  [AuditAction.BANK_UPDATE]: '#3B82F6',
  [AuditAction.BULK_NOTIF]: '#8B5CF6',
  [AuditAction.ROLE_CHANGE]: '#5C1A1B',
};

/**
 * Log an audit event to Firebase
 */
export async function logAuditEvent(
  userId: string,
  action: string,
  details: string,
  userName?: string,
  ipAddress?: string
): Promise<void> {
  const entry: AuditLogEntry = {
    userId,
    userName: userName || '',
    action,
    details,
    timestamp: new Date().toISOString(),
    ipAddress: ipAddress || undefined,
  };

  try {
    const auditRef = ref(database, 'auditLog');
    await push(auditRef, entry);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Fetch audit log entries from Firebase
 */
export async function fetchAuditLog(limit: number = 100): Promise<AuditLogEntry[]> {
  try {
    const auditRef = ref(database, 'auditLog');
    const snapshot = await get(auditRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const entries: AuditLogEntry[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        userId: val.userId || '',
        userName: val.userName || '',
        action: val.action || '',
        details: val.details || '',
        timestamp: val.timestamp || '',
        ipAddress: val.ipAddress,
      }));
      return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    return [];
  }
}

/**
 * Fetch audit log entries filtered by action type
 */
export async function fetchAuditLogByAction(action: string, limit: number = 50): Promise<AuditLogEntry[]> {
  const all = await fetchAuditLog(limit * 3);
  return all.filter(entry => entry.action === action).slice(0, limit);
}

/**
 * Fetch audit log entries filtered by user
 */
export async function fetchAuditLogByUser(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
  const all = await fetchAuditLog(limit * 3);
  return all.filter(entry => entry.userId === userId).slice(0, limit);
}

/**
 * Fetch audit log entries within a date range
 */
export async function fetchAuditLogByDateRange(startDate: string, endDate: string, limit: number = 100): Promise<AuditLogEntry[]> {
  const all = await fetchAuditLog(limit * 3);
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return all.filter(entry => {
    const t = new Date(entry.timestamp).getTime();
    return t >= start && t <= end;
  }).slice(0, limit);
}
