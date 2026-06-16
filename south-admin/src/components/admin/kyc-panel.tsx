'use client';

import { useState, useMemo } from 'react';
import { ref, update, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, generateId, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, XCircle, UserCheck, ZoomIn, X, CreditCard, FileText, Camera, Image as ImageIcon, Shield, Clock, CheckCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notifyKycStatus } from '@/lib/notifications';

export default function KYCPanel() {
  const { adminUser, showToast, kycPendingUsers, dataLoaded } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return kycPendingUsers.filter((u: any) => {
      const matchSearch = !search || (u.name && u.name.includes(search)) || (u.email && u.email.includes(search)) || (u.kycIdNumber && u.kycIdNumber.includes(search));
      const matchStatus = statusFilter === 'all' || u.kycStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [kycPendingUsers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: kycPendingUsers.length,
    submitted: kycPendingUsers.filter((u: any) => u.kycStatus === 'submitted').length,
    verified: kycPendingUsers.filter((u: any) => u.kycStatus === 'verified').length,
    rejected: kycPendingUsers.filter((u: any) => u.kycStatus === 'rejected').length,
  }), [kycPendingUsers]);

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await update(ref(database, `users/${selected.uid}`), { kycStatus: 'verified' });
      try { await notifyKycStatus(selected.uid, 'verified'); } catch {}
      await push(ref(database, 'ownerSettings/activityLog'), {
        id: generateId(), type: 'admin', action: 'توثيق حساب',
        details: `توثيق هوية ${selected.name || selected.email}`,
        adminId: adminUser?.uid, adminName: adminUser?.displayName, timestamp: new Date().toISOString(),
      });
      showToast('تم توثيق الحساب', 'success');
      setDetailOpen(false);
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleReject = async () => {
    if (!selected) return;
    try {
      await update(ref(database, `users/${selected.uid}`), { kycStatus: 'rejected', kycRejectReason: reason });
      try { await notifyKycStatus(selected.uid, 'rejected'); } catch {}
      await push(ref(database, 'ownerSettings/activityLog'), {
        id: generateId(), type: 'admin', action: 'رفض توثيق',
        details: `رفض توثيق هوية ${selected.name || selected.email}${reason ? ` - ${reason}` : ''}`,
        adminId: adminUser?.uid, adminName: adminUser?.displayName, timestamp: new Date().toISOString(),
      });
      showToast('تم رفض التوثيق', 'success');
      setDetailOpen(false);
      setReason('');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const statusLabel: Record<string, string> = { submitted: 'مقدم', verified: 'موثق', rejected: 'مرفوض', none: 'لم يقدم' };
  const statusColor: Record<string, string> = {
    submitted: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    verified: 'bg-green-500/20 text-green-600 dark:text-green-400',
    rejected: 'bg-red-500/20 text-red-600 dark:text-red-400',
    none: 'bg-gray-500/20 text-gray-500',
  };

  const isValidImage = (val: any): val is string => {
    if (!val || typeof val !== 'string') return false;
    return val.startsWith('data:image') || val.startsWith('http') || val.startsWith('https');
  };

  if (!dataLoaded) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="relative max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <img src={previewImage} alt="معاينة" className="w-full h-auto max-h-[85vh] object-contain rounded-xl" />
              <button onClick={() => setPreviewImage(null)} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"><X size={20} color="#FFF" /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-7 h-7 text-[#5C1A1B]" />التحقق من الهوية</h1>
        <p className="text-muted-foreground text-sm mt-1">مراجعة وتوثيق هويات المستخدمين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: Users, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'بانتظار المراجعة', value: stats.submitted, icon: Clock, color: 'from-yellow-600 to-yellow-800' },
          { label: 'موثق', value: stats.verified, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'مرفوض', value: stats.rejected, icon: XCircle, color: 'from-red-600 to-red-800' },
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

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث بالاسم أو الإيميل أو رقم الهوية..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="submitted">مقدم</SelectItem>
                <SelectItem value="verified">موثق</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KYC List */}
      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">لا توجد طلبات تحقق</p></CardContent></Card>
          </motion.div>
        ) : (
          filtered.map((user: any, i: number) => (
            <motion.div key={user.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer card-press', user.kycStatus === 'submitted' && 'ring-1 ring-yellow-500/20')} onClick={() => { setSelected(user); setDetailOpen(true); setReason(''); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#5C1A1B]/10 flex items-center justify-center text-[#5C1A1B] font-bold text-sm shrink-0">{(user.name || '?')[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user.name || user.email}</p>
                        <p className="text-xs text-muted-foreground">{user.kycIdNumber || user.nationalId || user.cardNumber || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex gap-1">
                        {(isValidImage(user.kycIdPhoto) || isValidImage(user.idPhoto)) && <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center"><ImageIcon size={10} className="text-green-500" /></div>}
                        {(isValidImage(user.kycSelfie) || isValidImage(user.selfiePhoto)) && <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center"><Camera size={10} className="text-blue-500" /></div>}
                      </div>
                      <Badge className={cn('text-[10px]', statusColor[user.kycStatus] || '')}>{statusLabel[user.kycStatus] || user.kycStatus}</Badge>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#5C1A1B]" />تفاصيل التحقق من الهوية</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground">الاسم</Label><p className="font-medium mt-0.5">{selected.name || selected.firstName || '-'}</p></div>
                <div><Label className="text-muted-foreground">البريد</Label><p className="font-medium mt-0.5 text-xs break-all">{selected.email || '-'}</p></div>
              </div>

              <div className="rounded-xl p-4 bg-muted/30 space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2"><CreditCard size={16} className="text-[#5C1A1B]" />بيانات الوثيقة</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><Label className="text-muted-foreground">نوع الوثيقة</Label><p className="font-medium mt-0.5">{selected.cardType || '-'}</p></div>
                  <div><Label className="text-muted-foreground">رقم البطاقة</Label><p className="font-medium mt-0.5" dir="ltr">{selected.kycIdNumber || selected.cardNumber || selected.nationalId || '-'}</p></div>
                  <div><Label className="text-muted-foreground">مكان الإصدار</Label><p className="font-medium mt-0.5">{selected.cardIssuedAt || '-'}</p></div>
                  <div><Label className="text-muted-foreground">المحافظة</Label><p className="font-medium mt-0.5">{selected.governorate || '-'}</p></div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-muted-foreground">الحالة</Label>
                <Badge className={statusColor[selected.kycStatus]}>{statusLabel[selected.kycStatus]}</Badge>
              </div>

              {selected.kycStatus === 'rejected' && selected.kycRejectReason && (
                <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
                  <Label className="text-red-500 text-xs">سبب الرفض</Label>
                  <p className="text-sm mt-1">{selected.kycRejectReason}</p>
                </div>
              )}

              {/* AI Verification Results */}
              {selected.kycAiResult && (
                <div className="rounded-xl p-4 bg-blue-500/5 border border-blue-500/10 space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-blue-500">🤖 نتائج التحقق التلقائي</h4>
                  <div className="text-sm space-y-1">
                    {selected.kycAiResult.nameMatch !== undefined && <p>تطابق الاسم: <Badge className={cn('text-[10px]', selected.kycAiResult.nameMatch ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600')}>{selected.kycAiResult.nameMatch ? 'مطابق' : 'غير مطابق'}</Badge></p>}
                    {selected.kycAiResult.faceMatch !== undefined && <p>تطابق الوجه: <Badge className={cn('text-[10px]', selected.kycAiResult.faceMatch ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600')}>{selected.kycAiResult.faceMatch ? 'مطابق' : 'غير مطابق'}</Badge></p>}
                    {selected.kycAiResult.confidence && <p>نسبة الثقة: {selected.kycAiResult.confidence}%</p>}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-bold flex items-center gap-2"><Camera size={16} className="text-[#5C1A1B]" />صور التحقق</h4>

                {(isValidImage(selected.kycIdPhoto) || isValidImage(selected.idPhoto)) ? (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground flex items-center gap-1.5"><FileText size={14} />صورة البطاقة / الهوية</Label>
                    <div className="relative mt-1 rounded-xl overflow-hidden border border-border cursor-pointer group" onClick={() => setPreviewImage(selected.kycIdPhoto || selected.idPhoto)}>
                      <img src={selected.kycIdPhoto || selected.idPhoto} alt="صورة الهوية" className="w-full max-h-64 object-contain bg-white" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2"><ZoomIn size={24} color="#FFF" /></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-3 bg-muted/30 border border-dashed border-border text-center"><FileText size={20} className="mx-auto text-muted-foreground mb-1" /><p className="text-xs text-muted-foreground">لم يتم رفع صورة الهوية</p></div>
                )}

                {(isValidImage(selected.kycSelfie) || isValidImage(selected.selfiePhoto)) ? (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground flex items-center gap-1.5"><Camera size={14} />الصورة الشخصية (سيلفي)</Label>
                    <div className="relative mt-1 rounded-xl overflow-hidden border border-border cursor-pointer group" onClick={() => setPreviewImage(selected.kycSelfie || selected.selfiePhoto)}>
                      <img src={selected.kycSelfie || selected.selfiePhoto} alt="الصورة الشخصية" className="w-full max-h-64 object-contain bg-white" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2"><ZoomIn size={24} color="#FFF" /></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl p-3 bg-muted/30 border border-dashed border-border text-center"><Camera size={20} className="mx-auto text-muted-foreground mb-1" /><p className="text-xs text-muted-foreground">لم يتم رفع صورة شخصية</p></div>
                )}

                {/* Back ID Photo */}
                {(isValidImage(selected.kycIdBackPhoto) || isValidImage(selected.idBackPhoto)) && (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground flex items-center gap-1.5"><CreditCard size={14} />صورة خلف البطاقة</Label>
                    <div className="relative mt-1 rounded-xl overflow-hidden border border-border cursor-pointer group" onClick={() => setPreviewImage(selected.kycIdBackPhoto || selected.idBackPhoto)}>
                      <img src={selected.kycIdBackPhoto || selected.idBackPhoto} alt="خلف البطاقة" className="w-full max-h-64 object-contain bg-white" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-2"><ZoomIn size={24} color="#FFF" /></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selected.kycStatus === 'submitted' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>سبب الرفض (اختياري)</Label>
                    <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="سبب رفض التوثيق..." className="mt-1" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700"><UserCheck className="w-4 h-4 ml-1" />توثيق</Button>
                    <Button onClick={handleReject} variant="destructive" className="flex-1"><XCircle className="w-4 h-4 ml-1" />رفض</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
