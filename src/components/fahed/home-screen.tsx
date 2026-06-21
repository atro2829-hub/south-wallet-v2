'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Headphones,
  Eye,
  EyeOff,
  Send,
  Download,
  QrCode,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Wifi,
  Heart,
  Plus,
  ChevronLeft,
  RefreshCw,
  Sparkles,
  Clock,
  Zap,
  CreditCard,
  Smartphone,
  Gamepad2,
  ShoppingBag,
  ShieldAlert,
  Wallet,
  ArrowRightLeft,
  Phone,
  Globe,
  Receipt,
  FileText,
  ChevronRight,
  Gift,
  ScanLine,
  X,
  LayoutGrid,
  Zap as RechargeIcon,
  Coins,
  Shield,
  Star,
  ShieldCheck,
  TrendingUp,
  Landmark,
  CircleDollarSign,
  Link2,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatBalance, formatNumber, currencySymbols, currencyNames, currencyBadgeColors, timeAgo, transactionTypeLabels, transactionTypeColors } from '@/lib/utils';
import { LOGO_BASE64, RED_LOGO_FILTER } from '@/lib/logo';
import { serviceIcons } from '@/lib/service-icons';
import { productIcons } from '@/lib/product-icons';
import { supabase } from '@/lib/supabase';
import { getCategories, type DynamicCategory } from '@/lib/categories';
import { useAdminSettings } from '@/lib/use-admin-settings';
import { useSupabaseSync } from '@/lib/use-supabase-sync';
import { appIcons } from '@/lib/app-icons';
import { STATIC_SECTIONS, type StaticSection } from '@/lib/static-sections';
import {
  onForegroundNotification,
  handleNotificationTap,
  type ParsedNavigationTarget,
  type DeepLinkNotification,
} from '@/lib/notification-handler';

// Visibility settings interface
interface VisibilitySettings {
  sections: Record<string, boolean>;
  providers: Record<string, boolean>;
  features: Record<string, boolean>;
}

interface BalanceCard {
  currency: 'YER' | 'SAR' | 'USD';
  accentColor: string;
  accentColorEnd: string;
  glowColor: string;
  patternColor: string;
}

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
  url?: string;
  link?: string;
  position?: string;
}

/**
 * Fetch the active banners for a specific screen position.
 * The admin can pick 'home' | 'services' | 'wallet' | 'login' | 'all'.
 * 'all' banners are returned for every position so the admin can show a
 * sitewide campaign from a single setting.
 */
export async function fetchBannersForPosition(position: 'home' | 'services' | 'wallet' | 'login'): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error(`[banners] fetch error for position=${position}:`, error);
    return [];
  }
  const now = new Date();
  return (data || [])
    .filter((b: any) => {
      // Honor start/end date if set
      const start = b.start_date ? new Date(b.start_date) : null;
      const end = b.end_date ? new Date(b.end_date) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      // Position match: 'all' shows everywhere
      return b.position === 'all' || b.position === position;
    })
    .map((b: any) => ({
      id: b.id,
      title: b.title || '',
      description: b.description || '',
      imageUrl: b.image_url || '',
      isActive: b.is_active ?? true,
      order: b.sort_order ?? 0,
      link: b.link_target || b.link || undefined,
      position: b.position,
    }));
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '255,255,255';
}

// Map of lucide icon name strings to their components for dynamic rendering
const lucideIconMap: Record<string, LucideIcon> = {
  Bell, Headphones, Eye, EyeOff, Send, Download, QrCode, HandCoins,
  ArrowUpRight, ArrowDownLeft, Wifi, Heart, Plus, ChevronLeft, RefreshCw,
  Sparkles, Clock, Zap, CreditCard, Smartphone, Gamepad2, ShoppingBag,
  ShieldAlert, Wallet, ArrowRightLeft, Phone, Globe, Receipt, FileText,
  ChevronRight, Gift, ScanLine, X, LayoutGrid,
  Coins, Shield, Star, ShieldCheck, TrendingUp, Landmark, CircleDollarSign, Link2,
  // Aliases for common section type icons
  'zap-recharge': Zap,
  'arrow-transfer': ArrowRightLeft,
  'gamepad-games': Gamepad2,
  'wallet-wallet': Wallet,
  'phone-telecom': Phone,
  'globe-internet': Globe,
  'shield-escrow': ShieldCheck,
  'trending-invest': TrendingUp,
  'receipt-bills': Receipt,
  'credit-exchange': CircleDollarSign,
  'link-external': Link2,
};

// Dynamic lucide icon renderer component
// Falls back to custom SVG from service-icons if Lucide icon not found
function LucideIconRenderer({ iconName, color, size = 22 }: { iconName: string; color: string; size?: number }) {
  const IconComponent = lucideIconMap[iconName];
  if (IconComponent) {
    return <IconComponent size={size} strokeWidth={2} color={color} />;
  }
  // Fallback: try service-icons SVG
  const svgIcon = serviceIcons[iconName] || serviceIcons['default'];
  if (svgIcon) {
    return <img src={svgIcon} alt={iconName} className="w-full h-full object-contain" />;
  }
  // Last resort: colored square
  return <div className="w-6 h-6 rounded-lg" style={{ background: color }} />;
}

// Quick action buttons for the home screen
const quickActions = [
  { id: 'send', label: 'إرسال', icon: Send, color: '#5C1A1B', gradient: 'linear-gradient(135deg, #5C1A1B, #3D0F10)' },
  { id: 'receive', label: 'استقبال', icon: Download, color: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)' },
  { id: 'qr-scan', label: 'مسح QR', icon: QrCode, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
  { id: 'deposit', label: 'إيداع', icon: HandCoins, color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)' },
];

// STATIC_SECTIONS and StaticSection are imported from @/lib/static-sections
// Keep utilityServices for backward compat with code that references it
const utilityServices = STATIC_SECTIONS.filter(s => s.isUtility);

// NOTE: Static promo items removed — banners are now fully dynamic from the
// Supabase banners table (managed by admin). No hardcoded promos in the UI.

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

// Countdown timer component
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance < 0) { clearInterval(timer); return; }
      setTimeLeft({
        hours: Math.floor(distance / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-1.5 mt-2" dir="ltr">
      {[
        { val: timeLeft.hours, label: 'س' },
        { val: timeLeft.minutes, label: 'د' },
        { val: timeLeft.seconds, label: 'ث' },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <span className="text-white text-xs font-bold">{String(item.val).padStart(2, '0')}</span>
          </div>
          <span className="text-white/30 text-[9px]">{item.label}</span>
          {i < 2 && <span className="text-white/20 mx-0.5">:</span>}
        </div>
      ))}
    </div>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    user,
    balanceVisible,
    toggleBalance,
    setActiveScreen,
    notifications,
    setTransferOpen,
    setRequestMoneyOpen,
    setDrawerOpen,
    transactions,
    providers,
    categories,
    fbSections,
    favorites,
    toggleFavorite,
    recentServices,
    setSelectedProvider,
    setOrderOpen,
    savingsGoals,
    cardColors,
    featureFlags,
    fbVisibility,
  } = useAppStore();

  const { refreshAll } = useAdminSettings();
  const { refreshUser } = useSupabaseSync();

  // Derive balance cards from Firebase card colors in the store.
  // Defensive: fall back to defaults if any currency entry is missing — this prevents
  // "Cannot read properties of undefined (reading 'primary')" if the backend ever
  // returns a partial / empty cardColors payload.
  const DEFAULT_CARD_COLORS = {
    YER: { primary: '#5C1A1B', gradient: '#3D0F10' },
    SAR: { primary: '#7D2D30', gradient: '#5C1A1B' },
    USD: { primary: '#8B3A3D', gradient: '#6B2A2D' },
  } as const;
  const safeCardColors = {
    YER: { ...DEFAULT_CARD_COLORS.YER, ...(cardColors?.YER || {}) },
    SAR: { ...DEFAULT_CARD_COLORS.SAR, ...(cardColors?.SAR || {}) },
    USD: { ...DEFAULT_CARD_COLORS.USD, ...(cardColors?.USD || {}) },
  };
  const balanceCards: BalanceCard[] = [
    { currency: 'YER', accentColor: safeCardColors.YER.primary, accentColorEnd: safeCardColors.YER.gradient, glowColor: `rgba(${hexToRgb(safeCardColors.YER.primary)},0.35)`, patternColor: 'rgba(255,255,255,0.06)' },
    { currency: 'SAR', accentColor: safeCardColors.SAR.primary, accentColorEnd: safeCardColors.SAR.gradient, glowColor: `rgba(${hexToRgb(safeCardColors.SAR.primary)},0.35)`, patternColor: 'rgba(255,255,255,0.06)' },
    { currency: 'USD', accentColor: safeCardColors.USD.primary, accentColorEnd: safeCardColors.USD.gradient, glowColor: `rgba(${hexToRgb(safeCardColors.USD.primary)},0.35)`, patternColor: 'rgba(255,255,255,0.06)' },
  ];

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshAll(), refreshUser()]);
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(375);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);

  // ── Foreground notification deep-link banner ──
  const [notifBanner, setNotifBanner] = useState<{
    parsed: ParsedNavigationTarget;
    notification: DeepLinkNotification;
  } | null>(null);
  const notifBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to foreground notification events
  useEffect(() => {
    const unsubscribe = onForegroundNotification((parsed, notification) => {
      // Clear any existing timer
      if (notifBannerTimerRef.current) {
        clearTimeout(notifBannerTimerRef.current);
      }
      setNotifBanner({ parsed, notification });
      // Auto-dismiss after 6 seconds
      notifBannerTimerRef.current = setTimeout(() => {
        setNotifBanner(null);
      }, 6000);
    });
    return () => {
      unsubscribe();
      if (notifBannerTimerRef.current) {
        clearTimeout(notifBannerTimerRef.current);
      }
    };
  }, []);

  const dismissNotifBanner = useCallback(() => {
    setNotifBanner(null);
    if (notifBannerTimerRef.current) {
      clearTimeout(notifBannerTimerRef.current);
    }
  }, []);

  const handleNotifBannerTap = useCallback(() => {
    if (!notifBanner) return;
    const { notification } = notifBanner;
    dismissNotifBanner();
    handleNotificationTap(notification);
  }, [notifBanner, dismissNotifBanner]);

  // Touch/drag tracking
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentTranslate = useRef(0);
  const prevTranslate = useRef(0);

  // Hidden admin access - tap greeting 5 times within 3 seconds
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGreetingTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setActiveScreen('admin');
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 3000);
  };

  // Supabase banners listener
  useEffect(() => {
    const fetchBanners = async () => {
      const bannersList = await fetchBannersForPosition('home');
      setBanners(bannersList);
      setBannerIndex(0);
    };

    fetchBanners();

    // Subscribe to realtime changes with unique channel name per component instance
    const channelName = `banners-changes-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        fetchBanners();
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  // Use fbVisibility from store instead of local Firebase listener
  const visibilitySettings: VisibilitySettings = useMemo(() => ({
    sections: fbVisibility.sections || {},
    providers: fbVisibility.providers || {},
    features: fbVisibility.features || {},
  }), [fbVisibility]);

  // Banner auto-rotation
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // NOTE: Static promo rotation removed — no more hardcoded promos.
  // Banners are 100% dynamic from the Supabase banners table.

  const CARD_GAP = 12;
  const CARD_SIDE_PADDING = 32;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getCardWidth = useCallback(() => {
    return containerWidth * 0.78;
  }, [containerWidth]);

  const getStepWidth = useCallback(() => {
    return getCardWidth() + CARD_GAP;
  }, [getCardWidth]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    return 'مساء الخير';
  };

  const getBalance = (currency: string): number => {
    if (!user) return 0;
    const field = `balance${currency}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;
  const recentTx = transactions.slice(0, 5);

  const flashDealEnd = useRef(new Date(Date.now() + 6 * 60 * 60 * 1000));

  // Snap to card
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
      if (track) {
        track.style.transition = 'none';
      }
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

  const handleQuickAction = (actionId: string) => {
    const isVerified = user?.kycStatus === 'verified';
    switch (actionId) {
      case 'send':
        if (!isVerified) {
          useAppStore.getState().addNotification({
            id: Date.now().toString(),
            title: 'يرجى توثيق حسابك أولاً',
            body: 'لا يمكنك التحويل إلا بعد توثيق حسابك',
            type: 'security',
            isRead: false,
            createdAt: new Date().toISOString(),
          });
          setActiveScreen('kyc');
          return;
        }
        setTransferOpen(true);
        break;
      case 'receive':
        useAppStore.getState().setQrInitialTab('generate');
        setActiveScreen('qr');
        break;
      case 'qr-scan':
        useAppStore.getState().setQrInitialTab('scan');
        setActiveScreen('qr');
        break;
      case 'deposit':
        setActiveScreen('deposit');
        break;
    }
  };

  const handleServiceClick = (serviceId: string, screenType?: string) => {
    const isVerified = user?.kycStatus === 'verified';

    // Block certain actions for unverified users
    const blockedScreenTypes = ['exchange', 'escrow'];
    const blockedServiceIds = ['transfer'];
    if ((blockedScreenTypes.includes(screenType || '') || blockedServiceIds.includes(serviceId)) && !isVerified) {
      useAppStore.getState().addNotification({
        id: Date.now().toString(),
        title: 'يرجى توثيق حسابك أولاً',
        body: 'لا يمكنك استخدام هذه الخدمة إلا بعد توثيق حسابك',
        type: 'security',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      setActiveScreen('kyc');
      return;
    }

    // First check fixed utility services
    if (serviceId === 'transfer') {
      setTransferOpen(true);
      return;
    }
    if (serviceId === 'recharge') {
      setActiveScreen('recharge');
      return;
    }

    // Route based on screenType
    const effectiveScreenType = screenType || 'manual';
    switch (effectiveScreenType) {
      case 'wallet-transfer':
        setTransferOpen(true);
        break;
      case 'deposit':
        setActiveScreen('deposit');
        break;
      case 'support':
        setActiveScreen('support');
        break;
      case 'exchange':
        setActiveScreen('exchange');
        break;
      case 'escrow':
        setActiveScreen('escrow');
        break;
      case 'investment':
        useAppStore.getState().setActiveScreen('investment');
        break;
      case 'usdt':
        setActiveScreen('deposit');
        break;
      case 'games':
      case 'api-games':
        useAppStore.getState().setActiveScreen('games');
        break;
      case 'gift-cards':
        useAppStore.getState().setActiveScreen('gift-cards');
        break;
      case 'favorites':
        useAppStore.getState().setActiveScreen('favorites');
        break;
      case 'api-products':
      case 'telecom':
      case 'manual':
      case 'link':
        useAppStore.getState().setSelectedCategory(serviceId);
        useAppStore.getState().setActiveScreen('category-detail');
        break;
      default:
        // Unknown screenType → navigate to category-detail as fallback
        useAppStore.getState().setSelectedCategory(serviceId);
        useAppStore.getState().setActiveScreen('category-detail');
        break;
    }
  };

  const handleBannerClick = (banner: Banner) => {
    if (banner.url) {
      window.open(banner.url, '_blank', 'noopener,noreferrer');
    } else if (banner.link) {
      window.open(banner.link, '_blank', 'noopener,noreferrer');
    }
  };

  const dividerColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';

  // ─── Build dynamic services from Supabase categories ─────────────────
  interface DynamicService {
    id: string;
    label: string;
    iconKey: string;
    color?: string;
    screenType?: string;
    icon?: string; // lucide icon name, emoji, or image URL
    iconType?: 'lucide' | 'emoji' | 'image';
    firebaseIcon?: string; // base64 icon from fbSections
  }

  // NOTE: Categories realtime is already handled by useSupabaseSync hook
  // No need for a separate subscribeToCategories here - it would create a duplicate channel

  // Helper to determine icon type from an icon string
  const getIconType = (icon: string): 'lucide' | 'emoji' | 'image' => {
    if (!icon) return 'lucide';
    if (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:')) return 'image';
    // Check if it's a known Lucide icon name (from our map)
    if (lucideIconMap[icon]) return 'lucide';
    // Check if it matches a service icon key (custom SVG)
    if (serviceIcons[icon]) return 'image';
    // Common lucide icon names that might not be in the map
    const lucideNames = [
      'Gamepad2', 'Gift', 'Wallet', 'Coins', 'ArrowLeftRight', 'Phone', 'ShoppingBag',
      'Zap', 'Globe', 'CreditCard', 'Smartphone', 'Shield', 'ShieldAlert', 'Star',
      'Heart', 'RefreshCw', 'Sparkles', 'Clock', 'Receipt', 'FileText', 'Send',
      'Download', 'ArrowRightLeft', 'Bell', 'Eye', 'EyeOff', 'Plus', 'ChevronLeft',
      'ChevronRight', 'QrCode', 'ScanLine', 'X', 'Wifi', 'Headphones', 'HandCoins',
      'ArrowUpRight', 'ArrowDownLeft', 'ShieldCheck', 'TrendingUp', 'Landmark',
      'CircleDollarSign', 'Link2', 'LayoutGrid',
    ];
    if (lucideNames.includes(icon)) return 'lucide';
    // Check if it's an emoji (contains unicode emoji characters)
    const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
    if (emojiRegex.test(icon)) return 'emoji';
    // Default to lucide for any other string (will show fallback icon)
    return 'lucide';
  };

  // Map section type to screenType for routing
  const mapSectionTypeToScreenType = (type: string): string => {
    const mapping: Record<string, string> = {
      'api': 'api-products',
      'manual': 'manual',
      'wallet': 'usdt',
      'exchange': 'exchange',
      'telecom': 'telecom',
      'games': 'api-games',
      'investment': 'investment',
      'escrow': 'escrow',
    };
    return mapping[type] || 'manual';
  };

  // ====================================================================
  // BUILD SERVICES FROM STATIC SECTIONS — NOT from database.
  // Uses custom app-icons (flat design, maroon + accent red).
  // ====================================================================
  const dynamicServices = useMemo(() => {
    return STATIC_SECTIONS.map(s => ({
      id: s.id,
      label: s.label,
      iconKey: s.iconKey,
      // Force maroon for ALL icons — unified visual identity
      color: '#5C1A1B',
      screenType: s.screenType,
      iconType: 'image' as const,
      // Use the custom app icon as firebaseIcon (renders as <img>)
      firebaseIcon: appIcons[s.iconKey] || appIcons.recharge,
    }));
  }, []);

  return (
    <div className="pb-4">
      {/* ========================================
          HEADER - Jaib Style
          Right: Greeting + Name
          Left: Notifications bell + Support
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="px-4 pt-4 pb-2"
      >
        <div className="flex items-center justify-between" style={{ height: 56 }}>
          {/* Right side - Logo + Greeting */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.06)', boxShadow: '0 2px 8px rgba(92,26,27,0.15)' }}
            >
              <img src={LOGO_BASE64} alt="الجنوب" className="w-full h-full object-cover" style={{ filter: RED_LOGO_FILTER }} />
            </div>
            <button onClick={handleGreetingTap} className="active:scale-95 transition-transform">
              <h1 className="text-base font-bold" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>
                {getGreeting()}، {user?.name || 'مستخدم'}
              </h1>
              <p className="text-[11px]" style={{ color: isDark ? '#666' : '#999' }}>محفظة الجنوب</p>
            </button>
          </div>

          {/* Left side - Gift Code + Notifications + Support */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScreen('promo')}
              className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: 'rgba(92,26,27,0.08)' }}
              title="كود هدية"
            >
              <Gift size={20} strokeWidth={1.5} color="#5C1A1B" />
            </button>
            <button
              onClick={() => setActiveScreen('notifications')}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <Bell size={20} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
              {unreadNotifCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
                  style={{ background: '#5C1A1B' }}
                >
                  {unreadNotifCount}
                </span>
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              title="تحديث"
            >
              <RefreshCw size={20} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setActiveScreen('support')}
              className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <Headphones size={20} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Foreground Notification Deep-Link Banner ── */}
      <AnimatePresence>
        {notifBanner && (
          <motion.div
            key="notif-deeplink-banner"
            initial={{ opacity: 0, y: -30, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -30, height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="px-4 overflow-hidden"
          >
            <div
              onClick={handleNotifBannerTap}
              className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, #1A1A1A, #222)'
                  : 'linear-gradient(135deg, #FFFFFF, #F9F9F9)',
                border: `1px solid ${isDark ? 'rgba(92,26,27,0.3)' : 'rgba(92,26,27,0.15)'}`,
                boxShadow: isDark
                  ? '0 4px 16px rgba(92,26,27,0.2)'
                  : '0 4px 16px rgba(92,26,27,0.08)',
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(92,26,27,0.12)' }}
              >
                <Bell size={18} strokeWidth={1.5} color="#5C1A1B" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-[12px] font-bold truncate"
                  style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                >
                  {notifBanner.notification.title}
                </p>
                <p
                  className="text-[10px] truncate mt-0.5"
                  style={{ color: isDark ? '#999' : '#666' }}
                >
                  {notifBanner.notification.body}
                </p>
                {/* Deep-link target label */}
                {notifBanner.parsed.type !== 'unknown' && (
                  <div
                    className="flex items-center gap-1 mt-1 w-fit"
                    style={{ background: 'rgba(92,26,27,0.08)', borderRadius: 6, padding: '2px 6px' }}
                  >
                    <ArrowUpRight size={8} strokeWidth={2} color="#5C1A1B" />
                    <span className="text-[8px] font-medium" style={{ color: '#5C1A1B' }}>
                      {notifBanner.parsed.type === 'url' ? 'رابط خارجي' :
                        notifBanner.parsed.type === 'transaction' ? 'المعاملة' :
                        notifBanner.parsed.type === 'deposit' ? 'الإيداع' :
                        notifBanner.parsed.type === 'withdraw' ? 'السحب' :
                        notifBanner.parsed.type === 'order' ? 'الطلب' :
                        notifBanner.parsed.type === 'kyc' ? 'التوثيق' :
                        notifBanner.parsed.type === 'exchange' ? 'التحويل' :
                        notifBanner.parsed.type === 'services' ? 'الخدمات' :
                        notifBanner.parsed.type === 'promo' ? 'العروض' :
                        notifBanner.parsed.type === 'support' ? 'الدعم' :
                        notifBanner.parsed.type === 'profile' ? 'الحساب' :
                        notifBanner.parsed.type}
                    </span>
                  </div>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissNotifBanner();
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              >
                <X size={14} strokeWidth={1.5} color={isDark ? '#888' : '#AAA'} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          BALANCE CARD CAROUSEL - Jaib Style
          Red card with "رصيدك" text + eye toggle
          ======================================== */}
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
                  height: index === activeCardIndex ? 195 : 190,
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
                  transition: 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease, box-shadow 0.4s ease, background 0.4s ease, border 0.4s ease, height 0.3s ease',
                }}
                onClick={() => snapToCard(index)}
                dir="rtl"
              >
                {/* Logo Watermark */}
                <img src={LOGO_BASE64} alt="" className="absolute bottom-1 left-1 w-24 h-24 object-contain opacity-[0.03] pointer-events-none select-none" aria-hidden="true" />
                <div className="absolute inset-0 shimmer pointer-events-none" />
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id={`grid-${card.currency}`} width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="20" cy="20" r="1" fill={card.patternColor} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#grid-${card.currency})`} />
                </svg>
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full" style={{ background: index === activeCardIndex ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }} />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full" style={{ background: index === activeCardIndex ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }} />
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

                {/* Card Content - Jaib Style: Logo + Branding + Balance */}
                <div className="relative z-10 h-full flex flex-col justify-between p-6">
                  {/* Top Row - Logo + Brand Name (right) | Eye toggle (left) */}
                  <div className="flex items-center justify-between">
                    {/* Logo + Brand Name - Jaib style */}
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
                    {/* Eye toggle + Wifi */}
                    <div className="flex items-center gap-2">
                      <Wifi size={12} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
                      <button onClick={(e) => { e.stopPropagation(); toggleBalance(); }}>
                        {balanceVisible ? (
                          <Eye size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                        ) : (
                          <EyeOff size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Balance Section - Jaib style: "رصيدك الآن" label */}
                  <div className="flex flex-col items-start">
                    <p className="text-white/50 text-[12px] mb-1">رصيدك الآن</p>
                    <AnimatedBalance amount={getBalance(card.currency)} currency={card.currency} visible={balanceVisible} />
                  </div>

                  {/* Bottom Row - Currency badge + User ID */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-6 rounded-md" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0.15) 100%)', border: '1px solid rgba(255,215,0,0.15)' }} />
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white" style={{ background: currencyBadgeColors[card.currency] }}>
                        {card.currency}
                      </span>
                    </div>
                    {/* Card number dots - Jaib style */}
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
              <div
                key={index}
                className="rounded-full transition-all duration-300 cursor-pointer"
                onClick={() => snapToCard(index)}
                style={{
                  width: activeCardIndex === index ? '6px' : '4px',
                  height: activeCardIndex === index ? '6px' : '4px',
                  borderRadius: '50%',
                  background: activeCardIndex === index ? balanceCards[index].accentColor : (isDark ? '#333' : '#D4D4D4'),
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ========================================
          QUICK ACTIONS - Circular Buttons
          Send, Receive, QR Scan, Deposit
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="px-4 mt-4"
      >
        <div className="flex items-center justify-around">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleQuickAction(action.id)}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: action.gradient,
                  boxShadow: `0 4px 16px ${action.color}40`,
                }}
              >
                <action.icon size={22} color="#FFF" strokeWidth={1.8} />
              </div>
              <span
                className="text-[11px] font-medium"
                style={{ color: isDark ? '#CCC' : '#444' }}
              >
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ========================================
          BANNER CAROUSEL / PROMO BANNER
          Dynamic banners from Firebase, fallback to static promo
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="px-4 mt-4"
      >
        {banners.length > 0 ? (
          /* Dynamic Banner Carousel from Firebase */
          <div
            className="rounded-2xl relative overflow-hidden cursor-pointer"
            style={{
              height: 110,
              borderRadius: 16,
              boxShadow: '0 4px 16px rgba(92,26,27,0.2)',
            }}
            onClick={() => handleBannerClick(banners[bannerIndex])}
          >
            {/* Banner Image Background */}
            {banners[bannerIndex]?.imageUrl && (
              <img
                src={banners[bannerIndex].imageUrl}
                alt={banners[bannerIndex].title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* Overlay gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: banners[bannerIndex]?.imageUrl
                  ? 'linear-gradient(145deg, rgba(92,26,27,0.85) 0%, rgba(61,15,16,0.75) 60%, rgba(49,27,146,0.65) 100%)'
                  : 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 60%, #2D0A0A 100%)',
              }}
            />
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <img src={LOGO_BASE64} alt="" className="absolute left-2 bottom-1 w-20 h-20 object-contain opacity-[0.06] pointer-events-none" aria-hidden="true" />

            <div className="relative z-10 h-full flex items-center px-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF' }}>
                    <Sparkles size={8} />
                    عرض خاص
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={bannerIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="font-bold text-[13px] text-white leading-tight">{banners[bannerIndex]?.title}</h3>
                    <p className="text-[11px] mt-0.5 text-white/50">{banners[bannerIndex]?.description}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Banner Dot Indicators */}
            {banners.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setBannerIndex(i); }}
                    className="rounded-full transition-all duration-300"
                    style={{ width: i === bannerIndex ? '6px' : '4px', height: i === bannerIndex ? '6px' : '4px', borderRadius: '50%', background: i === bannerIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* No banners — show nothing instead of hardcoded promos */
          <div className="hidden" />
        )}
      </motion.div>

      {/* ========================================
          SERVICES GRID - Jaib Style (3x3)
          Red + Blue icon colors matching Jaib
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="px-4 mt-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>الخدمات</h3>
          <button
            onClick={() => useAppStore.getState().setActiveTab('services')}
            className="text-xs font-medium flex items-center gap-0.5"
            style={{ color: '#5C1A1B' }}
          >
            المزيد
            <ChevronLeft size={14} strokeWidth={1.5} />
          </button>
        </div>

        {dynamicServices.length === 0 ? (
          /* Empty state when no categories exist */
          <div
            className="rounded-2xl p-8 flex flex-col items-center"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
              <LayoutGrid size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
            </div>
            <p className="text-sm mt-3 font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد خدمات بعد</p>
            <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>سيتم عرض الخدمات هنا عند إضافتها</p>
          </div>
        ) : (
        <div className="grid grid-cols-3 gap-3">
          {dynamicServices.filter(service => {
            // Hide if visibility settings hide it
            if (visibilitySettings.sections[service.id] === false) return false;
            // Hide if feature flag disables it
            if (service.id === 'transfer' && !featureFlags.transfersEnabled) return false;
            if (service.id === 'recharge' && !featureFlags.rechargeEnabled) return false;
            if (service.id === 'crypto' && !featureFlags.cryptoEnabled) return false;
            if (service.id === 'crypto-invest' && !featureFlags.investmentEnabled) return false;
            if (service.id === 'currency-exchange' && !featureFlags.exchangeEnabled) return false;
            if (service.id === 'electricity' && !featureFlags.billsEnabled) return false;
            return true;
          }).map((service, index) => {
            // Icon resolution priority: firebaseIcon → lucide icon → custom SVG → fallback icon maps → colored square
            // NO emoji rendering - all icons use Lucide or custom SVGs with app theme colors
            const fallbackIconSrc = productIcons[service.iconKey] || serviceIcons[service.iconKey];
            // FIX: force maroon (#5C1A1B) for all section icons to unify
            // the visual identity with the app's brand color, regardless of
            // any custom color the admin set on the section row.
            const sectionColor = '#5C1A1B';
            const iconBgColor = sectionColor + '15'; // soft maroon background
            // Determine icon to render
            const hasFirebaseIcon = !!service.firebaseIcon;
            const iconIsLucide = service.iconType === 'lucide' && service.icon;
            const iconIsEmoji = service.iconType === 'emoji' && service.icon;
            const iconIsImage = service.iconType === 'image' && service.icon && !hasFirebaseIcon;
            // For emoji icons, we convert them to Lucide or custom SVG instead of showing emoji
            const shouldUseLucide = iconIsLucide || iconIsEmoji;
            const shouldUseCustomSvg = iconIsEmoji && !lucideIconMap[service.icon || ''];
            const hasAnyIcon = hasFirebaseIcon || iconIsLucide || iconIsImage || !!fallbackIconSrc;

            return (
              <motion.button
                key={service.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index }}
                onClick={() => handleServiceClick(service.id, service.screenType)}
                whileTap={{ scale: 0.96 }}
                className="flex flex-col items-center justify-center gap-2.5 py-4 px-3"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  borderRadius: 16,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                  boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
              >
                <div
                  className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{
                    // Jaib-style: white rounded square container for ALL icons
                    background: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    boxShadow: isDark ? 'none' : '0 2px 8px rgba(92,26,27,0.08)',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(92,26,27,0.06)',
                  }}
                >
                  {hasFirebaseIcon ? (
                    <img src={service.firebaseIcon} alt={service.label} className="w-8 h-8 object-contain" />
                  ) : iconIsImage ? (
                    <img src={service.icon} alt={service.label} className="w-8 h-8 object-contain" />
                  ) : shouldUseLucide && !shouldUseCustomSvg ? (
                    <LucideIconRenderer iconName={service.icon!} color={sectionColor} />
                  ) : shouldUseCustomSvg ? (
                    <LucideIconRenderer iconName={service.iconKey || 'default'} color={sectionColor} />
                  ) : fallbackIconSrc ? (
                    <img src={fallbackIconSrc} alt={service.label} className="w-8 h-8 object-contain" />
                  ) : (
                    <LayoutGrid size={22} strokeWidth={2} color={sectionColor} />
                  )}
                </div>
                <span
                  className="text-[11px] font-medium text-center leading-tight max-w-[85px]"
                  style={{
                    color: isDark ? '#CCC' : '#444',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {service.label}
                </span>
              </motion.button>
            );
          })}
        </div>
        )}
      </motion.div>

      {/* ========================================
          RECENT TRANSACTIONS - iOS Style Grouped
          Single white card with thin 1px dividers
          ======================================== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="px-4 mt-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFFFFF' : '#1a1a1a' }}>العمليات</h3>
          <button
            onClick={() => useAppStore.getState().setActiveTab('wallet')}
            className="text-xs font-medium flex items-center gap-0.5"
            style={{ color: '#5C1A1B' }}
          >
            عرض الكل
            <ChevronLeft size={14} strokeWidth={1.5} />
          </button>
        </div>

        {recentTx.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
              <Send size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
            </div>
            <p className="text-sm mt-3 font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد معاملات بعد</p>
            <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>أول تحويل سيظهر هنا</p>
          </div>
        ) : (
          /* iOS-style grouped card with thin dividers */
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            {recentTx.map((tx, index) => {
              const isIncoming = tx.toUserId === user?.id;
              const txColor = transactionTypeColors[tx.type] || '#5C1A1B';
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * index }}
                  className="flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-transform"
                  style={{
                    borderBottom: index < recentTx.length - 1
                      ? `1px solid ${dividerColor}`
                      : 'none',
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${txColor}10` }}>
                    {isIncoming ? (
                      <ArrowDownLeft size={18} strokeWidth={1.5} color="#10B981" />
                    ) : (
                      <ArrowUpRight size={18} strokeWidth={1.5} color="#5C1A1B" />
                    )}
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
      </motion.div>

      {/* ========================================
          FLOATING ACTION BUTTON (FAB)
          Quick actions: Transfer, Scan QR, Recharge
          ======================================== */}
      <div className="fixed bottom-20 left-4 z-50" style={{ direction: 'ltr' }}>
        <AnimatePresence>
          {fabOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.3)' }}
                onClick={() => setFabOpen(false)}
              />

              {/* Quick Transfer */}
              <motion.button
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={() => { setFabOpen(false); setTransferOpen(true); }}
                className="absolute bottom-24 left-0 flex items-center gap-2 z-50"
              >
                <span
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap"
                  style={{
                    background: isDark ? '#1A1A1A' : '#FFFFFF',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                >
                  تحويل سريع
                </span>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)',
                    boxShadow: '0 4px 12px rgba(92,26,27,0.4)',
                  }}
                >
                  <Send size={20} color="#FFF" />
                </div>
              </motion.button>

              {/* Quick Scan QR */}
              <motion.button
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                onClick={() => { setFabOpen(false); useAppStore.getState().setQrInitialTab('scan'); setActiveScreen('qr'); }}
                className="absolute bottom-12 left-0 flex items-center gap-2 z-50"
              >
                <span
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap"
                  style={{
                    background: isDark ? '#1A1A1A' : '#FFFFFF',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                >
                  مسح QR
                </span>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
                  }}
                >
                  <ScanLine size={20} color="#FFF" />
                </div>
              </motion.button>

              {/* Quick Recharge */}
              <motion.button
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                onClick={() => { setFabOpen(false); setActiveScreen('recharge'); }}
                className="absolute left-0 flex items-center gap-2 z-50"
                style={{ bottom: '0px' }}
              >
                <span
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap"
                  style={{
                    background: isDark ? '#1A1A1A' : '#FFFFFF',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                >
                  شحن سريع
                </span>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
                  }}
                >
                  <Zap size={20} color="#FFF" />
                </div>
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setFabOpen(!fabOpen)}
          className="w-14 h-14 rounded-full flex items-center justify-center z-50 relative"
          style={{
            background: fabOpen ? (isDark ? '#333' : '#444') : 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)',
            boxShadow: fabOpen ? '0 4px 12px rgba(0,0,0,0.3)' : '0 6px 20px rgba(92,26,27,0.5)',
            transition: 'all 0.3s ease',
          }}
        >
          <motion.div
            animate={{ rotate: fabOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus size={24} color="#FFF" strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}