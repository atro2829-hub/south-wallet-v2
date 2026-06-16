'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, formatDateAr } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Gift, AlertTriangle, Loader2, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserGiftCode {
  id?: string;
  code: string;
  amount: number;
  currency: string;
  createdBy: string;
  createdByName: string;
  redeemedBy?: string;
  redeemedByName?: string;
  status: 'active' | 'redeemed' | 'cancelled';
  createdAt: string;
  redeemedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export default function UserGiftCodesPanel() {
  const { showToast } = useAdminStore();
  const [codes, setCodes] = useState<UserGiftCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCode, setSelectedCode] = useState<UserGiftCode | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const ref_ = ref(database, 'userGiftCodes');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      const list: UserGiftCode[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCodes(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCancelCode = async () => {
    if (!selectedCode?.id) return;
    try {
      await update(ref(database, `userGiftCodes/${selectedCode.id}`), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelReason: cancelReason || 'إلغاء بواسطة الإدارة',
      });

      // Notify user about gift code cancellation
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedCode.createdBy, {
          title: 'تم إلغاء قسيمة الهدية',
          body: 'تم إلغاء قسيمة الهدية الخاصة بك وإرجاع المبلغ إلى رصيدك',
          type: 'transaction',
          data: { action: 'gift_code_cancelled', codeId: selectedCode.id },
        });
      } catch (e) { console.warn('Gift code cancel notification failed:', e); }

      showToast('تم إلغاء القسيمة', 'success');
      setCancelDialog(false);
      setCancelReason('');
      setDetailOpen(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const filteredCodes = codes.filter((c) => {
    const matchesSearch = !search || c.code?.includes(search) || c.createdByName?.includes(search) || c.redeemedByName?.includes(search);
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCodes = codes.filter((c) => c.status === 'active');
  const redeemedCodes = codes.filter((c) => c.status === 'redeemed');
  const cancelledCodes = codes.filter((c) => c.status === 'cancelled');
  const totalValue = codes.reduce((sum, c) => sum + (c.amount || 0), 0);
  const activeValue = activeCodes.reduce((sum, c) => sum + (c.amount || 0), 0);

  const statusLabels: Record<string, string> = {
    active: 'نشط',
    redeemed: 'مستبدل',
    cancelled: 'ملغي',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-600 dark:text-green-400',
    redeemed: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    cancelled: 'bg-red-500/20 text-red-600 dark:text-red-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">قسائم الهدايا بين المستخدمين</h1>
        <p className="text-muted-foreground text-sm mt-1">مراقبة وإدارة قسائم الهدايا المتبادلة بين المستخدمين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="admin-card border-0 shadow-none">
            <CardContent className="p-4 text-center">
              <Gift className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-xl font-bold">{formatNumber(codes.length)}</p>
              <p className="text-xs text-muted-foreground">إجمالي القسائم</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="admin-card border-0 shadow-none">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-xl font-bold">{formatNumber(activeCodes.length)}</p>
              <p className="text-xs text-muted-foreground">قسائم نشطة</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="admin-card border-0 shadow-none">
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-xl font-bold">{formatNumber(redeemedCodes.length)}</p>
              <p className="text-xs text-muted-foreground">قسائم مستبدلة</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="admin-card border-0 shadow-none">
            <CardContent className="p-4 text-center">
              <span className="text-lg font-bold text-orange-500 block mb-1">{currencySymbols.YER}</span>
              <p className="text-xl font-bold">{formatNumber(activeValue)}</p>
              <p className="text-xs text-muted-foreground">قيمة القسائم النشطة</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالكود أو اسم المستخدم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="redeemed">مستبدل</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Codes List */}
      <div className="space-y-3 max-h-[calc(100vh-480px)] overflow-y-auto scrollbar-thin">
        {filteredCodes.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <Card className="admin-card border-0 shadow-none cursor-pointer card-press" onClick={() => { setSelectedCode(c); setDetailOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold" dir="ltr">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(c.amount)} {currencySymbols[c.currency || 'YER']}</p>
                      <p className="text-xs text-muted-foreground">من: {c.createdByName || 'مجهول'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[c.status] || ''}>{statusLabels[c.status] || c.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filteredCodes.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا توجد قسائم هدايا</p>
        )}
      </div>

      {/* Code Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل قسيمة الهدية</DialogTitle>
          </DialogHeader>
          {selectedCode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">الكود</Label>
                  <p className="font-mono font-bold" dir="ltr">{selectedCode.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">المبلغ</Label>
                  <p className="font-bold">{formatNumber(selectedCode.amount)} {currencySymbols[selectedCode.currency || 'YER']}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الحالة</Label>
                  <Badge className={statusColors[selectedCode.status] || ''}>{statusLabels[selectedCode.status] || selectedCode.status}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">تاريخ الإنشاء</Label>
                  <p className="text-sm">{selectedCode.createdAt ? formatDateAr(selectedCode.createdAt) : '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">أُنشئ بواسطة</Label>
                  <p className="text-sm">{selectedCode.createdByName || selectedCode.createdBy || 'مجهول'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">استُبدل بواسطة</Label>
                  <p className="text-sm">{selectedCode.redeemedByName || selectedCode.redeemedBy || '-'}</p>
                </div>
                {selectedCode.redeemedAt && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">تاريخ الاستبدال</Label>
                    <p className="text-sm">{formatDateAr(selectedCode.redeemedAt)}</p>
                  </div>
                )}
                {selectedCode.cancelReason && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">سبب الإلغاء</Label>
                    <p className="text-sm">{selectedCode.cancelReason}</p>
                  </div>
                )}
              </div>

              {selectedCode.status === 'active' && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setCancelDialog(true)}
                >
                  <AlertTriangle className="w-4 h-4 ml-2" />
                  إلغاء القسيمة
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Code Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء قسيمة الهدية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-600 dark:text-red-400">
                هل أنت متأكد من إلغاء هذه القسيمة؟ سيتم إرجاع المبلغ لصاحب القسيمة.
              </p>
            </div>
            <div>
              <Label>سبب الإلغاء (اختياري)</Label>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="أدخل سبب الإلغاء..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>تراجع</Button>
            <Button variant="destructive" onClick={handleCancelCode}>إلغاء القسيمة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
