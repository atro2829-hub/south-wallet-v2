'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, update, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, formatDateAr, generateId, cn, timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Bell, Loader2, Users, User, Clock, CheckCircle, Calendar, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendFCMDirect } from '@/lib/fcm-sender';

interface NotificationHistory {
  id?: string;
  title: string;
  body: string;
  type: string;
  targetType: string;
  targetSegment?: string;
  sentAt: string;
  sentBy: string;
  sentByName: string;
  recipientCount?: number;
  deliveryRate?: number;
  scheduledAt?: string;
  status: 'sent' | 'scheduled' | 'failed';
}

export default function PushNotificationsPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'info' | 'transaction' | 'security' | 'promo'>('info');
  const [targetType, setTargetType] = useState<'all' | 'specific' | 'segment'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [targetSegment, setTargetSegment] = useState('all_users');
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNotif, setSelectedNotif] = useState<NotificationHistory | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const histRef = ref(database, 'adminNotifications');
    const unsub = onValue(histRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: NotificationHistory[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key, title: val.title || '', body: val.body || '', type: val.type || 'info',
        targetType: val.targetType || 'all', targetSegment: val.targetSegment || '',
        sentAt: val.sentAt || '', sentBy: val.sentBy || '', sentByName: val.sentByName || '',
        recipientCount: val.recipientCount || 0, deliveryRate: val.deliveryRate || 0,
        scheduledAt: val.scheduledAt || '', status: val.status || 'sent',
      }));
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setHistory(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter(n => {
      const ms = !search || n.title.includes(search) || n.body.includes(search);
      const mf = statusFilter === 'all' || n.status === statusFilter;
      return ms && mf;
    });
  }, [history, search, statusFilter]);

  const stats = useMemo(() => ({
    total: history.length,
    sent: history.filter(n => n.status === 'sent').length,
    scheduled: history.filter(n => n.status === 'scheduled').length,
    failed: history.filter(n => n.status === 'failed').length,
  }), [history]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { showToast('أدخل العنوان والنص', 'error'); return; }
    setSending(true);
    try {
      const notifData: any = {
        title: title.trim(), body: body.trim(), type,
        targetType, sentBy: adminUser?.uid, sentByName: adminUser?.displayName,
        sentAt: new Date().toISOString(), status: scheduleLater ? 'scheduled' : 'sent',
      };
      if (targetType === 'specific') notifData.targetUserId = targetUserId;
      if (targetType === 'segment') notifData.targetSegment = targetSegment;
      if (scheduleLater && scheduledAt) notifData.scheduledAt = scheduledAt;

      if (!scheduleLater) {
        try {
          const result = await sendFCMDirect(title, body, type, targetType === 'specific' ? targetUserId : undefined);
          notifData.recipientCount = result?.successCount || 0;
          notifData.deliveryRate = result?.successCount && result?.totalTokens ? Math.round(result.successCount / result.totalTokens * 100) : 0;
        } catch { notifData.status = 'failed'; }
      }

      await push(ref(database, 'adminNotifications'), notifData);
      showToast(scheduleLater ? 'تم جدولة الإشعار' : 'تم إرسال الإشعار', 'success');
      setTitle(''); setBody(''); setTargetUserId('');
      setScheduleLater(false); setScheduledAt('');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSending(false); }
  };

  const typeLabels: Record<string, string> = { info: 'معلومات', transaction: 'معاملة', security: 'أمان', promo: 'ترويجي' };
  const typeColors: Record<string, string> = { info: 'bg-blue-500/15 text-blue-600', transaction: 'bg-green-500/15 text-green-600', security: 'bg-red-500/15 text-red-600', promo: 'bg-purple-500/15 text-purple-600' };
  const statusLabels: Record<string, string> = { sent: 'مرسل', scheduled: 'مجدول', failed: 'فشل' };
  const statusColors: Record<string, string> = { sent: 'bg-green-500/15 text-green-600', scheduled: 'bg-yellow-500/15 text-yellow-600', failed: 'bg-red-500/15 text-red-600' };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Send className="w-7 h-7 text-[#5C1A1B]" />دفع الإشعارات</h1>
        <p className="text-muted-foreground text-sm mt-1">إرسال إشعارات فورية للمستخدمين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: Bell, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'مرسل', value: stats.sent, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'مجدول', value: stats.scheduled, icon: Calendar, color: 'from-yellow-600 to-yellow-800' },
          { label: 'فشل', value: stats.failed, icon: Bell, color: 'from-red-600 to-red-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compose */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><Send className="w-5 h-5 text-[#5C1A1B]" />إنشاء إشعار</h3>
            <div>
              <Label>العنوان</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الإشعار..." />
            </div>
            <div>
              <Label>النص</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="نص الإشعار..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>النوع</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">معلومات</SelectItem>
                    <SelectItem value="transaction">معاملة</SelectItem>
                    <SelectItem value="security">أمان</SelectItem>
                    <SelectItem value="promo">ترويجي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الإرسال إلى</Label>
                <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستخدمين</SelectItem>
                    <SelectItem value="specific">مستخدم محدد</SelectItem>
                    <SelectItem value="segment">فئة محددة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {targetType === 'specific' && (
              <div><Label>معرف المستخدم</Label><Input value={targetUserId} onChange={e => setTargetUserId(e.target.value)} placeholder="UID المستخدم..." /></div>
            )}
            {targetType === 'segment' && (
              <div><Label>الفئة</Label>
                <Select value={targetSegment} onValueChange={setTargetSegment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">كل المستخدمين</SelectItem>
                    <SelectItem value="verified">موثقين</SelectItem>
                    <SelectItem value="unverified">غير موثقين</SelectItem>
                    <SelectItem value="active">نشطين (7 أيام)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch checked={scheduleLater} onCheckedChange={setScheduleLater} />
              <Label>جدولة لوقت لاحق</Label>
            </div>
            {scheduleLater && (
              <div><Label>وقت الإرسال</Label><Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></div>
            )}
            <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} className="w-full bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {sending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
              {scheduleLater ? 'جدولة الإشعار' : 'إرسال الإشعار'}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-[#5C1A1B]" />سجل الإشعارات</h3>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="sent">مرسل</SelectItem>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="failed">فشل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin space-y-2">
              {filteredHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">لا توجد إشعارات</p>
              ) : (
                filteredHistory.map((notif) => (
                  <div key={notif.id} className="p-3 rounded-xl bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => { setSelectedNotif(notif); setDetailOpen(true); }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notif.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{notif.body}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={cn('text-[9px]', typeColors[notif.type])}>{typeLabels[notif.type]}</Badge>
                        <Badge className={cn('text-[9px]', statusColors[notif.status])}>{statusLabels[notif.status]}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span>{timeAgo(notif.sentAt)}</span>
                      {notif.recipientCount > 0 && <span>→ {notif.recipientCount} مستلم</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>تفاصيل الإشعار</DialogTitle></DialogHeader>
          {selectedNotif && (
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="font-medium">{selectedNotif.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedNotif.body}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><Label className="text-muted-foreground text-xs">النوع</Label><p>{typeLabels[selectedNotif.type]}</p></div>
                <div><Label className="text-muted-foreground text-xs">الحالة</Label><Badge className={statusColors[selectedNotif.status]}>{statusLabels[selectedNotif.status]}</Badge></div>
                <div><Label className="text-muted-foreground text-xs">تاريخ الإرسال</Label><p>{selectedNotif.sentAt ? formatDateAr(selectedNotif.sentAt) : '-'}</p></div>
                <div><Label className="text-muted-foreground text-xs">المستلمين</Label><p>{selectedNotif.recipientCount || 0}</p></div>
                <div><Label className="text-muted-foreground text-xs">المرسل</Label><p>{selectedNotif.sentByName}</p></div>
                <div><Label className="text-muted-foreground text-xs">نسبة التوصيل</Label><p>{selectedNotif.deliveryRate || 0}%</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
