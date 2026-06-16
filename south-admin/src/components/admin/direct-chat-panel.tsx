'use client';

import { useState, useEffect, useRef } from 'react';
import { useAdminStore } from '@/lib/store';
import { formatNumber, timeAgo, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import {
  MessageSquare, Search, Loader2, Users, Clock,
  CheckCheck, User, Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getAllDirectChats,
  getDirectChatMessages,
  subscribeToDirectChat,
  type DirectChat,
  type DirectChatMessage,
} from '@/lib/direct-chat';

export default function DirectChatPanel() {
  const { adminUser } = useAdminStore();
  const [chats, setChats] = useState<DirectChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedChat, setSelectedChat] = useState<DirectChat | null>(null);
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load all direct chats
  useEffect(() => {
    const loadChats = async () => {
      try {
        const chatList = await getAllDirectChats();
        setChats(chatList);
      } catch (err) {
        console.error('Error loading direct chats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadChats();
    // Refresh every 30 seconds
    const interval = setInterval(loadChats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load messages when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;
    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const msgs = await getDirectChatMessages(selectedChat.id);
        setMessages(msgs);
      } catch (err) {
        console.error('Error loading direct chat messages:', err);
      } finally {
        setMessagesLoading(false);
      }
    };
    loadMessages();

    // Subscribe to real-time messages
    const unsub = subscribeToDirectChat(selectedChat.id, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return unsub;
  }, [selectedChat]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filteredChats = chats.filter(chat => {
    if (!search) return true;
    return chat.participant1Name.includes(search) || chat.participant2Name.includes(search);
  });

  const totalMessages = chats.length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="ios-large-title text-foreground">المحادثات المباشرة</h1>
        <p className="text-muted-foreground text-sm mt-1">
          مراقبة المحادثات بين المستخدمين
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="ios-card p-4 card-press">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[#5C1A1B]/10">
                <MessageSquare className="w-5 h-5 text-[#5C1A1B] dark:text-[#C41E3A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
                <p className="text-xs text-muted-foreground">إجمالي المحادثات</p>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="ios-card p-4 card-press">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{chats.length > 0 ? new Set(chats.flatMap(c => [c.participant1Id, c.participant2Id])).size : 0}</p>
                <p className="text-xs text-muted-foreground">مستخدمين نشطين</p>
              </div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="ios-card p-4 card-press">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{chats.filter(c => c.lastMessageAt && new Date(c.lastMessageAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length}</p>
                <p className="text-xs text-muted-foreground">نشطة اليوم</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم المستخدم..."
          className="pr-10"
        />
      </div>

      {/* Chat List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#5C1A1B]" />
            <p className="text-sm text-muted-foreground">جاري تحميل المحادثات...</p>
          </div>
        </div>
      ) : filteredChats.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">لا توجد محادثات مباشرة</p>
          </div>
        </div>
      ) : (
        <div className="ios-card overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
            {filteredChats.map((chat, i) => (
              <motion.button
                key={chat.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-right',
                  selectedChat?.id === chat.id
                    ? 'bg-[#5C1A1B]/8'
                    : 'hover:bg-muted/30'
                )}
              >
                <div className="flex -space-x-2 space-x-reverse">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5C1A1B] to-[#3D0F10] flex items-center justify-center ring-2 ring-background">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B3A3E] to-[#5C1A1B] flex items-center justify-center ring-2 ring-background">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {chat.participant1Name} ↔ {chat.participant2Name}
                    </p>
                    {chat.lastMessageAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0 mr-2">
                        {timeAgo(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {chat.lastMessage}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Dialog */}
      <Dialog open={!!selectedChat} onOpenChange={(open) => { if (!open) setSelectedChat(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0" dir="rtl">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/30">
            <DialogTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#5C1A1B] dark:text-[#C41E3A]" />
              {selectedChat && (
                <span>{selectedChat.participant1Name} ↔ {selectedChat.participant2Name}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-[55vh]">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#5C1A1B]" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">لا توجد رسائل</p>
            ) : (
              messages.map((msg) => {
                const isP1 = msg.senderId === selectedChat?.participant1Id;
                return (
                  <div key={msg.id} className={`flex ${isP1 ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[80%]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-semibold text-[#5C1A1B] dark:text-[#C41E3A]">
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.isRead && <CheckCheck className="w-3 h-3 text-blue-400" />}
                      </div>
                      <div
                        className="rounded-2xl px-3.5 py-2 text-sm"
                        style={{
                          background: isP1
                            ? 'rgba(92,26,27,0.1)'
                            : 'rgba(139,58,62,0.1)',
                        }}
                      >
                        <p className="text-foreground leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
