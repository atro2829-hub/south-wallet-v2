'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push } from 'firebase/database';
import { database } from '@/lib/firebase';
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
  targetType: 'all' | 'specific';
  targetUserId?: string;
  sentAt: string;
  sentBy: string;
  sentByName: string;
  recipientCount?: number;
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

  useEffect(() => {
    const notifRef = ref(database, 'adminNotifications');
    const unsub1 = onValue(notifRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: AdminNotification[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setHistory(list);
      setLoading(false);
    });

    const usersRef = ref(database, 'users');
    const unsub2 = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([uid, val]: [string, any]) => ({ uid, ...val }));
      setUsers(list);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const handleSend = async () => {
    if (!title || !body) return;
    setSending(true);
    try {
      if (type === 'all') {
        await push(ref(database, 'adminNotifications'), {
          title,
          body,
          type: 'broadcast',
          targetType: 'all',
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          sentBy: adminUser?.uid,
          sentByName: adminUser?.displayName,
          recipientCount: users.length,
        });

        // Save to global notifications path
        await push(ref(database, 'adminSettings/globalNotifications'), {
          title,
          body,
          type: 'broadcast',
          createdAt: new Date().toISOString(),
          sentBy: adminUser?.uid,
        });

        showToast(`تم إرسال الإشعار لجميع المستخدمين (${users.length})`, 'success');
      } else if (targetUserId) {
        await push(ref(database, 'adminNotifications'), {
          title,
          body,
          type: 'specific',
          targetType: 'specific',
          targetUserId,
          createdAt: new Date().toISOString(),
          sentAt: new Date().toISOString(),
          sentBy: adminUser?.uid,
          sentByName: adminUser?.displayName,
          recipientCount: 1,
        });

        await push(ref(database, `notifications/${targetUserId}`), {
          title,
          body,
          type: 'admin',
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        showToast('تم إرسال الإشعار للمستخدم', 'success');
      }
      setTitle(''); setBody(''); setTargetUserId('');
    } catch (e) { showToast('حدث خطأ', 'error'); }
    finally { setSending(false); }
  };

  const filteredHistory = history.filter((n) =>
    !search || n.title?.includes(search) || n.body?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإشعارات</h1>
        <p className="text-muted-foreground text-sm mt-1">إرسال إشعارات للمستخدمين وإدارة سجل الإشعارات</p>
      </div>

      <Tabs defaultValue="send">
        <TabsList className="w-full">
          <TabsTrigger value="send" className="flex-1">إرسال إشعار</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">سجل الإشعارات</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10">
                  <Bell className="w-6 h-6 text-purple-500" />
                  <div>
                    <p className="font-medium text-sm">إرسال إشعار جديد</p>
                    <p className="text-xs text-muted-foreground">إرسال إشعار فوري للمستخدمين</p>
                  </div>
                </div>

                <div>
                  <Label>نوع الإرسال</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" /> لجميع المستخدمين
                        </div>
                      </SelectItem>
                      <SelectItem value="specific">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" /> لمستخدم محدد
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {type === 'specific' && (
                  <div>
                    <Label>معرف المستخدم (UID)</Label>
                    <Input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} dir="ltr" placeholder="أدخل UID المستخدم..." />
                  </div>
                )}

                <div>
                  <Label>عنوان الإشعار</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإشعار..." />
                </div>

                <div>
                  <Label>محتوى الإشعار</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="محتوى الإشعار..." className="min-h-[120px]" />
                </div>

                <Button onClick={handleSend} disabled={sending || !title || !body} className="w-full bg-purple-600 hover:bg-purple-700">
                  {sending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                  إرسال الإشعار
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث في الإشعارات..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>

          <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin">
            {filteredHistory.map((notif, i) => (
              <motion.div key={notif.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-xs text-muted-foreground">{notif.body?.substring(0, 80)}{notif.body?.length > 80 ? '...' : ''}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs">
                              {notif.targetType === 'all' ? 'للجميع' : 'لمستخدم محدد'}
                            </Badge>
                            {notif.recipientCount && (
                              <span className="text-xs text-muted-foreground">({notif.recipientCount} مستلم)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">{notif.sentAt ? formatDateAr(notif.sentAt) : ''}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.sentByName || ''}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filteredHistory.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا يوجد سجل إشعارات</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
