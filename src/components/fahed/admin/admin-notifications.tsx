'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Send,
  Users,
  User,
  Filter,
  Clock,
  Bell,
  Info,
  Shield,
  ShoppingCart,
  Sparkles,
  Calendar,
  CheckCircle2,
  Search,
  FileText,
  Megaphone,
  AlertTriangle,
  Wrench,
  Gift,
  BarChart3,
  Eye,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { database } from '@/lib/firebase';
import { ref, set, onValue } from 'firebase/database';
import { generateReference, timeAgo } from '@/lib/utils';
import IPhoneDivider from '@/components/fahed/iphone-divider';
import { useTranslation } from '@/lib/i18n';
import type { FirebaseUser } from './admin-types';

// ─── Types ───
interface SentNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'transaction' | 'security' | 'promo';
  target: 'all' | 'user' | 'category';
  targetDetail?: string;
  recipientCount: number;
  deliveredCount: number;
  scheduledAt?: string;
  sentAt: string;
  status: 'sent' | 'scheduled';
  template?: string;
}

type SendMode = 'all' | 'user' | 'category';
type NotifType = 'info' | 'transaction' | 'security' | 'promo';

// ─── Notification type configuration ───
const notifTypeConfig: Record<NotifType, { icon: typeof Info; color: string; labelKey: string }> = {
  info: { icon: Info, color: '#2563EB', labelKey: 'admin.typeInfo' },
  transaction: { icon: ShoppingCart, color: '#5C1A1B', labelKey: 'admin.typeTransaction' },
  security: { icon: Shield, color: '#F59E0B', labelKey: 'admin.typeSecurity' },
  promo: { icon: Sparkles, color: '#8B5CF6', labelKey: 'admin.typePromo' },
};

// ─── Templates ───
const templates = [
  { id: 'update', icon: RefreshIcon, labelKey: 'admin.templateUpdate', emoji: '🔄',
    titleAr: 'تحديث جديد متاح', titleEn: 'New Update Available',
    bodyAr: 'يرجى تحديث التطبيق إلى أحدث إصدار للحصول على أفضل تجربة', bodyEn: 'Please update the app to the latest version for the best experience',
    type: 'info' as NotifType },
  { id: 'offer', icon: GiftIcon, labelKey: 'admin.templateOffer', emoji: '🎁',
    titleAr: 'عرض خاص لفترة محدودة!', titleEn: 'Limited Time Special Offer!',
    bodyAr: 'استفد من عروضنا الحصرية الآن قبل انتهاء المدة', bodyEn: 'Take advantage of our exclusive offers now before they expire',
    type: 'promo' as NotifType },
  { id: 'security', icon: AlertTriangle, labelKey: 'admin.templateSecurity', emoji: '🛡️',
    titleAr: 'تنبيه أمني مهم', titleEn: 'Important Security Alert',
    bodyAr: 'يرجى مراجعة إعدادات الأمان الخاصة بك وتحديث كلمة المرور', bodyEn: 'Please review your security settings and update your password',
    type: 'security' as NotifType },
  { id: 'maintenance', icon: Wrench, labelKey: 'admin.templateMaintenance', emoji: '🔧',
    titleAr: 'صيانة مجدولة', titleEn: 'Scheduled Maintenance',
    bodyAr: 'سيتم إجراء صيانة مجدولة يوم الجمعة من 2-4 صباحاً', bodyEn: 'Scheduled maintenance will occur Friday from 2-4 AM',
    type: 'info' as NotifType },
];

// ─── Icon helper components for templates ───
function RefreshIcon({ size, color }: { size: number; color: string }) {
  return <Info size={size} color={color} />;
}
function GiftIcon({ size, color }: { size: number; color: string }) {
  return <Sparkles size={size} color={color} />;
}

// ─── Categories ───
const categories = [
  { id: 'unverified', labelKey: 'admin.unverifiedUsers' },
  { id: 'blocked', labelKey: 'admin.blockedUsers' },
  { id: 'lowBalance', labelKey: 'admin.lowBalance' },
  { id: 'verified', labelKey: 'admin.verifiedUsers' },
];

export default function AdminNotifications() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen } = useAppStore();
  const { t, language } = useTranslation();

  // Firebase users
  const [firebaseUsers, setFirebaseUsers] = useState<FirebaseUser[]>([]);

  // Composer state
  const [sendMode, setSendMode] = useState<SendMode>('all');
  const [targetUser, setTargetUser] = useState('');
  const [targetCategory, setTargetCategory] = useState('unverified');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifType, setNotifType] = useState<NotifType>('info');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // History
  const [sentNotifications, setSentNotifications] = useState<SentNotification[]>([]);

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // View detail modal
  const [viewNotifDetail, setViewNotifDetail] = useState<SentNotification | null>(null);

  // Listen to Firebase users
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key, name: val.name || '', email: val.email || '', phone: val.phone || '',
          userId: val.userId || key, kycStatus: val.kycStatus || 'pending',
          isBlocked: val.isBlocked || false, balanceYER: val.balanceYER || 0,
          balanceSAR: val.balanceSAR || 0, balanceUSD: val.balanceUSD || 0,
          cardType: val.cardType, cardNumber: val.cardNumber, governorate: val.governorate,
          idPhotoUrl: val.idPhotoUrl, selfieUrl: val.selfieUrl, avatar: val.avatar,
          createdAt: val.createdAt
        }));
        setFirebaseUsers(usersList);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to sent notifications history
  useEffect(() => {
    const histRef = ref(database, 'adminSettings/sentNotifications');
    const unsubscribe = onValue(histRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as SentNotification[];
        setSentNotifications(list.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()));
      } else {
        setSentNotifications([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Get target users based on mode
  const getTargetUsers = useCallback((): FirebaseUser[] => {
    switch (sendMode) {
      case 'all':
        return firebaseUsers;
      case 'user': {
        const search = targetUser.trim().toLowerCase();
        if (!search) return [];
        return firebaseUsers.filter(u =>
          u.id.toLowerCase().includes(search) ||
          u.phone?.toLowerCase().includes(search) ||
          u.userId?.toLowerCase().includes(search) ||
          u.name?.toLowerCase().includes(search)
        );
      }
      case 'category':
        switch (targetCategory) {
          case 'unverified':
            return firebaseUsers.filter(u => u.kycStatus !== 'verified');
          case 'blocked':
            return firebaseUsers.filter(u => u.isBlocked);
          case 'lowBalance':
            return firebaseUsers.filter(u => (u.balanceYER || 0) + (u.balanceSAR || 0) + (u.balanceUSD || 0) < 1000);
          case 'verified':
            return firebaseUsers.filter(u => u.kycStatus === 'verified');
          default:
            return firebaseUsers;
        }
      default:
        return firebaseUsers;
    }
  }, [sendMode, firebaseUsers, targetUser, targetCategory]);

  // Apply template
  const handleApplyTemplate = (templateId: string) => {
    const tpl = templates.find(tp => tp.id === templateId);
    if (!tpl) return;
    setSelectedTemplate(templateId);
    setNotifTitle(language === 'ar' ? tpl.titleAr : tpl.titleEn);
    setNotifBody(language === 'ar' ? tpl.bodyAr : tpl.bodyEn);
    setNotifType(tpl.type);
  };

  // Send notification
  const handleSend = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setIsSending(true);
    try {
      const targets = getTargetUsers();
      if (targets.length === 0 && sendMode !== 'all') {
        setIsSending(false);
        return;
      }

      let deliveredCount = 0;

      // Send to each target user via Firebase
      for (const targetU of targets) {
        const notifId = generateReference();
        const notifData = {
          id: notifId,
          title: notifTitle,
          body: notifBody,
          type: notifType,
          isRead: false,
          createdAt: new Date().toISOString(),
          fromAdmin: true,
        };
        await set(ref(database, `notifications/${targetU.id}/${notifId}`), notifData);
        deliveredCount++;
      }

      // Save to sent history at adminSettings/sentNotifications/
      const historyId = generateReference();
      const historyEntry: SentNotification = {
        id: historyId,
        title: notifTitle,
        body: notifBody,
        type: notifType,
        target: sendMode,
        targetDetail: sendMode === 'user' ? targetUser : sendMode === 'category' ? targetCategory : undefined,
        recipientCount: targets.length,
        deliveredCount,
        scheduledAt: scheduleEnabled ? scheduleDate : undefined,
        sentAt: new Date().toISOString(),
        status: scheduleEnabled ? 'scheduled' : 'sent',
        template: selectedTemplate || undefined,
      };
      await set(ref(database, `adminSettings/sentNotifications/${historyId}`), historyEntry);

      // Reset form
      setNotifTitle('');
      setNotifBody('');
      setSelectedTemplate(null);
      setScheduleEnabled(false);
      setScheduleDate('');
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setIsSending(false);
    }
  };

  const targetUsers = getTargetUsers();
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';

  // Delivery stats for history
  const totalSent = sentNotifications.length;
  const totalDelivered = sentNotifications.reduce((sum, n) => sum + n.deliveredCount, 0);
  const scheduledCount = sentNotifications.filter(n => n.status === 'scheduled').length;

  return (
    <div className="min-h-screen pb-6" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveScreen('admin')}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ArrowRight size={18} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
              {t('admin.notifications')}
            </h1>
            <p className="text-[11px]" style={{ color: isDark ? '#666' : '#AAA' }}>
              {t('admin.manageSystem')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
            <Megaphone size={18} color="#5C1A1B" />
          </div>
        </div>
      </motion.div>

      {/* Delivery Stats Overview */}
      {sentNotifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="px-4 mb-3"
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Send, label: t('admin.sentHistory'), value: totalSent, color: '#5C1A1B' },
              { icon: CheckCircle2, label: t('admin.delivered'), value: totalDelivered, color: '#10B981' },
              { icon: Clock, label: t('status.scheduled'), value: scheduledCount, color: '#F59E0B' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: `${stat.color}08`,
                    border: `1px solid ${stat.color}15`,
                  }}
                >
                  <Icon size={16} color={stat.color} className="mx-auto mb-1" />
                  <p className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {stat.value}
                  </p>
                  <p className="text-[9px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Tab selector */}
      <div className="px-4 mb-3">
        <div className="flex gap-2">
          {(['compose', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
              style={{
                background: activeTab === tab ? 'rgba(92,26,27,0.12)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                color: activeTab === tab ? '#5C1A1B' : isDark ? '#888' : '#888',
                border: activeTab === tab ? '1.5px solid rgba(92,26,27,0.3)' : '1.5px solid transparent',
              }}
            >
              {tab === 'compose' ? <Send size={14} /> : <Clock size={14} />}
              {tab === 'compose' ? t('admin.compose') : t('admin.history')}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'compose' ? (
          <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 space-y-3">
            {/* ─── Templates ─── */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                <FileText size={16} color="#5C1A1B" />
                {t('admin.template')}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl.id)}
                    className="py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center gap-2"
                    style={{
                      background: selectedTemplate === tpl.id ? 'rgba(92,26,27,0.12)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: selectedTemplate === tpl.id ? '1.5px solid rgba(92,26,27,0.3)' : '1.5px solid transparent',
                      color: selectedTemplate === tpl.id ? '#5C1A1B' : isDark ? '#CCC' : '#666',
                    }}
                  >
                    <span className="text-base">{tpl.emoji}</span>
                    {t(tpl.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Recipients ─── */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                <Users size={16} color="#5C1A1B" />
                {t('admin.recipients')}
              </h3>
              <div className="space-y-2">
                {([
                  { mode: 'all' as SendMode, icon: Users, labelKey: 'admin.sendToAll', showCount: true },
                  { mode: 'user' as SendMode, icon: User, labelKey: 'admin.sendToUser', showCount: false },
                  { mode: 'category' as SendMode, icon: Filter, labelKey: 'admin.sendToCategory', showCount: false },
                ]).map((item) => {
                  const Icon = item.icon;
                  const isActive = sendMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      onClick={() => setSendMode(item.mode)}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all"
                      style={{
                        background: isActive ? 'rgba(92,26,27,0.1)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        border: isActive ? '1.5px solid rgba(92,26,27,0.25)' : '1.5px solid transparent',
                      }}
                    >
                      <Icon size={16} color={isActive ? '#5C1A1B' : isDark ? '#888' : '#AAA'} />
                      <span className="flex-1 text-right text-sm" style={{ color: isActive ? '#5C1A1B' : isDark ? '#CCC' : '#666' }}>
                        {t(item.labelKey)}
                      </span>
                      {item.showCount && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold" style={{ background: 'rgba(92,26,27,0.12)', color: '#5C1A1B' }}>
                          {firebaseUsers.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* User search */}
              {sendMode === 'user' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3">
                  <div className="relative">
                    <Search size={16} className="absolute top-3 right-3" color={isDark ? '#666' : '#AAA'} />
                    <input
                      type="text"
                      value={targetUser}
                      onChange={(e) => setTargetUser(e.target.value)}
                      placeholder={t('admin.userIdOrPhone')}
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
                    />
                  </div>
                  {targetUser && (
                    <div className="mt-2 max-h-32 overflow-y-auto rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                      {firebaseUsers
                        .filter(u => u.id.toLowerCase().includes(targetUser.toLowerCase()) || u.phone?.toLowerCase().includes(targetUser.toLowerCase()) || u.name?.toLowerCase().includes(targetUser.toLowerCase()))
                        .slice(0, 5)
                        .map((u) => (
                          <button key={u.id} onClick={() => setTargetUser(u.phone || u.userId || u.id)} className="w-full flex items-center gap-2 px-3 py-2 text-right">
                            <User size={14} color={isDark ? '#888' : '#AAA'} />
                            <span className="text-xs" style={{ color: isDark ? '#CCC' : '#666' }}>{u.name} - {u.phone || u.userId}</span>
                          </button>
                        ))}
                    </div>
                  )}
                  {targetUser && (
                    <p className="text-[11px] mt-1.5" style={{ color: '#5C1A1B' }}>
                      {targetUsers.length} {t('admin.users')}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Category selection */}
              {sendMode === 'category' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 space-y-2">
                  {categories.map((cat) => {
                    const catUsers = cat.id === 'unverified' ? firebaseUsers.filter(u => u.kycStatus !== 'verified')
                      : cat.id === 'blocked' ? firebaseUsers.filter(u => u.isBlocked)
                      : cat.id === 'lowBalance' ? firebaseUsers.filter(u => (u.balanceYER || 0) + (u.balanceSAR || 0) + (u.balanceUSD || 0) < 1000)
                      : firebaseUsers.filter(u => u.kycStatus === 'verified');
                    const isActive = targetCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setTargetCategory(cat.id)}
                        className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all"
                        style={{ background: isActive ? 'rgba(92,26,27,0.1)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: isActive ? '1.5px solid rgba(92,26,27,0.25)' : '1.5px solid transparent' }}
                      >
                        <span className="flex-1 text-right text-sm" style={{ color: isActive ? '#5C1A1B' : isDark ? '#CCC' : '#666' }}>
                          {t(cat.labelKey)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold" style={{ background: 'rgba(92,26,27,0.12)', color: '#5C1A1B' }}>
                          {catUsers.length}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* ─── Composer ─── */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                <Bell size={16} color="#5C1A1B" />
                {t('admin.notificationContent')}
              </h3>

              {/* Type selector */}
              <div className="flex gap-2 mb-3">
                {(Object.keys(notifTypeConfig) as NotifType[]).map((type) => {
                  const config = notifTypeConfig[type];
                  const Icon = config.icon;
                  const isActive = notifType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setNotifType(type)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ background: isActive ? `${config.color}15` : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: isActive ? `1.5px solid ${config.color}40` : '1.5px solid transparent', color: isActive ? config.color : isDark ? '#888' : '#AAA' }}
                    >
                      <Icon size={14} />
                      {t(config.labelKey)}
                    </button>
                  );
                })}
              </div>

              {/* Title input */}
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder={t('admin.notificationTitle')}
                className="w-full px-3 py-2.5 rounded-xl text-sm mb-2 outline-none"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
              />

              {/* Body textarea */}
              <textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder={t('admin.notificationBody')}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
              />

              {/* Schedule toggle */}
              <div className="flex items-center justify-between mt-3 mb-2">
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: isDark ? '#CCC' : '#666' }}>
                  <Calendar size={14} color="#5C1A1B" />
                  {t('admin.scheduleLater')}
                </span>
                <button
                  onClick={() => setScheduleEnabled(!scheduleEnabled)}
                  className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
                  style={{ background: scheduleEnabled ? '#5C1A1B' : isDark ? '#333' : '#DDD', justifyContent: scheduleEnabled ? 'flex-end' : 'flex-start' }}
                >
                  <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              {scheduleEnabled && (
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
                />
              )}
            </div>

            {/* ─── Send Summary ─── */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>{t('admin.willBeSentTo')}</span>
                <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                  {sendMode === 'all' ? firebaseUsers.length : targetUsers.length} {t('admin.users')}
                </span>
              </div>
              <button
                onClick={handleSend}
                disabled={isSending || !notifTitle.trim() || !notifBody.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all"
                style={{ background: isSending || !notifTitle.trim() || !notifBody.trim() ? 'rgba(92,26,27,0.3)' : 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)', boxShadow: !isSending && notifTitle.trim() && notifBody.trim() ? '0 4px 16px rgba(92,26,27,0.3)' : 'none' }}
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    {scheduleEnabled ? t('actions.schedule') : t('admin.sendNow')}
                  </>
                )}
              </button>
              {sendSuccess && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <span className="text-xs font-medium" style={{ color: '#10B981' }}>{t('admin.sentSuccessfully')}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              {sentNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(92,26,27,0.08)' }}>
                    <Bell size={28} strokeWidth={1.5} color="#5C1A1B" />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#666' : '#AAA' }}>{t('admin.noSentNotifications')}</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {sentNotifications.map((notif, index) => {
                    const TypeIcon = notifTypeConfig[notif.type]?.icon || Bell;
                    const typeColor = notifTypeConfig[notif.type]?.color || '#666';
                    const deliveryRate = notif.recipientCount > 0 ? Math.round((notif.deliveredCount / notif.recipientCount) * 100) : 0;
                    return (
                      <div key={notif.id} className="relative">
                        {index > 0 && <IPhoneDivider isDark={isDark} />}
                        <button
                          onClick={() => setViewNotifDetail(notif)}
                          className="w-full p-4 text-right active:scale-[0.99] transition-transform"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${typeColor}12` }}>
                              <TypeIcon size={18} strokeWidth={1.5} color={typeColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{notif.title}</h4>
                                {notif.status === 'scheduled' && <Clock size={12} color="#F59E0B" />}
                              </div>
                              <p className="text-xs mt-0.5 truncate" style={{ color: isDark ? '#999' : '#666' }}>{notif.body}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(92,26,27,0.08)', color: '#5C1A1B' }}>
                                  {notif.target === 'all' ? t('admin.all') : notif.target === 'user' ? t('admin.user') : t('admin.category')}
                                </span>
                                <span className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(notif.sentAt)}</span>
                              </div>
                            </div>
                            <div className="text-left shrink-0">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 size={12} color="#10B981" />
                                <span className="text-[10px] font-bold" style={{ color: '#10B981' }}>{notif.deliveredCount}</span>
                              </div>
                              <p className="text-[9px] mt-0.5" style={{ color: isDark ? '#555' : '#BBB' }}>{deliveryRate}%</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Notification Detail Modal ─── */}
      <AnimatePresence>
        {viewNotifDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={() => setViewNotifDetail(null)}
          >
            <motion.div
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-t-3xl overflow-hidden"
              style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', maxHeight: '70vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full" style={{ background: isDark ? '#333' : '#DDD' }} />
              </div>

              <div className="px-5 pb-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${notifTypeConfig[viewNotifDetail.type]?.color || '#666'}15` }}>
                    {(() => { const Icon = notifTypeConfig[viewNotifDetail.type]?.icon || Bell; return <Icon size={22} color={notifTypeConfig[viewNotifDetail.type]?.color || '#666'} />; })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{viewNotifDetail.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }}>{timeAgo(viewNotifDetail.sentAt)}</p>
                  </div>
                </div>

                {/* Body */}
                <p className="text-sm leading-relaxed mb-4" style={{ color: isDark ? '#CCC' : '#666' }}>
                  {viewNotifDetail.body}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-xl p-3 text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <p className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{viewNotifDetail.recipientCount}</p>
                    <p className="text-[9px]" style={{ color: isDark ? '#888' : '#AAA' }}>{t('admin.recipients')}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)' }}>
                    <p className="text-lg font-bold" style={{ color: '#10B981' }}>{viewNotifDetail.deliveredCount}</p>
                    <p className="text-[9px]" style={{ color: isDark ? '#888' : '#AAA' }}>{t('admin.delivered')}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(92,26,27,0.08)' }}>
                    <p className="text-lg font-bold" style={{ color: '#5C1A1B' }}>
                      {viewNotifDetail.recipientCount > 0 ? Math.round((viewNotifDetail.deliveredCount / viewNotifDetail.recipientCount) * 100) : 0}%
                    </p>
                    <p className="text-[9px]" style={{ color: isDark ? '#888' : '#AAA' }}>{t('admin.deliveryStats')}</p>
                  </div>
                </div>

                {/* Target info */}
                <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>{t('admin.notificationType')}</span>
                    <span className="text-xs font-medium" style={{ color: notifTypeConfig[viewNotifDetail.type]?.color || '#666' }}>
                      {t(notifTypeConfig[viewNotifDetail.type]?.labelKey || 'admin.typeInfo')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>{t('admin.recipients')}</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#666' }}>
                      {viewNotifDetail.target === 'all' ? t('admin.all') : viewNotifDetail.target === 'user' ? `${t('admin.user')} (${viewNotifDetail.targetDetail})` : `${t('admin.category')} (${viewNotifDetail.targetDetail})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>{t('status.scheduled')}</span>
                    <span className="text-xs font-medium" style={{ color: viewNotifDetail.status === 'scheduled' ? '#F59E0B' : '#10B981' }}>
                      {viewNotifDetail.status === 'scheduled' ? t('status.scheduled') : t('status.sent')}
                    </span>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setViewNotifDetail(null)}
                  className="w-full py-3 mt-4 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }}
                >
                  {t('actions.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
