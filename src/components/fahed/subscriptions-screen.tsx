'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Crown,
  CreditCard,
  ArrowDownUp,
  Calendar,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

type SubTab = 'subscriptions' | 'payments' | 'withdraw';

const sampleSubscriptions = [
  { id: '1', name: 'Netflix', days: 15, price: 11400, currency: 'ر.ي', iconBg: '#000', iconText: 'N', iconColor: '#5C1A1B' },
  { id: '2', name: 'Spotify', days: 30, price: 5500, currency: 'ر.ي', iconBg: '#1DB954', iconText: 'S', iconColor: '#FFF' },
  { id: '3', name: 'YouTube Premium', days: 7, price: 3200, currency: 'ر.ي', iconBg: '#FF0000', iconText: 'Y', iconColor: '#FFF' },
];

export default function SubscriptionsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen } = useAppStore();
  const [activeTab, setActiveTab] = useState<SubTab>('subscriptions');

  const tabs: { id: SubTab; label: string }[] = [
    { id: 'subscriptions', label: 'اشتراكات' },
    { id: 'payments', label: 'المدفوعات' },
    { id: 'withdraw', label: 'سحب' },
  ];

  return (
    <div className="min-h-screen pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveScreen('main')}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>اشتراكاتي</h1>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-4 mt-2">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: activeTab === tab.id
                  ? (isDark ? 'rgba(92,26,27,0.15)' : 'rgba(92,26,27,0.08)')
                  : (isDark ? '#1A1A1A' : '#F5F5F5'),
                color: activeTab === tab.id ? '#5C1A1B' : (isDark ? '#888' : '#AAA'),
                border: activeTab === tab.id ? '1px solid rgba(92,26,27,0.2)' : `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subscription List */}
      <div className="px-4 mt-4 space-y-3">
        {sampleSubscriptions.map((sub, index) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: sub.iconBg }}
            >
              <span className="text-lg font-bold" style={{ color: sub.iconColor }}>{sub.iconText}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                اشتراك لـ {sub.days} أيام
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#666' : '#AAA' }}>
                {sub.name}
              </p>
            </div>
            <div className="text-left shrink-0">
              <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                {sub.price.toLocaleString()} {sub.currency}
              </p>
              <button
                className="flex items-center gap-1 mt-1"
                style={{ color: isDark ? '#888' : '#AAA' }}
              >
                <Info size={10} />
                <span className="text-[10px]">تفاصيل</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state for other tabs */}
      {activeTab !== 'subscriptions' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-6"
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
              <Crown size={28} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
            </div>
            <p className="text-sm mt-3 font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>
              لا توجد بيانات
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
