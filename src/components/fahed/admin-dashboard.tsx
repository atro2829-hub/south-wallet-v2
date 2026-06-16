'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowDownCircle,
  TrendingUp,
  Bell,
  Clock,
  Eye,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { formatNumber } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { Order } from '@/lib/store';

interface AdminDashboardProps {
  onNavigate: (screen: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, language, isRTL } = useTranslation();
  const { user } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [revenueChart, setRevenueChart] = useState<{ day: string; amount: number }[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingKyc, setPendingKyc] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<{ id: string; type: string; message: string; time: string; screen: string; severity: 'high' | 'medium' | 'low' }[]>([]);

  // Listen to Firebase data
  useEffect(() => {
    // Users count
    const usersRef = ref(database, 'users');
    const unsub1 = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersList = Object.values(data) as any[];
        setTotalUsers(usersList.length);
        setPendingKyc(usersList.filter((u: any) => u.kycStatus === 'submitted').length);

        // Build alerts
        const alerts: { id: string; type: string; message: string; time: string; screen: string; severity: 'high' | 'medium' | 'low' }[] = [];
        const kycUsers = usersList.filter((u: any) => u.kycStatus === 'submitted');
        if (kycUsers.length > 0) {
          alerts.push({
            id: 'kyc',
            type: 'kyc',
            message: `${kycUsers.length} ${t('admin.pendingKyc')}`,
            time: new Date().toISOString(),
            screen: 'admin',
            severity: 'medium',
          });
        }
        setRecentAlerts(alerts);
      }
    });

    // Orders
    const ordersRef = ref(database, 'orders');
    const unsub2 = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const ordersList = Object.values(data) as Order[];
        setPendingOrders(ordersList.filter(o => o.status === 'pending').length);

        // Today's revenue
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const todayOrders = ordersList.filter(o => o.status === 'completed' && new Date(o.createdAt).getTime() >= todayStart);
        const rev = todayOrders.filter(o => o.currency === 'YER').reduce((s, o) => s + o.amount, 0);
        setTodayRevenue(rev);

        // Revenue chart - last 7 days
        const days: { day: string; amount: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayStr = d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'short' });
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          const dayEnd = dayStart + 86400000;
          const dayRev = ordersList
            .filter(o => o.status === 'completed' && new Date(o.createdAt).getTime() >= dayStart && new Date(o.createdAt).getTime() < dayEnd)
            .filter(o => o.currency === 'YER')
            .reduce((s, o) => s + o.amount, 0);
          days.push({ day: dayStr, amount: dayRev });
        }
        setRevenueChart(days);

        // Add pending order alerts
        const recentPending = ordersList
          .filter(o => o.status === 'pending')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 2);
        recentPending.forEach(o => {
          setRecentAlerts(prev => {
            if (prev.some(a => a.id === `order-${o.id}`)) return prev;
            return [...prev, {
              id: `order-${o.id}`,
              type: 'order',
              message: `${t('admin.pendingOrder')}: ${o.packageName} - ${o.userName}`,
              time: o.createdAt,
              screen: 'admin',
              severity: 'high',
            }].slice(0, 5);
          });
        });
      }
    });

    // Deposits
    const depRef = ref(database, 'depositRequests');
    const unsub3 = onValue(depRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const deps = Object.values(data) as any[];
        const pending = deps.filter(d => d.status === 'pending').length;
        setPendingDeposits(pending);

        if (pending > 0) {
          setRecentAlerts(prev => {
            if (prev.some(a => a.id === 'deposits')) return prev;
            return [{
              id: 'deposits',
              type: 'deposit',
              message: `${pending} ${t('admin.pendingDeposits')}`,
              time: new Date().toISOString(),
              screen: 'admin',
              severity: 'high',
            }, ...prev].slice(0, 5);
          });
        }
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [language, t]);

  // Sparkline rendering
  const maxAmount = Math.max(...revenueChart.map(d => d.amount), 1);
  const sparklineWidth = 200;
  const sparklineHeight = 36;
  const points = revenueChart.map((d, i) => {
    const x = (i / (revenueChart.length - 1 || 1)) * sparklineWidth;
    const y = sparklineHeight - (d.amount / maxAmount) * sparklineHeight;
    return `${x},${y}`;
  }).join(' ');

  // Alert severity colors
  const severityConfig = {
    high: { bg: 'rgba(92,26,27,0.12)', border: 'rgba(92,26,27,0.2)', icon: '#5C1A1B' },
    medium: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)', icon: '#F59E0B' },
    low: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.2)', icon: '#2563EB' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 mt-3"
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isDark
            ? 'linear-gradient(145deg, rgba(61,15,16,0.12) 0%, rgba(26,26,26,0.9) 100%)'
            : 'linear-gradient(145deg, rgba(92,26,27,0.04) 0%, rgba(255,255,255,0.95) 100%)',
          border: '1px solid rgba(92,26,27,0.15)',
        }}
      >
        {/* ─── Compact Header - always visible ─── */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 px-4 py-3"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)',
              boxShadow: '0 2px 8px rgba(92,26,27,0.3)',
            }}
          >
            <ShieldCheck size={16} color="#FFF" />
          </div>
          <div className="flex-1 text-right">
            <h3 className="text-xs font-bold" style={{ color: '#5C1A1B' }}>
              {t('admin.dashboardTitle')}
            </h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] flex items-center gap-1" style={{ color: isDark ? '#CCC' : '#666' }}>
                <Users size={10} /> {totalUsers}
              </span>
              <span className="text-[10px] flex items-center gap-1" style={{ color: pendingOrders > 0 ? '#F59E0B' : isDark ? '#CCC' : '#666' }}>
                <ShoppingCart size={10} /> {pendingOrders}
              </span>
              <span className="text-[10px] flex items-center gap-1" style={{ color: isDark ? '#CCC' : '#666' }}>
                <DollarSign size={10} /> {formatNumber(todayRevenue)}
              </span>
              {(pendingDeposits > 0 || pendingKyc > 0) && (
                <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#5C1A1B' }}>
                  <Bell size={9} />
                  <span className="font-bold">{pendingDeposits + pendingKyc}</span>
                </span>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp size={16} color="#5C1A1B" />
          ) : (
            <ChevronDown size={16} color="#5C1A1B" />
          )}
        </button>

        {/* ─── Expanded Content ─── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3">
                {/* ─── Quick Stats Row ─── */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { icon: Users, label: t('admin.totalUsers'), value: totalUsers.toString(), color: '#2563EB' },
                    { icon: ShoppingCart, label: t('admin.pendingOrders'), value: pendingOrders.toString(), color: '#F59E0B' },
                    { icon: DollarSign, label: t('admin.todayRevenue'), value: formatNumber(todayRevenue), color: '#10B981' },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={i}
                        className="rounded-xl p-2.5 text-center"
                        style={{
                          background: `${stat.color}08`,
                          border: `1px solid ${stat.color}15`,
                        }}
                      >
                        <Icon size={14} color={stat.color} className="mx-auto mb-1" />
                        <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          {stat.value}
                        </p>
                        <p className="text-[9px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                          {stat.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* ─── Revenue Sparkline ─── */}
                <div
                  className="rounded-xl p-3 mb-3"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium" style={{ color: isDark ? '#888' : '#AAA' }}>
                      {t('admin.revenueChart')} - {t('admin.last7Days')}
                    </span>
                    <TrendingUp size={12} color="#5C1A1B" />
                  </div>
                  <svg width="100%" height={sparklineHeight} viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="adminSparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5C1A1B" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#5C1A1B" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Area fill */}
                    <polygon
                      points={`0,${sparklineHeight} ${points} ${sparklineWidth},${sparklineHeight}`}
                      fill="url(#adminSparkGrad)"
                    />
                    {/* Line */}
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#5C1A1B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Data points */}
                    {revenueChart.map((d, i) => {
                      const x = (i / (revenueChart.length - 1 || 1)) * sparklineWidth;
                      const y = sparklineHeight - (d.amount / maxAmount) * sparklineHeight;
                      return (
                        <circle key={i} cx={x} cy={y} r="3" fill="#5C1A1B" stroke={isDark ? '#1A1A1A' : '#FFFFFF'} strokeWidth="2" />
                      );
                    })}
                  </svg>
                  <div className="flex justify-between mt-1">
                    {revenueChart.map((d, i) => (
                      <span key={i} className="text-[8px]" style={{ color: isDark ? '#555' : '#CCC' }}>
                        {d.day}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ─── Recent Alerts ─── */}
                {recentAlerts.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-[10px] font-bold mb-2 flex items-center gap-1" style={{ color: isDark ? '#888' : '#AAA' }}>
                      <AlertTriangle size={10} color="#5C1A1B" />
                      {t('admin.recentAlerts')}
                    </h4>
                    <div className="space-y-1.5">
                      {recentAlerts.slice(0, 3).map((alert) => {
                        const sev = severityConfig[alert.severity];
                        return (
                          <button
                            key={alert.id}
                            onClick={() => onNavigate(alert.screen)}
                            className="w-full flex items-center gap-2 py-2 px-2.5 rounded-lg text-right transition-all active:scale-[0.98]"
                            style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
                          >
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: alert.type === 'kyc' ? 'rgba(59,130,246,0.15)' : alert.type === 'deposit' ? 'rgba(16,185,129,0.15)' : 'rgba(92,26,27,0.15)' }}>
                              {alert.type === 'kyc' ? <ShieldCheck size={12} color="#3B82F6" /> : alert.type === 'deposit' ? <ArrowDownCircle size={12} color="#10B981" /> : <Clock size={12} color="#5C1A1B" />}
                            </div>
                            <span className="flex-1 text-[10px] leading-tight font-medium" style={{ color: isDark ? '#CCC' : '#555' }}>
                              {alert.message}
                            </span>
                            <Eye size={10} color={isDark ? '#555' : '#CCC'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── Quick Action Buttons ─── */}
                <div className="flex gap-2">
                  {[
                    { label: t('admin.approveDeposits'), icon: ArrowDownCircle, screen: 'admin', count: pendingDeposits, color: '#10B981' },
                    { label: t('admin.reviewKyc'), icon: ShieldCheck, screen: 'admin', count: pendingKyc, color: '#2563EB' },
                    { label: t('admin.viewOrders'), icon: ShoppingCart, screen: 'admin', count: pendingOrders, color: '#F59E0B' },
                  ].map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => onNavigate(action.screen)}
                        className="flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl transition-all active:scale-95"
                        style={{
                          background: `${action.color}08`,
                          border: `1px solid ${action.color}15`,
                        }}
                      >
                        <div className="relative">
                          <Icon size={16} color={action.color} />
                          {action.count > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[12px] h-[12px] rounded-full flex items-center justify-center text-[7px] font-bold text-white px-0.5" style={{ background: action.color }}>
                              {action.count}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-medium text-center leading-tight" style={{ color: isDark ? '#CCC' : '#666' }}>
                          {action.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ─── Mini quick stats footer ─── */}
                {recentAlerts.length === 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                    <Zap size={12} color="#10B981" />
                    <span className="text-[10px] font-medium" style={{ color: '#10B981' }}>
                      {t('admin.noAlerts')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
