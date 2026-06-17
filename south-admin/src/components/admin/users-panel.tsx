'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { formatBalance, formatNumber, currencySymbols, timeAgo, generateId, formatDateAr, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdminHelpBox } from '@/components/admin/admin-help-box';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Search, UserCheck, UserX, DollarSign, Shield, Eye, Loader2,
  Edit, Lock, CreditCard, FileDown, Bell, Activity,
  ArrowDownCircle, ArrowUpCircle, ShoppingCart, TrendingUp,
  Users, ChevronUp, ChevronDown, Filter, X, Plus, Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendNotificationToUser } from '@/lib/notifications';

type SortField = 'name' | 'balanceYER' | 'balanceSAR' | 'balanceUSD' | 'createdAt';
type SortDir = 'asc' | 'desc';

// Map a Supabase users row (snake_case) to the camelCase shape the rest of
// this component expects. The previous implementation read camelCase directly
// from the snapshot — but Supabase returns snake_case, so every field was
// undefined and the table showed blank rows / 0 balances.
function mapDbUser(u: any) {
  const fullName = [u.first_name, u.second_name, u.third_name, u.family_name]
    .filter(Boolean).join(' ') || u.display_name || u.email?.split('@')[0] || '';
  return {
    id: u.id,
    firebase_uid: u.firebase_uid,
    email: u.email || '',
    phone: u.phone || '',
    name: fullName,
    firstName: u.first_name || '',
    familyName: u.family_name || '',
    nationalId: u.national_id || '',
    cardNumber: u.card_number || '',
    cardType: u.card_type || '',
    avatar: u.avatar_url || '',
    role: u.role || 'user',
    kycStatus: u.kyc_status || 'pending',
    isBlocked: u.is_blocked || false,
    isActive: u.is_active ?? true,
    balanceYER: Number(u.balance_yer) || 0,
    balanceSAR: Number(u.balance_sar) || 0,
    balanceUSD: Number(u.balance_usd) || 0,
    lastLogin: u.last_login_at,
    createdAt: u.created_at,
    fcmToken: u.fcm_token || '',
    governorate: u.governorate || '',
  };
}

export default function UsersPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [kycFilter, setKycFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [balanceDialog, setBalanceDialog] = useState(false);
  const [balanceCurrency, setBalanceCurrency] = useState('YER');
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract'>('add');
  const [balanceNote, setBalanceNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState('info');

  const loadUsers = useCallback(async () => {
    try {
      // Use service-role client to bypass RLS so admins can see ALL users.
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) {
        console.error('[users-panel] fetch error:', error);
        showToast?.('فشل جلب المستخدمين: ' + error.message, 'error');
        setUsers([]);
      } else {
        setUsers((data || []).map(mapDbUser));
      }
    } catch (e: any) {
      console.error('[users-panel] fetch exception:', e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
    // Subscribe to realtime inserts/updates so newly-registered users appear
    // without manual refresh.
    const channel = supabaseAdmin
      .channel(`users-panel-${Date.now()}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => loadUsers())
      .subscribe();
    return () => { try { supabaseAdmin.removeChannel(channel); } catch {} };
  }, [loadUsers]);

  const filtered = useMemo(() => {
    let result = users.filter(u => {
      const matchSearch = !search ||
        (u.name || u.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.id || '').includes(search);
      const matchKyc = kycFilter === 'all' || u.kycStatus === kycFilter;
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && !u.isBlocked) ||
        (statusFilter === 'blocked' && u.isBlocked);
      return matchSearch && matchKyc && matchRole && matchStatus;
    });

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name': aVal = (a.name || a.firstName || '').toLowerCase(); bVal = (b.name || b.firstName || '').toLowerCase(); break;
        case 'balanceYER': aVal = a.balanceYER || 0; bVal = b.balanceYER || 0; break;
        case 'balanceSAR': aVal = a.balanceSAR || 0; bVal = b.balanceSAR || 0; break;
        case 'balanceUSD': aVal = a.balanceUSD || 0; bVal = b.balanceUSD || 0; break;
        case 'createdAt': aVal = a.createdAt || ''; bVal = b.createdAt || ''; break;
        default: aVal = 0; bVal = 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [users, search, kycFilter, roleFilter, statusFilter, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => !u.isBlocked).length,
    blocked: users.filter(u => u.isBlocked).length,
    verified: users.filter(u => u.kycStatus === 'verified' || u.kycStatus === 'approved').length,
    pendingKyc: users.filter(u => u.kycStatus === 'submitted').length,
    totalBalanceYER: users.reduce((s, u) => s + (u.balanceYER || 0), 0),
    totalBalanceSAR: users.reduce((s, u) => s + (u.balanceSAR || 0), 0),
    totalBalanceUSD: users.reduce((s, u) => s + (u.balanceUSD || 0), 0),
  }), [users]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="inline-flex flex-col mr-1">
      <ChevronUp className={cn('w-3 h-3', sortField === field && sortDir === 'asc' ? 'text-foreground' : 'text-muted-foreground/40')} />
      <ChevronDown className={cn('w-3 h-3 -mt-1', sortField === field && sortDir === 'desc' ? 'text-foreground' : 'text-muted-foreground/40')} />
    </span>
  );

  const openDetail = async (user: any) => {
    setSelectedUser(user);
    setDetailOpen(true);
    setActiveDetailTab('info');
    // Load user transactions from Supabase (orders + transactions tables)
    try {
      const [ordersRes, txnsRes] = await Promise.all([
        supabaseAdmin.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabaseAdmin.from('transactions').select('*').or(`user_id.eq.${user.id},from_user_id.eq.${user.id},to_user_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(10),
      ]);
      const orders = (ordersRes.data || []).map((o: any) => ({ ...o, type: 'order', amount: o.amount, currency: o.currency, status: o.status, createdAt: o.created_at }));
      const txns = (txnsRes.data || []).map((t: any) => ({ ...t, type: 'transaction', amount: t.amount, currency: t.currency, status: t.status, createdAt: t.created_at }));
      setUserTransactions([...orders, ...txns].sort((a, b) => new Date(b.createdAt || b.created_at).getTime() - new Date(a.createdAt || a.created_at).getTime()).slice(0, 20));
    } catch (e) {
      console.warn('[loadUserTransactions] failed:', e);
      setUserTransactions([]);
    }
  };

  const toggleBlock = async (user: any) => {
    try {
      // Use Supabase service role + snake_case column name.
      const { error } = await supabaseAdmin
        .from('users')
        .update({ is_blocked: !user.isBlocked, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      showToast(user.isBlocked ? 'تم فك الحظر' : 'تم حظر المستخدم', 'success');
      loadUsers();
    } catch (e: any) {
      console.error('[toggleBlock] error:', e);
      showToast('حدث خطأ: ' + (e.message || ''), 'error');
    }
  };

  const adjustBalance = async () => {
    if (!selectedUser || balanceAmount <= 0) { showToast('أدخل مبلغ صحيح', 'error'); return; }
    setSaving(true);
    try {
      // snake_case column names
      const balanceKey = `balance_${balanceCurrency.toLowerCase()}`;
      const currentBalance = selectedUser[`balance${balanceCurrency}`] || 0;
      const newBalance = balanceAction === 'add' ? currentBalance + balanceAmount : Math.max(0, currentBalance - balanceAmount);
      const { error } = await supabaseAdmin
        .from('users')
        .update({ [balanceKey]: newBalance, updated_at: new Date().toISOString() })
        .eq('id', selectedUser.id);
      if (error) throw error;

      // Log activity
      try {
        await supabaseAdmin.from('activity_log').insert({
          user_id: selectedUser.id,
          action: balanceAction === 'add' ? 'admin_add_balance' : 'admin_subtract_balance',
          resource_type: 'user_balance',
          resource_id: selectedUser.id,
          details: `${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${balanceAmount} ${currencySymbols[balanceCurrency]} ${balanceNote ? `(${balanceNote})` : ''}`,
        });
      } catch (logErr) {
        console.warn('[adjustBalance] activity log failed (non-fatal):', logErr);
      }

      // Insert a transaction record for the user so they see it in their wallet
      try {
        await supabaseAdmin.from('transactions').insert({
          user_id: selectedUser.id,
          amount: balanceAmount,
          currency: balanceCurrency,
          type: balanceAction === 'add' ? 'deposit' : 'withdraw',
          status: 'completed',
          description: balanceAction === 'add'
            ? `إضافة رصيد من الإدارة${balanceNote ? ': ' + balanceNote : ''}`
            : `خصم رصيد من الإدارة${balanceNote ? ': ' + balanceNote : ''}`,
          reference_number: `ADM-${Date.now()}`,
          completed_at: new Date().toISOString(),
        });
      } catch (txErr) {
        console.warn('[adjustBalance] transaction record failed (non-fatal):', txErr);
      }

      // Send push notification + in-app notification to the user
      try {
        const action = balanceAction === 'add' ? 'إضافة' : 'خصم';
        const title = balanceAction === 'add' ? 'تم إضافة رصيد' : 'تم خصم رصيد';
        const body = `${action} ${balanceAmount.toLocaleString()} ${currencySymbols[balanceCurrency]}${balanceNote ? ' — ' + balanceNote : ''}`;

        // In-app notification (persisted to notifications table)
        await supabaseAdmin.from('notifications').insert({
          user_id: selectedUser.id,
          title: title,
          body: body,
          type: 'transaction',
          is_read: false,
          navigation_target: 'wallet',
          data: {
            action: balanceAction === 'add' ? 'admin_balance_added' : 'admin_balance_subtracted',
            amount: balanceAmount,
            currency: balanceCurrency,
            note: balanceNote || '',
            new_balance: newBalance,
          },
        });

        // FCM push notification
        const { data: userRow } = await supabaseAdmin.from('users')
          .select('fcm_token').eq('id', selectedUser.id).maybeSingle();
        if (userRow?.fcm_token) {
          const { sendFCMDirect } = await import('@/lib/fcm-sender');
          await sendFCMDirect([userRow.fcm_token], title, body, 'transaction', {
            action: 'admin_balance_update',
            amount: balanceAmount,
            currency: balanceCurrency,
          });
        }
      } catch (notifErr) {
        console.warn('[adjustBalance] notification failed (non-fatal):', notifErr);
      }

      showToast(`تم ${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${balanceAmount} ${currencySymbols[balanceCurrency]} وإشعار المستخدم`, 'success');
      setBalanceDialog(false);
      setBalanceNote('');
      setBalanceAmount(0);
      loadUsers(); // refresh the list
    } catch (e: any) { showToast('حدث خطأ: ' + (e.message || ''), 'error'); }
    finally { setSaving(false); }
  };

  const exportCSV = () => {
    const headers = ['الاسم', 'الهاتف', 'البريد', 'رصيد YER', 'رصيد SAR', 'رصيد USD', 'حالة KYC', 'الدور', 'الحالة', 'تاريخ التسجيل'];
    const rows = filtered.map(u => [
      u.name || u.firstName || '', u.phone || '', u.email || '',
      u.balanceYER || 0, u.balanceSAR || 0, u.balanceUSD || 0,
      u.kycStatus || 'none', u.role || 'user', u.isBlocked ? 'محظور' : 'نشط',
      u.createdAt || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات', 'success');
  };

  const kycStatusMap: Record<string, { label: string; color: string }> = {
    none: { label: 'لم يقدم', color: 'bg-gray-500/15 text-gray-500' },
    submitted: { label: 'مقدم', color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' },
    verified: { label: 'موثق', color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    approved: { label: 'معتمد', color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    rejected: { label: 'مرفوض', color: 'bg-red-500/15 text-red-600 dark:text-red-400' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري تحميل المستخدمين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHelpBox
        title="كيفية إدارة المستخدمين"
        intro="كل المستخدمين المسجّلين في المحفظة يظهرون هنا. يمكنك تعديل الأرصدة، التحقق من الهوية، تعطيل/تفعيل الحسابات، وتغيير الأدوار."
        steps={[
          { title: 'البحث والفلترة', description: 'ابحث بالاسم، البريد، رقم البطاقة، أو الهاتف. الفلاتر: نشط، موقوف، موثّق، معلّق KYC.' },
          { title: 'تعديل الرصيد', description: 'افتح ملف المستخدم واضغط "تعديل الرصيد". أدخل المبلغ والسبب (إيداع يدوي، تسوية، حذف خطأ). كل تعديل يُسجَّل في سجل النشاط.' },
          { title: 'تعطيل/تفعيل', description: 'بدّل حالة الحساب. الحساب الموقوف لا يمكنه الدخول للتطبيق. مفيد للمستخدمين المخالفين.' },
          { title: 'تغيير الدور', description: 'يمكن للمالك فقط ترقية مستخدم لمدير أو موظف. الأدوار: مستخدم، مدير، مالك.' },
          { title: 'توثيق يدوي', description: 'يمكنك توثيق هوية مستخدم يدوياً إذا كان موثوقاً دون الحاجة لرفع وثائق.' },
        ]}
        tips={[
          'لا تعدّل رصيد مستخدم دون سبب موثّق — يُسجَّل كل تعديل باسمك.',
          'عند تعطيل حساب، أرسل إشعاراً للمستخدم يشرح السبب.',
          'راجع قائمة المستخدمين الموقوفين شهرياً لإعادة التفعيل إن لزم.',
        ]}
      />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-7 h-7 text-[#5C1A1B]" />المستخدمين</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة ومراقبة حسابات المستخدمين</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2">
          <FileDown className="w-4 h-4" />تصدير CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: Users, color: 'text-[#5C1A1B]' },
          { label: 'نشط', value: stats.active, icon: UserCheck, color: 'text-green-500' },
          { label: 'محظور', value: stats.blocked, icon: UserX, color: 'text-red-500' },
          { label: 'موثق', value: stats.verified, icon: Shield, color: 'text-blue-500' },
          { label: 'KYC معلق', value: stats.pendingKyc, icon: Eye, color: 'text-yellow-500' },
          { label: 'رصيد YER', value: formatNumber(stats.totalBalanceYER), icon: DollarSign, color: 'text-red-500' },
          { label: 'رصيد SAR', value: formatNumber(stats.totalBalanceSAR), icon: DollarSign, color: 'text-green-500' },
          { label: 'رصيد USD', value: formatNumber(stats.totalBalanceUSD), icon: DollarSign, color: 'text-blue-500' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3 text-center">
                <s.icon className={cn('w-4 h-4 mx-auto mb-1', s.color)} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث بالاسم، الهاتف، البريد..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Select value={kycFilter} onValueChange={setKycFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="حالة KYC" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="none">لم يقدم</SelectItem>
                <SelectItem value="submitted">مقدم</SelectItem>
                <SelectItem value="verified">موثق</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="الدور" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأدوار</SelectItem>
                <SelectItem value="user">مستخدم</SelectItem>
                <SelectItem value="admin">مدير</SelectItem>
                <SelectItem value="owner">مالك</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="blocked">محظور</SelectItem>
              </SelectContent>
            </Select>
            {(search || kycFilter !== 'all' || roleFilter !== 'all' || statusFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setKycFilter('all'); setRoleFilter('all'); setStatusFilter('all'); }}>
                <X className="w-4 h-4 ml-1" />مسح الفلاتر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <div className="ios-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}><div className="flex items-center gap-1"><SortIcon field="name" />الاسم</div></TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>البريد</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('balanceYER')}><div className="flex items-center gap-1"><SortIcon field="balanceYER" />رصيد YER</div></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('balanceSAR')}><div className="flex items-center gap-1"><SortIcon field="balanceSAR" />رصيد SAR</div></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('balanceUSD')}><div className="flex items-center gap-1"><SortIcon field="balanceUSD" />رصيد USD</div></TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>الدور</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('createdAt')}><div className="flex items-center gap-1"><SortIcon field="createdAt" />التاريخ</div></TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map((user) => {
                const kyc = kycStatusMap[user.kycStatus] || kycStatusMap.none;
                return (
                  <TableRow key={user.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openDetail(user)}>
                    <TableCell className="font-medium text-sm">{user.name || user.firstName || 'بدون اسم'}</TableCell>
                    <TableCell className="text-sm">{user.phone || '-'}</TableCell>
                    <TableCell className="text-sm">{user.email || '-'}</TableCell>
                    <TableCell className="text-sm font-mono">{formatNumber(user.balanceYER || 0)}</TableCell>
                    <TableCell className="text-sm font-mono">{formatNumber(user.balanceSAR || 0)}</TableCell>
                    <TableCell className="text-sm font-mono">{formatNumber(user.balanceUSD || 0)}</TableCell>
                    <TableCell><Badge className={cn('text-[10px]', kyc.color)}>{kyc.label}</Badge></TableCell>
                    <TableCell className="text-sm">{user.role === 'owner' ? 'مالك' : user.role === 'admin' ? 'مدير' : 'مستخدم'}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px]', user.isBlocked ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-green-500/15 text-green-600 dark:text-green-400')}>
                        {user.isBlocked ? 'محظور' : 'نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openDetail(user)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className={cn('h-7 w-7 p-0', user.isBlocked ? 'text-green-500' : 'text-red-500')} onClick={() => toggleBlock(user)}>
                          {user.isBlocked ? <Lock className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center"><Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">لا يوجد مستخدمين</p></div>
        )}
        {filtered.length > 50 && <p className="text-center text-xs text-muted-foreground py-3">عرض 50 من {filtered.length} مستخدم</p>}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5C1A1B]" />
              تفاصيل المستخدم
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">المعلومات</TabsTrigger>
                <TabsTrigger value="balance" className="flex-1">الأرصدة</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1">المعاملات</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-muted-foreground text-xs">الاسم</Label><p className="font-medium text-sm">{selectedUser.name || selectedUser.firstName || '-'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">الهاتف</Label><p className="font-medium text-sm">{selectedUser.phone || '-'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">البريد</Label><p className="font-medium text-sm">{selectedUser.email || '-'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">الدور</Label><p className="font-medium text-sm">{selectedUser.role === 'owner' ? 'مالك' : selectedUser.role === 'admin' ? 'مدير' : 'مستخدم'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">حالة KYC</Label><Badge className={cn('text-xs', (kycStatusMap[selectedUser.kycStatus] || kycStatusMap.none).color)}>{(kycStatusMap[selectedUser.kycStatus] || kycStatusMap.none).label}</Badge></div>
                  <div><Label className="text-muted-foreground text-xs">الحالة</Label><Badge className={cn('text-xs', selectedUser.isBlocked ? 'bg-red-500/15 text-red-600' : 'bg-green-500/15 text-green-600')}>{selectedUser.isBlocked ? 'محظور' : 'نشط'}</Badge></div>
                  <div><Label className="text-muted-foreground text-xs">تاريخ التسجيل</Label><p className="text-sm">{selectedUser.createdAt ? formatDateAr(selectedUser.createdAt) : '-'}</p></div>
                  <div><Label className="text-muted-foreground text-xs">آخر دخول</Label><p className="text-sm">{selectedUser.lastLogin ? formatDateAr(selectedUser.lastLogin) : '-'}</p></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className={cn(selectedUser.isBlocked ? 'text-green-500' : 'text-red-500')} onClick={() => toggleBlock(selectedUser)}>
                    {selectedUser.isBlocked ? <><UserCheck className="w-4 h-4 ml-1" />فك الحظر</> : <><UserX className="w-4 h-4 ml-1" />حظر</>}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="balance" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {(['YER', 'SAR', 'USD'] as const).map(cur => (
                    <Card key={cur} className="border border-border/30">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">{currencySymbols[cur]}</p>
                        <p className="text-xl font-bold mt-1">{formatNumber(selectedUser[`balance${cur}`] || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">{cur}</p>
                        <Button size="sm" variant="outline" className="mt-2 h-7 text-xs w-full" onClick={() => { setBalanceCurrency(cur); setBalanceDialog(true); }}>
                          <DollarSign className="w-3 h-3 ml-1" />تعديل
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="transactions" className="mt-4 space-y-3">
                {userTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">لا توجد معاملات</p>
                ) : (
                  userTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{tx.packageName || tx.providerName || 'طلب'}</p>
                          <p className="text-[10px] text-muted-foreground">{tx.createdAt ? timeAgo(tx.createdAt) : ''}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">{formatNumber(tx.amount || 0)} {currencySymbols[tx.currency || 'YER']}</p>
                        <Badge className={cn('text-[9px]', tx.status === 'completed' ? 'bg-green-500/15 text-green-600 dark:text-green-400' : tx.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/15 text-red-600 dark:text-red-400')}>
                          {tx.status === 'completed' ? 'مكتمل' : tx.status === 'pending' ? 'معلق' : 'ملغي'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceDialog} onOpenChange={setBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#5C1A1B]" />
              تعديل الرصيد ({currencySymbols[balanceCurrency]})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm">الرصيد الحالي: <span className="font-bold">{formatNumber(selectedUser?.[`balance${balanceCurrency}`] || 0)} {currencySymbols[balanceCurrency]}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant={balanceAction === 'add' ? 'default' : 'outline'} className={cn(balanceAction === 'add' && 'bg-green-600 hover:bg-green-700')} onClick={() => setBalanceAction('add')}>
                <Plus className="w-4 h-4 ml-1" />إضافة
              </Button>
              <Button variant={balanceAction === 'subtract' ? 'default' : 'outline'} className={cn(balanceAction === 'subtract' && 'bg-red-600 hover:bg-red-700')} onClick={() => setBalanceAction('subtract')}>
                <Minus className="w-4 h-4 ml-1" />خصم
              </Button>
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" value={balanceAmount || ''} onChange={e => setBalanceAmount(Number(e.target.value))} placeholder="0" min={0} />
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Textarea value={balanceNote} onChange={e => setBalanceNote(e.target.value)} placeholder="سبب التعديل..." rows={2} />
            </div>
            <div className="p-3 bg-muted/30 rounded-lg text-sm">
              الرصيد بعد التعديل: <span className="font-bold">
                {formatNumber(balanceAction === 'add'
                  ? (selectedUser?.[`balance${balanceCurrency}`] || 0) + balanceAmount
                  : Math.max(0, (selectedUser?.[`balance${balanceCurrency}`] || 0) - balanceAmount)
                )} {currencySymbols[balanceCurrency]}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialog(false)}>إلغاء</Button>
            <Button onClick={adjustBalance} disabled={saving || balanceAmount <= 0} className={cn(balanceAction === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}>
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
