'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Send, MessageCircle, Plus, X, User,
  Check, CheckCheck, Clock, UserPlus, MessagesSquare, Loader2,
  ImagePlus, AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  getOrCreateDirectChat,
  getUserDirectChats,
  getDirectChatMessages,
  sendDirectChatMessage,
  markDirectMessagesAsRead,
  subscribeToDirectChat,
  subscribeToDirectChatList,
  searchUsersForChat,
  type DirectChat,
  type DirectChatMessage,
} from '@/lib/direct-chat';
import { timeAgo, compressBase64Image } from '@/lib/utils';
import { useToast } from '@/components/fahed/toast-provider';

type ChatView = 'list' | 'conversation' | 'new-chat';

export default function DirectChatScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setActiveScreen } = useAppStore();
  const { showToast } = useToast();

  const [view, setView] = useState<ChatView>('list');
  const [chats, setChats] = useState<DirectChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Conversation state
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatPartner, setActiveChatPartner] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatImage, setChatImage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // New chat state
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; phone: string; avatar: string }>>([]);
  const [searching, setSearching] = useState(false);

  // Use ref for activeChatId to avoid stale closures in subscriptions
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  // Load chat list
  const loadChats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const chatList = await getUserDirectChats(user.id);
      setChats(chatList);
    } catch (err) {
      console.error('Error loading direct chats:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Subscribe to chat list updates
  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToDirectChatList(user.id, () => {
      loadChats();
    });
    return unsub;
  }, [user?.id, loadChats]);

  // Subscribe to messages in active conversation
  useEffect(() => {
    if (!activeChatId) return;
    const unsub = subscribeToDirectChat(activeChatId, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    return unsub;
  }, [activeChatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (activeChatId && user?.id) {
      markDirectMessagesAsRead(activeChatId, user.id).catch(err => {
        console.error('Error marking messages as read:', err);
      });
    }
  }, [activeChatId, user?.id, messages.length]);

  // Search users for new chat
  useEffect(() => {
    if (!userSearch.trim() || !user?.id) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsersForChat(userSearch, user.id);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, user?.id]);

  const openChat = async (chat: DirectChat) => {
    if (!user?.id) return;
    const partnerId = chat.participant1Id === user.id ? chat.participant2Id : chat.participant1Id;
    const partnerName = chat.participant1Id === user.id ? chat.participant2Name : chat.participant1Name;

    setActiveChatId(chat.id);
    activeChatIdRef.current = chat.id;
    setActiveChatPartner({ id: partnerId, name: partnerName });
    setView('conversation');

    try {
      const msgs = await getDirectChatMessages(chat.id);
      setMessages(msgs);
      await markDirectMessagesAsRead(chat.id, user.id);
    } catch (err) {
      console.error('Error loading messages:', err);
      showToast('error', 'خطأ', 'فشل تحميل الرسائل');
    }
  };

  const startNewChat = async (targetUser: { id: string; name: string }) => {
    if (!user?.id || !user.name) return;
    try {
      const chatId = await getOrCreateDirectChat(user.id, user.name, targetUser.id, targetUser.name);
      if (chatId) {
        setActiveChatId(chatId);
        activeChatIdRef.current = chatId;
        setActiveChatPartner({ id: targetUser.id, name: targetUser.name });
        setView('conversation');
        setUserSearch('');
        setSearchResults([]);
        const msgs = await getDirectChatMessages(chatId);
        setMessages(msgs);
        loadChats();
      }
    } catch (err) {
      console.error('Error starting new chat:', err);
      showToast('error', 'خطأ', 'فشل بدء المحادثة');
    }
  };

  // ─── Chat image upload ───
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
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast('error', 'خطأ', 'فشل معالجة الصورة');
    }
  };

  const handleSend = async () => {
    if ((!messageInput.trim() && !chatImage) || !activeChatId || !user?.id || !user.name || sending) return;
    const text = messageInput.trim();
    const imageToSend = chatImage;
    setMessageInput('');
    setChatImage('');
    setSending(true);
    try {
      const msg = await sendDirectChatMessage(
        activeChatId,
        user.id,
        user.name,
        text || (imageToSend ? '📷 صورة' : ''),
        imageToSend ? 'image' : 'text',
        imageToSend || undefined
      );
      if (msg && !messages.some(m => m.id === msg.id)) {
        setMessages(prev => [...prev, msg]);
      }
      loadChats();
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageInput(text);
      if (imageToSend) setChatImage(imageToSend);
      showToast('error', 'خطأ', 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (chat: DirectChat) => {
    if (!user?.id) return { name: 'مستخدم', id: '' };
    return chat.participant1Id === user.id
      ? { name: chat.participant2Name, id: chat.participant2Id }
      : { name: chat.participant1Name, id: chat.participant1Id };
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(chat);
    return other.name.includes(searchQuery);
  });

  // ─── Conversation View ───
  if (view === 'conversation') {
    return (
      <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
          <div className="absolute inset-0 glass-dark opacity-30" />
          <div className="relative px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setView('list');
                  setActiveChatId(null);
                  activeChatIdRef.current = null;
                  setActiveChatPartner(null);
                  setMessages([]);
                  setChatImage('');
                  loadChats();
                }}
                className="w-10 h-10 rounded-xl glass flex items-center justify-center"
              >
                <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
              </motion.button>
              <div className="flex-1">
                <h1 className="text-white text-lg font-bold">{activeChatPartner?.name || 'مستخدم'}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
                  <span className="text-white/40 text-xs">متصل</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.3)' }}>
                <User size={20} strokeWidth={1.5} color="#D4547A" />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                <MessageCircle size={40} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
              </div>
              <p className="text-sm font-medium" style={{ color: isDark ? '#888' : '#999' }}>ابدأ المحادثة</p>
              <p className="text-xs mt-1" style={{ color: isDark ? '#666' : '#BBB' }}>أرسل رسالة لبدء المحادثة</p>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isMe = msg.senderId === user?.id;
              const showDate = i === 0 || (
                new Date(msg.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString()
              );
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <span className="text-[10px] px-3 py-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: isDark ? '#888' : '#999' }}>
                        {new Date(msg.createdAt).toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'rounded-br-md'
                          : 'rounded-bl-md'
                      }`}
                      style={{
                        background: isMe
                          ? 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)'
                          : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      {/* Image attachment */}
                      {msg.attachmentUrl && (
                        <img
                          src={msg.attachmentUrl}
                          alt="attachment"
                          className="w-full rounded-xl mb-2 max-h-48 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      {msg.messageType === 'image' && !msg.attachmentUrl && msg.message && (
                        <p className="text-sm mb-1" style={{ color: isMe ? '#FFF' : isDark ? '#CCC' : '#333' }}>
                          📷 صورة
                        </p>
                      )}
                      <p className={`text-sm leading-relaxed ${isMe ? 'text-white' : isDark ? 'text-white/90' : 'text-gray-800'}`}>
                        {msg.message}
                      </p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
                        <span className={`text-[10px] ${isMe ? 'text-white/40' : isDark ? 'text-white/30' : 'text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          msg.isRead
                            ? <CheckCheck size={12} className="text-blue-300" />
                            : <Check size={12} className="text-white/40" />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Chat image preview */}
        {chatImage && (
          <div className="shrink-0 px-4 pb-2">
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

        {/* Message Input */}
        <div className="shrink-0 px-4 pb-6 pt-2" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
          <div className="flex items-center gap-2">
            {/* Image upload button */}
            <input type="file" ref={chatFileInputRef} accept="image/*" onChange={handleChatImageUpload} className="hidden" />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => chatFileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <ImagePlus size={18} color={isDark ? '#888' : '#999'} />
            </motion.button>
            <div className="flex-1 flex items-center rounded-2xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="اكتب رسالة..."
                className="flex-1 px-4 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                style={{ color: isDark ? '#FFF' : '#1A1A1A' }}
                disabled={sending}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={(!messageInput.trim() && !chatImage) || sending}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: (messageInput.trim() || chatImage)
                  ? 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)'
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              }}
            >
              {sending ? (
                <Loader2 size={18} className="animate-spin" color="#FFF" />
              ) : (
                <Send size={18} color={(messageInput.trim() || chatImage) ? '#FFF' : isDark ? '#555' : '#CCC'} />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ─── New Chat View ───
  if (view === 'new-chat') {
    return (
      <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
          <div className="absolute inset-0 glass-dark opacity-30" />
          <div className="relative px-5 pt-4 pb-5">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setView('list');
                  setUserSearch('');
                  setSearchResults([]);
                }}
                className="w-10 h-10 rounded-xl glass flex items-center justify-center"
              >
                <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
              </motion.button>
              <h1 className="text-white text-lg font-bold">محادثة جديدة</h1>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <div className="flex items-center rounded-2xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
            <Search size={16} className="mr-3 shrink-0" color={isDark ? '#888' : '#999'} />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="ابحث عن مستخدم بالاسم أو رقم الهاتف..."
              className="flex-1 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              style={{ color: isDark ? '#FFF' : '#1A1A1A' }}
              autoFocus
            />
            {userSearch && (
              <button onClick={() => { setUserSearch(''); setSearchResults([]); }} className="ml-3">
                <X size={16} color={isDark ? '#888' : '#999'} />
              </button>
            )}
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto px-4 pt-4">
          {searching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin" color="#5C1A1B" />
            </div>
          )}
          {!searching && userSearch && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                <UserPlus size={28} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
              </div>
              <p className="text-sm" style={{ color: isDark ? '#888' : '#999' }}>لم يتم العثور على مستخدم</p>
            </div>
          )}
          {searchResults.map((sr) => (
            <motion.button
              key={sr.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => startNewChat({ id: sr.id, name: sr.name })}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-2 transition-colors"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)' }}>
                {sr.avatar ? (
                  <img src={sr.avatar} alt={sr.name} className="w-11 h-11 rounded-xl object-cover" />
                ) : (
                  <User size={18} color="#FFF" />
                )}
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm font-semibold" style={{ color: isDark ? '#FFF' : '#1A1A1A' }}>{sr.name}</p>
                {sr.phone && <p className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>{sr.phone}</p>}
              </div>
              <MessageCircle size={16} color="#5C1A1B" />
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Chat List View (default) ───
  return (
    <div dir="rtl" className="flex flex-col h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="shrink-0 animated-gradient relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
        <div className="absolute inset-0 glass-dark opacity-30" />
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveScreen('main')}
              className="w-10 h-10 rounded-xl glass flex items-center justify-center"
            >
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">المحادثات</h1>
              <p className="text-white/40 text-xs mt-0.5">{chats.length} محادثة</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setView('new-chat')}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(92,26,27,0.3)' }}
            >
              <Plus size={20} strokeWidth={1.5} color="#D4547A" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center rounded-2xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
          <Search size={16} className="mr-3 shrink-0" color={isDark ? '#888' : '#999'} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في المحادثات..."
            className="flex-1 py-3 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            style={{ color: isDark ? '#FFF' : '#1A1A1A' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="ml-3">
              <X size={16} color={isDark ? '#888' : '#999'} />
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin" color="#5C1A1B" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              <MessagesSquare size={48} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
            </div>
            <p className="text-base font-medium" style={{ color: isDark ? '#888' : '#999' }}>لا توجد محادثات</p>
            <p className="text-xs mt-1 text-center max-w-[240px]" style={{ color: isDark ? '#666' : '#BBB' }}>
              ابدأ محادثة جديدة مع مستخدم آخر عن طريق الضغط على زر +
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setView('new-chat')}
              className="mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)' }}
            >
              <UserPlus size={16} />
              محادثة جديدة
            </motion.button>
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <AnimatePresence>
              {filteredChats.map((chat, index) => {
                const other = getOtherParticipant(chat);
                return (
                  <motion.button
                    key={chat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openChat(chat)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)' }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)' }}>
                      <User size={20} color="#FFF" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1A1A1A' }}>
                          {other.name}
                        </p>
                        {chat.lastMessageAt && (
                          <span className="text-[10px] shrink-0 mr-2" style={{ color: isDark ? '#888' : '#999' }}>
                            {timeAgo(chat.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: isDark ? '#888' : '#999' }}>
                        {chat.lastMessage || 'لا توجد رسائل بعد'}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
