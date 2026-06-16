'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Copy,
  Check,
  Stamp,
  Receipt,
  Calendar,
  Hash,
  User,
  Phone,
  CreditCard,
  Share2,
  Download,
  Printer,
  QrCode,
  ArrowLeftRight,
  Gift,
  Tag,
  Percent,
  RefreshCw,
  TrendingUp,
  Banknote,
  ShoppingCart,
  Zap,
  FileText,
  CircleDollarSign,
  CircleDot,
  CircleCheck,
  CircleX,
  Loader2,
} from 'lucide-react';
import { useAppStore, type Transaction } from '@/lib/store';
import { formatNumber, currencySymbols, currencyNames, defaultExchangeRates, generateReference } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TransactionReceiptProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  exchangeRates?: { YER: number; SAR: number; USD: number };
}

// ─── Config Maps ─────────────────────────────────────────────────────────────

const typeLabels: Record<string, string> = {
  transfer: 'تحويل',
  deposit: 'إيداع',
  withdraw: 'سحب',
  order: 'طلب خدمة',
  recharge: 'شحن',
  payment: 'دفع',
  purchase: 'شراء',
  bill: 'فاتورة',
  exchange: 'تبديل عملة',
  gift: 'هدية',
  promo: 'كود ترويجي',
  commission: 'عمولة',
  refund: 'استرداد',
  investment: 'استثمار',
};

const typeIcons: Record<string, typeof ArrowDownLeft> = {
  transfer: ArrowLeftRight,
  deposit: ArrowDownLeft,
  withdraw: ArrowUpRight,
  order: ShoppingCart,
  recharge: Zap,
  payment: CreditCard,
  purchase: ShoppingCart,
  bill: FileText,
  exchange: CircleDollarSign,
  gift: Gift,
  promo: Tag,
  commission: Percent,
  refund: RefreshCw,
  investment: TrendingUp,
};

const typeColors: Record<string, string> = {
  transfer: '#C41E3A',
  deposit: '#10B981',
  withdraw: '#F59E0B',
  order: '#14B8A6',
  recharge: '#8B5CF6',
  payment: '#3B82F6',
  purchase: '#F97316',
  bill: '#EC4899',
  exchange: '#06B6D4',
  gift: '#E879F9',
  promo: '#A78BFA',
  commission: '#34D399',
  refund: '#6366F1',
  investment: '#22D3EE',
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  completed: { label: 'مكتمل', color: '#10B981', bgColor: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)', icon: Clock },
  failed: { label: 'فشل', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)', icon: XCircle },
  refunded: { label: 'مسترد', color: '#6366F1', bgColor: 'rgba(99,102,241,0.12)', icon: RefreshCw },
};

// Timeline steps for status progression
const timelineSteps = [
  { key: 'pending', label: 'تم الإنشاء', icon: CircleDot },
  { key: 'processing', label: 'قيد المعالجة', icon: Loader2 },
  { key: 'completed', label: 'مكتمل', icon: CircleCheck },
  { key: 'failed', label: 'فشل', icon: CircleX },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateArabic(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  } catch {
    return dateStr;
  }
}

function formatTimeArabic(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: { YER: number; SAR: number; USD: number }
): number {
  if (fromCurrency === toCurrency) return amount;
  // Convert to YER first, then to target
  const inYER = fromCurrency === 'YER' ? amount : amount * rates[fromCurrency as keyof typeof rates];
  if (toCurrency === 'YER') return inYER;
  return inYER / rates[toCurrency as keyof typeof rates];
}

function generateTxReference(tx: Transaction): string {
  if (tx.id) {
    return `JN-${tx.id.substring(0, 8).toUpperCase()}`;
  }
  return generateReference();
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  dir,
  isDark,
  copyable = false,
  onCopy,
  copied,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  dir?: 'rtl' | 'ltr';
  isDark: boolean;
  copyable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  const labelColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(92,26,27,0.55)';
  const valueColor = isDark ? 'rgba(255,255,255,0.85)' : '#1A0A0E';
  const iconColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(92,26,27,0.4)';

  return (
    <motion.div
      className="flex items-center justify-between py-2"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} color={iconColor} strokeWidth={1.8} />
        <span className="text-[11px] font-medium" style={{ color: labelColor }}>{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="text-[11px] font-semibold max-w-[180px] truncate"
          style={{ color: valueColor }}
          dir={dir || 'rtl'}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={onCopy}
            className="p-1 rounded-md transition-colors"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(92,26,27,0.06)',
            }}
          >
            {copied ? (
              <Check size={10} color="#10B981" />
            ) : (
              <Copy size={10} color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(92,26,27,0.4)'} />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function StatusTimeline({ status, isDark }: { status: string; isDark: boolean }) {
  const getStepState = (stepKey: string, currentStatus: string): 'completed' | 'current' | 'pending' => {
    const statusOrder: Record<string, number> = {
      pending: 0,
      processing: 1,
      completed: 2,
      failed: 2,
      refunded: 3,
    };
    const currentIdx = statusOrder[currentStatus] ?? 0;
    const stepIdx = statusOrder[stepKey] ?? 0;

    if (currentStatus === 'failed' && stepKey === 'failed') return 'current';
    if (currentStatus === 'failed' && stepKey === 'completed') return 'pending';

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  // Determine which steps to show based on status
  const visibleSteps = status === 'failed'
    ? timelineSteps.filter(s => s.key === 'pending' || s.key === 'processing' || s.key === 'failed')
    : status === 'refunded'
      ? timelineSteps.filter(s => s.key === 'pending' || s.key === 'processing' || s.key === 'completed')
      : timelineSteps.filter(s => s.key !== 'failed');

  return (
    <div className="flex items-center justify-center gap-0 w-full px-2">
      {visibleSteps.map((step, idx) => {
        const state = getStepState(step.key, status);
        const StepIcon = step.icon;

        const dotColor = state === 'completed'
          ? '#10B981'
          : state === 'current'
            ? (status === 'failed' ? '#EF4444' : '#C41E3A')
            : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(92,26,27,0.15)');

        const lineColor = state === 'completed'
          ? '#10B981'
          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(92,26,27,0.08)';

        const labelColor = state === 'completed'
          ? '#10B981'
          : state === 'current'
            ? (status === 'failed' ? '#EF4444' : '#C41E3A')
            : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(92,26,27,0.3)');

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: state === 'completed'
                    ? 'rgba(16,185,129,0.15)'
                    : state === 'current'
                      ? (status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(196,30,58,0.15)')
                      : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(92,26,27,0.04)'),
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.3 }}
              >
                <StepIcon
                  size={14}
                  color={dotColor}
                  strokeWidth={2}
                  className={state === 'current' && step.key === 'processing' ? 'animate-spin' : ''}
                />
              </motion.div>
              <span className="text-[8px] font-bold whitespace-nowrap" style={{ color: labelColor }}>
                {step.label}
              </span>
            </div>
            {idx < visibleSteps.length - 1 && (
              <div
                className="flex-1 h-[2px] mb-4 mx-1 rounded-full"
                style={{ background: lineColor }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CurrencyConverter({
  amount,
  currency,
  rates,
  isDark,
}: {
  amount: number;
  currency: string;
  rates: { YER: number; SAR: number; USD: number };
  isDark: boolean;
}) {
  const currencies: Array<'YER' | 'SAR' | 'USD'> = ['YER', 'SAR', 'USD'];

  return (
    <div className="space-y-1.5">
      {currencies.map(c => {
        const converted = Math.round(convertAmount(amount, currency, c, rates));
        const isOriginal = c === currency;
        const bgColor = isDark
          ? (isOriginal ? 'rgba(196,30,58,0.12)' : 'rgba(255,255,255,0.03)')
          : (isOriginal ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.03)');
        const borderColor = isOriginal
          ? (isDark ? 'rgba(196,30,58,0.25)' : 'rgba(92,26,27,0.15)')
          : 'transparent';
        const valueColor = isOriginal
          ? '#C41E3A'
          : (isDark ? 'rgba(255,255,255,0.65)' : 'rgba(26,10,14,0.65)');

        return (
          <div
            key={c}
            className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ background: bgColor, border: `1px solid ${borderColor}` }}
          >
            <span
              className="text-[10px] font-bold"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(92,26,27,0.45)' }}
            >
              {currencyNames[c]}
            </span>
            <span className="text-[12px] font-bold" style={{ color: valueColor }} dir="ltr">
              {formatNumber(converted)} {currencySymbols[c]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ReceiptDashedDivider({ isDark }: { isDark: boolean }) {
  const bg = isDark ? '#1A0A0E' : '#F5F0F0';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(92,26,27,0.1)';
  return (
    <div className="flex items-center px-0">
      <div className="w-5 h-5 rounded-full" style={{ background: bg, marginLeft: -10 }} />
      <div className="flex-1 border-t border-dashed" style={{ borderColor }} />
      <div className="w-5 h-5 rounded-full" style={{ background: bg, marginRight: -10 }} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TransactionReceipt({
  transaction,
  isOpen,
  onClose,
  exchangeRates,
}: TransactionReceiptProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAppStore();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const rates = exchangeRates || defaultExchangeRates;

  useEffect(() => {
    if (!isOpen) {
      setCopiedId(false);
      setCopiedRef(false);
      setShowQR(false);
    }
  }, [isOpen]);

  const handleCopyId = useCallback(() => {
    if (transaction?.id) {
      navigator.clipboard.writeText(transaction.id).then(() => {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      });
    }
  }, [transaction?.id]);

  const handleCopyRef = useCallback(() => {
    if (transaction) {
      const ref = generateTxReference(transaction);
      navigator.clipboard.writeText(ref).then(() => {
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
      });
    }
  }, [transaction]);

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current || !transaction) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: isDark ? '#1A0A0E' : '#FAFAFA',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `receipt-${generateTxReference(transaction)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [transaction, isDark]);

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return;
    setIsPrinting(true);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }
    const content = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>إيصال المعاملة - محفظة الجنوب</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      setIsPrinting(false);
    }, 500);
  }, []);

  const handleShare = useCallback(async () => {
    if (!transaction) return;
    const ref = generateTxReference(transaction);
    const statusInfo = statusConfig[transaction.status] || statusConfig.pending;
    const typeLabel = typeLabels[transaction.type] || transaction.type;
    const isCredit = transaction.type === 'deposit' || transaction.toUserId === user?.id;

    const shareText = `
إيصال معاملة - محفظة الجنوب
━━━━━━━━━━━━━━━━━━━━
النوع: ${typeLabel}
المبلغ: ${formatNumber(transaction.amount)} ${currencySymbols[transaction.currency]}
الحالة: ${statusInfo.label}
المرجع: ${ref}
التاريخ: ${formatDateArabic(transaction.createdAt)}
الوقت: ${formatTimeArabic(transaction.createdAt)}
━━━━━━━━━━━━━━━━━━━━
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'إيصال معاملة - محفظة الجنوب',
          text: shareText,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  }, [transaction, user]);

  if (!transaction) return null;

  const typeLabel = typeLabels[transaction.type] || transaction.type;
  const TypeIcon = typeIcons[transaction.type] || Wallet;
  const typeColor = typeColors[transaction.type] || '#C41E3A';
  const status = statusConfig[transaction.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isCredit = transaction.type === 'deposit' || transaction.toUserId === user?.id;
  const amount = transaction.amount || 0;
  const currency = transaction.currency || 'YER';
  const txReference = generateTxReference(transaction);

  // Theme colors
  const bgColor = isDark ? '#1A0A0E' : '#FAFAFA';
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(92,26,27,0.08)';
  const sectionBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(92,26,27,0.02)';
  const headerBg = isDark
    ? 'linear-gradient(180deg, #3D0F10 0%, #2A0B0C 100%)'
    : 'linear-gradient(180deg, #5C1A1B 0%, #3D0F10 100%)';
  const accentBg = isDark ? 'rgba(196,30,58,0.12)' : 'rgba(92,26,27,0.08)';
  const stampBorder = isDark ? 'rgba(128,0,32,0.4)' : 'rgba(92,26,27,0.25)';
  const stampColor = isDark ? 'rgba(128,0,32,0.6)' : 'rgba(92,26,27,0.5)';
  const dividerBg = isDark ? '#1A0A0E' : '#F5F0F0';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.55)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Receipt Bottom Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto scrollbar-thin"
            style={{
              background: bgColor,
              borderRadius: '24px 24px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(92,26,27,0.15)' }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} color={isDark ? '#FFF' : '#5C1A1B'} strokeWidth={1.8} />
                <h2
                  className="text-base font-bold"
                  style={{ color: isDark ? '#FFF' : '#1A0A0E' }}
                >
                  إيصال المعاملة
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(92,26,27,0.06)',
                }}
              >
                <X size={16} color={isDark ? '#FFF' : '#5C1A1B'} />
              </button>
            </div>

            {/* Receipt Card - this is the download/print target */}
            <div ref={receiptRef} className="mx-4 mb-4">
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                {/* ── Status + Type Header ── */}
                <div className="p-5 text-center" style={{ background: headerBg }}>
                  <motion.div
                    className="flex justify-center mb-3"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: isCredit ? 'rgba(16,185,129,0.18)' : 'rgba(196,30,58,0.18)',
                      }}
                    >
                      <TypeIcon
                        size={28}
                        color={isCredit ? '#10B981' : '#FF8A8A'}
                        strokeWidth={1.8}
                      />
                    </div>
                  </motion.div>

                  <motion.p
                    className="text-white/50 text-[10px] mb-1 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    {typeLabel}
                  </motion.p>

                  <motion.p
                    className="text-3xl font-bold mb-3"
                    style={{ color: isCredit ? '#6EE7B7' : '#FF8A8A' }}
                    dir="ltr"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {isCredit ? '+' : '-'}{formatNumber(amount)} {currencySymbols[currency]}
                  </motion.p>

                  {/* Status Badge */}
                  <motion.div
                    className="flex justify-center"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <div
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full"
                      style={{ background: 'rgba(0,0,0,0.25)' }}
                    >
                      <StatusIcon size={13} color={status.color} />
                      <span className="text-[11px] font-bold" style={{ color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* ── Status Timeline ── */}
                <div className="px-5 py-4" style={{ background: sectionBg }}>
                  <StatusTimeline status={transaction.status} isDark={isDark} />
                </div>

                {/* ── Dashed Separator ── */}
                <ReceiptDashedDivider isDark={isDark} />

                {/* ── Transaction Details ── */}
                <div className="px-5 py-4 space-y-0.5">
                  {/* Transaction ID */}
                  <DetailRow
                    icon={Hash}
                    label="رقم المعاملة"
                    value={transaction.id ? `${transaction.id.substring(0, 16)}...` : '—'}
                    dir="ltr"
                    isDark={isDark}
                    copyable
                    onCopy={handleCopyId}
                    copied={copiedId}
                  />

                  {/* Reference Number */}
                  <DetailRow
                    icon={QrCode}
                    label="المرجع"
                    value={txReference}
                    dir="ltr"
                    isDark={isDark}
                    copyable
                    onCopy={handleCopyRef}
                    copied={copiedRef}
                  />

                  {/* Type */}
                  <DetailRow
                    icon={Receipt}
                    label="النوع"
                    value={typeLabel}
                    isDark={isDark}
                  />

                  {/* Amount */}
                  <DetailRow
                    icon={Wallet}
                    label="المبلغ"
                    value={`${formatNumber(amount)} ${currencySymbols[currency]}`}
                    dir="ltr"
                    isDark={isDark}
                  />

                  {/* From */}
                  <DetailRow
                    icon={User}
                    label="من"
                    value={transaction.fromUserId === user?.id ? 'أنت' : transaction.fromUserId || '—'}
                    dir="ltr"
                    isDark={isDark}
                  />

                  {/* To */}
                  <DetailRow
                    icon={User}
                    label="إلى"
                    value={transaction.toUserId === user?.id ? 'أنت' : transaction.toUserId || '—'}
                    dir="ltr"
                    isDark={isDark}
                  />

                  {/* Date */}
                  <DetailRow
                    icon={Calendar}
                    label="التاريخ"
                    value={formatDateArabic(transaction.createdAt)}
                    isDark={isDark}
                  />

                  {/* Time */}
                  <DetailRow
                    icon={Clock}
                    label="الوقت"
                    value={formatTimeArabic(transaction.createdAt)}
                    dir="ltr"
                    isDark={isDark}
                  />

                  {/* Description */}
                  {transaction.description && (
                    <DetailRow
                      icon={FileText}
                      label="الوصف"
                      value={transaction.description}
                      isDark={isDark}
                    />
                  )}
                </div>

                {/* ── Dashed Separator ── */}
                <ReceiptDashedDivider isDark={isDark} />

                {/* ── Currency Conversion ── */}
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CircleDollarSign
                      size={13}
                      color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(92,26,27,0.45)'}
                      strokeWidth={1.8}
                    />
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(92,26,27,0.55)' }}
                    >
                      تحويل العملات
                    </span>
                  </div>
                  <CurrencyConverter amount={amount} currency={currency} rates={rates} isDark={isDark} />
                </div>

                {/* ── Dashed Separator ── */}
                <ReceiptDashedDivider isDark={isDark} />

                {/* ── QR Code Section ── */}
                <div className="px-5 py-4">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <QrCode
                        size={13}
                        color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(92,26,27,0.45)'}
                        strokeWidth={1.8}
                      />
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(92,26,27,0.55)' }}
                      >
                        رمز QR للمعاملة
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: showQR ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowUpRight
                        size={13}
                        color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(92,26,27,0.3)'}
                        style={{ transform: 'rotate(90deg)' }}
                      />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showQR && (
                      <motion.div
                        className="flex flex-col items-center mt-4"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div
                          className="p-4 rounded-2xl"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(92,26,27,0.04)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(92,26,27,0.06)'}`,
                          }}
                        >
                          <QRCodeSVG
                            value={JSON.stringify({
                              ref: txReference,
                              id: transaction.id,
                              type: transaction.type,
                              amount: transaction.amount,
                              currency: transaction.currency,
                              status: transaction.status,
                              date: transaction.createdAt,
                              wallet: 'south-wallet',
                            })}
                            size={140}
                            bgColor="transparent"
                            fgColor={isDark ? '#FFFFFF' : '#1A0A0E'}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <p
                          className="text-[9px] mt-2 font-mono"
                          style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(92,26,27,0.3)' }}
                          dir="ltr"
                        >
                          {txReference}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Dashed Separator ── */}
                <ReceiptDashedDivider isDark={isDark} />

                {/* ── Stamp Area ── */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Stamp size={14} color={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(92,26,27,0.12)'} />
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(92,26,27,0.15)' }}
                    >
                      محفظة الجنوب
                    </span>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-md"
                    style={{
                      border: `1.5px solid ${stampBorder}`,
                      color: stampColor,
                      transform: 'rotate(-3deg)',
                    }}
                  >
                    <span className="text-[10px] font-bold">{status.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="px-4 pb-6 pt-1 space-y-2">
              {/* Primary actions row */}
              <div className="flex gap-2">
                <motion.button
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors"
                  style={{
                    background: 'linear-gradient(135deg, #5C1A1B 0%, #C41E3A 100%)',
                    color: '#FFFFFF',
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShare}
                >
                  <Share2 size={16} />
                  <span>مشاركة</span>
                </motion.button>

                <motion.button
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(92,26,27,0.06)',
                    color: isDark ? '#FFFFFF' : '#5C1A1B',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(92,26,27,0.08)'}`,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>{isDownloading ? 'جاري التحميل...' : 'تحميل'}</span>
                </motion.button>
              </div>

              {/* Secondary actions row */}
              <div className="flex gap-2">
                <motion.button
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(92,26,27,0.03)',
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(92,26,27,0.5)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(92,26,27,0.04)'}`,
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handlePrint}
                  disabled={isPrinting}
                >
                  <Printer size={14} />
                  <span>طباعة</span>
                </motion.button>

                <motion.button
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(92,26,27,0.03)',
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(92,26,27,0.5)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(92,26,27,0.04)'}`,
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowQR(!showQR)}
                >
                  <QrCode size={14} />
                  <span>رمز QR</span>
                </motion.button>
              </div>

              {/* Close button */}
              <motion.button
                className="w-full py-3 rounded-xl text-sm font-bold transition-colors"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(92,26,27,0.04)',
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(92,26,27,0.6)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(92,26,27,0.05)'}`,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onClose}
              >
                إغلاق
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
