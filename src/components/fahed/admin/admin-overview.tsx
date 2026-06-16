'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Clock, CheckCircle2, DollarSign, XCircle, Activity, PieChart } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, formatNumber } from '@/lib/utils';

export default function AdminOverview() {
  const {
    isDark, cardStyle, statsData, revenueChart, allOrders, providers,
    pendingOrders, setActiveTab, handleCompleteOrder, handleCancelOrder
  } = useAdminContext();

  const maxRevenue = Math.max(...revenueChart.map(d => d.amount), 1);

  const categoryData = [
    { name: 'اتصالات', count: allOrders.filter(o => providers.find(p => p.id === o.providerId)?.categoryId === 'telecom').length, color: '#5C1A1B' },
    { name: 'ألعاب', count: allOrders.filter(o => providers.find(p => p.id === o.providerId)?.categoryId === 'games').length, color: '#F59E0B' },
    { name: 'إنترنت', count: allOrders.filter(o => providers.find(p => p.id === o.providerId)?.categoryId === 'internet').length, color: '#3B82F6' },
  ];
  const maxCatCount = Math.max(...categoryData.map(c => c.count), 1);

  return (
    <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'إجمالي الطلبات', value: statsData.totalOrders, icon: ShoppingBag, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
          { label: 'قيد الانتظار', value: statsData.pendingOrders, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', glow: true },
          { label: 'مكتملة', value: statsData.completedOrders, icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
          { label: 'الإيرادات (ر.ي)', value: statsData.revenueYER, icon: DollarSign, color: '#5C1A1B', bg: 'rgba(92,26,27,0.12)' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className={`rounded-2xl p-4 ${stat.glow ? 'glow-red' : ''}`}
              style={cardStyle}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                  <Icon size={20} strokeWidth={1.5} color={stat.color} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(stat.value)}</p>
              <p className="text-xs mt-0.5" style={{ color: isDark ? '#777' : '#999' }}>{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإيرادات - آخر 7 أيام</h3>
        </div>
        <div className="flex items-end gap-2 h-32">
          {revenueChart.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((d.amount / maxRevenue) * 100, 4)}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
                className="w-full rounded-t-lg min-h-[4px]" style={{ background: 'linear-gradient(to top, #5C1A1B, #FF4444)' }} />
              <span className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Orders by Category */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <PieChart size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الطلبات حسب الفئة</h3>
        </div>
        <div className="space-y-2">
          {categoryData.map((cat) => (
            <div key={cat.name} className="flex items-center gap-3">
              <span className="text-xs w-14" style={{ color: isDark ? '#AAA' : '#666' }}>{cat.name}</span>
              <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(cat.count / maxCatCount) * 100}%` }} transition={{ duration: 0.8 }}
                  className="h-full rounded-lg" style={{ background: cat.color, opacity: 0.7 }} />
              </div>
              <span className="text-xs font-bold w-8 text-left" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="rounded-2xl p-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={14} color="#F59E0B" />
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>طلبات بانتظار التنفيذ</h3>
            </div>
            <button onClick={() => setActiveTab('orders')} className="text-xs font-medium" style={{ color: '#5C1A1B' }}>عرض الكل</button>
          </div>
          <div className="space-y-2">
            {pendingOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRight: '3px solid #F59E0B' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.packageName}</p>
                  <p className="text-[10px] truncate" style={{ color: isDark ? '#666' : '#AAA' }}>{order.userName} - {order.customerInput}</p>
                </div>
                <div className="flex gap-1.5 mr-2">
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleCompleteOrder(order)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                    <CheckCircle2 size={14} color="#10B981" />
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleCancelOrder(order)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.15)' }}>
                    <XCircle size={14} color="#5C1A1B" />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
