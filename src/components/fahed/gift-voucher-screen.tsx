'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Gift, Copy, Check, Share2, Phone, Clock,
  XCircle, CheckCircle2, Tag, Plus, Wallet, MessageSquare, Hash, AlertCircle, Search
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, currencyNames, currencyBadgeColors, timeAgo } from '@/lib/utils';
import { ref, get, set as firebaseSet, update, onValue, off, runTransaction } from 'firebase/database';
import { database } from '@/lib/firebase';

interface UserGiftCode {
  id: string;
  code: string;
  creatorUid: string;
  creatorName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  message: string;
  status: 'active' | 'redeemed' | 'cancelled';
  createdAt: string;
  redeemedBy?: string;
  redeemedAt?: string;
}

function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function GiftVoucherScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, addNotification } = useAppStore();

  const [activeTab, setActiveTab] = useState<'create' | 'redeem' | 'my-codes'>('create');
  const [codes, setCodes] = useState<UserGiftCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create form
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<UserGiftCode | null>(null);

  // Redeem form
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch user gift codes from Firebase
  useEffect(() => {
    if (!user?.id) return;
    const codesRef = ref(database, `userGiftCodes`);
    const listener = onValue(codesRef, (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allCodes: UserGiftCode[] = Object.keys(data).map(key => ({
          ...data[key],
          id: key,
        }));
        // Filter to only show codes created by or redeemed by this user
        const myCodes = allCodes.filter(c => c.creatorUid === user.id);
        setCodes(myCodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setCodes([]);
        setIsLoading(false);
      }
    });
    return () => off(codesRef);
  }, [user?.id]);

  const handleCreateCode = async () => {
    if (!user) return;
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      addNotification({ id: `err-${Date.now()}`, title: 'خطأ', body: 'يرجى إدخال مبلغ صحيح', type: 'info', isRead: false, createdAt: new Date().toISOString() });
      return;
    }

    // Check balance
    const balanceField = currency === 'YER' ? 'balanceYER' : currency === 'SAR' ? 'balanceSAR' : 'balanceUSD';
    const currentBalance = (user[balanceField] as number) || 0;
    if (amountNum > currentBalance) {
      addNotification({ id: `err-${Date.now()}`, title: 'رصيد غير كافٍ', body: 'ليس لديك رصيد كافٍ لإنشاء هذه القسيمة', type: 'info', isRead: false, createdAt: new Date().toISOString() });
      return;
    }

    setIsCreating(true);
    try {
      const code = generateGiftCode();
      const codeId = `ugc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newCode: UserGiftCode = {
        id: codeId,
        code,
        creatorUid: user.id,
        creatorName: user.name || user.firstName || 'مستخدم',
        amount: amountNum,
        currency,
        message: message.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const updates: Record<string, unknown> = {};
      updates[`userGiftCodes/${codeId}`] = newCode;

      // Use runTransaction for balance deduction to avoid race conditions
      const txResult = await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
        const val = currentVal || 0;
        if (val < amountNum) return; // Abort if insufficient
        return val - amountNum;
      });

      // Add transaction
      const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      updates[`transactions/${txId}`] = {
        id: txId,
        fromUserId: user.id,
        toUserId: 'GIFT_CODE',
        amount: amountNum,
        currency,
        type: 'withdraw',
        status: 'completed',
        description: `إنشاء قسيمة هدية بكود ${code}`,
        createdAt: new Date().toISOString(),
      };

      await update(ref(database), updates);

      // Send FCM push notification for gift code creation
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(user.id, {
          title: 'تم إنشاء قسيمة الهدية',
          body: `تم إنشاء قسيمة بمبلغ ${amountNum} ${currencySymbols[currency]} وكود ${code}`,
          type: 'transaction',
          data: { action: 'gift_code_created', amount: String(amountNum), currency, code },
        });
      } catch (notifErr) {
        console.warn('Gift code creation notification failed:', notifErr);
      }

      setUser({ ...user, [balanceField]: txResult.committed ? txResult.snapshot.val() : currentBalance - amountNum });
      setCreatedCode(newCode);
      setAmount('');
      setMessage('');

      addNotification({
        id: `gift-created-${Date.now()}`,
        title: 'تم إنشاء قسيمة الهدية',
        body: `تم إنشاء قسيمة بمبلغ ${amountNum} ${currencySymbols[currency]} وكود ${code}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating gift code:', error);
      addNotification({ id: `err-${Date.now()}`, title: 'خطأ', body: 'حدث خطأ أثناء إنشاء القسيمة', type: 'info', isRead: false, createdAt: new Date().toISOString() });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleShareCode = (code: UserGiftCode) => {
    const text = `قسيمة هدية من محفظة الجنوب\nالكود: ${code.code}\nالمبلغ: ${code.amount} ${currencySymbols[code.currency]}\n${code.message ? 'رسالة: ' + code.message : ''}\nاستخدم الكود في تطبيق محفظة الجنوب`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  const handleShareWhatsApp = (code: UserGiftCode) => {
    const text = `قسيمة هدية من محفظة الجنوب\nالكود: ${code.code}\nالمبلغ: ${code.amount} ${currencySymbols[code.currency]}\n${code.message ? 'رسالة: ' + code.message : ''}\nاستخدم الكود في تطبيق محفظة الجنوب`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const innerBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  const activeCodes = codes.filter(c => c.status === 'active');
  const redeemedCodes = codes.filter(c => c.status === 'redeemed');

  return (
    <div className="min-h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => useAppStore.getState().setActiveScreen('main')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">قسائم الهدية</h1>
              <p className="text-white/40 text-xs">أرسل هدايا لأصدقائك وعائلتك</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.2)' }}>
              <Gift size={20} strokeWidth={1.5} color="#5C1A1B" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-5 mt-4">
        <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
          <button onClick={() => setActiveTab('create')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all duration-200" style={{ background: activeTab === 'create' ? '#5C1A1B' : 'transparent', color: activeTab === 'create' ? '#FFF' : (isDark ? '#999' : '#666'), boxShadow: activeTab === 'create' ? '0 4px 12px rgba(92,26,27,0.3)' : 'none' }}>
            <Plus size={14} />
            <span className="text-xs font-bold">إنشاء</span>
          </button>
          <button onClick={() => setActiveTab('redeem')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all duration-200" style={{ background: activeTab === 'redeem' ? '#5C1A1B' : 'transparent', color: activeTab === 'redeem' ? '#FFF' : (isDark ? '#999' : '#666'), boxShadow: activeTab === 'redeem' ? '0 4px 12px rgba(92,26,27,0.3)' : 'none' }}>
            <Hash size={14} />
            <span className="text-xs font-bold">استرداد</span>
          </button>
          <button onClick={() => setActiveTab('my-codes')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all duration-200" style={{ background: activeTab === 'my-codes' ? '#5C1A1B' : 'transparent', color: activeTab === 'my-codes' ? '#FFF' : (isDark ? '#999' : '#666'), boxShadow: activeTab === 'my-codes' ? '0 4px 12px rgba(92,26,27,0.3)' : 'none' }}>
            <Tag size={14} />
            <span className="text-xs font-bold">قسائمي</span>
          </button>
        </div>
      </div>

      <div className="px-5 mt-4 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <motion.div key="create" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {/* Created Code Success */}
              {createdCode && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={20} color="#10B981" />
                    <h3 className="text-sm font-bold" style={{ color: '#10B981' }}>تم إنشاء القسيمة بنجاح!</h3>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <span className="text-2xl font-mono font-bold tracking-wider" style={{ color: '#10B981' }} dir="ltr">{createdCode.code}</span>
                    <button onClick={() => handleCopyCode(createdCode.code)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
                      {copiedCode === createdCode.code ? <Check size={14} color="#10B981" /> : <Copy size={14} color="#10B981" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-bold" style={{ color: '#10B981' }}>{createdCode.amount} {currencySymbols[createdCode.currency]}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleShareWhatsApp(createdCode)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: 'rgba(37,211,102,0.15)' }}>
                      <Phone size={16} color="#25D366" />
                      <span className="text-xs font-medium" style={{ color: '#25D366' }}>واتساب</span>
                    </button>
                    <button onClick={() => handleShareCode(createdCode)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: 'rgba(92,26,27,0.1)' }}>
                      <Share2 size={16} color="#5C1A1B" />
                      <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>مشاركة</span>
                    </button>
                  </div>
                  <button onClick={() => setCreatedCode(null)} className="w-full py-2 mt-2 text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>
                    إنشاء قسيمة أخرى
                  </button>
                </motion.div>
              )}

              {!createdCode && (
                <>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Gift size={16} color="#5C1A1B" />
                      <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إنشاء قسيمة هدية</h3>
                    </div>

                    {/* Amount */}
                    <div className="mb-3">
                      <span className="text-[11px] font-medium block mb-1.5" style={{ color: isDark ? '#888' : '#999' }}>المبلغ</span>
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: innerBg }}>
                        <Wallet size={16} color="#5C1A1B" />
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" dir="ltr"
                          className="flex-1 bg-transparent outline-none text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                        <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{currencySymbols[currency]}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>رصيدك:</span>
                        <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                          {currency === 'YER' ? (user?.balanceYER || 0).toLocaleString() : currency === 'SAR' ? (user?.balanceSAR || 0).toLocaleString() : (user?.balanceUSD || 0).toLocaleString()} {currencySymbols[currency]}
                        </span>
                      </div>
                    </div>

                    {/* Currency Selection */}
                    <div className="mb-3">
                      <span className="text-[11px] font-medium block mb-1.5" style={{ color: isDark ? '#888' : '#999' }}>العملة</span>
                      <div className="flex gap-2">
                        {(['YER', 'SAR', 'USD'] as const).map(cur => (
                          <button key={cur} onClick={() => setCurrency(cur)}
                            className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
                            style={{
                              background: currency === cur ? `${currencyBadgeColors[cur]}15` : innerBg,
                              border: currency === cur ? `1.5px solid ${currencyBadgeColors[cur]}` : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                              color: currency === cur ? currencyBadgeColors[cur] : (isDark ? '#AAA' : '#666'),
                            }}>
                            {currency === cur && <Check size={14} strokeWidth={2} color={currencyBadgeColors[cur]} />}
                            {cur}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mb-4">
                      <span className="text-[11px] font-medium block mb-1.5" style={{ color: isDark ? '#888' : '#999' }}>رسالة (اختياري)</span>
                      <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: innerBg }}>
                        <MessageSquare size={16} color={isDark ? '#555' : '#AAA'} className="mt-0.5 shrink-0" />
                        <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="مع تحياتي..." maxLength={100}
                          className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                      </div>
                    </div>

                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleCreateCode} disabled={isCreating || !amount}
                      className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                      style={{ background: isCreating || !amount ? '#555' : 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)', boxShadow: !isCreating && amount ? '0 4px 12px rgba(92,26,27,0.3)' : 'none' }}>
                      {isCreating ? 'جارٍ الإنشاء...' : <><Plus size={16} /> إنشاء قسيمة الهدية</>}
                    </motion.button>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="rounded-2xl p-4" style={{ background: 'rgba(92,26,27,0.06)', border: '1px solid rgba(92,26,27,0.1)' }}>
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} color="#5C1A1B" className="mt-0.5 shrink-0" />
                      <p className="text-[10px] leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                        سيتم خصم المبلغ من رصيدك فوراً. يمكنك مشاركة الكود مع أي شخص وسيتم إضافة المبلغ إلى رصيده عند الاسترداد.
                      </p>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          ) : activeTab === 'redeem' ? (
            <motion.div key="redeem" initial={{ opacity: 0, x: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 0 }} className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Hash size={16} color="#5C1A1B" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>استرداد قسيمة هدية</h3>
                </div>

                <div className="mb-4">
                  <span className="text-[11px] font-medium block mb-1.5" style={{ color: isDark ? '#888' : '#999' }}>كود القسيمة</span>
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: innerBg }}>
                    <Gift size={16} color="#5C1A1B" />
                    <input type="text" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} placeholder="أدخل كود القسيمة" maxLength={8} dir="ltr"
                      className="flex-1 bg-transparent outline-none text-lg font-mono font-bold tracking-wider" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                  </div>
                </div>

                {redeemResult && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${redeemResult.success ? '' : ''}`} style={{ background: redeemResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${redeemResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    {redeemResult.success ? <CheckCircle2 size={16} color="#10B981" /> : <AlertCircle size={16} color="#EF4444" />}
                    <span className="text-xs" style={{ color: redeemResult.success ? '#10B981' : '#EF4444' }}>{redeemResult.message}</span>
                  </div>
                )}

                <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                  if (!redeemCode.trim() || !user) return;
                  setIsRedeeming(true);
                  setRedeemResult(null);
                  try {
                    // Search for the gift code in Firebase
                    const codesRef = ref(database, 'userGiftCodes');
                    const snapshot = await get(codesRef);
                    if (!snapshot.exists()) {
                      setRedeemResult({ success: false, message: 'كود القسيمة غير صالح' });
                      setIsRedeeming(false);
                      return;
                    }
                    const data = snapshot.val();
                    let foundCode: UserGiftCode | null = null;
                    let foundCodeId: string | null = null;
                    for (const [id, val] of Object.entries(data)) {
                      const code = val as UserGiftCode;
                      if (code.code === redeemCode.trim() && code.status === 'active') {
                        foundCode = { ...code, id };
                        foundCodeId = id;
                        break;
                      }
                    }
                    if (!foundCode || !foundCodeId) {
                      setRedeemResult({ success: false, message: 'كود القسيمة غير صالح أو مستخدم بالفعل' });
                      setIsRedeeming(false);
                      return;
                    }
                    if (foundCode.creatorUid === user.id) {
                      setRedeemResult({ success: false, message: 'لا يمكنك استرداد قسيمتك الخاصة' });
                      setIsRedeeming(false);
                      return;
                    }
                    const codeCurrency = foundCode.currency || 'YER';
                    const balanceField = codeCurrency === 'YER' ? 'balanceYER' : codeCurrency === 'SAR' ? 'balanceSAR' : 'balanceUSD';
                    const currentBalance = (user[balanceField] as number) || 0;
                    const updates: Record<string, unknown> = {};
                    updates[`userGiftCodes/${foundCodeId}/status`] = 'redeemed';
                    updates[`userGiftCodes/${foundCodeId}/redeemedBy`] = user.id;
                    updates[`userGiftCodes/${foundCodeId}/redeemedAt`] = new Date().toISOString();
                    // Use runTransaction for balance credit to avoid race conditions
                    const redeemTxResult = await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
                      return (currentVal || 0) + foundCode.amount;
                    });
                    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                    updates[`transactions/${txId}`] = {
                      id: txId, fromUserId: foundCode.creatorUid, toUserId: user.id,
                      amount: foundCode.amount, currency: codeCurrency, type: 'deposit',
                      status: 'completed', description: `استرداد قسيمة هدية من ${foundCode.creatorName}`,
                      createdAt: new Date().toISOString(),
                    };
                    await update(ref(database), updates);
                    setUser({ ...user, [balanceField]: redeemTxResult.committed ? redeemTxResult.snapshot.val() : currentBalance + foundCode.amount });

                    // Send FCM push notification to redeemer
                    try {
                      const { sendNotificationToUser } = await import('@/lib/notifications');
                      await sendNotificationToUser(user.id, {
                        title: 'تم استرداد القسيمة!',
                        body: `تم إضافة ${foundCode.amount} ${currencySymbols[codeCurrency]} إلى رصيدك`,
                        type: 'transaction',
                        data: { action: 'gift_code_redeemed', amount: String(foundCode.amount), currency: codeCurrency },
                      });
                      // Notify the creator that their gift code was redeemed
                      await sendNotificationToUser(foundCode.creatorUid, {
                        title: 'تم استرداد قسيمة الهدية',
                        body: `تم استرداد قسيمتك بمبلغ ${foundCode.amount} ${currencySymbols[codeCurrency]} بواسطة ${user.name || 'مستخدم'}`,
                        type: 'transaction',
                        data: { action: 'gift_code_used', amount: String(foundCode.amount), currency: codeCurrency },
                      });
                    } catch (notifErr) {
                      console.warn('Gift code redeem notification failed:', notifErr);
                    }

                    addNotification({
                      id: `gift-redeem-${Date.now()}`, title: 'تم استرداد القسيمة!',
                      body: `تم إضافة ${foundCode.amount} ${currencySymbols[codeCurrency]} إلى رصيدك`,
                      type: 'transaction', isRead: false, createdAt: new Date().toISOString(),
                    });
                    setRedeemResult({ success: true, message: `تم إضافة ${foundCode.amount} ${currencySymbols[codeCurrency]} إلى رصيدك بنجاح!` });
                    setRedeemCode('');
                  } catch (error) {
                    console.error('Error redeeming code:', error);
                    setRedeemResult({ success: false, message: 'حدث خطأ أثناء استرداد القسيمة' });
                  } finally {
                    setIsRedeeming(false);
                  }
                }} disabled={isRedeeming || !redeemCode.trim()}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: isRedeeming || !redeemCode.trim() ? '#555' : 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)', boxShadow: !isRedeeming && redeemCode.trim() ? '0 4px 12px rgba(92,26,27,0.3)' : 'none' }}>
                  {isRedeeming ? 'جارٍ الاسترداد...' : <><Gift size={16} /> استرداد القسيمة</>}
                </motion.button>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl p-4" style={{ background: 'rgba(92,26,27,0.06)', border: '1px solid rgba(92,26,27,0.1)' }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} color="#5C1A1B" className="mt-0.5 shrink-0" />
                  <p className="text-[10px] leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                    أدخل كود القسيمة المكون من 8 أحرف/أرقام. سيتم إضافة المبلغ إلى رصيدك فوراً بعد الاسترداد.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="my-codes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                      <div className="h-4 rounded w-1/2 mb-3" style={{ background: isDark ? '#222' : '#EEE' }} />
                      <div className="h-3 rounded w-3/4" style={{ background: isDark ? '#222' : '#EEE' }} />
                    </div>
                  ))}
                </div>
              ) : codes.length > 0 ? (
                <>
                  {/* Active Codes */}
                  {activeCodes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold mb-2" style={{ color: isDark ? '#888' : '#999' }}>قسائم نشطة ({activeCodes.length})</h3>
                      <div className="space-y-2">
                        {activeCodes.map(code => (
                          <div key={code.id} className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRight: '3px solid #10B981' }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-mono font-bold" style={{ color: '#10B981' }} dir="ltr">{code.code}</span>
                                <button onClick={() => handleCopyCode(code.code)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                  {copiedCode === code.code ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#10B981" />}
                                </button>
                              </div>
                              <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                                {code.amount} {currencySymbols[code.currency]}
                              </span>
                            </div>
                            {code.message && (
                              <p className="text-xs mb-2" style={{ color: isDark ? '#999' : '#888' }}>{code.message}</p>
                            )}
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors[code.currency]}12`, color: currencyBadgeColors[code.currency] }}>
                                {currencyNames[code.currency]}
                              </span>
                              <span className="text-[10px] flex items-center gap-1" style={{ color: isDark ? '#666' : '#AAA' }}>
                                <Clock size={8} />
                                {timeAgo(code.createdAt)}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => handleShareWhatsApp(code)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg" style={{ background: 'rgba(37,211,102,0.1)' }}>
                                <Phone size={12} color="#25D366" />
                                <span className="text-[10px] font-medium" style={{ color: '#25D366' }}>واتساب</span>
                              </button>
                              <button onClick={() => handleShareCode(code)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg" style={{ background: 'rgba(92,26,27,0.08)' }}>
                                <Share2 size={12} color="#5C1A1B" />
                                <span className="text-[10px] font-medium" style={{ color: '#5C1A1B' }}>مشاركة</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Redeemed Codes */}
                  {redeemedCodes.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold mb-2" style={{ color: isDark ? '#888' : '#999' }}>قسائم مستردة ({redeemedCodes.length})</h3>
                      <div className="space-y-2">
                        {redeemedCodes.map(code => (
                          <div key={code.id} className="rounded-2xl p-3 flex items-center justify-between" style={{ background: cardBg, border: `1px solid ${borderColor}`, opacity: 0.7 }}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} color="#10B981" />
                              <div>
                                <span className="text-xs font-mono font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{code.code}</span>
                                <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>{timeAgo(code.redeemedAt || code.createdAt)}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold" style={{ color: '#10B981' }}>{code.amount} {currencySymbols[code.currency]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {codes.length === 0 && (
                    <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: innerBg }}>
                        <Gift size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد قسائم</p>
                      <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>أنشئ قسيمة هدية لإرسالها لأصدقائك</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: innerBg }}>
                    <Gift size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد قسائم</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>أنشئ قسيمة هدية لإرسالها لأصدقائك</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
