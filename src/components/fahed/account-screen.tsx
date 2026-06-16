'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Download,
  Settings,
  Shield,
  MessageCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  CreditCard,
  LogOut,
  Eye,
  EyeOff,
  TrendingUp,
  Bell,
  FileText,
  Lock,
  Trash2,
  Info,
  ChevronLeft,
  Cloud,
  Heart,
  LayoutDashboard,
  Crown,
  Globe,
  ExternalLink,
  Mail,
  Gift,
  Copy,
  Check,
  BadgeCheck,
  Moon,
  Sun,
  Clock,
  Star,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { database } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { ref, get, onValue, update } from 'firebase/database';
import { sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { LOGO_BASE64 } from '@/lib/logo';

interface SectionItem {
  id: string;
  label: string;
  icon: typeof User;
  color: string;
  screen?: string;
  toggle?: boolean;
}

interface Section {
  id: string;
  title: string;
  icon: typeof User;
  iconColor: string;
  items: SectionItem[];
}

const accountSections: Section[] = [
  {
    id: 'account',
    title: 'الملف الشخصي',
    icon: User,
    iconColor: '#5C1A1B',
    items: [
      { id: 'profile', label: 'الحساب الشخصي', icon: Heart, color: '#5C1A1B', screen: 'edit-profile' },
      { id: 'my-data', label: 'بياناتي', icon: User, color: '#2563EB', screen: 'kyc' },
      { id: 'gift-vouchers', label: 'قسائم الهدية', icon: Gift, color: '#10B981', screen: 'gift-vouchers' },
      { id: 'my-investments', label: 'استثماراتي', icon: TrendingUp, color: '#8B5CF6', screen: 'investment' },
      { id: 'direct-chat', label: 'المحادثات', icon: MessageCircle, color: '#5C1A1B', screen: 'direct-chat' },
    ],
  },
  {
    id: 'privacy',
    title: 'الخصوصية والأمان',
    icon: Shield,
    iconColor: '#5C1A1B',
    items: [
      { id: 'change-password', label: 'تغيير كلمة المرور', icon: Lock, color: '#5C1A1B' },
      { id: 'notifications-settings', label: 'الإشعارات والتنبيهات', icon: Bell, color: '#2563EB', screen: 'notifications' },
    ],
  },
  {
    id: 'app-settings',
    title: 'التطبيق',
    icon: Settings,
    iconColor: '#666',
    items: [
      { id: 'general-settings', label: 'الإعدادات', icon: Settings, color: '#666', screen: 'settings' },
      { id: 'terms', label: 'الشروط والأحكام', icon: FileText, color: '#2563EB', screen: 'legal' },
      { id: 'privacy-policy', label: 'سياسة الخصوصية', icon: Shield, color: '#8B5CF6', screen: 'legal' },
      { id: 'share-app', label: 'مشاركة التطبيق', icon: Share2, color: '#10B981' },
    ],
  },
];

// Account tier info
const accountTiers: Record<string, { label: string; color: string; bg: string; icon: typeof Star; description: string }> = {
  basic: { label: 'أساسي', color: '#999', bg: 'rgba(153,153,153,0.12)', icon: User, description: 'حساب غير موثق' },
  verified: { label: 'موثق', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: BadgeCheck, description: 'حساب موثق بالكامل' },
  premium: { label: 'مميز', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Crown, description: 'حساب مميز مع امتيازات إضافية' },
};

export default function AccountScreen() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setActiveScreen, logout, balanceVisible, toggleBalance, setUser } = useAppStore();
  // Admin/Owner panels moved to separate admin app
  const [expandedSections, setExpandedSections] = useState<string[]>(['account', 'privacy']);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    'auto-login': true,
    'face-id': false,
    'dark-mode': isDark,
    'notifications-toggle': true,
  });

  // Keep dark-mode toggle in sync with actual theme
  useEffect(() => {
    setToggleStates(prev => ({ ...prev, 'dark-mode': isDark }));
  }, [isDark]);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showQRCard, setShowQRCard] = useState(false);
  const [lastLoginTime, setLastLoginTime] = useState<string>('');

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Social links from Firebase
  const [socialLinks, setSocialLinks] = useState<{
    whatsapp: string; facebook: string; twitter: string; instagram: string;
    telegram: string; youtube: string; supportEmail: string; contactAdmin: string;
    contactAdminMessage: string;
  } | null>(null);

  // Determine account tier
  const getAccountTier = (): string => {
    if (!user) return 'basic';
    if (user.kycStatus === 'verified') return 'verified';
    // Premium could be based on a future field, but for now verified is the highest
    return 'verified';
  };
  const tier = accountTiers[getAccountTier()];

  useEffect(() => {
    const linksRef = ref(database, 'adminSettings/socialLinks');
    const unsubscribe = onValue(linksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSocialLinks({
          whatsapp: data.whatsapp || '',
          facebook: data.facebook || '',
          twitter: data.twitter || '',
          instagram: data.instagram || '',
          telegram: data.telegram || '',
          youtube: data.youtube || '',
          supportEmail: data.supportEmail || '',
          contactAdmin: data.contactAdmin || '',
          contactAdminMessage: data.contactAdminMessage || '',
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Last login time
  useEffect(() => {
    const now = new Date();
    const formatted = now.toLocaleDateString('ar-YE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    setLastLoginTime(formatted);
  }, []);

  // Admin/owner role check removed - panels are in separate admin app

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleToggle = (itemId: string) => {
    if (itemId === 'dark-mode') {
      const newTheme = isDark ? 'light' : 'dark';
      setTheme(newTheme);
      // Also update Zustand store for persistence
      useAppStore.getState().setTheme(newTheme as 'light' | 'dark');
    }
    setToggleStates(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleItemClick = (item: SectionItem) => {
    if (item.id === 'change-password') {
      setShowPasswordDialog(true);
      return;
    }
    if (item.screen) {
      setActiveScreen(item.screen);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !auth.currentUser) return;
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u063a\u064a\u0631 \u0645\u062a\u0637\u0627\u0628\u0642\u0629');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u064a\u062c\u0628 \u0623\u0646 \u062a\u0643\u0648\u0646 6 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644');
      return;
    }
    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email || '', currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      await update(ref(database, `users/${user.id}`), { passwordChangedAt: new Date().toISOString() });
      setPasswordSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => { setShowPasswordDialog(false); setPasswordSuccess(false); }, 2000);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setPasswordError('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0636\u0639\u064a\u0641\u0629 \u062c\u062f\u0627\u064b');
      } else {
        try {
          if (auth.currentUser.email) { await sendPasswordResetEmail(auth, auth.currentUser.email); setPasswordError('\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0627\u0628\u0637 \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0639\u064a\u064a\u0646 \u0625\u0644\u0649 \u0628\u0631\u064a\u062f\u0643'); }
          else { setPasswordError('\u062d\u062f\u062b \u062e\u0637\u0623. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'); }
        } catch { setPasswordError('\u062d\u062f\u062b \u062e\u0637\u0623. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.'); }
      }
    } finally { setIsChangingPassword(false); }
  };

  const handleShareProfile = () => {
    const text = `📱 حسابي في محفظة الجنوب\n🆔 رقم الحساب: ${user?.userId || ''}\n👤 الاسم: ${user?.name || ''}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard?.writeText(text);
      });
    } else {
      navigator.clipboard?.writeText(text);
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-2"
      >
        <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الحساب</h1>
      </motion.div>

      {/* Profile Card - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 mt-2"
      >
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 relative"
              style={{
                background: user?.avatar ? 'transparent' : 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 100%)',
                boxShadow: '0 4px 12px rgba(92,26,27,0.2)',
              }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={28} strokeWidth={1.5} color="#FFF" />
              )}
              {/* Verified badge overlay */}
              {user?.kycStatus === 'verified' && (
                <div
                  className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: '#10B981', border: '2px solid ' + (isDark ? '#1A1A1A' : '#FFFFFF') }}
                >
                  <BadgeCheck size={12} color="#FFF" />
                </div>
              )}
            </div>

            {/* Name + Phone + Tier */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  {user?.name || 'مستخدم'}
                </h2>
                {user?.kycStatus === 'verified' && (
                  <BadgeCheck size={18} strokeWidth={2} color="#10B981" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Phone size={12} strokeWidth={1.5} color="#5C1A1B" />
                <span className="text-sm font-medium" style={{ color: '#5C1A1B' }} dir="ltr">
                  {user?.phone || '+967 7XX XXX XXX'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <CreditCard size={12} strokeWidth={1.5} color="#5C1A1B" />
                <span className="text-sm font-medium" style={{ color: '#5C1A1B' }} dir="ltr">
                  {user?.userId || '------'}
                </span>
              </div>
            </div>

            {/* QR Code Button */}
            <button
              onClick={() => setActiveScreen('qr')}
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <QrCode size={22} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
            </button>
          </div>

          {/* Account Tier Badge */}
          <div className="mt-3">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: tier.bg }}
            >
              {(() => {
                const TierIcon = tier.icon;
                return <TierIcon size={16} strokeWidth={1.5} color={tier.color} />;
              })()}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: tier.color }}>
                    حساب {tier.label}
                  </span>
                </div>
                <span className="text-[10px]" style={{ color: isDark ? '#888' : '#999' }}>
                  {tier.description}
                </span>
              </div>
              {getAccountTier() === 'basic' && (
                <button
                  onClick={() => setActiveScreen('kyc')}
                  className="text-[10px] px-2 py-1 rounded-lg font-bold"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}
                >
                  توثيق
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => setActiveScreen('qr')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              }}
            >
              <Download size={16} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
              <span className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#666' }}>
                تحميل بطاقة
              </span>
            </button>
            <button
              onClick={handleShareProfile}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
              style={{
                background: 'rgba(92,26,27,0.08)',
              }}
            >
              <Share2 size={16} strokeWidth={1.5} color="#5C1A1B" />
              <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>
                مشاركة الملف
              </span>
            </button>
            <button
              onClick={() => setActiveScreen('settings')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
              style={{
                background: 'rgba(16,185,129,0.08)',
              }}
            >
              <Settings size={16} strokeWidth={1.5} color="#10B981" />
              <span className="text-xs font-medium" style={{ color: '#10B981' }}>
                الإعدادات
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* QR Code Card for Receiving Money */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="px-4 mt-3"
      >
        <button
          onClick={() => setShowQRCard(!showQRCard)}
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <div className="flex items-center gap-3 p-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(92,26,27,0.1)' }}
            >
              <QrCode size={20} strokeWidth={1.5} color="#5C1A1B" />
            </div>
            <div className="flex-1 text-right">
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>رمز الاستقبال</h3>
              <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#888' : '#999' }}>اعرض رمز QR لاستقبال الأموال</p>
            </div>
            {showQRCard ? (
              <ChevronUp size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
            ) : (
              <ChevronDown size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
            )}
          </div>
        </button>

        <AnimatePresence>
          {showQRCard && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div
                className="mt-2 rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #3D0F10 0%, #5C1A1B 50%, #B91C1C 100%)',
                  boxShadow: '0 8px 32px rgba(92,26,27,0.25)',
                }}
              >
                {/* Card Header with branding */}
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      <img src={LOGO_BASE64} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-white text-xs font-bold block">محفظة الجنوب</span>
                      <span className="text-white/60 text-[9px]">South Wallet</span>
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <span className="text-white text-[9px] font-bold">بطاقة عميل</span>
                  </div>
                </div>

                {/* User Info */}
                <div className="px-5 py-3">
                  <p className="text-white text-lg font-bold truncate">
                    {user?.name || 'مستخدم'}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <CreditCard size={12} color="rgba(255,255,255,0.7)" />
                      <span className="text-white/80 text-xs font-mono" dir="ltr">
                        {user?.userId || '------'}
                      </span>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} color="rgba(255,255,255,0.7)" />
                        <span className="text-white/80 text-xs font-mono" dir="ltr">
                          {user.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="px-5 pb-4 flex items-center gap-4">
                  <div
                    className="w-28 h-28 rounded-xl flex items-center justify-center shrink-0 p-2"
                    style={{ background: '#FFFFFF' }}
                  >
                    <QRCodeSVG
                      value={`FAHED:RECEIVE:${user?.userId || ''}:NAME:${encodeURIComponent(user?.name || '')}:PHONE:${user?.phone || ''}`}
                      size={96}
                      level="M"
                      bgColor="#FFFFFF"
                      fgColor="#1a1a1a"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/70 text-[10px] mb-1">امسح الرمز للتحويل</p>
                    <p className="text-white/50 text-[9px] leading-relaxed">
                      يمكن لأي مستخدم مسح هذا الرمز لتحويل الأموال إلى حسابك مباشرة
                    </p>
                    <button
                      onClick={() => setActiveScreen('qr')}
                      className="mt-2 px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#5C1A1B]"
                      style={{ background: 'rgba(255,255,255,0.9)' }}
                    >
                      عرض رمز QR الكامل
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 pb-3 flex items-center justify-between">
                  <span className="text-white/40 text-[8px]">v0.4.6.5</span>
                  {user?.kycStatus === 'verified' && (
                    <div className="flex items-center gap-1">
                      <BadgeCheck size={10} color="rgba(255,255,255,0.7)" />
                      <span className="text-white/70 text-[9px] font-bold">حساب موثق</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick Settings Toggles */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13 }}
        className="px-4 mt-3"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          {/* Dark Mode Toggle */}
          <button
            onClick={() => handleToggle('dark-mode')}
            className="w-full flex items-center gap-3 px-4 py-3.5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)' }}
            >
              {isDark ? <Moon size={18} strokeWidth={1.5} color="#8B5CF6" /> : <Sun size={18} strokeWidth={1.5} color="#F59E0B" />}
            </div>
            <span className="flex-1 text-right text-sm" style={{ color: isDark ? '#DDD' : '#444' }}>
              الوضع الداكن
            </span>
            <div
              className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
              style={{
                background: toggleStates['dark-mode'] ? '#8B5CF6' : (isDark ? '#333' : '#DDD'),
                justifyContent: toggleStates['dark-mode'] ? 'flex-end' : 'flex-start',
              }}
            >
              <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </button>

          {/* Notifications Toggle */}
          <button
            onClick={() => handleToggle('notifications-toggle')}
            className="w-full flex items-center gap-3 px-4 py-3.5"
            style={{
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(92,26,27,0.1)' }}
            >
              <Bell size={18} strokeWidth={1.5} color="#5C1A1B" />
            </div>
            <span className="flex-1 text-right text-sm" style={{ color: isDark ? '#DDD' : '#444' }}>
              الإشعارات
            </span>
            <div
              className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
              style={{
                background: toggleStates['notifications-toggle'] ? '#5C1A1B' : (isDark ? '#333' : '#DDD'),
                justifyContent: toggleStates['notifications-toggle'] ? 'flex-end' : 'flex-start',
              }}
            >
              <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </button>

          {/* Last Login */}
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{
              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59,130,246,0.1)' }}
            >
              <Clock size={18} strokeWidth={1.5} color="#3B82F6" />
            </div>
            <div className="flex-1 text-right">
              <span className="text-sm block" style={{ color: isDark ? '#DDD' : '#444' }}>آخر تسجيل دخول</span>
              <span className="text-[10px]" style={{ color: isDark ? '#888' : '#999' }}>{lastLoginTime}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Referral / Gift Code Sharing Section */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="px-4 mt-3"
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(92,26,27,0.1)' }}
              >
                <Gift size={20} strokeWidth={1.5} color="#5C1A1B" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>شارك كود هدية</h3>
                <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#888' : '#999' }}>دع أصدقائك واحصل على مكافأة</p>
              </div>
            </div>

            {/* Referral Code Display */}
            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-3"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
            >
              <span className="text-[11px]" style={{ color: isDark ? '#888' : '#999' }}>كود الدعوة:</span>
              <span className="flex-1 text-sm font-mono font-bold text-center" style={{ color: '#5C1A1B' }} dir="ltr">
                {user?.userId || '------'}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(user?.userId || '');
                  setCopiedReferral(true);
                  setTimeout(() => setCopiedReferral(false), 2000);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                style={{ background: 'rgba(92,26,27,0.1)' }}
              >
                {copiedReferral ? <Check size={14} color="#10B981" /> : <Copy size={14} color="#5C1A1B" />}
              </button>
            </div>

            {/* Share Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = `🎁 استخدم كود الدعوة ${user?.userId || ''} في تطبيق محفظة الجنوب واحصل على مكافأة!`;
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl active:scale-95 transition-transform"
                style={{ background: 'rgba(37,211,102,0.1)' }}
              >
                <Phone size={16} color="#25D366" />
                <span className="text-xs font-medium" style={{ color: '#25D366' }}>واتساب</span>
              </button>
              <button
                onClick={() => {
                  const text = `🎁 استخدم كود الدعوة ${user?.userId || ''} في تطبيق محفظة الجنوب واحصل على مكافأة!`;
                  navigator.share?.({ text }).catch(() => {
                    navigator.clipboard?.writeText(text);
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl active:scale-95 transition-transform"
                style={{ background: 'rgba(92,26,27,0.08)' }}
              >
                <Share2 size={16} color="#5C1A1B" />
                <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>مشاركة</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Expandable Sections - Jaib Style */}
      {accountSections.map((section, sectionIndex) => {
        const SectionIcon = section.icon;
        const isExpanded = expandedSections.includes(section.id);

        return (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (sectionIndex + 1), duration: 0.4 }}
            className="px-4 mt-3"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: isDark ? '#1A1A1A' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${section.iconColor}12` }}
                >
                  <SectionIcon size={18} strokeWidth={1.5} color={section.iconColor} />
                </div>
                <span className="flex-1 text-right text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  {section.title}
                </span>
                {isExpanded ? (
                  <ChevronUp size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                ) : (
                  <ChevronDown size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                )}
              </button>

              {/* Section Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {section.items.map((item, index) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => item.toggle ? handleToggle(item.id) : handleItemClick(item)}
                          className="w-full flex items-center gap-3 px-4 py-3 active:scale-[0.99] transition-transform"
                          style={{
                            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${item.color}12` }}
                          >
                            <ItemIcon size={16} strokeWidth={1.5} color={item.color} />
                          </div>
                          <span className="flex-1 text-right text-sm" style={{ color: isDark ? '#DDD' : '#444' }}>
                            {item.label}
                          </span>
                          {item.toggle ? (
                            <div
                              className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
                              style={{
                                background: toggleStates[item.id] ? '#5C1A1B' : (isDark ? '#333' : '#DDD'),
                                justifyContent: toggleStates[item.id] ? 'flex-end' : 'flex-start',
                              }}
                            >
                              <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </div>
                          ) : (
                            <ChevronLeft size={16} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}

      {/* Social Links Section */}
      {socialLinks && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="px-4 mt-3"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(92,26,27,0.1)' }}
              >
                <Globe size={18} strokeWidth={1.5} color="#5C1A1B" />
              </div>
              <span className="flex-1 text-right text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                تواصل معنا
              </span>
            </div>
            <div
              className="flex items-center justify-center gap-3 px-4 py-4"
              style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}
            >
              {socialLinks.whatsapp && (
                <a
                  href={`https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(37,211,102,0.12)' }}
                >
                  <Phone size={20} strokeWidth={1.5} color="#25D366" />
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(24,119,242,0.12)' }}
                >
                  <Globe size={20} strokeWidth={1.5} color="#1877F2" />
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Globe size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#1a1a1a'} />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(225,48,108,0.12)' }}
                >
                  <Globe size={20} strokeWidth={1.5} color="#E1306C" />
                </a>
              )}
              {socialLinks.telegram && (
                <a
                  href={socialLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,136,204,0.12)' }}
                >
                  <MessageCircle size={20} strokeWidth={1.5} color="#0088CC" />
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,0,0,0.12)' }}
                >
                  <Globe size={20} strokeWidth={1.5} color="#FF0000" />
                </a>
              )}
              {socialLinks.supportEmail && (
                <a
                  href={`mailto:${socialLinks.supportEmail}`}
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(92,26,27,0.12)' }}
                >
                  <Mail size={20} strokeWidth={1.5} color="#5C1A1B" />
                </a>
              )}
              {socialLinks.contactAdmin && (
                <a
                  href={socialLinks.contactAdmin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.12)' }}
                >
                  <ExternalLink size={20} strokeWidth={1.5} color="#8B5CF6" />
                </a>
              )}
            </div>
            {socialLinks.contactAdminMessage && (
              <div
                className="px-4 pb-3"
                style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}
              >
                <p className="text-xs text-center pt-3 leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
                  {socialLinks.contactAdminMessage}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Password Change Dialog */}
      <AnimatePresence>
        {showPasswordDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setShowPasswordDialog(false); setPasswordError(''); setPasswordSuccess(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl p-5"
              style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                  <Lock size={20} color="#5C1A1B" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تغيير كلمة المرور</h3>
                  <p className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>أدخل كلمة المرور الحالية والجديدة</p>
                </div>
              </div>
              {passwordSuccess ? (
                <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Check size={16} color="#10B981" />
                  <span className="text-sm" style={{ color: '#10B981' }}>تم تغيير كلمة المرور بنجاح!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {passwordError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <Info size={14} color="#EF4444" />
                      <span className="text-xs" style={{ color: '#EF4444' }}>{passwordError}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-medium block mb-1.5" style={{ color: isDark ? '#888' : '#999' }}>كلمة المرور الحالية</span>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <input type={showCurrentPwd ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••" dir="ltr"
                        className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                      <button onClick={() => setShowCurrentPwd(!showCurrentPwd)}>
                        {showCurrentPwd ? <EyeOff size={16} color={isDark ? '#666' : '#AAA'} /> : <Eye size={16} color={isDark ? '#666' : '#AAA'} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium block mb-1.5" style={{ color: isDark ? '#888' : '#999' }}>كلمة المرور الجديدة</span>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <input type={showNewPwd ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr"
                        className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                      <button onClick={() => setShowNewPwd(!showNewPwd)}>
                        {showNewPwd ? <EyeOff size={16} color={isDark ? '#666' : '#AAA'} /> : <Eye size={16} color={isDark ? '#666' : '#AAA'} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium block mb-1.5" style={{ color: isDark ? '#888' : '#999' }}>تأكيد كلمة المرور</span>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="أعد كتابة كلمة المرور" dir="ltr"
                        className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowPasswordDialog(false); setPasswordError(''); }}
                      className="flex-1 py-3 rounded-xl text-sm font-bold"
                      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }}>
                      إلغاء
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleChangePassword}
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                      style={{ background: (isChangingPassword || !currentPassword || !newPassword || !confirmPassword) ? '#555' : '#5C1A1B' }}>
                      {isChangingPassword ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Button */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="px-4 mt-4"
      >
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            color: '#5C1A1B',
          }}
        >
          <LogOut size={18} strokeWidth={1.5} />
          <span className="text-sm font-bold">الخروج من التطبيق</span>
        </button>
        
        {/* Delete Account */}
        <button
          onClick={() => {
            if (confirm('هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.')) {
              if (confirm('سيتم حذف جميع بياناتك ورصيدك نهائياً. هل تريد المتابعة؟')) {
                logout();
              }
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl mt-2"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            color: '#EF4444',
          }}
        >
          <Trash2 size={16} strokeWidth={1.5} />
          <span className="text-xs font-bold">حذف الحساب</span>
        </button>
        
        <p className="text-center text-[10px] mt-2" style={{ color: isDark ? '#444' : '#CCC' }}>
          v 0.5.0
        </p>
      </motion.div>
    </div>
  );
}
