'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Megaphone,
  FileText,
  Search,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { database } from '@/lib/firebase';
import { ref, set, onValue } from 'firebase/database';
import { generateReference, timeAgo } from '@/lib/utils';
import IPhoneDivider from '@/components/fahed/iphone-divider';
import { useTranslation } from '@/lib/i18n';
import type { FirebaseUser } from './admin-types';
import { useAdminContext } from './admin-context';

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

const notifTypeConfig: Record<NotifType, { icon: typeof Info; color: string; labelAr: string; labelEn: string }> = {
  info: { icon: Info, color: '#2563EB', labelAr: 'معلومات', labelEn: 'Info' },
  transaction: { icon: ShoppingCart, color: '#5C1A1B', labelAr: 'معاملة', labelEn: 'Transaction' },
  security: { icon: Shield, color: '#F59E0B', labelAr: 'أمان', labelEn: 'Security' },
  promo: { icon: Sparkles, color: '#8B5CF6', labelAr: 'ترويجي', labelEn: 'Promo' },
};

const templates = [
  { id: 'update', labelAr: 'تحديث', labelEn: 'Update', titleAr: 'تحديث جديد متاح', titleEn: 'New Update Available', bodyAr: 'يرجى تحديث التطبيق إلى أحدث إصدار للحصول على أفضل تجربة', bodyEn: 'Please update the app to the latest version for the best experience', type: 'info' as NotifType },
  { id: 'offer', labelAr: 'عرض خاص', labelEn: 'Special Offer', titleAr: 'عرض خاص لفترة محدودة!', titleEn: 'Limited Time Special Offer!', bodyAr: 'استفد من عروضنا الحصرية الآن قبل انتهاء المدة', bodyEn: 'Take advantage of our exclusive offers now before they expire', type: 'promo' as NotifType },
  { id: 'security', labelAr: 'تحذير أمني', labelEn: 'Security Alert', titleAr: 'تنبيه أمني مهم', titleEn: 'Important Security Alert', bodyAr: 'يرجى مراجعة إعدادات الأمان الخاصة بك وتحديث كلمة المرور', bodyEn: 'Please review your security settings and update your password', type: 'security' as NotifType },
  { id: 'maintenance', labelAr: 'صيانة', labelEn: 'Maintenance', titleAr: 'صيانة مجدولة', titleEn: 'Scheduled Maintenance', bodyAr: 'سيتم إجراء صيانة مجدولة يوم الجمعة من 2-4 صباحاً', bodyEn: 'Scheduled maintenance will occur Friday from 2-4 AM', type: 'info' as NotifType },
];

const categories = [
  { id: 'unverified', labelAr: 'مستخدمون غير موثقين', labelEn: 'Unverified Users' },
  { id: 'blocked', labelAr: 'مستخدمون محظورون', labelEn: 'Blocked Users' },
  { id: 'lowBalance', labelAr: 'رصيد منخفض', labelEn: 'Low Balance' },
  { id: 'verified', labelAr: 'مستخدمون موثقون', labelEn: 'Verified Users' },
];

export default function AdminNotificationsInline() {
  const { isDark } = useAdminContext();
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
    const tpl = templates.find(t => t.id === templateId);
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

      // Send to each target user
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

      // Save to sent history
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

  return (
    <div className="space-y-3">
      {/* Tab selector */}
      <div className="flex gap-2">
        {(['compose', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? 'rgba(92,26,27,0.12)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
              color: activeTab === tab ? '#5C1A1B' : isDark ? '#888' : '#888',
              border: activeTab === tab ? '1.5px solid rgba(92,26,27,0.3)' : '1.5px solid transparent',
            }}
          >
            {tab === 'compose' ? (language === 'ar' ? 'إرسال إشعار' : 'Send Notification') : (language === 'ar' ? 'السجل' : 'History')}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'compose' ? (
          <motion.div key="compose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Templates */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                <FileText size={16} color="#5C1A1B" />
                {language === 'ar' ? 'القوالب' : 'Templates'}
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
                    <span className="text-base">
                      {tpl.id === 'update' ? '🔄' : tpl.id === 'offer' ? '🎁' : tpl.id === 'security' ? '🛡️' : '🔧'}
                    </span>
                    {language === 'ar' ? tpl.labelAr : tpl.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Send Mode */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                <Users size={16} color="#5C1A1B" />
                {language === 'ar' ? 'المرسل إليهم' : 'Recipients'}
              </h3>
              <div className="space-y-2">
                {([
                  { mode: 'all' as SendMode, icon: Users, label: language === 'ar' ? 'إرسال للجميع' : 'Send to All', count: firebaseUsers.length },
                  { mode: 'user' as SendMode, icon: User, label: language === 'ar' ? 'إرسال لمستخدم' : 'Send to User', count: null },
                  { mode: 'category' as SendMode, icon: Filter, label: language === 'ar' ? 'إرسال لفئة' : 'Send to Category', count: null },
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
                      <span className="flex-1 text-right text-sm" style={{ color: isActive ? '#5C1A1B' : isDark ? '#CCC' : '#666' }}>{item.label}</span>
                      {item.count !== null && (
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold" style={{ background: 'rgba(92,26,27,0.12)', color: '#5C1A1B' }}>{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {sendMode === 'user' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3">
                  <div className="relative">
                    <Search size={16} className="absolute top-3 right-3" color={isDark ? '#666' : '#AAA'} />
                    <input
                      type="text"
                      value={targetUser}
                      onChange={(e) => setTargetUser(e.target.value)}
                      placeholder={language === 'ar' ? 'معرف المستخدم أو رقم الهاتف' : 'User ID or Phone'}
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
                  {targetUser && <p className="text-[11px] mt-1.5" style={{ color: '#5C1A1B' }}>{targetUsers.length} {language === 'ar' ? 'مستخدم مطابق' : 'matching'}</p>}
                </motion.div>
              )}

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
                        <span className="flex-1 text-right text-sm" style={{ color: isActive ? '#5C1A1B' : isDark ? '#CCC' : '#666' }}>{language === 'ar' ? cat.labelAr : cat.labelEn}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-bold" style={{ background: 'rgba(92,26,27,0.12)', color: '#5C1A1B' }}>{catUsers.length}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                <Bell size={16} color="#5C1A1B" />
                {language === 'ar' ? 'محتوى الإشعار' : 'Notification Content'}
              </h3>

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
                      {language === 'ar' ? config.labelAr : config.labelEn}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder={language === 'ar' ? 'عنوان الإشعار' : 'Notification Title'}
                className="w-full px-3 py-2.5 rounded-xl text-sm mb-2 outline-none"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
              />
              <textarea
                value={notifBody}
                onChange={(e) => setNotifBody(e.target.value)}
                placeholder={language === 'ar' ? 'محتوى الإشعار' : 'Notification Body'}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
              />

              {/* Schedule */}
              <div className="flex items-center justify-between mt-3 mb-2">
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: isDark ? '#CCC' : '#666' }}>
                  <Calendar size={14} color="#5C1A1B" />
                  {language === 'ar' ? 'جدولة لوقت لاحق' : 'Schedule for later'}
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

            {/* Send Summary */}
            <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>{language === 'ar' ? 'سيتم الإرسال إلى' : 'Will be sent to'}</span>
                <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{sendMode === 'all' ? firebaseUsers.length : targetUsers.length} {language === 'ar' ? 'مستخدم' : 'users'}</span>
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
                    {scheduleEnabled ? (language === 'ar' ? 'جدولة' : 'Schedule') : (language === 'ar' ? 'إرسال الآن' : 'Send Now')}
                  </>
                )}
              </button>
              {sendSuccess && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <CheckCircle2 size={16} color="#10B981" />
                  <span className="text-xs font-medium" style={{ color: '#10B981' }}>{language === 'ar' ? 'تم الإرسال بنجاح!' : 'Sent successfully!'}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              {sentNotifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell size={32} color={isDark ? '#333' : '#DDD'} className="mx-auto mb-2" />
                  <p className="text-sm" style={{ color: isDark ? '#666' : '#AAA' }}>{language === 'ar' ? 'لا توجد إشعارات مرسلة' : 'No sent notifications'}</p>
                </div>
              ) : (
                sentNotifications.map((notif, index) => {
                  const TypeIcon = notifTypeConfig[notif.type]?.icon || Bell;
                  const typeColor = notifTypeConfig[notif.type]?.color || '#666';
                  return (
                    <div key={notif.id} className="relative">
                      {index > 0 && <IPhoneDivider isDark={isDark} />}
                      <div className="p-4">
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
                                {notif.target === 'all' ? (language === 'ar' ? 'الجميع' : 'All') : notif.target === 'user' ? (language === 'ar' ? 'مستخدم' : 'User') : (language === 'ar' ? 'فئة' : 'Category')}
                              </span>
                              <span className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(notif.sentAt)}</span>
                            </div>
                          </div>
                          <div className="text-left shrink-0">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 size={12} color="#10B981" />
                              <span className="text-[10px] font-bold" style={{ color: '#10B981' }}>{notif.deliveredCount}</span>
                            </div>
                            <p className="text-[9px] mt-0.5" style={{ color: isDark ? '#555' : '#BBB' }}>{language === 'ar' ? 'تم التسليم' : 'delivered'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
