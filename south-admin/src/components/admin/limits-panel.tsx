'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save, Loader2, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  ShieldCheck, ShieldAlert, Crown, RefreshCw, AlertTriangle,
  ToggleLeft, ToggleRight, Bitcoin, Network, Fingerprint,
  Bell, Lock, Smartphone, Moon, Gift, QrCode, Users,
  Zap, Receipt, Wallet, TrendingUp, Globe, Wrench,
  PackageCheck, MapPin, Clock, Shield, KeyRound,
  ChevronDown, ChevronUp, Plus, X, Settings, Send,
  Coins, FileText, ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────

interface TierLimits {
  maxSingleTransfer: number;
  maxDailyTransfer: number;
  maxMonthlyTransfer: number;
  maxSingleDeposit: number;
  maxDailyDeposit: number;
  maxBalance: number;
  allowedServices: string[];
}

interface ServiceLimit {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  isActive: boolean;
}

interface TransactionLimitsData {
  nonVerified: TierLimits;
  verified: TierLimits;
  premium: TierLimits;
  perService: Record<string, ServiceLimit>;
}

interface FeatureToggles {
  transfersEnabled: boolean;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  exchangeEnabled: boolean;
  servicesEnabled: boolean;
  rechargeEnabled: boolean;
  billsEnabled: boolean;
  investmentEnabled: boolean;
  cryptoEnabled: boolean;
  giftCodesEnabled: boolean;
  qrPaymentsEnabled: boolean;
  referralEnabled: boolean;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  darkModeEnabled: boolean;
}

interface CryptoLimitEntry {
  code: string;
  name: string;
  minDeposit: number;
  maxDeposit: number;
  minWithdraw: number;
  maxWithdraw: number;
  dailyLimit: number;
  requireKYC: boolean;
  allowedNetworks: string[];
}

interface CryptoLimitsData {
  cryptos: CryptoLimitEntry[];
  globalDailyLimit: number;
  globalRequireKYC: boolean;
}

interface AdvancedSettingsData {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationEnabled: boolean;
  forceUpdateEnabled: boolean;
  minimumAppVersion: string;
  blockedCountries: string[];
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  twoFactorEnabled: boolean;
}

// ─── Constants ───────────────────────────────────────────

const ALL_SERVICES = [
  'transfer', 'deposit', 'withdraw', 'exchange', 'purchase',
  'recharge', 'bills', 'investment', 'crypto',
];

const SERVICE_INFO: Record<string, { label: string; icon: typeof Send; color: string; bg: string }> = {
  transfer: { label: 'تحويل', icon: Send, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  deposit: { label: 'إيداع', icon: ArrowDownCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  withdraw: { label: 'سحب', icon: ArrowUpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  exchange: { label: 'تبادل عملات', icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  purchase: { label: 'شراء', icon: ShoppingBag, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  recharge: { label: 'شحن رصيد', icon: Coins, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  bills: { label: 'فواتير', icon: FileText, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  investment: { label: 'استثمار', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  crypto: { label: 'كريبتو', icon: Bitcoin, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

const FEATURE_DEFINITIONS: { key: keyof FeatureToggles; label: string; description: string; impact: string; icon: typeof Send; color: string; bg: string }[] = [
  { key: 'transfersEnabled', label: 'التحويلات', description: 'تفعيل أو تعطيل خدمة التحويل بين المستخدمين', impact: 'تعطيلها يمنع جميع عمليات التحويل', icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'depositsEnabled', label: 'الإيداع', description: 'تفعيل أو تعطيل خدمة الإيداع', impact: 'تعطيلها يمنع جميع عمليات الإيداع', icon: ArrowDownCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  { key: 'withdrawalsEnabled', label: 'السحب', description: 'تفعيل أو تعطيل خدمة السحب', impact: 'تعطيلها يمنع جميع عمليات السحب', icon: ArrowUpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { key: 'exchangeEnabled', label: 'تبادل العملات', description: 'تفعيل أو تعطيل خدمة تبادل العملات', impact: 'تعطيلها يمنع تحويل العملات الأجنبية والرقمية', icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { key: 'servicesEnabled', label: 'الخدمات الترفيهية', description: 'تفعيل أو تعطيل خدمات الترفيه والبطاقات', impact: 'تعطيلها يخفي قسم الخدمات الترفيهية من التطبيق', icon: Zap, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { key: 'rechargeEnabled', label: 'شحن الرصيد', description: 'تفعيل أو تعطيل خدمة شحن رصيد الهاتف', impact: 'تعطيلها يمنع شحن أرصدة الهواتف', icon: Smartphone, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { key: 'billsEnabled', label: 'دفع الفواتير', description: 'تفعيل أو تعطيل خدمة دفع الفواتير', impact: 'تعطيلها يمنع سداد فواتير الكهرباء والماء وغيرها', icon: Receipt, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { key: 'investmentEnabled', label: 'الاستثمار', description: 'تفعيل أو تعطيل خدمة الاستثمار', impact: 'تعطيلها يخفي خطط الاستثمار من التطبيق', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { key: 'cryptoEnabled', label: 'الكريبتو', description: 'تفعيل أو تعطيل خدمات العملات الرقمية', impact: 'تعطيلها يخفي قسم الكريبتو بالكامل من التطبيق', icon: Bitcoin, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { key: 'giftCodesEnabled', label: 'أكواد الهدايا', description: 'تفعيل أو تعطيل نظام أكواد الهدايا', impact: 'تعطيلها يمنع إنشاء واستخدام أكواد الهدايا', icon: Gift, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { key: 'qrPaymentsEnabled', label: 'دفع QR', description: 'تفعيل أو تعطيل الدفع عبر رمز QR', impact: 'تعطيلها يمنع مسح وإنشاء أكواد QR للدفع', icon: QrCode, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { key: 'referralEnabled', label: 'برنامج الإحالة', description: 'تفعيل أو تعطيل برنامج الدعوة والإحالة', impact: 'تعطيلها يخفي رابط الدعوة والمكافآت', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { key: 'notificationsEnabled', label: 'الإشعارات', description: 'تفعيل أو تعطيل الإشعارات الفورية', impact: 'تعطيلها يوقف جميع إشعارات Push', icon: Bell, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { key: 'biometricEnabled', label: 'البصمة', description: 'تفعيل أو تعطيل تسجيل الدخول بالبصمة', impact: 'تعطيلها يمنع استخدام البصمة/Face ID', icon: Fingerprint, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { key: 'pinEnabled', label: 'رمز PIN', description: 'تفعيل أو تعطيل رمز PIN للدخول', impact: 'تعطيلها يمنع إعداد واستخدام رمز PIN', icon: Lock, color: 'text-red-500', bg: 'bg-red-500/10' },
  { key: 'darkModeEnabled', label: 'الوضع الداكن', description: 'تفعيل أو تعطيل الوضع الداكن في التطبيق', impact: 'تعطيلها يجبر المستخدمين على الوضع الفاتح', icon: Moon, color: 'text-slate-500', bg: 'bg-slate-500/10' },
];

const CRYPTO_PRESETS = [
  { code: 'USDT', name: 'تيثر' },
  { code: 'BTC', name: 'بيتكوين' },
  { code: 'ETH', name: 'إيثريوم' },
  { code: 'BNB', name: 'بينانس' },
  { code: 'SOL', name: 'سولانا' },
  { code: 'XRP', name: 'ريبل' },
  { code: 'ADA', name: 'كاردانو' },
  { code: 'DOGE', name: 'دوج كوين' },
];

const NETWORK_PRESETS = ['TRC20', 'ERC20', 'BEP20', 'Bitcoin', 'Solana', 'Polygon', 'Arbitrum', 'Optimism'];

const DEFAULT_TIER_NON_VERIFIED: TierLimits = {
  maxSingleTransfer: 50000,
  maxDailyTransfer: 100000,
  maxMonthlyTransfer: 500000,
  maxSingleDeposit: 100000,
  maxDailyDeposit: 200000,
  maxBalance: 500000,
  allowedServices: ['transfer', 'deposit', 'withdraw'],
};

const DEFAULT_TIER_VERIFIED: TierLimits = {
  maxSingleTransfer: 500000,
  maxDailyTransfer: 1000000,
  maxMonthlyTransfer: 5000000,
  maxSingleDeposit: 1000000,
  maxDailyDeposit: 2000000,
  maxBalance: 10000000,
  allowedServices: ALL_SERVICES,
};

const DEFAULT_TIER_PREMIUM: TierLimits = {
  maxSingleTransfer: 0,
  maxDailyTransfer: 0,
  maxMonthlyTransfer: 0,
  maxSingleDeposit: 0,
  maxDailyDeposit: 0,
  maxBalance: 0,
  allowedServices: ALL_SERVICES,
};

const DEFAULT_PER_SERVICE: Record<string, ServiceLimit> = {};
ALL_SERVICES.forEach(s => {
  DEFAULT_PER_SERVICE[s] = { minAmount: 100, maxAmount: 5000000, dailyLimit: 10000000, monthlyLimit: 50000000, isActive: true };
});

const DEFAULT_FEATURES: FeatureToggles = {
  transfersEnabled: true,
  depositsEnabled: true,
  withdrawalsEnabled: true,
  exchangeEnabled: true,
  servicesEnabled: true,
  rechargeEnabled: true,
  billsEnabled: true,
  investmentEnabled: true,
  cryptoEnabled: true,
  giftCodesEnabled: true,
  qrPaymentsEnabled: true,
  referralEnabled: true,
  notificationsEnabled: true,
  biometricEnabled: true,
  pinEnabled: true,
  darkModeEnabled: true,
};

const DEFAULT_CRYPTO_LIMITS: CryptoLimitsData = {
  cryptos: CRYPTO_PRESETS.map(c => ({
    code: c.code,
    name: c.name,
    minDeposit: c.code === 'BTC' ? 0.0001 : c.code === 'ETH' ? 0.001 : 10,
    maxDeposit: c.code === 'BTC' ? 5 : c.code === 'ETH' ? 50 : 100000,
    minWithdraw: c.code === 'BTC' ? 0.0002 : c.code === 'ETH' ? 0.002 : 20,
    maxWithdraw: c.code === 'BTC' ? 2 : c.code === 'ETH' ? 20 : 50000,
    dailyLimit: c.code === 'BTC' ? 10 : c.code === 'ETH' ? 100 : 200000,
    requireKYC: true,
    allowedNetworks: c.code === 'USDT' ? ['TRC20', 'ERC20', 'BEP20']
      : c.code === 'BTC' ? ['Bitcoin']
      : c.code === 'ETH' ? ['ERC20']
      : c.code === 'BNB' ? ['BEP20']
      : c.code === 'SOL' ? ['Solana']
      : [],
  })),
  globalDailyLimit: 500000,
  globalRequireKYC: true,
};

const DEFAULT_ADVANCED: AdvancedSettingsData = {
  maintenanceMode: false,
  maintenanceMessage: 'نظام الصيانة جارٍ، نعود قريباً',
  registrationEnabled: true,
  forceUpdateEnabled: false,
  minimumAppVersion: '1.0.0',
  blockedCountries: [],
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  sessionTimeout: 60,
  twoFactorEnabled: false,
};

// ─── Main Component ──────────────────────────────────────

export default function LimitsPanel() {
  const { showToast } = useAdminStore();

  // ── Data State ──
  const [limits, setLimits] = useState<TransactionLimitsData>({
    nonVerified: DEFAULT_TIER_NON_VERIFIED,
    verified: DEFAULT_TIER_VERIFIED,
    premium: DEFAULT_TIER_PREMIUM,
    perService: DEFAULT_PER_SERVICE,
  });
  const [features, setFeatures] = useState<FeatureToggles>(DEFAULT_FEATURES);
  const [cryptoLimits, setCryptoLimits] = useState<CryptoLimitsData>(DEFAULT_CRYPTO_LIMITS);
  const [advanced, setAdvanced] = useState<AdvancedSettingsData>(DEFAULT_ADVANCED);

  // ── UI State ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('limits');
  const [expandedTier, setExpandedTier] = useState<string | null>('nonVerified');
  const [expandedCrypto, setExpandedCrypto] = useState<string | null>(null);
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newNetworkCode, setNewNetworkCode] = useState('');
  const [addingNetworkForCrypto, setAddingNetworkForCrypto] = useState<string | null>(null);

  // ── Firebase Listeners ──
  useEffect(() => {
    const limitsRef = ref(database, 'adminSettings/limits');
    const unsub1 = onValue(limitsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLimits({
          nonVerified: { ...DEFAULT_TIER_NON_VERIFIED, ...(data.nonVerified || {}) },
          verified: { ...DEFAULT_TIER_VERIFIED, ...(data.verified || {}) },
          premium: { ...DEFAULT_TIER_PREMIUM, ...(data.premium || {}) },
          perService: { ...DEFAULT_PER_SERVICE, ...(data.perService || {}) },
        });
      }
    });

    const featuresRef = ref(database, 'adminSettings/features');
    const unsub2 = onValue(featuresRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setFeatures({ ...DEFAULT_FEATURES, ...data });
      }
    });

    const cryptoRef = ref(database, 'adminSettings/cryptoLimits');
    const unsub3 = onValue(cryptoRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCryptoLimits({
          cryptos: data.cryptos || DEFAULT_CRYPTO_LIMITS.cryptos,
          globalDailyLimit: data.globalDailyLimit || DEFAULT_CRYPTO_LIMITS.globalDailyLimit,
          globalRequireKYC: data.globalRequireKYC !== undefined ? data.globalRequireKYC : true,
        });
      }
    });

    const advancedRef = ref(database, 'adminSettings/advancedSettings');
    const unsub4 = onValue(advancedRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setAdvanced({ ...DEFAULT_ADVANCED, ...data, blockedCountries: data.blockedCountries || [] });
      }
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  // ── Save Handlers ──
  const handleSaveLimits = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/limits'), limits);
      showToast('تم حفظ حدود المعاملات بنجاح', 'success');
    } catch {
      showToast('حدث خطأ في حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/features'), features);
      showToast('تم حفظ إعدادات المميزات بنجاح', 'success');
    } catch {
      showToast('حدث خطأ في حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCrypto = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/cryptoLimits'), cryptoLimits);
      showToast('تم حفظ حدود الكريبتو بنجاح', 'success');
    } catch {
      showToast('حدث خطأ في حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdvanced = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/advancedSettings'), advanced);
      showToast('تم حفظ الإعدادات المتقدمة بنجاح', 'success');
    } catch {
      showToast('حدث خطأ في حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Tier Limit Updater ──
  const updateTierLimit = (tier: 'nonVerified' | 'verified' | 'premium', field: keyof TierLimits, value: number | string[] | string) => {
    setLimits(prev => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  };

  // ── Service Limit Updater ──
  const updateServiceLimit = (service: string, field: keyof ServiceLimit, value: number | boolean) => {
    setLimits(prev => ({
      ...prev,
      perService: {
        ...prev.perService,
        [service]: { ...prev.perService[service], [field]: value },
      },
    }));
  };

  // ── Feature Toggle ──
  const toggleFeature = async (key: keyof FeatureToggles) => {
    const newValue = !features[key];
    setFeatures(prev => ({ ...prev, [key]: newValue }));
    try {
      await update(ref(database, 'adminSettings/features'), { [key]: newValue });
      const featureDef = FEATURE_DEFINITIONS.find(f => f.key === key);
      showToast(`${featureDef?.label || key}: ${newValue ? 'مفعّل' : 'معطّل'}`, 'success');
    } catch {
      showToast('حدث خطأ في تحديث الميزة', 'error');
      setFeatures(prev => ({ ...prev, [key]: !newValue }));
    }
  };

  // ── Crypto Limit Updater ──
  const updateCryptoLimit = (code: string, field: keyof CryptoLimitEntry, value: number | boolean) => {
    setCryptoLimits(prev => ({
      ...prev,
      cryptos: prev.cryptos.map(c => c.code === code ? { ...c, [field]: value } : c),
    }));
  };

  const addNetworkToCrypto = (code: string, network: string) => {
    if (!network.trim()) return;
    setCryptoLimits(prev => ({
      ...prev,
      cryptos: prev.cryptos.map(c => {
        if (c.code === code && !c.allowedNetworks.includes(network)) {
          return { ...c, allowedNetworks: [...c.allowedNetworks, network] };
        }
        return c;
      }),
    }));
    setNewNetworkCode('');
    setAddingNetworkForCrypto(null);
  };

  const removeNetworkFromCrypto = (code: string, network: string) => {
    setCryptoLimits(prev => ({
      ...prev,
      cryptos: prev.cryptos.map(c => {
        if (c.code === code) {
          return { ...c, allowedNetworks: c.allowedNetworks.filter(n => n !== network) };
        }
        return c;
      }),
    }));
  };

  // ── Advanced Settings Updater ──
  const updateAdvanced = (field: keyof AdvancedSettingsData, value: unknown) => {
    setAdvanced(prev => ({ ...prev, [field]: value }));
  };

  const addBlockedCountry = () => {
    const code = newCountryCode.trim().toUpperCase();
    if (!code || code.length !== 2) {
      showToast('يرجى إدخال رمز دولة مكون من حرفين (مثل: US)', 'error');
      return;
    }
    if (advanced.blockedCountries.includes(code)) {
      showToast('هذه الدولة مضافة مسبقاً', 'error');
      return;
    }
    updateAdvanced('blockedCountries', [...advanced.blockedCountries, code]);
    setNewCountryCode('');
  };

  const removeBlockedCountry = (code: string) => {
    updateAdvanced('blockedCountries', advanced.blockedCountries.filter(c => c !== code));
  };

  // ── Toggle Allowed Service for Tier ──
  const toggleAllowedService = (tier: 'nonVerified' | 'verified' | 'premium', service: string) => {
    const current = limits[tier].allowedServices;
    if (current.includes(service)) {
      updateTierLimit(tier, 'allowedServices', current.filter(s => s !== service));
    } else {
      updateTierLimit(tier, 'allowedServices', [...current, service]);
    }
  };

  // ── Stats ──
  const enabledFeaturesCount = Object.values(features).filter(Boolean).length;
  const activeServicesCount = Object.values(limits.perService).filter(s => s.isActive).length;
  const activeCryptosCount = cryptoLimits.cryptos.length;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render: Stats Cards ──
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-purple-500/10">
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">3</p>
          <p className="text-[11px] text-muted-foreground">مستويات المستخدمين</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-green-500/10">
            <ToggleRight className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{enabledFeaturesCount}/{FEATURE_DEFINITIONS.length}</p>
          <p className="text-[11px] text-muted-foreground">ميزة مفعّلة</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-amber-500/10">
            <Bitcoin className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{activeCryptosCount}</p>
          <p className="text-[11px] text-muted-foreground">عملة رقمية</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-emerald-500/10">
            <Settings className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{activeServicesCount}</p>
          <p className="text-[11px] text-muted-foreground">خدمة نشطة</p>
        </div>
      </motion.div>
    </div>
  );

  // ── Render: Tier Card ──
  const renderTierCard = (
    tierKey: 'nonVerified' | 'verified' | 'premium',
    tier: TierLimits,
    title: string,
    subtitle: string,
    icon: typeof ShieldAlert,
    color: string,
    bg: string,
  ) => {
    const isExpanded = expandedTier === tierKey;
    return (
      <motion.div layout className="ios-card">
        <div className="p-4">
          <button
            onClick={() => setExpandedTier(isExpanded ? null : tierKey)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', bg)}>
                <icon className={cn('w-5 h-5', color)} />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tierKey === 'premium' && (
                <Badge className="bg-amber-500/20 text-amber-600 text-[9px]">مخصص</Badge>
              )}
              {tierKey === 'verified' && (
                <Badge className="bg-green-500/20 text-green-600 text-[9px]">الكل</Badge>
              )}
              {tierKey === 'nonVerified' && (
                <Badge className="bg-red-500/20 text-red-600 text-[9px]">أساسي</Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                  {/* Transfer Limits */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                      حدود التحويل
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">حد التحويل الفردي</Label>
                        <Input
                          type="number"
                          value={tier.maxSingleTransfer || ''}
                          onChange={(e) => updateTierLimit(tierKey, 'maxSingleTransfer', parseInt(e.target.value) || 0)}
                          dir="ltr"
                          className="h-9 text-sm"
                          placeholder="0 = بلا حد"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">الحد اليومي للتحويل</Label>
                        <Input
                          type="number"
                          value={tier.maxDailyTransfer || ''}
                          onChange={(e) => updateTierLimit(tierKey, 'maxDailyTransfer', parseInt(e.target.value) || 0)}
                          dir="ltr"
                          className="h-9 text-sm"
                          placeholder="0 = بلا حد"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">الحد الشهري للتحويل</Label>
                        <Input
                          type="number"
                          value={tier.maxMonthlyTransfer || ''}
                          onChange={(e) => updateTierLimit(tierKey, 'maxMonthlyTransfer', parseInt(e.target.value) || 0)}
                          dir="ltr"
                          className="h-9 text-sm"
                          placeholder="0 = بلا حد"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deposit Limits */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <ArrowDownCircle className="w-3.5 h-3.5 text-green-500" />
                      حدود الإيداع
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">حد الإيداع الفردي</Label>
                        <Input
                          type="number"
                          value={tier.maxSingleDeposit || ''}
                          onChange={(e) => updateTierLimit(tierKey, 'maxSingleDeposit', parseInt(e.target.value) || 0)}
                          dir="ltr"
                          className="h-9 text-sm"
                          placeholder="0 = بلا حد"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">الحد اليومي للإيداع</Label>
                        <Input
                          type="number"
                          value={tier.maxDailyDeposit || ''}
                          onChange={(e) => updateTierLimit(tierKey, 'maxDailyDeposit', parseInt(e.target.value) || 0)}
                          dir="ltr"
                          className="h-9 text-sm"
                          placeholder="0 = بلا حد"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Balance Limit */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-purple-500" />
                      حد الرصيد
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-muted-foreground">الحد الأقصى للرصيد</Label>
                        <Input
                          type="number"
                          value={tier.maxBalance || ''}
                          onChange={(e) => updateTierLimit(tierKey, 'maxBalance', parseInt(e.target.value) || 0)}
                          dir="ltr"
                          className="h-9 text-sm"
                          placeholder="0 = بلا حد"
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <div className="w-full p-2.5 rounded-lg bg-muted/30 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">الرصيد الحالي الأقصى:</span>
                          <span className="text-sm font-bold text-foreground" dir="ltr">
                            {tier.maxBalance > 0 ? formatNumber(tier.maxBalance) : '∞'} ر.ي
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Allowed Services */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-pink-500" />
                      الخدمات المسموحة
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SERVICES.map(svc => {
                        const info = SERVICE_INFO[svc];
                        const isAllowed = tier.allowedServices.includes(svc);
                        return (
                          <button
                            key={svc}
                            onClick={() => toggleAllowedService(tierKey, svc)}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border',
                              isAllowed
                                ? `${info.bg} ${info.color} border-transparent`
                                : 'bg-muted/30 text-muted-foreground border-border/50 opacity-50'
                            )}
                          >
                            <info.icon className="w-3 h-3" />
                            {info.label}
                            {isAllowed && <span className="text-[8px]">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="p-2 rounded-lg bg-muted/30">
                      <p className="text-[9px] text-muted-foreground">التحويل الفردي</p>
                      <p className="text-xs font-medium text-foreground" dir="ltr">
                        {tier.maxSingleTransfer > 0 ? formatNumber(tier.maxSingleTransfer) : '∞'} ر.ي
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <p className="text-[9px] text-muted-foreground">اليومي تحويل</p>
                      <p className="text-xs font-medium text-foreground" dir="ltr">
                        {tier.maxDailyTransfer > 0 ? formatNumber(tier.maxDailyTransfer) : '∞'} ر.ي
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <p className="text-[9px] text-muted-foreground">الإيداع الفردي</p>
                      <p className="text-xs font-medium text-foreground" dir="ltr">
                        {tier.maxSingleDeposit > 0 ? formatNumber(tier.maxSingleDeposit) : '∞'} ر.ي
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30">
                      <p className="text-[9px] text-muted-foreground">خدمات مسموحة</p>
                      <p className="text-xs font-medium text-foreground">{tier.allowedServices.length}/{ALL_SERVICES.length}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  // ── Render: Tab 1 - Transaction Limits ──
  const renderLimitsTab = () => (
    <div className="space-y-4">
      {/* Tier Cards */}
      <div className="space-y-3">
        {renderTierCard('nonVerified', limits.nonVerified, 'مستخدم غير موثّق', 'حدود أساسية للمستخدمين بدون توثيق', ShieldAlert, 'text-red-500', 'bg-red-500/10')}
        {renderTierCard('verified', limits.verified, 'مستخدم موثّق', 'حدود كاملة بعد التحقق من الهوية', ShieldCheck, 'text-green-500', 'bg-green-500/10')}
        {renderTierCard('premium', limits.premium, 'مستخدم مميز (VIP)', 'حدود مخصصة - أدخل 0 لبلا حد', Crown, 'text-amber-500', 'bg-amber-500/10')}
      </div>

      {/* Per-Service Limits */}
      <div className="ios-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Settings className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">حدود الخدمات الفردية</p>
              <p className="text-[11px] text-muted-foreground">تحديد حدود خاصة بكل خدمة</p>
            </div>
          </div>
          <Badge className="bg-purple-500/20 text-purple-600 text-[9px]">YER</Badge>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
          {ALL_SERVICES.map(svc => {
            const info = SERVICE_INFO[svc];
            const svcLimit = limits.perService[svc] || { minAmount: 0, maxAmount: 0, dailyLimit: 0, monthlyLimit: 0, isActive: true };
            return (
              <motion.div
                key={svc}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'p-3 rounded-xl border transition-colors',
                  svcLimit.isActive ? 'bg-background border-border/30' : 'bg-muted/20 border-border/10 opacity-60'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded-lg', info.bg)}>
                      <info.icon className={cn('w-3.5 h-3.5', info.color)} />
                    </div>
                    <span className="text-xs font-medium text-foreground">{info.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={cn(
                      'text-[9px]',
                      svcLimit.isActive ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
                    )}>
                      {svcLimit.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                    <div
                      onClick={() => updateServiceLimit(svc, 'isActive', !svcLimit.isActive)}
                      className={cn('ios-toggle shrink-0 !w-[38px] !h-[24px]', svcLimit.isActive && 'active')}
                    />
                  </div>
                </div>
                {svcLimit.isActive && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <div>
                      <Label className="text-[9px] text-muted-foreground">الحد الأدنى</Label>
                      <Input
                        type="number"
                        value={svcLimit.minAmount || ''}
                        onChange={(e) => updateServiceLimit(svc, 'minAmount', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">الحد الأقصى</Label>
                      <Input
                        type="number"
                        value={svcLimit.maxAmount || ''}
                        onChange={(e) => updateServiceLimit(svc, 'maxAmount', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">اليومي</Label>
                      <Input
                        type="number"
                        value={svcLimit.dailyLimit || ''}
                        onChange={(e) => updateServiceLimit(svc, 'dailyLimit', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">الشهري</Label>
                      <Input
                        type="number"
                        value={svcLimit.monthlyLimit || ''}
                        onChange={(e) => updateServiceLimit(svc, 'monthlyLimit', parseInt(e.target.value) || 0)}
                        dir="ltr"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveLimits} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ حدود المعاملات
        </Button>
      </div>
    </div>
  );

  // ── Render: Tab 2 - Feature Control ──
  const renderFeaturesTab = () => (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="ios-card p-3">
          <div className="flex items-center gap-2">
            <ToggleRight className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">مفعّل</span>
          </div>
          <p className="text-lg font-bold text-green-600 mt-1">{enabledFeaturesCount}</p>
        </div>
        <div className="ios-card p-3">
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">معطّل</span>
          </div>
          <p className="text-lg font-bold text-red-600 mt-1">{FEATURE_DEFINITIONS.length - enabledFeaturesCount}</p>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto scrollbar-thin">
        {FEATURE_DEFINITIONS.map((feat, i) => {
          const isEnabled = features[feat.key];
          return (
            <motion.div
              key={feat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                'ios-card transition-colors',
                !isEnabled && 'opacity-70'
              )}
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn('p-2 rounded-xl shrink-0', feat.bg)}>
                      <feat.icon className={cn('w-4 h-4', feat.color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{feat.label}</p>
                        <Badge className={cn(
                          'text-[9px]',
                          isEnabled ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                        )}>
                          {isEnabled ? 'مفعّل' : 'معطّل'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{feat.description}</p>
                    </div>
                  </div>
                  <div
                    onClick={() => toggleFeature(feat.key)}
                    className={cn('ios-toggle shrink-0 !w-[51px] !h-[31px] cursor-pointer', isEnabled && 'active')}
                  />
                </div>
                {!isEnabled && (
                  <div className="mt-2 flex items-center gap-1.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">{feat.impact}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveFeatures} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ إعدادات المميزات
        </Button>
      </div>
    </div>
  );

  // ── Render: Tab 3 - Crypto Limits ──
  const renderCryptoTab = () => (
    <div className="space-y-4">
      {/* Global Crypto Settings */}
      <div className="ios-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <Globe className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">إعدادات الكريبتو العامة</p>
            <p className="text-[11px] text-muted-foreground">إعدادات تنطبق على جميع العملات الرقمية</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">الحد اليومي العالمي للكريبتو (YER)</Label>
            <Input
              type="number"
              value={cryptoLimits.globalDailyLimit || ''}
              onChange={(e) => setCryptoLimits(prev => ({ ...prev, globalDailyLimit: parseInt(e.target.value) || 0 }))}
              dir="ltr"
              className="h-9 text-sm"
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-foreground">طلب توثيق (KYC) للكريبتو</p>
              <p className="text-[11px] text-muted-foreground">يتطلب توثيق الهوية لعمليات الكريبتو</p>
            </div>
            <div
              onClick={() => setCryptoLimits(prev => ({ ...prev, globalRequireKYC: !prev.globalRequireKYC }))}
              className={cn('ios-toggle shrink-0 !w-[51px] !h-[31px] cursor-pointer', cryptoLimits.globalRequireKYC && 'active')}
            />
          </div>
        </div>
      </div>

      {/* Per-Crypto Limits */}
      <div className="space-y-2 max-h-[calc(100vh-480px)] overflow-y-auto scrollbar-thin">
        {cryptoLimits.cryptos.map((crypto, i) => {
          const isExpanded = expandedCrypto === crypto.code;
          return (
            <motion.div
              key={crypto.code}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="ios-card"
            >
              <div className="p-4">
                <button
                  onClick={() => setExpandedCrypto(isExpanded ? null : crypto.code)}
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Bitcoin className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{crypto.name}</p>
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{crypto.code}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        إيداع: {crypto.minDeposit} - {crypto.maxDeposit} • سحب: {crypto.minWithdraw} - {crypto.maxWithdraw}
                        {crypto.allowedNetworks.length > 0 && ` • ${crypto.allowedNetworks.length} شبكة`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {crypto.requireKYC && (
                      <Badge className="bg-blue-500/20 text-blue-600 text-[9px]">KYC</Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                        {/* Deposit Limits */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <ArrowDownCircle className="w-3.5 h-3.5 text-green-500" />
                            حدود الإيداع
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">الحد الأدنى للإيداع</Label>
                              <Input
                                type="number"
                                value={crypto.minDeposit || ''}
                                onChange={(e) => updateCryptoLimit(crypto.code, 'minDeposit', parseFloat(e.target.value) || 0)}
                                dir="ltr"
                                className="h-9 text-sm"
                                step="any"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">الحد الأقصى للإيداع</Label>
                              <Input
                                type="number"
                                value={crypto.maxDeposit || ''}
                                onChange={(e) => updateCryptoLimit(crypto.code, 'maxDeposit', parseFloat(e.target.value) || 0)}
                                dir="ltr"
                                className="h-9 text-sm"
                                step="any"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Withdrawal Limits */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <ArrowUpCircle className="w-3.5 h-3.5 text-orange-500" />
                            حدود السحب
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">الحد الأدنى للسحب</Label>
                              <Input
                                type="number"
                                value={crypto.minWithdraw || ''}
                                onChange={(e) => updateCryptoLimit(crypto.code, 'minWithdraw', parseFloat(e.target.value) || 0)}
                                dir="ltr"
                                className="h-9 text-sm"
                                step="any"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">الحد الأقصى للسحب</Label>
                              <Input
                                type="number"
                                value={crypto.maxWithdraw || ''}
                                onChange={(e) => updateCryptoLimit(crypto.code, 'maxWithdraw', parseFloat(e.target.value) || 0)}
                                dir="ltr"
                                className="h-9 text-sm"
                                step="any"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Daily Limit */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                            الحد اليومي
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] text-muted-foreground">الحد اليومي للمعاملات</Label>
                              <Input
                                type="number"
                                value={crypto.dailyLimit || ''}
                                onChange={(e) => updateCryptoLimit(crypto.code, 'dailyLimit', parseFloat(e.target.value) || 0)}
                                dir="ltr"
                                className="h-9 text-sm"
                                step="any"
                              />
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                              <div>
                                <p className="text-xs font-medium text-foreground">طلب KYC</p>
                                <p className="text-[10px] text-muted-foreground">يتطلب توثيق لهذه العملة</p>
                              </div>
                              <div
                                onClick={() => updateCryptoLimit(crypto.code, 'requireKYC', !crypto.requireKYC)}
                                className={cn('ios-toggle shrink-0 !w-[42px] !h-[26px] cursor-pointer', crypto.requireKYC && 'active')}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Allowed Networks */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Network className="w-3.5 h-3.5 text-cyan-500" />
                            الشبكات المسموحة
                          </p>
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {crypto.allowedNetworks.map(net => (
                                <div key={net} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                  <span className="text-[10px] font-medium text-cyan-600">{net}</span>
                                  <button
                                    onClick={() => removeNetworkFromCrypto(crypto.code, net)}
                                    className="text-cyan-400 hover:text-red-500 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {crypto.allowedNetworks.length === 0 && (
                                <span className="text-[10px] text-muted-foreground">لا توجد شبكات مسموحة</span>
                              )}
                            </div>

                            {/* Add Network */}
                            {addingNetworkForCrypto === crypto.code ? (
                              <div className="flex gap-2 items-center">
                                <div className="flex flex-wrap gap-1">
                                  {NETWORK_PRESETS.filter(p => !crypto.allowedNetworks.includes(p)).map(preset => (
                                    <button
                                      key={preset}
                                      onClick={() => addNetworkToCrypto(crypto.code, preset)}
                                      className="px-2 py-1 text-[9px] rounded-md bg-muted/50 hover:bg-purple-500/10 hover:text-purple-600 transition-colors"
                                    >
                                      + {preset}
                                    </button>
                                  ))}
                                </div>
                                <Input
                                  value={newNetworkCode}
                                  onChange={(e) => setNewNetworkCode(e.target.value)}
                                  placeholder="أو اكتب اسم شبكة..."
                                  dir="ltr"
                                  className="h-7 text-xs w-36"
                                  onKeyDown={(e) => e.key === 'Enter' && addNetworkToCrypto(crypto.code, newNetworkCode)}
                                />
                                <Button size="sm" variant="ghost" className="h-7" onClick={() => { setAddingNetworkForCrypto(null); setNewNetworkCode(''); }}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px]"
                                onClick={() => setAddingNetworkForCrypto(crypto.code)}
                              >
                                <Plus className="w-3 h-3 ml-1" />
                                إضافة شبكة
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveCrypto} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ حدود الكريبتو
        </Button>
      </div>
    </div>
  );

  // ── Render: Tab 4 - Advanced Settings ──
  const renderAdvancedTab = () => (
    <div className="space-y-4">
      {/* Maintenance Mode */}
      <div className={cn('ios-card p-4', advanced.maintenanceMode && 'ring-2 ring-red-500/30')}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">وضع الصيانة</p>
              <p className="text-[11px] text-muted-foreground">تعطيل التطبيق بالكامل مع رسالة للمستخدمين</p>
            </div>
          </div>
          <div
            onClick={() => updateAdvanced('maintenanceMode', !advanced.maintenanceMode)}
            className={cn('ios-toggle shrink-0 !w-[51px] !h-[31px] cursor-pointer', advanced.maintenanceMode && 'active')}
          />
        </div>
        {advanced.maintenanceMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <p className="text-[10px] text-red-600 dark:text-red-400">⚠️ التطبيق معطل حالياً! المستخدمون سيرون رسالة الصيانة فقط.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">رسالة الصيانة</Label>
              <Textarea
                value={advanced.maintenanceMessage}
                onChange={(e) => updateAdvanced('maintenanceMessage', e.target.value)}
                className="text-sm min-h-[60px]"
                placeholder="نظام الصيانة جارٍ، نعود قريباً"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Registration & Update */}
      <div className="ios-card p-4">
        <div className="space-y-4">
          {/* Registration Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-green-500/10">
                <Users className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">التسجيل الجديد</p>
                <p className="text-[11px] text-muted-foreground">السماح بتسجيل حسابات جديدة</p>
              </div>
            </div>
            <div
              onClick={() => updateAdvanced('registrationEnabled', !advanced.registrationEnabled)}
              className={cn('ios-toggle shrink-0 !w-[51px] !h-[31px] cursor-pointer', advanced.registrationEnabled && 'active')}
            />
          </div>

          {/* Force Update */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <PackageCheck className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">فرض التحديث</p>
                  <p className="text-[11px] text-muted-foreground">إجبار المستخدمين على تحديث التطبيق</p>
                </div>
              </div>
              <div
                onClick={() => updateAdvanced('forceUpdateEnabled', !advanced.forceUpdateEnabled)}
                className={cn('ios-toggle shrink-0 !w-[51px] !h-[31px] cursor-pointer', advanced.forceUpdateEnabled && 'active')}
              />
            </div>
            {advanced.forceUpdateEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <div className="space-y-1.5 pr-4">
                  <Label className="text-[10px] text-muted-foreground">الحد الأدنى لإصدار التطبيق</Label>
                  <Input
                    value={advanced.minimumAppVersion}
                    onChange={(e) => updateAdvanced('minimumAppVersion', e.target.value)}
                    dir="ltr"
                    placeholder="1.0.0"
                    className="h-9 text-sm w-32"
                  />
                  <p className="text-[9px] text-muted-foreground">الإصدارات الأقدم سيتم حظرها وسيُطلب التحديث</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Blocked Countries */}
      <div className="ios-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-orange-500/10">
            <MapPin className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">الدول المحظورة</p>
            <p className="text-[11px] text-muted-foreground">منع التسجيل من دول معينة (رمز ISO 3166-1 alpha-2)</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {advanced.blockedCountries.map(code => (
              <div key={code} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <span className="text-[10px] font-medium text-orange-600" dir="ltr">{code}</span>
                <button
                  onClick={() => removeBlockedCountry(code)}
                  className="text-orange-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {advanced.blockedCountries.length === 0 && (
              <span className="text-[10px] text-muted-foreground">لا توجد دول محظورة</span>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCountryCode}
              onChange={(e) => setNewCountryCode(e.target.value.toUpperCase())}
              placeholder="رمز الدولة (مثل: US, IR)"
              dir="ltr"
              className="h-9 text-sm w-40"
              maxLength={2}
              onKeyDown={(e) => e.key === 'Enter' && addBlockedCountry()}
            />
            <Button size="sm" variant="outline" onClick={addBlockedCountry} className="h-9">
              <Plus className="w-3 h-3 ml-1" />
              إضافة
            </Button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="ios-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">إعدادات الأمان</p>
            <p className="text-[11px] text-muted-foreground">التحكم في محاولات الدخول وقفل الحسابات</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">الحد الأقصى لمحاولات الدخول</Label>
              <Input
                type="number"
                value={advanced.maxLoginAttempts || ''}
                onChange={(e) => updateAdvanced('maxLoginAttempts', parseInt(e.target.value) || 3)}
                dir="ltr"
                className="h-9 text-sm"
                min={1}
                max={20}
              />
              <p className="text-[9px] text-muted-foreground">بعد هذا العدد يتم قفل الحساب</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">مدة القفل (دقيقة)</Label>
              <Input
                type="number"
                value={advanced.lockoutDuration || ''}
                onChange={(e) => updateAdvanced('lockoutDuration', parseInt(e.target.value) || 15)}
                dir="ltr"
                className="h-9 text-sm"
                min={1}
              />
              <p className="text-[9px] text-muted-foreground">مدة قفل الحساب بعد تجاوز المحاولات</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground">مهلة الجلسة (دقيقة)</Label>
              <Input
                type="number"
                value={advanced.sessionTimeout || ''}
                onChange={(e) => updateAdvanced('sessionTimeout', parseInt(e.target.value) || 30)}
                dir="ltr"
                className="h-9 text-sm"
                min={5}
              />
              <p className="text-[9px] text-muted-foreground">مدة بقاء الجلسة نشطة بدون نشاط</p>
            </div>
          </div>

          {/* 2FA Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <KeyRound className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">المصادقة الثنائية (2FA)</p>
                <p className="text-[11px] text-muted-foreground">تفعيل المصادقة الثنائية على مستوى التطبيق</p>
              </div>
            </div>
            <div
              onClick={() => updateAdvanced('twoFactorEnabled', !advanced.twoFactorEnabled)}
              className={cn('ios-toggle shrink-0 !w-[51px] !h-[31px] cursor-pointer', advanced.twoFactorEnabled && 'active')}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAdvanced} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ الإعدادات المتقدمة
        </Button>
      </div>
    </div>
  );

  // ── Main Render ──
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الحدود والمميزات</h1>
          <p className="text-muted-foreground text-sm mt-1">التحكم الشامل في حدود المعاملات ومميزات التطبيق</p>
        </div>
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-11">
          <TabsTrigger value="limits" className="text-xs gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">حدود المعاملات</span>
            <span className="sm:hidden">المعاملات</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs gap-1.5">
            <ToggleRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">التحكم بالمميزات</span>
            <span className="sm:hidden">المميزات</span>
          </TabsTrigger>
          <TabsTrigger value="crypto" className="text-xs gap-1.5">
            <Bitcoin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">حدود الكريبتو</span>
            <span className="sm:hidden">الكريبتو</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-xs gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">إعدادات متقدمة</span>
            <span className="sm:hidden">متقدمة</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="limits">{renderLimitsTab()}</TabsContent>
        <TabsContent value="features">{renderFeaturesTab()}</TabsContent>
        <TabsContent value="crypto">{renderCryptoTab()}</TabsContent>
        <TabsContent value="advanced">{renderAdvancedTab()}</TabsContent>
      </Tabs>
    </div>
  );
}
