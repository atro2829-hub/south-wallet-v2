'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, onValue, update, get, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatBalance, formatNumber, currencySymbols, timeAgo, generateId, formatDateAr, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key, ...val,
        balanceYER: val.balanceYER || 0,
        balanceSAR: val.balanceSAR || 0,
        balanceUSD: val.balanceUSD || 0,
      }));
      setUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
    // Load user transactions
    try {
      const ordersSnap = await get(ref(database, 'orders'));
      const ordersData = ordersSnap.val() || {};
      const txns = Object.entries(ordersData)
        .filter(([, v]: [string, any]) => v.userId === user.id)
        .map(([key, v]: [string, any]) => ({ id: key, ...v, type: 'order' }))
        .slice(0, 20);
      setUserTransactions(txns);
    } catch { setUserTransactions([]); }
  };

  const toggleBlock = async (user: any) => {
    try {
      await update(ref(database, `users/${user.id}`), { isBlocked: !user.isBlocked });
      showToast(user.isBlocked ? 'تم فك الحظر' : 'تم حظر المستخدم', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const adjustBalance = async () => {
    if (!selectedUser || balanceAmount <= 0) { showToast('أدخل مبلغ صحيح', 'error'); return; }
    setSaving(true);
    try {
      const balanceKey = `balance${balanceCurrency}`;
      const currentBalance = selectedUser[balanceKey] || 0;
      const newBalance = balanceAction === 'add' ? currentBalance + balanceAmount : Math.max(0, currentBalance - balanceAmount);
      await update(ref(database, `users/${selectedUser.id}`), { [balanceKey]: newBalance });

      // Log activity
      await push(ref(database, 'ownerSettings/activityLog'), {
        id: generateId(), type: 'admin', action: balanceAction === 'add' ? 'إضافة رصيد' : 'خصم رصيد',
        details: `${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${balanceAmount} ${currencySymbols[balanceCurrency]} ${balanceNote ? `(${balanceNote})` : ''}`,
        adminId: adminUser?.uid, adminName: adminUser?.displayName,
        userId: selectedUser.id, timestamp: new Date().toISOString(),
      });

      showToast(`تم ${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${balanceAmount} ${currencySymbols[balanceCurrency]}`, 'success');
      setBalanceDialog(false);
      setBalanceNote('');
      setBalanceAmount(0);
    } catch { showToast('حدث خطأ', 'error'); }
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
