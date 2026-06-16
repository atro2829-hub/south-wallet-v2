'use client';

import { useState, useMemo } from 'react';
import { useAdminStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { formatNumber, currencySymbols } from '@/lib/utils';
import {
  BarChart3,
  Server,
  Zap,
  Package,
  TrendingUp,
  ArrowRight,
  ShoppingCart,
  DollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ServiceAnalyticsPanel() {
  const { orders, allUsers } = useAdminStore();

  // Calculate service stats from orders
  const serviceStats = useMemo(() => {
    const providerCount: Record<string, { name: string; count: number; revenue: number; currency: string }> = {};

    orders.forEach((order: any) => {
      const provider = order.providerName || 'غير محدد';
      if (!providerCount[provider]) {
        providerCount[provider] = { name: provider, count: 0, revenue: 0, currency: order.currency || 'YER' };
      }
      providerCount[provider].count++;
      if (order.status === 'completed') {
        providerCount[provider].revenue += order.amount || 0;
      }
    });

    return Object.values(providerCount).sort((a, b) => b.count - a.count);
  }, [orders]);

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o: any) => o.status === 'completed').length;
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  const stats = [
    { label: 'إجمالي الطلبات', value: totalOrders, icon: ShoppingCart, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'مكتملة', value: completedOrders, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'نسبة الإكمال', value: `${completionRate}%`, icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'المزودون', value: serviceStats.length, icon: Server, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="ios-large-title text-foreground">تحليلات الخدمات</h1>
        <p className="text-muted-foreground text-sm mt-1">إحصائيات وأداء الخدمات والمزودين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="ios-card p-4">
              <div className={cn('p-2 rounded-xl w-fit', stat.bg)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <p className="text-xl font-bold text-foreground mt-2">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Provider Performance */}
      <div className="ios-card overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground">أداء المزودين</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">ترتيب حسب عدد الطلبات</p>
        </div>
        <div>
          {serviceStats.slice(0, 20).map((provider, i) => (
            <div key={i} className="ios-list-item gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-500 shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{provider.name}</p>
                <div className="w-full bg-muted/30 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((provider.count / (serviceStats[0]?.count || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-left shrink-0">
                <p className="text-xs font-bold text-foreground">{provider.count} طلب</p>
                <p className="text-[10px] text-muted-foreground">{formatNumber(provider.revenue)} {currencySymbols[provider.currency]}</p>
              </div>
            </div>
          ))}
          {serviceStats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات</p>
          )}
        </div>
      </div>
    </div>
  );
}
