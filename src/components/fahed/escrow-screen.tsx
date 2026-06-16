'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Shield, Clock, CheckCircle2, AlertCircle,
  XCircle, Plus, Eye, ChevronDown, ChevronUp, History,
  Wallet, Users, FileText, AlertTriangle, MessageSquare,
  Send, Copy, Check, Info,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, formatNumber, formatBalance, generateReference } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, set, get, update, onValue, off, runTransaction } from 'firebase/database';
import {
  getOrCreateEscrowChat,
  getEscrowChatMessages,
  sendEscrowChatMessage,
  subscribeToEscrowChat,
  markMessagesAsRead,
  type EscrowChatMessage as SupabaseEscrowChatMessage,
} from '@/lib/escrow-chat';

// Escrow status type
type EscrowStatus = 'pending' | 'funded' | 'buyer_confirmed' | 'seller_confirmed' | 'completed' | 'disputed' | 'cancelled';

// Escrow interface
interface EscrowTransaction {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: EscrowStatus;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  createdBy: string;
  createdAt: string;
  fundedAt?: string;
  completedAt?: string;
  disputedAt?: string;
  disputeReason?: string;
  cancelledAt?: string;
  referenceCode: string;
}

// Status config
const statusConfig: Record<EscrowStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)', icon: Clock },
  funded: { label: 'تم التمويل', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.12)', icon: Wallet },
  buyer_confirmed: { label: 'المشتري أكد', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.12)', icon: CheckCircle2 },
  seller_confirmed: { label: 'البائع أكد', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.12)', icon: CheckCircle2 },
  completed: { label: 'مكتمل', color: '#10B981', bgColor: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  disputed: { label: 'نزاع', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)', icon: AlertTriangle },
  cancelled: { label: 'ملغى', color: '#6B7280', bgColor: 'rgba(107,114,128,0.12)', icon: XCircle },
};

type ScreenTab = 'active' | 'create' | 'history';

// Escrow chat message (UI model)
interface EscrowChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller' | 'admin';
  text: string;
  time: string;
}

export default function EscrowScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, setActiveScreen, addNotification } = useAppStore();

  const [activeTab, setActiveTab] = useState<ScreenTab>('active');
  const [escrows, setEscrows] = useState<EscrowTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [formRole, setFormRole] = useState<'buyer' | 'seller'>('buyer');
  const [formOtherPartyId, setFormOtherPartyId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEscrowId, setCreatedEscrowId] = useState('');

  // Detail view state
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowTransaction | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);

  // Escrow chat state - 3-party chat (buyer, seller, admin) via Supabase
  const [chatMessages, setChatMessages] = useState<EscrowChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch user escrows from Firebase
  useEffect(() => {
    if (!user?.id) return;
    const escrowRef = ref(database, `users/${user.id}/escrows`);
    const listener = onValue(escrowRef, (snapshot) => {
      setIsLoading(false);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allEscrows = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) as EscrowTransaction[];
        // Sort by creation date, newest first
        allEscrows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setEscrows(allEscrows);
      } else {
        setEscrows([]);
      }
    });
    return () => off(escrowRef);
  }, [user?.id]);

  const activeEscrows = escrows.filter(e => e.status !== 'completed' && e.status !== 'cancelled');
  const historyEscrows = escrows.filter(e => e.status === 'completed' || e.status === 'cancelled');

  // Load escrow chat messages via Supabase and subscribe to real-time updates
  useEffect(() => {
    if (!selectedEscrow?.id || !user?.id) {
      setChatMessages([]);
      setChatId(null);
      return;
    }

    let unsubscribe: (() => void) | null = null;

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
        setChatId(id);

        if (id) {
          // Fetch existing messages
          const messages = await getEscrowChatMessages(id);
          setChatMessages(messages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            senderRole: m.senderRole,
            text: m.message,
            time: m.createdAt,
          })));

          // Mark messages as read
          await markMessagesAsRead(id, user.id);

          // Subscribe to real-time new messages
          unsubscribe = subscribeToEscrowChat(id, (newMsg) => {
            setChatMessages(prev => {
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
            // Mark new incoming messages as read
            if (newMsg.senderId !== user.id) {
              markMessagesAsRead(id, user.id);
            }
          });
        }
      } catch (error) {
        console.error('Error initializing escrow chat:', error);
      } finally {
        setChatLoading(false);
      }
    };

    initChat();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedEscrow?.id, user?.id]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send chat message in escrow via Supabase
  const handleSendEscrowChat = async () => {
    if (!chatInput.trim() || !chatId || !user?.id || !selectedEscrow) return;
    const msgText = chatInput.trim();
    const senderRole = selectedEscrow.buyerId === user.id ? 'buyer' : 'seller';
    try {
      await sendEscrowChatMessage(
        chatId,
        user.id,
        user.name || 'مستخدم',
        senderRole,
        msgText
      );
      setChatInput('');
    } catch (error) {
      console.error('Error sending escrow chat message:', error);
    }
  };

  // Create escrow
  const handleCreateEscrow = async () => {
    if (!user?.id || !formTitle.trim() || !formAmount.trim() || !formOtherPartyId.trim()) return;

    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsProcessing(true);

    try {
      const referenceCode = `ESC-${generateReference().slice(-8)}`;
      const escrowId = `escrow-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const newEscrow: EscrowTransaction = {
        id: escrowId,
        title: formTitle.trim(),
        description: formDescription.trim(),
        amount,
        currency: formCurrency,
        buyerId: formRole === 'buyer' ? user.id : formOtherPartyId.trim(),
        buyerName: formRole === 'buyer' ? (user.name || user.userId || '') : '',
        sellerId: formRole === 'seller' ? user.id : formOtherPartyId.trim(),
        sellerName: formRole === 'seller' ? (user.name || user.userId || '') : '',
        status: 'pending',
        buyerConfirmed: false,
        sellerConfirmed: false,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        referenceCode,
      };

      // Save to current user's escrows
      const updates: Record<string, unknown> = {};
      updates[`users/${user.id}/escrows/${escrowId}`] = newEscrow;

      // Try to save to other party's escrows too
      const otherPartyId = formOtherPartyId.trim();
      // Check if it's a userId format (starts with JN)
      if (otherPartyId.startsWith('JN')) {
        // Look up the Firebase UID for this userId
        const userIdSnapshot = await get(ref(database, `userIds/${otherPartyId}`));
        if (userIdSnapshot.exists()) {
          const otherUid = userIdSnapshot.val();
          updates[`users/${otherUid}/escrows/${escrowId}`] = newEscrow;
        }
      } else {
        // Might be a direct UID
        updates[`users/${otherPartyId}/escrows/${escrowId}`] = newEscrow;
      }

      await update(ref(database), updates);

      setCreatedEscrowId(referenceCode);
      setShowSuccess(true);

      // Reset form
      setFormTitle('');
      setFormDescription('');
      setFormAmount('');
      setFormCurrency('YER');
      setFormRole('buyer');
      setFormOtherPartyId('');

      addNotification({
        id: Date.now().toString(),
        title: 'تم إنشاء الحوالة الوسيطة',
        body: `تم إنشاء حوالة وسيطة بمبلغ ${amount.toLocaleString()} ${currencySymbols[formCurrency]}`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error creating escrow:', error);
      addNotification({
        id: Date.now().toString(),
        title: 'خطأ',
        body: 'فشل في إنشاء الحوالة الوسيطة',
        type: 'error',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fund escrow (as buyer)
  const handleFundEscrow = async (escrow: EscrowTransaction) => {
    if (!user?.id) return;
    setIsProcessing(true);

    try {
      const balanceField = escrow.currency === 'YER' ? 'balanceYER' : escrow.currency === 'SAR' ? 'balanceSAR' : 'balanceUSD';
      const currentBalance = user[balanceField] || 0;

      if (currentBalance < escrow.amount) {
        addNotification({
          id: Date.now().toString(),
          title: 'رصيد غير كافي',
          body: `رصيدك غير كافي لتمويل هذه الحوالة`,
          type: 'error',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        setIsProcessing(false);
        return;
      }

      // Deduct from buyer's balance
      const txResult = await runTransaction(ref(database, `users/${user.id}/${balanceField}`), (currentVal) => {
        return (currentVal || 0) - escrow.amount;
      });

      if (!txResult.committed) {
        throw new Error('Transaction failed');
      }

      // Update user balance in store
      const updatedBalance = txResult.snapshot.val();
      setUser({
        ...user,
        [balanceField]: updatedBalance,
      });

      // Update escrow status
      const updates: Record<string, unknown> = {};
      updates[`users/${user.id}/escrows/${escrow.id}/status`] = 'funded';
      updates[`users/${user.id}/escrows/${escrow.id}/fundedAt`] = new Date().toISOString();

      // Also update other party's escrow
      const otherPartyId = escrow.buyerId === user.id ? escrow.sellerId : escrow.buyerId;
      updates[`users/${otherPartyId}/escrows/${escrow.id}/status`] = 'funded';
      updates[`users/${otherPartyId}/escrows/${escrow.id}/fundedAt`] = new Date().toISOString();

      // Create transaction record
      const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      updates[`transactions/${txId}`] = {
        id: txId,
        fromUserId: user.id,
        toUserId: 'ESCROW',
        amount: escrow.amount,
        currency: escrow.currency,
        type: 'escrow',
        status: 'completed',
        description: `تمويل حوالة وسيطة: ${escrow.title}`,
        createdAt: new Date().toISOString(),
        escrowId: escrow.id,
      };

      await update(ref(database), updates);

      addNotification({
        id: Date.now().toString(),
        title: 'تم التمويل',
        body: `تم تمويل الحوالة الوسيطة بمبلغ ${escrow.amount.toLocaleString()} ${currencySymbols[escrow.currency]}`,
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error funding escrow:', error);
      addNotification({
        id: Date.now().toString(),
        title: 'خطأ',
        body: 'فشل في تمويل الحوالة الوسيطة',
        type: 'error',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm delivery
  const handleConfirmDelivery = async (escrow: EscrowTransaction) => {
    if (!user?.id) return;
    setIsProcessing(true);

    try {
      const isBuyer = escrow.buyerId === user.id;
      const updates: Record<string, unknown> = {};

      if (isBuyer) {
        updates[`users/${user.id}/escrows/${escrow.id}/buyerConfirmed`] = true;
        // Also update other party
        const otherPartyId = escrow.sellerId;
        updates[`users/${otherPartyId}/escrows/${escrow.id}/buyerConfirmed`] = true;

        // Check if both confirmed
        if (escrow.sellerConfirmed) {
          updates[`users/${user.id}/escrows/${escrow.id}/status`] = 'completed';
          updates[`users/${user.id}/escrows/${escrow.id}/completedAt`] = new Date().toISOString();
          updates[`users/${otherPartyId}/escrows/${escrow.id}/status`] = 'completed';
          updates[`users/${otherPartyId}/escrows/${escrow.id}/completedAt`] = new Date().toISOString();

          // Release funds to seller
          const balanceField = escrow.currency === 'YER' ? 'balanceYER' : escrow.currency === 'SAR' ? 'balanceSAR' : 'balanceUSD';
          await runTransaction(ref(database, `users/${escrow.sellerId}/${balanceField}`), (currentVal) => {
            return (currentVal || 0) + escrow.amount;
          });

          // Transaction record
          const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          updates[`transactions/${txId}`] = {
            id: txId,
            fromUserId: 'ESCROW',
            toUserId: escrow.sellerId,
            amount: escrow.amount,
            currency: escrow.currency,
            type: 'escrow_release',
            status: 'completed',
            description: `تحرير حوالة وسيطة: ${escrow.title}`,
            createdAt: new Date().toISOString(),
            escrowId: escrow.id,
          };
        } else {
          updates[`users/${user.id}/escrows/${escrow.id}/status`] = 'buyer_confirmed';
          updates[`users/${otherPartyId}/escrows/${escrow.id}/status`] = 'buyer_confirmed';
        }
      } else {
        updates[`users/${user.id}/escrows/${escrow.id}/sellerConfirmed`] = true;
        const otherPartyId = escrow.buyerId;
        updates[`users/${otherPartyId}/escrows/${escrow.id}/sellerConfirmed`] = true;

        if (escrow.buyerConfirmed) {
          updates[`users/${user.id}/escrows/${escrow.id}/status`] = 'completed';
          updates[`users/${user.id}/escrows/${escrow.id}/completedAt`] = new Date().toISOString();
          updates[`users/${otherPartyId}/escrows/${escrow.id}/status`] = 'completed';
          updates[`users/${otherPartyId}/escrows/${escrow.id}/completedAt`] = new Date().toISOString();

          const balanceField = escrow.currency === 'YER' ? 'balanceYER' : escrow.currency === 'SAR' ? 'balanceSAR' : 'balanceUSD';
          await runTransaction(ref(database, `users/${escrow.sellerId}/${balanceField}`), (currentVal) => {
            return (currentVal || 0) + escrow.amount;
          });

          const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          updates[`transactions/${txId}`] = {
            id: txId,
            fromUserId: 'ESCROW',
            toUserId: escrow.sellerId,
            amount: escrow.amount,
            currency: escrow.currency,
            type: 'escrow_release',
            status: 'completed',
            description: `تحرير حوالة وسيطة: ${escrow.title}`,
            createdAt: new Date().toISOString(),
            escrowId: escrow.id,
          };
        } else {
          updates[`users/${user.id}/escrows/${escrow.id}/status`] = 'seller_confirmed';
          updates[`users/${otherPartyId}/escrows/${escrow.id}/status`] = 'seller_confirmed';
        }
      }

      await update(ref(database), updates);

      addNotification({
        id: Date.now().toString(),
        title: 'تم التأكيد',
        body: isBuyer ? 'تم تأكيد استلام المشتري' : 'تم تأكيد تسليم البائع',
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error confirming delivery:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Open dispute
  const handleOpenDispute = async (escrow: EscrowTransaction) => {
    if (!user?.id || !disputeReason.trim()) return;
    setIsProcessing(true);

    try {
      const updates: Record<string, unknown> = {};
      updates[`users/${user.id}/escrows/${escrow.id}/status`] = 'disputed';
      updates[`users/${user.id}/escrows/${escrow.id}/disputedAt`] = new Date().toISOString();
      updates[`users/${user.id}/escrows/${escrow.id}/disputeReason`] = disputeReason.trim();

      const otherPartyId = escrow.buyerId === user.id ? escrow.sellerId : escrow.buyerId;
      updates[`users/${otherPartyId}/escrows/${escrow.id}/status`] = 'disputed';
      updates[`users/${otherPartyId}/escrows/${escrow.id}/disputedAt`] = new Date().toISOString();
      updates[`users/${otherPartyId}/escrows/${escrow.id}/disputeReason`] = disputeReason.trim();

      await update(ref(database), updates);

      setShowDisputeModal(false);
      setDisputeReason('');

      addNotification({
        id: Date.now().toString(),
        title: 'تم فتح نزاع',
        body: 'تم فتح نزاع على الحوالة الوسيطة وسيتم مراجعتها',
        type: 'warning',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error opening dispute:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel escrow (only if pending)
  const handleCancelEscrow = async (escrow: EscrowTransaction) => {
    if (!user?.id || escrow.status !== 'pending') return;
    setIsProcessing(true);

    try {
      const updates: Record<string, unknown> = {};
      updates[`users/${user.id}/escrows/${escrow.id}/status`] = 'cancelled';
      updates[`users/${user.id}/escrows/${escrow.id}/cancelledAt`] = new Date().toISOString();

      const otherPartyId = escrow.buyerId === user.id ? escrow.sellerId : escrow.buyerId;
      updates[`users/${otherPartyId}/escrows/${escrow.id}/status`] = 'cancelled';
      updates[`users/${otherPartyId}/escrows/${escrow.id}/cancelledAt`] = new Date().toISOString();

      await update(ref(database), updates);

      addNotification({
        id: Date.now().toString(),
        title: 'تم الإلغاء',
        body: 'تم إلغاء الحوالة الوسيطة',
        type: 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Error cancelling escrow:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy reference code
  const handleCopyRef = (refCode: string) => {
    navigator.clipboard.writeText(refCode).catch(() => {});
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Time ago helper
  const timeAgo = (dateStr: string) => {
    const now = new Date().getTime();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
  };

  // ═══════════════════════════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (selectedEscrow) {
    const escrow = selectedEscrow;
    const statusCfg = statusConfig[escrow.status];
    const StatusIcon = statusCfg.icon;
    const isBuyer = escrow.buyerId === user?.id;
    const isSeller = escrow.sellerId === user?.id;
    const canFund = isBuyer && escrow.status === 'pending';
    const canConfirm = (isBuyer && escrow.status === 'funded' && !escrow.buyerConfirmed) ||
                       (isBuyer && escrow.status === 'seller_confirmed' && !escrow.buyerConfirmed) ||
                       (isSeller && escrow.status === 'funded' && !escrow.sellerConfirmed) ||
                       (isSeller && escrow.status === 'buyer_confirmed' && !escrow.sellerConfirmed);
    const canDispute = escrow.status === 'funded' || escrow.status === 'buyer_confirmed' || escrow.status === 'seller_confirmed';
    const canCancel = escrow.status === 'pending';

    return (
      <div className="min-h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
          style={{
            background: isDark ? '#1A0A0E' : '#5C1A1B',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <button onClick={() => setSelectedEscrow(null)} className="p-1">
            <ArrowRight size={22} color="#FFF" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-base font-bold">تفاصيل الحوالة الوسيطة</h1>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Status card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{
              background: isDark ? '#1A1A1A' : '#FFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: statusCfg.bgColor }}>
                <StatusIcon size={22} color={statusCfg.color} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{escrow.title}</p>
                <p className="text-xs mt-0.5" style={{ color: statusCfg.color }}>{statusCfg.label}</p>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ background: isDark ? '#222' : '#F8F8F8' }}>
              <span className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>المبلغ</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatBalance(escrow.amount, escrow.currency)}</span>
                <span className="text-xs" style={{ color: isDark ? '#666' : '#AAA' }}>{currencySymbols[escrow.currency]}</span>
              </div>
            </div>

            {/* Reference code */}
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? '#222' : '#F8F8F8' }}>
              <span className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>رمز المرجع</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{escrow.referenceCode}</span>
                <button onClick={() => handleCopyRef(escrow.referenceCode)} className="p-1">
                  {copiedRef ? <Check size={14} color="#10B981" /> : <Copy size={14} color={isDark ? '#888' : '#999'} />}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Parties info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-4"
            style={{
              background: isDark ? '#1A1A1A' : '#FFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <h3 className="text-sm font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أطراف الحوالة</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <Users size={14} color="#10B981" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px]" style={{ color: isDark ? '#666' : '#999' }}>المشتري</p>
                  <p className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#333' }}>
                    {isBuyer ? 'أنت' : (escrow.buyerName || escrow.buyerId)}
                  </p>
                </div>
                {escrow.buyerConfirmed && <CheckCircle2 size={16} color="#10B981" />}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <Wallet size={14} color="#3B82F6" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px]" style={{ color: isDark ? '#666' : '#999' }}>البائع</p>
                  <p className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#333' }}>
                    {isSeller ? 'أنت' : (escrow.sellerName || escrow.sellerId)}
                  </p>
                </div>
                {escrow.sellerConfirmed && <CheckCircle2 size={16} color="#10B981" />}
              </div>
            </div>
          </motion.div>

          {/* Description */}
          {escrow.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl p-4"
              style={{
                background: isDark ? '#1A1A1A' : '#FFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الوصف</h3>
              <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>{escrow.description}</p>
            </motion.div>
          )}

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-4"
            style={{
              background: isDark ? '#1A1A1A' : '#FFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <h3 className="text-sm font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>السجل الزمني</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                <span className="text-[11px]" style={{ color: isDark ? '#AAA' : '#666' }}>تم الإنشاء - {timeAgo(escrow.createdAt)}</span>
              </div>
              {escrow.fundedAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                  <span className="text-[11px]" style={{ color: isDark ? '#AAA' : '#666' }}>تم التمويل - {timeAgo(escrow.fundedAt)}</span>
                </div>
              )}
              {escrow.completedAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                  <span className="text-[11px]" style={{ color: isDark ? '#AAA' : '#666' }}>مكتمل - {timeAgo(escrow.completedAt)}</span>
                </div>
              )}
              {escrow.disputedAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
                  <span className="text-[11px]" style={{ color: isDark ? '#AAA' : '#666' }}>نزاع - {timeAgo(escrow.disputedAt)}</span>
                </div>
              )}
              {escrow.cancelledAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#6B7280' }} />
                  <span className="text-[11px]" style={{ color: isDark ? '#AAA' : '#666' }}>ملغى - {timeAgo(escrow.cancelledAt)}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Dispute reason */}
          {escrow.disputeReason && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} color="#EF4444" />
                <h3 className="text-sm font-bold" style={{ color: '#EF4444' }}>سبب النزاع</h3>
              </div>
              <p className="text-xs" style={{ color: isDark ? '#CCC' : '#666' }}>{escrow.disputeReason}</p>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="space-y-3 pb-8">
            {canFund && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleFundEscrow(escrow)}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)' }}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Wallet size={18} />
                    تمويل الحوالة ({formatBalance(escrow.amount, escrow.currency)} {currencySymbols[escrow.currency]})
                  </>
                )}
              </motion.button>
            )}

            {canConfirm && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleConfirmDelivery(escrow)}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    {isBuyer ? 'تأكيد استلام المشتري' : 'تأكيد تسليم البائع'}
                  </>
                )}
              </motion.button>
            )}

            {canDispute && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowDisputeModal(true)}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <AlertTriangle size={16} />
                فتح نزاع
              </motion.button>
            )}

            {canCancel && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleCancelEscrow(escrow)}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: isDark ? 'rgba(107,114,128,0.1)' : 'rgba(107,114,128,0.06)',
                  color: isDark ? '#999' : '#666',
                  border: `1px solid ${isDark ? 'rgba(107,114,128,0.2)' : 'rgba(107,114,128,0.15)'}`,
                }}
              >
                <XCircle size={16} />
                إلغاء الحوالة
              </motion.button>
            )}
          </div>
        </div>

        {/* 3-Party Escrow Chat (Buyer, Seller, Admin) */}
        {selectedEscrow && (
          <div className="mt-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              style={{
                background: showChat ? (isDark ? 'rgba(92,26,27,0.2)' : 'rgba(92,26,27,0.08)') : (isDark ? 'rgba(92,26,27,0.1)' : 'rgba(92,26,27,0.05)'),
                color: '#5C1A1B',
                border: `1px solid ${isDark ? 'rgba(92,26,27,0.3)' : 'rgba(92,26,27,0.15)'}`,
              }}
            >
              <MessageSquare size={16} />
              {showChat ? 'إخفاء المحادثة' : 'محادثة الأطراف'}
              {chatMessages.length > 0 && (
                <span className="bg-[#5C1A1B] text-white text-[10px] px-1.5 py-0.5 rounded-full">{chatMessages.length}</span>
              )}
            </button>

            {showChat && (
              <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                {/* Chat participants info */}
                <div className="px-3 py-2 flex items-center gap-4 text-[11px]" style={{ background: isDark ? '#1A1A1A' : '#F8F8F8', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    المشتري: {selectedEscrow.buyerName || 'غير معروف'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    البائع: {selectedEscrow.sellerName || 'غير معروف'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    الأدمن
                  </span>
                </div>

                {/* Chat messages */}
                <div className="max-h-[250px] overflow-y-auto p-3 space-y-2" style={{ background: isDark ? '#111' : '#FFF' }}>
                  {chatLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-[#5C1A1B]/30 border-t-[#5C1A1B] rounded-full animate-spin" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <p className="text-center text-xs py-4" style={{ color: isDark ? '#666' : '#999' }}>لا توجد رسائل بعد</p>
                  ) : (
                    chatMessages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      const roleColors: Record<string, { bg: string; text: string; label: string }> = {
                        buyer: { bg: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)', text: '#3B82F6', label: 'مشتري' },
                        seller: { bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)', text: '#10B981', label: 'بائع' },
                        admin: { bg: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)', text: '#F59E0B', label: 'أدمن' },
                      };
                      const rc = roleColors[msg.senderRole] || roleColors.buyer;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ background: rc.bg, color: rc.text }}>
                            {msg.senderRole === 'admin' ? 'إ' : msg.senderName?.charAt(0) || '?'}
                          </div>
                          <div className={`max-w-[75%] ${isMe ? 'text-left' : ''}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] font-medium" style={{ color: rc.text }}>{msg.senderName}</span>
                              <span className="text-[8px] px-1 py-0.5 rounded-full" style={{ background: rc.bg, color: rc.text }}>{rc.label}</span>
                            </div>
                            <div className="p-2.5 rounded-xl text-xs leading-relaxed" style={{ background: isMe ? (isDark ? 'rgba(92,26,27,0.2)' : 'rgba(92,26,27,0.08)') : (isDark ? '#1E1E1E' : '#F5F5F5'), color: isDark ? '#E0E0E0' : '#333' }}>
                              {msg.text}
                            </div>
                            <p className="text-[9px] mt-0.5" style={{ color: isDark ? '#555' : '#BBB' }}>
                              {new Date(msg.time).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="p-2 flex gap-2" style={{ background: isDark ? '#1A1A1A' : '#F8F8F8', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendEscrowChat()}
                    placeholder="اكتب رسالة..."
                    className="flex-1 py-2 px-3 rounded-xl text-xs outline-none"
                    style={{ background: isDark ? '#222' : '#FFF', color: isDark ? '#FFF' : '#333', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                  />
                  <button
                    onClick={handleSendEscrowChat}
                    disabled={!chatInput.trim()}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: chatInput.trim() ? '#5C1A1B' : (isDark ? '#333' : '#DDD'), color: chatInput.trim() ? '#FFF' : (isDark ? '#666' : '#AAA') }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dispute Modal */}
        <AnimatePresence>
          {showDisputeModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setShowDisputeModal(false)}
            >
              <motion.div
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-t-3xl p-5"
                style={{ background: isDark ? '#1A1A1A' : '#FFF' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
                    <AlertTriangle size={20} color="#EF4444" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>فتح نزاع</h3>
                    <p className="text-[11px]" style={{ color: isDark ? '#888' : '#999' }}>سيتم مراجعة النزاع من قبل الإدارة</p>
                  </div>
                </div>

                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="اكتب سبب النزاع..."
                  rows={4}
                  className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowDisputeModal(false)}
                    className="flex-1 py-3 rounded-xl text-sm font-medium"
                    style={{
                      background: isDark ? '#222' : '#F0F0F0',
                      color: isDark ? '#CCC' : '#666',
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleOpenDispute(escrow)}
                    disabled={!disputeReason.trim() || isProcessing}
                    className="flex-1 py-3 rounded-xl text-white text-sm font-bold"
                    style={{ background: '#EF4444', opacity: !disputeReason.trim() ? 0.5 : 1 }}
                  >
                    إرسال النزاع
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUCCESS MODAL
  // ═══════════════════════════════════════════════════════════════════════
  const renderSuccessModal = () => (
    <AnimatePresence>
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl p-6 text-center"
            style={{ background: isDark ? '#1A1A1A' : '#FFF' }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <CheckCircle2 size={32} color="#10B981" />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تم إنشاء الحوالة الوسيطة</h3>
            <p className="text-xs mb-4" style={{ color: isDark ? '#888' : '#999' }}>رمز المرجع</p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4"
              style={{ background: isDark ? '#222' : '#F0F0F0' }}
            >
              <span className="text-sm font-mono font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{createdEscrowId}</span>
              <button onClick={() => handleCopyRef(createdEscrowId)}>
                {copiedRef ? <Check size={14} color="#10B981" /> : <Copy size={14} color={isDark ? '#888' : '#999'} />}
              </button>
            </div>
            <p className="text-[11px] leading-relaxed mb-4" style={{ color: isDark ? '#777' : '#999' }}>
              شارك رمز المرجع مع الطرف الآخر لتتبع الحوالة
            </p>
            <button
              onClick={() => { setShowSuccess(false); setActiveTab('active'); }}
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: '#5C1A1B' }}
            >
              عرض الحوالات النشطة
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN VIEW
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: isDark ? '#1A0A0E' : '#5C1A1B',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        <button onClick={() => setActiveScreen('main')} className="p-1">
          <ArrowRight size={22} color="#FFF" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Shield size={20} color="#FFF" />
          <h1 className="text-white text-base font-bold">خدمة الوسيط</h1>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex px-4 pt-3 gap-1"
      >
        {[
          { key: 'active' as ScreenTab, label: 'النشطة', icon: Clock },
          { key: 'create' as ScreenTab, label: 'إنشاء', icon: Plus },
          { key: 'history' as ScreenTab, label: 'السجل', icon: History },
        ].map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: isActive ? (isDark ? '#5C1A1B' : '#5C1A1B') : (isDark ? '#1A1A1A' : '#F0F0F0'),
                color: isActive ? '#FFF' : (isDark ? '#888' : '#999'),
              }}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.key === 'active' && activeEscrows.length > 0 && (
                <span
                  className="w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF' }}
                >
                  {activeEscrows.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 space-y-3"
          >
            {/* Info card */}
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: isDark ? 'rgba(92,26,27,0.1)' : 'rgba(92,26,27,0.05)',
                border: `1px solid ${isDark ? 'rgba(92,26,27,0.2)' : 'rgba(92,26,27,0.1)'}`,
              }}
            >
              <Info size={18} color="#5C1A1B" className="shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#CCC' : '#666' }}>
                خدمة الوسيط تضمن حقوق البائع والمشتري. يتم احتجاز المبلغ حتى يؤكد كلا الطرفين اكتمال الصفقة.
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#5C1A1B]/30 border-t-[#5C1A1B] rounded-full animate-spin" />
              </div>
            ) : activeEscrows.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}>
                  <Shield size={28} color={isDark ? '#333' : '#DDD'} />
                </div>
                <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد حوالات وسيطة نشطة</p>
                <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>قم بإنشاء حوالة وسيطة جديدة</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 px-6 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5"
                  style={{ background: '#5C1A1B' }}
                >
                  <Plus size={14} />
                  إنشاء حوالة
                </button>
              </div>
            ) : (
              activeEscrows.map((escrow, index) => {
                const statusCfg = statusConfig[escrow.status];
                const StatusIcon = statusCfg.icon;
                const isBuyer = escrow.buyerId === user?.id;
                return (
                  <motion.div
                    key={escrow.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="w-full rounded-2xl p-4 text-right"
                    style={{
                      background: isDark ? '#1A1A1A' : '#FFF',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                  >
                    <button
                      onClick={() => setSelectedEscrow(escrow)}
                      className="w-full text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: statusCfg.bgColor }}>
                          <StatusIcon size={18} color={statusCfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{escrow.title}</p>
                            <span
                              className="text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 mr-2"
                              style={{ background: statusCfg.bgColor, color: statusCfg.color }}
                            >
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>
                              {isBuyer ? 'مشتري' : 'بائع'} • {timeAgo(escrow.createdAt)}
                            </p>
                            <p className="text-xs font-bold" style={{ color: isDark ? '#CCC' : '#333' }}>
                              {formatBalance(escrow.amount, escrow.currency)} {currencySymbols[escrow.currency]}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                    {/* Quick chat button */}
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEscrow(escrow);
                          setShowChat(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                        style={{
                          background: isDark ? 'rgba(92,26,27,0.15)' : 'rgba(92,26,27,0.06)',
                          color: '#5C1A1B',
                          border: `1px solid ${isDark ? 'rgba(92,26,27,0.25)' : 'rgba(92,26,27,0.12)'}`,
                        }}
                      >
                        <MessageSquare size={12} />
                        محادثة
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {activeTab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 space-y-4"
          >
            {/* How it works */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: isDark ? '#1A1A1A' : '#FFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                <Shield size={16} color="#5C1A1B" />
                كيف تعمل خدمة الوسيط؟
              </h3>
              <div className="space-y-2">
                {[
                  { step: '١', text: 'يتم إنشاء الحوالة وتحديد الطرفين' },
                  { step: '٢', text: 'المشتري يقوم بتمويل الحوالة' },
                  { step: '٣', text: 'البائع يسلم المنتج/الخدمة' },
                  { step: '٤', text: 'كلا الطرفين يؤكد الإتمام' },
                  { step: '٥', text: 'يتم تحرير المبلغ للبائع' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(92,26,27,0.12)' }}>
                      <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>{item.step}</span>
                    </div>
                    <span className="text-[11px]" style={{ color: isDark ? '#AAA' : '#666' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Create form */}
            <div
              className="rounded-2xl p-4 space-y-4"
              style={{
                background: isDark ? '#1A1A1A' : '#FFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إنشاء حوالة وسيطة</h3>

              {/* Title */}
              <div>
                <label className="text-[11px] font-medium mb-1.5 block" style={{ color: isDark ? '#888' : '#999' }}>
                  عنوان الحوالة *
                </label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: شراء هاتف سامسونج"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-medium mb-1.5 block" style={{ color: isDark ? '#888' : '#999' }}>
                  الوصف (اختياري)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="وصف تفصيلي للصفقة..."
                  rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-[11px] font-medium mb-1.5 block" style={{ color: isDark ? '#888' : '#999' }}>
                  دورك في الصفقة *
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'buyer' as const, label: 'مشتري', color: '#10B981' },
                    { key: 'seller' as const, label: 'بائع', color: '#3B82F6' },
                  ].map(role => (
                    <button
                      key={role.key}
                      onClick={() => setFormRole(role.key)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                      style={{
                        background: formRole === role.key ? `${role.color}15` : (isDark ? '#222' : '#F8F8F8'),
                        color: formRole === role.key ? role.color : (isDark ? '#888' : '#999'),
                        border: `1px solid ${formRole === role.key ? role.color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                      }}
                    >
                      {role.key === 'buyer' ? <Users size={14} /> : <Wallet size={14} />}
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other party ID */}
              <div>
                <label className="text-[11px] font-medium mb-1.5 block" style={{ color: isDark ? '#888' : '#999' }}>
                  معرف الطرف الآخر *
                </label>
                <input
                  value={formOtherPartyId}
                  onChange={(e) => setFormOtherPartyId(e.target.value)}
                  placeholder={formRole === 'buyer' ? 'معرف البائع (مثال: JN-XXXX)' : 'معرف المشتري (مثال: JN-XXXX)'}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  dir="ltr"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                />
              </div>

              {/* Amount & Currency */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-medium mb-1.5 block" style={{ color: isDark ? '#888' : '#999' }}>
                    المبلغ *
                  </label>
                  <input
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    type="number"
                    inputMode="decimal"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    dir="ltr"
                    style={{
                      background: isDark ? '#222' : '#F8F8F8',
                      color: isDark ? '#FFF' : '#1a1a1a',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    }}
                  />
                </div>
                <div className="w-28">
                  <label className="text-[11px] font-medium mb-1.5 block" style={{ color: isDark ? '#888' : '#999' }}>
                    العملة
                  </label>
                  <div className="flex gap-1">
                    {(['YER', 'SAR', 'USD'] as const).map(curr => (
                      <button
                        key={curr}
                        onClick={() => setFormCurrency(curr)}
                        className="flex-1 py-2.5 rounded-lg text-[10px] font-bold"
                        style={{
                          background: formCurrency === curr ? '#5C1A1B' : (isDark ? '#222' : '#F8F8F8'),
                          color: formCurrency === curr ? '#FFF' : (isDark ? '#888' : '#999'),
                        }}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleCreateEscrow}
                disabled={!formTitle.trim() || !formAmount.trim() || !formOtherPartyId.trim() || isProcessing}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)',
                  opacity: (!formTitle.trim() || !formAmount.trim() || !formOtherPartyId.trim()) ? 0.5 : 1,
                }}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield size={18} />
                    إنشاء حوالة وسيطة
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 space-y-3"
          >
            {historyEscrows.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}>
                  <History size={28} color={isDark ? '#333' : '#DDD'} />
                </div>
                <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا يوجد سجل</p>
                <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>الحوالات المكتملة والملغاة ستظهر هنا</p>
              </div>
            ) : (
              historyEscrows.map((escrow, index) => {
                const statusCfg = statusConfig[escrow.status];
                const StatusIcon = statusCfg.icon;
                const isBuyer = escrow.buyerId === user?.id;
                return (
                  <motion.div
                    key={escrow.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="w-full rounded-2xl p-4 text-right"
                    style={{
                      background: isDark ? '#1A1A1A' : '#FFF',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                  >
                    <button
                      onClick={() => setSelectedEscrow(escrow)}
                      className="w-full text-right"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: statusCfg.bgColor }}>
                          <StatusIcon size={18} color={statusCfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{escrow.title}</p>
                            <span
                              className="text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 mr-2"
                              style={{ background: statusCfg.bgColor, color: statusCfg.color }}
                            >
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>
                            {isBuyer ? 'مشتري' : 'بائع'} • {timeAgo(escrow.createdAt)}
                          </p>
                          <p className="text-xs font-bold" style={{ color: isDark ? '#CCC' : '#333' }}>
                            {formatBalance(escrow.amount, escrow.currency)} {currencySymbols[escrow.currency]}
                          </p>
                        </div>
                        </div>
                      </div>
                    </button>
                    {/* Quick chat button for history */}
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEscrow(escrow);
                          setShowChat(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                        style={{
                          background: isDark ? 'rgba(92,26,27,0.15)' : 'rgba(92,26,27,0.06)',
                          color: '#5C1A1B',
                          border: `1px solid ${isDark ? 'rgba(92,26,27,0.25)' : 'rgba(92,26,27,0.12)'}`,
                        }}
                      >
                        <MessageSquare size={12} />
                        محادثة
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {renderSuccessModal()}
    </div>
  );
}
