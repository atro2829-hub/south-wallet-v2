'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  Target,
  Home,
  Car,
  Plane,
  GraduationCap,
  Heart,
  Star,
  Trash2,
  PiggyBank,
  CheckCircle2,
  X,
  DollarSign,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatNumber, currencySymbols, currencyBadgeColors, generateReference } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, set, remove } from 'firebase/database';

const iconOptions = [
  { id: 'house', label: 'منزل', icon: Home, color: '#5C1A1B' },
  { id: 'car', label: 'سيارة', icon: Car, color: '#3B82F6' },
  { id: 'travel', label: 'سفر', icon: Plane, color: '#10B981' },
  { id: 'education', label: 'تعليم', icon: GraduationCap, color: '#8B5CF6' },
  { id: 'wedding', label: 'زواج', icon: Heart, color: '#EC4899' },
  { id: 'custom', label: 'أخرى', icon: Star, color: '#F59E0B' },
];

function GoalIcon({ iconId, size = 18 }: { iconId: string; size?: number }) {
  const found = iconOptions.find(o => o.id === iconId);
  const Icon = found?.icon || Star;
  const color = found?.color || '#F59E0B';
  return <Icon size={size} strokeWidth={1.5} color={color} />;
}

export default function SavingsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, savingsGoals, addSavingsGoal, updateSavingsGoal } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState<string | null>(null);
  const [quickAddAmount, setQuickAddAmount] = useState('');

  // Add goal form
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrency, setGoalCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [goalIcon, setGoalIcon] = useState('house');

  const handleCreateGoal = async () => {
    if (!user || !goalName.trim() || !goalTarget) return;

    const goalId = generateReference();
    const goal = {
      id: goalId,
      name: goalName.trim(),
      targetAmount: parseFloat(goalTarget) || 0,
      currentAmount: 0,
      currency: goalCurrency,
      icon: goalIcon,
      createdAt: new Date().toISOString(),
    };

    try {
      const goalRef = ref(database, `savingsGoals/${user.id}/${goalId}`);
      await set(goalRef, goal);
    } catch (error) {
      console.error('Error saving goal:', error);
    }

    addSavingsGoal(goal);

    // Reset form
    setGoalName('');
    setGoalTarget('');
    setGoalCurrency('YER');
    setGoalIcon('house');
    setShowAddModal(false);
  };

  const handleQuickAdd = async () => {
    if (!user || !showQuickAddModal || !quickAddAmount) return;
    const amount = parseFloat(quickAddAmount);
    if (amount <= 0) return;

    const goal = savingsGoals.find(g => g.id === showQuickAddModal);
    if (!goal) return;

    // Check balance
    const balanceField = `balance${goal.currency}` as keyof typeof user;
    const currentBalance = (user[balanceField] as number) || 0;
    if (amount > currentBalance) return;

    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);

    const updates = { currentAmount: newAmount };

    try {
      const goalRef = ref(database, `savingsGoals/${user.id}/${goal.id}`);
      await set(goalRef, { ...goal, ...updates });
    } catch (error) {
      console.error('Error updating goal:', error);
    }

    updateSavingsGoal(goal.id, updates);

    // Deduct from user balance
    const updatedUser = {
      ...user,
      [balanceField]: currentBalance - amount,
    };
    useAppStore.getState().setUser(updatedUser);

    setQuickAddAmount('');
    setShowQuickAddModal(null);
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      if (user) {
        const goalRef = ref(database, `savingsGoals/${user.id}/${goalId}`);
        await remove(goalRef);
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }

    // Remove from local store by filtering
    const updatedGoals = savingsGoals.filter(g => g.id !== goalId);
    useAppStore.setState({ savingsGoals: updatedGoals });
  };

  const getBalance = (currency: string): number => {
    if (!user) return 0;
    const field = `balance${currency}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-4 pb-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => useAppStore.getState().setActiveScreen('main')}
              className="w-10 h-10 rounded-2xl flex items-center justify-center glass"
            >
              <ArrowRight size={18} strokeWidth={1.5} style={{ color: isDark ? '#FFF' : '#333' }} />
            </button>
            <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أهداف الادخار</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{
              background: '#5C1A1B',
              boxShadow: '0 2px 8px rgba(92,26,27,0.25)',
            }}
          >
            <Plus size={18} strokeWidth={2} color="#FFF" />
          </button>
        </div>
      </motion.div>

      {/* Goals List */}
      <div className="px-5 mt-2">
        {savingsGoals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-8 flex flex-col items-center mt-8"
            style={{
              background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
            }}
          >
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}>
              <PiggyBank size={40} strokeWidth={1.2} color={isDark ? '#333' : '#DDD'} />
            </div>
            <p className="text-base font-bold" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد أهداف ادخار</p>
            <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>ابدأ بتخطيط أهدافك المالية</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-6 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
              style={{ background: '#5C1A1B', color: '#FFF' }}
            >
              <Plus size={14} strokeWidth={2} />
              إضافة هدف جديد
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {savingsGoals.map((goal, index) => {
              const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const isComplete = progress >= 100;
              const iconColor = iconOptions.find(o => o.id === goal.icon)?.color || '#F59E0B';

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="rounded-2xl p-4 relative overflow-hidden"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  {/* Background decoration */}
                  <div
                    className="absolute -top-8 -left-8 w-24 h-24 rounded-full"
                    style={{ background: `${iconColor}08` }}
                  />

                  <div className="relative z-10">
                    {/* Top: Icon + Name + Delete */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{ background: `${iconColor}15` }}
                      >
                        <GoalIcon iconId={goal.icon} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          {goal.name}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white"
                            style={{ background: currencyBadgeColors[goal.currency] }}
                          >
                            {goal.currency}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: isComplete ? '#10B981' : '#5C1A1B' }}>
                            {Math.round(progress)}%
                          </span>
                          {isComplete && <CheckCircle2 size={10} color="#10B981" />}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(92,26,27,0.08)' }}
                      >
                        <Trash2 size={14} strokeWidth={1.5} color="#5C1A1B" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full overflow-hidden mb-2" style={{ background: isDark ? '#2D2D2D' : '#F0F0F0' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          background: isComplete
                            ? 'linear-gradient(90deg, #10B981, #059669)'
                            : `linear-gradient(90deg, ${iconColor}, ${iconColor}AA)`,
                        }}
                      />
                    </div>

                    {/* Amount info */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                        {formatNumber(goal.currentAmount)} / {formatNumber(goal.targetAmount)} {currencySymbols[goal.currency]}
                      </span>
                      <span className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>
                        متبقي: {formatNumber(goal.targetAmount - goal.currentAmount)} {currencySymbols[goal.currency]}
                      </span>
                    </div>

                    {/* Add amount button */}
                    {!isComplete && (
                      <button
                        onClick={() => {
                          setShowQuickAddModal(goal.id);
                          setQuickAddAmount('');
                        }}
                        className="w-full mt-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all card-press"
                        style={{
                          background: 'rgba(92,26,27,0.08)',
                          color: '#5C1A1B',
                          border: '1px solid rgba(92,26,27,0.15)',
                        }}
                      >
                        <Plus size={12} strokeWidth={2} />
                        إضافة مبلغ
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
              style={{ background: isDark ? '#1A1A1A' : '#FFF' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>هدف ادخار جديد</h2>
                <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? '#2D2D2D' : '#F5F5F5' }}>
                  <X size={16} strokeWidth={1.5} color={isDark ? '#AAA' : '#666'} />
                </button>
              </div>

              {/* Goal Name */}
              <div className="mb-3">
                <label className="text-xs font-medium block mb-1.5" style={{ color: isDark ? '#AAA' : '#666' }}>اسم الهدف</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="مثال: شراء سيارة"
                  className="w-full bg-transparent outline-none text-sm p-3 rounded-xl"
                  style={{
                    color: isDark ? '#FFF' : '#1a1a1a',
                    background: isDark ? '#222' : '#F8F8F8',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                />
              </div>

              {/* Target Amount */}
              <div className="mb-3">
                <label className="text-xs font-medium block mb-1.5" style={{ color: isDark ? '#AAA' : '#666' }}>المبلغ المستهدف</label>
                <input
                  type="number"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent outline-none text-lg font-bold p-3 rounded-xl"
                  style={{
                    color: isDark ? '#FFF' : '#1a1a1a',
                    background: isDark ? '#222' : '#F8F8F8',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                  dir="ltr"
                />
              </div>

              {/* Currency */}
              <div className="mb-3">
                <label className="text-xs font-medium block mb-1.5" style={{ color: isDark ? '#AAA' : '#666' }}>العملة</label>
                <div className="flex gap-2">
                  {(['YER', 'SAR', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => setGoalCurrency(curr)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: goalCurrency === curr ? currencyBadgeColors[curr] : (isDark ? '#222' : '#F5F5F5'),
                        color: goalCurrency === curr ? '#FFF' : (isDark ? '#AAA' : '#666'),
                      }}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div className="mb-5">
                <label className="text-xs font-medium block mb-1.5" style={{ color: isDark ? '#AAA' : '#666' }}>الأيقونة</label>
                <div className="grid grid-cols-3 gap-2">
                  {iconOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setGoalIcon(opt.id)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                        style={{
                          background: goalIcon === opt.id ? `${opt.color}15` : (isDark ? '#222' : '#F8F8F8'),
                          border: goalIcon === opt.id ? `1px solid ${opt.color}30` : '1px solid transparent',
                        }}
                      >
                        <Icon size={18} strokeWidth={1.5} color={opt.color} />
                        <span className="text-[10px] font-medium" style={{ color: isDark ? '#CCC' : '#666' }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateGoal}
                disabled={!goalName.trim() || !goalTarget}
                className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                style={{
                  background: goalName.trim() && goalTarget ? '#5C1A1B' : (isDark ? '#222' : '#EEE'),
                  color: goalName.trim() && goalTarget ? '#FFF' : (isDark ? '#444' : '#AAA'),
                  boxShadow: goalName.trim() && goalTarget ? '0 4px 16px rgba(92,26,27,0.3)' : 'none',
                }}
              >
                <Target size={16} strokeWidth={2} />
                إنشاء الهدف
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showQuickAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowQuickAddModal(null)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-md rounded-t-3xl p-5 pb-8"
              style={{ background: isDark ? '#1A1A1A' : '#FFF' }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const goal = savingsGoals.find(g => g.id === showQuickAddModal);
                if (!goal) return null;
                const availableBalance = getBalance(goal.currency);
                const remaining = goal.targetAmount - goal.currentAmount;

                return (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إضافة مبلغ - {goal.name}</h2>
                      <button onClick={() => setShowQuickAddModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? '#2D2D2D' : '#F5F5F5' }}>
                        <X size={16} strokeWidth={1.5} color={isDark ? '#AAA' : '#666'} />
                      </button>
                    </div>

                    {/* Available balance */}
                    <div
                      className="rounded-xl p-3 mb-4 flex items-center justify-between"
                      style={{
                        background: isDark ? '#222' : '#F8F8F8',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      }}
                    >
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>الرصيد المتاح</span>
                      <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {formatNumber(availableBalance)} {currencySymbols[goal.currency]}
                      </span>
                    </div>

                    {/* Remaining */}
                    <div
                      className="rounded-xl p-3 mb-4 flex items-center justify-between"
                      style={{
                        background: 'rgba(92,26,27,0.06)',
                        border: '1px solid rgba(92,26,27,0.1)',
                      }}
                    >
                      <span className="text-xs" style={{ color: '#5C1A1B' }}>المتبقي للهدف</span>
                      <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                        {formatNumber(remaining)} {currencySymbols[goal.currency]}
                      </span>
                    </div>

                    {/* Amount input */}
                    <div className="mb-4">
                      <label className="text-xs font-medium block mb-1.5" style={{ color: isDark ? '#AAA' : '#666' }}>المبلغ</label>
                      <input
                        type="number"
                        value={quickAddAmount}
                        onChange={(e) => setQuickAddAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent outline-none text-2xl font-bold p-3 rounded-xl"
                        style={{
                          color: isDark ? '#FFF' : '#1a1a1a',
                          background: isDark ? '#222' : '#F8F8F8',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        }}
                        dir="ltr"
                      />
                    </div>

                    {/* Quick amount buttons */}
                    <div className="flex gap-2 mb-5">
                      {[1000, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setQuickAddAmount(amt.toString())}
                          className="flex-1 py-2 rounded-xl text-xs font-medium"
                          style={{
                            background: isDark ? '#222' : '#F5F5F5',
                            color: isDark ? '#CCC' : '#666',
                          }}
                        >
                          {formatNumber(amt)}
                        </button>
                      ))}
                    </div>

                    {/* Submit */}
                    <button
                      onClick={handleQuickAdd}
                      disabled={!quickAddAmount || parseFloat(quickAddAmount) <= 0 || parseFloat(quickAddAmount) > availableBalance}
                      className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{
                        background: quickAddAmount && parseFloat(quickAddAmount) > 0 && parseFloat(quickAddAmount) <= availableBalance
                          ? '#5C1A1B'
                          : (isDark ? '#222' : '#EEE'),
                        color: quickAddAmount && parseFloat(quickAddAmount) > 0 && parseFloat(quickAddAmount) <= availableBalance
                          ? '#FFF'
                          : (isDark ? '#444' : '#AAA'),
                        boxShadow: quickAddAmount && parseFloat(quickAddAmount) > 0 && parseFloat(quickAddAmount) <= availableBalance
                          ? '0 4px 16px rgba(92,26,27,0.3)'
                          : 'none',
                      }}
                    >
                      <DollarSign size={16} strokeWidth={2} />
                      إضافة المبلغ
                    </button>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
