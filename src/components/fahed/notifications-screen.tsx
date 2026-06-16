'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ChevronLeft,
  CheckCheck,
  Info,
  Shield,
  ShoppingCart,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Vibrate,
  ExternalLink,
  ArrowUpRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import {
  handleNotificationTap,
  parseNavigationTarget,
  type DeepLinkNotification,
} from '@/lib/notification-handler';

const notifIcons: Record<string, typeof Info> = {
  info: Info,
  transaction: ShoppingCart,
  security: Shield,
  promo: Sparkles,
};

const notifColors: Record<string, string> = {
  info: '#2563EB',
  transaction: '#5C1A1B',
  security: '#F59E0B',
  promo: '#8B5CF6',
};

/** Map a parsed navigation target type to an Arabic label */
const navTargetLabels: Record<string, string> = {
  transaction: 'المعاملة',
  deposit: 'الإيداع',
  withdraw: 'السحب',
  order: 'الطلب',
  kyc: 'التوثيق',
  profile: 'الحساب',
  exchange: 'التحويل',
  services: 'الخدمات',
  promo: 'العروض',
  support: 'الدعم',
  url: 'رابط خارجي',
};

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, notifications, setNotifications, markNotificationRead, removeNotification, clearNotifications, setActiveScreen } = useAppStore();

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  // Filter by type
  const [activeFilter, setActiveFilter] = useState<'all' | 'info' | 'transaction' | 'security' | 'promo'>('all');
  
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(n => n.type === activeFilter);
  }, [notifications, activeFilter]);

  // Notification sound/vibration settings — initialize from localStorage
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('notif-sound');
    return saved !== null ? saved === 'true' : true;
  });
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('notif-vibration');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    localStorage.setItem('notif-sound', String(newVal));
  };

  const toggleVibration = () => {
    const newVal = !vibrationEnabled;
    setVibrationEnabled(newVal);
    localStorage.setItem('notif-vibration', String(newVal));
  };

  // Sound mapping based on notification type
  const SOUND_MAP: Record<string, string> = {
    transaction: '/sounds/transfer.wav',
    security: '/sounds/security.wav',
    promo: '/sounds/promo.wav',
    info: '/sounds/notification.wav',
  };

  const VIBRATION_MAP: Record<string, number[]> = {
    transaction: [100, 50, 100, 50, 100],
    security: [200, 100, 200, 100, 200],
    promo: [50],
    info: [100, 50, 100],
  };

  // Play notification sound/vibration with type-specific feedback
  const playNotificationFeedback = useCallback((type: string = 'info') => {
    if (soundEnabled) {
      try {
        const soundUrl = SOUND_MAP[type] || SOUND_MAP.info;
        const audio = new Audio(soundUrl);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    }
    if (vibrationEnabled && navigator.vibrate) {
      const pattern = VIBRATION_MAP[type] || VIBRATION_MAP.info;
      navigator.vibrate(pattern);
    }
  }, [soundEnabled, vibrationEnabled]);

  // Real-time Firebase listener for notifications
  useEffect(() => {
    if (!user?.id) return;
    const notifRef = ref(database, `notifications/${user.id}`);
    const unsubscribe = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notifList = Object.keys(data)
          .map(key => data[key])
          .sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((n: any) => ({
            id: n.id || '',
            title: n.title || '',
            body: n.body || '',
            type: (n.type || 'info') as 'info' | 'transaction' | 'security' | 'promo',
            isRead: n.isRead || false,
            createdAt: n.createdAt || new Date().toISOString(),
            navigationTarget: n.navigationTarget || n.navigation_target || undefined,
            navigationParams: n.navigationParams || n.navigation_params || undefined,
            data: n.data || undefined,
          }));
        setNotifications(notifList);
        // Play feedback for new notifications with type-specific sound
        if (notifList.length > notifications.length) {
          const latestNotif = notifList[0];
          playNotificationFeedback(latestNotif?.type || 'info');
        }
      }
    }, (error) => {
      console.error('Firebase notifications error:', error);
    });

    return () => unsubscribe();
  }, [user?.id, setNotifications, playNotificationFeedback, notifications.length]);

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.isRead) markNotificationRead(n.id);
    });
  };

  /**
   * Handle tapping a notification item.
   * Marks as read and navigates to the deep-link target if available.
   */
  const handleNotificationClick = useCallback((notif: typeof notifications[0]) => {
    const result = handleNotificationTap(notif as DeepLinkNotification);
    // If no navigation happened (e.g., no target), just stay on the screen
    // The handler already marks the notification as read
    if (!result.success && result.error) {
      console.warn('Notification navigation failed:', result.error);
    }
  }, []);

  const getNotifIcon = (type: string) => notifIcons[type] || Bell;
  const getNotifColor = (type: string) => notifColors[type] || '#666';

  return (
    <div className="min-h-screen pb-4">
      {/* Header - Jaib Style */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveScreen('main')}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <ChevronLeft size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإشعارات</h1>
              {unreadCount > 0 && (
                <p className="text-[11px]" style={{ color: '#5C1A1B' }}>
                  {unreadCount} إشعار غير مقروء
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              title={soundEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}
            >
              {soundEnabled ? (
                <Volume2 size={16} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
              ) : (
                <VolumeX size={16} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
              )}
            </button>
            {/* Vibration toggle */}
            <button
              onClick={toggleVibration}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              title={vibrationEnabled ? 'إيقاف الاهتزاز' : 'تشغيل الاهتزاز'}
            >
              <Vibrate size={16} strokeWidth={1.5} color={vibrationEnabled ? (isDark ? '#CCC' : '#666') : (isDark ? '#555' : '#CCC')} />
            </button>
            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(92,26,27,0.08)' }}
              >
                <CheckCheck size={14} strokeWidth={1.5} color="#5C1A1B" />
                <span className="text-[11px] font-medium" style={{ color: '#5C1A1B' }}>قراءة الكل</span>
              </button>
            )}
            {/* Clear All */}
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="flex items-center gap-1 px-3 py-2 rounded-xl"
                style={{ background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.05)' }}
              >
                <Trash2 size={14} strokeWidth={1.5} color="#5C1A1B" />
                <span className="text-[11px] font-medium" style={{ color: '#5C1A1B' }}>حذف الكل</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="px-4 mt-3">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'all' as const, label: 'الكل' },
            { id: 'transaction' as const, label: 'المعاملات' },
            { id: 'security' as const, label: 'الأمان' },
            { id: 'promo' as const, label: 'العروض' },
            { id: 'info' as const, label: 'عامة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all"
              style={{
                background: activeFilter === tab.id
                  ? 'linear-gradient(135deg, #5C1A1B, #3D0F10)'
                  : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                color: activeFilter === tab.id ? '#FFF' : (isDark ? '#888' : '#666'),
              }}
            >
              {tab.label}
              {tab.id !== 'all' && (
                <span className="mr-1 text-[9px]">
                  ({notifications.filter(n => n.type === tab.id).length})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-8"
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
              <Bell size={32} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
            </div>
            <p className="text-sm mt-3 font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد إشعارات</p>
            <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>الإشعارات ستظهر هنا</p>
          </div>
        </motion.div>
      ) : (
        <div className="px-4 space-y-2">
          <AnimatePresence>
            {filteredNotifications.map((notif, index) => {
              const NotifIcon = getNotifIcon(notif.type);
              const notifColor = getNotifColor(notif.type);
              const hasNavTarget = !!notif.navigationTarget;
              const parsedTarget = notif.navigationTarget
                ? parseNavigationTarget(notif.navigationTarget)
                : null;

              return (
                <SwipeToDismiss
                  key={notif.id}
                  isDark={isDark}
                  onDismiss={() => removeNotification(notif.id)}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100, height: 0, marginBottom: 0, padding: 0 }}
                    transition={{ delay: 0.03 * index }}
                    onClick={() => handleNotificationClick(notif)}
                    className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
                    style={{
                      background: !notif.isRead
                        ? (isDark ? '#1A1A1A' : '#FFFFFF')
                        : (isDark ? '#141414' : '#FAFAFA'),
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                      borderRight: !notif.isRead ? `3px solid ${notifColor}` : undefined,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${notifColor}12` }}
                    >
                      <NotifIcon size={18} strokeWidth={1.5} color={notifColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          {notif.title}
                        </h3>
                        {!notif.isRead && (
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: notifColor }} />
                        )}
                      </div>
                      <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: isDark ? '#999' : '#666' }}>
                        {notif.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>
                          {timeAgo(notif.createdAt)}
                        </p>
                        {/* Deep-link indicator badge */}
                        {hasNavTarget && parsedTarget && parsedTarget.type !== 'unknown' && (
                          <div
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                            style={{ background: `${notifColor}15` }}
                          >
                            {parsedTarget.type === 'url' ? (
                              <ExternalLink size={8} strokeWidth={2} color={notifColor} />
                            ) : (
                              <ArrowUpRight size={8} strokeWidth={2} color={notifColor} />
                            )}
                            <span className="text-[8px] font-medium" style={{ color: notifColor }}>
                              {navTargetLabels[parsedTarget.type] || parsedTarget.type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 opacity-40 hover:opacity-100 transition-opacity mt-1"
                      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                    >
                      <Trash2 size={12} strokeWidth={1.5} color={isDark ? '#888' : '#AAA'} />
                    </button>
                  </motion.div>
                </SwipeToDismiss>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Swipe-to-dismiss wrapper component
function SwipeToDismiss({
  children,
  onDismiss,
  isDark,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
  isDark: boolean;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startXRef.current;
    // Only allow swiping left (negative offset)
    if (diff < 0) {
      setOffsetX(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // If swiped more than 100px, dismiss
    if (offsetX < -100) {
      onDismiss();
    }
    setOffsetX(0);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background delete indicator */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-4 rounded-2xl"
        style={{ background: 'rgba(92,26,27,0.1)' }}
      >
        <div className="flex items-center gap-1.5">
          <Trash2 size={16} strokeWidth={1.5} color="#5C1A1B" />
          <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>حذف</span>
        </div>
      </div>
      {/* Content */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
