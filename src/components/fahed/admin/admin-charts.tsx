'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, TrendingUp, PieChart, Calendar } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { formatNumber, currencySymbols } from '@/lib/utils';

type TimePeriod = '7' | '30' | '90';

export default function AdminCharts() {
  const { isDark, cardStyle, allOrders, providers, firebaseUsers, statsData } = useAdminContext();
  const [period, setPeriod] = useState<TimePeriod>('30');

  const isDarkBg = isDark;

  // Revenue trend data
  const revenueData = useMemo(() => {
    const days = parseInt(period);
    const data: { date: string; label: string; amount: number }[] = [];
    const completedOrders = allOrders.filter(o => o.status === 'completed');

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const dayRev = completedOrders
        .filter(o => new Date(o.createdAt).getTime() >= dayStart && new Date(o.createdAt).getTime() < dayEnd && o.currency === 'YER')
        .reduce((s, o) => s + o.amount, 0);
      data.push({
        date: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('ar-SA', days <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }),
        amount: dayRev,
      });
    }
    return data;
  }, [allOrders, period]);

  // Order volume by category
  const categoryData = useMemo(() => {
    const cats: Record<string, { name: string; count: number; color: string }> = {};
    allOrders.forEach(order => {
      const provider = providers.find(p => p.id === order.providerId);
      const catId = provider?.categoryId || 'other';
      if (!cats[catId]) {
        const catNames: Record<string, string> = {
          telecom: 'الاتصالات', internet: 'الإنترنت', 'wallet-services': 'خدمات المحفظة',
          'service-providers': 'مزودين الخدمات', entertainment: 'الألعاب',
          cards: 'البطاقات', electricity: 'الكهرباء', government: 'حكومية', other: 'أخرى',
        };
        const catColors: Record<string, string> = {
          telecom: '#5C1A1B', internet: '#3B82F6', 'wallet-services': '#F59E0B',
          'service-providers': '#6B7280', entertainment: '#F59E0B',
          cards: '#8B5CF6', electricity: '#10B981', government: '#6B7280', other: '#EC4899',
        };
        cats[catId] = { name: catNames[catId] || 'أخرى', count: 0, color: catColors[catId] || '#EC4899' };
      }
      cats[catId].count++;
    });
    return Object.values(cats).sort((a, b) => b.count - a.count);
  }, [allOrders, providers]);

  // User growth data (simulated from createdAt)
  const userGrowthData = useMemo(() => {
    const days = parseInt(period);
    const data: { label: string; count: number; cumulative: number }[] = [];
    let cumulative = 0;

    // Count users created before our period starts
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    const existingUsers = firebaseUsers.filter(u => u.createdAt && new Date(u.createdAt) < periodStart).length;
    cumulative = existingUsers;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const dayCount = firebaseUsers.filter(u => {
        if (!u.createdAt) return false;
        const t = new Date(u.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      cumulative += dayCount;
      data.push({
        label: d.toLocaleDateString('ar-SA', days <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' }),
        count: dayCount,
        cumulative,
      });
    }
    return data;
  }, [firebaseUsers, period]);

  // Transaction distribution (donut chart)
  const transactionDist = useMemo(() => {
    const completed = allOrders.filter(o => o.status === 'completed').length;
    const pending = allOrders.filter(o => o.status === 'pending').length;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const total = Math.max(completed + pending + cancelled, 1);
    return [
      { name: 'مكتمل', count: completed, color: '#10B981', percent: (completed / total) * 100 },
      { name: 'قيد الانتظار', count: pending, color: '#F59E0B', percent: (pending / total) * 100 },
      { name: 'ملغى', count: cancelled, color: '#5C1A1B', percent: (cancelled / total) * 100 },
    ];
  }, [allOrders]);

  const maxRevenue = Math.max(...revenueData.map(d => d.amount), 1);
  const maxCatCount = Math.max(...categoryData.map(c => c.count), 1);
  const maxCumulative = Math.max(...userGrowthData.map(d => d.cumulative), 1);
  const maxDailyUsers = Math.max(...userGrowthData.map(d => d.count), 1);

  // Hover state for tooltips
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [hoveredArea, setHoveredArea] = useState<number | null>(null);

  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: '7', label: '7 أيام' },
    { value: '30', label: '30 يوم' },
    { value: '90', label: '90 يوم' },
  ];

  return (
    <motion.div key="charts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Calendar size={14} color="#5C1A1B" />
        <div className="flex gap-1.5">
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
              style={{
                background: period === opt.value ? 'rgba(92,26,27,0.12)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                color: period === opt.value ? '#5C1A1B' : isDark ? '#AAA' : '#666',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Trend Line Chart */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>اتجاه الإيرادات</h3>
          <span className="text-[10px] mr-auto" style={{ color: isDark ? '#666' : '#AAA' }}>ر.ي</span>
        </div>

        {/* Line chart using div-based approach */}
        <div className="relative" style={{ height: '160px' }}>
          {/* Y-axis labels */}
          <div className="absolute right-0 top-0 bottom-6 flex flex-col justify-between text-[8px]" style={{ color: isDark ? '#444' : '#CCC', width: '40px' }}>
            <span>{formatNumber(maxRevenue)}</span>
            <span>{formatNumber(Math.round(maxRevenue / 2))}</span>
            <span>0</span>
          </div>

          {/* Chart area */}
          <div className="absolute top-0 bottom-6 left-0" style={{ right: '45px' }}>
            {/* Grid lines */}
            <div className="absolute inset-0">
              {[0, 1, 2].map(i => (
                <div key={i} className="absolute w-full border-t border-dashed" style={{ top: `${i * 50}%`, borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)' }} />
              ))}
            </div>

            {/* SVG line */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5C1A1B" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#5C1A1B" stopOpacity="0" />
                </linearGradient>
              </defs>
              {revenueData.length > 1 && (
                <>
                  {/* Area fill */}
                  <path
                    d={`M 0,${((1 - revenueData[0].amount / maxRevenue) * 100)} ${revenueData.map((d, i) => `L ${(i / (revenueData.length - 1)) * 100},${((1 - d.amount / maxRevenue) * 100)}`).join(' ')} L 100,100 L 0,100 Z`}
                    fill="url(#revenueGrad)"
                    style={{ transform: 'scaleY(0.85) translateY(5%)' }}
                  />
                  {/* Line */}
                  <path
                    d={`M 0,${((1 - revenueData[0].amount / maxRevenue) * 100)} ${revenueData.map((d, i) => `L ${(i / (revenueData.length - 1)) * 100},${((1 - d.amount / maxRevenue) * 100)}`).join(' ')}`}
                    fill="none"
                    stroke="#5C1A1B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: 'scaleY(0.85) translateY(5%)' }}
                  />
                </>
              )}
              {/* Data points */}
              {revenueData.map((d, i) => (
                <circle
                  key={i}
                  cx={`${(i / (revenueData.length - 1)) * 100}%`}
                  cy={`${(1 - d.amount / maxRevenue) * 100}%`}
                  r={hoveredLine === i ? 4 : 2.5}
                  fill="#5C1A1B"
                  stroke={isDark ? '#1a1a1a' : '#FFF'}
                  strokeWidth="2"
                  style={{ transform: 'scaleY(0.85) translateY(10%)', transition: 'r 0.15s' }}
                  onMouseEnter={() => setHoveredLine(i)}
                  onMouseLeave={() => setHoveredLine(null)}
                />
              ))}
            </svg>

            {/* Tooltip */}
            {hoveredLine !== null && revenueData[hoveredLine] && (
              <div
                className="absolute z-10 px-2.5 py-1.5 rounded-lg text-[10px] pointer-events-none"
                style={{
                  background: isDark ? '#2A2A2A' : '#FFF',
                  border: `1px solid ${isDark ? '#444' : '#EEE'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  left: `${(hoveredLine / (revenueData.length - 1)) * 100}%`,
                  top: `${(1 - revenueData[hoveredLine].amount / maxRevenue) * 85}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <p className="font-bold" style={{ color: '#5C1A1B' }}>{formatNumber(revenueData[hoveredLine].amount)} ر.ي</p>
                <p style={{ color: isDark ? '#AAA' : '#666' }}>{revenueData[hoveredLine].label}</p>
              </div>
            )}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-12 flex justify-between text-[8px]" style={{ color: isDark ? '#444' : '#CCC' }}>
            {revenueData.filter((_, i) => i % Math.max(Math.ceil(revenueData.length / 7), 1) === 0).map((d, i) => (
              <span key={i}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Order Volume Bar Chart by Category */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>حجم الطلبات حسب الفئة</h3>
        </div>

        <div className="space-y-3">
          {categoryData.map((cat, i) => (
            <div
              key={cat.name}
              className="relative"
              onMouseEnter={() => setHoveredBar(i)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 text-right shrink-0" style={{ color: isDark ? '#AAA' : '#666' }}>{cat.name}</span>
                <div className="flex-1 h-8 rounded-lg overflow-hidden relative" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(cat.count / maxCatCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="h-full rounded-lg flex items-center px-3"
                    style={{ background: `linear-gradient(90deg, ${cat.color}CC, ${cat.color})` }}
                  >
                    <span className="text-[10px] font-bold text-white whitespace-nowrap">{cat.count} طلب</span>
                  </motion.div>
                </div>
              </div>
              {/* Hover tooltip */}
              {hoveredBar === i && (
                <div
                  className="absolute z-10 px-3 py-2 rounded-lg text-[10px] pointer-events-none"
                  style={{
                    background: isDark ? '#2A2A2A' : '#FFF',
                    border: `1px solid ${isDark ? '#444' : '#EEE'}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    left: '70px',
                    top: '-36px',
                  }}
                >
                  <p className="font-bold" style={{ color: cat.color }}>{cat.name}: {cat.count} طلب</p>
                  <p style={{ color: isDark ? '#AAA' : '#666' }}>{((cat.count / Math.max(allOrders.length, 1)) * 100).toFixed(1)}% من الإجمالي</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Growth Area Chart */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>نمو المستخدمين</h3>
          <span className="text-[10px] mr-auto font-bold" style={{ color: '#10B981' }}>{formatNumber(firebaseUsers.length)} مستخدم</span>
        </div>

        <div className="relative" style={{ height: '140px' }}>
          <div className="absolute right-0 top-0 bottom-6 flex flex-col justify-between text-[8px]" style={{ color: isDark ? '#444' : '#CCC', width: '40px' }}>
            <span>{formatNumber(maxCumulative)}</span>
            <span>{formatNumber(Math.round(maxCumulative / 2))}</span>
            <span>0</span>
          </div>

          <div className="absolute top-0 bottom-6 left-0" style={{ right: '45px' }}>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {userGrowthData.length > 1 && (
                <>
                  <path
                    d={`M 0,${((1 - userGrowthData[0].cumulative / maxCumulative) * 100)} ${userGrowthData.map((d, i) => `L ${(i / (userGrowthData.length - 1)) * 100},${((1 - d.cumulative / maxCumulative) * 100)}`).join(' ')} L 100,100 L 0,100 Z`}
                    fill="url(#userGrad)"
                    style={{ transform: 'scaleY(0.85) translateY(5%)' }}
                  />
                  <path
                    d={`M 0,${((1 - userGrowthData[0].cumulative / maxCumulative) * 100)} ${userGrowthData.map((d, i) => `L ${(i / (userGrowthData.length - 1)) * 100},${((1 - d.cumulative / maxCumulative) * 100)}`).join(' ')}`}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    style={{ transform: 'scaleY(0.85) translateY(5%)' }}
                  />
                </>
              )}
              {userGrowthData.map((d, i) => (
                <circle
                  key={i}
                  cx={`${(i / (userGrowthData.length - 1)) * 100}%`}
                  cy={`${(1 - d.cumulative / maxCumulative) * 100}%`}
                  r={hoveredArea === i ? 4 : 2}
                  fill="#10B981"
                  stroke={isDark ? '#1a1a1a' : '#FFF'}
                  strokeWidth="2"
                  style={{ transform: 'scaleY(0.85) translateY(10%)' }}
                  onMouseEnter={() => setHoveredArea(i)}
                  onMouseLeave={() => setHoveredArea(null)}
                />
              ))}
            </svg>
            {hoveredArea !== null && userGrowthData[hoveredArea] && (
              <div
                className="absolute z-10 px-2.5 py-1.5 rounded-lg text-[10px] pointer-events-none"
                style={{
                  background: isDark ? '#2A2A2A' : '#FFF',
                  border: `1px solid ${isDark ? '#444' : '#EEE'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  left: `${(hoveredArea / (userGrowthData.length - 1)) * 100}%`,
                  top: `${(1 - userGrowthData[hoveredArea].cumulative / maxCumulative) * 85}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <p className="font-bold" style={{ color: '#10B981' }}>{formatNumber(userGrowthData[hoveredArea].cumulative)} مستخدم</p>
                <p style={{ color: isDark ? '#AAA' : '#666' }}>+{userGrowthData[hoveredArea].count} جديد | {userGrowthData[hoveredArea].label}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Distribution Donut Chart */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <PieChart size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>توزيع الطلبات</h3>
        </div>

        <div className="flex items-center gap-6">
          {/* Donut chart using conic-gradient */}
          <div className="relative shrink-0">
            <div
              className="rounded-full"
              style={{
                width: '120px',
                height: '120px',
                background: `conic-gradient(
                  ${transactionDist.map((d, i) => {
                    const start = transactionDist.slice(0, i).reduce((s, x) => s + x.percent, 0);
                    return `${d.color} ${start}% ${start + d.percent}%`;
                  }).join(', ')}
                  ${isDark ? '#1A1A1A' : '#F5F5F5'} 0% 100%
                )`,
              }}
            >
              <div
                className="absolute inset-3 rounded-full flex items-center justify-center flex-col"
                style={{ background: isDark ? '#1A1A1A' : '#FFF' }}
              >
                <span className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(allOrders.length)}</span>
                <span className="text-[8px]" style={{ color: isDark ? '#666' : '#AAA' }}>إجمالي</span>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {transactionDist.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs flex-1" style={{ color: isDark ? '#CCC' : '#666' }}>{d.name}</span>
                <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{d.count}</span>
                <span className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>({d.percent.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
