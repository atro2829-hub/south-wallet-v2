'use client';

import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  HandCoins,
  Smartphone,
  QrCode,
  Receipt,
  Banknote,
  X,
  TrendingUp,
  Tag,
  Headphones,
  PiggyBank,
  ArrowDownToLine,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

const quickActions = [
  { id: 'transfer', label: 'تحويل', icon: Send, color: '#5C1A1B' },
  { id: 'request', label: 'طلب أموال', icon: HandCoins, color: '#8B5CF6' },
  { id: 'recharge', label: 'شحن رصيد', icon: Smartphone, color: '#F59E0B' },
  { id: 'qr', label: 'مسح QR', icon: QrCode, color: '#3B82F6' },
  { id: 'bills', label: 'دفع فواتير', icon: Receipt, color: '#EC4899' },
  { id: 'deposit', label: 'إيداع', icon: Banknote, color: '#14B8A6' },
  { id: 'withdraw', label: 'سحب', icon: ArrowDownToLine, color: '#F97316' },
  { id: 'savings', label: 'أهداف ادخار', icon: PiggyBank, color: '#06B6D4' },
  { id: 'exchange', label: 'أسعار الصرف', icon: TrendingUp, color: '#10B981' },
  { id: 'promo', label: 'أكواد الخصم', icon: Tag, color: '#6366F1' },
  { id: 'support', label: 'الدعم', icon: Headphones, color: '#8B5CF6' },
  { id: 'close', label: 'إغلاق', icon: X, color: '#666' },
];

export default function QuickActionDrawer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isDrawerOpen, setDrawerOpen, setTransferOpen, setRequestMoneyOpen, featureFlags } = useAppStore();

  // Filter quick actions based on feature flags
  const filteredActions = quickActions.filter(action => {
    if (action.id === 'transfer' && !featureFlags.transfersEnabled) return false;
    if (action.id === 'qr' && !featureFlags.qrPaymentsEnabled) return false;
    if (action.id === 'recharge' && !featureFlags.rechargeEnabled) return false;
    if (action.id === 'bills' && !featureFlags.billsEnabled) return false;
    if (action.id === 'deposit' && !featureFlags.depositsEnabled) return false;
    if (action.id === 'withdraw' && !featureFlags.withdrawalsEnabled) return false;
    if (action.id === 'exchange' && !featureFlags.exchangeEnabled) return false;
    if (action.id === 'promo' && !featureFlags.giftCodesEnabled) return false;
    return true;
  });

  const handleClose = () => {
    setDrawerOpen(false);
  };

  const handleAction = (actionId: string) => {
    handleClose();
    if (actionId === 'transfer') {
      setTimeout(() => setTransferOpen(true), 300);
    } else if (actionId === 'request') {
      setTimeout(() => setRequestMoneyOpen(true), 300);
    } else if (actionId === 'recharge' || actionId === 'bills') {
      setTimeout(() => useAppStore.getState().setActiveTab('services'), 300);
    } else if (actionId === 'close') {
      // Already closed
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
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

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: isDark ? 'rgba(26,26,26,0.9)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: isDark ? '#444' : '#DDD' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3">
              <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>إجراءات سريعة</h2>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: isDark ? 'rgba(45,45,45,0.6)' : 'rgba(245,245,245,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
              </button>
            </div>

            {/* 4-column Grid */}
            <div className="grid grid-cols-4 gap-3 px-5 pb-8">
              {filteredActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.04, duration: 0.3, type: 'spring', stiffness: 300 }}
                    onClick={() => handleAction(action.id)}
                    className="flex flex-col items-center gap-2.5 py-4 px-1 rounded-2xl card-press"
                    style={{
                      background: isDark ? 'rgba(34,34,34,0.6)' : 'rgba(248,248,248,0.8)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
                    }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${action.color}15`,
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <Icon size={20} strokeWidth={1.5} color={action.color} />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight" style={{ color: isDark ? '#CCC' : '#555' }}>
                      {action.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
