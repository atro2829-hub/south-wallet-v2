'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, timeAgo, cn, formatDateAr } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList, Search, Loader2, TrendingUp, TrendingDown,
  ArrowUpCircle, ArrowDownCircle, DollarSign, Calendar,
  BarChart3, RefreshCw, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BalanceEntry {
  id: string;
  providerId: string;
  providerName: string;
  previousBalance: number;
  newBalance: number;
  change: number;
  currency: string;
  reason: string;
  timestamp: string;
}

export default function BalanceLogPanel() {
  const { showToast } = useAdminStore();
  const [logs, setLogs] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    const logRef = ref(database, 'apiBalanceLog');
    const unsub = onValue(logRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: BalanceEntry[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        providerId: val.providerId || '',
        providerName: val.providerName || 'غير معروف',
        previousBalance: val.previousBalance || 0,
        newBalance: val.newBalance || 0,
        change: val.change || 0,
        currency: val.currency || 'USD',
        reason: val.reason || '',
        timestamp: val.timestamp || new Date().toISOString(),
      }));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const providers = useMemo(() => {
    const set = new Set(logs.map(l => l.providerName));
    return Array.from(set);
  }, [logs]);

  const filtered = useMemo(() => {
    const now = new Date();
    const daysMap: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, 'all': 9999 };
    const days = daysMap[dateRange] || 7;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return logs.filter(l => {
      const matchSearch = search === '' ||
        l.providerName.toLowerCase().includes(search.toLowerCase()) ||
        l.reason.toLowerCase().includes(search.toLowerCase());
      const matchProvider = providerFilter === 'all' || l.providerName === providerFilter;
      const matchDate = new Date(l.timestamp) >= cutoff;
      return matchSearch && matchProvider && matchDate;
    });
  }, [logs, search, providerFilter, dateRange]);

  const stats = useMemo(() => {
    const totalIncrease = filtered.filter(l => l.change > 0).reduce((s, l) => s + l.change, 0);
    const totalDecrease = filtered.filter(l => l.change < 0).reduce((s, l) => s + Math.abs(l.change), 0);
    const uniqueProviders = new Set(filtered.map(l => l.providerId)).size;
    return { totalIncrease, totalDecrease, uniqueProviders, total: filtered.length };
  }, [filtered]);

  // Simple chart data for the last 7 days
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      days[key] = 0;
    }
    filtered.forEach(l => {
      const d = new Date(l.timestamp);
      const key = d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      if (days[key] !== undefined) days[key] += Math.abs(l.change);
    });
    return Object.entries(days).map(([day, value]) => ({ day, value }));
  }, [filtered]);

  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري تحميل سجل الأرصدة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-7 h-7 text-[#5C1A1B]" />
          سجل الأرصدة
        </h1>
        <p className="text-muted-foreground text-sm mt-1">متابعة تغييرات أرصدة مزودي API</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي السجلات', value: stats.total, icon: ClipboardList, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'إجمالي الزيادة', value: formatNumber(stats.totalIncrease), icon: TrendingUp, color: 'from-green-600 to-green-800' },
          { label: 'إجمالي النقصان', value: formatNumber(stats.totalDecrease), icon: TrendingDown, color: 'from-red-600 to-red-800' },
          { label: 'المزودون', value: stats.uniqueProviders, icon: BarChart3, color: 'from-blue-600 to-blue-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">تغييرات الأرصدة (آخر 7 أيام)</h3>
          <div className="flex items-end gap-2 h-32">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{formatNumber(d.value)}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((d.value / maxChartValue) * 100, 4)}%` }}
                  className="w-full bg-gradient-to-t from-[#5C1A1B] to-[#8B3A3A] rounded-t-md min-h-[4px]"
                />
                <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.day}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="المزود" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المزودين</SelectItem>
                {providers.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="الفترة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">يوم</SelectItem>
                <SelectItem value="7d">أسبوع</SelectItem>
                <SelectItem value="30d">شهر</SelectItem>
                <SelectItem value="90d">3 أشهر</SelectItem>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">لا توجد سجلات</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.slice(0, 50).map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                          log.change >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                        )}>
                          {log.change >= 0 ? (
                            <ArrowUpCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{log.providerName}</p>
                          <p className="text-xs text-muted-foreground truncate">{log.reason}</p>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <p className={cn(
                          'text-sm font-bold',
                          log.change >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {log.change >= 0 ? '+' : ''}{formatNumber(log.change)} {log.currency}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatNumber(log.previousBalance)} → {formatNumber(log.newBalance)}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                          <Calendar className="w-2.5 h-2.5" />
                          {timeAgo(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
