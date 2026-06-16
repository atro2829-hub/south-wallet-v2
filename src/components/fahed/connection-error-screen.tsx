'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiOff,
  RefreshCw,
  Clock,
  Wallet,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  getPendingActions,
  removePendingAction,
  clearPendingActions,
  getCachedBalance,
} from '@/lib/use-network-status';
import { useNetworkStatus } from '@/hooks/use-network-status';

// ─── Main Connection Error Screen ───
export default function ConnectionErrorScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isOnline, lastOnline, retry, offlineDuration, retryCount } = useNetworkStatus();
  const { setActiveScreen, user } = useAppStore();

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<'success' | 'failed' | null>(null);
  const [pendingActions, setPendingActions] = useState(getPendingActions());
  const [cachedBalance, setCachedBalance] = useState(getCachedBalance());

  // Auto-retry when connection is restored
  useEffect(() => {
    if (isOnline) {
      // Auto-navigate back after short delay
      const timer = setTimeout(() => {
        setActiveScreen('main');
        // Reset to home tab
        useAppStore.getState().setActiveTab('home');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, setActiveScreen]);

  // Update retry result when online status changes
  useEffect(() => {
    if (isOnline && !retryResult) {
      const timer = setTimeout(() => {
        setRetryResult('success');
        setTimeout(() => setRetryResult(null), 3000);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOnline, retryResult]);

  // Refresh pending actions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingActions(getPendingActions());
      setCachedBalance(getCachedBalance());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Handle retry button
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setRetryResult(null);

    const online = await retry();

    setIsRetrying(false);
    setRetryResult(online ? 'success' : 'failed');

    // Clear result after a few seconds
    setTimeout(() => setRetryResult(null), 3000);
  }, [retry]);

  // Handle clearing pending actions
  const handleClearPending = () => {
    clearPendingActions();
    setPendingActions([]);
  };

  // Format last online time
  const formatLastOnline = () => {
    if (!lastOnline) return 'غير معروف';
    const now = new Date();
    const diffMs = now.getTime() - lastOnline.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'منذ لحظات';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${Math.floor(diffHours / 24)} يوم`;
  };

  // Format offline duration
  const formatOfflineDuration = () => {
    if (!offlineDuration) return '';
    const seconds = Math.floor(offlineDuration / 1000);
    if (seconds < 60) return `${seconds} ثانية`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    return `${hours} ساعة و ${mins % 60} دقيقة`;
  };

  // Colors
  const bgColor = isDark ? '#0A0A0A' : '#F5F5F5';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const textColor = isDark ? '#FFF' : '#1a1a1a';
  const secondaryText = isDark ? '#AAA' : '#666';
  const subtleText = isDark ? '#666' : '#999';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

  // Pending action type labels
  const actionTypeLabels: Record<string, string> = {
    transfer: 'تحويل أموال',
    order: 'طلب خدمة',
    bill: 'سداد فاتورة',
    recharge: 'شحن رصيد',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgColor }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveScreen('main');
              useAppStore.getState().setActiveTab('home');
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronRight size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: textColor }}>
            حالة الاتصال
          </h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-10">
        {/* ─── Animated Illustration ─── */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-8"
        >
          {/* Pulse circles */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(92,26,27,0.08)' }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(92,26,27,0.05)' }}
            animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />

          {/* Main icon circle */}
          <motion.div
            className="relative w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: isDark
                ? 'linear-gradient(145deg, rgba(92,26,27,0.15) 0%, rgba(61,15,16,0.1) 100%)'
                : 'linear-gradient(145deg, rgba(92,26,27,0.1) 0%, rgba(61,15,16,0.06) 100%)',
              border: `2px solid ${isDark ? 'rgba(92,26,27,0.2)' : 'rgba(92,26,27,0.15)'}`,
            }}
            animate={isOnline ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {isOnline ? (
              <CheckCircle2 size={48} strokeWidth={1.2} color="#10B981" />
            ) : (
              <WifiOff size={48} strokeWidth={1.2} color="#5C1A1B" />
            )}
          </motion.div>
        </motion.div>

        {/* ─── Status Text ─── */}
        <AnimatePresence mode="wait">
          {isOnline ? (
            <motion.div
              key="online"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-8"
            >
              <h2 className="text-xl font-bold mb-2" style={{ color: '#10B981' }}>
                تم استعادة الاتصال
              </h2>
              <p className="text-sm" style={{ color: secondaryText }}>
                جاري العودة للتطبيق...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="offline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-8"
            >
              <h2 className="text-xl font-bold mb-2" style={{ color: textColor }}>
                لا يوجد اتصال بالإنترنت
              </h2>
              <p className="text-sm" style={{ color: secondaryText }}>
                تحقق من اتصالك بالشبكة وحاول مرة أخرى
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Retry Button ─── */}
        {!isOnline && (
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl mb-6 active:scale-95 transition-transform disabled:opacity-50"
            style={{
              background: 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)',
              boxShadow: '0 4px 12px rgba(92,26,27,0.3)',
            }}
          >
            <RefreshCw
              size={18}
              strokeWidth={2}
              color="#FFF"
              className={isRetrying ? 'animate-spin' : ''}
            />
            <span className="text-white font-bold text-sm">
              {isRetrying ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة'}
            </span>
          </motion.button>
        )}

        {/* ─── Retry Result Feedback ─── */}
        <AnimatePresence>
          {retryResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 mb-6"
            >
              {retryResult === 'success' ? (
                <>
                  <CheckCircle2 size={16} color="#10B981" />
                  <span className="text-sm font-medium" style={{ color: '#10B981' }}>
                    تم الاتصال بنجاح
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} color="#5C1A1B" />
                  <span className="text-sm font-medium" style={{ color: '#5C1A1B' }}>
                    فشل الاتصال
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Offline Duration & Last Online Info ─── */}
        <div className="flex flex-col items-center gap-2 mb-6">
          {offlineDuration && !isOnline && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.06)',
                border: '1px solid rgba(92,26,27,0.15)',
              }}
            >
              <AlertCircle size={14} strokeWidth={1.5} color="#5C1A1B" />
              <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>
                مدة الانقطاع: {formatOfflineDuration()}
              </span>
            </motion.div>
          )}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <Clock size={14} strokeWidth={1.5} color={subtleText} />
            <span className="text-xs" style={{ color: subtleText }}>
              آخر اتصال: {formatLastOnline()}
            </span>
          </div>
          {retryCount > 0 && !isOnline && (
            <span className="text-[10px]" style={{ color: subtleText }}>
              عدد المحاولات: {retryCount}
            </span>
          )}
        </div>

        {/* ─── Cached Balance Card ─── */}
        {cachedBalance && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full rounded-2xl p-4 mb-4"
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={16} strokeWidth={1.5} color="#5C1A1B" />
              <span className="text-xs font-bold" style={{ color: secondaryText }}>
                الرصيد الأخير (غير محدث)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-[10px] mb-0.5" style={{ color: subtleText }}>ر.ي</p>
                <p className="text-sm font-bold" style={{ color: textColor }}>
                  {cachedBalance.YER?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="w-px h-8" style={{ background: borderColor }} />
              <div className="text-center flex-1">
                <p className="text-[10px] mb-0.5" style={{ color: subtleText }}>ر.س</p>
                <p className="text-sm font-bold" style={{ color: textColor }}>
                  {cachedBalance.SAR?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="w-px h-8" style={{ background: borderColor }} />
              <div className="text-center flex-1">
                <p className="text-[10px] mb-0.5" style={{ color: subtleText }}>$</p>
                <p className="text-sm font-bold" style={{ color: textColor }}>
                  {cachedBalance.USD?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Pending Actions ─── */}
        {pendingActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full rounded-2xl p-4"
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} strokeWidth={1.5} color="#F59E0B" />
                <span className="text-xs font-bold" style={{ color: secondaryText }}>
                  عمليات معلقة ({pendingActions.length})
                </span>
              </div>
              <button
                onClick={handleClearPending}
                className="text-[10px] font-bold"
                style={{ color: '#5C1A1B' }}
              >
                مسح الكل
              </button>
            </div>

            <div className="space-y-2">
              {pendingActions.slice(0, 5).map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#F59E0B' }}
                    />
                    <span className="text-xs font-medium" style={{ color: textColor }}>
                      {actionTypeLabels[action.type] || action.type}
                    </span>
                  </div>
                  <span className="text-[10px]" style={{ color: subtleText }}>
                    {new Date(action.createdAt).toLocaleTimeString('ar', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </motion.div>
              ))}
              {pendingActions.length > 5 && (
                <p className="text-[10px] text-center" style={{ color: subtleText }}>
                  +{pendingActions.length - 5} عمليات أخرى
                </p>
              )}
            </div>

            <p className="text-[10px] mt-3 text-center" style={{ color: subtleText }}>
              ستتم هذه العمليات تلقائياً عند استعادة الاتصال
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
