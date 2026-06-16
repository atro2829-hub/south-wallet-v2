'use client';

import { useState, useMemo } from 'react';
import { ref, update, push, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateId, cn, formatDateAr, timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle, ArrowDownCircle, Clock, DollarSign, Calendar, X, ZoomIn, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notifyDepositStatus } from '@/lib/notifications';

export default function DepositPanel() {
  const { adminUser, showToast, depositRequests, dataLoaded } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return depositRequests.filter((d: any) => {
      const ms = !search || (d.userName && d.userName.includes(search)) || (d.userId && d.userId.includes(search));
      const mf = statusFilter === 'all' || d.status === statusFilter;
      const mc = currencyFilter === 'all' || d.currency === currencyFilter;
      const mm = methodFilter === 'all' || d.method === methodFilter;
      const md = !dateFilter || (d.createdAt && d.createdAt.startsWith(dateFilter));
      return ms && mf && mc && mm && md;
    });
  }, [depositRequests, search, statusFilter, currencyFilter, methodFilter, dateFilter]);

  const stats = useMemo(() => ({
    total: depositRequests.length,
    pending: depositRequests.filter((d: any) => d.status === 'pending').length,
    approved: depositRequests.filter((d: any) => d.status === 'approved').length,
    rejected: depositRequests.filter((d: any) => d.status === 'rejected').length,
    totalAmount: depositRequests.filter((d: any) => d.status === 'approved').reduce((s: number, d: any) => s + (d.amount || 0), 0),
    todayAmount: depositRequests.filter((d: any) => d.status === 'approved' && d.createdAt?.startsWith(new Date().toISOString().split('T')[0])).reduce((s: number, d: any) => s + (d.amount || 0), 0),
  }), [depositRequests]);

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await update(ref(database, `depositRequests/${selected.id}`), {
        status: 'approved', notes: notes || '', reviewedAt: new Date().toISOString(), reviewedBy: adminUser?.uid,
      });
      if (selected.userId && selected.amount) {
        const balanceKey = `balance${selected.currency || 'YER'}`;
        const userRef = ref(database, `users/${selected.userId}`);
        const userSnap = await get(userRef);
        const userData = userSnap.val();
        if (userData) {
          const current = userData[balanceKey] || 0;
          await update(ref(database, `users/${selected.userId}`), { [balanceKey]: current + selected.amount });
        }
      }
      try { await notifyDepositStatus(selected.userId, selected.amount, selected.currency || 'YER', 'approved'); } catch {}
      await push(ref(database, 'ownerSettings/activityLog'), {
        id: generateId(), type: 'admin', action: 'قبول إيداع',
        details: `قبول إيداع ${selected.amount} ${currencySymbols[selected.currency || 'YER']} من ${selected.userName}`,
        adminId: adminUser?.uid, adminName: adminUser?.displayName, timestamp: new Date().toISOString(),
      });
      showToast('تم قبول الإيداع وإضافة الرصيد', 'success');
      setDetailOpen(false); setNotes('');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      await update(ref(database, `depositRequests/${selected.id}`), {
        status: 'rejected', notes: notes || '', reviewedAt: new Date().toISOString(), reviewedBy: adminUser?.uid,
      });
      try { await notifyDepositStatus(selected.userId, selected.amount, selected.currency || 'YER', 'rejected'); } catch {}
      showToast('تم رفض الإيداع', 'success');
      setDetailOpen(false); setNotes('');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const statusLabel: Record<string, string> = { pending: 'معلق', approved: 'مقبول', rejected: 'مرفوض' };
  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    approved: 'bg-green-500/20 text-green-600 dark:text-green-400',
    rejected: 'bg-red-500/20 text-red-600 dark:text-red-400',
  };

  if (!dataLoaded) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
              <img src={previewImage} alt="إيصال" className="w-full max-h-[85vh] object-contain rounded-xl" />
              <button onClick={() => setPreviewImage(null)} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"><X size={20} color="#FFF" /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ArrowDownCircle className="w-7 h-7 text-green-500" />طلبات الإيداع</h1>
        <p className="text-muted-foreground text-sm mt-1">مراجعة وإدارة طلبات الإيداع</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: ArrowDownCircle, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'معلق', value: stats.pending, icon: Clock, color: 'from-yellow-600 to-yellow-800' },
          { label: 'مقبول', value: stats.approved, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'مرفوض', value: stats.rejected, icon: XCircle, color: 'from-red-600 to-red-800' },
          { label: 'إجمالي المبالغ', value: formatNumber(stats.totalAmount), icon: DollarSign, color: 'from-blue-600 to-blue-800' },
          { label: 'إيرادات اليوم', value: formatNumber(stats.todayAmount), icon: TrendingUp, color: 'from-teal-600 to-teal-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}><s.icon className="w-4 h-4" /></div>
                  <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
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
            <div className="flex-1 min-w-[180px]">
              <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" /></div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">الكل</SelectItem><SelectItem value="pending">معلق</SelectItem><SelectItem value="approved">مقبول</SelectItem><SelectItem value="rejected">مرفوض</SelectItem></SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل العملات</SelectItem><SelectItem value="YER">YER</SelectItem><SelectItem value="SAR">SAR</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل الطرق</SelectItem><SelectItem value="bank_transfer">تحويل بنكي</SelectItem><SelectItem value="cash">نقدي</SelectItem><SelectItem value="card">بطاقة</SelectItem></SelectContent>
            </Select>
            <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-[150px]" />
            {(statusFilter !== 'all' || currencyFilter !== 'all' || methodFilter !== 'all' || dateFilter || search) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setCurrencyFilter('all'); setMethodFilter('all'); setDateFilter(''); }}><X className="w-4 h-4 ml-1" />مسح</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><ArrowDownCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">لا توجد طلبات</p></CardContent></Card>
          </motion.div>
        ) : (
          filtered.map((dep: any, i: number) => (
            <motion.div key={dep.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer card-press', dep.status === 'pending' && 'ring-1 ring-yellow-500/20')} onClick={() => { setSelected(dep); setDetailOpen(true); setNotes(''); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', dep.status === 'pending' ? 'bg-yellow-500/10' : dep.status === 'approved' ? 'bg-green-500/10' : 'bg-red-500/10')}>
                        <ArrowDownCircle className={cn('w-5 h-5', dep.status === 'pending' ? 'text-yellow-500' : dep.status === 'approved' ? 'text-green-500' : 'text-red-500')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{dep.userName || 'مستخدم'}</p>
                        <p className="text-xs text-muted-foreground">{dep.createdAt ? timeAgo(dep.createdAt) : '-'}</p>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="font-bold text-sm">{formatNumber(dep.amount || 0)} {currencySymbols[dep.currency || 'YER']}</p>
                      <Badge className={cn('text-[10px]', statusColor[dep.status] || '')}>{statusLabel[dep.status] || dep.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل طلب الإيداع</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground">المستخدم</Label><p className="font-medium">{selected.userName || '-'}</p></div>
                <div><Label className="text-muted-foreground">المبلغ</Label><p className="font-bold">{formatNumber(selected.amount)} {currencySymbols[selected.currency || 'YER']}</p></div>
                <div><Label className="text-muted-foreground">الطريقة</Label><p className="font-medium">{selected.method === 'bank_transfer' ? 'تحويل بنكي' : selected.method === 'cash' ? 'نقدي' : 'بطاقة'}</p></div>
                <div><Label className="text-muted-foreground">الحالة</Label><Badge className={statusColor[selected.status]}>{statusLabel[selected.status]}</Badge></div>
                <div><Label className="text-muted-foreground">التاريخ</Label><p className="font-medium">{selected.createdAt ? formatDateAr(selected.createdAt) : '-'}</p></div>
                {selected.reviewedAt && <div><Label className="text-muted-foreground">تاريخ المراجعة</Label><p className="font-medium">{formatDateAr(selected.reviewedAt)}</p></div>}
              </div>

              {selected.receiptImage && (
                <div>
                  <Label className="text-muted-foreground">صورة الإيصال</Label>
                  <div className="mt-2 rounded-xl overflow-hidden border border-border cursor-pointer group relative" onClick={() => setPreviewImage(selected.receiptImage)}>
                    <img src={selected.receiptImage} alt="receipt" className="w-full max-h-60 object-contain bg-white" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2"><ZoomIn size={24} color="#FFF" /></div>
                    </div>
                  </div>
                </div>
              )}

              {selected.notes && <div><Label className="text-muted-foreground">ملاحظات سابقة</Label><p className="text-sm mt-1 p-2 bg-muted/30 rounded-lg">{selected.notes}</p></div>}

              {selected.status === 'pending' && (
                <>
                  <div><Label>ملاحظات</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..." /></div>
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 ml-1" />قبول</Button>
                    <Button onClick={handleReject} variant="destructive" className="flex-1"><XCircle className="w-4 h-4 ml-1" />رفض</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
