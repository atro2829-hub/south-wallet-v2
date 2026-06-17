'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useAdminStore } from '@/lib/store';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { formatNumber, currencySymbols, timeAgo, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, ShoppingCart, ArrowDownCircle, ArrowUpCircle, Shield,
  DollarSign, TrendingUp, TrendingDown, Activity, ArrowRight,
  AlertTriangle, CheckCircle2, XCircle, Server, Database, Bell,
  Clock, BarChart3, Wallet, ArrowLeftRight, ShieldCheck,
  RefreshCw, Loader2, WifiOff, Eye,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

// =====================================================
// Types for Supabase data
// =====================================================

interface SupabaseUser {
  id: string;
  firebase_uid: string;
  display_name: string;
  email: string;
  phone: string;
  balance_yer: number;
  balance_sar: number;
  balance_usd: number;
  kyc_status: 'none' | 'submitted' | 'verified' | 'rejected' | 'pending';
  is_blocked: boolean;
  last_login_at: string | null;
  card_number: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseOrder {
  id: string;
  user_id: string;
  provider_name: string;
  package_name: string;
  customer_input: string;
  amount: number;
  currency: string;
  cost_price: number;
  commission_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  api_provider_id: string;
  api_order_id: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseDepositRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  transfer_receipt_url: string | null;
  crypto_network: string | null;
  crypto_wallet_address: string | null;
  admin_notes: string | null;
  sender_name: string;
  created_at: string;
  reviewed_at: string | null;
}

interface SupabaseWithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  crypto_network: string | null;
  crypto_wallet_address: string | null;
  admin_notes: string | null;
  bank_name: string;
  bank_account: string;
  created_at: string;
  reviewed_at: string | null;
}

interface DashboardData {
  users: SupabaseUser[];
  orders: SupabaseOrder[];
  depositRequests: SupabaseDepositRequest[];
  withdrawRequests: SupabaseWithdrawRequest[];
}

// =====================================================
// Animated counter
// =====================================================

function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(eased * value));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return <>{formatNumber(display)}</>;
}

const CHART_COLORS = ['#5C1A1B', '#C41E3A', '#D44A5C', '#8B3A3E', '#E86E7E', '#3D0F10'];

// =====================================================
// Skeleton Components
// =====================================================

function StatCardSkeleton() {
  return (
    <div className="ios-card p-4">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="w-8 h-8 rounded-xl" />
        <Skeleton className="w-4 h-4 rounded" />
      </div>
      <Skeleton className="h-6 w-16 mb-1" />
      <Skeleton className="h-3 w-24 mb-0.5" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="ios-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="ios-card overflow-hidden">
      <div className="p-4 pb-2">
        <Skeleton className="h-4 w-24 mb-1" />
        <Skeleton className="h-3 w-36" />
      </div>
      <div className="space-y-1 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3.5 w-24 mb-1" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// Main Dashboard Component
// =====================================================

export default function Dashboard() {
  const { adminUser } = useAdminStore();

  // Local state for data loaded directly from Supabase
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch all dashboard data from Supabase
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch all data in parallel for speed. We use supabaseAdmin (service-role)
      // because RLS on these tables would otherwise restrict the admin to seeing
      // only their own rows — making the dashboard show 1 user / 0 orders.
      const [usersRes, ordersRes, depositsRes, withdrawsRes] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('*')
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('deposit_requests')
          .select('*')
          .order('created_at', { ascending: false }),
        supabaseAdmin
          .from('withdraw_requests')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      // Check for errors
      const errors = [usersRes.error, ordersRes.error, depositsRes.error, withdrawsRes.error].filter(Boolean) as { message: string }[];
      if (errors.length > 0) {
        console.error('Supabase fetch errors:', errors);
        // If ALL queries failed, show error. If only some failed, proceed with partial data.
        if (usersRes.error && ordersRes.error && depositsRes.error && withdrawsRes.error) {
          throw new Error(errors[0]?.message || 'فشل في تحميل البيانات');
        }
      }

      const dashboardData: DashboardData = {
        users: usersRes.data || [],
        orders: ordersRes.data || [],
        depositRequests: depositsRes.data || [],
        withdrawRequests: withdrawsRes.data || [],
      };

      setData(dashboardData);
      setLastUpdated(new Date());

      // Also update the store so other panels can benefit
      const store = useAdminStore.getState();
      store.setAllUsers(dashboardData.users.map((u) => ({
        id: u.id,
        uid: u.firebase_uid || u.id,
        name: u.display_name || '',
        firstName: u.display_name || '',
        email: u.email || '',
        phone: u.phone || '',
        balanceYER: u.balance_yer || 0,
        balanceSAR: u.balance_sar || 0,
        balanceUSD: u.balance_usd || 0,
        kycStatus: u.kyc_status || 'none',
        isBlocked: u.is_blocked || false,
        lastLogin: u.last_login_at,
        createdAt: u.created_at,
      })));
      store.setOrders(dashboardData.orders.map((o) => ({
        id: o.id,
        userId: o.user_id,
        userName: o.customer_input || 'مستخدم',
        providerName: o.provider_name || '',
        packageName: o.package_name || '',
        amount: o.amount || 0,
        currency: o.currency || 'YER',
        status: o.status || 'pending',
        createdAt: o.created_at,
      })));
      store.setDepositRequests(dashboardData.depositRequests.map((d) => ({
        id: d.id,
        userId: d.user_id,
        userName: d.sender_name || 'مستخدم',
        amount: d.amount || 0,
        currency: d.currency || 'YER',
        method: d.method || '',
        status: d.status || 'pending',
        receiptUrl: d.transfer_receipt_url,
        notes: d.admin_notes,
        cryptoNetwork: d.crypto_network,
        cryptoWalletAddress: d.crypto_wallet_address,
        createdAt: d.created_at,
        reviewedAt: d.reviewed_at,
      })));
      store.setWithdrawRequests(dashboardData.withdrawRequests.map((w) => ({
        id: w.id,
        userId: w.user_id,
        userName: w.bank_name || 'مستخدم',
        amount: w.amount || 0,
        currency: w.currency || 'YER',
        method: w.method || '',
        status: w.status || 'pending',
        notes: w.admin_notes,
        cryptoNetwork: w.crypto_network,
        cryptoWalletAddress: w.crypto_wallet_address,
        bankName: w.bank_name,
        bankAccount: w.bank_account,
        createdAt: w.created_at,
        reviewedAt: w.reviewed_at,
      })));
      store.setKycPendingUsers(
        dashboardData.users
          .filter((u) => u.kyc_status === 'submitted' || u.kyc_status === 'verified' || u.kyc_status === 'rejected')
          .map((u) => ({
            id: u.id,
            uid: u.firebase_uid || u.id,
            name: u.display_name || '',
            email: u.email || '',
            kycStatus: u.kyc_status,
          }))
      );
      store.setDataLoaded(true);

    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // =====================================================
  // Computed stats
  // =====================================================

  const stats = useMemo(() => {
    if (!data) return null;

    const allUsers = data.users;
    const orders = data.orders;
    const deposits = data.depositRequests;
    const withdrawals = data.withdrawRequests;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const newToday = allUsers.filter((u) => u.created_at?.startsWith(today)).length;
    const newYesterday = allUsers.filter((u) => u.created_at?.startsWith(yesterday)).length;
    const pendingKyc = allUsers.filter((u) => u.kyc_status === 'submitted').length;
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const completed = orders.filter((o) => o.status === 'completed');

    const revYER = completed.filter((o) => o.currency === 'YER').reduce((s, o) => s + (o.amount || 0), 0);
    const revSAR = completed.filter((o) => o.currency === 'SAR').reduce((s, o) => s + (o.amount || 0), 0);
    const revUSD = completed.filter((o) => o.currency === 'USD').reduce((s, o) => s + (o.amount || 0), 0);

    const pendingDeposits = deposits.filter((d) => d.status === 'pending').length;
    const pendingWithdrawals = withdrawals.filter((w) => w.status === 'pending').length;

    const activeUsers = allUsers.filter((u) => {
      if (!u.last_login_at) return false;
      return new Date(u.last_login_at) > new Date(Date.now() - 7 * 86400000);
    }).length;

    const blockedUsers = allUsers.filter((u) => u.is_blocked).length;

    const totalDeposits = deposits.filter((d) => d.status === 'approved').reduce((s, d) => s + (d.amount || 0), 0);
    const totalWithdrawals = withdrawals.filter((w) => w.status === 'approved').reduce((s, w) => s + (w.amount || 0), 0);

    return {
      totalUsers: allUsers.length,
      newUsersToday: newToday,
      newUsersYesterday: newYesterday,
      activeUsers,
      blockedUsers,
      totalOrders: orders.length,
      pendingOrders,
      pendingDeposits,
      pendingWithdrawals,
      pendingKYC: pendingKyc,
      revenueYER: revYER,
      revenueSAR: revSAR,
      revenueUSD: revUSD,
      completedOrders: completed.length,
      totalDeposits,
      totalWithdrawals,
    };
  }, [data]);

  // Revenue chart data (last 7 days)
  const revenueChartData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = data.orders.filter((o) => o.created_at?.startsWith(dateStr) && o.status === 'completed');
      const dayDeposits = data.depositRequests.filter((d) => d.created_at?.startsWith(dateStr) && d.status === 'approved');
      chartData.push({
        name: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        الطلبات: dayOrders.length,
        الإيداعات: dayDeposits.length,
        إيرادات: dayOrders.reduce((s, o) => s + (o.amount || 0), 0),
      });
    }
    return chartData;
  }, [data]);

  // User growth chart
  const userGrowthData = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const dayUsers = data.users.filter((u) => u.created_at?.startsWith(dateStr)).length;
      chartData.push({
        name: date.toLocaleDateString('ar-SA', { weekday: 'short' }),
        المستخدمين: dayUsers,
      });
    }
    return chartData;
  }, [data]);

  // Order status distribution
  const orderStatusData = useMemo(() => {
    if (!data) return [];
    const statusCounts: Record<string, number> = {};
    data.orders.forEach((o) => {
      const s = o.status || 'unknown';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    const statusLabels: Record<string, string> = {
      pending: 'معلق', completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي', processing: 'قيد التنفيذ',
    };
    return Object.entries(statusCounts).map(([key, value]) => ({
      name: statusLabels[key] || key,
      value,
      color: CHART_COLORS[Object.keys(statusCounts).indexOf(key) % CHART_COLORS.length],
    }));
  }, [data]);

  const recentOrders = useMemo(() => {
    if (!data) return [];
    return data.orders.slice(0, 6);
  }, [data]);

  const recentActivities = useMemo(() => {
    if (!data) return [];
    const activities: Array<{ type: 'deposit' | 'withdraw'; item: SupabaseDepositRequest | SupabaseWithdrawRequest }> = [];
    data.depositRequests.slice(0, 4).forEach((d) => activities.push({ type: 'deposit', item: d }));
    data.withdrawRequests.slice(0, 4).forEach((w) => activities.push({ type: 'withdraw', item: w }));
    activities.sort((a, b) => new Date(b.item.created_at || 0).getTime() - new Date(a.item.created_at || 0).getTime());
    return activities.slice(0, 8);
  }, [data]);

  // =====================================================
  // Loading state with skeletons
  // =====================================================

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div>
          <Skeleton className="h-8 w-36 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Revenue Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ios-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-2xl" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-28 mb-1" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>

        {/* Bottom Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ListSkeleton />
          <ListSkeleton />
          <ListSkeleton />
        </div>
      </div>
    );
  }

  // =====================================================
  // Error state
  // =====================================================

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm mx-auto"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">فشل تحميل البيانات</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button
            onClick={() => fetchDashboardData()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
        </motion.div>
      </div>
    );
  }

  // If no stats yet (shouldn't happen, but just in case)
  if (!stats) return null;

  const pendingCount = stats.pendingOrders + stats.pendingDeposits + stats.pendingWithdrawals + stats.pendingKYC;
  const systemHealth = [
    { label: 'الخادم', status: 'online' as const, icon: Server },
    { label: 'قاعدة البيانات', status: 'online' as const, icon: Database },
    { label: 'الإشعارات', status: 'online' as const, icon: Bell },
    { label: `بانتظار المراجعة (${pendingCount})`, status: pendingCount > 20 ? 'warning' as const : 'online' as const, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header with Refresh */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ios-large-title text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-1">
            مرحبا {adminUser?.displayName} — ملخص النظام
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{refreshing ? 'جاري التحديث...' : 'تحديث'}</span>
          </Button>
        </div>
      </div>

      {/* Error banner (when data is stale but we have a refresh error) */}
      {error && data && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20"
        >
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <p className="text-sm text-yellow-600 dark:text-yellow-400 flex-1">
            تعذر تحديث البيانات. يتم عرض البيانات السابقة.
          </p>
          <Button variant="ghost" size="sm" onClick={() => fetchDashboardData(true)} className="text-yellow-600 dark:text-yellow-400">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إيداعات', count: stats.pendingDeposits, icon: ArrowDownCircle, color: 'from-green-600 to-emerald-700', panel: 'deposits' },
          { label: 'سحوبات', count: stats.pendingWithdrawals, icon: ArrowUpCircle, color: 'from-orange-500 to-red-600', panel: 'withdrawals' },
          { label: 'طلبات', count: stats.pendingOrders, icon: ShoppingCart, color: 'from-[#5C1A1B] to-[#3D0F10]', panel: 'orders' },
          { label: 'تحقق', count: stats.pendingKYC, icon: Shield, color: 'from-blue-500 to-cyan-600', panel: 'kyc' },
        ].map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 0.96 }}
            onClick={() => useAdminStore.getState().setActivePanel(action.panel)}
            className={cn(
              'relative flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-white text-sm font-medium',
              'bg-gradient-to-r shadow-lg transition-shadow hover:shadow-xl overflow-hidden',
              action.color
            )}
          >
            <action.icon className="w-5 h-5" />
            <span>{action.label}</span>
            {action.count > 0 && (
              <span className="absolute top-2 left-2 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-white/20 text-white text-[10px] font-bold px-1.5 backdrop-blur-sm">
                {action.count}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { title: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', sub: `${formatNumber(stats.newUsersToday)} جديد اليوم`, trend: stats.newUsersToday > stats.newUsersYesterday ? 'up' : 'down' },
          { title: 'إجمالي الطلبات', value: stats.totalOrders, icon: ShoppingCart, color: 'text-[#5C1A1B] dark:text-[#C41E3A]', bg: 'bg-[#5C1A1B]/10', sub: `${formatNumber(stats.pendingOrders)} معلق`, trend: 'up' },
          { title: 'إيداعات معلقة', value: stats.pendingDeposits, icon: ArrowDownCircle, color: 'text-green-500', bg: 'bg-green-500/10', sub: 'بانتظار المراجعة', trend: 'up' },
          { title: 'سحوبات معلقة', value: stats.pendingWithdrawals, icon: ArrowUpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', sub: 'بانتظار المراجعة', trend: 'down' },
          { title: 'تحقق معلق', value: stats.pendingKYC, icon: Shield, color: 'text-yellow-500', bg: 'bg-yellow-500/10', sub: 'بانتظار المراجعة', trend: 'up' },
          { title: 'مستخدمين نشطين', value: stats.activeUsers, icon: Activity, color: 'text-teal-500', bg: 'bg-teal-500/10', sub: 'خلال 7 أيام', trend: 'up' },
        ].map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="ios-card p-4 card-press">
              <div className="flex items-start justify-between mb-2">
                <div className={cn('p-2 rounded-xl', card.bg)}>
                  <card.icon className={cn('w-4 h-4', card.color)} />
                </div>
                {card.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <p className="text-xl font-bold text-foreground"><AnimatedCounter value={card.value} /></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.title}</p>
              <p className="text-[10px] text-muted-foreground/70">{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label: 'إيرادات الريال اليمني', value: stats.revenueYER, currency: 'YER', color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'إيرادات الريال السعودي', value: stats.revenueSAR, currency: 'SAR', color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'إيرادات الدولار', value: stats.revenueUSD, currency: 'USD', color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((rev, i) => (
          <motion.div key={rev.currency} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <div className="ios-card p-4 card-press">
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-2xl', rev.bg)}><DollarSign className={cn('w-5 h-5', rev.color)} /></div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{rev.label}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5"><AnimatedCounter value={rev.value} /> {currencySymbols[rev.currency]}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Area Chart */}
        <div className="ios-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">حجم المعاملات</h3>
              <p className="text-xs text-muted-foreground mt-0.5">آخر 7 أيام</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#5C1A1B]" />الطلبات</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#C41E3A]" />الإيداعات</span>
            </div>
          </div>
          {revenueChartData.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5C1A1B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5C1A1B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C41E3A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C41E3A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(92,26,27,0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                  <Tooltip contentStyle={{ background: '#2A1215', border: '1px solid rgba(196,30,58,0.2)', borderRadius: '12px', color: '#F5E6E8', fontSize: 12 }} />
                  <Area type="monotone" dataKey="الطلبات" stroke="#5C1A1B" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={2} />
                  <Area type="monotone" dataKey="الإيداعات" stroke="#C41E3A" fillOpacity={1} fill="url(#colorDeposits)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">لا توجد بيانات كافية للرسم البياني</p>
            </div>
          )}
        </div>

        {/* User Growth */}
        <div className="ios-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">نمو المستخدمين</h3>
              <p className="text-xs text-muted-foreground mt-0.5">تسجيلات جديدة يومياً</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs"><div className="w-2 h-2 rounded-full bg-blue-500" />مستخدمين جدد</span>
          </div>
          {userGrowthData.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(92,26,27,0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#8B5A5E' }} />
                  <Tooltip contentStyle={{ background: '#2A1215', border: '1px solid rgba(196,30,58,0.2)', borderRadius: '12px', color: '#F5E6E8', fontSize: 12 }} />
                  <Bar dataKey="المستخدمين" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">لا توجد بيانات كافية للرسم البياني</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="ios-card lg:col-span-1 overflow-hidden">
          <div className="p-4 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">آخر الطلبات</h3>
            <button onClick={() => useAdminStore.getState().setActivePanel('orders')} className="text-xs text-[#5C1A1B] dark:text-[#C41E3A] font-medium flex items-center gap-1">
              الكل <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات</p>
            ) : (
              <div>
                {recentOrders.map((order, i) => (
                  <div key={order.id || i} className="ios-list-item gap-3">
                    <div className={cn('p-1.5 rounded-lg shrink-0', order.status === 'completed' ? 'bg-green-500/10' : order.status === 'pending' ? 'bg-yellow-500/10' : 'bg-red-500/10')}>
                      {order.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : order.status === 'pending' ? <Clock className="w-4 h-4 text-yellow-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{order.package_name || order.provider_name || 'طلب'}</p>
                      <p className="text-[11px] text-muted-foreground">{order.customer_input || order.provider_name || 'مستخدم'}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-foreground">{formatNumber(order.amount || 0)} {currencySymbols[order.currency || 'YER']}</p>
                      <p className="text-[10px] text-muted-foreground">{order.status === 'completed' ? 'مكتمل' : order.status === 'pending' ? 'معلق' : order.status === 'processing' ? 'قيد التنفيذ' : 'ملغي'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="ios-card lg:col-span-1 overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground">آخر الأنشطة</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">إيداعات وسحوبات حديثة</p>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد أنشطة حديثة</p>
            ) : (
              <div>
                {recentActivities.map((activity, i) => {
                  const item = activity.item;
                  return (
                    <div key={item.id || i} className="ios-list-item gap-3">
                      <div className={cn('p-1.5 rounded-lg shrink-0', activity.type === 'deposit' ? 'bg-green-500/10' : 'bg-orange-500/10')}>
                        {activity.type === 'deposit' ? <ArrowDownCircle className="w-4 h-4 text-green-500" /> : <ArrowUpCircle className="w-4 h-4 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.type === 'deposit' ? 'طلب إيداع' : 'طلب سحب'}</p>
                        <p className="text-[11px] text-muted-foreground">{(item as any).sender_name || (item as any).bank_name || (item as any).customer_input || 'مستخدم'} • {item.created_at ? timeAgo(item.created_at) : ''}</p>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-xs font-bold text-foreground">{formatNumber((item as any).amount || 0)} {currencySymbols[(item as any).currency || 'YER']}</p>
                        <Badge className={cn('text-[9px] px-1.5 py-0', item.status === 'approved' ? 'bg-green-500/15 text-green-600 dark:text-green-400' : item.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/15 text-red-600 dark:text-red-400')}>
                          {item.status === 'approved' ? 'مكتمل' : item.status === 'pending' ? 'معلق' : 'مرفوض'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* System Health + Alerts */}
        <div className="ios-card lg:col-span-1 overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground">صحة النظام</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">حالة الخدمات</p>
          </div>
          <div className="p-2">
            {systemHealth.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className={cn('p-1.5 rounded-lg', item.status === 'online' ? 'bg-green-500/10' : 'bg-yellow-500/10')}>
                    <Icon className={cn('w-4 h-4', item.status === 'online' ? 'text-green-500' : 'text-yellow-500')} />
                  </div>
                  <span className="text-sm text-foreground flex-1">{item.label}</span>
                  <div className={cn('w-2 h-2 rounded-full', item.status === 'online' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse')} />
                </div>
              );
            })}
          </div>
          <div className="px-4 pt-2 pb-3 border-t border-border/30 mt-2">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">تنبيهات</h4>
            <div className="space-y-2">
              {stats.pendingDeposits > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  <span className="text-[11px] text-yellow-600 dark:text-yellow-400">{stats.pendingDeposits} طلب إيداع بانتظار المراجعة</span>
                </div>
              )}
              {stats.pendingWithdrawals > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-[11px] text-orange-600 dark:text-orange-400">{stats.pendingWithdrawals} طلب سحب بانتظار المراجعة</span>
                </div>
              )}
              {stats.pendingKYC > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-[11px] text-blue-600 dark:text-blue-400">{stats.pendingKYC} طلب تحقق بانتظار المراجعة</span>
                </div>
              )}
              {stats.pendingDeposits === 0 && stats.pendingWithdrawals === 0 && stats.pendingKYC === 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-[11px] text-green-600 dark:text-green-400">لا توجد طلبات معلقة</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data summary footer */}
      {data && (
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50 py-2">
          <span>المستخدمين: {formatNumber(data.users.length)}</span>
          <span>•</span>
          <span>الطلبات: {formatNumber(data.orders.length)}</span>
          <span>•</span>
          <span>الإيداعات: {formatNumber(data.depositRequests.length)}</span>
          <span>•</span>
          <span>السحوبات: {formatNumber(data.withdrawRequests.length)}</span>
        </div>
      )}
    </div>
  );
}
