'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getEscrowChats,
  getEscrowChatMessages,
  sendEscrowChatMessage,
  getDirectChats,
  getDirectChatMessages,
  supabase,
  type DbEscrowChat,
  type DbEscrowChatMessage,
  type DbDirectChat,
  type DbDirectChatMessage,
} from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Search, Shield, MessageCircle, Loader2, RefreshCw, Users, Headphones } from 'lucide-react';

export default function ChatMonitorPanel() {
  const { adminUser, showToast } = useAdminStore();

  // Escrow state
  const [escrowChats, setEscrowChats] = useState<DbEscrowChat[]>([]);
  const [escrowMessages, setEscrowMessages] = useState<DbEscrowChatMessage[]>([]);
  const [selectedEscrowChatId, setSelectedEscrowChatId] = useState<string | null>(null);
  const [escrowSearch, setEscrowSearch] = useState('');
  const [loadingEscrow, setLoadingEscrow] = useState(true);

  // Direct chat state
  const [directChats, setDirectChats] = useState<DbDirectChat[]>([]);
  const [directMessages, setDirectMessages] = useState<DbDirectChatMessage[]>([]);
  const [selectedDirectChatId, setSelectedDirectChatId] = useState<string | null>(null);
  const [directSearch, setDirectSearch] = useState('');
  const [loadingDirect, setLoadingDirect] = useState(true);

  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeTab, setActiveTab] = useState('escrow');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Escrow ---
  const loadEscrowChats = useCallback(async () => {
    setLoadingEscrow(true);
    const data = await getEscrowChats();
    setEscrowChats(data);
    setLoadingEscrow(false);
  }, []);

  useEffect(() => {
    loadEscrowChats();
  }, [loadEscrowChats]);

  useEffect(() => {
    if (!selectedEscrowChatId) { setEscrowMessages([]); return; }
    const load = async () => {
      const msgs = await getEscrowChatMessages(selectedEscrowChatId);
      setEscrowMessages(msgs);
    };
    load();

    const channel = supabase
      .channel(`escrow-msgs-${selectedEscrowChatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'escrow_chat_messages',
        filter: `chat_id=eq.${selectedEscrowChatId}`,
      }, (payload) => {
        setEscrowMessages(prev => [...prev, payload.new as DbEscrowChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedEscrowChatId]);

  // --- Direct ---
  const loadDirectChats = useCallback(async () => {
    setLoadingDirect(true);
    const data = await getDirectChats();
    setDirectChats(data);
    setLoadingDirect(false);
  }, []);

  useEffect(() => {
    loadDirectChats();
  }, [loadDirectChats]);

  useEffect(() => {
    if (!selectedDirectChatId) { setDirectMessages([]); return; }
    const load = async () => {
      const msgs = await getDirectChatMessages(selectedDirectChatId);
      setDirectMessages(msgs);
    };
    load();

    const channel = supabase
      .channel(`direct-msgs-${selectedDirectChatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_chat_messages',
        filter: `chat_id=eq.${selectedDirectChatId}`,
      }, (payload) => {
        setDirectMessages(prev => [...prev, payload.new as DbDirectChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedDirectChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [escrowMessages.length, directMessages.length]);

  const sendEscrowMessage = async () => {
    if (!messageText.trim() || !selectedEscrowChatId || !adminUser) return;
    setSendingMsg(true);
    try {
      const result = await sendEscrowChatMessage(
        selectedEscrowChatId,
        adminUser.uid,
        adminUser.displayName,
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

  const filteredEscrowChats = escrowChats.filter(c => {
    if (!escrowSearch) return true;
    return c.escrow_id?.includes(escrowSearch) ||
      c.buyer_name?.includes(escrowSearch) ||
      c.seller_name?.includes(escrowSearch);
  });

  const filteredDirectChats = directChats.filter(c => {
    if (!directSearch) return true;
    return c.participant1_name?.includes(directSearch) ||
      c.participant2_name?.includes(directSearch);
  });

  const selectedEscrowChat = escrowChats.find(c => c.id === selectedEscrowChatId);
  const selectedDirectChat = directChats.find(c => c.id === selectedDirectChatId);

  const renderEscrowPanel = () => (
    <div className="flex gap-4 h-[calc(100vh-360px)]">
      {/* Escrow Chat List */}
      <div className="w-80 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">محادثات الوسيط</span>
            <Badge variant="outline" className="text-xs">{escrowChats.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={escrowSearch} onChange={(e) => setEscrowSearch(e.target.value)} className="pr-10 h-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loadingEscrow ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#8B1E3A] animate-spin" /></div>
          ) : filteredEscrowChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">لا توجد محادثات وسيط</p>
            </div>
          ) : (
            filteredEscrowChats.map((chat) => (
              <div key={chat.id} onClick={() => setSelectedEscrowChatId(chat.id)}
                className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedEscrowChatId === chat.id ? 'bg-[#8B1E3A]/10' : ''}`}>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#8B1E3A] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{chat.escrow_id?.substring(0, 20)}...</p>
                    <p className="text-xs text-muted-foreground truncate">
                      بائع: {chat.seller_name || 'غير معروف'} | مشتري: {chat.buyer_name || 'غير معروف'}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(chat.updated_at)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Escrow Chat Detail */}
      <div className="flex-1 border border-border rounded-xl flex flex-col">
        {selectedEscrowChat ? (
          <>
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#8B1E3A]" />
                <span className="font-medium text-sm">وسيط: {selectedEscrowChat.escrow_id}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>البائع: {selectedEscrowChat.seller_name || 'غير معروف'}</span>
                <span>•</span>
                <span>المشتري: {selectedEscrowChat.buyer_name || 'غير معروف'}</span>
                <span>•</span>
                <span>{timeAgo(selectedEscrowChat.created_at)}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {escrowMessages.map((msg) => (
                <div key={msg.id} className={`flex ${
                  msg.sender_role === 'admin' ? 'justify-start' :
                  msg.sender_role === 'buyer' ? 'justify-end' : 'justify-end'
                }`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                    msg.sender_role === 'admin'
                      ? 'bg-[#7B1A30]/20 text-foreground rounded-bl-sm'
                      : msg.sender_role === 'buyer'
                      ? 'bg-muted text-foreground rounded-br-sm'
                      : 'bg-blue-500/10 text-foreground rounded-br-sm'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.sender_role === 'admin' && <Headphones className="w-3 h-3 text-[#8B1E3A]" />}
                      <span className={`text-xs font-medium ${
                        msg.sender_role === 'admin' ? 'text-[#8B1E3A]' :
                        msg.sender_role === 'buyer' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {msg.sender_name} ({msg.sender_role === 'buyer' ? 'مشتري' : msg.sender_role === 'seller' ? 'بائع' : 'إدارة'})
                      </span>
                    </div>
                    {msg.message_type === 'image' && msg.attachment_url && (
                      <img src={msg.attachment_url} alt="" className="rounded-lg max-h-40 mb-2" />
                    )}
                    <p>{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Input
                placeholder="اكتب رسالة كإدارة..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !sendingMsg && sendEscrowMessage()}
                className="flex-1"
                disabled={sendingMsg}
              />
              <Button onClick={sendEscrowMessage} size="icon" disabled={!messageText.trim() || sendingMsg}>
                {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center"><Shield className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>اختر محادثة وسيط للبدء</p></div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDirectPanel = () => (
    <div className="flex gap-4 h-[calc(100vh-360px)]">
      {/* Direct Chat List */}
      <div className="w-80 shrink-0 border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">المحادثات المباشرة</span>
            <Badge variant="outline" className="text-xs">{directChats.length}</Badge>
          </div>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={directSearch} onChange={(e) => setDirectSearch(e.target.value)} className="pr-10 h-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loadingDirect ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#8B1E3A] animate-spin" /></div>
          ) : filteredDirectChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="w-10 h-10 mb-2 opacity-30" /><p className="text-sm">لا توجد محادثات مباشرة</p>
            </div>
          ) : (
            filteredDirectChats.map((chat) => (
              <div key={chat.id} onClick={() => setSelectedDirectChatId(chat.id)}
                className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${selectedDirectChatId === chat.id ? 'bg-[#8B1E3A]/10' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#8B1E3A]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#8B1E3A]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{chat.participant1_name}</p>
                    <p className="text-xs text-muted-foreground truncate">مع: {chat.participant2_name}</p>
                  </div>
                </div>
                {chat.last_message && (
                  <p className="text-xs text-muted-foreground mt-1 truncate mr-10">{chat.last_message}</p>
                )}
                {chat.last_message_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 mr-10">{timeAgo(chat.last_message_at)}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Direct Chat Detail (read-only monitoring) */}
      <div className="flex-1 border border-border rounded-xl flex flex-col">
        {selectedDirectChat ? (
          <>
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#8B1E3A]" />
                <span className="font-medium text-sm">{selectedDirectChat.participant1_name} ↔ {selectedDirectChat.participant2_name}</span>
                <Badge variant="outline" className="text-xs">مراقبة فقط</Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {directMessages.map((msg) => (
                <div key={msg.id} className={`flex ${
                  msg.sender_id === selectedDirectChat.participant1_id ? 'justify-end' : 'justify-start'
                }`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                    msg.sender_id === selectedDirectChat.participant1_id
                      ? 'bg-muted text-foreground rounded-br-sm'
                      : 'bg-blue-500/10 text-foreground rounded-bl-sm'
                  }`}>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">{msg.sender_name}</span>
                    {msg.message_type === 'image' && msg.attachment_url && (
                      <img src={msg.attachment_url} alt="" className="rounded-lg max-h-40 mb-2" />
                    )}
                    <p>{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>وضع المراقبة - لا يمكن الرد على المحادثات المباشرة</span>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center"><Users className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>اختر محادثة مباشرة للمراقبة</p></div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">مراقبة المحادثات</h1>
          <p className="text-muted-foreground text-sm mt-1">مراقبة محادثات الوسيط والمحادثات المباشرة</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadEscrowChats(); loadDirectChats(); }}>
          <RefreshCw className="w-4 h-4 ml-1" /> تحديث
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="escrow" className="gap-1.5">
            <Shield className="w-4 h-4" />
            محادثات الوسيط ({escrowChats.length})
          </TabsTrigger>
          <TabsTrigger value="direct" className="gap-1.5">
            <Users className="w-4 h-4" />
            المحادثات المباشرة ({directChats.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="escrow">{renderEscrowPanel()}</TabsContent>
        <TabsContent value="direct">{renderDirectPanel()}</TabsContent>
      </Tabs>
    </div>
  );
}
