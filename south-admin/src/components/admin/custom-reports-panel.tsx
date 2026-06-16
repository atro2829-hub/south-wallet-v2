'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, cn, formatDateAr } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileBarChart, Loader2, Download, TrendingUp,
  Users, DollarSign, ShoppingCart, ArrowDownCircle,
  ArrowUpCircle, BarChart3, Calendar, Percent,
  Activity, Crown,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ReportData {
  revenue: { date: string; amount: number }[];
  users: { date: string; count: number }[];
  transactions: { date: string; count: number; volume: number }[];
  topServices: { name: string; count: number; revenue: number }[];
  commissionReport: { date: string; commission: number }[];
}

export default function CustomReportsPanel() {
  const { showToast } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [reportData, setReportData] = useState<ReportData>({
    revenue: [],
    users: [],
    transactions: [],
    topServices: [],
    commissionReport: [],
  });

  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const depsRef = ref(database, 'depositRequests');
    const unsub1 = onValue(depsRef, (snap) => {
      const data = snap.val() || {};
      setDeposits(Object.values(data));
    });

    const withRef = ref(database, 'withdrawRequests');
    const unsub2 = onValue(withRef, (snap) => {
      const data = snap.val() || {};
      setWithdrawals(Object.values(data));
    });

    const usersRef = ref(database, 'users');
    const unsub3 = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      setAllUsers(Object.values(data));
      setLoading(false);
    });

    const ordersRef = ref(database, 'orders');
    const unsub4 = onValue(ordersRef, (snap) => {
      const data = snap.val() || {};
      setOrders(Object.values(data));
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  // Generate report data based on period
  useEffect(() => {
    const daysMap: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[period] || 7;
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Revenue by day
    const revenueByDay: Record<string, number> = {};
    const completedDeposits = deposits.filter(d => d.status === 'completed' && new Date(d.createdAt || d.timestamp) >= cutoff);
    const completedWithdrawals = withdrawals.filter(w => w.status === 'completed' && new Date(w.createdAt || w.timestamp) >= cutoff);

    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      revenueByDay[key] = 0;
    }

    completedDeposits.forEach(d => {
      const key = (d.createdAt || d.timestamp || '').split('T')[0];
      if (revenueByDay[key] !== undefined) revenueByDay[key] += d.amount || 0;
    });

    const revenue = Object.entries(revenueByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Users by day
    const usersByDay: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      usersByDay[key] = 0;
    }
    allUsers.forEach(u => {
      const key = (u.createdAt || '').split('T')[0];
      if (usersByDay[key] !== undefined) usersByDay[key]++;
    });
    const users = Object.entries(usersByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Transactions
    const txByDay: Record<string, { count: number; volume: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      txByDay[key] = { count: 0, volume: 0 };
    }
    [...completedDeposits, ...completedWithdrawals].forEach(t => {
      const key = (t.createdAt || t.timestamp || '').split('T')[0];
      if (txByDay[key] !== undefined) {
        txByDay[key].count++;
        txByDay[key].volume += t.amount || 0;
      }
    });
    const transactions = Object.entries(txByDay)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top services
    const serviceCount: Record<string, { count: number; revenue: number }> = {};
    orders.filter(o => o.status === 'completed').forEach(o => {
      const name = o.serviceName || o.productName || 'غير محدد';
      if (!serviceCount[name]) serviceCount[name] = { count: 0, revenue: 0 };
      serviceCount[name].count++;
      serviceCount[name].revenue += o.amount || 0;
    });
    const topServices = Object.entries(serviceCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Commission report
    const commByDay: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      commByDay[key] = 0;
    }
    [...completedDeposits, ...completedWithdrawals].forEach(t => {
      const key = (t.createdAt || t.timestamp || '').split('T')[0];
      if (commByDay[key] !== undefined) {
        commByDay[key] += (t.fee || t.commission || 0);
      }
    });
    const commissionReport = Object.entries(commByDay)
      .map(([date, commission]) => ({ date, commission }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setReportData({ revenue, users, transactions, topServices, commissionReport });
  }, [deposits, withdrawals, allUsers, orders, period]);

  const totalRevenue = reportData.revenue.reduce((s, r) => s + r.amount, 0);
  const totalTransactions = reportData.transactions.reduce((s, t) => s + t.count, 0);
  const totalVolume = reportData.transactions.reduce((s, t) => s + t.volume, 0);
  const totalCommission = reportData.commissionReport.reduce((s, c) => s + c.commission, 0);
  const newUsers = reportData.users.reduce((s, u) => s + u.count, 0);

  const maxRevenue = Math.max(...reportData.revenue.map(r => r.amount), 1);
  const maxUsers = Math.max(...reportData.users.map(u => u.count), 1);
  const maxTx = Math.max(...reportData.transactions.map(t => t.count), 1);

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) { showToast('لا توجد بيانات للتصدير', 'error'); return; }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير التقرير', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const SimpleBarChart = ({ data, valueKey, maxVal, color = 'from-[#5C1A1B] to-[#8B3A3A]' }: any) => (
    <div className="flex items-end gap-1 h-24">
      {data.slice(-14).map((d: any, i: number) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((d[valueKey] / maxVal) * 100, 2)}%` }}
            transition={{ delay: i * 0.02 }}
            className={cn('w-full bg-gradient-to-t rounded-t-sm min-h-[2px]', color)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-7 h-7 text-[#5C1A1B]" />
            تقارير مخصصة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">تقارير الإيرادات والمستخدمين والمعاملات</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">يوم</SelectItem>
              <SelectItem value="7d">أسبوع</SelectItem>
              <SelectItem value="30d">شهر</SelectItem>
              <SelectItem value="90d">3 أشهر</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي الإيرادات', value: formatNumber(totalRevenue), icon: DollarSign, color: 'from-green-600 to-green-800' },
          { label: 'المعاملات', value: totalTransactions, icon: Activity, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'حجم التداول', value: formatNumber(totalVolume), icon: BarChart3, color: 'from-blue-600 to-blue-800' },
          { label: 'العمولات', value: formatNumber(totalCommission), icon: Percent, color: 'from-purple-600 to-purple-800' },
          { label: 'مستخدمين جدد', value: newUsers, icon: Users, color: 'from-orange-600 to-orange-800' },
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

      <Tabs defaultValue="revenue">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="transactions">المعاملات</TabsTrigger>
          <TabsTrigger value="services">الخدمات</TabsTrigger>
          <TabsTrigger value="commissions">العمولات</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  تقرير الإيرادات
                </h3>
                <Button size="sm" variant="outline" onClick={() => exportCSV(reportData.revenue, 'revenue_report')}>
                  <Download className="w-3 h-3 ml-1" />
                  تصدير CSV
                </Button>
              </div>
              <SimpleBarChart data={reportData.revenue} valueKey="amount" maxVal={maxRevenue} color="from-green-500 to-green-700" />
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {reportData.revenue.slice().reverse().map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 text-sm">
                    <span className="text-muted-foreground">{r.date}</span>
                    <span className="font-bold text-green-600">{formatNumber(r.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  نمو المستخدمين
                </h3>
                <Button size="sm" variant="outline" onClick={() => exportCSV(reportData.users, 'users_report')}>
                  <Download className="w-3 h-3 ml-1" />
                  تصدير CSV
                </Button>
              </div>
              <SimpleBarChart data={reportData.users} valueKey="count" maxVal={maxUsers} color="from-blue-500 to-blue-700" />
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {reportData.users.slice().reverse().map((u, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 text-sm">
                    <span className="text-muted-foreground">{u.date}</span>
                    <span className="font-bold text-blue-600">{u.count} مستخدم</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#5C1A1B]" />
                  حجم المعاملات
                </h3>
                <Button size="sm" variant="outline" onClick={() => exportCSV(reportData.transactions, 'transactions_report')}>
                  <Download className="w-3 h-3 ml-1" />
                  تصدير CSV
                </Button>
              </div>
              <SimpleBarChart data={reportData.transactions} valueKey="count" maxVal={maxTx} color="from-[#5C1A1B] to-[#8B3A3A]" />
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {reportData.transactions.slice().reverse().map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 text-sm">
                    <span className="text-muted-foreground">{t.date}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{t.count} عملية</span>
                      <span className="font-bold text-[#5C1A1B]">{formatNumber(t.volume)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Services Tab */}
        <TabsContent value="services" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  أكثر الخدمات طلباً
                </h3>
                <Button size="sm" variant="outline" onClick={() => exportCSV(reportData.topServices, 'top_services_report')}>
                  <Download className="w-3 h-3 ml-1" />
                  تصدير CSV
                </Button>
              </div>
              {reportData.topServices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
              ) : (
                <div className="space-y-3">
                  {reportData.topServices.map((s, i) => {
                    const maxCount = reportData.topServices[0]?.count || 1;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{i + 1}. {s.name}</span>
                          <span className="text-muted-foreground">{s.count} طلب • {formatNumber(s.revenue)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(s.count / maxCount) * 100}%` }}
                            className="h-full bg-gradient-to-l from-[#5C1A1B] to-[#8B3A3A] rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commission Tab */}
        <TabsContent value="commissions" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Percent className="w-5 h-5 text-purple-600" />
                  تقرير العمولات
                </h3>
                <Button size="sm" variant="outline" onClick={() => exportCSV(reportData.commissionReport, 'commission_report')}>
                  <Download className="w-3 h-3 ml-1" />
                  تصدير CSV
                </Button>
              </div>
              <SimpleBarChart
                data={reportData.commissionReport}
                valueKey="commission"
                maxVal={Math.max(...reportData.commissionReport.map(c => c.commission), 1)}
                color="from-purple-500 to-purple-700"
              />
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {reportData.commissionReport.slice().reverse().map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-muted/30 text-sm">
                    <span className="text-muted-foreground">{c.date}</span>
                    <span className="font-bold text-purple-600">{formatNumber(c.commission)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
