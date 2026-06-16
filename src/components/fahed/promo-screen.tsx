'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Tag, Copy, CheckCircle2, XCircle, Percent,
  Gift, Clock, Check, AlertCircle, Hash, Calendar, Loader2, Wallet
} from 'lucide-react';
import { useAppStore, type PromoCode, type GiftCode } from '@/lib/store';
import { currencySymbols, currencyNames, currencyBadgeColors, timeAgo } from '@/lib/utils';
import { ref, onValue, get, update, runTransaction } from 'firebase/database';
import { database } from '@/lib/firebase';

export default function PromoScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, promoCodes, applyPromoCode, redeemGiftCode, addNotification, user } = useAppStore();

  const [activeTab, setActiveTab] = useState<'promo' | 'gift'>('promo');
  const [codeInput, setCodeInput] = useState('');
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string; discount?: number; discountType?: string } | null>(null);
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [giftResult, setGiftResult] = useState<{ success: boolean; message: string; amount?: number; currency?: string } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [appliedHistory, setAppliedHistory] = useState<{ code: string; discount: number; type: string; date: string }[]>([]);
  const [giftHistory, setGiftHistory] = useState<{ code: string; amount: number; currency: string; date: string }[]>([]);

  // Firebase promo codes
  const [firebaseCodes, setFirebaseCodes] = useState<PromoCode[]>([]);
  // Firebase gift codes
  const [firebaseGiftCodes, setFirebaseGiftCodes] = useState<GiftCode[]>([]);

  useEffect(() => {
    const codesRef = ref(database, 'promo-codes');
    const unsubscribe = onValue(codesRef, (snapshot) => {
      if (snapshot.exists()) {
        setFirebaseCodes(Object.values(snapshot.val()) as PromoCode[]);
      } else {
        setFirebaseCodes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const giftCodesRef = ref(database, 'giftCodes');
    const unsubscribe = onValue(giftCodesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const codes = Object.keys(data).map(key => ({
          ...data[key],
          code: data[key].code || key,
          id: data[key].id || key,
        })) as GiftCode[];
        setFirebaseGiftCodes(codes);
      } else {
        setFirebaseGiftCodes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const allCodes = [...firebaseCodes, ...promoCodes].filter(
    (code, index, self) => index === self.findIndex(c => c.id === code.id)
  );
  const activeCodes = allCodes.filter(c => c.isActive && c.usedCount < c.maxUses && new Date(c.expiresAt) > new Date());
  const activeGiftCodes = firebaseGiftCodes.filter(c => c.isActive && c.usedCount < c.maxUses && new Date(c.expiresAt) > new Date());

  const handleApplyCode = async () => {
    if (!codeInput.trim()) return;
    const result = await applyPromoCode(codeInput.trim());
    if (result) {
      const discountText = result.type === 'percentage' ? `${result.discount}%` : `${result.discount} ${currencySymbols[result.currency]}`;
      setApplyResult({ success: true, message: `تم تطبيق الخصم بنجاح`, discount: result.discount, discountType: discountText });
      setAppliedHistory(prev => [{ code: result.code, discount: result.discount, type: result.type, date: new Date().toISOString() }, ...prev]);
      // Add notification
      if (user) {
        addNotification({
          id: `promo-${Date.now()}`, title: 'تم تطبيق كود الخصم', body: `كود ${result.code}: خصم ${discountText}`,
          type: 'promo', isRead: false, createdAt: new Date().toISOString()
        });
      }
      setCodeInput('');
    } else {
      setApplyResult({ success: false, message: 'الكود غير صالح أو منتهي الصلاحية' });
    }
  };

  const handleRedeemGiftCode = async () => {
    if (!giftCodeInput.trim()) return;
    setIsRedeeming(true);
    setGiftResult(null);
    try {
      // First try user gift codes
      const userGiftCodesRef = ref(database, 'userGiftCodes');
      const userCodesSnapshot = await get(userGiftCodesRef);
      
      if (userCodesSnapshot.exists()) {
        const data = userCodesSnapshot.val();
        const matchedCode = Object.keys(data).find(key => 
          data[key].code?.toUpperCase() === giftCodeInput.trim().toUpperCase() && data[key].status === 'active'
        );
        
        if (matchedCode) {
          const codeData = data[matchedCode];
          
          // Check if user is trying to redeem their own code
          if (codeData.creatorUid === user?.id) {
            setGiftResult({ success: false, message: 'لا يمكنك استرداد قسيمة أنشأتها بنفسك' });
            setIsRedeeming(false);
            return;
          }
          
          // Redeem the user gift code
          const updates: Record<string, unknown> = {};
          updates[`userGiftCodes/${matchedCode}/status`] = 'redeemed';
          updates[`userGiftCodes/${matchedCode}/redeemedBy`] = user?.id;
          updates[`userGiftCodes/${matchedCode}/redeemedAt`] = new Date().toISOString();

          // Add balance to user via runTransaction to avoid race conditions
          const balanceField = codeData.currency === 'YER' ? 'balanceYER' : codeData.currency === 'SAR' ? 'balanceSAR' : 'balanceUSD';
          const currentBalance = (user?.[balanceField] as number) || 0;
          await runTransaction(ref(database, `users/${user?.id}/${balanceField}`), (currentVal) => {
            return (currentVal || 0) + codeData.amount;
          });

          // Add transaction
          const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          updates[`transactions/${txId}`] = {
            id: txId,
            fromUserId: codeData.creatorUid,
            toUserId: user?.id,
            amount: codeData.amount,
            currency: codeData.currency,
            type: 'deposit',
            status: 'completed',
            description: `استرداد قسيمة هدية من ${codeData.creatorName}`,
            createdAt: new Date().toISOString(),
          };

          await update(ref(database), updates);
          
          // Send FCM push notification for gift code redemption
          try {
            const { notifyGiftCodeRedeemed } = await import('@/lib/notifications');
            await notifyGiftCodeRedeemed(user?.id || '', codeData.amount, codeData.currency, giftCodeInput.trim());
          } catch (notifErr) {
            console.warn('Gift code notification failed:', notifErr);
          }
          
          setGiftResult({ 
            success: true, 
            message: `تم استرداد قسيمة الهدية بنجاح! تم إضافة ${codeData.amount} ${currencySymbols[codeData.currency]} إلى رصيدك`,
            amount: codeData.amount,
            currency: codeData.currency
          });
          setGiftHistory(prev => [{ code: giftCodeInput.trim().toUpperCase(), amount: codeData.amount, currency: codeData.currency, date: new Date().toISOString() }, ...prev]);
          setGiftCodeInput('');
          setIsRedeeming(false);
          return;
        }
      }
      
      // Fall back to admin gift codes
      const result = await redeemGiftCode(giftCodeInput.trim());
      setGiftResult(result);
      if (result.success) {
        setGiftHistory(prev => [{ code: giftCodeInput.trim().toUpperCase(), amount: result.amount || 0, currency: result.currency || 'YER', date: new Date().toISOString() }, ...prev]);
        setGiftCodeInput('');
      }
    } catch (error) {
      setGiftResult({ success: false, message: 'حدث خطأ، يرجى المحاولة لاحقاً' });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
        <div className="absolute inset-0 glass-dark opacity-30" />
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveScreen('main')} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">الأكواد والهدايا</h1>
              <p className="text-white/40 text-xs">وفر أكثر مع محفظة الجنوب</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.2)' }}>
              {activeTab === 'promo' ? <Tag size={20} strokeWidth={1.5} color="#5C1A1B" /> : <Gift size={20} strokeWidth={1.5} color="#5C1A1B" />}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="px-5 mt-4">
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
          <button
            onClick={() => setActiveTab('promo')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200"
            style={{
              background: activeTab === 'promo' ? '#5C1A1B' : 'transparent',
              color: activeTab === 'promo' ? '#FFF' : (isDark ? '#999' : '#666'),
              boxShadow: activeTab === 'promo' ? '0 4px 12px rgba(92,26,27,0.3)' : 'none',
            }}
          >
            <Tag size={16} />
            <span className="text-sm font-bold">أكواد الخصم</span>
          </button>
          <button
            onClick={() => setActiveTab('gift')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-200"
            style={{
              background: activeTab === 'gift' ? '#5C1A1B' : 'transparent',
              color: activeTab === 'gift' ? '#FFF' : (isDark ? '#999' : '#666'),
              boxShadow: activeTab === 'gift' ? '0 4px 12px rgba(92,26,27,0.3)' : 'none',
            }}
          >
            <Gift size={16} />
            <span className="text-sm font-bold">أكواد الهدايا</span>
          </button>
        </div>
      </div>

      <div className="px-5 mt-4 pb-8 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'promo' ? (
            <motion.div
              key="promo-tab"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Apply Promo Code Section */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Percent size={16} color="#5C1A1B" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تطبيق كود خصم</h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <Hash size={14} color={isDark ? '#555' : '#AAA'} />
                    <input type="text" placeholder="أدخل الكود هنا..." value={codeInput} onChange={e => { setCodeInput(e.target.value.toUpperCase()); setApplyResult(null); }}
                      className="flex-1 bg-transparent outline-none text-sm font-mono" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" />
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleApplyCode}
                    className="px-5 py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>
                    تطبيق
                  </motion.button>
                </div>

                {/* Result */}
                <AnimatePresence>
                  {applyResult && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{
                        background: applyResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(92,26,27,0.1)',
                        border: applyResult.success ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(92,26,27,0.2)',
                      }}>
                        {applyResult.success ? (
                          <CheckCircle2 size={18} color="#10B981" />
                        ) : (
                          <XCircle size={18} color="#5C1A1B" />
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: applyResult.success ? '#10B981' : '#5C1A1B' }}>{applyResult.message}</p>
                          {applyResult.discountType && (
                            <p className="text-lg font-bold mt-0.5" style={{ color: '#10B981' }}>خصم {applyResult.discountType}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Available Promo Codes */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Percent size={16} color="#5C1A1B" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الأكواد المتاحة</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full mr-auto" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>{activeCodes.length} كود</span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                  {activeCodes.map((code) => (
                    <div key={code.id} className="rounded-xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRight: '3px solid #5C1A1B' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-mono font-bold" style={{ color: '#5C1A1B' }} dir="ltr">{code.code}</span>
                          <motion.button whileTap={{ scale: 0.8 }} onClick={() => handleCopyCode(code.code)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                            {copiedCode === code.code ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#5C1A1B" />}
                          </motion.button>
                        </div>
                        <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>
                          {code.type === 'percentage' ? `${code.discount}%` : `${code.discount} ${currencySymbols[code.currency]}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors[code.currency]}12`, color: currencyBadgeColors[code.currency] }}>
                          {currencyNames[code.currency]}
                        </span>
                        <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                          {code.type === 'percentage' ? 'خصم نسبة' : 'خصم ثابت'}
                        </span>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: isDark ? '#666' : '#AAA' }}>
                          <Calendar size={8} />
                          {new Date(code.expiresAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min((code.usedCount / code.maxUses) * 100, 100)}%`, background: '#5C1A1B' }} />
                        </div>
                        <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>متبقي {code.maxUses - code.usedCount}</span>
                      </div>
                    </div>
                  ))}

                  {activeCodes.length === 0 && (
                    <div className="flex flex-col items-center py-6">
                      <Tag size={36} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                      <p className="text-xs mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد أكواد خصم متاحة حالياً</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Applied History */}
              {appliedHistory.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} color="#10B981" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الأكواد المطبقة</h3>
                  </div>
                  <div className="space-y-2">
                    {appliedHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} color="#10B981" />
                          <span className="text-xs font-mono font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{h.code}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                            {h.type === 'percentage' ? `${h.discount}%` : `${h.discount}`}
                          </span>
                          <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(h.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="gift-tab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Redeem Gift Code Section */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Gift size={16} color="#5C1A1B" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>استرداد كود هدية</h3>
                </div>
                <p className="text-xs mb-3" style={{ color: isDark ? '#888' : '#999' }}>أدخل كود الهدية لإضافة الرصيد مباشرة إلى حسابك</p>

                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <Hash size={14} color={isDark ? '#555' : '#AAA'} />
                    <input type="text" placeholder="أدخل كود الهدية..." value={giftCodeInput} onChange={e => { setGiftCodeInput(e.target.value.toUpperCase()); setGiftResult(null); }}
                      className="flex-1 bg-transparent outline-none text-sm font-mono" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" disabled={isRedeeming} />
                  </div>
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleRedeemGiftCode} disabled={isRedeeming}
                    className="px-5 py-3 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: isRedeeming ? '#666' : '#5C1A1B' }}>
                    {isRedeeming ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    استرداد
                  </motion.button>
                </div>

                {/* Gift Result */}
                <AnimatePresence>
                  {giftResult && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{
                        background: giftResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(92,26,27,0.1)',
                        border: giftResult.success ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(92,26,27,0.2)',
                      }}>
                        {giftResult.success ? (
                          <CheckCircle2 size={18} color="#10B981" />
                        ) : (
                          <XCircle size={18} color="#5C1A1B" />
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-medium" style={{ color: giftResult.success ? '#10B981' : '#5C1A1B' }}>{giftResult.message}</p>
                          {giftResult.success && giftResult.amount && (
                            <div className="flex items-center gap-2 mt-1">
                              <Wallet size={16} color="#10B981" />
                              <span className="text-lg font-bold" style={{ color: '#10B981' }}>
                                +{giftResult.amount} {giftResult.currency === 'YER' ? 'ر.ي' : giftResult.currency === 'SAR' ? 'ر.س' : '$'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* How Gift Codes Work */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} color="#5C1A1B" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>كيف تعمل أكواد الهدايا؟</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { step: '1', text: 'أدخل كود الهدية الذي حصلت عليه' },
                    { step: '2', text: 'سيتم التحقق من صلاحية الكود' },
                    { step: '3', text: 'سيتم إضافة المبلغ مباشرة إلى رصيدك' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white" style={{ background: '#5C1A1B' }}>
                        {item.step}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>{item.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Available Gift Codes (visible ones only) */}
              {activeGiftCodes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Gift size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أكواد هدايا متاحة</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full mr-auto" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>{activeGiftCodes.length} كود</span>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
                    {activeGiftCodes.map((code) => (
                      <div key={code.id} className="rounded-xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRight: '3px solid #10B981' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-mono font-bold" style={{ color: '#10B981' }} dir="ltr">{code.code}</span>
                            <motion.button whileTap={{ scale: 0.8 }} onClick={() => handleCopyCode(code.code)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                              {copiedCode === code.code ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#10B981" />}
                            </motion.button>
                          </div>
                          <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                            +{code.amount} {currencySymbols[code.currency]}
                          </span>
                        </div>
                        {code.description && (
                          <p className="text-xs mb-2" style={{ color: isDark ? '#999' : '#888' }}>{code.description}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors[code.currency]}12`, color: currencyBadgeColors[code.currency] }}>
                            {currencyNames[code.currency]}
                          </span>
                          <span className="text-[10px] flex items-center gap-1" style={{ color: isDark ? '#666' : '#AAA' }}>
                            <Calendar size={8} />
                            {new Date(code.expiresAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min((code.usedCount / code.maxUses) * 100, 100)}%`, background: '#10B981' }} />
                          </div>
                          <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>متبقي {code.maxUses - code.usedCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Gift Redemption History */}
              {giftHistory.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} color="#10B981" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أكواد الهدايا المستردة</h3>
                  </div>
                  <div className="space-y-2">
                    {giftHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center gap-2">
                          <Gift size={14} color="#10B981" />
                          <span className="text-xs font-mono font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{h.code}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                            +{h.amount} {h.currency === 'YER' ? 'ر.ي' : h.currency === 'SAR' ? 'ر.س' : '$'}
                          </span>
                          <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(h.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
