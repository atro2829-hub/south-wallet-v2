'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, Clock, CheckCircle2, AlertCircle,
  Coins, BarChart3, History, Wallet, Info, ChevronDown, ChevronUp,
  Timer, X, Share2
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, formatNumber, formatBalance } from '@/lib/utils';
import { LOGO_BASE64 } from '@/lib/logo';
import { ref, get, update, set as firebaseSet, onValue, off, runTransaction } from 'firebase/database';
import { database } from '@/lib/firebase';

interface FirebaseInvestmentPlan {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  durationDays: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  profitRate: number;
  isActive: boolean;
}

interface ActiveInvestment {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  profitRate: number;
  expectedProfit: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  completedAt?: string;
  earnedSoFar?: number;
}

// Plan type display helpers
const typeLabels: Record<string, string> = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربع سنوي' };
const planColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

function formatAmount(amount: number, currency: string): string {
  if (currency === 'USD') {
    if (amount < 0.01) return '0.00';
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return amount.toLocaleString('en-US');
}

// Countdown timer component
function CountdownTimer({ endDate, onComplete }: { endDate: string; onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        onComplete();
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endDate, onComplete]);

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      {[
        { value: timeLeft.days, label: 'ي' },
        { value: timeLeft.hours, label: 'س' },
        { value: timeLeft.minutes, label: 'د' },
        { value: timeLeft.seconds, label: 'ث' },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center px-1.5 py-1 rounded-lg" style={{ background: isExpired ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)' }}>
            <span className="text-xs font-bold font-mono" style={{ color: isExpired ? '#10B981' : '#FFF' }}>
              {String(item.value).padStart(2, '0')}
            </span>
            <span className="text-[7px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</span>
          </div>
          {i < 3 && <span className="text-white/30 text-xs">:</span>}
        </div>
      ))}
    </div>
  );
}

export default function InvestmentScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, setActiveScreen, addNotification, addInvestment, updateInvestment } = useAppStore();

  const [plans, setPlans] = useState<FirebaseInvestmentPlan[]>([]);
  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestment[]>([]);
  const [investmentHistory, setInvestmentHistory] = useState<ActiveInvestment[]>([]);
  const [activeTab, setActiveTab] = useState<'plans' | 'active' | 'history'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<FirebaseInvestmentPlan | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Fetch investment plans from Firebase adminSettings/investmentPlans
  useEffect(() => {
    const plansRef = ref(database, 'adminSettings/investmentPlans');
    const unsubscribe = onValue(plansRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Firebase may store arrays as objects with numeric keys
        const plansList: FirebaseInvestmentPlan[] = Array.isArray(data)
          ? data.filter(Boolean).map((p, i) => ({ ...p, id: p.id || String(i) }))
          : Object.entries(data).map(([id, val]: [string, any]) => ({ ...val, id }));
        setPlans(plansList.filter(p => p.isActive));
      } else {
        setPlans([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user investments from Firebase
  useEffect(() => {
    if (!user?.id) return;
    const investRef = ref(database, `users/${user.id}/investments`);
    const listener = onValue(investRef, (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allInvestments = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) as ActiveInvestment[];
        const active = allInvestments.filter(inv => inv.status === 'active');
        const history = allInvestments.filter(inv => inv.status !== 'active');
        setActiveInvestments(active);
        setInvestmentHistory(history);
      } else {
        setActiveInvestments([]);
        setInvestmentHistory([]);
        setIsLoading(false);
      }
    });
    return () => off(investRef);
  }, [user?.id]);

  // Check for completed investments
  const handleInvestmentComplete = useCallback(async (investmentId: string) => {
    if (completedIds.has(investmentId) || !user) return;
    setCompletedIds(prev => new Set(prev).add(investmentId));

    const investment = activeInvestments.find(inv => inv.id === investmentId);
    if (!investment || investment.status !== 'active') return;

    const totalReturn = investment.amount + investment.expectedProfit;
    const updates: Record<string, unknown> = {};

    // Mark investment as completed
    updates[`users/${user.id}/investments/${investmentId}/status`] = 'completed';
    updates[`users/${user.id}/investments/${investmentId}/completedAt`] = new Date().toISOString();

    // Add profit + principal to user balance via runTransaction
    const balanceField = investment.currency === 'YER' ? 'balanceYER' : investment.currency === 'SAR' ? 'balanceSAR' : 'balanceUSD';

    // Add transaction
    const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    updates[`transactions/${txId}`] = {
      id: txId,
      fromUserId: 'INVESTMENT',
      toUserId: user.id,
      amount: totalReturn,
      currency: investment.currency,
      type: 'deposit',
      status: 'completed',
      description: `استرداد استثمار ${investment.planName} - ربح ${formatAmount(investment.expectedProfit, investment.currency)} ${currencySymbols[investment.currency]}`,
      createdAt: new Date().toISOString(),
    };

    try {
      // Use runTransaction for balance to avoid race conditions
      const txResult = await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
        return (currentVal || 0) + totalReturn;
      });

      // Remove balance from multi-path update since we used runTransaction
      delete updates[`users/${user.id}/${balanceField}`];

      await update(ref(database), updates);

      // Send FCM push notification for investment completion
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(user.id, {
          title: 'اكتمل الاستثمار!',
          body: `تم استرداد ${formatAmount(totalReturn, investment.currency)} ${currencySymbols[investment.currency]} من خطة ${investment.planName}`,
          type: 'transaction',
          data: { action: 'investment_completed', amount: String(totalReturn), currency: investment.currency },
        });
      } catch (notifErr) {
        console.warn('Investment completion notification failed:', notifErr);
      }

      // Update local state
      updateInvestment(investmentId, { status: 'completed', completedAt: new Date().toISOString() });
      setUser({
        ...user,
        [balanceField]: txResult.snapshot.val(),
      });

      // Show notification
      addNotification({
        id: `inv-complete-${Date.now()}`,
        title: 'اكتمل الاستثمار!',
        body: `تم استرداد ${formatAmount(totalReturn, investment.currency)} ${currencySymbols[investment.currency]} من خطة ${investment.planName}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error completing investment:', error);
    }
  }, [user, activeInvestments, completedIds, updateInvestment, setUser, addNotification]);

  const handleInvestClick = (plan: FirebaseInvestmentPlan) => {
    setSelectedPlan(plan);
    setInvestAmount(plan.minAmount.toString());
    setShowInvestModal(true);
  };

  const handleConfirmInvest = async () => {
    if (!selectedPlan || !user) return;
    const amount = parseFloat(investAmount) || 0;
    if (amount < selectedPlan.minAmount || amount > selectedPlan.maxAmount) return;

    const currency = selectedPlan.currency || 'USD';
    const balanceField = currency === 'YER' ? 'balanceYER' : currency === 'SAR' ? 'balanceSAR' : 'balanceUSD';
    const currentBalance = (user[balanceField] as number) || 0;
    if (amount > currentBalance) return;

    setIsProcessing(true);
    try {
      const investId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);
      const expectedProfit = amount * (selectedPlan.profitRate / 100) * selectedPlan.durationDays;

      const newInvestment: ActiveInvestment = {
        id: investId,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amount,
        currency: currency as 'YER' | 'SAR' | 'USD',
        profitRate: selectedPlan.profitRate,
        expectedProfit,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'active',
      };

      const updates: Record<string, unknown> = {};
      updates[`users/${user.id}/investments/${investId}`] = newInvestment;

      // Use runTransaction for balance deduction to avoid race conditions
      const txResult = await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
        const val = currentVal || 0;
        if (val < amount) return; // Abort if insufficient
        return val - amount;
      });

      const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      updates[`transactions/${txId}`] = {
        id: txId,
        fromUserId: user.id,
        toUserId: user.id,
        amount,
        currency,
        type: 'investment',
        status: 'completed',
        description: `استثمار ${formatAmount(amount, currency)} ${currencySymbols[currency]} في خطة ${selectedPlan.name}`,
        createdAt: new Date().toISOString(),
      };

      const notifId = `notif-${Date.now()}`;
      updates[`notifications/${user.id}/${notifId}`] = {
        id: notifId,
        title: 'تم الاستثمار بنجاح',
        body: `تم استثمار ${formatAmount(amount, currency)} ${currencySymbols[currency]} في خطة ${selectedPlan.name} بعائد ${selectedPlan.profitRate}%`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      await update(ref(database), updates);

      // Send FCM push notification for investment
      try {
        const { sendNotificationToUser, sendNotificationToAdmin } = await import('@/lib/notifications');
        await sendNotificationToUser(user.id, {
          title: 'تم الاستثمار بنجاح',
          body: `تم استثمار ${formatAmount(amount, currency)} ${currencySymbols[currency]} في خطة ${selectedPlan.name} بعائد ${selectedPlan.profitRate}%`,
          type: 'transaction',
          data: { action: 'investment', amount: String(amount), currency },
        });
        await sendNotificationToAdmin({
          title: 'استثمار جديد',
          body: `${user.name} استثمر ${formatAmount(amount, currency)} ${currencySymbols[currency]} في ${selectedPlan.name}`,
          type: 'transaction',
          category: 'investments',
          data: { action: 'new_investment', userId: user.id },
        });
      } catch (notifErr) {
        console.warn('Investment notification failed:', notifErr);
      }

      addInvestment(newInvestment);
      setUser({ ...user, [balanceField]: txResult.committed ? txResult.snapshot.val() : (user[balanceField] as number) - amount });
      setShowInvestModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch {
      // Error
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedBalance = selectedPlan
    ? (selectedPlan.currency === 'YER' ? (user?.balanceYER || 0) : selectedPlan.currency === 'SAR' ? (user?.balanceSAR || 0) : (user?.balanceUSD || 0))
    : 0;

  const estimatedReturn = selectedPlan
    ? (parseFloat(investAmount) || 0) * (1 + (selectedPlan.profitRate / 100) * selectedPlan.durationDays)
    : 0;
  const estimatedProfit = estimatedReturn - (parseFloat(investAmount) || 0);

  const totalEarnings = activeInvestments.reduce((sum, inv) => {
    const daysElapsed = Math.floor((Date.now() - new Date(inv.startDate).getTime()) / (1000 * 60 * 60 * 24));
    return sum + (inv.amount * (inv.profitRate / 100) * Math.min(daysElapsed, 30));
  }, 0);

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const innerBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  // Progress calculation for active investment
  const getProgress = (inv: ActiveInvestment) => {
    const start = new Date(inv.startDate).getTime();
    const end = new Date(inv.endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  return (
    <div className="min-h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #0A2A1A 0%, #0F1A0F 50%, #0F0F0F 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.2), transparent 60%)' }} />
        <div className="relative px-5 pt-4 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveScreen('main')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">الاستثمار</h1>
              <p className="text-white/40 text-xs">عوائد مضمونة • سحب مرن</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
              <TrendingUp size={20} strokeWidth={1.5} color="#10B981" />
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { currency: 'YER', balance: user?.balanceYER || 0 },
              { currency: 'SAR', balance: user?.balanceSAR || 0 },
              { currency: 'USD', balance: user?.balanceUSD || 0 },
            ].map(({ currency, balance }) => (
              <div key={currency} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{currency}</p>
                <p className="text-sm font-bold" dir="ltr" style={{ color: '#10B981' }}>{formatAmount(balance, currency)}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <div>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>استثمارات نشطة</span>
              <p className="text-sm font-bold" style={{ color: '#FFF' }}>{activeInvestments.length}</p>
            </div>
            <div>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>أرباح مكتسبة</span>
              <p className="text-sm font-bold" style={{ color: '#10B981' }}>${formatAmount(totalEarnings, 'USD')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 mt-4 mb-4">
        <div className="flex gap-2">
          {[
            { id: 'plans' as const, label: 'خطط الاستثمار', icon: BarChart3 },
            { id: 'active' as const, label: 'الاستثمارات النشطة', icon: TrendingUp },
            { id: 'history' as const, label: 'السجل', icon: History },
          ].map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all"
                style={{
                  background: isActive ? '#10B981' : (isDark ? '#1A1A1A' : '#FFFFFF'),
                  border: `1px solid ${isActive ? '#10B981' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)')}`,
                }}>
                <TabIcon size={14} color={isActive ? '#FFF' : (isDark ? '#666' : '#AAA')} />
                <span className="text-[10px] font-bold" style={{ color: isActive ? '#FFF' : (isDark ? '#666' : '#AAA') }}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-8">
        <AnimatePresence mode="wait">
          {activeTab === 'plans' && (
            <motion.div key="plans" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              {plans.length === 0 && (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: innerBg }}>
                    <TrendingUp size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد خطط استثمار متاحة</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>سيتم إضافة خطط جديدة قريباً</p>
                </div>
              )}
              {plans.map((plan, index) => {
                const color = planColors[index % planColors.length];
                const currency = plan.currency || 'USD';
                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }}
                    className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                            <TrendingUp size={18} color={color} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{plan.name}</h3>
                            <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>{typeLabels[plan.type] || plan.type} - {plan.durationDays} يوم</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-bold" style={{ color }}>{plan.profitRate}%</p>
                          <p className="text-[9px]" style={{ color: isDark ? '#666' : '#BBB' }}>عائد يومي</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-2 rounded-lg text-center" style={{ background: innerBg }}>
                          <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>الحد الأدنى</p>
                          <p className="text-xs font-bold" style={{ color: isDark ? '#CCC' : '#444' }}>{formatAmount(plan.minAmount, currency)} {currencySymbols[currency]}</p>
                        </div>
                        <div className="p-2 rounded-lg text-center" style={{ background: innerBg }}>
                          <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>الحد الأقصى</p>
                          <p className="text-xs font-bold" style={{ color: isDark ? '#CCC' : '#444' }}>{formatAmount(plan.maxAmount, currency)} {currencySymbols[currency]}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg mb-3" style={{ background: innerBg }}>
                        <Info size={12} color={isDark ? '#888' : '#AAA'} />
                        <span className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>
                          عائد إجمالي {((plan.profitRate / 100) * plan.durationDays * 100).toFixed(0)}% خلال {plan.durationDays} يوم
                        </span>
                      </div>

                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleInvestClick(plan)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: color }}>
                        استثمر الآن
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}

              <div className="rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} color="#10B981" className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold mb-1" style={{ color: '#10B981' }}>ملاحظة مهمة</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                      الاستثمار ينطوي على مخاطر. العوائد المذكورة تقديرية وليست مضمونة. يرجى الاستثمار بما يتوافق مع قدرتك المالية.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div key="active" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                      <div className="h-4 rounded w-1/2 mb-3" style={{ background: isDark ? '#222' : '#EEE' }} />
                      <div className="h-3 rounded w-3/4 mb-2" style={{ background: isDark ? '#222' : '#EEE' }} />
                      <div className="h-8 rounded w-full" style={{ background: isDark ? '#222' : '#EEE' }} />
                    </div>
                  ))}
                </div>
              ) : activeInvestments.length > 0 ? (
                <div className="space-y-3">
                  {activeInvestments.map((inv, invIdx) => {
                    const plan = plans.find(p => p.id === inv.planId);
                    const progress = getProgress(inv);
                    const daysElapsed = Math.floor((Date.now() - new Date(inv.startDate).getTime()) / (1000 * 60 * 60 * 24));
                    const dailyEarning = inv.amount * (inv.profitRate / 100);
                    const totalEarning = dailyEarning * daysElapsed;
                    const color = planColors[invIdx % planColors.length];

                    return (
                      <motion.div key={inv.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: `linear-gradient(145deg, ${color}15, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)'})`, border: `1px solid ${color}30` }}>
                        <div className="p-4">
                          {/* Header with countdown */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                                <TrendingUp size={14} color={color} />
                              </div>
                              <div>
                                <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{inv.planName}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>منذ {daysElapsed} يوم</span>
                                  <span className="w-1 h-1 rounded-full" style={{ background: color }} />
                                  <span className="text-[9px] font-bold" style={{ color }}>{progress.toFixed(0)}%</span>
                                </div>
                              </div>
                            </div>
                            <div className="px-2 py-1 rounded-md" style={{ background: `${color}15` }}>
                              <span className="text-[9px] font-bold" style={{ color }}>نشط</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${color}, ${color}CC)` }}
                            />
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="p-2 rounded-lg text-center" style={{ background: innerBg }}>
                              <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>المبلغ</p>
                              <p className="text-[11px] font-bold" style={{ color: isDark ? '#CCC' : '#444' }}>{formatAmount(inv.amount, inv.currency)}</p>
                            </div>
                            <div className="p-2 rounded-lg text-center" style={{ background: innerBg }}>
                              <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>عائد يومي</p>
                              <p className="text-[11px] font-bold" style={{ color }}>{formatAmount(dailyEarning, inv.currency)}</p>
                            </div>
                            <div className="p-2 rounded-lg text-center" style={{ background: innerBg }}>
                              <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>مكتسب</p>
                              <p className="text-[11px] font-bold" style={{ color }}>{formatAmount(totalEarning, inv.currency)}</p>
                            </div>
                          </div>

                          {/* Countdown Timer */}
                          <div className="p-2 rounded-lg" style={{ background: `${color}10` }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Timer size={12} color={color} />
                                <span className="text-[9px] font-medium" style={{ color }}>الوقت المتبقي</span>
                              </div>
                              <CountdownTimer
                                endDate={inv.endDate}
                                onComplete={() => handleInvestmentComplete(inv.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: innerBg }}>
                    <TrendingUp size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد استثمارات نشطة</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>ابدأ بالاستثمار في إحدى الخطط</p>
                  <button onClick={() => setActiveTab('plans')}
                    className="mt-3 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: '#10B981' }}>
                    عرض الخطط
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {investmentHistory.length > 0 ? (
                <div className="space-y-2">
                  {investmentHistory.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: inv.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
                          {inv.status === 'completed' ? <CheckCircle2 size={14} color="#10B981" /> : <Clock size={14} color="#F59E0B" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{inv.planName}</p>
                          <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>{formatAmount(inv.amount, inv.currency)} {currencySymbols[inv.currency]}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: inv.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: inv.status === 'completed' ? '#10B981' : '#F59E0B' }}>
                          {inv.status === 'completed' ? 'مكتمل' : inv.status === 'cancelled' ? 'ملغي' : 'منتهي'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: innerBg }}>
                    <History size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا يوجد سجل استثمارات</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>ستظهر هنا استثماراتك السابقة</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Investment Modal */}
      <AnimatePresence>
        {showInvestModal && selectedPlan && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowInvestModal(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl p-5"
              style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
              onClick={(e) => e.stopPropagation()}>
              {(() => {
                const color = planColors[plans.indexOf(selectedPlan) % planColors.length] || '#10B981';
                const currency = selectedPlan.currency || 'USD';
                return (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                        <TrendingUp size={20} color={color} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>استثمار في {selectedPlan.name}</h3>
                        <p className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>عائد يومي {selectedPlan.profitRate}% • {currency}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-medium" style={{ color: isDark ? '#888' : '#999' }}>مبلغ الاستثمار ({currency})</span>
                          <span className="text-[11px]" style={{ color: isDark ? '#666' : '#BBB' }}>
                            رصيدك: {formatAmount(selectedBalance, currency)} {currencySymbols[currency]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                          <input type="number" value={investAmount} onChange={e => setInvestAmount(e.target.value)} placeholder="0" dir="ltr"
                            className="flex-1 bg-transparent outline-none text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                          <span className="text-sm font-bold" style={{ color: '#10B981' }}>{currency}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {[selectedPlan.minAmount, selectedPlan.minAmount * 5, selectedPlan.minAmount * 10, selectedPlan.maxAmount].map((amt, i) => (
                            <button key={i} onClick={() => setInvestAmount(amt.toString())}
                              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                              style={{ background: innerBg, color: isDark ? '#CCC' : '#444' }}>
                              {formatAmount(amt, currency)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: isDark ? '#888' : '#999' }}>عائد يومي</span>
                          <span className="text-[11px] font-bold" style={{ color: '#10B981' }}>
                            {formatAmount((parseFloat(investAmount) || 0) * (selectedPlan.profitRate / 100), currency)} {currencySymbols[currency]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px]" style={{ color: isDark ? '#888' : '#999' }}>عائد إجمالي ({selectedPlan.durationDays} يوم)</span>
                          <span className="text-[11px] font-bold" style={{ color: '#10B981' }}>
                            {formatAmount(estimatedProfit, currency)} {currencySymbols[currency]}
                          </span>
                        </div>
                        <div className="h-px" style={{ background: 'rgba(16,185,129,0.2)' }} />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إجمالي الاسترداد</span>
                          <span className="text-xs font-bold" style={{ color: '#10B981' }}>{formatAmount(estimatedReturn, currency)} {currencySymbols[currency]}</span>
                        </div>
                      </div>

                      {(parseFloat(investAmount) || 0) > selectedBalance && (
                        <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(92,26,27,0.1)', border: '1px solid rgba(92,26,27,0.2)' }}>
                          <Wallet size={14} color="#5C1A1B" />
                          <span className="text-[11px] font-medium" style={{ color: '#5C1A1B' }}>رصيد {currency} غير كافي</span>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowInvestModal(false)}
                          className="flex-1 py-3 rounded-xl text-sm font-bold"
                          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }}>
                          إلغاء
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmInvest}
                          disabled={isProcessing || (parseFloat(investAmount) || 0) < selectedPlan.minAmount || (parseFloat(investAmount) || 0) > selectedBalance}
                          className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                          style={{ background: (isProcessing || (parseFloat(investAmount) || 0) < selectedPlan.minAmount || (parseFloat(investAmount) || 0) > selectedBalance) ? '#555' : color }}>
                          {isProcessing ? 'جارٍ الاستثمار...' : 'تأكيد الاستثمار'}
                        </motion.button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(16,185,129,0.95)', backdropFilter: 'blur(10px)' }}>
            <CheckCircle2 size={20} color="#FFF" />
            <p className="text-sm font-bold text-white">تم الاستثمار بنجاح!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
