'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSupportTickets,
  getSupportMessages,
  sendSupportMessage,
  updateTicketStatus,
  supabase,
  type DbSupportTicket,
  type DbSupportMessage,
} from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Search, Headphones, Ticket, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

interface TicketWithUser extends DbSupportTicket {
  user_name?: string;
  user_firebase_uid?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'مفتوح', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  in_progress: { label: 'قيد المتابعة', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  waiting_user: { label: 'بانتظار المستخدم', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  resolved: { label: 'تم الحل', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  closed: { label: 'مغلق', color: '#666', bg: 'rgba(102,102,102,0.12)' },
};

const categoryConfig: Record<string, { label: string; color: string; bg: string }> = {
  general: { label: 'عام', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  technical: { label: 'تقني', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  financial: { label: 'مالي', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  complaint: { label: 'شكوى', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  suggestion: { label: 'اقتراح', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفض', color: '#6B7280' },
  medium: { label: 'متوسط', color: '#F59E0B' },
  high: { label: 'عالي', color: '#EF4444' },
  urgent: { label: 'عاجل', color: '#DC2626' },
};

export default function SupportTicketsPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [messages, setMessages] = useState<DbSupportMessage[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | DbSupportTicket['status']>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const data = await getSupportTickets();
    setTickets(data as TicketWithUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Realtime subscription for tickets
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets]);

  // Load messages when a ticket is selected
  useEffect(() => {
    if (!selectedTicketId) { setMessages([]); return; }
    const loadMessages = async () => {
      const msgs = await getSupportMessages(selectedTicketId);
      setMessages(msgs);
    };
    loadMessages();

    // Realtime subscription for messages
    const channel = supabase
      .channel(`support-messages-${selectedTicketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${selectedTicketId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as DbSupportMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || null;

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedTicketId || !adminUser) return;
    setSendingMsg(true);
    try {
      // Find admin user ID in Supabase by matching Firebase UID
      // For now, we pass null for sender_id and mark as admin
      const result = await sendSupportMessage(
        selectedTicketId,
        null, // Admin's Supabase user ID - we'd need a lookup
        messageText.trim(),
        'admin'
      );
      if (result) {
        setMessageText('');
      } else {
        showToast('حدث خطأ في إرسال الرسالة', 'error');
      }
    } catch (e) {
      showToast('حدث خطأ في إرسال الرسالة', 'error');
    }
    setSendingMsg(false);
  };

  const changeStatus = async (newStatus: DbSupportTicket['status']) => {
    if (!selectedTicketId) return;
    const success = await updateTicketStatus(selectedTicketId, newStatus);
    if (success) {
      showToast('تم تحديث حالة التذكرة', 'success');
      loadTickets();
    } else {
      showToast('حدث خطأ في تحديث الحالة', 'error');
    }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = !search ||
      t.user_name?.includes(search) ||
      t.subject?.includes(search) ||
      t.id?.includes(search) ||
      t.category?.includes(search);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تذاكر الدعم</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة ومتابعة تذاكر الدعم الفني</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTickets}>
          <RefreshCw className="w-4 h-4 ml-1" /> تحديث
        </Button>
      </div>
      <div className="flex gap-4 h-[calc(100vh-320px)]">
        {/* Tickets List */}
        <div className="w-96 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الموضوع..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-9" />
            </div>
            <div className="flex gap-1 flex-wrap">
              <Badge variant="outline" className={`cursor-pointer text-xs ${filterStatus === 'all' ? 'bg-[#8B1E3A]/10' : ''}`} onClick={() => setFilterStatus('all')}>الكل ({tickets.length})</Badge>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <Badge key={key} variant="outline" className={`cursor-pointer text-xs ${filterStatus === key ? 'bg-[#8B1E3A]/10' : ''}`} onClick={() => setFilterStatus(key as any)}>
                  {cfg.label} ({statusCounts[key as keyof typeof statusCounts] || 0})
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Ticket className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">لا توجد تذاكر</p>
              </div>
            )}
            {filtered.map((ticket) => {
              const stat = statusConfig[ticket.status] || statusConfig.open;
              const cat = categoryConfig[ticket.category] || categoryConfig.general;
              return (
                <div key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedTicketId === ticket.id ? 'bg-[#8B1E3A]/10' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-[#8B1E3A]/10 flex items-center justify-center text-xs font-bold text-[#8B1E3A] shrink-0">
                        {(ticket.user_name || '?')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{ticket.user_name || 'مستخدم'}</p>
                        <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mr-10 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: stat.bg, color: stat.color }}>{stat.label}</span>
                    {ticket.priority && ticket.priority !== 'medium' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: priorityConfig[ticket.priority]?.color }}>
                        {priorityConfig[ticket.priority]?.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 mr-10">{timeAgo(ticket.created_at)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ticket Detail / Chat Area */}
        <div className="flex-1 border border-border rounded-xl flex flex-col">
          {selectedTicket ? (
            <>
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
                    <Select value={selectedTicket.status} onValueChange={(val) => changeStatus(val as DbSupportTicket['status'])}>
                      <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />{cfg.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>المستخدم: {selectedTicket.user_name || 'مستخدم'}</span>
                  <span>•</span>
                  <span>{timeAgo(selectedTicket.created_at)}</span>
                  <span>•</span>
                  <span>الأولوية: {priorityConfig[selectedTicket.priority]?.label || 'متوسط'}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {messages.map((msg, i) => (
                  <div key={msg.id || i} className={`flex ${msg.sender_type === 'admin' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                      msg.sender_type === 'admin'
                        ? 'bg-[#7B1A30]/20 text-foreground rounded-bl-sm'
                        : msg.sender_type === 'system'
                        ? 'bg-muted/50 text-muted-foreground rounded-bl-sm rounded-br-sm text-center max-w-full'
                        : 'bg-muted text-foreground rounded-br-sm'
                    }`}>
                      {msg.sender_type === 'admin' && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Headphones className="w-3 h-3 text-[#8B1E3A]" />
                          <span className="text-xs text-[#8B1E3A] font-medium">فريق الدعم</span>
                        </div>
                      )}
                      <p>{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{msg.created_at ? timeAgo(msg.created_at) : ''}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    placeholder="اكتب ردك..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !sendingMsg && sendMessage()}
                    className="flex-1"
                    disabled={sendingMsg}
                  />
                  <Button onClick={sendMessage} size="icon" disabled={!messageText.trim() || sendingMsg}>
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
              <div className="text-center"><Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>اختر تذكرة للبدء</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
