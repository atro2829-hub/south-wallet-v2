'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, update, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';

import { timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, MessageCircle, CheckCircle, Search, XCircle, Clock, Headphones, Ticket, MessageSquare, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TicketMessage {
  sender: 'user' | 'support';
  text: string;
  time: string;
  image?: string;
}

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  category: 'technical' | 'financial' | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: TicketMessage[];
  createdAt: string;
  image?: string;
}

interface LiveChatMessage {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  type?: string;
  time: string;
  isRead?: boolean;
  adminName?: string;
  imageUrl?: string;
}

interface LiveConversation {
  userId: string;
  userName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadAdmin?: number;
  unreadUser?: number;
  status?: string;
}

// ─── Status helpers ──────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'مفتوح', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  in_progress: { label: 'قيد المتابعة', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  resolved: { label: 'تم الحل', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  closed: { label: 'مغلق', color: '#666', bg: 'rgba(102,102,102,0.12)' },
};

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  technical: { label: 'تقني', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  financial: { label: 'مالي', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  general: { label: 'عام', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupportChatPanel() {
  const { adminUser, showToast } = useAdminStore();
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
          <TicketsPanel adminUser={adminUser} showToast={showToast} />
        </TabsContent>

        <TabsContent value="livechat">
          <LiveChatPanel adminUser={adminUser} showToast={showToast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tickets Panel ───────────────────────────────────────────────────────────

function TicketsPanel({ adminUser, showToast }: { adminUser: any; showToast: (msg: string, type: string) => void }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen to all support tickets
  useEffect(() => {
    const ticketsRef = ref(database, 'support-tickets');
    const unsub = onValue(ticketsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const allTickets = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        ...val,
      })) as SupportTicket[];
      allTickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTickets(allTickets);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicketId, tickets]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedTicketId) return;
    try {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if (!ticket) return;
      const newMsg: TicketMessage = {
        sender: 'support',
        text: messageText.trim(),
        time: new Date().toISOString(),
      };
      const updatedMessages = [...(ticket.messages || []), newMsg];
      await update(ref(database, `support-tickets/${selectedTicketId}`), {
        messages: updatedMessages,
      });

      // Notify user about ticket reply
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(ticket.userId, {
          title: 'رد على تذكرتك',
          body: messageText.trim().substring(0, 100),
          type: 'info',
          data: { action: 'ticket_reply', ticketId: ticket.id },
        });
      } catch (e) { console.warn('Ticket reply notification failed:', e); }

      setMessageText('');
    } catch (e) {
      showToast('حدث خطأ في إرسال الرسالة', 'error');
    }
  };

  const changeStatus = async (newStatus: SupportTicket['status']) => {
    if (!selectedTicketId) return;
    try {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      const updates: Record<string, any> = {
        status: newStatus,
      };
      // Add resolved/closed metadata
      if (newStatus === 'closed' || newStatus === 'resolved') {
        updates.resolvedAt = new Date().toISOString();
        updates.resolvedBy = adminUser?.displayName || 'المدير';
      }
      // Use set() on the status field to avoid listener overwrites
      await set(ref(database, `support-tickets/${selectedTicketId}/status`), newStatus);
      if (updates.resolvedAt) {
        await set(ref(database, `support-tickets/${selectedTicketId}/resolvedAt`), updates.resolvedAt);
        await set(ref(database, `support-tickets/${selectedTicketId}/resolvedBy`), updates.resolvedBy);
      }

      // Notify user about ticket status change
      if (ticket?.userId) {
        try {
          const { sendNotificationToUser } = await import('@/lib/notifications');
          const statusLabels: Record<string, string> = {
            open: 'مفتوحة',
            in_progress: 'قيد المتابعة',
            resolved: 'تم الحل',
            closed: 'مغلقة',
          };
          await sendNotificationToUser(ticket.userId, {
            title: `تذكرتك أصبحت ${statusLabels[newStatus] || newStatus}`,
            body: newStatus === 'closed'
              ? 'تم إغلاق تذكرتك. شكراً لتواصلك معنا!'
              : newStatus === 'resolved'
              ? 'تم حل مشكلتك. يمكنك إعادة فتح التذكرة إذا لزم الأمر.'
              : `تم تحديث حالة تذكرتك إلى: ${statusLabels[newStatus] || newStatus}`,
            type: 'info',
            data: { action: 'ticket_status', ticketId: selectedTicketId, status: newStatus },
          });
        } catch (e) { console.warn('Ticket status notification failed:', e); }
      }

      showToast('تم تحديث حالة التذكرة', 'success');
    } catch (e) {
      showToast('حدث خطأ في تحديث الحالة', 'error');
    }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = !search ||
      t.userName?.includes(search) ||
      t.subject?.includes(search) ||
      t.id?.includes(search) ||
      t.message?.includes(search);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-[#8B1E3A] animate-spin" />
    </div>
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-250px)]">
      {/* Tickets List */}
      <div className="w-96 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الموضوع..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-9" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <Badge variant="outline" className={`cursor-pointer text-xs ${filterStatus === 'all' ? 'bg-[#8B1E3A]/10' : ''}`} onClick={() => setFilterStatus('all')}>
              الكل ({tickets.length})
            </Badge>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <Badge key={key} variant="outline" className={`cursor-pointer text-xs ${filterStatus === key ? 'bg-[#8B1E3A]/10' : ''}`} onClick={() => setFilterStatus(key as any)}>
                {cfg.label} ({statusCounts[key as keyof typeof statusCounts]})
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ticket className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">لا توجد تذاكر</p>
            </div>
          )}
          {filtered.map((ticket) => {
            const stat = statusConfig[ticket.status] || statusConfig.open;
            const cat = categoryConfig[ticket.category] || categoryConfig.general;
            const lastMsg = ticket.messages?.[ticket.messages.length - 1];
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicketId === ticket.id ? 'bg-[#8B1E3A]/10' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[#8B1E3A]/10 flex items-center justify-center text-xs font-bold text-[#8B1E3A] shrink-0">
                      {(ticket.userName || '?')[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ticket.userName || 'مستخدم'}</p>
                      <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mr-10 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: stat.bg, color: stat.color }}>{stat.label}</span>
                  {lastMsg && (
                    <span className="text-[10px] text-muted-foreground truncate flex-1 text-left">
                      {lastMsg.sender === 'support' ? 'الدعم: ' : ''}{lastMsg.text}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 mr-10">{timeAgo(ticket.createdAt)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ticket Detail / Chat Area */}
      <div className="flex-1 border border-border rounded-xl flex flex-col">
        {selectedTicket ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Ticket className="w-5 h-5 text-[#8B1E3A] shrink-0" />
                  <span className="font-medium text-sm truncate">{selectedTicket.subject}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: categoryConfig[selectedTicket.category]?.bg, color: categoryConfig[selectedTicket.category]?.color }}>
                    {categoryConfig[selectedTicket.category]?.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={selectedTicket.status} onValueChange={(val) => changeStatus(val as SupportTicket['status'])}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>المستخدم: {selectedTicket.userName}</span>
                <span>•</span>
                <span>{timeAgo(selectedTicket.createdAt)}</span>
                <span>•</span>
                <span>ID: {selectedTicket.id}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {/* Original message */}
              <div className="flex justify-end">
                <div className="max-w-[75%]">
                  <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm p-3 text-sm">
                    {selectedTicket.image && (
                      <img src={selectedTicket.image} alt="" className="rounded-lg max-h-40 mb-2" />
                    )}
                    <p>{selectedTicket.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(selectedTicket.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Conversation messages (skip first since it's the original) */}
              {(selectedTicket.messages || []).slice(1).map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'support' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                    msg.sender === 'support'
                      ? 'bg-[#7B1A30]/20 text-foreground rounded-bl-sm'
                      : 'bg-muted text-foreground rounded-br-sm'
                  }`}>
                    {msg.sender === 'support' && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Headphones className="w-3 h-3 text-[#8B1E3A]" />
                        <span className="text-xs text-[#8B1E3A] font-medium">فريق الدعم</span>
                      </div>
                    )}
                    {msg.image && (
                      <img src={msg.image} alt="" className="rounded-lg max-h-40 mb-2" />
                    )}
                    <p>{msg.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{msg.time ? timeAgo(msg.time) : ''}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="اكتب ردك..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} size="icon" disabled={!messageText.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="p-3 border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>هذه التذكرة {statusConfig[selectedTicket.status]?.label}. غيّر الحالة للرد.</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>اختر تذكرة للبدء</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Chat Panel ─────────────────────────────────────────────────────────

function LiveChatPanel({ adminUser, showToast }: { adminUser: any; showToast: (msg: string, type: string) => void }) {
  const [conversations, setConversations] = useState<(LiveConversation & { userId: string })[]>([]);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Listen to all live chat conversations
  useEffect(() => {
    const chatRef = ref(database, 'supportChat');
    const unsub = onValue(chatRef, (snapshot) => {
      const data = snapshot.val() || {};
      const convs = Object.entries(data).map(([userId, val]: [string, any]) => ({
        userId,
        userName: val.userName || 'مستخدم',
        lastMessage: val.lastMessage || '',
        lastMessageTime: val.lastMessageTime || '',
        unreadAdmin: val.unreadAdmin || 0,
        unreadUser: val.unreadUser || 0,
        status: val.status || 'open',
      }));
      convs.sort((a, b) => new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime());
      setConversations(convs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Listen to messages for selected conversation
  useEffect(() => {
    if (!selectedUserId) return;
    const msgRef = ref(database, `supportChat/${selectedUserId}/messages`);
    const unsub = onValue(msgRef, (snapshot) => {
      const data = snapshot.val() || {};
      const msgs = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) as LiveChatMessage[];
      msgs.sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime());
      setMessages(msgs);

      // Mark as read by admin
      update(ref(database, `supportChat/${selectedUserId}`), { unreadAdmin: 0 }).catch(() => {});
    });
    return () => unsub();
  }, [selectedUserId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedUserId) return;
    const replyText = messageText.trim();
    try {
      await push(ref(database, `supportChat/${selectedUserId}/messages`), {
        sender: 'admin',
        text: replyText,
        type: 'text',
        time: new Date().toISOString(),
        isRead: false,
        adminName: adminUser?.displayName || 'المدير',
      });
      const currentUnreadUser = conversations.find(c => c.userId === selectedUserId)?.unreadUser || 0;
      await update(ref(database, `supportChat/${selectedUserId}`), {
        lastMessage: replyText,
        lastMessageTime: new Date().toISOString(),
        unreadUser: currentUnreadUser + 1,
      });

      // Notify user about admin chat reply
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUserId, {
          title: 'رسالة جديدة من الدعم الفني',
          body: replyText.substring(0, 50),
          type: 'info',
          data: { action: 'support_chat', userId: selectedUserId },
        });
      } catch (e) { console.warn('Chat notification failed:', e); }

      setMessageText('');
    } catch (e) {
      showToast('حدث خطأ في إرسال الرسالة', 'error');
    }
  };

  const resolveConversation = async () => {
    if (!selectedUserId) return;
    try {
      // Use set() on individual paths to avoid listener overwrites
      await set(ref(database, `supportChat/${selectedUserId}/status`), 'resolved');
      await set(ref(database, `supportChat/${selectedUserId}/resolvedAt`), new Date().toISOString());
      await set(ref(database, `supportChat/${selectedUserId}/resolvedBy`), adminUser?.displayName || 'المدير');

      // Notify user about conversation resolved
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUserId, {
          title: 'تم إغلاق المحادثة',
          body: 'تم حل مشكلتك. شكراً لتواصلك معنا!',
          type: 'info',
          data: { action: 'chat_status', status: 'resolved', userId: selectedUserId },
        });
      } catch (e) { console.warn('Chat status notification failed:', e); }

      showToast('تم إغلاق المحادثة', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const reopenConversation = async () => {
    if (!selectedUserId) return;
    try {
      // Use set() on individual paths to avoid listener overwrites
      await set(ref(database, `supportChat/${selectedUserId}/status`), 'open');
      await set(ref(database, `supportChat/${selectedUserId}/resolvedAt`), null);
      await set(ref(database, `supportChat/${selectedUserId}/resolvedBy`), null);

      // Notify user about conversation reopened
      try {
        const { sendNotificationToUser } = await import('@/lib/notifications');
        await sendNotificationToUser(selectedUserId, {
          title: 'تم إعادة فتح المحادثة',
          body: 'تم إعادة فتح محادثتك مع الدعم الفني',
          type: 'info',
          data: { action: 'chat_status', status: 'reopened', userId: selectedUserId },
        });
      } catch (e) { console.warn('Chat status notification failed:', e); }

      showToast('تم إعادة فتح المحادثة', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const selectedConv = conversations.find(c => c.userId === selectedUserId);

  const filtered = conversations.filter(c => {
    const matchesSearch = !search || c.userName?.includes(search) || c.lastMessage?.includes(search) || c.userId?.includes(search);
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openChats = conversations.filter(c => c.status === 'open').length;
  const resolvedChats = conversations.filter(c => c.status === 'resolved').length;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-[#8B1E3A] animate-spin" />
    </div>
  );

  return (
    <div className="flex gap-4 h-[calc(100vh-250px)]">
      {/* Conversations List */}
      <div className="w-80 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-9" />
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className={`cursor-pointer ${filterStatus === 'all' ? 'bg-[#8B1E3A]/10' : ''}`} onClick={() => setFilterStatus('all')}>
              الكل ({conversations.length})
            </Badge>
            <Badge variant="outline" className={`cursor-pointer ${filterStatus === 'open' ? 'bg-green-500/10' : ''}`} onClick={() => setFilterStatus('open')}>
              نشطة ({openChats})
            </Badge>
            <Badge variant="outline" className={`cursor-pointer ${filterStatus === 'resolved' ? 'bg-gray-500/10' : ''}`} onClick={() => setFilterStatus('resolved')}>
              مغلقة ({resolvedChats})
            </Badge>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">لا توجد محادثات</p>
            </div>
          )}
          {filtered.map((conv) => (
            <div
              key={conv.userId}
              onClick={() => setSelectedUserId(conv.userId)}
              className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedUserId === conv.userId ? 'bg-[#8B1E3A]/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#8B1E3A]/10 flex items-center justify-center text-xs font-bold text-[#8B1E3A]">
                    {(conv.userName || '?')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{conv.userName || 'مستخدم'}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-40">{conv.lastMessage || ''}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {conv.unreadAdmin > 0 && (
                    <Badge className="bg-red-500 text-white text-xs h-5 min-w-5">{conv.unreadAdmin}</Badge>
                  )}
                  <Badge className={conv.status === 'open' ? 'bg-green-500/20 text-green-600 text-xs' : 'bg-gray-500/20 text-gray-500 text-xs'}>
                    {conv.status === 'open' ? 'نشط' : 'مغلق'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 border border-border rounded-xl flex flex-col">
        {selectedUserId ? (
          <>
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#8B1E3A]" />
                <span className="font-medium text-sm">{selectedConv?.userName || 'مستخدم'}</span>
                <Badge className={selectedConv?.status === 'open' ? 'bg-green-500/20 text-green-600 text-xs' : 'bg-gray-500/20 text-gray-500 text-xs'}>
                  {selectedConv?.status === 'open' ? 'نشطة' : 'مغلقة'}
                </Badge>
              </div>
              <div className="flex gap-2">
                {selectedConv?.status === 'open' ? (
                  <Button variant="outline" size="sm" onClick={resolveConversation}>
                    <CheckCircle className="w-4 h-4 ml-1" /> إغلاق المحادثة
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={reopenConversation}>
                    <XCircle className="w-4 h-4 ml-1" /> إعادة فتح
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                    msg.sender === 'admin'
                      ? 'bg-[#7B1A30]/20 text-foreground rounded-bl-sm'
                      : 'bg-muted text-foreground rounded-br-sm'
                  }`}>
                    {msg.sender === 'admin' && msg.adminName && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Headphones className="w-3 h-3 text-[#8B1E3A]" />
                        <span className="text-xs text-[#8B1E3A] font-medium">{msg.adminName}</span>
                      </div>
                    )}
                    {msg.type === 'image' && msg.imageUrl ? (
                      <img src={msg.imageUrl} alt="" className="rounded-lg max-h-40 mb-1" />
                    ) : null}
                    <p>{msg.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{msg.time ? timeAgo(msg.time) : ''}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {selectedConv?.status === 'open' ? (
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="اكتب رسالة..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} size="icon" disabled={!messageText.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="p-3 border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>هذه المحادثة مغلقة. اضغط إعادة فتح للرد.</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>اختر محادثة للبدء</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
