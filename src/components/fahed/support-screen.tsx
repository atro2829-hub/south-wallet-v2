'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MessageSquare, Search, ChevronDown, ChevronUp, Plus,
  Send, ImagePlus, X, Clock, CheckCircle2, AlertCircle, HelpCircle,
  Headphones, Paperclip, Tag, Phone, Globe, ExternalLink,
  Sparkles, MessageCircle, FileText, Ticket, Loader2, CheckCheck, Check
} from 'lucide-react';
import { useAppStore, type SupportTicket } from '@/lib/store';
import { timeAgo, generateReference, compressBase64Image, faqItems } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/fahed/toast-provider';
import { notifySupportTicketCreated, notifySupportTicketReply } from '@/lib/notifications';

type SupportView = 'main' | 'ticket-detail' | 'create-ticket';
type MainTab = 'faq' | 'tickets' | 'chat';

interface TicketMessage {
  sender: 'user' | 'support';
  text: string;
  time: string;
  image?: string;
  senderName?: string;
}

interface SupabaseTicket {
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
  time: string;
  adminName?: string;
  image?: string;
}

// FAQ quick links
const faqQuickLinks = [
  { icon: '🔄', label: 'كيف أقوم بتحويل أموال؟' },
  { icon: '🔐', label: 'كيف أوثق حسابي؟' },
  { icon: '💳', label: 'كيف أشحن رصيدي؟' },
  { icon: '📊', label: 'كيف أتحقق من رصيدي؟' },
  { icon: '🛡️', label: 'هل تطبيقي آمن؟' },
  { icon: '📞', label: 'كيف أتواصل مع الدعم؟' },
];

export default function SupportScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, user, addTicket, updateTicket } = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<MainTab>('faq');
  const [view, setView] = useState<SupportView>('main');
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Social links from Supabase
  const [socialLinks, setSocialLinks] = useState<{
    whatsapp: string; contactAdmin: string; contactAdminMessage: string;
  }>({ whatsapp: '', contactAdmin: '', contactAdminMessage: '' });

  // Tickets
  const [tickets, setTickets] = useState<SupabaseTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupabaseTicket | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Create ticket
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<'technical' | 'financial' | 'general'>('general');
  const [newMessage, setNewMessage] = useState('');
  const [newImage, setNewImage] = useState('');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Live chat
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [chatImage, setChatImage] = useState('');

  // Use refs to avoid stale closures in subscription callbacks
  const activeChatIdRef = useRef<string | null>(null);
  const selectedTicketRef = useRef<SupabaseTicket | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);
  useEffect(() => { selectedTicketRef.current = selectedTicket; }, [selectedTicket]);

  // ─── Social Links ───
  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'socialLinks')
          .single();
        if (!error && data?.value) {
          const val = data.value as Record<string, string>;
          setSocialLinks({
            whatsapp: val.whatsapp || '',
            contactAdmin: val.contactAdmin || '',
            contactAdminMessage: val.contactAdminMessage || '',
          });
          return;
        }
      } catch { /* fallback below */ }

      try {
        const { data: data2 } = await supabase
          .from('admin_settings')
          .select('*')
          .eq('id', 'socialLinks')
          .single();
        if (data2) {
          setSocialLinks({
            whatsapp: data2.whatsapp || data2.value?.whatsapp || '',
            contactAdmin: data2.contactAdmin || data2.value?.contactAdmin || '',
            contactAdminMessage: data2.contactAdminMessage || data2.value?.contactAdminMessage || '',
          });
        }
      } catch {}
    };
    fetchSocialLinks();

    // Subscribe to changes — .on() BEFORE .subscribe()
    const channel = supabase
      .channel(`social-links-changes-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config', filter: 'key=eq.socialLinks' }, () => {
        fetchSocialLinks();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  // ─── Load tickets from Supabase ───
  const loadTickets = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ticketError) throw ticketError;

      if (!ticketData || ticketData.length === 0) {
        setTickets([]);
        return;
      }

      // Load messages for all tickets
      const ticketIds = ticketData.map(t => t.id);
      const { data: messagesData, error: messagesError } = await supabase
        .from('support_messages')
        .select('*')
        .in('ticket_id', ticketIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const formattedTickets: SupabaseTicket[] = ticketData.map(ticket => {
        const ticketMessages = (messagesData || [])
          .filter(m => m.ticket_id === ticket.id)
          .map(m => ({
            sender: (m.sender_type === 'admin' || m.sender_role === 'admin') ? 'support' as const : 'user' as const,
            text: m.message || '',
            time: m.created_at || new Date().toISOString(),
            image: m.attachments || m.attachment_url || undefined,
            senderName: m.sender_name || undefined,
          }));

        return {
          id: ticket.id,
          userId: ticket.user_id || '',
          userName: ticket.user_name || user.name || 'مستخدم',
          subject: ticket.subject || '',
          message: ticket.message || '',
          category: ticket.category || 'general',
          status: ticket.status || 'open',
          messages: ticketMessages,
          createdAt: ticket.created_at || new Date().toISOString(),
          image: undefined,
        };
      });

      setTickets(formattedTickets);
    } catch (e) {
      console.error('Failed to load tickets:', e);
    }
  }, [user?.id, user?.name]);

  // ─── Subscribe to ticket & message changes ───
  useEffect(() => {
    if (!user?.id) return;
    loadTickets();

    // Subscribe to ticket changes — .on() BEFORE .subscribe()
    const ticketsChannel = supabase
      .channel(`user-support-tickets-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => {
        loadTickets();
      })
      .subscribe();

    // Subscribe to new messages for user's tickets — .on() BEFORE .subscribe()
    const messagesChannel = supabase
      .channel(`user-support-messages-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
        // Reload tickets when a new message arrives
        loadTickets();
        // Update selected ticket if viewing it — use ref to avoid stale closure
        const currentTicket = selectedTicketRef.current;
        if (currentTicket && payload.new.ticket_id === currentTicket.id) {
          const newMsg: TicketMessage = {
            sender: (payload.new.sender_type === 'admin' || payload.new.sender_role === 'admin') ? 'support' : 'user',
            text: payload.new.message || '',
            time: payload.new.created_at || new Date().toISOString(),
            image: payload.new.attachments || payload.new.attachment_url || undefined,
            senderName: payload.new.sender_name || undefined,
          };
          setSelectedTicket(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
        }
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(ticketsChannel); } catch {}
      try { supabase.removeChannel(messagesChannel); } catch {}
    };
  }, [user?.id, loadTickets]);

  // Auto-scroll to bottom of ticket messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicket?.messages?.length]);

  // ─── Load live chat from Supabase ───
  const loadLiveChat = useCallback(async () => {
    if (!user?.id) return;
    setChatLoading(true);
    try {
      // Find or create active chat
      const { data: chatData, error: chatError } = await supabase
        .from('support_livechat')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'closed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (chatError) throw chatError;

      if (chatData && chatData.length > 0) {
        const chat = chatData[0];
        setActiveChatId(chat.id);
        activeChatIdRef.current = chat.id;

        // Load messages for this chat
        const { data: msgsData, error: msgsError } = await supabase
          .from('livechat_messages')
          .select('*')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: true });

        if (msgsError) throw msgsError;

        const formatted: LiveChatMessage[] = (msgsData || []).map(m => ({
          id: m.id,
          sender: (m.sender_type === 'admin') ? 'admin' as const : 'user' as const,
          text: m.message || m.content || '',  // schema column is `message`, fallback to `content` for old data
          time: m.created_at || new Date().toISOString(),
          adminName: m.sender_type === 'admin' ? (m.sender_name || 'فريق الدعم') : '',
          image: m.attachments || m.attachment_url || undefined,  // schema column is `attachments`
        }));
        setChatMessages(formatted);
      } else {
        setActiveChatId(null);
        activeChatIdRef.current = null;
        setChatMessages([]);
      }
    } catch (e) {
      console.error('Failed to load live chat:', e);
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, [user?.id]);

  // ─── Subscribe to live chat messages ───
  useEffect(() => {
    if (!user?.id) return;
    loadLiveChat();

    // Subscribe to livechat changes — .on() BEFORE .subscribe()
    const livechatChannel = supabase
      .channel(`user-livechat-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_livechat', filter: `user_id=eq.${user.id}` }, () => {
        loadLiveChat();
      })
      .subscribe();

    // Subscribe to livechat messages — .on() BEFORE .subscribe()
    // Use ref-based chatId check to avoid stale closure and dependency loop
    const livechatMessagesChannel = supabase
      .channel(`user-livechat-messages-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'livechat_messages' }, (payload) => {
        const currentChatId = activeChatIdRef.current;
        if (currentChatId && payload.new.chat_id === currentChatId) {
          const newMsg: LiveChatMessage = {
            id: payload.new.id,
            sender: (payload.new.sender_type === 'admin') ? 'admin' : 'user',
            text: payload.new.message || payload.new.content || '',  // schema: `message`
            time: payload.new.created_at || new Date().toISOString(),
            adminName: payload.new.sender_type === 'admin' ? (payload.new.sender_name || 'فريق الدعم') : '',
            image: payload.new.attachments || payload.new.attachment_url || undefined,  // schema: `attachments`
          };
          setChatMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        } else if (!currentChatId) {
          // Reload if we don't have activeChatId set yet
          loadLiveChat();
        }
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(livechatChannel); } catch {}
      try { supabase.removeChannel(livechatMessagesChannel); } catch {}
    };
  }, [user?.id, loadLiveChat]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const filteredFaq = faqItems.filter(item => {
    if (!faqSearch) return true;
    return item.q.includes(faqSearch) || item.a.includes(faqSearch);
  });

  // ─── Create ticket ───
  const handleCreateTicket = async () => {
    if (!newSubject || !newMessage || !user?.id) return;
    setCreatingTicket(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_name: user.name || 'مستخدم',
          subject: newSubject,
          message: newMessage,
          category: newCategory,
          status: 'open',
          priority: 'medium',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Insert first message
      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketData.id,
          sender_id: user.id,
          sender_type: 'user',
          sender_name: user.name || 'مستخدم',
          sender_role: 'user',
          message: newMessage,
          attachments: newImage || null,
        });

      if (msgError) throw msgError;

      addTicket({
        id: ticketData.id,
        userId: user.userId,
        userName: user.name,
        subject: newSubject,
        message: newMessage,
        category: newCategory,
        status: 'open',
        messages: [{ sender: 'user', text: newMessage, time: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
      });

      // Push-notify the admin team so they can respond promptly.
      // This is fire-and-forget; a failure here should not break ticket creation.
      try {
        await notifySupportTicketCreated(user.id, user.name || 'مستخدم', ticketData.id, newSubject, newCategory);
      } catch (e) {
        console.warn('notifySupportTicketCreated failed (non-fatal):', e);
      }

      setNewSubject('');
      setNewMessage('');
      setNewImage('');
      setView('main');
      setActiveTab('tickets');
      showToast('success', 'تم إنشاء التذكرة', 'سيتم الرد عليك في أقرب وقت');
    } catch (e) {
      console.error('Failed to create ticket:', e);
      showToast('error', 'خطأ', 'فشل إنشاء التذكرة، حاول مرة أخرى');
    } finally {
      setCreatingTicket(false);
    }
  };

  // ─── Send ticket message ───
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedTicket || !user || sendingMessage) return;
    const messageText = messageInput.trim();
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: user.id,
          sender_type: 'user',
          sender_name: user.name || 'مستخدم',
          sender_role: 'user',
          message: messageText,
        });

      if (error) throw error;

      const newMsg: TicketMessage = { sender: 'user', text: messageText, time: new Date().toISOString() };
      setSelectedTicket(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev);
      setMessageInput('');

      // Push-notify admins of the user's reply so they can respond quickly.
      try {
        await notifySupportTicketReply(user.id, user.name || 'مستخدم', selectedTicket.id, messageText);
      } catch (e) {
        console.warn('notifySupportTicketReply failed (non-fatal):', e);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      showToast('error', 'خطأ', 'فشل إرسال الرسالة، حاول مرة أخرى');
    } finally {
      setSendingMessage(false);
    }
  };

  // ─── Send live chat message ───
  const handleSendChat = async () => {
    if ((!chatInput.trim() && !chatImage) || !user?.id || sendingChat) return;
    const messageText = chatInput.trim();
    const imageToSend = chatImage;
    setSendingChat(true);
    setChatInput('');
    setChatImage('');
    try {
      let chatId = activeChatId;

      // Create a new chat if none exists
      if (!chatId) {
        const { data: newChat, error: chatError } = await supabase
          .from('support_livechat')
          .insert({
            user_id: user.id,
            user_name: user.name || 'مستخدم',
            status: 'waiting',
          })
          .select()
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
        setActiveChatId(chatId);
        activeChatIdRef.current = chatId;
      }

      // Insert message — use snake_case column names that match the schema:
      // livechat_messages columns: id, chat_id, sender_id, sender_type, message,
      // message_type, attachments, is_read, created_at
      const { error: msgError } = await supabase
        .from('livechat_messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          sender_type: 'user',
          message: messageText || (imageToSend ? '📷 صورة' : ''),
          message_type: imageToSend ? 'image' : 'text',
          attachments: imageToSend || null,
          is_read: false,
        });

      if (msgError) throw msgError;

      // Optimistically add to local state
      const newMsg: LiveChatMessage = {
        id: `temp-${Date.now()}`,
        sender: 'user',
        text: messageText || '📷 صورة',
        time: new Date().toISOString(),
        image: imageToSend || undefined,
      };
      setChatMessages(prev => [...prev, newMsg]);

      // Update chat's updated_at
      await supabase
        .from('support_livechat')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);
    } catch (e) {
      console.error('Failed to send chat message', e);
      showToast('error', 'خطأ', 'فشل إرسال الرسالة، حاول مرة أخرى');
      // Restore input on failure
      setChatInput(messageText);
    } finally {
      setSendingChat(false);
    }
  };

  // ─── Image upload handler (for tickets) ───
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressBase64Image(base64, 400, 0.6);
        setNewImage(compressed);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error('Failed to process image:', e);
      showToast('error', 'خطأ', 'فشل معالجة الصورة');
    }
  };

  // ─── Chat image upload handler ───
  const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressBase64Image(base64, 400, 0.6);
        setChatImage(compressed);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error('Failed to process chat image:', e);
      showToast('error', 'خطأ', 'فشل معالجة الصورة');
    }
  };

  const categoryLabels: Record<string, { label: string; color: string; bg: string }> = {
    technical: { label: 'تقني', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    financial: { label: 'مالي', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    general: { label: 'عام', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  };

  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: 'مفتوح', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    in_progress: { label: 'قيد المتابعة', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    resolved: { label: 'تم الحل', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
    closed: { label: 'مغلق', color: '#666', bg: 'rgba(102,102,102,0.12)' },
  };

  // ═══════════════════════════════════════════════════
  // Full-screen Live Chat View
  // ═══════════════════════════════════════════════════
  if (activeTab === 'chat') {
    return (
      <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
          <div className="absolute inset-0 glass-dark opacity-30" />
          <div className="relative px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveTab('faq')} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
              </motion.button>
              <div className="flex-1">
                <h1 className="text-white text-xl font-bold">الدردشة المباشرة</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#10B981' }} />
                  <span className="text-white/40 text-xs">متصل الآن</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
                <Headphones size={20} strokeWidth={1.5} color="#3B82F6" />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 space-y-3">
          {chatLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin" color="#5C1A1B" />
              <p className="text-sm mt-3" style={{ color: isDark ? '#888' : '#999' }}>جاري تحميل الدردشة...</p>
            </div>
          ) : (
            <>
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <Headphones size={40} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#888' : '#999' }}>ابدأ محادثة مع فريق الدعم</p>
                  <p className="text-xs mt-1" style={{ color: isDark ? '#666' : '#BBB' }}>سنرد عليك في أقرب وقت</p>
                </div>
              )}
              <AnimatePresence>
                {chatMessages.map((msg, i) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <motion.div
                      key={msg.id || i}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {msg.sender === 'admin' && (
                        <div className="flex items-center gap-1.5 mb-1 justify-end">
                          <span className="text-[10px] font-bold" style={{ color: '#3B82F6' }}>{msg.adminName || 'فريق الدعم'}</span>
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                            <Headphones size={12} color="#3B82F6" />
                          </div>
                        </div>
                      )}
                      <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className="max-w-[80%] rounded-2xl px-4 py-2.5"
                          style={{
                            background: isUser
                              ? 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)'
                              : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            borderBottomLeftRadius: isUser ? '4px' : '16px',
                            borderBottomRightRadius: !isUser ? '4px' : '16px',
                          }}
                        >
                          {msg.image && (
                            <img src={msg.image} alt="attachment" className="w-full rounded-xl mb-2 max-h-48 object-cover" />
                          )}
                          <p className={`text-sm leading-relaxed ${isUser ? 'text-white' : isDark ? 'text-white/90' : 'text-gray-800'}`}>
                            {msg.text}
                          </p>
                          <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-start' : 'justify-end'}`}>
                            <span className={`text-[10px] ${isUser ? 'text-white/40' : isDark ? 'text-white/30' : 'text-gray-400'}`}>
                              {timeAgo(msg.time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat image preview */}
        {chatImage && (
          <div className="shrink-0 px-5 pb-2">
            <div className="relative inline-block">
              <img src={chatImage} alt="attachment" className="w-16 h-16 rounded-xl object-cover" />
              <button
                onClick={() => setChatImage('')}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: '#5C1A1B' }}
              >
                <X size={10} color="#FFF" />
              </button>
            </div>
          </div>
        )}

        {/* Chat quick actions */}
        <div className="shrink-0 px-5 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['تحويل أموال', 'مشكلة تقنية', 'توثيق حساب', 'استفسار عام'].map((quick, i) => (
              <button
                key={i}
                onClick={() => setChatInput(quick)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: isDark ? '#CCC' : '#666',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                {quick}
              </button>
            ))}
          </div>
        </div>

        {/* Input area - fixed at bottom */}
        <div className="shrink-0 px-5 py-3" style={{ background: isDark ? 'rgba(15,15,15,0.95)' : 'rgba(245,245,245,0.95)', backdropFilter: 'blur(20px)', borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2">
            {/* Image upload button */}
            <input type="file" ref={chatFileInputRef} accept="image/*" onChange={handleChatImageUpload} className="hidden" />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => chatFileInputRef.current?.click()}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <ImagePlus size={18} color={isDark ? '#888' : '#999'} />
            </motion.button>
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              <input
                type="text"
                placeholder="اكتب رسالتك..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                disabled={sendingChat}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleSendChat}
              disabled={(!chatInput.trim() && !chatImage) || sendingChat}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: (chatInput.trim() || chatImage) ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              {sendingChat ? (
                <Loader2 size={16} className="animate-spin" color="#FFF" />
              ) : (
                <Send size={16} color={(chatInput.trim() || chatImage) ? '#FFF' : isDark ? '#555' : '#CCC'} />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // Ticket Detail View (full-screen conversation)
  // ═══════════════════════════════════════════════════
  if (view === 'ticket-detail' && selectedTicket) {
    const cat = categoryLabels[selectedTicket.category] || categoryLabels.general;
    const stat = statusLabels[selectedTicket.status] || statusLabels.open;
    const canSendMessages = selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved';

    return (
      <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
          <div className="absolute inset-0 glass-dark opacity-30" />
          <div className="relative px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setView('main'); setSelectedTicket(null); }} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
              </motion.button>
              <div className="flex-1 min-w-0">
                <h1 className="text-white text-lg font-bold truncate">{selectedTicket.subject}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: stat.bg, color: stat.color }}>{stat.label}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
                <Ticket size={20} strokeWidth={1.5} color="#3B82F6" />
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {(selectedTicket.messages || []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquare size={40} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
              <p className="text-sm mt-3" style={{ color: isDark ? '#888' : '#999' }}>لا توجد رسائل بعد</p>
            </div>
          )}
          <AnimatePresence>
            {(selectedTicket.messages || []).map((msg, i) => {
              const isUser = msg.sender === 'user';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.sender === 'support' && (
                    <div className="flex items-center gap-1.5 mb-1 justify-end">
                      <span className="text-[10px] font-medium" style={{ color: '#3B82F6' }}>{msg.senderName || 'فريق الدعم'}</span>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                        <Headphones size={10} color="#3B82F6" />
                      </div>
                    </div>
                  )}
                  <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className="max-w-[80%] rounded-2xl px-4 py-2.5"
                      style={{
                        background: isUser
                          ? 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)'
                          : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        borderBottomLeftRadius: isUser ? '4px' : '16px',
                        borderBottomRightRadius: !isUser ? '4px' : '16px',
                      }}
                    >
                      {msg.image && <img src={msg.image} alt="attachment" className="w-full rounded-xl mb-2 max-h-48 object-cover" />}
                      <p className={`text-sm leading-relaxed ${isUser ? 'text-white' : isDark ? 'text-white/90' : 'text-gray-800'}`}>
                        {msg.text}
                      </p>
                      <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-start' : 'justify-end'}`}>
                        <span className={`text-[10px] ${isUser ? 'text-white/40' : isDark ? 'text-white/30' : 'text-gray-400'}`}>
                          {timeAgo(msg.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        {canSendMessages && (
          <div className="shrink-0 px-5 py-3" style={{ background: isDark ? 'rgba(15,15,15,0.95)' : 'rgba(245,245,245,0.95)', backdropFilter: 'blur(20px)', borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                <input
                  type="text"
                  placeholder="اكتب رسالتك..."
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  disabled={sendingMessage}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendingMessage}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: messageInput.trim() ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                }}
              >
                {sendingMessage ? (
                  <Loader2 size={16} className="animate-spin" color="#FFF" />
                ) : (
                  <Send size={16} color={messageInput.trim() ? '#FFF' : isDark ? '#555' : '#CCC'} />
                )}
              </motion.button>
            </div>
          </div>
        )}
        {!canSendMessages && (
          <div className="shrink-0 px-5 py-3" style={{ background: isDark ? 'rgba(15,15,15,0.95)' : 'rgba(245,245,245,0.95)', borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-center gap-2 py-2">
              <CheckCircle2 size={16} color="#10B981" />
              <p className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>هذه التذكرة مغلقة - لا يمكن إرسال رسائل جديدة</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // Create Ticket View (full-screen)
  // ═══════════════════════════════════════════════════
  if (view === 'create-ticket') {
    return (
      <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
          <div className="absolute inset-0 glass-dark opacity-30" />
          <div className="relative px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setView('main'); setNewSubject(''); setNewMessage(''); setNewImage(''); }} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
              </motion.button>
              <div className="flex-1">
                <h1 className="text-white text-xl font-bold">تذكرة جديدة</h1>
                <p className="text-white/40 text-xs mt-0.5">أخبرنا بمشكلتك وسنساعدك</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
                <Plus size={20} strokeWidth={1.5} color="#3B82F6" />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 mt-4 pb-8">
          <div className="space-y-3">
            <div className="rounded-2xl p-4 space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
              {/* Subject */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#CCC' : '#666' }}>موضوع التذكرة</label>
                <input
                  type="text"
                  placeholder="مثال: مشكلة في التحويل"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#CCC' : '#666' }}>نوع المشكلة</label>
                <div className="flex gap-2">
                  {(['technical', 'financial', 'general'] as const).map(cat => {
                    const info = categoryLabels[cat];
                    return (
                      <button key={cat} onClick={() => setNewCategory(cat)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                        style={{ background: newCategory === cat ? info.bg : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: newCategory === cat ? info.color : isDark ? '#888' : '#AAA', border: newCategory === cat ? `1px solid ${info.color}30` : '1px solid transparent' }}>
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#CCC' : '#666' }}>تفاصيل المشكلة</label>
                <textarea
                  placeholder="اكتب رسالتك بالتفصيل..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }}
                />
              </div>

              {/* Image upload */}
              <div>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#CCC' : '#666' }}>إرفاق صورة (اختياري)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', color: isDark ? '#AAA' : '#888' }}>
                    <ImagePlus size={14} /><span>اختر صورة</span>
                  </button>
                  {newImage && (
                    <div className="relative">
                      <img src={newImage} alt="attachment" className="w-10 h-10 rounded-lg object-cover" />
                      <button onClick={() => setNewImage('')} className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: '#5C1A1B' }}>
                        <X size={8} color="#FFF" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateTicket}
                disabled={!newSubject || !newMessage || creatingTicket}
                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: '#5C1A1B' }}
              >
                {creatingTicket ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>إرسال التذكرة</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // Main Support Screen (FAQ + Tickets tabs)
  // ═══════════════════════════════════════════════════
  return (
    <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
        <div className="absolute inset-0 glass-dark opacity-30" />
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveScreen('main')} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">الدعم والمساعدة</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#10B981' }} />
                <span className="text-white/40 text-xs">متصل الآن</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.2)' }}>
              <Headphones size={20} strokeWidth={1.5} color="#3B82F6" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-5 mt-4 pb-8">
          {/* Tab Toggle - 3 tabs: FAQ, Chat, Tickets */}
          <div className="flex gap-2 mb-4">
            {([
              { id: 'faq' as MainTab, label: 'مركز المساعدة', icon: HelpCircle },
              { id: 'chat' as MainTab, label: 'دردشة مباشرة', icon: MessageCircle },
              { id: 'tickets' as MainTab, label: 'تذاكر الدعم', icon: MessageSquare },
            ]).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button key={tab.id} whileTap={{ scale: 0.95 }} onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-medium transition-all"
                  style={{
                    background: isActive ? 'rgba(92,26,27,0.15)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                    border: isActive ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                    color: isActive ? '#D4547A' : isDark ? '#BBB' : '#666',
                    backdropFilter: 'blur(20px)',
                  }}>
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* WhatsApp Direct Contact */}
          {socialLinks.whatsapp && activeTab === 'faq' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <a
                href={`https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{
                  background: 'rgba(37,211,102,0.1)',
                  border: '1px solid rgba(37,211,102,0.2)',
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#25D366' }}>
                  <Phone size={20} color="#FFF" />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-sm font-bold" style={{ color: '#25D366' }}>تواصل عبر واتساب</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#888' : '#999' }}>رد سريع من فريق الدعم</p>
                </div>
                <ExternalLink size={16} color="#25D366" />
              </a>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* FAQ Tab */}
            {activeTab === 'faq' && (
              <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Search */}
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <Search size={16} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="ابحث في الأسئلة الشائعة..." value={faqSearch} onChange={e => setFaqSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                  {faqSearch && (
                    <button onClick={() => setFaqSearch('')}>
                      <X size={14} color={isDark ? '#888' : '#AAA'} />
                    </button>
                  )}
                </div>

                {/* FAQ Quick Links */}
                <div className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <h3 className="text-xs font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الأسئلة الأكثر شيوعاً</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {faqQuickLinks.map((link, i) => (
                      <button
                        key={i}
                        onClick={() => setFaqSearch(link.label.replace(/[؟?]/g, '').replace('كيف ', ''))}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] text-right transition-colors"
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                      >
                        <span>{link.icon}</span>
                        <span style={{ color: isDark ? '#CCC' : '#444' }}>{link.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* FAQ Items */}
                {filteredFaq.map((item, index) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                    className="rounded-2xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <button onClick={() => setExpandedFaq(expandedFaq === index ? null : index)} className="w-full flex items-center justify-between p-4">
                      <span className="text-sm font-medium text-right flex-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{item.q}</span>
                      <motion.div animate={{ rotate: expandedFaq === index ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={16} color={isDark ? '#888' : '#AAA'} />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {expandedFaq === index && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                            <p className="text-xs leading-relaxed pt-3" style={{ color: isDark ? '#AAA' : '#666' }}>{item.a}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {/* Create ticket CTA */}
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('create-ticket')}
                  className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium mt-4"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <MessageSquare size={16} />
                  <span>لم تجد إجابة؟ أنشئ تذكرة دعم</span>
                </motion.button>

                {/* Contact Admin Section */}
                {(socialLinks.contactAdmin || socialLinks.contactAdminMessage) && (
                  <div className="rounded-2xl p-4 mt-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                        <Headphones size={16} color="#8B5CF6" />
                      </div>
                      <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تواصل مع الأدمن</h3>
                    </div>
                    {socialLinks.contactAdminMessage && (
                      <p className="text-xs leading-relaxed mb-3" style={{ color: isDark ? '#AAA' : '#666' }}>
                        {socialLinks.contactAdminMessage}
                      </p>
                    )}
                    {socialLinks.contactAdmin && (
                      <a
                        href={socialLinks.contactAdmin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold w-full"
                        style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}
                      >
                        <ExternalLink size={16} />
                        <span>تواصل مباشر</span>
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <motion.div key="tickets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setView('create-ticket')}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>تذكرة جديدة</span>
                </motion.button>

                {tickets.map((ticket) => {
                  const cat = categoryLabels[ticket.category] || categoryLabels.general;
                  const stat = statusLabels[ticket.status] || statusLabels.open;
                  const lastMsg = ticket.messages?.[ticket.messages.length - 1];
                  return (
                    <motion.div key={ticket.id} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedTicket(ticket); setView('ticket-detail'); }}
                      className="rounded-2xl p-4 cursor-pointer transition-colors" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{ticket.subject}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mr-2 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: stat.bg, color: stat.color }}>{stat.label}</span>
                        </div>
                      </div>
                      {lastMsg && (
                        <p className="text-xs truncate mb-2" style={{ color: isDark ? '#888' : '#AAA' }}>
                          {lastMsg.sender === 'support' ? 'الدعم: ' : ''}{lastMsg.text}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(ticket.createdAt)}</p>
                        <p className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>{ticket.messages?.length || 0} رسالة</p>
                      </div>
                    </motion.div>
                  );
                })}

                {tickets.length === 0 && (
                  <div className="flex flex-col items-center py-12">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                      <MessageSquare size={40} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#888' : '#999' }}>لا توجد تذاكر دعم</p>
                    <p className="text-xs mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>أنشئ تذكرة جديدة وسنساعدك</p>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setView('create-ticket')}
                      className="mt-4 flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)' }}
                    >
                      <Plus size={16} />
                      تذكرة جديدة
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
