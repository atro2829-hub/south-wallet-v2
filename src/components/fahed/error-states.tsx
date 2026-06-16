'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiOff,
  ServerCrash,
  ShieldAlert,
  Wallet,
  AlertTriangle,
  CreditCard,
  type LucideIcon,
  RefreshCw,
  ArrowRight,
  X,
} from 'lucide-react';

// ─── Error Type Definitions ────────────────────────────────────────
export interface ErrorTypeConfig {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel: string;
  color: string;
  bgColor: string;
}

export const ERROR_TYPES: Record<string, ErrorTypeConfig> = {
  network: {
    icon: WifiOff,
    title: 'لا يوجد اتصال بالإنترنت',
    message: 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى',
    actionLabel: 'إعادة المحاولة',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
  },
  server: {
    icon: ServerCrash,
    title: 'خطأ في الخادم',
    message: 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً',
    actionLabel: 'إعادة المحاولة',
    color: '#5C1A1B',
    bgColor: 'rgba(92,26,27,0.1)',
  },
  auth: {
    icon: ShieldAlert,
    title: 'فشل المصادقة',
    message: 'لم يتم التحقق من هويتك. سجل دخولك مرة أخرى',
    actionLabel: 'تسجيل الدخول',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.1)',
  },
  balance: {
    icon: Wallet,
    title: 'رصيد غير كافي',
    message: 'رصيدك الحالي لا يكفي لإتمام هذه العملية',
    actionLabel: 'إيداع رصيد',
    color: '#5C1A1B',
    bgColor: 'rgba(92,26,27,0.1)',
  },
  validation: {
    icon: AlertTriangle,
    title: 'بيانات غير صحيحة',
    message: 'يرجى التحقق من البيانات المدخلة والمحاولة مرة أخرى',
    actionLabel: 'تصحيح البيانات',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
  },
  payment: {
    icon: CreditCard,
    title: 'فشل عملية الدفع',
    message: 'لم تتم عملية الدفع بنجاح. جرب طريقة دفع أخرى',
    actionLabel: 'إعادة المحاولة',
    color: '#5C1A1B',
    bgColor: 'rgba(92,26,27,0.1)',
  },
  recipientNotFound: {
    icon: ShieldAlert,
    title: 'المستلم غير موجود',
    message: 'رقم الحساب أو الهاتف غير مسجل في النظام',
    actionLabel: 'تصحيح الرقم',
    color: '#8B5CF6',
    bgColor: 'rgba(139,92,246,0.1)',
  },
  selfTransfer: {
    icon: AlertTriangle,
    title: 'عملية غير مسموحة',
    message: 'لا يمكنك التحويل إلى حسابك الخاص',
    actionLabel: 'تغيير المستلم',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
  },
  invalidPhone: {
    icon: AlertTriangle,
    title: 'رقم هاتف غير صالح',
    message: 'رقم الهاتف الذي أدخلته غير صحيح أو غير مدعوم',
    actionLabel: 'تصحيح الرقم',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
  },
  serviceUnavailable: {
    icon: ServerCrash,
    title: 'الخدمة غير متاحة',
    message: 'هذه الخدمة غير متاحة حالياً. حاول لاحقاً',
    actionLabel: 'رجوع',
    color: '#5C1A1B',
    bgColor: 'rgba(92,26,27,0.1)',
  },
  amountLimit: {
    icon: Wallet,
    title: 'مبلغ غير مسموح',
    message: 'المبلغ الذي أدخلته خارج الحد المسموح للعملية',
    actionLabel: 'تعديل المبلغ',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
  },
  bankDetails: {
    icon: CreditCard,
    title: 'بيانات بنكية غير مكتملة',
    message: 'يرجى إدخال جميع البيانات البنكية المطلوبة',
    actionLabel: 'إكمال البيانات',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.1)',
  },
};

// ─── Full-Page Error Component ─────────────────────────────────────
export interface ErrorStateProps {
  type: string;
  customTitle?: string;
  customMessage?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorState({
  type,
  customTitle,
  customMessage,
  onAction,
  onDismiss,
  className = '',
}: ErrorStateProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const config = ERROR_TYPES[type] || ERROR_TYPES.server;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-6 px-4 ${className}`}
    >
      {/* Icon with pulse ring */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative mb-4"
      >
        <div
          className="absolute inset-0 rounded-full scale-150"
          style={{
            background: `radial-gradient(circle, ${config.color}20 0%, transparent 70%)`,
          }}
        />
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: config.bgColor }}
        >
          <Icon size={28} strokeWidth={1.5} color={config.color} />
        </div>
      </motion.div>

      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-sm font-bold text-center"
        style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
      >
        {customTitle || config.title}
      </motion.p>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[11px] mt-1.5 text-center max-w-[240px] leading-relaxed"
        style={{ color: isDark ? '#888' : '#888' }}
      >
        {customMessage || config.message}
      </motion.p>

      {/* Action Button */}
      {onAction && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
          style={{
            background: config.color,
            boxShadow: `0 4px 12px ${config.color}30`,
          }}
        >
          <RefreshCw size={12} strokeWidth={2} />
          {config.actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── Inline Error Toast (for showing errors within forms) ──────────
export interface ErrorToastProps {
  type: string;
  customMessage?: string;
  onDismiss?: () => void;
  onAction?: () => void;
  visible: boolean;
}

export function ErrorToast({
  type,
  customMessage,
  onDismiss,
  onAction,
  visible,
}: ErrorToastProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const config = ERROR_TYPES[type] || ERROR_TYPES.server;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div
            className="flex items-start gap-3 p-3.5 rounded-xl"
            style={{
              background: config.bgColor,
              border: `1px solid ${config.color}20`,
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${config.color}15` }}
            >
              <Icon size={16} strokeWidth={1.5} color={config.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: config.color }}>
                {config.title}
              </p>
              <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                {customMessage || config.message}
              </p>
              {onAction && (
                <button
                  onClick={onAction}
                  className="text-[10px] font-bold mt-1.5 flex items-center gap-1"
                  style={{ color: config.color }}
                >
                  {config.actionLabel}
                  <ArrowRight size={10} strokeWidth={2} />
                </button>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${config.color}10` }}
              >
                <X size={10} strokeWidth={2} color={config.color} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Helper: Map common error strings to error types ───────────────
export function mapErrorToType(errorMsg: string): string {
  if (!errorMsg) return 'server';
  const lower = errorMsg.toLowerCase();

  if (lower.includes('network') || lower.includes('internet') || lower.includes('offline') || lower.includes('fetch'))
    return 'network';
  if (lower.includes('500') || lower.includes('server') || lower.includes('internal'))
    return 'server';
  if (lower.includes('auth') || lower.includes('token') || lower.includes('unauthorized') || lower.includes('401') || lower.includes('403'))
    return 'auth';
  if (lower.includes('balance') || lower.includes('رصيد غير كافي') || lower.includes('insufficient'))
    return 'balance';
  if (lower.includes('validation') || lower.includes('invalid') || lower.includes('بيانات') || lower.includes('غير صحيح'))
    return 'validation';
  if (lower.includes('payment') || lower.includes('دفع') || lower.includes('pay'))
    return 'payment';
  if (lower.includes('recipient') || lower.includes('غير موجود') || lower.includes('not found') || lower.includes('غير مسجل'))
    return 'recipientNotFound';
  if (lower.includes('self') || lower.includes('نفس الحساب'))
    return 'selfTransfer';
  if (lower.includes('phone') || lower.includes('هاتف') || lower.includes('رقم'))
    return 'invalidPhone';
  if (lower.includes('service') || lower.includes('غير متاح'))
    return 'serviceUnavailable';
  if (lower.includes('limit') || lower.includes('حد') || lower.includes('مبلغ'))
    return 'amountLimit';
  if (lower.includes('bank') || lower.includes('بنك') || lower.includes('حساب'))
    return 'bankDetails';

  return 'server';
}
