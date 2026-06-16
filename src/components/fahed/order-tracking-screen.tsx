'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  User,
  Package,
  MessageCircle,
  Headphones,
  Copy,
  Check,
  X,
  RefreshCw,
  Timer,
  Navigation,
} from 'lucide-react';
import { useAppStore, type Order } from '@/lib/store';
import { formatNumber, currencySymbols, currencyBadgeColors, transactionTypeLabels } from '@/lib/utils';
import { ref, onValue, update, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { generateReference } from '@/lib/utils';

// Order timeline steps
const timelineSteps = [
  { key: 'pending', label: 'قيد الانتظار', description: 'تم استلام الطلب وسيتم مراجعته', icon: Clock, color: '#F59E0B' },
  { key: 'processing', label: 'قيد التنفيذ', description: 'جاري تنفيذ الطلب', icon: RefreshCw, color: '#3B82F6' },
  { key: 'completed', label: 'مكتمل', description: 'تم تنفيذ الطلب بنجاح', icon: CheckCircle2, color: '#10B981' },
];

const cancelledStep = { key: 'cancelled', label: 'ملغي', description: 'تم إلغاء الطلب', icon: XCircle, color: '#5C1A1B' };

export default function OrderTrackingScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, orders, setActiveScreen, addNotification, setUser, addTransaction, updateOrderStatus, providers } = useAppStore();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [firebaseOrders, setFirebaseOrders] = useState<Record<string, Order>>({});

  // Get the most recent pending order for the current user
  const activeOrder = useMemo(() => {
    const userOrders = orders
      .filter(o => o.userId === user?.id && (o.status === 'pending' || o.status === 'completed'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return userOrders.length > 0 ? userOrders[0] : null;
  }, [orders, user]);

  // Real-time Firebase listener for this order
  useEffect(() => {
    if (!activeOrder) return;
    const orderRef = ref(database, `orders/${activeOrder.id}`);
    const unsubscribe = onValue(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        setFirebaseOrders(prev => ({ ...prev, [activeOrder.id]: snapshot.val() as Order }));
      }
    });
    return () => unsubscribe();
  }, [activeOrder]);

  // Merge Firebase data with local data
  const currentOrder = activeOrder
    ? (firebaseOrders[activeOrder.id] ? { ...activeOrder, ...firebaseOrders[activeOrder.id] } : activeOrder)
    : null;

  // Get provider info
  const providerInfo = useMemo(() => {
    if (!currentOrder) return null;
    return providers.find(p => p.id === currentOrder.providerId) || null;
  }, [currentOrder, providers]);

  // Calculate estimated completion time
  const estimatedTime = useMemo(() => {
    if (!currentOrder) return null;
    if (currentOrder.status === 'completed') return 'تم التنفيذ';
    if (currentOrder.status === 'cancelled') return 'ملغي';
    const createdAt = new Date(currentOrder.createdAt);
    const estimatedMinutes = currentOrder.executionType === 'auto' ? 5 : 30;
    const estimated = new Date(createdAt.getTime() + estimatedMinutes * 60 * 1000);
    return estimated;
  }, [currentOrder]);

  const handleCancelOrder = async () => {
    if (!currentOrder || !user) return;
    setIsCancelling(true);

    try {
      // Refund the amount
      const balanceField = `balance${currentOrder.currency}` as keyof typeof user;
      const currentBalance = (user[balanceField] as number) || 0;
      const newBalance = currentBalance + currentOrder.amount;

      const updatedUser = { ...user, [balanceField]: newBalance };

      // Update order status locally
      updateOrderStatus(currentOrder.id, 'cancelled');

      // Try to update Firebase
      try {
        const orderRef = ref(database, `orders/${currentOrder.id}`);
        await update(orderRef, { status: 'cancelled' });
      } catch {}

      try {
        const userRef = ref(database, `users/${user.id}`);
        await update(userRef, { [balanceField]: newBalance });
      } catch {}

      // Create refund transaction
      const refundTx = {
        id: generateReference(),
        fromUserId: 'system',
        toUserId: user.id,
        amount: currentOrder.amount,
        currency: currentOrder.currency,
        type: 'order' as const,
        status: 'refunded' as const,
        description: `استرداد - ${currentOrder.packageName} - ${currentOrder.providerName}`,
        createdAt: new Date().toISOString(),
      };

      addTransaction(refundTx);

      try {
        const txRef = ref(database, `transactions/${refundTx.id}`);
        await set(txRef, refundTx);
      } catch {}

      // Update user balance locally
      setUser(updatedUser);

      // Send notification
      addNotification({
        id: generateReference(),
        title: 'تم إلغاء الطلب',
        body: `تم إلغاء طلب ${currentOrder.packageName} واسترداد ${currentOrder.amount.toLocaleString()} ${currencySymbols[currentOrder.currency]}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      setCancelSuccess(true);
      setTimeout(() => {
        setShowCancelDialog(false);
        setCancelSuccess(false);
      }, 2000);
    } catch {
      addNotification({
        id: generateReference(),
        title: 'خطأ',
        body: 'حدث خطأ أثناء إلغاء الطلب',
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

  if (!currentOrder) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveScreen('main')}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <ArrowLeft size={18} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
            </motion.button>
            <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تتبع الطلب</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: cardBg }}>
            <Package size={32} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
          </div>
          <p className="text-sm font-medium" style={{ color: isDark ? '#666' : '#AAA' }}>لا يوجد طلب نشط</p>
          <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>طلباتك ستظهر هنا</p>
        </div>
      </div>
    );
  }

  // Determine timeline steps based on status
  const isCancelled = currentOrder.status === 'cancelled';
  const isCompleted = currentOrder.status === 'completed';
  const isPending = currentOrder.status === 'pending';
  const currentStepIndex = isCompleted ? 2 : isPending ? 0 : 1;

  return (
    <div className="min-h-screen pb-8" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              useAppStore.getState().setActiveTab('home');
              setActiveScreen('main');
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ArrowLeft size={18} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تتبع الطلب</h1>
          </div>
          <div className="px-3 py-1.5 rounded-xl" style={{
            background: isCancelled ? 'rgba(92,26,27,0.1)' : isCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
          }}>
            <span className="text-xs font-bold" style={{
              color: isCancelled ? '#5C1A1B' : isCompleted ? '#10B981' : '#F59E0B',
            }}>
              {isCancelled ? 'ملغي' : isCompleted ? 'مكتمل' : 'قيد الانتظار'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Provider & Package Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: `${providerInfo?.color || '#5C1A1B'}18` }}
            >
              {providerInfo?.icon && providerInfo.icon.startsWith('data:') ? (
                <img src={providerInfo.icon} alt={providerInfo.name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <span className="font-bold text-lg" style={{ color: providerInfo?.color || '#5C1A1B' }}>
                  {currentOrder.providerName.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{currentOrder.providerName}</h3>
              <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                {currentOrder.executionType === 'auto' ? 'تنفيذ تلقائي' : 'تنفيذ يدوي'}
              </p>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                {currentOrder.amount.toLocaleString()}
              </p>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: currencyBadgeColors[currentOrder.currency] }}>
                {currencySymbols[currentOrder.currency]}
              </span>
            </div>
          </div>

          {/* Package Details */}
          <div className="space-y-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-2">
              <Package size={12} color={isDark ? '#666' : '#AAA'} />
              <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>الباقة</span>
              <span className="text-xs font-medium mr-auto" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{currentOrder.packageName}</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={12} color={isDark ? '#666' : '#AAA'} />
              <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>بيانات العميل</span>
              <span className="text-xs font-mono mr-auto" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{currentOrder.customerInput}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={12} color={isDark ? '#666' : '#AAA'} />
              <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>وقت الطلب</span>
              <span className="text-xs mr-auto" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                {new Date(currentOrder.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Estimated Completion */}
          {isPending && estimatedTime && estimatedTime instanceof Date && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)' }}>
              <Timer size={14} color="#F59E0B" />
              <span className="text-[10px]" style={{ color: '#F59E0B' }}>الوقت المتوقع للتنفيذ</span>
              <span className="text-xs font-bold mr-auto" style={{ color: '#F59E0B' }}>
                {estimatedTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </motion.div>

        {/* Status Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4"
          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>حالة الطلب</h3>

          <div className="relative">
            {isCancelled ? (
              // Cancelled timeline
              <div className="flex flex-col items-center py-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(92,26,27,0.15)' }}>
                  <XCircle size={28} color="#5C1A1B" />
                </div>
                <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>تم إلغاء الطلب</p>
                <p className="text-[10px] mt-1" style={{ color: isDark ? '#666' : '#AAA' }}>
                  تم استرداد المبلغ إلى رصيدك
                </p>
              </div>
            ) : (
              // Normal timeline
              <div className="space-y-0">
                {timelineSteps.map((step, index) => {
                  const isStepCompleted = index <= currentStepIndex;
                  const isCurrentStep = index === currentStepIndex;
                  const StepIcon = step.icon;
                  const isLast = index === timelineSteps.length - 1;

                  return (
                    <div key={step.key} className="flex gap-3">
                      {/* Timeline Line & Circle */}
                      <div className="flex flex-col items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1 * index }}
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: isStepCompleted || isCurrentStep
                              ? step.color
                              : isDark ? '#2D2D2D' : '#EEE',
                            boxShadow: isCurrentStep ? `0 0 12px ${step.color}40` : 'none',
                          }}
                        >
                          {isStepCompleted ? (
                            <Check size={14} color="#FFF" />
                          ) : (
                            <StepIcon size={14} color={isDark ? '#555' : '#BBB'} />
                          )}
                        </motion.div>
                        {!isLast && (
                          <div className="w-0.5 h-10" style={{
                            background: isStepCompleted && index < currentStepIndex
                              ? step.color
                              : isDark ? '#2D2D2D' : '#EEE',
                          }} />
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="pb-6">
                        <p className={`text-xs font-bold ${isCurrentStep ? '' : ''}`} style={{
                          color: isStepCompleted || isCurrentStep ? step.color : isDark ? '#555' : '#BBB',
                        }}>
                          {step.label}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#666' : '#AAA' }}>
                          {step.description}
                        </p>
                        {isCurrentStep && (
                          <p className="text-[9px] mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>
                            {new Date(currentOrder.createdAt).toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Reference Number */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-4"
          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رقم المرجع</span>
            <CopyableText text={currentOrder.id} isDark={isDark} />
          </div>
        </motion.div>

        {/* Support Button */}
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => setActiveScreen('support')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <Headphones size={18} strokeWidth={1.5} color="#3B82F6" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تواصل مع الدعم</p>
                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>إذا كان طلبك متأخراً</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Cancel Order Button - only for pending orders */}
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <button
              onClick={() => setShowCancelDialog(true)}
              className="w-full py-4 rounded-2xl font-bold text-white text-sm"
              style={{
                background: 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)',
                boxShadow: '0 4px 16px rgba(92,26,27,0.3)',
              }}
            >
              إلغاء الطلب
            </button>
          </motion.div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AnimatePresence>
        {showCancelDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => { if (!isCancelling) { setShowCancelDialog(false); setCancelSuccess(false); } }}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[85%] max-w-sm rounded-2xl p-6"
              style={{ background: isDark ? '#1E1E1E' : '#FFFFFF' }}
            >
              {cancelSuccess ? (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <CheckCircle2 size={28} color="#10B981" />
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تم إلغاء الطلب</p>
                  <p className="text-xs text-center" style={{ color: isDark ? '#888' : '#AAA' }}>
                    تم استرداد {currentOrder.amount.toLocaleString()} {currencySymbols[currentOrder.currency]} إلى رصيدك
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle size={20} color="#5C1A1B" />
                    <h3 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إلغاء الطلب</h3>
                  </div>
                  <p className="text-xs mb-2" style={{ color: isDark ? '#888' : '#AAA' }}>
                    هل تريد إلغاء هذا الطلب؟
                  </p>
                  <div className="p-3 rounded-xl mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {currentOrder.packageName} - {currentOrder.providerName}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#5C1A1B' }}>
                      سيتم استرداد {currentOrder.amount.toLocaleString()} {currencySymbols[currentOrder.currency]}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelDialog(false)}
                      disabled={isCancelling}
                      className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ background: isDark ? '#2D2D2D' : '#F0F0F0', color: isDark ? '#FFF' : '#1a1a1a' }}
                    >
                      تراجع
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={isCancelling}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: '#5C1A1B' }}
                    >
                      {isCancelling ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        'تأكيد الإلغاء'
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Copyable text component
function CopyableText({ text, isDark }: { text: string; isDark: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono font-bold" style={{ color: '#5C1A1B' }} dir="ltr">{text}</span>
      <button onClick={handleCopy} className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
        {copied ? <Check size={8} color="#10B981" /> : <Copy size={8} color="#5C1A1B" />}
      </button>
    </div>
  );
}
