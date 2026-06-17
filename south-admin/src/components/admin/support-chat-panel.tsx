'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { sendNotificationToUser } from '@/lib/notifications';
import { useAdminStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageCircle, CheckCircle, Search, XCircle, Clock, Headphones, Ticket, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SupportTicket {
  id: string;
  user_id: string;
  user_name: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  image?: string;
}

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_name: string;
  message: string;
  attachments?: string;
  is_read: boolean;
  created_at: string;
}

interface LiveConversation {
  id: string;          // chat UUID
  user_id: string;
  user_name: string;
  status: string;
  last_message: string;
  last_message_at: string;
  unread_admin: number;
  unread_user: number;
}

interface LiveMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  message_type: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'مفتوح', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  in_progress: { label: 'قيد المتابعة', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  resolved: { label: 'تم الحل', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  closed: { label: 'مغلق', color: '#666', bg: 'rgba(102,102,102,0.12)' },
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SupportChatPanel() {
  const [activeTab, setActiveTab] = useState<string>('tickets');
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الدعم والمساعدة</h1>
            <p className="text-muted-foreground text-sm mt-1">إدارة تذاكر الدعم والمحادثات المباشرة</p>
          </div>
          <TabsList>
            <TabsTrigger value="tickets" className="gap-1.5">
              <Ticket className="w-4 h-4" />
              التذاكر
            </TabsTrigger>
            <TabsTrigger value="livechat" className="gap-1.5">
              <MessageCircle className="w-4 h-4" />
              شات مباشر
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="tickets">
          <TicketsSection />
        </TabsContent>
        <TabsContent value="livechat">
          <LiveChatSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tickets Section ─────────────────────────────────────────────────────────

function TicketsSection() {
  const { adminUser, showToast } = useAdminStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.warn('[tickets] load:', error.message); setTickets([]); }
    else setTickets((data || []) as unknown as SupportTicket[]);
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (ticketId: string) => {
    const { data, error } = await supabaseAdmin
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) { console.warn('[tickets] msgs:', error.message); setMessages([]); return; }
    setMessages((data || []) as TicketMessage[]);
    // Mark user messages as read
    await supabaseAdmin.from('support_messages')
      .update({ is_read: true })
      .eq('ticket_id', ticketId)
      .eq('sender_type', 'user');
  }, []);

  useEffect(() => {
    loadTickets();
    const ch = supabaseAdmin.channel(`admin-tickets-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, (p: any) => {
        if (p.new?.ticket_id === selectedTicketId) loadMessages(selectedTicketId);
      })
      .subscribe();
    return () => { try { supabaseAdmin.removeChannel(ch); } catch {} };
  }, [loadTickets]); // eslint-disable-line

  useEffect(() => {
    if (selectedTicketId) loadMessages(selectedTicketId);
  }, [selectedTicketId, loadMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicketId || !adminUser) return;
    setSending(true);
    try {
      const { error } = await supabaseAdmin.from('support_messages').insert({
        ticket_id: selectedTicketId,
        sender_id: adminUser.uid,
        sender_type: 'admin',
        sender_name: adminUser.displayName || 'الدعم الفني',
        sender_role: 'admin',
        message: replyText.trim(),
        is_read: false,
      });
      if (error) throw error;
      await supabaseAdmin.from('support_tickets')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', selectedTicketId);
      // Notify user
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if (ticket) {
        try { await sendNotificationToUser(ticket.user_id, {
          title: 'رد جديد من الدعم الفني',
          body: replyText.trim().slice(0, 80),
          type: 'info', navigationTarget: 'support',
          data: { action: 'support_reply', ticketId: selectedTicketId },
        }); } catch {}
      }
      setReplyText('');
      showToast('تم إرسال الرد', 'success');
    } catch (e: any) { showToast('فشل: ' + (e.message || ''), 'error'); }
    finally { setSending(false); }
  };

  const handleStatus = async (id: string, status: string) => {
    await supabaseAdmin.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    showToast('تم تحديث الحالة', 'success');
  };

  const filtered = tickets.filter(t => {
    const ms = !search || (t.subject || '').includes(search) || (t.user_name || '').includes(search);
    const mf = filterStatus === 'all' || t.status === filterStatus;
    return ms && mf;
  });

  const selected = tickets.find(t => t.id === selectedTicketId);

  if (loading) return <div className="flex justify-center min-h-[400px] items-center"><Loader2 className="w-8 h-8 animate-spin text-[#5C1A1B]" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* List */}
      <div className="lg:col-span-1 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="mb-2"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="open">مفتوح</SelectItem>
            <SelectItem value="in_progress">قيد المتابعة</SelectItem>
            <SelectItem value="resolved">تم الحل</SelectItem>
            <SelectItem value="closed">مغلق</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">لا توجد تذاكر</CardContent></Card>
        ) : filtered.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <Card className={`cursor-pointer transition-all hover:shadow-md ${selectedTicketId === t.id ? 'border-[#5C1A1B] ring-1 ring-[#5C1A1B]/20' : ''}`} onClick={() => setSelectedTicketId(t.id)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.user_name}</p>
                  </div>
                  <Badge style={{ background: statusConfig[t.status]?.bg, color: statusConfig[t.status]?.color }} className="text-[9px] shrink-0">
                    {statusConfig[t.status]?.label || t.status}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">{timeAgo(t.created_at)}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chat */}
      <div className="lg:col-span-2">
        {selected ? (
          <Card className="h-[calc(100vh-220px)] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selected.subject}</h3>
                <p className="text-xs text-muted-foreground">{selected.user_name} • {timeAgo(selected.created_at)}</p>
              </div>
              <Select value={selected.status} onValueChange={(v) => handleStatus(selected.id, v)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">مفتوح</SelectItem>
                  <SelectItem value="in_progress">قيد المتابعة</SelectItem>
                  <SelectItem value="resolved">تم الحل</SelectItem>
                  <SelectItem value="closed">مغلق</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">لا توجد رسائل بعد</div>
              ) : messages.map((m, i) => (
                <div key={m.id || i} className={`flex ${m.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-2xl p-3 ${m.sender_type === 'admin' ? 'bg-[#5C1A1B] text-white' : 'bg-muted'}`}>
                    {m.attachments && <img src={m.attachments} alt="" className="w-full max-w-[200px] rounded-lg mb-2" />}
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    <p className={`text-[10px] mt-1 ${m.sender_type === 'admin' ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {m.sender_name ? m.sender_name + ' • ' : ''}{timeAgo(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t flex gap-2">
              <Input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                placeholder="اكتب ردك..."
                className="flex-1"
              />
              <Button onClick={handleReply} disabled={sending || !replyText.trim()} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
            <CardContent className="text-center">
              <Headphones className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">اختر تذكرة لعرض المحادثة</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Live Chat Section ───────────────────────────────────────────────────────

function LiveChatSection() {
  const { adminUser, showToast } = useAdminStore();
  const [conversations, setConversations] = useState<LiveConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null); // chat UUID, NOT user_id
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const { data, error } = await supabaseAdmin
      .from('support_livechat')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) { console.warn('[livechat] load:', error.message); setConversations([]); }
    else setConversations((data || []) as LiveConversation[]);
    setLoading(false);
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    const { data, error } = await supabaseAdmin
      .from('livechat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) { console.warn('[livechat] msgs:', error.message); setMessages([]); return; }
    setMessages((data || []) as LiveMessage[]);
    // Mark user messages as read by admin
    await supabaseAdmin.from('livechat_messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('sender_type', 'user');
    // Reset unread_admin counter
    await supabaseAdmin.from('support_livechat')
      .update({ unread_admin: 0 })
      .eq('id', chatId);
  }, []);

  // Load conversations once + subscribe to changes
  useEffect(() => {
    loadConversations();
    const ch = supabaseAdmin.channel(`admin-livechat-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_livechat' }, () => loadConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'livechat_messages' }, (payload: any) => {
        // Only reload messages if the new message belongs to the selected chat
        if (selectedChatId && payload.new?.chat_id === selectedChatId) {
          loadMessages(selectedChatId);
        } else {
          // New message in another chat — just reload conversations to update last_message
          loadConversations();
        }
      })
      .subscribe();
    return () => { try { supabaseAdmin.removeChannel(ch); } catch {} };
  }, [loadConversations]); // eslint-disable-line — intentional: we don't want selectedChatId in deps

  // Load messages when a chat is selected
  useEffect(() => {
    if (selectedChatId) loadMessages(selectedChatId);
    else setMessages([]);
  }, [selectedChatId, loadMessages]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!replyText.trim() || !selectedChatId || !adminUser) return;
    setSending(true);
    try {
      const conv = conversations.find(c => c.id === selectedChatId);
      if (!conv) { showToast('المحادثة غير موجودة', 'error'); setSending(false); return; }

      const { error } = await supabaseAdmin.from('livechat_messages').insert({
        chat_id: selectedChatId,
        sender_id: adminUser.uid,
        sender_type: 'admin',
        message_type: 'text',
        message: replyText.trim(),
        is_read: false,
      });
      if (error) throw error;

      // Update conversation
      await supabaseAdmin.from('support_livechat')
        .update({
          last_message: replyText.trim(),
          last_message_at: new Date().toISOString(),
          unread_user: (conv.unread_user || 0) + 1,
          admin_id: adminUser.uid,
        })
        .eq('id', selectedChatId);

      // Notify the user
      try { await sendNotificationToUser(conv.user_id, {
        title: 'رسالة جديدة من الدعم الفني',
        body: replyText.trim().slice(0, 80),
        type: 'info',
        data: { action: 'livechat_message', chatId: selectedChatId },
      }); } catch {}

      setReplyText('');
      showToast('تم إرسال الرسالة', 'success');
      loadMessages(selectedChatId); // refresh immediately
    } catch (e: any) { showToast('فشل: ' + (e.message || ''), 'error'); }
    finally { setSending(false); }
  };

  const selectedConv = conversations.find(c => c.id === selectedChatId);

  if (loading) return <div className="flex justify-center min-h-[400px] items-center"><Loader2 className="w-8 h-8 animate-spin text-[#5C1A1B]" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Conversations List */}
      <div className="lg:col-span-1 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
        {conversations.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            لا توجد محادثات مباشرة
          </CardContent></Card>
        ) : conversations.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${selectedChatId === c.id ? 'border-[#5C1A1B] ring-1 ring-[#5C1A1B]/20' : ''}`}
              onClick={() => setSelectedChatId(c.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{c.user_name || 'مستخدم'}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message || '...'}</p>
                  </div>
                  {(c.unread_admin || 0) > 0 && (
                    <Badge className="bg-red-500 text-white text-[9px] shrink-0">{c.unread_admin}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[9px]">{c.status === 'waiting' ? 'في الانتظار' : c.status === 'active' ? 'نشط' : 'مغلق'}</Badge>
                  <span className="text-[10px] text-muted-foreground">{c.last_message_at ? timeAgo(c.last_message_at) : ''}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Chat Window */}
      <div className="lg:col-span-2">
        {selectedConv ? (
          <Card className="h-[calc(100vh-220px)] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold">{selectedConv.user_name || 'مستخدم'}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedConv.status === 'waiting' ? '⏳ في الانتظار' : selectedConv.status === 'active' ? '🟢 نشط' : '🔴 مغلق'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  لا توجد رسائل بعد — اكتب أول رسالة
                </div>
              ) : messages.map((m, i) => (
                <div key={m.id || i} className={`flex ${m.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] rounded-2xl p-3 ${m.sender_type === 'admin' ? 'bg-[#5C1A1B] text-white' : 'bg-muted'}`}>
                    {m.attachment_url && <img src={m.attachment_url} alt="" className="w-full max-w-[200px] rounded-lg mb-2" />}
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    <p className={`text-[10px] mt-1 ${m.sender_type === 'admin' ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {timeAgo(m.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input — always visible when a chat is selected */}
            <div className="p-4 border-t flex gap-2">
              <Input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اكتب رسالة..."
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleSend} disabled={sending || !replyText.trim()} className="bg-[#5C1A1B] hover:bg-[#3D0F10] shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
            <CardContent className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">اختر محادثة لعرض الرسائل</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
