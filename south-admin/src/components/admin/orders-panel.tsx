'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, timeAgo, generateId, cn, formatDateAr } from '@/lib/utils';
import { notifyOrderStatus } from '@/lib/notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, CheckCircle, XCircle, Clock, Loader2, ShoppingCart, RefreshCw, RotateCcw, Filter, X, TrendingUp, DollarSign, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrdersPanel() {
  const { adminUser, showToast, orders: storeOrders, dataLoaded } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [processNote, setProcessNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const filtered = useMemo(() => {
    return storeOrders.filter((o: any) => {
      const ms = !search || (o.userName && o.userName.includes(search)) || (o.packageName && o.packageName.includes(search)) || (o.providerName && o.providerName.includes(search)) || (o.id && o.id.includes(search));
      const mf = statusFilter === 'all' || o.status === statusFilter;
      const mp = providerFilter === 'all' || o.providerName === providerFilter;
      const md = !dateFilter || (o.createdAt && o.createdAt.startsWith(dateFilter));
      return ms && mf && mp && md;
    });
  }, [storeOrders, search, statusFilter, providerFilter, dateFilter]);

  const stats = useMemo(() => ({
    total: storeOrders.length,
    pending: storeOrders.filter((o: any) => o.status === 'pending').length,
    processing: storeOrders.filter((o: any) => o.status === 'processing').length,
    completed: storeOrders.filter((o: any) => o.status === 'completed').length,
    failed: storeOrders.filter((o: any) => o.status === 'failed').length,
    totalRevenue: storeOrders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + (o.amount || 0), 0),
  }), [storeOrders]);

  const providers = useMemo(() => {
    const set = new Set(storeOrders.map((o: any) => o.providerName).filter(Boolean));
    return Array.from(set);
  }, [storeOrders]);

  const handleProcess = async (newStatus: string) => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      await update(ref(database, `orders/${selectedOrder.id}`), {
        status: newStatus,
        processedAt: new Date().toISOString(),
        processedBy: adminUser?.uid,
        processNote: processNote || '',
      });
      try {
        await notifyOrderStatus(selectedOrder.userId, selectedOrder.id, newStatus);
      } catch {}
      await push(ref(database, 'ownerSettings/activityLog'), {
        id: generateId(), type: 'admin', action: newStatus === 'completed' ? 'إتمام طلب' : newStatus === 'failed' ? 'فشل طلب' : 'معالجة طلب',
        details: `تغيير حالة طلب ${selectedOrder.packageName || selectedOrder.providerName} إلى ${newStatus}`,
        adminId: adminUser?.uid, adminName: adminUser?.displayName, timestamp: new Date().toISOString(),
      });
      showToast(`تم تحديث حالة الطلب`, 'success');
      setDetailOpen(false);
      setProcessNote('');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setProcessing(false); }
  };

  const handleRefund = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      await update(ref(database, `orders/${selectedOrder.id}`), {
        status: 'refunded', refundedAt: new Date().toISOString(), refundedBy: adminUser?.uid,
      });
      showToast('تم استرداد المبلغ', 'success');
      setDetailOpen(false);
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setProcessing(false); }
  };

  const statusLabel: Record<string, string> = { pending: 'معلق', processing: 'قيد التنفيذ', completed: 'مكتمل', failed: 'فشل', cancelled: 'ملغي', refunded: 'مسترد' };
  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
    processing: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    completed: 'bg-green-500/15 text-green-600 dark:text-green-400',
    failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
    cancelled: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
    refunded: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  };

  if (!dataLoaded) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="w-7 h-7 text-[#5C1A1B]" />الطلبات</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة ومعالجة طلبات الخدمات</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: ShoppingCart, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'معلق', value: stats.pending, icon: Clock, color: 'from-yellow-600 to-yellow-800' },
          { label: 'قيد التنفيذ', value: stats.processing, icon: RefreshCw, color: 'from-blue-600 to-blue-800' },
          { label: 'مكتمل', value: stats.completed, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'فشل', value: stats.failed, icon: XCircle, color: 'from-red-600 to-red-800' },
          { label: 'إجمالي الإيرادات', value: formatNumber(stats.totalRevenue), icon: DollarSign, color: 'from-teal-600 to-teal-800' },
          { label: 'نسبة الإتمام', value: stats.total > 0 ? `${Math.round(stats.completed / stats.total * 100)}%` : '0%', icon: TrendingUp, color: 'from-purple-600 to-purple-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', s.color)}><s.icon className="w-4 h-4" /></div>
                  <div><p className="text-[10px] text-muted-foreground">{s.label}</p><p className="text-base font-bold">{s.value}</p></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[180px]"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" /></div></div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="processing">قيد التنفيذ</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="refunded">مسترد</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المزودين</SelectItem>
                {providers.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-[150px]" />
            {(statusFilter !== 'all' || providerFilter !== 'all' || dateFilter || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setProviderFilter('all'); setDateFilter(''); }}><X className="w-4 h-4 ml-1" />مسح</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <div className="ios-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الخدمة</TableHead>
                <TableHead>المزود</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 50).map((order: any) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/30" onClick={() => { setSelectedOrder(order); setDetailOpen(true); setProcessNote(''); }}>
                  <TableCell className="text-sm">{order.userName || '-'}</TableCell>
                  <TableCell className="text-sm">{order.packageName || '-'}</TableCell>
                  <TableCell className="text-sm">{order.providerName || '-'}</TableCell>
                  <TableCell className="text-sm font-mono">{formatNumber(order.amount || 0)} {currencySymbols[order.currency || 'YER']}</TableCell>
                  <TableCell><Badge className={cn('text-[10px]', statusColor[order.status] || '')}>{statusLabel[order.status] || order.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{order.createdAt ? timeAgo(order.createdAt) : '-'}</TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedOrder(order); setDetailOpen(true); setProcessNote(''); }}>👁</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center"><ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">لا توجد طلبات</p></div>}
        {filtered.length > 50 && <p className="text-center text-xs text-muted-foreground py-3">عرض 50 من {filtered.length}</p>}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل الطلب</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground">المستخدم</Label><p className="font-medium">{selectedOrder.userName || '-'}</p></div>
                <div><Label className="text-muted-foreground">المبلغ</Label><p className="font-bold">{formatNumber(selectedOrder.amount)} {currencySymbols[selectedOrder.currency || 'YER']}</p></div>
                <div><Label className="text-muted-foreground">الباقة</Label><p className="font-medium">{selectedOrder.packageName || '-'}</p></div>
                <div><Label className="text-muted-foreground">المزود</Label><p className="font-medium">{selectedOrder.providerName || '-'}</p></div>
                <div><Label className="text-muted-foreground">رقم الهاتف</Label><p className="font-medium" dir="ltr">{selectedOrder.phoneNumber || selectedOrder.inputValue || '-'}</p></div>
                <div><Label className="text-muted-foreground">الحالة</Label><Badge className={statusColor[selectedOrder.status]}>{statusLabel[selectedOrder.status]}</Badge></div>
                <div><Label className="text-muted-foreground">التاريخ</Label><p className="font-medium">{selectedOrder.createdAt ? formatDateAr(selectedOrder.createdAt) : '-'}</p></div>
                <div><Label className="text-muted-foreground">نوع التنفيذ</Label><p className="font-medium">{selectedOrder.executionType === 'auto' ? 'تلقائي' : 'يدوي'}</p></div>
              </div>

              {selectedOrder.apiTransactionId && (
                <div><Label className="text-muted-foreground">رقم المعاملة</Label><p className="font-mono text-xs">{selectedOrder.apiTransactionId}</p></div>
              )}

              {(selectedOrder.status === 'pending' || selectedOrder.status === 'processing') && (
                <div className="space-y-3 pt-2">
                  <div><Label>ملاحظات المعالجة</Label><Textarea value={processNote} onChange={e => setProcessNote(e.target.value)} placeholder="ملاحظات..." /></div>
                  <div className="flex gap-2">
                    {selectedOrder.status === 'pending' && (
                      <Button onClick={() => handleProcess('processing')} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={processing}><RefreshCw className="w-4 h-4 ml-1" />بدء المعالجة</Button>
                    )}
                    <Button onClick={() => handleProcess('completed')} className="flex-1 bg-green-600 hover:bg-green-700" disabled={processing}><CheckCircle className="w-4 h-4 ml-1" />إتمام</Button>
                    <Button onClick={() => handleProcess('failed')} variant="destructive" className="flex-1" disabled={processing}><XCircle className="w-4 h-4 ml-1" />فشل</Button>
                  </div>
                </div>
              )}

              {(selectedOrder.status === 'completed' || selectedOrder.status === 'failed') && (
                <Button variant="outline" onClick={handleRefund} disabled={processing} className="w-full text-orange-500 border-orange-500/30 hover:bg-orange-500/10">
                  <RotateCcw className="w-4 h-4 ml-2" />استرداد المبلغ
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
