'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, timeAgo, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  ShieldCheck, Search, Loader2, AlertTriangle,
  Clock, CheckCircle, DollarSign,
  Calendar, Gavel, MessageSquare, ArrowLeftRight,
  Ban, ThumbsUp, ThumbsDown, Send,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getOrCreateEscrowChat,
  getEscrowChatMessages,
  sendEscrowChatMessage,
  subscribeToEscrowChat,
} from '@/lib/escrow-chat';

interface Escrow {
  id: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  currency: string;
  fee: number;
  status: 'active' | 'disputed' | 'completed' | 'cancelled' | 'refunded';
  description: string;
  disputedBy?: string;
  disputeReason?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// UI chat message model
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
}

const statusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'نشط', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', icon: Clock },
  disputed: { label: 'نزاع', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: AlertTriangle },
  completed: { label: 'مكتمل', color: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400', icon: Ban },
  refunded: { label: 'مسترد', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', icon: ArrowLeftRight },
};

export default function EscrowPanel() {
  const { showToast, adminUser } = useAdminStore();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEscrow, setSelectedEscrow] = useState<Escrow | null>(null);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolveAction, setResolveAction] = useState<'release' | 'refund'>('release');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  // Escrow chat state (3-party: buyer, seller, admin) via Supabase
  const [escrowChatMessages, setEscrowChatMessages] = useState<ChatMessage[]>([]);
  const [adminChatInput, setAdminChatInput] = useState('');
  const [showEscrowChat, setShowEscrowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const escRef = ref(database, 'escrow');
    const unsub = onValue(escRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Escrow[] = Object.entries(data as Record<string, Record<string, unknown>>).map(([key, val]) => ({
        id: key,
        buyerId: val.buyerId || '',
        buyerName: val.buyerName || 'غير معروف',
        sellerId: val.sellerId || '',
        sellerName: val.sellerName || 'غير معروف',
        amount: val.amount || 0,
        currency: val.currency || 'USD',
        fee: val.fee || 0,
        status: val.status || 'active',
        description: val.description || '',
        disputedBy: val.disputedBy || '',
        disputeReason: val.disputeReason || '',
        createdAt: val.createdAt || new Date().toISOString(),
        updatedAt: val.updatedAt || '',
        completedAt: val.completedAt || '',
      }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEscrows(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load escrow chat messages via Supabase and subscribe to real-time updates
  useEffect(() => {
    if (!selectedEscrow?.id || !showEscrowChat) {
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const initChat = async () => {
      setChatLoading(true);
      try {
        // Get or create the Supabase chat room for this escrow
        const id = await getOrCreateEscrowChat(
          selectedEscrow.id,
          selectedEscrow.buyerId,
          selectedEscrow.buyerName,
          selectedEscrow.sellerId,
          selectedEscrow.sellerName
        );
        if (cancelled) return;
        setChatId(id);

        if (id) {
          // Fetch existing messages
          const messages = await getEscrowChatMessages(id);
          if (cancelled) return;
          setEscrowChatMessages(messages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: m.senderRole,
            text: m.message,
            time: m.createdAt,
          })));

          // Subscribe to real-time new messages
          unsubscribe = subscribeToEscrowChat(id, (newMsg) => {
            if (cancelled) return;
            setEscrowChatMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, {
                id: newMsg.id,
                senderId: newMsg.senderId,
                senderName: newMsg.senderName,
                senderRole: newMsg.senderRole,
                text: newMsg.message,
                time: newMsg.createdAt,
              }];
            });
          });
        }
      } catch (error) {
        console.error('Error initializing admin escrow chat:', error);
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    };

    initChat();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [selectedEscrow?.id, selectedEscrow?.buyerId, selectedEscrow?.buyerName, selectedEscrow?.sellerId, selectedEscrow?.sellerName, showEscrowChat]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [escrowChatMessages]);

  // Admin send message in escrow chat via Supabase
  const handleAdminSendEscrowChat = async () => {
    if (!adminChatInput.trim() || !chatId || !selectedEscrow) return;
    const msgText = adminChatInput.trim();
    try {
      await sendEscrowChatMessage(
        chatId,
        adminUser?.uid || 'admin',
        adminUser?.displayName || 'الإدارة',
        'admin',
        msgText
      );
      setAdminChatInput('');
    } catch {
      showToast('حدث خطأ في إرسال الرسالة', 'error');
    }
  };

  const filtered = useMemo(() => {
    return escrows.filter(e => {
      const matchSearch = search === '' ||
        e.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        e.sellerName.toLowerCase().includes(search.toLowerCase()) ||
        e.id.includes(search);
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [escrows, search, statusFilter]);

  const stats = useMemo(() => ({
    total: escrows.length,
    active: escrows.filter(e => e.status === 'active').length,
    disputed: escrows.filter(e => e.status === 'disputed').length,
    completed: escrows.filter(e => e.status === 'completed').length,
    totalAmount: escrows.filter(e => e.status === 'active').reduce((s, e) => s + e.amount, 0),
  }), [escrows]);

  const handleResolve = async () => {
    if (!selectedEscrow) return;
    setResolving(true);
    try {
      const now = new Date().toISOString();
      const updates: Record<string, string> = {
        [`escrow/${selectedEscrow.id}/status`]: resolveAction === 'release' ? 'completed' : 'refunded',
        [`escrow/${selectedEscrow.id}/updatedAt`]: now,
        [`escrow/${selectedEscrow.id}/completedAt`]: now,
        [`escrow/${selectedEscrow.id}/resolvedBy`]: adminUser?.uid,
        [`escrow/${selectedEscrow.id}/resolveNote`]: resolveNote,
      };
      await update(ref(database), updates);
      showToast(resolveAction === 'release' ? 'تم إطلاق الأموال للبائع' : 'تم استرداد الأموال للمشتري', 'success');
      setResolveDialog(false);
      setSelectedEscrow(null);
      setResolveNote('');
    } catch {
      showToast('حدث خطأ أثناء المعالجة', 'error');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري تحميل عمليات الضمان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-[#5C1A1B]" />
          الضمان / الوسيط
        </h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة عمليات الضمان وحل النزاعات</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي العمليات', value: stats.total, icon: ShieldCheck, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'نشطة', value: stats.active, icon: Clock, color: 'from-blue-600 to-blue-800' },
          { label: 'نزاعات', value: stats.disputed, icon: AlertTriangle, color: 'from-red-600 to-red-800' },
          { label: 'مكتملة', value: stats.completed, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'أموال محجوزة', value: formatNumber(stats.totalAmount), icon: DollarSign, color: 'from-purple-600 to-purple-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث بالاسم أو الرقم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="disputed">نزاع</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="refunded">مسترد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Escrow List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">لا توجد عمليات ضمان</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.slice(0, 50).map((escrow, i) => {
              const st = statusMap[escrow.status] || statusMap.active;
              const StatusIcon = st.icon;
              return (
                <motion.div
                  key={escrow.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className={cn(
                    'border-0 shadow-sm hover:shadow-md transition-shadow',
                    escrow.status === 'disputed' && 'ring-1 ring-red-500/30'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                            escrow.status === 'disputed' ? 'bg-red-500/10' : 'bg-[#5C1A1B]/10'
                          )}>
                            <ShieldCheck className={cn(
                              'w-5 h-5',
                              escrow.status === 'disputed' ? 'text-red-500' : 'text-[#5C1A1B]'
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">المشتري:</span>
                              <span className="font-semibold text-sm">{escrow.buyerName}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">البائع:</span>
                              <span className="font-semibold text-sm">{escrow.sellerName}</span>
                            </div>
                            {escrow.description && (
                              <p className="text-xs text-muted-foreground truncate">{escrow.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {timeAgo(escrow.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="font-bold text-sm">
                            {formatNumber(escrow.amount)} {escrow.currency}
                          </p>
                          <Badge variant="outline" className={cn('text-[10px] mt-1', st.color)}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {st.label}
                          </Badge>
                          <div className="mt-2 flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2"
                              onClick={() => {
                                setSelectedEscrow(escrow);
                                setShowEscrowChat(true);
                              }}
                            >
                              <MessageSquare className="w-3 h-3 ml-1" />
                              محادثة
                            </Button>
                            {(escrow.status === 'active' || escrow.status === 'disputed') && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => {
                                    setSelectedEscrow(escrow);
                                    setResolveAction('release');
                                    setResolveDialog(true);
                                  }}
                                >
                                  <ThumbsUp className="w-3 h-3 ml-1" />
                                  إطلاق
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] px-2 text-red-500"
                                  onClick={() => {
                                    setSelectedEscrow(escrow);
                                    setResolveAction('refund');
                                    setResolveDialog(true);
                                  }}
                                >
                                  <ThumbsDown className="w-3 h-3 ml-1" />
                                  استرداد
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {escrow.status === 'disputed' && escrow.disputeReason && (
                        <div className="mt-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                          <p className="text-xs font-medium text-red-500 flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3 h-3" />
                            سبب النزاع:
                          </p>
                          <p className="text-xs text-muted-foreground">{escrow.disputeReason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Escrow 3-Party Chat Panel */}
      <Dialog open={showEscrowChat} onOpenChange={setShowEscrowChat}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#5C1A1B]" />
              محادثة الوسيط - الأطراف الثلاثة
            </DialogTitle>
          </DialogHeader>
          {selectedEscrow && (
            <div className="space-y-3">
              {/* Participants */}
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />المشتري: {selectedEscrow.buyerName}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />البائع: {selectedEscrow.sellerName}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />الأدمن</span>
              </div>

              {/* Messages */}
              <div className="max-h-[350px] overflow-y-auto p-3 border border-border/30 rounded-xl">
                <div className="space-y-3">
                  {chatLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#5C1A1B]" />
                    </div>
                  ) : escrowChatMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">لا توجد رسائل بعد</p>
                  ) : (
                    escrowChatMessages.map((msg) => {
                      const roleColors: Record<string, { bg: string; text: string; label: string }> = {
                        buyer: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'مشتري' },
                        seller: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', label: 'بائع' },
                        admin: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'أدمن' },
                      };
                      const rc = roleColors[msg.senderRole] || roleColors.buyer;
                      const isAdmin = msg.senderRole === 'admin';
                      return (
                        <div key={msg.id} className={cn('flex gap-2', isAdmin && 'flex-row-reverse')}>
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold', rc.bg, rc.text)}>
                            {msg.senderRole === 'admin' ? 'إ' : msg.senderName?.charAt(0) || '?'}
                          </div>
                          <div className={cn('max-w-[75%]', isAdmin && 'text-left')}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={cn('text-xs font-medium', rc.text)}>{msg.senderName}</span>
                              <Badge className={cn('text-[8px]', rc.bg, rc.text)}>{rc.label}</Badge>
                            </div>
                            <div className={cn('p-2.5 rounded-xl text-sm', isAdmin ? 'bg-[#5C1A1B]/10 rounded-tl-none' : 'bg-muted/30 rounded-tr-none')}>
                              {msg.text}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(msg.time)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Admin chat input */}
              <div className="flex gap-2">
                <Input
                  value={adminChatInput}
                  onChange={(e) => setAdminChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAdminSendEscrowChat()}
                  placeholder="اكتب ردك كإدارة..."
                  className="flex-1"
                />
                <Button onClick={handleAdminSendEscrowChat} disabled={!adminChatInput.trim() || !chatId} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onOpenChange={setResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#5C1A1B]" />
              {resolveAction === 'release' ? 'إطلاق الأموال' : 'استرداد الأموال'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedEscrow && (
              <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                <p className="text-sm"><strong>المشتري:</strong> {selectedEscrow.buyerName}</p>
                <p className="text-sm"><strong>البائع:</strong> {selectedEscrow.sellerName}</p>
                <p className="text-sm"><strong>المبلغ:</strong> {formatNumber(selectedEscrow.amount)} {selectedEscrow.currency}</p>
              </div>
            )}
            <div>
              <Label>ملاحظة القرار</Label>
              <Textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="أضف ملاحظة حول قرارك..."
                rows={3}
              />
            </div>
            <div className={cn(
              'p-3 rounded-lg text-sm',
              resolveAction === 'release'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
            )}>
              {resolveAction === 'release'
                ? 'سيتم إطلاق الأموال للبائع وإكمال العملية'
                : 'سيتم استرداد الأموال للمشتري وإلغاء العملية'}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialog(false)}>إلغاء</Button>
            <Button
              onClick={handleResolve}
              disabled={resolving}
              className={resolveAction === 'release' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {resolving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
