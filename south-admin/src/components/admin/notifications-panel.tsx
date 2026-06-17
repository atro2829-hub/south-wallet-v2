'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { sendNotificationToAll, sendNotificationToUser } from '@/lib/notifications';
import { useAdminStore } from '@/lib/store';
import { formatNumber, formatDateAr } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Send, Loader2, Users, User, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminNotification {
  id?: string;
  title: string;
  body: string;
  type: string;
  target_role: string;
  is_read: boolean;
  sent_at: string;
  data?: any;
}

export default function NotificationsPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'all' | 'specific'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Load admin_notifications from Supabase directly
      const { data: notifData, error: notifErr } = await supabaseAdmin
        .from('admin_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);
      if (notifErr) {
        console.warn('[notifications-panel] fetch error:', notifErr.message);
        setHistory([]);
      } else {
        setHistory((notifData || []) as AdminNotification[]);
      }

      // Load users for the specific-user dropdown
      const { data: userData, error: userErr } = await supabaseAdmin
        .from('users')
        .select('id, email, display_name, card_number')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!userErr && userData) {
        setUsers(userData.map((u: any) => ({
          uid: u.id,
          email: u.email,
          name: u.display_name || u.email,
          cardNumber: u.card_number,
        })));
      }
    } catch (e) {
      console.error('[notifications-panel] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabaseAdmin
      .channel(`admin-notif-panel-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_notifications' }, () => loadData())
      .subscribe();
    return () => { try { supabaseAdmin.removeChannel(channel); } catch {} };
  }, [loadData]);

  const handleSend = async () => {
    if (!title || !body) { showToast('أدخل العنوان والنص', 'error'); return; }
    setSending(true);
    try {
      if (type === 'all') {
        // Send to ALL users via sendNotificationToAll (inserts into each user's notifications + FCM)
        await sendNotificationToAll({
          title,
          body,
          type: 'info',
          navigationTarget: null,
          data: { source: 'admin_broadcast', sentBy: adminUser?.displayName },
        });
        showToast('تم إرسال الإشعار لكل المستخدمين', 'success');
      } else {
        if (!targetUserId) { showToast('اختر مستخدماً', 'error'); setSending(false); return; }
        await sendNotificationToUser(targetUserId, {
          title,
          body,
          type: 'info',
          data: { source: 'admin_direct', sentBy: adminUser?.displayName },
        });
        showToast('تم إرسال الإشعار للمستخدم', 'success');
      }
      setTitle('');
      setBody('');
      setTargetUserId('');
    } catch (e: any) {
      showToast('فشل الإرسال: ' + (e.message || ''), 'error');
    } finally {
      setSending(false);
    }
  };

  const filtered = history.filter(n =>
    !search || (n.title || '').includes(search) || (n.body || '').includes(search)
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-7 h-7 text-[#5C1A1B]" />الإشعارات</h1>
        <p className="text-muted-foreground text-sm mt-1">إرسال إشعارات للمستخدمين وعرض الإشعارات الواردة</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Form */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="w-5 h-5 text-[#5C1A1B]" />إرسال إشعار</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>المستهدف</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المستخدمين</SelectItem>
                  <SelectItem value="specific">مستخدم محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === 'specific' && (
              <div>
                <Label>اختر المستخدم</Label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger><SelectValue placeholder="ابحث بالاسم أو البريد..." /></SelectTrigger>
                  <SelectContent>
                    {users.map((u: any) => (
                      <SelectItem key={u.uid} value={u.uid}>
                        {u.name} {u.cardNumber ? `(${u.cardNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>العنوان</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الإشعار" />
            </div>
            <div>
              <Label>النص</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="نص الإشعار..." rows={3} />
            </div>
            <Button onClick={handleSend} disabled={sending || !title || !body} className="w-full bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {sending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
              إرسال
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5 text-[#5C1A1B]" />الإشعارات الواردة ({history.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {loading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">لا توجد إشعارات</div>
              ) : (
                filtered.map((n, i) => (
                  <motion.div key={n.id || i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <div className={`p-3 rounded-xl border ${n.is_read ? 'bg-muted/20' : 'bg-[#5C1A1B]/5 border-[#5C1A1B]/20'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px]">{n.type}</Badge>
                            <span className="text-[10px] text-muted-foreground">{n.sent_at ? formatDateAr(n.sent_at) : ''}</span>
                          </div>
                        </div>
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-[#5C1A1B] shrink-0 mt-1" />}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
