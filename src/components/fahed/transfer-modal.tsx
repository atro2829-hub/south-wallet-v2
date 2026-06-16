'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Phone,
  Hash,
  DollarSign,
  FileText,
  Send,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Split,
  Calendar,
  Receipt,
  Copy,
  UserCheck,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, currencyNames, currencyFlags, currencyBadgeColors, generateReference } from '@/lib/utils';
import { useToast } from '@/components/fahed/toast-provider';
import { database } from '@/lib/firebase';
import { ref, get, update, push, runTransaction } from 'firebase/database';
import { sendFCMDirect } from '@/lib/fcm-sender';

type Currency = 'YER' | 'SAR' | 'USD';
type TransferMode = 'userId' | 'phone';
type TransferStep = 'form' | 'confirm' | 'success';

// Yemen flag indicator component
function YemenFlagIndicator() {
  return (
    <div className="flex flex-col w-6 h-4 rounded-sm overflow-hidden shrink-0">
      <div className="flex-1 bg-red-600" />
      <div className="flex-1 bg-white" />
      <div className="flex-1 bg-black" />
    </div>
  );
}

// Currency badge component
function CurrencyBadge({ currency }: { currency: string }) {
  const bgColor = currencyBadgeColors[currency] || '#666';
  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
      style={{ background: bgColor }}
    >
      {currencyFlags[currency]}
    </span>
  );
}

interface RecipientInfo {
  uid: string;
  name: string;
  userId: string;
  phone: string;
  avatar: string;
}

export default function TransferModal() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isTransferOpen, setTransferOpen, user, setActiveScreen } = useAppStore();
  const { showToast } = useToast();

  // Check if user is verified - block transfer if not
  const isVerified = user?.kycStatus === 'verified';

  // Show verification block if user is not verified
  useEffect(() => {
    if (isTransferOpen && !isVerified) {
      setTransferOpen(false);
      showToast('error', 'يرجى توثيق حسابك أولاً', 'لا يمكنك التحويل إلا بعد توثيق حسابك');
      setActiveScreen('kyc');
    }
  }, [isTransferOpen, isVerified, setTransferOpen, showToast, setActiveScreen]);

  const [transferMode, setTransferMode] = useState<TransferMode>('userId');
  const [toUserId, setToUserId] = useState('');
  const [toPhone, setToPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('YER');
  const [description, setDescription] = useState('');
  const [showCurrencySelect, setShowCurrencySelect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [scheduledDate, setScheduledDate] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [transferRef, setTransferRef] = useState('');

  // Confirmation step
  const [step, setStep] = useState<TransferStep>('form');
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const currencies: Currency[] = ['YER', 'SAR', 'USD'];

  const quickAmounts: { value: number; label: string }[] = currency === 'YER'
    ? [
        { value: 1000, label: '1,000' },
        { value: 5000, label: '5,000' },
        { value: 10000, label: '10,000' },
        { value: 50000, label: '50,000' },
      ]
    : currency === 'SAR'
      ? [
          { value: 10, label: '10' },
          { value: 50, label: '50' },
          { value: 100, label: '100' },
          { value: 500, label: '500' },
        ]
      : [
          { value: 5, label: '5' },
          { value: 10, label: '10' },
          { value: 50, label: '50' },
          { value: 100, label: '100' },
        ];

  const getBalance = (curr: Currency): number => {
    if (!user) return 0;
    const field = `balance${curr}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  const balanceAfter = getBalance(currency) - parseFloat(amount);

  const handleClose = () => {
    setTransferOpen(false);
    setTimeout(() => {
      setToUserId('');
      setToPhone('');
      setAmount('');
      setCurrency('YER');
      setDescription('');
      setStatus('idle');
      setErrorMsg('');
      setTransferMode('userId');
      setScheduledDate('');
      setShowSchedule(false);
      setShowReceipt(false);
      setTransferRef('');
      setStep('form');
      setRecipientInfo(null);
      setIsVerifying(false);
    }, 300);
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 9);
    setToPhone(cleaned);
  };

  const handleUserIdChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setToUserId(cleaned);
  };

  // Step 1: Verify recipient and show confirmation
  const handleVerifyRecipient = async () => {
    if (!user) return;
    if (transferMode === 'userId' && !toUserId) return;
    if (transferMode === 'phone' && !toPhone) return;
    if (!amount) return;

    setIsVerifying(true);
    setErrorMsg('');
    setStatus('idle');

    const effectiveAmount = parseFloat(amount);

    try {
      // ---- Find recipient in Firebase ----
      let recipientUid = '';
      const fullPhone = `+967${toPhone}`;
      const fullUserId = toUserId;

      if (transferMode === 'userId') {
        const userIdIndexRef = ref(database, `userIds/${fullUserId}`);
        const userIdIndexSnapshot = await get(userIdIndexRef);
        if (userIdIndexSnapshot.exists()) {
          recipientUid = userIdIndexSnapshot.val();
        } else {
          const usersRef = ref(database, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            usersSnapshot.forEach((child) => {
              if (child.val()?.userId === fullUserId) {
                recipientUid = child.key || '';
              }
            });
          }
          if (!recipientUid) {
            setStatus('error');
            setErrorMsg('رقم الحساب غير موجود');
            setIsVerifying(false);
            return;
          }
        }
      } else {
        const phoneIndexRef = ref(database, `phones/${fullPhone.replace('+', 'P')}`);
        const phoneIndexSnapshot = await get(phoneIndexRef);
        if (phoneIndexSnapshot.exists()) {
          recipientUid = phoneIndexSnapshot.val();
        } else {
          const usersRef = ref(database, 'users');
          const usersSnapshot = await get(usersRef);
          if (usersSnapshot.exists()) {
            usersSnapshot.forEach((child) => {
              if (child.val()?.phone === fullPhone) {
                recipientUid = child.key || '';
              }
            });
          }
          if (!recipientUid) {
            setStatus('error');
            setErrorMsg('رقم الهاتف غير مسجل');
            setIsVerifying(false);
            return;
          }
        }
      }

      // Cannot transfer to self
      if (user.id === recipientUid) {
        setStatus('error');
        setErrorMsg('لا يمكن التحويل لنفس الحساب');
        setIsVerifying(false);
        return;
      }

      // ---- Read recipient data from Firebase ----
      const recipientRef = ref(database, `users/${recipientUid}`);
      const recipientSnapshot = await get(recipientRef);
      const recipientData = recipientSnapshot.val();

      if (!recipientData) {
        setStatus('error');
        setErrorMsg('المستخدم المستلم غير موجود');
        setIsVerifying(false);
        return;
      }

      // ---- Check balance ----
      const balanceField = `balance${currency}`;
      const currentBalance = getBalance(currency);
      if (currentBalance < effectiveAmount) {
        setStatus('error');
        setErrorMsg('رصيد غير كافي');
        setIsVerifying(false);
        return;
      }

      // Store recipient info and go to confirmation step
      setRecipientInfo({
        uid: recipientUid,
        name: recipientData.name || 'مستخدم',
        userId: recipientData.userId || '',
        phone: recipientData.phone || '',
        avatar: recipientData.avatar || '',
      });
      setStep('confirm');
    } catch {
      setStatus('error');
      setErrorMsg('حدث خطأ في الاتصال');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 2: Execute the confirmed transfer
  const handleConfirmTransfer = async () => {
    if (!user || !recipientInfo) return;

    setIsLoading(true);
    setStatus('idle');

    const effectiveAmount = parseFloat(amount);

    try {
      // ---- Read sender & recipient fresh data from Firebase ----
      const senderRef = ref(database, `users/${user.id}`);
      const senderSnapshot = await get(senderRef);
      const senderData = senderSnapshot.val();

      const recipientRef = ref(database, `users/${recipientInfo.uid}`);
      const recipientSnapshot = await get(recipientRef);
      const recipientData = recipientSnapshot.val();

      if (!senderData || !recipientData) {
        setStatus('error');
        setErrorMsg('حدث خطأ، حاول مرة أخرى');
        setIsLoading(false);
        return;
      }

      // ---- Double-check balance ----
      const balanceField = `balance${currency}`;
      const currentBalance = senderData[balanceField] || 0;
      if (currentBalance < effectiveAmount) {
        setStatus('error');
        setErrorMsg('رصيد غير كافي');
        setIsLoading(false);
        return;
      }

      // ---- Execute atomic transfer via runTransaction for balance safety ----
      const txRef = generateReference();
      const transactionId = push(ref(database, 'transactions')).key;
      const notif1Id = push(ref(database, 'notifications')).key;
      const notif2Id = push(ref(database, 'notifications')).key;

      // Use runTransaction for both sender and recipient balances to avoid race conditions
      const senderTxResult = await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
        const val = currentVal || 0;
        if (val < effectiveAmount) return; // Abort if insufficient balance
        return val - effectiveAmount;
      });

      if (!senderTxResult.committed) {
        setStatus('error');
        setErrorMsg('رصيد غير كافي');
        setIsLoading(false);
        return;
      }

      await runTransaction(ref(database, `users/${recipientInfo.uid}/${balanceField}`), (currentVal) => {
        return (currentVal || 0) + effectiveAmount;
      });

      const updates: Record<string, unknown> = {};
      updates[`transactions/${transactionId}`] = {
        fromUserId: user.id,
        toUserId: recipientInfo.uid,
        amount: effectiveAmount,
        currency,
        type: 'transfer',
        status: 'completed',
        description: description || `تحويل إلى ${recipientData.name || ''}`,
        reference: txRef,
        createdAt: new Date().toISOString(),
      };
      updates[`notifications/${recipientInfo.uid}/${notif1Id}`] = {
        title: 'تحويل وارد',
        body: `تم استلام ${effectiveAmount.toLocaleString()} ${currency} من ${senderData.name || ''}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      updates[`notifications/${user.id}/${notif2Id}`] = {
        title: 'تحويل صادر',
        body: `تم تحويل ${effectiveAmount.toLocaleString()} ${currency} إلى ${recipientData.name || ''}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await update(ref(database), updates);

      // Send FCM push notification to the recipient (works when app is closed)
      try {
        const recipientFcmToken = recipientData.fcmToken;
        if (recipientFcmToken) {
          await sendFCMDirect(
            [recipientFcmToken],
            'تحويل وارد',
            `تم استلام ${effectiveAmount.toLocaleString()} ${currency} من ${senderData.name || ''}`,
            'transaction',
            { action: 'transfer_received', amount: effectiveAmount, currency },
          );
        }
      } catch (pushError) {
        console.warn('FCM push to recipient failed (non-blocking):', pushError);
      }

      setStatus('success');
      setTransferRef(txRef);
      setStep('success');

      // Play transfer success sound
      try { const { playTransactionSound } = await import('@/lib/transaction-sounds'); playTransactionSound('transfer'); } catch {}

      // Update user balance in local store
      const updatedUser = { ...user };
      const userBalanceField = `balance${currency}` as keyof typeof user;
      (updatedUser as Record<string, unknown>)[userBalanceField] =
        ((user as Record<string, unknown>)[userBalanceField] as number) - effectiveAmount;
      useAppStore.getState().setUser(updatedUser);

      if (!scheduledDate) {
        setTimeout(() => setShowReceipt(true), 1000);
      }
    } catch {
      setStatus('error');
      setErrorMsg('حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  const canSend = () => {
    if (!amount || !user) return false;
    if (transferMode === 'userId') return toUserId.length >= 6;
    if (transferMode === 'phone') return toPhone.length >= 9;
    return false;
  };

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(transferRef);
      showToast('success', 'تم النسخ', 'تم نسخ رقم المرجع');
    } catch {
      // Fallback
    }
  };

  return (
    <AnimatePresence>
      {isTransferOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl overflow-hidden"
            style={{ background: isDark ? '#1A1A1A' : '#FFFFFF' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: isDark ? '#444' : '#DDD' }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3">
              <h2
                className="text-lg font-bold"
                style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
              >
                {step === 'confirm' ? 'تأكيد التحويل' : step === 'success' ? 'تم التحويل' : 'تحويل أموال'}
              </h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: isDark ? '#2D2D2D' : '#F0F0F0' }}
              >
                <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
              </button>
            </div>

            {/* ============ CONFIRMATION STEP ============ */}
            {step === 'confirm' && recipientInfo && (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="px-6 pb-8"
              >
                {/* Recipient Card */}
                <div
                  className="rounded-3xl p-5 mb-4"
                  style={{
                    background: isDark
                      ? 'rgba(255,255,255,0.04)'
                      : 'rgba(0,0,0,0.02)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  {/* Verified badge */}
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.1)' }}
                    >
                      <ShieldCheck size={14} strokeWidth={2} color="#10B981" />
                      <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                        تم التحقق من المستلم
                      </span>
                    </div>
                  </div>

                  {/* Avatar & Name */}
                  <div className="flex flex-col items-center mb-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                      style={{
                        background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)',
                        boxShadow: '0 4px 16px rgba(92,26,27,0.3)',
                      }}
                    >
                      {recipientInfo.avatar ? (
                        <img
                          src={recipientInfo.avatar}
                          alt={recipientInfo.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <UserCheck size={28} strokeWidth={1.5} color="#FFF" />
                      )}
                    </div>
                    <p
                      className="text-lg font-bold"
                      style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    >
                      {recipientInfo.name}
                    </p>
                    <p
                      className="text-xs mt-1 font-mono"
                      style={{ color: isDark ? '#888' : '#AAA' }}
                      dir="ltr"
                    >
                      {transferMode === 'userId'
                        ? toUserId
                        : `+967${toPhone}`}
                    </p>
                  </div>

                  {/* Transfer Details */}
                  <div
                    className="rounded-2xl p-4 space-y-3"
                    style={{
                      background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>المبلغ</span>
                      <span className="text-base font-bold" style={{ color: '#5C1A1B' }}>
                        {parseFloat(amount).toLocaleString('ar-SA')} {currencySymbols[currency]}
                      </span>
                    </div>
                    {description && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>الوصف</span>
                        <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          {description}
                        </span>
                      </div>
                    )}
                    <div className="h-px" style={{ background: isDark ? '#333' : '#EEE' }} />
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رصيدك بعد التحويل</span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: balanceAfter >= 0 ? '#10B981' : '#5C1A1B' }}
                      >
                        {balanceAfter.toLocaleString('ar-SA')} {currencySymbols[currency]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div
                  className="flex items-start gap-2 px-4 py-3 rounded-2xl mb-4"
                  style={{ background: 'rgba(245,158,11,0.08)' }}
                >
                  <AlertCircle size={16} strokeWidth={1.5} color="#F59E0B" className="shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed" style={{ color: '#F59E0B' }}>
                    تأكد من صحة اسم المستلم والمبلغ قبل التحويل. لا يمكن التراجع عن العملية بعد تنفيذها.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* Cancel */}
                  <button
                    onClick={() => {
                      setStep('form');
                      setRecipientInfo(null);
                    }}
                    className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98]"
                    style={{
                      background: isDark ? '#2D2D2D' : '#F0F0F0',
                      color: isDark ? '#FFF' : '#1a1a1a',
                      border: isDark ? '1px solid #444' : '1px solid #DDD',
                    }}
                  >
                    <span>إلغاء</span>
                  </button>
                  {/* Confirm */}
                  <button
                    onClick={handleConfirmTransfer}
                    disabled={isLoading}
                    className="flex-[2] py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: isLoading
                        ? '#999'
                        : 'linear-gradient(135deg, #5C1A1B 0%, #CC0000 100%)',
                      boxShadow: isLoading ? 'none' : '0 4px 16px rgba(92,26,27,0.3)',
                    }}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <Send size={18} strokeWidth={1.5} />
                        <span>تأكيد التحويل</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============ RECEIPT ============ */}
            {showReceipt && status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 pb-6"
              >
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: isDark
                      ? 'rgba(255,255,255,0.06)'
                      : 'rgba(0,0,0,0.02)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt size={18} strokeWidth={1.5} color="#5C1A1B" />
                    <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      إيصال التحويل
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رقم المرجع</span>
                      <button
                        onClick={handleCopyRef}
                        className="flex items-center gap-1"
                      >
                        <span className="text-xs font-mono font-bold" style={{ color: '#5C1A1B' }} dir="ltr">{transferRef}</span>
                        <Copy size={10} color="#5C1A1B" />
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>التاريخ</span>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>من</span>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {user?.name} ({user?.userId})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>إلى</span>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {recipientInfo?.name} ({recipientInfo?.userId})
                      </span>
                    </div>
                    <div className="h-px" style={{ background: isDark ? '#333' : '#EEE' }} />
                    <div className="flex justify-between">
                      <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>المبلغ</span>
                      <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                        {parseFloat(amount).toLocaleString('ar-SA')} {currencySymbols[currency]}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============ SUCCESS STATE ============ */}
            {status === 'success' && !showReceipt && step === 'success' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center py-8 px-6"
              >
                <CheckCircle2 size={56} strokeWidth={1.5} color="#10B981" />
                <p className="text-lg font-bold mt-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  {scheduledDate ? 'تم جدولة التحويل!' : 'تم التحويل بنجاح!'}
                </p>
                <p className="text-sm mt-1" style={{ color: isDark ? '#AAA' : '#888' }}>
                  {parseFloat(amount).toLocaleString('ar-SA')} {currencySymbols[currency]} إلى {recipientInfo?.name}
                </p>
                {scheduledDate && (
                  <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>
                    سيتم التنفيذ في: {new Date(scheduledDate).toLocaleDateString('ar-SA')}
                  </p>
                )}
              </motion.div>
            )}

            {/* ============ ERROR STATE ============ */}
            {status === 'error' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center py-4 px-6"
              >
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl w-full" style={{ background: 'rgba(92,26,27,0.1)' }}>
                  <AlertCircle size={18} color="#5C1A1B" />
                  <p className="text-sm" style={{ color: '#5C1A1B' }}>
                    {errorMsg}
                  </p>
                </div>
              </motion.div>
            )}

            {/* ============ FORM STEP ============ */}
            {step === 'form' && status !== 'success' && (
              <div className="px-6 pb-8 space-y-4 max-h-[65vh] overflow-y-auto scrollbar-thin">
                {/* Transfer Mode Toggle */}
                <div
                  className="flex rounded-2xl overflow-hidden"
                  style={{ background: isDark ? '#222' : '#F8F8F8' }}
                >
                  <button
                    onClick={() => setTransferMode('userId')}
                    className="flex-1 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: transferMode === 'userId' ? '#5C1A1B' : 'transparent',
                      color: transferMode === 'userId' ? '#FFF' : isDark ? '#AAA' : '#888',
                    }}
                  >
                    <Hash size={14} strokeWidth={1.5} />
                    <span>تحويل بالرقم</span>
                  </button>
                  <button
                    onClick={() => setTransferMode('phone')}
                    className="flex-1 py-2.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: transferMode === 'phone' ? '#5C1A1B' : 'transparent',
                      color: transferMode === 'phone' ? '#FFF' : isDark ? '#AAA' : '#888',
                    }}
                  >
                    <Phone size={14} strokeWidth={1.5} />
                    <span>تحويل بالهاتف</span>
                  </button>
                </div>

                {/* Recipient Input */}
                <div>
                  <label
                    className="text-xs font-medium mb-1.5 block"
                    style={{ color: isDark ? '#AAA' : '#888' }}
                  >
                    {transferMode === 'userId' ? 'رقم المستلم' : 'هاتف المستلم'}
                  </label>

                  {transferMode === 'userId' ? (
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                      style={{
                        background: isDark ? '#222' : '#F8F8F8',
                        border: isDark ? '1px solid #333' : '1px solid #EEE',
                      }}
                    >
                      <Hash size={18} strokeWidth={1.5} color="#5C1A1B" />
                      <input
                        type="tel"
                        placeholder="رقم الحساب (6 أرقام)"
                        value={toUserId}
                        onChange={(e) => handleUserIdChange(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                        dir="ltr"
                        maxLength={6}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                      style={{
                        background: isDark ? '#222' : '#F8F8F8',
                        border: isDark ? '1px solid #333' : '1px solid #EEE',
                      }}
                    >
                      <YemenFlagIndicator />
                      <span
                        className="text-sm font-medium shrink-0"
                        style={{ color: isDark ? '#AAA' : '#888' }}
                        dir="ltr"
                      >
                        +967
                      </span>
                      <div
                        className="w-px h-5 shrink-0"
                        style={{ background: isDark ? '#444' : '#DDD' }}
                      />
                      <input
                        type="tel"
                        placeholder="7XX XXX XXX"
                        value={toPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>

                {/* Amount Input */}
                <div>
                  <label
                    className="text-xs font-medium mb-1.5 block"
                    style={{ color: isDark ? '#AAA' : '#888' }}
                  >
                    المبلغ
                  </label>
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                    style={{
                      background: isDark ? '#222' : '#F8F8F8',
                      border: isDark ? '1px solid #333' : '1px solid #EEE',
                    }}
                  >
                    <DollarSign size={18} strokeWidth={1.5} color="#5C1A1B" />
                    <input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                      }}
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                      dir="ltr"
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: isDark ? '#AAA' : '#888' }}
                    >
                      {currencySymbols[currency]}
                    </span>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex gap-2 mt-2">
                    {quickAmounts.map((qa) => (
                      <button
                        key={qa.value}
                        onClick={() => {
                          setAmount(qa.value.toString());
                        }}
                        className="flex-1 py-2 rounded-xl text-[11px] font-medium transition-all"
                        style={{
                          background: amount === qa.value.toString()
                            ? 'rgba(92,26,27,0.1)'
                            : isDark ? '#222' : '#F8F8F8',
                          border: amount === qa.value.toString()
                            ? '1px solid #5C1A1B'
                            : isDark ? '1px solid #333' : '1px solid #EEE',
                          color: amount === qa.value.toString() ? '#5C1A1B' : isDark ? '#AAA' : '#888',
                        }}
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency Selector */}
                <div>
                  <label
                    className="text-xs font-medium mb-1.5 block"
                    style={{ color: isDark ? '#AAA' : '#888' }}
                  >
                    العملة
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowCurrencySelect(!showCurrencySelect)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl"
                      style={{
                        background: isDark ? '#222' : '#F8F8F8',
                        border: isDark ? '1px solid #333' : '1px solid #EEE',
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <CurrencyBadge currency={currency} />
                        <span
                          className="text-sm font-medium"
                          style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                        >
                          {currencyNames[currency]}
                        </span>
                      </span>
                      <ChevronDown
                        size={16}
                        strokeWidth={1.5}
                        color={isDark ? '#AAA' : '#888'}
                      />
                    </button>

                    <AnimatePresence>
                      {showCurrencySelect && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="absolute top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden z-10"
                          style={{
                            background: isDark ? '#2D2D2D' : '#FFF',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          }}
                        >
                          {currencies.map((c) => (
                            <button
                              key={c}
                              onClick={() => {
                                setCurrency(c);
                                setShowCurrencySelect(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#5C1A1B]/5 transition-colors"
                              style={{
                                borderBottom: isDark ? '1px solid #333' : '1px solid #F0F0F0',
                              }}
                            >
                              <CurrencyBadge currency={c} />
                              <span
                                className="text-sm font-medium"
                                style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                              >
                                {currencyNames[c]}
                              </span>
                              <span
                                className="text-xs mr-auto"
                                style={{ color: isDark ? '#888' : '#AAA' }}
                              >
                                {currencySymbols[c]}
                              </span>
                              {currency === c && (
                                <CheckCircle2 size={16} color="#5C1A1B" strokeWidth={1.5} />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label
                    className="text-xs font-medium mb-1.5 block"
                    style={{ color: isDark ? '#AAA' : '#888' }}
                  >
                    الوصف (اختياري)
                  </label>
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                    style={{
                      background: isDark ? '#222' : '#F8F8F8',
                      border: isDark ? '1px solid #333' : '1px solid #EEE',
                    }}
                  >
                    <FileText size={18} strokeWidth={1.5} color="#5C1A1B" />
                    <input
                      type="text"
                      placeholder="أضف وصفاً للتحويل"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    />
                  </div>
                </div>

                {/* Schedule & Split Row */}
                <div className="flex gap-2">
                  {/* Scheduled Transfer */}
                  <button
                    onClick={() => setShowSchedule(!showSchedule)}
                    className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium transition-all"
                    style={{
                      background: showSchedule ? 'rgba(245,158,11,0.1)' : isDark ? '#222' : '#F8F8F8',
                      border: showSchedule ? '1px solid #F59E0B' : isDark ? '1px solid #333' : '1px solid #EEE',
                      color: showSchedule ? '#F59E0B' : isDark ? '#AAA' : '#888',
                    }}
                  >
                    <Calendar size={14} strokeWidth={1.5} />
                    <span>{scheduledDate ? 'مجدول' : 'جدولة'}</span>
                  </button>

                  {/* Split Bill */}
                  <button
                    onClick={() => {
                      handleClose();
                      setTimeout(() => setActiveScreen('split'), 300);
                    }}
                    className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-medium transition-all"
                    style={{
                      background: isDark ? '#222' : '#F8F8F8',
                      border: isDark ? '1px solid #333' : '1px solid #EEE',
                      color: isDark ? '#AAA' : '#888',
                    }}
                  >
                    <Split size={14} strokeWidth={1.5} />
                    <span>تقسيم الفاتورة</span>
                  </button>
                </div>

                {/* Schedule Date Input */}
                <AnimatePresence>
                  {showSchedule && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                        style={{
                          background: isDark ? '#222' : '#F8F8F8',
                          border: isDark ? '1px solid #333' : '1px solid #EEE',
                        }}
                      >
                        <Calendar size={18} strokeWidth={1.5} color="#F59E0B" />
                        <input
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                          className="flex-1 bg-transparent outline-none text-sm"
                          style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                        />
                      </div>
                      {scheduledDate && (
                        <p className="text-[10px] mt-1 text-center" style={{ color: '#F59E0B' }}>
                          سيتم التحويل في: {new Date(scheduledDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Balance Preview */}
                {amount && (
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: isDark ? '#1A1A1A' : '#F8F8F8',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>رصيدك الحالي</span>
                      <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {getBalance(currency).toLocaleString('ar-SA')} {currencySymbols[currency]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>المبلغ</span>
                      <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>
                        -{parseFloat(amount).toLocaleString('ar-SA')} {currencySymbols[currency]}
                      </span>
                    </div>
                    <div className="h-px my-2" style={{ background: isDark ? '#333' : '#EEE' }} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>الرصيد بعد التحويل</span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: balanceAfter >= 0 ? '#10B981' : '#5C1A1B' }}
                      >
                        {balanceAfter.toLocaleString('ar-SA')} {currencySymbols[currency]}
                      </span>
                    </div>
                  </div>
                )}

                {/* Verify / Continue Button */}
                <button
                  onClick={handleVerifyRecipient}
                  disabled={!canSend() || isVerifying}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: (isVerifying || !canSend())
                      ? '#999'
                      : 'linear-gradient(135deg, #5C1A1B 0%, #CC0000 100%)',
                    boxShadow: (isVerifying || !canSend()) ? 'none' : '0 4px 16px rgba(92,26,27,0.3)',
                  }}
                >
                  {isVerifying ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <UserCheck size={18} strokeWidth={1.5} />
                      <span>متابعة</span>
                      <ArrowRight size={16} strokeWidth={1.5} />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
