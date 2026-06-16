'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { timeAgo, cn, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle, Send, User, Headphones, Loader2, XCircle, Clock, Users, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  sender: 'user' | 'admin';
  text: string;
  time: string;
  senderName?: string;
}

interface Chat {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  status: 'active' | 'ended';
  messages: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
}

const quickReplies = [
  'مرحباً، كيف يمكنني مساعدتك؟',
  'يرجى إرسال لقطة شاشة للمشكلة',
  'تم حل المشكلة، هل تحتاج مساعدة أخرى؟',
  'سأتحقق من ذلك لك',
  'يرجى الانتظار قليلاً',
];

export default function SupportLiveChatPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats from Supabase
  const loadChats = async () => {
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('support_livechat')
        .select('*, users!support_livechat_user_id_fkey(display_name, phone, email)')
        .order('updated_at', { ascending: false });

      if (chatError) throw chatError;

      if (!chatData || chatData.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Load messages for all chats
      const chatIds = chatData.map(c => c.id);
      const { data: messagesData, error: messagesError } = await supabase
        .from('livechat_messages')
        .select('*')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const formattedChats: Chat[] = chatData.map(chat => {
        const chatMessages = (messagesData || [])
          .filter(m => m.chat_id === chat.id)
          .map(m => ({
            sender: m.sender_type as 'user' | 'admin',
            text: m.content || '',
            time: m.created_at || new Date().toISOString(),
            senderName: m.sender_type === 'admin' ? 'الدعم الفني' : ((chat as any).users?.display_name || 'مستخدم'),
          }));

        const userInfo = (chat as any).users;
        const userName = userInfo?.display_name || chat.user_id?.substring(0, 8) || 'مستخدم';

        // Map Supabase status to UI status
        let uiStatus: 'active' | 'ended' = 'active';
        if (chat.status === 'closed') uiStatus = 'ended';
        else if (chat.status === 'active' || chat.status === 'waiting') uiStatus = 'active';

        return {
          id: chat.id,
          userId: chat.user_id || '',
          userName,
          userPhone: userInfo?.phone || '',
          userEmail: userInfo?.email || '',
          status: uiStatus,
          messages: chatMessages,
          createdAt: chat.created_at || new Date().toISOString(),
          updatedAt: chat.updated_at || '',
          assignedTo: chat.assigned_to || '',
        };
      });

      formattedChats.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });

      setChats(formattedChats);
      setLoading(false);
    } catch (e) {
      console.error('Failed to load chats:', e);
      setChats([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();

    // Subscribe to livechat changes
    const livechatChannel = supabase
      .channel('admin-support-livechat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_livechat' }, () => {
        loadChats();
      })
      .subscribe();

    // Subscribe to livechat messages
    const livechatMessagesChannel = supabase
      .channel('admin-livechat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'livechat_messages' }, (payload) => {
        // Reload all chats when a new message arrives
        loadChats();
        // Update selected chat if viewing
        if (selectedChat && payload.new.chat_id === selectedChat.id) {
          const newMsg: ChatMessage = {
            sender: payload.new.sender_type as 'user' | 'admin',
            text: payload.new.content || '',
            time: payload.new.created_at || new Date().toISOString(),
            senderName: payload.new.sender_type === 'admin' ? 'الدعم الفني' : selectedChat.userName,
          };
          setSelectedChat(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(livechatChannel);
      supabase.removeChannel(livechatMessagesChannel);
    };
  }, []);

  const filteredChats = useMemo(() => {
    return chats.filter(c => {
      const ms = !search || c.userName.includes(search) || c.userPhone?.includes(search);
      const mf = statusFilter === 'all' || c.status === statusFilter;
      return ms && mf;
    });
  }, [chats, search, statusFilter]);

  const stats = useMemo(() => ({
    total: chats.length,
    active: chats.filter(c => c.status === 'active').length,
    ended: chats.filter(c => c.status === 'ended').length,
    unread: chats.filter(c => c.status === 'active' && c.messages?.length > 0 && c.messages[c.messages.length - 1]?.sender === 'user').length,
  }), [chats]);

  const openChat = (chat: Chat) => {
    setSelectedChat(chat);
    setMessage('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = async () => {
    if (!selectedChat || !message.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from('livechat_messages')
        .insert({
          chat_id: selectedChat.id,
          sender_type: 'admin',
          message_type: 'text',
          content: message.trim(),
        });

      if (error) throw error;

      // Update chat's assigned_to and updated_at
      await supabase
        .from('support_livechat')
        .update({
          assigned_to: adminUser?.uid || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedChat.id);

      // Update local state
      const newMsg: ChatMessage = {
        sender: 'admin', text: message.trim(), time: new Date().toISOString(), senderName: adminUser?.displayName,
      };
      setSelectedChat(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
      setMessage('');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSending(false); }
  };

  const handleEndChat = async () => {
    if (!selectedChat) return;
    try {
      const { error } = await supabase
        .from('support_livechat')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', selectedChat.id);

      if (error) throw error;

      showToast('تم إنهاء المحادثة', 'success');
      setSelectedChat(null);
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleQuickReply = (text: string) => {
    setMessage(text);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="w-7 h-7 text-[#5C1A1B]" />الدردشة المباشرة</h1>
        <p className="text-muted-foreground text-sm mt-1">محادثات الدعم الفني المباشرة</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: MessageCircle, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'نشطة', value: stats.active, icon: Clock, color: 'from-green-600 to-green-800' },
          { label: 'منتهية', value: stats.ended, icon: XCircle, color: 'from-gray-600 to-gray-800' },
          { label: 'غير مقروءة', value: stats.unread, icon: Users, color: 'from-orange-600 to-orange-800' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '500px' }}>
        {/* Chat List */}
        <Card className="border-0 shadow-sm lg:col-span-1 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 border-b border-border/30">
              <div className="flex gap-2">
                <div className="flex-1 relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 h-8 text-sm" /></div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">الكل</SelectItem><SelectItem value="active">نشطة</SelectItem><SelectItem value="ended">منتهية</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="max-h-[450px] overflow-y-auto scrollbar-thin">
              {filteredChats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">لا توجد محادثات</p>
              ) : (
                filteredChats.map(chat => {
                  const lastMsg = chat.messages?.[chat.messages.length - 1];
                  const isUnread = chat.status === 'active' && lastMsg?.sender === 'user';
                  return (
                    <div key={chat.id} className={cn('p-3 cursor-pointer hover:bg-muted/20 transition-colors border-b border-border/20', selectedChat?.id === chat.id && 'bg-muted/30')} onClick={() => openChat(chat)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', isUnread ? 'bg-green-500/10' : 'bg-muted')}>
                            <User className={cn('w-4 h-4', isUnread ? 'text-green-500' : 'text-muted-foreground')} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{chat.userName}</p>
                            <p className="text-[10px] text-muted-foreground">{lastMsg ? (lastMsg.text?.substring(0, 30) || '') + '...' : 'لا توجد رسائل'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={cn('text-[8px]', chat.status === 'active' ? 'bg-green-500/15 text-green-600' : 'bg-gray-500/15 text-gray-500')}>
                            {chat.status === 'active' ? 'نشطة' : 'منتهية'}
                          </Badge>
                          {isUnread && <div className="w-2 h-2 rounded-full bg-green-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="border-0 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#5C1A1B]/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-[#5C1A1B]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedChat.userName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {selectedChat.userPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedChat.userPhone}</span>}
                      <span>{timeAgo(selectedChat.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {selectedChat.status === 'active' && (
                  <Button size="sm" variant="outline" onClick={handleEndChat} className="text-red-500 border-red-500/30 hover:bg-red-500/10 text-xs">
                    <XCircle className="w-3 h-3 ml-1" />إنهاء
                  </Button>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 max-h-[300px]">
                <div className="space-y-3">
                  {(selectedChat.messages || []).map((msg, i) => (
                    <div key={i} className={cn('flex gap-2', msg.sender === 'admin' && 'flex-row-reverse')}>
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', msg.sender === 'admin' ? 'bg-[#5C1A1B]/10' : 'bg-muted')}>
                        {msg.sender === 'admin' ? <Headphones className="w-4 h-4 text-[#5C1A1B]" /> : <User className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className={cn('max-w-[75%]', msg.sender === 'admin' && 'text-left')}>
                        <div className={cn('p-3 rounded-xl text-sm', msg.sender === 'admin' ? 'bg-[#5C1A1B]/10 rounded-tl-none' : 'bg-muted/30 rounded-tr-none')}>
                          {msg.text}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(msg.time)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Replies */}
              {selectedChat.status === 'active' && (
                <div className="px-4 py-2 border-t border-border/20">
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
                    {quickReplies.map((qr, i) => (
                      <button key={i} onClick={() => handleQuickReply(qr)} className="whitespace-nowrap text-[11px] px-3 py-1.5 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors shrink-0">
                        {qr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              {selectedChat.status === 'active' && (
                <div className="p-3 border-t border-border/30 flex gap-2">
                  <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="اكتب رسالة..." onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} className="flex-1" />
                  <Button onClick={handleSend} disabled={sending || !message.trim()} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center"><MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">اختر محادثة للبدء</p></div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
