'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wifi,
  RefreshCw,
  Wallet,
  CreditCard,
  Smartphone,
  Gamepad2,
  ArrowDownUp,
  Plus,
  Minus,
  Download,
  Upload,
  MessageCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { CardColor } from '@/lib/store';
import { formatBalance, formatNumber, currencySymbols, currencyNames, currencyBadgeColors, timeAgo, transactionTypeLabels, transactionTypeColors } from '@/lib/utils';
import { LOGO_BASE64, RED_LOGO_FILTER } from '@/lib/logo';
import { database } from '@/lib/firebase';
import { ref, get, onValue } from 'firebase/database';

type FilterTab = 'all' | 'incoming' | 'outgoing' | 'orders' | 'deposit' | 'withdraw';

interface BalanceCard {
  currency: 'YER' | 'SAR' | 'USD';
  accentColor: string;
  accentColorEnd: string;
  glowColor: string;
  patternColor: string;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '255,255,255';
}

const defaultBalanceCards: BalanceCard[] = [
  { currency: 'YER', accentColor: '#5C1A1B', accentColorEnd: '#3D0F10', glowColor: 'rgba(92,26,27,0.35)', patternColor: 'rgba(255,255,255,0.06)' },
  { currency: 'SAR', accentColor: '#059669', accentColorEnd: '#1B7A2B', glowColor: 'rgba(5,150,105,0.35)', patternColor: 'rgba(255,255,255,0.06)' },
  { currency: 'USD', accentColor: '#2563EB', accentColorEnd: '#0D47A1', glowColor: 'rgba(37,99,235,0.35)', patternColor: 'rgba(255,255,255,0.06)' },
];

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'incoming', label: 'وارد' },
  { id: 'outgoing', label: 'صادر' },
  { id: 'orders', label: 'طلبات' },
  { id: 'deposit', label: 'إيداع' },
  { id: 'withdraw', label: 'سحب' },
];

const spendingCategories = [
  { key: 'recharge', label: 'شحن', color: '#8B5CF6', icon: Smartphone },
  { key: 'internet', label: 'إنترنت', color: '#3B82F6', icon: Wifi },
  { key: 'wallet-services', label: 'خدمات المحفظة', color: '#F59E0B', icon: Gamepad2 },
  { key: 'service-providers', label: 'مزودين', color: '#14B8A6', icon: CreditCard },
];

// Animated counter hook
function useAnimatedCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevTarget.current = target;
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

function AnimatedBalance({ amount, currency, visible }: { amount: number; currency: string; visible: boolean }) {
  const animatedValue = useAnimatedCounter(amount);
  if (!visible) return <span className="text-white text-2xl font-bold tracking-wide">****</span>;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-white text-2xl font-bold tracking-wide">{formatBalance(animatedValue, currency)}</span>
      <span className="text-white/40 text-xs">{currencySymbols[currency]}</span>
    </div>
  );
}

function getArabicDate(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return now.toLocaleDateString('ar-SA', options);
}

function getTransactionIcon(type: string, isIncoming: boolean) {
  switch (type) {
    case 'transfer': return isIncoming ? ArrowDownLeft : ArrowUpRight;
    case 'deposit': return Plus;
    case 'withdraw': return Minus;
    case 'payment': return CreditCard;
    case 'recharge': return Smartphone;
    case 'bill': return Receipt;
    case 'purchase': return ShoppingCart;
    case 'order': return ShoppingCart;
    default: return isIncoming ? ArrowDownLeft : ArrowUpRight;
  }
}

export default function WalletScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, balanceVisible, toggleBalance, transactions, setTransactions, orders, setOrders, setActiveScreen, cardColors, setCardColors } = useAppStore();
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Build balanceCards from Firebase cardColors or defaults
  const balanceCards: BalanceCard[] = defaultBalanceCards.map(card => {
    const customColor = cardColors[card.currency];
    if (customColor) {
      const r = parseInt(customColor.primary.slice(1, 3), 16);
      const g = parseInt(customColor.primary.slice(3, 5), 16);
      const b = parseInt(customColor.primary.slice(5, 7), 16);
      return {
        ...card,
        accentColor: customColor.primary,
        accentColorEnd: customColor.gradient,
        glowColor: `rgba(${r},${g},${b},0.35)`,
      };
    }
    return card;
  });

  // Listen for card color changes from Firebase
  useEffect(() => {
    const colorsRef = ref(database, 'adminSettings/cardColors');
    const unsubscribe = onValue(colorsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCardColors({
          YER: data.YER || { primary: '#5C1A1B', gradient: '#3D0F10' },
          SAR: data.SAR || { primary: '#059669', gradient: '#1B7A2B' },
          USD: data.USD || { primary: '#2563EB', gradient: '#0D47A1' },
        });
      }
    });
    return () => unsubscribe();
  }, [setCardColors]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<typeof transactions[0] | null>(null);

  // Carousel refs
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(375);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentTranslate = useRef(0);
  const prevTranslate = useRef(0);

  const dividerColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';

  const CARD_GAP = 12;
  const CARD_SIDE_PADDING = 32;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getBalance = (currency: string): number => {
    if (!user) return 0;
    const field = `balance${currency}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  const getCardWidth = useCallback(() => containerWidth * 0.78, [containerWidth]);
  const getStepWidth = useCallback(() => getCardWidth() + CARD_GAP, [getCardWidth]);

  const income = transactions.filter(tx => tx.toUserId === user?.id).reduce((sum, tx) => sum + tx.amount, 0);
  const expense = transactions.filter(tx => tx.fromUserId === user?.id).reduce((sum, tx) => sum + tx.amount, 0);

  const spendingData = spendingCategories.map(cat => {
    // Calculate real spending from transactions and orders
    let amount = 0;
    const now = new Date();

    if (cat.key === 'recharge') {
      amount = transactions
        .filter(tx => tx.type === 'recharge' && tx.fromUserId === user?.id)
        .filter(tx => {
          const txDate = new Date(tx.createdAt);
          return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, tx) => sum + (tx.currency === 'YER' ? tx.amount : 0), 0);
    } else if (cat.key === 'internet') {
      amount = orders
        .filter(o => (o.status === 'completed' || o.status === 'pending') && o.providerId?.includes('net'))
        .filter(o => {
          const oDate = new Date(o.createdAt);
          return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, o) => sum + (o.currency === 'YER' ? o.amount : 0), 0);
    } else if (cat.key === 'wallet-services') {
      amount = orders
        .filter(o => (o.status === 'completed' || o.status === 'pending') && ['pubg', 'freefire', 'call-of-duty', 'fortnite', 'valorant', 'roblox', 'minecraft', 'clash-royale', 'clash-of-clans', 'apex-legends', 'ea-fc', 'steam', 'genshin-impact', 'honkai-star', 'league-legends', 'netflix', 'spotify', 'youtube-premium', 'google-play', 'apple-itunes', 'amazon-gift', 'psn-card', 'xbox-card', 'nintendo-card', 'visa-virtual', 'mastercard-virtual', 'paypal'].includes(o.providerId))
        .filter(o => {
          const oDate = new Date(o.createdAt);
          return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, o) => sum + (o.currency === 'YER' ? o.amount : 0), 0);
    } else if (cat.key === 'service-providers') {
      amount = orders
        .filter(o => (o.status === 'completed' || o.status === 'pending') && o.providerId?.startsWith('api-'))
        .filter(o => {
          const oDate = new Date(o.createdAt);
          return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, o) => sum + (o.currency === 'YER' ? o.amount : 0), 0);
    }

    // Fallback: use general order data
    if (amount === 0) {
      amount = orders
        .filter(o => o.status === 'completed' || o.status === 'pending')
        .filter(o => {
          const oDate = new Date(o.createdAt);
          return oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, o) => sum + (o.currency === 'YER' ? o.amount : 0), 0);
    }

    return { ...cat, amount };
  });
  const maxSpending = Math.max(...spendingData.map(c => c.amount), 1);

  const filteredTransactions = transactions.filter((tx) => {
    const isIncoming = tx.toUserId === user?.id;
    if (activeFilter === 'incoming' && !isIncoming) return false;
    if (activeFilter === 'outgoing' && isIncoming) return false;
    if (activeFilter === 'orders' && tx.type !== 'order' && tx.type !== 'purchase') return false;
    if (activeFilter === 'deposit' && tx.type !== 'deposit') return false;
    if (activeFilter === 'withdraw' && tx.type !== 'withdraw') return false;
    if (searchQuery && !tx.description.includes(searchQuery)) return false;
    return true;
  });

  const now = new Date();
  const thisMonth = transactions.filter(tx => {
    const txDate = new Date(tx.createdAt);
    return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
  });
  const monthlyIncome = thisMonth.filter(tx => tx.toUserId === user?.id).reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyExpense = thisMonth.filter(tx => tx.fromUserId === user?.id).reduce((sum, tx) => sum + tx.amount, 0);
  const netThisMonth = monthlyIncome - monthlyExpense;

  // Carousel snap function
  const snapToCard = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, balanceCards.length - 1));
    setActiveCardIndex(clamped);
    const targetTranslate = -clamped * getStepWidth();
    currentTranslate.current = targetTranslate;
    prevTranslate.current = targetTranslate;

    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) {
        track.style.transform = `translateX(${targetTranslate}px)`;
        track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
      }
    }
  }, [getStepWidth]);

  const setTrackPosition = useCallback((translateX: number) => {
    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) {
        track.style.transform = `translateX(${translateX}px)`;
      }
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isDragging.current = true;
    startX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    prevTranslate.current = currentTranslate.current;
    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) track.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current) return;
    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = currentX - startX.current;
    const newTranslate = prevTranslate.current + diff;
    const minTranslate = -(balanceCards.length - 1) * getStepWidth();
    const maxTranslate = 0;
    let clampedTranslate = newTranslate;
    if (newTranslate > maxTranslate) {
      clampedTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.3;
    } else if (newTranslate < minTranslate) {
      clampedTranslate = minTranslate + (newTranslate - minTranslate) * 0.3;
    }
    currentTranslate.current = clampedTranslate;
    setTrackPosition(clampedTranslate);
  }, [getStepWidth, setTrackPosition]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const movedBy = currentTranslate.current - prevTranslate.current;
    const stepWidth = getStepWidth();
    const threshold = stepWidth * 0.2;
    let newIndex = activeCardIndex;
    if (movedBy < -threshold) {
      newIndex = Math.min(activeCardIndex + 1, balanceCards.length - 1);
    } else if (movedBy > threshold) {
      newIndex = Math.max(activeCardIndex - 1, 0);
    }
    const targetTranslate = -newIndex * stepWidth;
    currentTranslate.current = targetTranslate;
    prevTranslate.current = targetTranslate;
    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) {
        track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        track.style.transform = `translateX(${targetTranslate}px)`;
      }
    }
    setActiveCardIndex(newIndex);
  }, [activeCardIndex, getStepWidth]);

  useEffect(() => {
    currentTranslate.current = 0;
    prevTranslate.current = 0;
  }, []);

  // Load transactions from Firebase
  const loadFirebaseData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Load transactions
      const txRef = ref(database, 'transactions');
      const txSnapshot = await get(txRef);
      if (txSnapshot.exists()) {
        const data = txSnapshot.val();
        const txList = Object.keys(data)
          .map(key => data[key])
          .filter((tx: { fromUserId: string; toUserId: string }) => tx.fromUserId === user.id || tx.toUserId === user.id)
          .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(txList);
      }

      // Load orders
      const ordersRef = ref(database, 'orders');
      const ordersSnapshot = await get(ordersRef);
      if (ordersSnapshot.exists()) {
        const data = ordersSnapshot.val();
        const orderList = Object.keys(data)
          .map(key => data[key])
          .filter((o: { userId: string }) => o.userId === user.id)
          .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(orderList);
      }

      // Refresh user balance
      const userRef = ref(database, `users/${user.id}`);
      const userSnapshot = await get(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        setUser({
          ...user,
          balanceYER: userData.balanceYER || 0,
          balanceSAR: userData.balanceSAR || 0,
          balanceUSD: userData.balanceUSD || 0,
          kycStatus: userData.kycStatus || user.kycStatus,
        });
      }
    } catch (error) {
      console.error('Error loading Firebase data:', error);
    }
  }, [user, setTransactions, setOrders, setUser]);

  // Real-time listener for transactions
  useEffect(() => {
    if (!user?.id) return;
    const txRef = ref(database, 'transactions');
    const unsubscribe = onValue(txRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const txList = Object.keys(data)
          .map(key => data[key])
          .filter((tx: { fromUserId: string; toUserId: string }) => tx.fromUserId === user.id || tx.toUserId === user.id)
          .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(txList);
      }
    });
    return () => unsubscribe();
  }, [user?.id, setTransactions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFirebaseData();
    setIsRefreshing(false);
  };

  // Pull-to-refresh handlers
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const PULL_THRESHOLD = 80;

  const handlePullStart = useCallback((e: React.TouchEvent) => {
    setPullStartY(e.touches[0].clientY);
  }, []);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const diff = e.touches[0].clientY - pullStartY;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 100));
    }
  }, [pullStartY, isRefreshing]);

  const handlePullEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      handleRefresh();
    }
    setPullDistance(0);
  }, [pullDistance, isRefreshing, handleRefresh]);

  return (
    <div
      className="pb-4"
      onTouchStart={handlePullStart}
      onTouchMove={handlePullMove}
      onTouchEnd={handlePullEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div className="flex items-center justify-center py-2" style={{ height: pullDistance * 0.5 }}>
          <RefreshCw
            size={20}
            strokeWidth={1.5}
            color="#5C1A1B"
            className={isRefreshing ? 'animate-spin' : ''}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      )}

      {/* Header - Clean Jaib Style */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between" style={{ height: 50 }}>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold relative inline-block"
              style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}
            >
              المحفظة
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="absolute -bottom-1 right-0 h-[3px] rounded-full"
                style={{ background: '#5C1A1B' }}
              />
            </motion.h1>
            <p className="text-[11px] mt-1.5" style={{ color: isDark ? '#555' : '#999' }}>
              {getArabicDate()}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <RefreshCw size={18} strokeWidth={1.5} style={{ color: isDark ? '#999' : '#666' }} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Quick Action Buttons - Deposit, Withdraw & Transfer */}
      <div className="px-4 mt-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveScreen('deposit')}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
            }}
          >
            <Download size={15} strokeWidth={1.5} />
            <span>إيداع</span>
          </button>
          <button
            onClick={() => {
              if (user?.kycStatus !== 'verified') {
                useAppStore.getState().addNotification({
                  id: Date.now().toString(),
                  title: 'يرجى توثيق حسابك أولاً',
                  body: 'لا يمكنك السحب إلا بعد توثيق حسابك',
                  type: 'security',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                });
                return;
              }
              setActiveScreen('deposit');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              color: '#5C1A1B',
            }}
          >
            <Upload size={15} strokeWidth={1.5} />
            <span>سحب</span>
          </button>
          <button
            onClick={() => {
              if (user?.kycStatus !== 'verified') {
                useAppStore.getState().addNotification({
                  id: Date.now().toString(),
                  title: 'يرجى توثيق حسابك أولاً',
                  body: 'لا يمكنك التحويل إلا بعد توثيق حسابك',
                  type: 'security',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                });
                return;
              }
              useAppStore.getState().setTransferOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #5C1A1B 0%, #CC0000 100%)',
              boxShadow: '0 4px 12px rgba(92,26,27,0.3)',
            }}
          >
            <ArrowUpRight size={15} strokeWidth={1.5} />
            <span>تحويل</span>
          </button>
        </div>
      </div>

      {/* Balance Cards Carousel - Jaib Style */}
      <div className="relative z-20">
        <div
          ref={containerRef}
          className="relative overflow-hidden"
          style={{ touchAction: 'pan-y', paddingLeft: CARD_SIDE_PADDING, paddingRight: CARD_SIDE_PADDING }}
          dir="ltr"
        >
          <div
            data-carousel-track=""
            className="flex cursor-grab active:cursor-grabbing select-none"
            style={{ gap: CARD_GAP }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={() => { if (isDragging.current) handleTouchEnd(); }}
          >
            {balanceCards.map((card, index) => (
              <div
                key={card.currency}
                className="shrink-0 relative overflow-hidden select-none"
                style={{
                  width: getCardWidth(),
                  height: 210,
                  borderRadius: 20,
                  background: index === activeCardIndex
                    ? `linear-gradient(145deg, ${card.accentColor}DD, ${card.accentColorEnd}CC)`
                    : 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: index === activeCardIndex ? 'blur(30px)' : 'blur(20px)',
                  WebkitBackdropFilter: index === activeCardIndex ? 'blur(30px)' : 'blur(20px)',
                  border: index === activeCardIndex
                    ? `1px solid rgba(${hexToRgb(card.accentColor)}, 0.5)`
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  boxShadow: index === activeCardIndex
                    ? `0 12px 40px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.2)`
                    : '0 4px 16px rgba(0, 0, 0, 0.1)',
                  transform: index === activeCardIndex ? 'scale(1)' : 'scale(0.92)',
                  opacity: index === activeCardIndex ? 1 : 0.5,
                  transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease, box-shadow 0.4s ease, background 0.4s ease, border 0.4s ease',
                }}
                onClick={() => snapToCard(index)}
                dir="rtl"
              >
                {/* Logo Watermark */}
                <img src={LOGO_BASE64} alt="" className="absolute bottom-1 left-1 w-24 h-24 object-contain opacity-[0.03] pointer-events-none select-none" aria-hidden="true" />
                {/* Shimmer */}
                <div className="absolute inset-0 shimmer pointer-events-none" />
                {/* Card SVG Pattern */}
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id={`wallet-grid-${card.currency}`} width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="20" cy="20" r="1" fill={card.patternColor} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#wallet-grid-${card.currency})`} />
                </svg>
                {/* Decorative circles */}
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full" style={{ background: index === activeCardIndex ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }} />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full" style={{ background: index === activeCardIndex ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }} />
                {/* Decorative wave */}
                <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 300 40" preserveAspectRatio="none" style={{ height: '35px' }}>
                  <path d="M0,30 C50,10 100,40 150,25 C200,10 250,35 300,20 L300,40 L0,40 Z" fill={index === activeCardIndex ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'} />
                </svg>
                {/* Animated gradient border glow for active card */}
                {index === activeCardIndex && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: 20,
                      border: `1px solid rgba(${hexToRgb(card.accentColor)}, 0.15)`,
                      boxShadow: `inset 0 0 20px rgba(${hexToRgb(card.accentColor)}, 0.1), 0 0 30px rgba(${hexToRgb(card.accentColor)}, 0.08)`,
                      animation: 'pulse 3s ease-in-out infinite',
                    }}
                  />
                )}

                {/* Card Content - Jaib Style */}
                <div className="relative z-10 h-full flex flex-col justify-between p-5">
                  <div className="flex items-center justify-between">
                    {/* Logo + Brand Name */}
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                        style={{
                          background: 'rgba(255,255,255,0.12)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                      >
                        {/* White logo on colored card background */}
                        <img src={LOGO_BASE64} alt="الجنوب" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col leading-none">
                        <span className="text-white text-sm font-bold tracking-wide">الجنوب</span>
                        <span className="text-white/40 text-[9px] font-medium mt-0.5" dir="ltr">South Wallet</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi size={12} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
                      <button onClick={(e) => { e.stopPropagation(); toggleBalance(); }}>
                        {balanceVisible ? <Eye size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" /> : <EyeOff size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />}
                      </button>
                    </div>
                  </div>

                  {/* Balance + Income/Expense */}
                  <div>
                    <p className="text-white/50 text-[12px] mb-1">رصيدك الآن</p>
                    <AnimatedBalance amount={getBalance(card.currency)} currency={card.currency} visible={balanceVisible} />
                    <div className="flex gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                          <TrendingUp size={11} strokeWidth={2} color="#FFF" />
                        </div>
                        <div>
                          <p className="text-white/35 text-[9px]">وارد</p>
                          <p className="text-white text-xs font-bold">{balanceVisible ? income.toLocaleString('ar-SA') : '****'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                          <TrendingDown size={11} strokeWidth={2} color="#FFF" />
                        </div>
                        <div>
                          <p className="text-white/35 text-[9px]">صادر</p>
                          <p className="text-white text-xs font-bold">{balanceVisible ? expense.toLocaleString('ar-SA') : '****'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom - Chip + Currency + Dots */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-6 rounded-md" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0.15) 100%)', border: '1px solid rgba(255,215,0,0.15)' }} />
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white" style={{ background: currencyBadgeColors[card.currency] }}>{card.currency}</span>
                    </div>
                    <div className="flex items-center gap-1.5" dir="ltr">
                      {[0,1,2,3].map((i) => (
                        <div key={i} className="w-[6px] h-[6px] rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
                      ))}
                      <span className="text-white/35 text-[10px] font-mono mr-1">
                        {user?.userId || '------'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Dots - Tiny Circles */}
          <div className="flex items-center justify-center gap-1.5 mt-4" dir="rtl">
            {balanceCards.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => snapToCard(index)}
                className="rounded-full"
                animate={{
                  width: activeCardIndex === index ? 6 : 4,
                  height: activeCardIndex === index ? 6 : 4,
                  backgroundColor: activeCardIndex === index ? balanceCards[index].accentColor : (isDark ? '#333' : '#D4D4D4'),
                }}
                style={{ borderRadius: '50%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Spending Summary Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 mt-5"
      >
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} strokeWidth={1.5} color="#5C1A1B" />
            <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>ملخص الإنفاق هذا الشهر</h3>
          </div>
          <div className="space-y-3">
            {spendingData.map((cat) => {
              const Icon = cat.icon;
              const percentage = maxSpending > 0 ? (cat.amount / maxSpending) * 100 : 0;
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cat.color}12` }}>
                    <Icon size={14} strokeWidth={1.5} color={cat.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#555' }}>{cat.label}</span>
                      <span className="text-[10px] font-bold" style={{ color: cat.color }}>
                        {formatNumber(cat.amount)} ر.ي
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#2D2D2D' : '#F0F0F0' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                        className="h-full rounded-full"
                        style={{ background: cat.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Search Bar */}
      <div className="px-4 mt-4">
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <Search size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
          <input
            type="text"
            placeholder="ابحث في المعاملات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="px-4 mt-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {filterTabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              whileTap={{ scale: 0.96 }}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeFilter === tab.id ? '#5C1A1B' : (isDark ? '#1A1A1A' : '#F5F5F5'),
                color: activeFilter === tab.id ? '#FFF' : (isDark ? '#AAA' : '#666'),
                boxShadow: activeFilter === tab.id ? '0 2px 8px rgba(92,26,27,0.2)' : 'none',
                border: activeFilter !== tab.id ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` : 'none',
              }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Transaction List - iOS-style grouped card with thin dividers */}
      <div className="px-4 mt-4">
        {filteredTransactions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-8 flex flex-col items-center"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
              <Receipt size={32} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
            </div>
            <p className="text-sm mt-3 font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد معاملات</p>
            <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>المعاملات ستظهر هنا</p>
          </motion.div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto scrollbar-thin"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            {filteredTransactions.map((tx, index) => {
              const isIncoming = tx.toUserId === user?.id;
              const txColor = transactionTypeColors[tx.type] || '#5C1A1B';
              const Icon = getTransactionIcon(tx.type, isIncoming);
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * index }}
                  className="flex items-center gap-3 p-3 px-4 active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => setSelectedTransaction(tx)}
                  style={{
                    borderBottom: index < filteredTransactions.length - 1
                      ? `1px solid ${dividerColor}`
                      : 'none',
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${txColor}10` }}>
                    <Icon size={18} strokeWidth={1.5} color={txColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {tx.description || transactionTypeLabels[tx.type] || 'معاملة'}
                    </p>
                    <p className="text-[11px]" style={{ color: isDark ? '#555' : '#AAA' }}>
                      {timeAgo(tx.createdAt)}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold" style={{ color: isIncoming ? '#10B981' : '#5C1A1B' }}>
                      {isIncoming ? '+' : '-'}{tx.amount.toLocaleString()}
                    </p>
                    <div className="flex justify-end mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: currencyBadgeColors[tx.currency] || '#666' }}>
                        {tx.currency}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Summary */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="px-4 mt-5"
      >
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownUp size={14} strokeWidth={1.5} color="#5C1A1B" />
            <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>ملخص الشهر</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-1" style={{ background: 'rgba(16,185,129,0.08)' }}>
                <TrendingUp size={16} strokeWidth={1.5} color="#10B981" />
              </div>
              <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>إجمالي الوارد</p>
              <p className="text-sm font-bold" style={{ color: '#10B981' }}>{formatNumber(monthlyIncome)}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-1" style={{ background: 'rgba(92,26,27,0.08)' }}>
                <TrendingDown size={16} strokeWidth={1.5} color="#5C1A1B" />
              </div>
              <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>إجمالي الصادر</p>
              <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{formatNumber(monthlyExpense)}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-1" style={{ background: `${netThisMonth >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(92,26,27,0.08)'}` }}>
                <Wallet size={16} strokeWidth={1.5} color={netThisMonth >= 0 ? '#10B981' : '#5C1A1B'} />
              </div>
              <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>صافي الشهر</p>
              <p className="text-sm font-bold" style={{ color: netThisMonth >= 0 ? '#10B981' : '#5C1A1B' }}>
                {netThisMonth >= 0 ? '+' : ''}{formatNumber(netThisMonth)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Transaction Detail Overlay */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setSelectedTransaction(null)}
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg rounded-t-3xl p-6 pb-8"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: isDark ? '#1A1A1A' : '#FFFFFF',
                maxHeight: '70vh',
                overflowY: 'auto',
              }}
            >
              {/* Handle bar */}
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: isDark ? '#333' : '#DDD' }} />
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تفاصيل المعاملة</h3>
                <button onClick={() => setSelectedTransaction(null)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                  <span className="text-lg" style={{ color: isDark ? '#888' : '#666' }}>✕</span>
                </button>
              </div>

              {/* Amount */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: `${transactionTypeColors[selectedTransaction.type] || '#5C1A1B'}15` }}>
                  {selectedTransaction.toUserId === user?.id ? (
                    <ArrowDownLeft size={28} strokeWidth={1.5} color="#10B981" />
                  ) : (
                    <ArrowUpRight size={28} strokeWidth={1.5} color="#5C1A1B" />
                  )}
                </div>
                <p className="text-2xl font-bold" style={{ color: selectedTransaction.toUserId === user?.id ? '#10B981' : '#5C1A1B' }}>
                  {selectedTransaction.toUserId === user?.id ? '+' : '-'}{selectedTransaction.amount.toLocaleString()} {currencySymbols[selectedTransaction.currency]}
                </p>
                <span className="inline-block text-[10px] px-2 py-0.5 rounded font-bold text-white mt-2" style={{ background: currencyBadgeColors[selectedTransaction.currency] }}>
                  {selectedTransaction.currency}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${dividerColor}` }}>
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>النوع</span>
                  <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {transactionTypeLabels[selectedTransaction.type] || 'معاملة'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${dividerColor}` }}>
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>الحالة</span>
                  <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ 
                    background: selectedTransaction.status === 'completed' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                    color: selectedTransaction.status === 'completed' ? '#10B981' : '#F59E0B',
                  }}>
                    {selectedTransaction.status === 'completed' ? 'مكتمل' : selectedTransaction.status === 'pending' ? 'قيد الانتظار' : 'فشل'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${dividerColor}` }}>
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>التاريخ</span>
                  <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {new Date(selectedTransaction.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${dividerColor}` }}>
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>رقم المرجع</span>
                  <span className="text-xs font-mono" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {selectedTransaction.id?.slice(0, 12) || '—'}
                  </span>
                </div>
                {selectedTransaction.description && (
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${dividerColor}` }}>
                    <span className="text-xs" style={{ color: isDark ? '#888' : '#999' }}>الوصف</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {selectedTransaction.description}
                    </span>
                  </div>
                )}
                {/* Direct Chat button for transfers */}
                {selectedTransaction.type === 'transfer' && (
                  <div className="pt-4">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedTransaction(null);
                        setActiveScreen('direct-chat');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-semibold"
                      style={{ background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)' }}
                    >
                      <MessageCircle size={16} />
                      محادثة مع {selectedTransaction.toUserId === user?.id ? 'المرسل' : 'المستلم'}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
