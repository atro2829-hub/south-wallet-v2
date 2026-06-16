'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  User,
  Shield,
  Bell,
  Settings,
  Fingerprint,
  Eye,
  Lock,
  FileText,
  Share2,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CreditCard,
  Globe,
  HelpCircle,
  Info,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Check,
  X,
  LockIcon,
  Clock,
  Download,
  Type,
  Activity,
  ShieldCheck,
  Code,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import {
  isBiometricAvailable,
  authenticateWithBiometric,
  authenticateWithBiometricDetailed,
  setBiometricEnabled as setBiometricEnabledRemote,
  isBiometricLoginEnabled,
  storeBiometricCredentials,
  checkBiometricAvailability,
  setBiometricEnabledForUser,
  setLastLoggedInUser,
  type BiometricAvailability,
} from '@/lib/biometric';

interface SettingsItem {
  id: string;
  label: string;
  icon: typeof User;
  color: string;
  toggle?: boolean;
  screen?: string;
  badge?: string;
  adminOnly?: boolean;
  danger?: boolean;
}

interface SettingsSection {
  id: string;
  title: string;
  icon: typeof User;
  iconColor: string;
  items: SettingsItem[];
}

// ── Activity Log Entry ──────────────────────────────────────────────
interface ActivityLogEntry {
  id: string;
  action: string;
  timestamp: string;
  type: 'security' | 'account' | 'settings' | 'transaction';
}

// ── Default Activity Log ────────────────────────────────────────────
function getActivityLog(): ActivityLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('activity-log');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function addActivityLogEntry(entry: Omit<ActivityLogEntry, 'id'>) {
  if (typeof window === 'undefined') return;
  const log = getActivityLog();
  const newEntry: ActivityLogEntry = {
    ...entry,
    id: `log-${Date.now()}`,
  };
  log.unshift(newEntry);
  // Keep only last 50 entries
  if (log.length > 50) log.length = 50;
  localStorage.setItem('activity-log', JSON.stringify(log));
}

const settingsSections: SettingsSection[] = [
  {
    id: 'account-settings',
    title: 'إعدادات الحساب',
    icon: User,
    iconColor: '#5C1A1B',
    items: [
      { id: 'my-account', label: 'حسابي', icon: User, color: '#5C1A1B', screen: 'edit-profile' },
      { id: 'account-settings-sub', label: 'إعدادات الحساب', icon: Settings, color: '#666', screen: 'edit-profile' },
    ],
  },
  {
    id: 'privacy-security',
    title: 'الخصوصية والأمان',
    icon: Shield,
    iconColor: '#5C1A1B',
    items: [
      { id: 'biometric', label: 'تفعيل البصمة', icon: Fingerprint, color: '#8B5CF6', toggle: true },
      { id: 'pin-code', label: 'رقم التعريف الشخصي', icon: Lock, color: '#F59E0B', screen: 'pin-setup' },
      { id: 'auto-lock', label: 'القفل التلقائي', icon: Clock, color: '#10B981' },
      { id: 'change-password', label: 'تغيير كلمة المرور', icon: Shield, color: '#5C1A1B' },
      { id: 'notif-alerts', label: 'الإشعارات والتنبيهات', icon: Bell, color: '#2563EB', screen: 'notifications' },
    ],
  },
  {
    id: 'app-settings',
    title: 'إعدادات التطبيق',
    icon: Settings,
    iconColor: '#666',
    items: [
      { id: 'general', label: 'الإعدادات العامة', icon: Settings, color: '#666', screen: 'general-settings' },
      { id: 'account-history', label: 'تاريخ الحساب', icon: Clock, color: '#059669' },
      { id: 'export-data', label: 'تصدير البيانات', icon: Download, color: '#8B5CF6' },
      { id: 'font-size', label: 'حجم الخط', icon: Type, color: '#F59E0B' },
      { id: 'clear-cache', label: 'مسح التخزين المؤقت', icon: Trash2, color: '#DC2626' },
      { id: 'maintenance-mode', label: 'وضع الصيانة', icon: Wrench, color: '#6B7280', adminOnly: true },
    ],
  },
  {
    id: 'advanced',
    title: 'الإعدادات المتقدمة',
    icon: ShieldCheck,
    iconColor: '#8B5CF6',
    items: [
      { id: 'activity-log', label: 'سجل النشاط', icon: Activity, color: '#059669' },
      { id: 'advanced-security', label: 'الأمان المتقدم', icon: ShieldCheck, color: '#5C1A1B' },
      { id: 'developer-settings', label: 'إعدادات المطور', icon: Code, color: '#6B7280', toggle: true },
    ],
  },
  {
    id: 'legal',
    title: 'الشروط والأحكام',
    icon: FileText,
    iconColor: '#2563EB',
    items: [
      { id: 'terms', label: 'الشروط والأحكام', icon: FileText, color: '#2563EB', screen: 'legal' },
      { id: 'privacy-policy', label: 'سياسة الخصوصية', icon: Shield, color: '#8B5CF6', screen: 'legal' },
      { id: 'faq', label: 'الأسئلة الشائعة', icon: HelpCircle, color: '#F59E0B', screen: 'legal' },
      { id: 'about', label: 'لمحة عن التطبيق', icon: Info, color: '#10B981', screen: 'legal' },
    ],
  },
  {
    id: 'social',
    title: 'مشاركة التطبيق',
    icon: Share2,
    iconColor: '#10B981',
    items: [
      { id: 'share', label: 'شارك مع أصدقائك', icon: Share2, color: '#10B981' },
      { id: 'support', label: 'الدعم والمساعدة', icon: MessageCircle, color: '#2563EB', screen: 'support' },
    ],
  },
];

// ── General Settings Modal Component ────────────────────────────────
function GeneralSettingsModal({ isDark, onClose }: { isDark: boolean; onClose: () => void }) {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'ar';
    return localStorage.getItem('app-language') || 'ar';
  });
  const [currency, setCurrency] = useState<'YER' | 'SAR' | 'USD'>(() => {
    if (typeof window === 'undefined') return 'YER';
    return (localStorage.getItem('app-currency') as 'YER' | 'SAR' | 'USD') || 'YER';
  });
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('app-notifications');
    return saved === null ? true : saved === 'true';
  });
  const [autoLogin, setAutoLogin] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('auto-login');
    return saved === null ? true : saved === 'true';
  });

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
    // Update the global i18n store so the entire app switches language
    const { useI18nStore } = require('@/lib/i18n');
    useI18nStore.getState().setLanguage(lang as 'ar' | 'en');
  };

  const handleCurrencyChange = (cur: 'YER' | 'SAR' | 'USD') => {
    setCurrency(cur);
    localStorage.setItem('app-currency', cur);
  };

  const handleNotifToggle = () => {
    const newVal = !notifications;
    setNotifications(newVal);
    localStorage.setItem('app-notifications', String(newVal));
  };

  const handleAutoLoginToggle = () => {
    const newVal = !autoLogin;
    setAutoLogin(newVal);
    localStorage.setItem('auto-login', String(newVal));
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const sectionStyle = {
    background: isDark ? '#1A1A1A' : '#FFFFFF',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: isDark ? '#0F0F0F' : '#F5F5F5', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإعدادات العامة</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
        </div>

        <div className="px-5 pb-8 overflow-y-auto max-h-[70vh] space-y-3">
          {/* Language */}
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(37,99,235,0.12)' }}>
                <Globe size={18} strokeWidth={1.5} color="#2563EB" />
              </div>
              <span className="flex-1 text-right text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>اللغة</span>
            </div>
            <div className="flex gap-2 px-4 pb-3">
              {[
                { key: 'ar', label: 'العربية' },
                { key: 'en', label: 'English' },
              ].map((lang) => (
                <button
                  key={lang.key}
                  onClick={() => handleLanguageChange(lang.key)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: language === lang.key ? 'rgba(92,26,27,0.1)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: language === lang.key ? '1.5px solid #5C1A1B' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    color: language === lang.key ? '#5C1A1B' : isDark ? '#AAA' : '#666',
                  }}
                >
                  {language === lang.key && <Check size={14} strokeWidth={2} color="#5C1A1B" />}
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: theme === 'dark' ? 'rgba(139,92,246,0.12)' : 'rgba(245,158,11,0.12)' }}>
                {theme === 'dark' ? <Moon size={18} strokeWidth={1.5} color="#8B5CF6" /> : <Sun size={18} strokeWidth={1.5} color="#F59E0B" />}
              </div>
              <span className="flex-1 text-right text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>المظهر</span>
              <button
                onClick={handleThemeToggle}
                className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
                style={{
                  background: theme === 'dark' ? '#8B5CF6' : '#F59E0B',
                  justifyContent: theme === 'dark' ? 'flex-end' : 'flex-start',
                }}
              >
                <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            <div className="px-4 pb-3">
              <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                {theme === 'dark' ? 'الوضع الداكن مفعّل' : 'الوضع الفاتح مفعّل'}
              </p>
            </div>
          </div>

          {/* Currency */}
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(92,26,27,0.12)' }}>
                <CreditCard size={18} strokeWidth={1.5} color="#5C1A1B" />
              </div>
              <span className="flex-1 text-right text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>العملة الافتراضية</span>
            </div>
            <div className="flex gap-2 px-4 pb-3">
              {(['YER', 'SAR', 'USD'] as const).map((cur) => (
                <button
                  key={cur}
                  onClick={() => handleCurrencyChange(cur)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    background: currency === cur ? 'rgba(92,26,27,0.1)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: currency === cur ? '1.5px solid #5C1A1B' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    color: currency === cur ? '#5C1A1B' : isDark ? '#AAA' : '#666',
                  }}
                >
                  {currency === cur && <Check size={14} strokeWidth={2} color="#5C1A1B" />}
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: notifications ? 'rgba(37,99,235,0.12)' : 'rgba(156,163,175,0.12)' }}>
                {notifications ? <Volume2 size={18} strokeWidth={1.5} color="#2563EB" /> : <VolumeX size={18} strokeWidth={1.5} color="#9CA3AF" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium block text-right" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإشعارات</span>
                <span className="text-[10px] block text-right" style={{ color: isDark ? '#666' : '#AAA' }}>
                  {notifications ? 'الإشعارات مفعّلة' : 'الإشعارات معطّلة'}
                </span>
              </div>
              <button
                onClick={handleNotifToggle}
                className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
                style={{
                  background: notifications ? '#5C1A1B' : (isDark ? '#333' : '#DDD'),
                  justifyContent: notifications ? 'flex-end' : 'flex-start',
                }}
              >
                <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>

          {/* Auto-Login */}
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: autoLogin ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.12)' }}>
                <Shield size={18} strokeWidth={1.5} color={autoLogin ? '#10B981' : '#9CA3AF'} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium block text-right" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تسجيل الدخول تلقائياً</span>
                <span className="text-[10px] block text-right" style={{ color: isDark ? '#666' : '#AAA' }}>
                  {autoLogin ? 'سيتم تسجيل دخولك تلقائياً' : 'يتطلب تسجيل الدخول في كل مرة'}
                </span>
              </div>
              <button
                onClick={handleAutoLoginToggle}
                className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
                style={{
                  background: autoLogin ? '#10B981' : (isDark ? '#333' : '#DDD'),
                  justifyContent: autoLogin ? 'flex-end' : 'flex-start',
                }}
              >
                <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Font Size Modal ─────────────────────────────────────────────────
function FontSizeModal({ isDark, onClose }: { isDark: boolean; onClose: () => void }) {
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(() => {
    if (typeof window === 'undefined') return 'medium';
    const saved = localStorage.getItem('app-font-size');
    if (saved === 'small' || saved === 'medium' || saved === 'large') return saved;
    return 'medium';
  });

  const handleSelect = (size: 'small' | 'medium' | 'large') => {
    setFontSize(size);
    localStorage.setItem('app-font-size', size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const labels: Record<string, string> = { small: 'صغير', medium: 'متوسط', large: 'كبير' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>حجم الخط</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
        </div>
        <div className="px-5 pb-8 space-y-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              onClick={() => handleSelect(size)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all"
              style={{
                background: fontSize === size ? 'rgba(92,26,27,0.08)' : isDark ? '#1A1A1A' : '#FFFFFF',
                border: fontSize === size ? '1.5px solid #5C1A1B' : `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              <div className="flex-1 text-right">
                <span className="text-sm font-medium" style={{ color: fontSize === size ? '#5C1A1B' : isDark ? '#DDD' : '#444' }}>{labels[size]}</span>
              </div>
              {fontSize === size && <Check size={18} strokeWidth={2} color="#5C1A1B" />}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Activity Log Modal ──────────────────────────────────────────────
function ActivityLogModal({ isDark, onClose }: { isDark: boolean; onClose: () => void }) {
  const [logs] = useState<ActivityLogEntry[]>(() => getActivityLog());

  const typeColors: Record<string, string> = {
    security: '#5C1A1B',
    account: '#2563EB',
    settings: '#F59E0B',
    transaction: '#10B981',
  };

  const typeLabels: Record<string, string> = {
    security: 'أمان',
    account: 'حساب',
    settings: 'إعدادات',
    transaction: 'معاملة',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: isDark ? '#0F0F0F' : '#F5F5F5', maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سجل النشاط</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
        </div>
        <div className="px-5 pb-8 overflow-y-auto max-h-[65vh]">
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <Activity size={40} strokeWidth={1} color={isDark ? '#444' : '#CCC'} className="mx-auto mb-3" />
              <p className="text-sm" style={{ color: isDark ? '#666' : '#AAA' }}>لا يوجد سجل نشاط بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? '#1A1A1A' : '#FFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: typeColors[log.type] || '#666' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-right" style={{ color: isDark ? '#DDD' : '#444' }}>{log.action}</p>
                    <p className="text-[10px] text-right" style={{ color: isDark ? '#666' : '#AAA' }}>{new Date(log.timestamp).toLocaleString('ar-SA')}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${typeColors[log.type]}15`, color: typeColors[log.type] }}>
                    {typeLabels[log.type]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Advanced Security Modal ─────────────────────────────────────────
function AdvancedSecurityModal({ isDark, onClose, user }: { isDark: boolean; onClose: () => void; user: { id: string; kycStatus: string; role: string } | null }) {
  const securityScore = (() => {
    let score = 0;
    if (typeof window !== 'undefined') {
      const hasPin = !!localStorage.getItem('fahed-net-store');
      const biometricPref = localStorage.getItem('biometric-login-enabled');
      if (hasPin) score += 25;
      if (biometricPref === 'true') score += 25;
      if (user?.kycStatus === 'verified') score += 30;
      if (user?.role === 'admin' || user?.role === 'owner') score += 20;
    }
    return Math.min(score, 100);
  })();

  const getScoreColor = () => {
    if (securityScore >= 80) return '#10B981';
    if (securityScore >= 50) return '#F59E0B';
    return '#5C1A1B';
  };

  const getScoreLabel = () => {
    if (securityScore >= 80) return 'ممتاز';
    if (securityScore >= 50) return 'جيد';
    if (securityScore >= 25) return 'متوسط';
    return 'ضعيف';
  };

  const recommendations = [
    { key: 'pin', label: 'تعيين رمز PIN', done: securityScore >= 25 },
    { key: 'biometric', label: 'تفعيل البصمة', done: securityScore >= 50 },
    { key: 'kyc', label: 'توثيق الحساب', done: user?.kycStatus === 'verified' },
    { key: '2fa', label: 'المصادقة الثنائية', done: false },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md rounded-t-3xl overflow-hidden"
        style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الأمان المتقدم</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
        </div>
        <div className="px-5 pb-8 space-y-4">
          {/* Score Circle */}
          <div className="flex flex-col items-center py-4">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke={isDark ? '#222' : '#EEE'} strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke={getScoreColor()} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${securityScore * 2.64} 264`}
                  style={{ transition: 'stroke-dasharray 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color: getScoreColor() }}>{securityScore}%</span>
                <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>{getScoreLabel()}</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-right" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>توصيات الأمان</h3>
            {recommendations.map((rec) => (
              <div key={rec.key} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: isDark ? '#1A1A1A' : '#FFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: rec.done ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.12)' }}>
                  {rec.done ? <Check size={12} strokeWidth={2} color="#10B981" /> : <X size={12} strokeWidth={2} color="#9CA3AF" />}
                </div>
                <span className="flex-1 text-right text-sm" style={{ color: rec.done ? (isDark ? '#888' : '#AAA') : (isDark ? '#DDD' : '#444'), textDecoration: rec.done ? 'line-through' : 'none' }}>{rec.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Settings Screen ────────────────────────────────────────────
export default function SettingsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, logout, user, biometricEnabled, setBiometricEnabled, pinCode } = useAppStore();

  const [showGeneralSettings, setShowGeneralSettings] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['account-settings', 'privacy-security']);
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    'auto-login': true,
    'biometric': biometricEnabled,
    'developer-settings': false,
  });
  const [biometricStatus, setBiometricStatus] = useState<BiometricAvailability | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability().then(setBiometricStatus);
  }, []);

  // Sync biometric toggle with store
  useEffect(() => {
    setToggleStates(prev => ({ ...prev, 'biometric': biometricEnabled }));
  }, [biometricEnabled]);

  // Load biometric preference from Firebase on mount
  useEffect(() => {
    if (user?.id) {
      isBiometricLoginEnabled(user.id).then((enabled) => {
        setBiometricEnabled(enabled);
        setToggleStates(prev => ({ ...prev, 'biometric': enabled }));
      });
    }
  }, [user?.id, setBiometricEnabled]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  // ── Biometric Toggle Handler ──────────────────────────────────────
  const handleBiometricToggle = useCallback(async () => {
    if (!user?.id) {
      showToast('يرجى تسجيل الدخول أولاً', 'error');
      return;
    }

    const newEnabled = !toggleStates['biometric'];
    setBiometricLoading(true);

    try {
      if (newEnabled) {
        // Enabling biometric — first check if available
        const avail = await checkBiometricAvailability();
        if (!avail.available) {
          // Show specific reason why biometric is not available
          const reason = avail.errorCode === 'biometryNotEnrolled'
            ? 'لم يتم تسجيل بصمة على هذا الجهاز. سجل بصمة من إعدادات الهاتف أولاً'
            : avail.errorCode === 'noDeviceCredential'
              ? 'يجب تعيين رمز PIN أو كلمة مرور للجهاز أولاً'
              : avail.reason || 'البصمة غير متاحة على هذا الجهاز';
          showToast(reason, 'error');
          setBiometricLoading(false);
          return;
        }
        // Verify biometrics work before enabling — use detailed version for better error messages
        const result = await authenticateWithBiometricDetailed('يرجى التحقق لتفعيل البصمة');
        if (!result.success) {
          // Show specific error message from the biometric system
          const errorMsg = result.errorMessage || 'فشل التحقق بالبصمة';
          showToast(errorMsg, 'error');
          setBiometricLoading(false);
          return;
        }
        // Store credentials for biometric login
        await storeBiometricCredentials(user.id, user.email);
      }

      // Save preference
      await setBiometricEnabledRemote(user.id, newEnabled);

      // Update per-user localStorage flag (persists across logout)
      setBiometricEnabledForUser(user.id, newEnabled);

      // If enabling, also store as last logged-in user
      if (newEnabled) {
        setLastLoggedInUser(user.id);
      }

      setBiometricEnabled(newEnabled);
      setToggleStates(prev => ({ ...prev, 'biometric': newEnabled }));

      addActivityLogEntry({
        action: newEnabled ? 'تم تفعيل البصمة' : 'تم تعطيل البصمة',
        timestamp: new Date().toISOString(),
        type: 'security',
      });

      showToast(newEnabled ? 'تم تفعيل البصمة بنجاح' : 'تم تعطيل البصمة');
    } catch {
      showToast('حدث خطأ، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setBiometricLoading(false);
    }
  }, [user, toggleStates, setBiometricEnabled, showToast]);

  // ── Developer Settings Toggle ─────────────────────────────────────
  const handleDeveloperToggle = useCallback(() => {
    const newVal = !toggleStates['developer-settings'];
    setToggleStates(prev => ({ ...prev, 'developer-settings': newVal }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('debug-mode', String(newVal));
    }
    showToast(newVal ? 'تم تفعيل وضع المطور' : 'تم تعطيل وضع المطور');
    addActivityLogEntry({
      action: newVal ? 'تم تفعيل وضع المطور' : 'تم تعطيل وضع المطور',
      timestamp: new Date().toISOString(),
      type: 'settings',
    });
  }, [toggleStates, showToast]);

  // ── Export Data ───────────────────────────────────────────────────
  const handleExportData = useCallback(async () => {
    if (!user) return;
    try {
      const userData = { ...user };
      // Remove sensitive fields from export
      const exportData = {
        exportDate: new Date().toISOString(),
        user: userData,
        preferences: {
          language: localStorage.getItem('app-language') || 'ar',
          currency: localStorage.getItem('app-currency') || 'YER',
          notifications: localStorage.getItem('app-notifications') !== 'false',
          autoLogin: localStorage.getItem('auto-login') !== 'false',
          biometricEnabled: biometricEnabled,
          fontSize: localStorage.getItem('app-font-size') || 'medium',
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jaib-data-${user.userId || 'user'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addActivityLogEntry({
        action: 'تم تصدير البيانات',
        timestamp: new Date().toISOString(),
        type: 'account',
      });
      showToast('تم تصدير البيانات بنجاح');
    } catch {
      showToast('فشل تصدير البيانات', 'error');
    }
  }, [user, biometricEnabled, showToast]);

  // ── Clear Cache ───────────────────────────────────────────────────
  const handleClearCache = useCallback(() => {
    if (typeof window === 'undefined') return;
    // Keep essential keys — including biometric_enabled_<uid> and last_logged_in_uid for persistence
    const keepKeys = ['fahed-net-store', 'app-language', 'app-currency', 'app-font-size', 'biometric-login-enabled', 'last_logged_in_uid'];
    const keysToKeep = new Set(keepKeys);
    if (user?.id) {
      keysToKeep.add(`biometric-login-enabled-${user.id}`);
      keysToKeep.add(`biometric-cred-${user.id}`);
      keysToKeep.add(`biometric_enabled_${user.id}`);
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.has(key) && !key.startsWith('fahed-net-store')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    addActivityLogEntry({
      action: 'تم مسح التخزين المؤقت',
      timestamp: new Date().toISOString(),
      type: 'settings',
    });
    showToast('تم مسح التخزين المؤقت بنجاح');
  }, [user, showToast]);

  // ── Account History ───────────────────────────────────────────────
  const [accountHistory, setAccountHistory] = useState<string>('');
  const [showAccountHistory, setShowAccountHistory] = useState(false);
  const [showAutoLock, setShowAutoLock] = useState(false);
  const [autoLockTimeout, setAutoLockTimeout] = useState(() => {
    if (typeof window === 'undefined') return 5;
    const saved = localStorage.getItem('auto-lock-timeout');
    return saved ? parseInt(saved, 10) : 5;
  });

  useEffect(() => {
    if (user?.id) {
      const userRef = ref(database, `users/${user.id}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const createdAt = data.createdAt || data.created_at || '';
          setAccountHistory(createdAt);
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  // ── Item Click Handler ────────────────────────────────────────────
  const handleItemClick = useCallback((item: SettingsItem) => {
    if (item.id === 'biometric') {
      handleBiometricToggle();
      return;
    }
    if (item.id === 'developer-settings') {
      handleDeveloperToggle();
      return;
    }
    if (item.toggle) {
      setToggleStates(prev => ({ ...prev, [item.id]: !prev[item.id] }));
      return;
    }
    if (item.id === 'general' || item.id === 'language') {
      setShowGeneralSettings(true);
    } else if (item.id === 'pin-code') {
      setActiveScreen('pin-setup');
    } else if (item.id === 'font-size') {
      setShowFontSize(true);
    } else if (item.id === 'export-data') {
      handleExportData();
    } else if (item.id === 'clear-cache') {
      handleClearCache();
    } else if (item.id === 'auto-lock') {
      setShowAutoLock(true);
    } else if (item.id === 'account-history') {
      setShowAccountHistory(true);
    } else if (item.id === 'activity-log') {
      setShowActivityLog(true);
    } else if (item.id === 'advanced-security') {
      setShowAdvancedSecurity(true);
    } else if (item.screen) {
      setActiveScreen(item.screen);
    }
  }, [handleBiometricToggle, handleDeveloperToggle, handleExportData, handleClearCache, setActiveScreen]);

  const isVerified = user?.kycStatus === 'verified';
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  return (
    <div className="min-h-screen pb-4">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-4 right-4 z-[60] flex justify-center"
          >
            <div className="px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg" style={{
              background: toastMsg.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(92,26,27,0.95)',
              color: '#FFF',
            }}>
              {toastMsg.type === 'success' ? <Check size={16} /> : <X size={16} />}
              <span className="text-sm font-medium">{toastMsg.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => useAppStore.getState().setActiveTab('account')}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإعدادات</h1>
        </div>
      </motion.div>

      {/* Verified User Banner */}
      {isVerified && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 mb-3">
          <div className="rounded-2xl p-3 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <LockIcon size={14} strokeWidth={1.5} color="#10B981" />
            <p className="text-[11px] flex-1" style={{ color: isDark ? '#AAA' : '#666' }}>
              حسابك موثق - البيانات الشخصية مجمدة ولا يمكن تعديلها
            </p>
          </div>
        </motion.div>
      )}

      {/* Settings Sections */}
      <div className="px-4 space-y-3">
        {settingsSections.map((section, sectionIndex) => {
          // Hide admin-only sections/items
          const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;

          const SectionIcon = section.icon;
          const isExpanded = expandedSections.includes(section.id);

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * sectionIndex }}
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
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${section.iconColor}12` }}>
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
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isFrozenField = isVerified && ['my-account'].includes(item.id);
                      const isBiometricItem = item.id === 'biometric';
                      const isDeveloperItem = item.id === 'developer-settings';
                      const isLoadingItem = isBiometricItem && biometricLoading;

                      return (
                        <button
                          key={item.id}
                          onClick={() => !isLoadingItem && handleItemClick(item)}
                          disabled={isLoadingItem}
                          className="w-full flex items-center gap-3 px-4 py-3 active:scale-[0.99] transition-transform"
                          style={{
                            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                            opacity: isLoadingItem ? 0.6 : 1,
                          }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}12` }}>
                            <ItemIcon size={16} strokeWidth={1.5} color={item.color} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-sm block text-right" style={{ color: isDark ? '#DDD' : '#444' }}>
                              {item.label}
                            </span>
                            {/* Biometric availability hint */}
                            {isBiometricItem && biometricStatus && (
                              <span className="text-[10px] block text-right" style={{ color: biometricStatus.available ? '#10B981' : '#5C1A1B' }}>
                                {biometricStatus.available
                                  ? biometricStatus.biometryType === 'face' ? 'Face ID متاح' : 'البصمة متاحة'
                                  : 'غير متاح على هذا الجهاز'}
                              </span>
                            )}
                          </div>

                          {isFrozenField && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>بيانات موثقة</span>
                              <Lock size={12} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
                            </div>
                          )}

                          {item.toggle ? (
                            isLoadingItem ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full"
                              />
                            ) : (
                              <div
                                className="w-11 h-6 rounded-full flex items-center transition-all duration-200 px-0.5"
                                style={{
                                  background: toggleStates[item.id] ? '#5C1A1B' : (isDark ? '#333' : '#DDD'),
                                  justifyContent: toggleStates[item.id] ? 'flex-end' : 'flex-start',
                                }}
                              >
                                <div className="w-5 h-5 rounded-full bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                              </div>
                            )
                          ) : (
                            <ChevronLeft size={16} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Delete Account */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-4 mt-4">
        <button
          className="w-full flex items-center gap-3 p-4 rounded-2xl"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(92,26,27,0.08)' }}>
            <Trash2 size={18} strokeWidth={1.5} color="#5C1A1B" />
          </div>
          <span className="flex-1 text-right text-sm font-bold" style={{ color: '#5C1A1B' }}>
            حذف حسابي نهائياً
          </span>
        </button>
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="px-4 mt-3">
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
      </motion.div>

      {/* Version */}
      <p className="text-center text-[10px] mt-3" style={{ color: isDark ? '#444' : '#CCC' }}>
        v 0.4.6.5
      </p>

      {/* Modals */}
      <AnimatePresence>
        {showGeneralSettings && <GeneralSettingsModal isDark={isDark} onClose={() => setShowGeneralSettings(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showFontSize && <FontSizeModal isDark={isDark} onClose={() => setShowFontSize(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showActivityLog && <ActivityLogModal isDark={isDark} onClose={() => setShowActivityLog(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAdvancedSecurity && <AdvancedSecurityModal isDark={isDark} onClose={() => setShowAdvancedSecurity(false)} user={user} />}
      </AnimatePresence>

      {/* Account History Modal */}
      <AnimatePresence>
        {showAccountHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAccountHistory(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-t-3xl overflow-hidden p-6"
              style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تاريخ الحساب</h2>
                <button onClick={() => setShowAccountHistory(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                  <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl" style={{ background: isDark ? '#1A1A1A' : '#FFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(5,150,105,0.12)' }}>
                      <Clock size={18} strokeWidth={1.5} color="#059669" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-right" style={{ color: isDark ? '#DDD' : '#444' }}>تاريخ التسجيل</p>
                      <p className="text-xs text-right" style={{ color: isDark ? '#888' : '#AAA' }}>
                        {accountHistory ? new Date(accountHistory).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'غير متوفر'}
                      </p>
                    </div>
                  </div>
                </div>
                {user?.userId && (
                  <div className="p-4 rounded-2xl" style={{ background: isDark ? '#1A1A1A' : '#FFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(92,26,27,0.12)' }}>
                        <User size={18} strokeWidth={1.5} color="#5C1A1B" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-right" style={{ color: isDark ? '#DDD' : '#444' }}>رقم الحساب</p>
                        <p className="text-xs text-right font-mono" style={{ color: isDark ? '#888' : '#AAA' }} dir="ltr">{user.userId}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {/* Auto-Lock Timeout Modal */}
        {showAutoLock && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowAutoLock(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-t-3xl overflow-hidden p-6 pb-8"
              style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>القفل التلقائي</h2>
                <button onClick={() => setShowAutoLock(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                  <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
                </button>
              </div>
              <p className="text-xs mb-4" style={{ color: isDark ? '#888' : '#666' }}>سيتم قفل التطبيق تلقائياً بعد فترة عدم النشاط</p>
              <div className="space-y-2">
                {[
                  { value: 1, label: 'دقيقة واحدة' },
                  { value: 3, label: '3 دقائق' },
                  { value: 5, label: '5 دقائق' },
                  { value: 10, label: '10 دقائق' },
                  { value: 15, label: '15 دقيقة' },
                  { value: 30, label: '30 دقيقة' },
                  { value: 0, label: 'إلغاء القفل التلقائي' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setAutoLockTimeout(option.value);
                      localStorage.setItem('auto-lock-timeout', String(option.value));
                      showToast('تم تحديث إعدادات القفل التلقائي', 'success');
                      setTimeout(() => setShowAutoLock(false), 500);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl transition-all"
                    style={{
                      background: autoLockTimeout === option.value ? 'rgba(92,26,27,0.12)' : (isDark ? '#1A1A1A' : '#FFF'),
                      border: `1px solid ${autoLockTimeout === option.value ? 'rgba(92,26,27,0.3)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)')}`,
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: autoLockTimeout === option.value ? '#5C1A1B' : (isDark ? '#DDD' : '#444') }}>
                      {option.label}
                    </span>
                    {autoLockTimeout === option.value && (
                      <Check size={16} color="#5C1A1B" strokeWidth={2.5} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
