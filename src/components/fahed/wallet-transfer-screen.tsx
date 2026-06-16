'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Info,
  Smartphone,
  Wallet,
  AlertTriangle,
  ChevronDown,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatNumber, currencySymbols, currencyBadgeColors, generateReference } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, set, get, runTransaction } from 'firebase/database';
import YemeniPhoneInput from '@/components/fahed/yemeni-phone-input';

// Supported Yemeni wallets
const yemeniWallets = [
  { id: 'fulusk', name: 'فلوسك', nameEn: 'Fulusk', color: '#FF6B00', fee: 1.5, deliveryTime: '1-5 دقائق' },
  { id: 'jaib', name: 'جيب', nameEn: 'Jaib', color: '#2563EB', fee: 1.0, deliveryTime: 'فوري' },
  { id: 'tamnya', name: 'تمنية', nameEn: 'Tamnya', color: '#059669', fee: 1.5, deliveryTime: '1-3 دقائق' },
  { id: 'mobile-cash', name: 'موبايل كاش', nameEn: 'Mobile Cash', color: '#8B5CF6', fee: 2.0, deliveryTime: '5-15 دقيقة' },
  { id: 'cash-yemen', name: 'كاش يمن', nameEn: 'Cash Yemen', color: '#EC4899', fee: 1.5, deliveryTime: '3-10 دقائق' },
];

type TransferStep = 'select-wallet' | 'enter-details' | 'confirm' | 'success';

export default function WalletTransferScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, addTransaction, addNotification, setUser } = useAppStore();

  const [step, setStep] = useState<TransferStep>('select-wallet');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [copied, setCopied] = useState(false);

  const selectedWallet = yemeniWallets.find(w => w.id === selectedWalletId);
  const amountNum = parseFloat(amount) || 0;
  const feePercent = selectedWallet?.fee || 0;
  const feeAmount = Math.round(amountNum * feePercent / 100);
  const totalAmount = amountNum + feeAmount;

  const getBalance = (curr: string): number => {
    if (!user) return 0;
    const field = `balance${curr}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  const currentBalance = getBalance(currency);
  const balanceAfter = currentBalance - totalAmount;

  const handleSelectWallet = (walletId: string) => {
    setSelectedWalletId(walletId);
    setStep('enter-details');
  };

  const handleProceedToConfirm = () => {
    if (!amountNum || amountNum <= 0 || !recipientPhone || balanceAfter < 0) return;
    setStep('confirm');
  };

  const handleConfirmTransfer = async () => {
    if (!user || !selectedWallet || !amountNum) return;

    setIsProcessing(true);
    try {
      const txId = generateReference();
      const newBalance = currentBalance - totalAmount;

      // Create transaction record
      const tx = {
        id: txId,
        fromUserId: user.id,
        toUserId: `wallet:${selectedWallet.id}`,
        amount: amountNum,
        currency,
        type: 'transfer' as const,
        status: 'completed' as const,
        description: `تحويل إلى ${selectedWallet.name} - ${recipientPhone}`,
        createdAt: new Date().toISOString(),
      };

      // Save to Firebase
      try {
        await set(ref(database, `transactions/${txId}`), tx);
        // Use runTransaction to avoid race conditions on balance
        await runTransaction(ref(database, `users/${user.id}/balance${currency}`), (currentVal) => {
          return (currentVal || 0) - totalAmount;
        });
      } catch {}

      // Update local state
      addTransaction(tx);
      addNotification({
        id: generateReference(),
        title: 'تم التحويل بنجاح',
        body: `تم تحويل ${formatNumber(amountNum)} ${currencySymbols[currency]} إلى ${selectedWallet.name}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      if (user) {
        const updatedUser = { ...user, [`balance${currency}`]: newBalance };
        setUser(updatedUser);
      }

      setTransactionId(txId);
      setStep('success');
    } catch (error) {
      console.error('Error processing transfer:', error);
    }
    setIsProcessing(false);
  };

  const handleCopyTxId = () => {
    navigator.clipboard.writeText(transactionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReset = () => {
    setStep('select-wallet');
    setSelectedWalletId('');
    setRecipientPhone('');
    setAmount('');
    setCurrency('YER');
    setTransactionId('');
  };

  // Glass card style
  const glassCard = {
    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
  };

  const innerBg = isDark ? '#1A1A1A' : '#F8F8F8';
  const subTextColor = isDark ? '#888' : '#AAA';

  return (
    <div className="min-h-screen pb-6" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => useAppStore.getState().setActiveScreen('main')} className="w-10 h-10 rounded-2xl flex items-center justify-center glass">
            <ArrowRight size={18} strokeWidth={1.5} style={{ color: isDark ? '#FFF' : '#333' }} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تحويل لمحافظ يمنية</h1>
            <p className="text-[10px]" style={{ color: subTextColor }}>فلوسك، جيب، تمنية وأكثر</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.12)' }}>
            <ArrowRightLeft size={18} color="#5C1A1B" strokeWidth={1.5} />
          </div>
        </div>
      </motion.div>

      <div className="px-5 mt-2">
        <AnimatePresence mode="wait">
          {/* Step 1: Select Wallet */}
          {step === 'select-wallet' && (
            <motion.div key="select-wallet" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="rounded-2xl p-4" style={glassCard}>
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone size={16} color="#5C1A1B" strokeWidth={1.5} />
                  <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>اختر المحفظة الوجهة</span>
                </div>
                <div className="space-y-2">
                  {yemeniWallets.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectWallet(wallet.id)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all"
                      style={{ background: `${wallet.color}08`, border: `1px solid ${wallet.color}15` }}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${wallet.color}15` }}>
                        <span className="text-xs font-bold" style={{ color: wallet.color }}>{wallet.nameEn[0]}</span>
                      </div>
                      <div className="text-right flex-1">
                        <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{wallet.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px]" style={{ color: subTextColor }}>{wallet.nameEn}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${wallet.color}12`, color: wallet.color }}>
                            عمولة {wallet.fee}%
                          </span>
                          <span className="text-[10px]" style={{ color: subTextColor }}>{wallet.deliveryTime}</span>
                        </div>
                      </div>
                      <ArrowRight size={16} color={wallet.color} strokeWidth={1.5} style={{ transform: 'rotate(180deg)' }} />
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Enter Details */}
          {step === 'enter-details' && selectedWallet && (
            <motion.div key="enter-details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3">
              {/* Selected wallet banner */}
              <div className="rounded-2xl p-4" style={{ background: `linear-gradient(145deg, ${selectedWallet.color}15, ${selectedWallet.color}08)`, border: `1px solid ${selectedWallet.color}20` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${selectedWallet.color}20` }}>
                    <span className="text-xs font-bold" style={{ color: selectedWallet.color }}>{selectedWallet.nameEn[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: selectedWallet.color }}>تحويل إلى {selectedWallet.name}</p>
                    <p className="text-[10px]" style={{ color: subTextColor }}>عمولة {selectedWallet.fee}% • {selectedWallet.deliveryTime}</p>
                  </div>
                  <button onClick={() => { setStep('select-wallet'); setSelectedWalletId(''); }} className="text-[10px] font-medium" style={{ color: selectedWallet.color }}>تغيير</button>
                </div>
              </div>

              {/* Recipient Phone */}
              <YemeniPhoneInput
                value={recipientPhone}
                onChange={setRecipientPhone}
                label="رقم هاتف المستقبل في المحفظة"
                showProvider={true}
                showValidation={true}
              />

              {/* Amount Input */}
              <div className="rounded-2xl p-4" style={glassCard}>
                <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>المبلغ</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="flex-1 bg-transparent outline-none text-2xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as 'YER' | 'SAR' | 'USD')}
                    className="px-3 py-2 rounded-lg text-xs font-bold outline-none" style={{ background: `${currencyBadgeColors[currency]}15`, color: currencyBadgeColors[currency] }}>
                    <option value="YER">ر.ي</option>
                    <option value="SAR">ر.س</option>
                    <option value="USD">$</option>
                  </select>
                </div>
                {/* Quick amount buttons */}
                <div className="flex gap-2 mt-3">
                  {[1000, 2000, 5000, 10000].map(a => (
                    <button key={a} onClick={() => setAmount(String(a))}
                      className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
                      style={{ background: amount === String(a) ? '#5C1A1B' : innerBg, color: amount === String(a) ? '#FFF' : (isDark ? '#CCC' : '#666') }}>
                      {a.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee calculation */}
              {amountNum > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4" style={glassCard}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: subTextColor }}>المبلغ</span>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(amountNum)} {currencySymbols[currency]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: subTextColor }}>العمولة ({feePercent}%)</span>
                      <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>{formatNumber(feeAmount)} {currencySymbols[currency]}</span>
                    </div>
                    <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإجمالي</span>
                      <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{formatNumber(totalAmount)} {currencySymbols[currency]}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px]" style={{ color: subTextColor }}>رصيدك الحالي</span>
                      <span className="text-[10px] font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(currentBalance)} {currencySymbols[currency]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: subTextColor }}>الرصيد بعد التحويل</span>
                      <span className="text-[10px] font-bold" style={{ color: balanceAfter >= 0 ? '#10B981' : '#5C1A1B' }}>
                        {formatNumber(Math.max(0, balanceAfter))} {currencySymbols[currency]}
                      </span>
                    </div>
                  </div>
                  {balanceAfter < 0 && (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-xl" style={{ background: 'rgba(92,26,27,0.08)' }}>
                      <AlertTriangle size={12} color="#5C1A1B" />
                      <span className="text-[10px]" style={{ color: '#5C1A1B' }}>الرصيد غير كافي</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Delivery time estimate */}
              <div className="rounded-2xl p-3" style={glassCard}>
                <div className="flex items-center gap-2">
                  <Clock size={14} color="#10B981" strokeWidth={1.5} />
                  <span className="text-[10px]" style={{ color: subTextColor }}>مدة التوصيل المتوقعة:</span>
                  <span className="text-[10px] font-bold" style={{ color: '#10B981' }}>{selectedWallet.deliveryTime}</span>
                </div>
              </div>

              {/* Proceed button */}
              <button
                onClick={handleProceedToConfirm}
                disabled={!amountNum || amountNum <= 0 || !recipientPhone || balanceAfter < 0}
                className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{ background: amountNum > 0 && recipientPhone && balanceAfter >= 0 ? '#5C1A1B' : (isDark ? '#1A1A1A' : '#EEE'), color: amountNum > 0 && recipientPhone && balanceAfter >= 0 ? '#FFF' : (isDark ? '#444' : '#AAA'), boxShadow: amountNum > 0 ? '0 4px 16px rgba(92,26,27,0.3)' : 'none' }}>
                <Send size={16} strokeWidth={2} /> متابعة
              </button>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && selectedWallet && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3">
              <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)' }}>
                <div className="text-center">
                  <p className="text-white/50 text-[10px]">المبلغ الإجمالي</p>
                  <p className="text-white text-3xl font-bold">{formatNumber(totalAmount)} {currencySymbols[currency]}</p>
                </div>
              </div>

              <div className="rounded-2xl p-4" style={glassCard}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المحفظة الوجهة</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${selectedWallet.color}15` }}>
                        <span className="text-[7px] font-bold" style={{ color: selectedWallet.color }}>{selectedWallet.nameEn[0]}</span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{selectedWallet.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>رقم المستقبل</span>
                    <span className="text-xs font-medium font-mono" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{recipientPhone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المبلغ</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(amountNum)} {currencySymbols[currency]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>العمولة</span>
                    <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>{formatNumber(feeAmount)} {currencySymbols[currency]}</span>
                  </div>
                  <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>مدة التوصيل</span>
                    <span className="text-xs font-bold" style={{ color: '#10B981' }}>{selectedWallet.deliveryTime}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('enter-details')} className="flex-1 py-4 rounded-2xl text-sm font-bold" style={{ background: innerBg, color: isDark ? '#FFF' : '#1a1a1a' }}>
                  رجوع
                </button>
                <button onClick={handleConfirmTransfer} disabled={isProcessing}
                  className="flex-1 py-4 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: '#5C1A1B', boxShadow: '0 4px 16px rgba(92,26,27,0.3)' }}>
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle2 size={16} strokeWidth={2} /> تأكيد التحويل</>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && selectedWallet && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="flex flex-col items-center pt-6">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <CheckCircle2 size={40} strokeWidth={2} color="#10B981" />
                </motion.div>
                <h2 className="text-xl font-bold mb-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تم التحويل بنجاح!</h2>
                <p className="text-sm" style={{ color: subTextColor }}>تم تحويل {formatNumber(amountNum)} {currencySymbols[currency]} إلى {selectedWallet.name}</p>
              </div>

              <div className="rounded-2xl p-4" style={glassCard}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>رقم المرجع</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium font-mono" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{transactionId}</span>
                      <button onClick={handleCopyTxId} className="p-1 rounded">
                        {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} color={subTextColor} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المحفظة</span>
                    <span className="text-xs font-medium" style={{ color: selectedWallet.color }}>{selectedWallet.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المبلغ</span>
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(amountNum)} {currencySymbols[currency]}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>الحالة</span>
                    <span className="text-xs font-bold" style={{ color: '#10B981' }}>مكتمل</span>
                  </div>
                </div>
              </div>

              {/* Transaction tracking note */}
              <div className="rounded-2xl p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div className="flex items-center gap-2">
                  <Clock size={14} color="#10B981" strokeWidth={1.5} />
                  <span className="text-[10px]" style={{ color: '#10B981' }}>يمكنك متابعة حالة التحويل من سجل المعاملات</span>
                </div>
              </div>

              <button onClick={handleReset} className="w-full py-4 rounded-2xl text-sm font-bold text-white" style={{ background: '#5C1A1B', boxShadow: '0 4px 16px rgba(92,26,27,0.3)' }}>
                تحويل آخر
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
