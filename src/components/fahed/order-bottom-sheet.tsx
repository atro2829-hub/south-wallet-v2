'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronDown,
  Check,
  AlertTriangle,
  Loader2,
  Wifi,
  Tag,
  RotateCcw,
  Receipt,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore, type ServiceProvider, type ProductPackage, type Order } from '@/lib/store';
import { currencySymbols, currencyBadgeColors, generateReference } from '@/lib/utils';
import { ref, push, set, get, update, runTransaction } from '@/lib/db-compat';
import { database } from '@/lib/db-compat';
import { useToast } from '@/components/fahed/toast-provider';
// Products are now loaded from Supabase via store
import { executeApiOrder, type ApiProviderConfig } from '@/lib/api-provider';

export default function OrderBottomSheet() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    isOrderOpen,
    setOrderOpen,
    selectedProvider,
    setSelectedProvider,
    packages,
    user,
    addOrder,
    addNotification,
    addTransaction,
    setUser,
    orders,
    applyPromoCode,
  } = useAppStore();
  const { showToast } = useToast();

  const [customerInput, setCustomerInput] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderResult, setOrderResult] = useState<'success' | 'insufficient' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedOrderId, setCompletedOrderId] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // G2Bulk / API purchase verification step
  const [showPurchaseConfirm, setShowPurchaseConfirm] = useState(false);

  // Quick recharge - find last order with this provider
  const lastOrder = orders.find((o) => o.providerId === selectedProvider?.id);

  // Reset state when provider changes
  useEffect(() => {
    setCustomerInput('');
    setSelectedPackageId(null);
    setOrderResult(null);
    setErrorMessage('');
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setShowReceipt(false);
    setCompletedOrderId('');
  }, [selectedProvider]);

  if (!selectedProvider) return null;

  const providerPackages = [
    ...packages.filter((pkg) => pkg.providerId === selectedProvider.id && pkg.isActive),
  ].filter((pkg, index, self) => index === self.findIndex(p => p.id === pkg.id));

  const selectedPackage = providerPackages.find((pkg) => pkg.id === selectedPackageId);

  const getBalance = (currency: string): number => {
    if (!user) return 0;
    const field = `balance${currency}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  const effectivePrice = selectedPackage
    ? promoApplied
      ? Math.max(0, selectedPackage.price - promoDiscount)
      : selectedPackage.price
    : 0;

  const handleClose = () => {
    setOrderOpen(false);
    setTimeout(() => setSelectedProvider(null), 300);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    const promo = await applyPromoCode(promoCode.trim().toUpperCase());
    if (promo) {
      const discount = promo.type === 'percentage' && selectedPackage
        ? Math.round(selectedPackage.price * promo.discount / 100)
        : promo.type === 'fixed' ? promo.discount : 0;
      setPromoApplied(true);
      setPromoDiscount(discount);
      showToast('success', 'تم تطبيق الكود', `خصم ${discount.toLocaleString('ar-SA')} ${currencySymbols[selectedPackage?.currency || 'YER']}`);
    } else {
      showToast('error', 'كود غير صالح', 'الكود الترويجي غير صالح أو منتهي الصلاحية');
    }
  };

  const handleQuickRecharge = () => {
    if (lastOrder) {
      setCustomerInput(lastOrder.customerInput);
      setSelectedPackageId(lastOrder.packageId);
      showToast('info', 'إعادة الطلب', 'تم ملء بيانات آخر طلب');
    }
  };

  // ─── API Auto-Processing ──────────────────────────────────────────
  // When a package has executionType='auto' and an apiProvider configured,
  // this function will call the external API and handle the result.
  // FIX: reads providers from Supabase (api_providers table) instead of the
  // legacy unmapped Firebase path 'adminSettings/apiProviders'.
  const processApiOrder = async (
    orderId: string,
    pkg: ProductPackage,
    orderCustomerInput: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Fetch API providers from Supabase (replaces broken Firebase read)
      const { getApiProviders, purchaseProduct } = await import('@/lib/api-providers');
      const providers = await getApiProviders();

      if (!providers || providers.length === 0) {
        return { success: false, message: 'لا يوجد مزود API مُكوّن' };
      }

      // Find the provider that matches the package's apiProvider field
      const matchedProvider = providers.find(p =>
        p.enabled && (
          p.id === pkg.apiProvider ||
          p.name === pkg.apiProvider ||
          p.nameAr === pkg.apiProvider
        )
      ) || providers.find(p => p.enabled && p.type === 'g2bulk');

      if (!matchedProvider) {
        return { success: false, message: 'لم يتم العثور على مزود API مطابق' };
      }

      // Execute the order via the modern api-providers module
      const apiResult = await purchaseProduct(
        matchedProvider,
        Number(pkg.apiProductId || pkg.productIdInApi || pkg.id),
        1,
        orderCustomerInput,
      );

      return {
        success: apiResult.success,
        message: apiResult.message || (apiResult.success ? 'تم تنفيذ الطلب بنجاح' : 'فشل تنفيذ الطلب'),
      };
    } catch (error: any) {
      // Surface the translated Arabic message from apiRequest directly when present.
      const message = error?.providerError
        ? error.message
        : (error.message || 'حدث خطأ في الاتصال بمزود API');
      return { success: false, message };
    }
  };

  const handleConfirm = async () => {
    if (!user || !selectedPackage || !customerInput.trim()) {
      setErrorMessage('يرجى ملء جميع البيانات');
      return;
    }

    const currentBalance = getBalance(selectedPackage.currency);
    if (currentBalance < effectivePrice) {
      setOrderResult('insufficient');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const balanceField = `balance${selectedPackage.currency}` as keyof typeof user;
      let newBalance = currentBalance - effectivePrice;

      const updatedUser = {
        ...user,
        [balanceField]: newBalance,
      };

      // Determine if this is an auto-execution order
      const isAutoExecution = selectedPackage.executionType === 'auto' && !!selectedPackage.apiProvider;

      const orderId = generateReference();
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        providerId: selectedProvider.id,
        providerName: selectedProvider.name,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        customerInput: customerInput.trim(),
        amount: effectivePrice,
        currency: selectedPackage.currency,
        status: isAutoExecution ? 'pending' : 'pending',
        executionType: selectedPackage.executionType,
        createdAt: new Date().toISOString(),
      };

      // Deduct balance using runTransaction to avoid race conditions
      try {
        const txResult = await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
          const val = currentVal || 0;
          if (val < effectivePrice) return; // Abort if insufficient
          return val - effectivePrice;
        });
        if (txResult.committed) {
          newBalance = txResult.snapshot.val();
        }
      } catch {
        // Continue locally
      }

      // Save the order
      try {
        const orderRef = ref(database, `orders/${orderId}`);
        await set(orderRef, newOrder);
      } catch {
        // Continue locally even if Firebase fails
      }

      const txId = generateReference();
      const newTx = {
        id: txId,
        fromUserId: user.id,
        toUserId: 'system',
        amount: effectivePrice,
        currency: selectedPackage.currency,
        type: 'order' as const,
        status: 'completed' as const,
        description: `${selectedPackage.name} - ${selectedProvider.name}`,
        createdAt: new Date().toISOString(),
      };

      try {
        const txRef = ref(database, `transactions/${txId}`);
        await set(txRef, newTx);
      } catch {
        // Continue locally
      }

      // ─── API Auto-Processing ──────────────────────────────────
      if (isAutoExecution) {
        try {
          const apiResult = await processApiOrder(orderId, selectedPackage, customerInput.trim());
          
          if (apiResult.success) {
            // API success → mark order complete
            const completedAt = new Date().toISOString();
            const updatedOrder = { ...newOrder, status: 'completed' as const, completedAt };
            try {
              await update(ref(database, `orders/${orderId}`), { status: 'completed', completedAt });
            } catch {}
            newOrder.status = 'completed';
            newOrder.completedAt = completedAt;
            
            // Send FCM notification to user - SUCCESS
            try {
              const { sendFCMDirect } = await import('@/lib/fcm-sender');
              const fcmTokenRef = ref(database, `users/${user.id}/fcmToken`);
              const tokenSnapshot = await get(fcmTokenRef);
              const fcmToken = tokenSnapshot.val();
              if (fcmToken) {
                await sendFCMDirect(
                  [fcmToken],
                  'تم تنفيذ الطلب',
                  `تم تنفيذ طلب ${selectedPackage.name} بنجاح`,
                  'transaction',
                  {
                    orderId: String(orderId),
                    status: String('completed'),
                    providerName: String(selectedProvider.name),
                    packageName: String(selectedPackage.name),
                    amount: String(effectivePrice),
                    currency: String(selectedPackage.currency),
                  }
                );
              }
            } catch (notifErr) {
              console.warn('FCM notification failed:', notifErr);
            }
          } else {
            // API failure → refund balance + mark order as refunded
            const refundedBalance = newBalance + effectivePrice;
            try {
              await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
                return (currentVal || 0) + effectivePrice;
              });
            } catch {}
            
            const updatedOrder = { ...newOrder, status: 'refunded' as const };
            try {
              await update(ref(database, `orders/${orderId}`), { status: 'refunded' });
            } catch {}
            newOrder.status = 'refunded';
            
            // Update local user balance (refund)
            updatedUser[balanceField] = refundedBalance;
            
            // Send FCM notification to user - FAILURE/REFUND
            try {
              const { sendFCMDirect } = await import('@/lib/fcm-sender');
              const fcmTokenRef = ref(database, `users/${user.id}/fcmToken`);
              const tokenSnapshot = await get(fcmTokenRef);
              const fcmToken = tokenSnapshot.val();
              if (fcmToken) {
                await sendFCMDirect(
                  [fcmToken],
                  'فشل تنفيذ الطلب',
                  `${apiResult.message} - تم إرجاع المبلغ`,
                  'transaction',
                  {
                    orderId: String(orderId),
                    status: String('refunded'),
                    providerName: String(selectedProvider.name),
                    packageName: String(selectedPackage.name),
                    amount: String(effectivePrice),
                    currency: String(selectedPackage.currency),
                    errorMessage: String(apiResult.message),
                  }
                );
              }
            } catch (notifErr) {
              console.warn('FCM notification failed:', notifErr);
            }
          }
        } catch (apiError: any) {
          // API call itself threw an error → refund
          const refundedBalance = newBalance + effectivePrice;
          try {
            await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
              return (currentVal || 0) + effectivePrice;
            });
          } catch {}
          
          try {
            await update(ref(database, `orders/${orderId}`), { status: 'refunded' });
          } catch {}
          newOrder.status = 'refunded';
          updatedUser[balanceField] = refundedBalance;
          
          // Send FCM notification
          try {
            const { sendFCMDirect } = await import('@/lib/fcm-sender');
            const fcmTokenRef = ref(database, `users/${user.id}/fcmToken`);
            const tokenSnapshot = await get(fcmTokenRef);
            const fcmToken = tokenSnapshot.val();
            if (fcmToken) {
              await sendFCMDirect(
                [fcmToken],
                'فشل تنفيذ الطلب',
                'حدث خطأ في الاتصال بمزود الخدمة - تم إرجاع المبلغ',
                'transaction',
                {
                  orderId: String(orderId),
                  status: String('refunded'),
                  providerName: String(selectedProvider.name),
                  packageName: String(selectedPackage.name),
                  amount: String(effectivePrice),
                  currency: String(selectedPackage.currency),
                  errorMessage: String(apiError.message || 'API connection error'),
                }
              );
            }
          } catch (notifErr) {
            console.warn('FCM notification failed:', notifErr);
          }
        }
      } else {
        // Manual execution - send admin notification with FCM push
        try {
          const { notifyOrderCreated } = await import('@/lib/notifications');
          await notifyOrderCreated(user.id, selectedPackage.name, effectivePrice, selectedPackage.currency);
        } catch {
          // Non-critical
        }
      }

      setUser(updatedUser);
      addOrder(newOrder);
      addTransaction(newTx);

      // Play purchase sound
      try { const { playTransactionSound } = await import('@/lib/transaction-sounds'); playTransactionSound(newOrder.status === 'refunded' ? 'refund' : 'purchase'); } catch {}
      addNotification({
        id: generateReference(),
        title: newOrder.status === 'completed' ? 'تم تنفيذ الطلب' : newOrder.status === 'refunded' ? 'فشل تنفيذ الطلب' : 'تم إنشاء الطلب',
        body: newOrder.status === 'completed'
          ? `تم تنفيذ طلب ${selectedPackage.name} بنجاح`
          : newOrder.status === 'refunded'
          ? `فشل تنفيذ طلب ${selectedPackage.name} - تم إرجاع المبلغ`
          : `طلب ${selectedPackage.name} من ${selectedProvider.name} قيد المعالجة`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      setCompletedOrderId(orderId);
      setOrderResult('success');
    } catch {
      setOrderResult('error');
      setErrorMessage('حدث خطأ أثناء المعالجة');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const inputBg = isDark ? '#222' : '#F8F8F8';
  const borderColor = isDark ? '#333' : '#EEE';

  return (
    <AnimatePresence>
      {isOrderOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: isDark ? '#141414' : '#FAFAFA',
              maxHeight: '85vh',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: isDark ? '#444' : '#DDD' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${selectedProvider.color}18` }}
                >
                  {selectedProvider.icon && selectedProvider.icon.startsWith('data:') ? (
                    <img
                      src={selectedProvider.icon}
                      alt={selectedProvider.name}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="font-bold text-lg" style={{ color: selectedProvider.color }}>
                      {selectedProvider.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {selectedProvider.name}
                  </h2>
                  <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                    {selectedProvider.inputLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: isDark ? '#2D2D2D' : '#F0F0F0' }}
              >
                <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 80px)' }}>
              <AnimatePresence mode="wait">
                {orderResult === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-6"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ background: 'rgba(16,185,129,0.15)' }}
                    >
                      <Check size={32} strokeWidth={2} color="#10B981" />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      تم إنشاء الطلب بنجاح
                    </h3>
                    <p className="text-sm text-center mb-4" style={{ color: isDark ? '#888' : '#AAA' }}>
                      سيتم تنفيذ طلبك في أقرب وقت ممكن
                    </p>

                    {/* Receipt */}
                    {showReceipt && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full rounded-2xl p-4 mb-4"
                        style={{
                          background: isDark
                            ? 'rgba(255,255,255,0.06)'
                            : 'rgba(0,0,0,0.02)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Receipt size={16} strokeWidth={1.5} color="#5C1A1B" />
                          <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                            إيصال الطلب
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>رقم المرجع</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-mono font-bold" style={{ color: '#5C1A1B' }} dir="ltr">{completedOrderId}</span>
                              <button
                                onClick={async () => {
                                  try { await navigator.clipboard.writeText(completedOrderId); showToast('success', 'تم النسخ', 'تم نسخ رقم المرجع'); } catch {}
                                }}
                              >
                                <Copy size={10} color="#5C1A1B" />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>الخدمة</span>
                            <span className="text-[10px] font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{selectedPackage?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>المبلغ</span>
                            <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                              {effectivePrice.toLocaleString()} {currencySymbols[selectedPackage?.currency || 'YER']}
                            </span>
                          </div>
                          {promoApplied && promoDiscount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[10px]" style={{ color: '#10B981' }}>الخصم</span>
                              <span className="text-[10px] font-medium" style={{ color: '#10B981' }}>
                                -{promoDiscount.toLocaleString()} {currencySymbols[selectedPackage?.currency || 'YER']}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>الحالة</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                              قيد الانتظار
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {!showReceipt && (
                      <button
                        onClick={() => setShowReceipt(true)}
                        className="w-full py-2.5 rounded-2xl text-xs font-medium mb-3"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                          color: isDark ? '#FFF' : '#1a1a1a',
                        }}
                      >
                        <Receipt size={14} className="inline ml-1" />
                        عرض الإيصال
                      </button>
                    )}

                    <div className="flex gap-2 w-full">
                      <button
                        onClick={handleClose}
                        className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm"
                        style={{
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        }}
                      >
                        حسناً
                      </button>
                      <button
                        onClick={() => {
                          setOrderResult(null);
                          setShowReceipt(false);
                          setSelectedPackageId(null);
                          setCustomerInput('');
                          setPromoApplied(false);
                          setPromoDiscount(0);
                          setPromoCode('');
                        }}
                        className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5"
                        style={{
                          background: isDark ? '#2D2D2D' : '#F0F0F0',
                          color: isDark ? '#FFF' : '#1a1a1a',
                        }}
                      >
                        <RotateCcw size={14} strokeWidth={1.5} />
                        <span>إعادة الطلب</span>
                      </button>
                    </div>
                  </motion.div>
                ) : orderResult === 'insufficient' ? (
                  <motion.div
                    key="insufficient"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-8"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ background: 'rgba(92,26,27,0.15)' }}
                    >
                      <AlertTriangle size={32} strokeWidth={2} color="#5C1A1B" />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      رصيد غير كافٍ
                    </h3>
                    <p className="text-sm text-center mb-2" style={{ color: isDark ? '#888' : '#AAA' }}>
                      رصيدك الحالي لا يكفي لإتمام هذه العملية
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رصيدك:</span>
                      <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {getBalance(selectedPackage?.currency || 'YER').toLocaleString()} {currencySymbols[selectedPackage?.currency || 'YER']}
                      </span>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-full py-3.5 rounded-2xl font-bold text-white text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)',
                      }}
                    >
                      حسناً
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Quick Recharge */}
                    {lastOrder && (
                      <button
                        onClick={handleQuickRecharge}
                        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium"
                        style={{
                          background: 'rgba(92,26,27,0.06)',
                          border: '1px solid rgba(92,26,27,0.15)',
                          color: '#5C1A1B',
                        }}
                      >
                        <RotateCcw size={14} strokeWidth={1.5} />
                        <span>إعادة آخر طلب ({lastOrder.packageName})</span>
                      </button>
                    )}

                    {/* Customer Input */}
                    <div>
                      <label className="text-xs font-medium mb-2 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                        {selectedProvider.inputLabel}
                      </label>
                      <div
                        className="flex items-center gap-2 px-4 py-3.5 rounded-2xl"
                        style={{ background: inputBg, border: `1px solid ${borderColor}` }}
                      >
                        {selectedProvider.inputPrefix && (
                          <>
                            <span
                              className="text-sm font-medium shrink-0"
                              style={{ color: isDark ? '#AAA' : '#888' }}
                              dir="ltr"
                            >
                              {selectedProvider.inputPrefix}
                            </span>
                            <div className="w-px h-5 shrink-0" style={{ background: borderColor }} />
                          </>
                        )}
                        <input
                          type={selectedProvider.inputType === 'phone' ? 'tel' : 'text'}
                          placeholder={selectedProvider.inputLabel}
                          value={customerInput}
                          onChange={(e) => {
                            if (selectedProvider.inputType === 'phone') {
                              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 9);
                              setCustomerInput(cleaned);
                            } else {
                              setCustomerInput(e.target.value);
                            }
                          }}
                          className="flex-1 bg-transparent outline-none text-sm"
                          style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                          dir={selectedProvider.inputType === 'phone' ? 'ltr' : 'auto'}
                        />
                      </div>
                    </div>

                    {/* Package Selection */}
                    <div>
                      <label className="text-xs font-medium mb-2 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                        اختر الباقة
                      </label>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
                        {providerPackages.map((pkg) => (
                          <button
                            key={pkg.id}
                            onClick={() => {
                              setSelectedPackageId(pkg.id);
                              setOrderResult(null);
                              setErrorMessage('');
                              setPromoApplied(false);
                              setPromoDiscount(0);
                            }}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
                            style={{
                              background: selectedPackageId === pkg.id
                                ? isDark ? '#222' : '#FFF'
                                : inputBg,
                              border: selectedPackageId === pkg.id
                                ? `2px solid ${selectedProvider.color}`
                                : `1px solid ${borderColor}`,
                              boxShadow: selectedPackageId === pkg.id
                                ? `0 2px 12px ${selectedProvider.color}20`
                                : 'none',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  border: selectedPackageId === pkg.id
                                    ? `2px solid ${selectedProvider.color}`
                                    : `2px solid ${borderColor}`,
                                  background: selectedPackageId === pkg.id
                                    ? selectedProvider.color
                                    : 'transparent',
                                }}
                              >
                                {selectedPackageId === pkg.id && (
                                  <Check size={12} strokeWidth={3} color="#FFF" />
                                )}
                              </div>
                              <span
                                className="text-sm font-medium text-right"
                                style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                              >
                                {pkg.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold" style={{ color: selectedProvider.color }}>
                                {pkg.price.toLocaleString()}
                              </span>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white"
                                style={{ background: currencyBadgeColors[pkg.currency] }}
                              >
                                {currencySymbols[pkg.currency]}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Promo Code */}
                    {selectedPackage && (
                      <div>
                        <label className="text-xs font-medium mb-2 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                          كود ترويجي
                        </label>
                        <div className="flex gap-2">
                          <div
                            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl flex-1"
                            style={{
                              background: inputBg,
                              border: promoApplied ? '1px solid #10B981' : `1px solid ${borderColor}`,
                            }}
                          >
                            <Tag size={16} strokeWidth={1.5} color={promoApplied ? '#10B981' : '#5C1A1B'} />
                            <input
                              type="text"
                              placeholder="أدخل الكود"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              disabled={promoApplied}
                              className="flex-1 bg-transparent outline-none text-xs"
                              style={{ color: promoApplied ? '#10B981' : isDark ? '#FFF' : '#1a1a1a' }}
                              dir="ltr"
                            />
                            {promoApplied && <CheckCircle2 size={14} color="#10B981" strokeWidth={1.5} />}
                          </div>
                          <button
                            onClick={handleApplyPromo}
                            disabled={promoApplied || !promoCode.trim()}
                            className="px-4 rounded-2xl text-[10px] font-medium text-white disabled:opacity-40"
                            style={{ background: promoApplied ? '#10B981' : '#5C1A1B' }}
                          >
                            {promoApplied ? 'مطبق' : 'تطبيق'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Balance Check */}
                    {selectedPackage && (
                      <div
                        className="rounded-2xl p-4"
                        style={{
                          background: isDark ? '#1A1A1A' : '#F8F8F8',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رصيدك الحالي</span>
                          <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                            {getBalance(selectedPackage.currency).toLocaleString()} {currencySymbols[selectedPackage.currency]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>سعر الباقة</span>
                          <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>
                            -{effectivePrice.toLocaleString()} {currencySymbols[selectedPackage.currency]}
                          </span>
                        </div>
                        {promoApplied && promoDiscount > 0 && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs" style={{ color: '#10B981' }}>الخصم</span>
                            <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                              +{promoDiscount.toLocaleString()} {currencySymbols[selectedPackage.currency]}
                            </span>
                          </div>
                        )}
                        <div className="h-px my-2" style={{ background: borderColor }} />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>الرصيد بعد الشراء</span>
                          <span
                            className="text-sm font-bold"
                            style={{
                              color: getBalance(selectedPackage.currency) - effectivePrice >= 0
                                ? '#10B981'
                                : '#5C1A1B',
                            }}
                          >
                            {(getBalance(selectedPackage.currency) - effectivePrice).toLocaleString()} {currencySymbols[selectedPackage.currency]}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {errorMessage && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-center"
                        style={{ color: '#5C1A1B' }}
                      >
                        {errorMessage}
                      </motion.p>
                    )}

                    {/* Confirm Button — opens verification dialog */}
                    <button
                      onClick={() => {
                        if (!selectedPackageId || !customerInput.trim()) return;
                        setShowPurchaseConfirm(true);
                      }}
                      disabled={isProcessing || !selectedPackageId || !customerInput.trim()}
                      className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                      style={{
                        background: `linear-gradient(135deg, ${selectedProvider.color} 0%, ${selectedProvider.color}CC 100%)`,
                        boxShadow: `0 4px 16px ${selectedProvider.color}40`,
                      }}
                    >
                      {isProcessing ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <span>مراجعة الطلب</span>
                          {selectedPackage && (
                            <span className="opacity-70">
                              ({effectivePrice.toLocaleString()} {currencySymbols[selectedPackage.currency]})
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}

      {/* ── Purchase Verification Dialog (G2Bulk / API confirmation) ── */}
      <AnimatePresence>
        {showPurchaseConfirm && selectedPackage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPurchaseConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="fixed inset-x-4 bottom-6 z-[201] rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: isDark ? '#1A1A2E' : '#FFFFFF', maxWidth: 440, margin: '0 auto' }}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4" style={{ background: `linear-gradient(135deg, ${selectedProvider.color}18 0%, transparent 100%)` }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: selectedProvider.color + '20' }}>
                      <Receipt size={16} style={{ color: selectedProvider.color }} />
                    </div>
                    <span className="font-bold text-sm" style={{ color: isDark ? '#fff' : '#1a1a1a' }}>
                      تأكيد الطلب
                    </span>
                  </div>
                  {selectedPackage.executionType === 'auto' && selectedPackage.apiProvider && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: '#10B98120', color: '#10B981' }}>
                      ⚡ تنفيذ فوري
                    </span>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: isDark ? '#aaa' : '#888' }}>
                  يرجى مراجعة تفاصيل طلبك قبل التأكيد النهائي
                </p>
              </div>

              {/* Order Details */}
              <div className="px-5 pb-4 space-y-3">
                {/* Provider + Package */}
                <div className="rounded-2xl p-4 space-y-2.5"
                  style={{ background: isDark ? '#ffffff08' : '#f8f8f8' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: isDark ? '#aaa' : '#888' }}>الخدمة</span>
                    <span className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#1a1a1a' }}>
                      {selectedProvider.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: isDark ? '#aaa' : '#888' }}>الباقة</span>
                    <span className="text-sm font-semibold" style={{ color: isDark ? '#fff' : '#1a1a1a' }}>
                      {selectedPackage.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: isDark ? '#aaa' : '#888' }}>
                      {selectedProvider.customerInputLabel || 'معرّف الحساب'}
                    </span>
                    <span className="text-sm font-bold font-mono" style={{ color: selectedProvider.color }}>
                      {customerInput}
                    </span>
                  </div>
                  <div className="h-px" style={{ background: isDark ? '#ffffff10' : '#e5e5e5' }} />
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: isDark ? '#aaa' : '#888' }}>المبلغ</span>
                    <span className="text-base font-bold" style={{ color: selectedProvider.color }}>
                      {effectivePrice.toLocaleString()} {currencySymbols[selectedPackage.currency]}
                    </span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-green-500">خصم كود الترويج</span>
                      <span className="text-sm font-semibold text-green-500">
                        -{promoDiscount.toLocaleString()} {currencySymbols[selectedPackage.currency]}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: isDark ? '#aaa' : '#888' }}>الرصيد المتبقي بعد الشراء</span>
                    <span className="text-sm font-bold"
                      style={{ color: (getBalance(selectedPackage.currency) - effectivePrice) >= 0 ? '#10B981' : '#EF4444' }}>
                      {Math.max(0, getBalance(selectedPackage.currency) - effectivePrice).toLocaleString()} {currencySymbols[selectedPackage.currency]}
                    </span>
                  </div>
                </div>

                {/* API auto-execution notice */}
                {selectedPackage.executionType === 'auto' && selectedPackage.apiProvider && (
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl"
                    style={{ background: '#10B98112', border: '1px solid #10B98130' }}>
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: '#10B981' }} />
                    <p className="text-xs leading-relaxed" style={{ color: '#10B981' }}>
                      سيتم تنفيذ هذا الطلب تلقائياً عبر مزود API. تأكد من صحة معرّف الحساب قبل الإكمال.
                    </p>
                  </div>
                )}

                {/* Warning if balance is tight */}
                {getBalance(selectedPackage.currency) - effectivePrice < 0 && (
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl"
                    style={{ background: '#EF444412', border: '1px solid #EF444430' }}>
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: '#EF4444' }} />
                    <p className="text-xs leading-relaxed" style={{ color: '#EF4444' }}>
                      رصيدك غير كافٍ لإتمام هذه العملية. يرجى شحن رصيدك أولاً.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowPurchaseConfirm(false)}
                    className="flex-1 py-3.5 rounded-2xl text-sm font-semibold border transition-colors"
                    style={{
                      borderColor: isDark ? '#ffffff20' : '#e5e5e5',
                      color: isDark ? '#aaa' : '#666',
                      background: isDark ? '#ffffff08' : '#f5f5f5',
                    }}
                  >
                    تعديل
                  </button>
                  <button
                    onClick={async () => {
                      setShowPurchaseConfirm(false);
                      await handleConfirm();
                    }}
                    disabled={isProcessing || (getBalance(selectedPackage.currency) - effectivePrice) < 0}
                    className="flex-[2] py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-40"
                    style={{
                      background: `linear-gradient(135deg, ${selectedProvider.color} 0%, ${selectedProvider.color}CC 100%)`,
                      boxShadow: `0 4px 16px ${selectedProvider.color}40`,
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 size={18} className="animate-spin mx-auto" />
                    ) : (
                      '✓ تأكيد الشراء نهائياً'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}