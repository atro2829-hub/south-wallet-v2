'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, push, update, remove, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateId } from '@/lib/utils';
// Card components not used directly - using ios-card CSS classes
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Textarea available if needed
import {
  Plus, Trash2, Edit, Percent, TrendingUp, Search, Loader2,
  Bitcoin, Landmark, BarChart3, Settings, Download, ArrowUpDown,
  Coins, Send, Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  ShieldCheck, Zap, FileText, ChevronDown,
  ChevronUp, X, Crown, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────

interface FeeTier {
  id: string;
  minAmount: number;
  maxAmount: number;
  feeValue: number;
}

interface CommissionRule {
  id?: string;
  name: string;
  serviceType: string;
  feeType: 'percentage' | 'fixed';
  feeValue: number;
  minFee: number;
  maxFee: number;
  currency: string;
  isActive: boolean;
  applyTo: 'all' | 'verified' | 'unverified';
  tiers: FeeTier[];
}

interface CryptoCommission {
  id?: string;
  cryptoCode: string;
  cryptoName: string;
  buyPercentage: number;
  sellPercentage: number;
  minBuyFee: number;
  maxBuyFee: number;
  minSellFee: number;
  maxSellFee: number;
  feeCurrency: string;
  spreadPercentage: number;
  networkFeeOverride: number;
  isActive: boolean;
}

interface InvestmentCommission {
  id?: string;
  planName: string;
  percentage: number;
  minFee: number;
  maxFee: number;
  feeCurrency: string;
  earlyWithdrawalPenalty: number;
  isActive: boolean;
}

interface CommissionSettings {
  commissionEnabled: boolean;
  defaultFeePercentage: number;
  roundingMethod: 'up' | 'down' | 'nearest';
  feeDisplayToUser: boolean;
  deductFromSource: boolean;
  minimumTransactionFee: number;
  maximumTransactionFee: number;
  taxOnCommission: number;
  platformShare: number;
  agentShare: number;
}

interface CommissionReport {
  serviceType: string;
  totalCollected: number;
  transactionCount: number;
  currency: string;
}

// ─── Constants ───────────────────────────────────────────

const SERVICE_TYPES = [
  { value: 'transfer', label: 'تحويلات', icon: Send, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { value: 'deposit', label: 'إيداع', icon: ArrowDownCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  { value: 'withdraw', label: 'سحب', icon: ArrowUpCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'exchange', label: 'تبادل عملات', icon: RefreshCw, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { value: 'entertainment', label: 'خدمات ترفيهية', icon: Zap, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { value: 'recharge', label: 'شحن رصيد', icon: Coins, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { value: 'bills', label: 'فواتير', icon: FileText, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { value: 'purchase', label: 'شراء منتجات', icon: Wallet, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

const CRYPTO_CODES = [
  { code: 'BTC', name: 'بيتكوين' },
  { code: 'ETH', name: 'إيثريوم' },
  { code: 'USDT', name: 'تيثر' },
  { code: 'BNB', name: 'بينانس' },
  { code: 'SOL', name: 'سولانا' },
  { code: 'XRP', name: 'ريبل' },
  { code: 'ADA', name: 'كاردانو' },
  { code: 'DOGE', name: 'دوج كوين' },
];

const DEFAULT_SETTINGS: CommissionSettings = {
  commissionEnabled: true,
  defaultFeePercentage: 2,
  roundingMethod: 'nearest',
  feeDisplayToUser: true,
  deductFromSource: true,
  minimumTransactionFee: 0,
  maximumTransactionFee: 0,
  taxOnCommission: 0,
  platformShare: 80,
  agentShare: 20,
};

// ─── Helper: Generate mock report data ──────────────────

function generateMockReports(): CommissionReport[] {
  return SERVICE_TYPES.map(st => ({
    serviceType: st.value,
    totalCollected: Math.floor(Math.random() * 500000) + 10000,
    transactionCount: Math.floor(Math.random() * 2000) + 50,
    currency: 'YER',
  }));
}

function generateDailyData(): { day: string; value: number }[] {
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      value: Math.floor(Math.random() * 80000) + 10000,
    });
  }
  return data;
}

// ─── Main Component ──────────────────────────────────────

export default function CommissionsPanel() {
  const { showToast } = useAdminStore();

  // ── Data State ──
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [cryptoCommissions, setCryptoCommissions] = useState<CryptoCommission[]>([]);
  const [investmentCommissions, setInvestmentCommissions] = useState<InvestmentCommission[]>([]);
  const [settings, setSettings] = useState<CommissionSettings>(DEFAULT_SETTINGS);
  const [reportSeed, setReportSeed] = useState(() => Date.now());

  // ── UI State ──
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');
  const [search, setSearch] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('all');

  // ── Dialog State ──
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [cryptoDialog, setCryptoDialog] = useState(false);
  const [editingCrypto, setEditingCrypto] = useState<CryptoCommission | null>(null);
  const [investDialog, setInvestDialog] = useState(false);
  const [editingInvest, setEditingInvest] = useState<InvestmentCommission | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  // ── Report State ──
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  // ── Rule Form ──
  const [ruleForm, setRuleForm] = useState<CommissionRule>({
    name: '', serviceType: 'transfer', feeType: 'percentage',
    feeValue: 0, minFee: 0, maxFee: 0, currency: 'YER',
    isActive: true, applyTo: 'all', tiers: [],
  });

  // ── Crypto Form ──
  const [cryptoForm, setCryptoForm] = useState<CryptoCommission>({
    cryptoCode: 'BTC', cryptoName: 'بيتكوين',
    buyPercentage: 1, sellPercentage: 1,
    minBuyFee: 0, maxBuyFee: 0, minSellFee: 0, maxSellFee: 0,
    feeCurrency: 'YER', spreadPercentage: 0.5, networkFeeOverride: 0,
    isActive: true,
  });

  // ── Investment Form ──
  const [investForm, setInvestForm] = useState<InvestmentCommission>({
    planName: '', percentage: 5, minFee: 0, maxFee: 0,
    feeCurrency: 'YER', earlyWithdrawalPenalty: 10, isActive: true,
  });

  // ── Firebase Listeners ──
  useEffect(() => {
    const rulesRef = ref(database, 'adminSettings/commissions/rules');
    const unsub1 = onValue(rulesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: CommissionRule[] = [];
      Object.entries<Record<string, unknown>>(data).forEach(([id, val]) => {
        list.push({
          id,
          name: (val.name as string) || '',
          serviceType: (val.serviceType as string) || 'transfer',
          feeType: (val.feeType as 'percentage' | 'fixed') || 'percentage',
          feeValue: (val.feeValue as number) || 0,
          minFee: (val.minFee as number) || 0,
          maxFee: (val.maxFee as number) || 0,
          currency: (val.currency as string) || 'YER',
          isActive: val.isActive !== false,
          applyTo: (val.applyTo as 'all' | 'verified' | 'unverified') || 'all',
          tiers: (val.tiers as FeeTier[]) || [],
        });
      });
      setRules(list);
    });

    const cryptoRef = ref(database, 'adminSettings/commissions/crypto');
    const unsub2 = onValue(cryptoRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: CryptoCommission[] = [];
      Object.entries<Record<string, unknown>>(data).forEach(([id, val]) => {
        list.push({ id, ...(val as Omit<CryptoCommission, 'id'>) });
      });
      setCryptoCommissions(list);
    });

    const investRef = ref(database, 'adminSettings/commissions/investment');
    const unsub3 = onValue(investRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: InvestmentCommission[] = [];
      Object.entries<Record<string, unknown>>(data).forEach(([id, val]) => {
        list.push({ id, ...(val as Omit<InvestmentCommission, 'id'>) });
      });
      setInvestmentCommissions(list);
    });

    const settingsRef = ref(database, 'adminSettings/commissions/settings');
    const unsub4 = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings({
          commissionEnabled: data.commissionEnabled !== false,
          defaultFeePercentage: data.defaultFeePercentage || 2,
          roundingMethod: data.roundingMethod || 'nearest',
          feeDisplayToUser: data.feeDisplayToUser !== false,
          deductFromSource: data.deductFromSource !== false,
          minimumTransactionFee: data.minimumTransactionFee || 0,
          maximumTransactionFee: data.maximumTransactionFee || 0,
          taxOnCommission: data.taxOnCommission || 0,
          platformShare: data.platformShare ?? 80,
          agentShare: data.agentShare ?? 20,
        });
      }
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  // ── Stats ──
  const activeRules = rules.filter(r => r.isActive).length;
  const totalRevenueEstimate = rules.filter(r => r.isActive).reduce((sum, r) => sum + r.feeValue * 100, 0);
  const mostProfitableRule = rules.filter(r => r.isActive).sort((a, b) => b.feeValue - a.feeValue)[0];

  // Memoized report data - regenerated when seed changes via refresh
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reports = useMemo(() => generateMockReports(), [reportSeed]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyData = useMemo(() => generateDailyData(), [reportSeed]);

  // ── Handlers: Commission Rules ──
  const resetRuleForm = () => {
    setRuleForm({
      name: '', serviceType: 'transfer', feeType: 'percentage',
      feeValue: 0, minFee: 0, maxFee: 0, currency: 'YER',
      isActive: true, applyTo: 'all', tiers: [],
    });
    setEditingRule(null);
  };

  const openRuleDialog = (rule?: CommissionRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({ ...rule, tiers: rule.tiers ? [...rule.tiers] : [] });
    } else {
      resetRuleForm();
    }
    setRuleDialog(true);
  };

  const handleSaveRule = async () => {
    if (!ruleForm.name || !ruleForm.serviceType) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    setSaving(true);
    try {
      const { id: _ruleId, ...ruleData } = ruleForm;
      if (editingRule?.id) {
        await update(ref(database, `adminSettings/commissions/rules/${editingRule.id}`), ruleData);
        showToast('تم تحديث قاعدة العمولة', 'success');
      } else {
        await push(ref(database, 'adminSettings/commissions/rules'), ruleData);
        showToast('تم إضافة قاعدة العمولة', 'success');
      }
      setRuleDialog(false);
      resetRuleForm();
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/commissions/rules/${id}`));
      showToast('تم حذف القاعدة', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleToggleRule = async (rule: CommissionRule) => {
    try {
      await update(ref(database, `adminSettings/commissions/rules/${rule.id}`), { isActive: !rule.isActive });
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const addTier = () => {
    setRuleForm(prev => ({
      ...prev,
      tiers: [...prev.tiers, { id: generateId(), minAmount: 0, maxAmount: 0, feeValue: 0 }],
    }));
  };

  const removeTier = (tierId: string) => {
    setRuleForm(prev => ({
      ...prev,
      tiers: prev.tiers.filter(t => t.id !== tierId),
    }));
  };

  const updateTier = (tierId: string, field: keyof FeeTier, value: number) => {
    setRuleForm(prev => ({
      ...prev,
      tiers: prev.tiers.map(t => t.id === tierId ? { ...t, [field]: value } : t),
    }));
  };

  // ── Handlers: Crypto Commissions ──
  const resetCryptoForm = () => {
    setCryptoForm({
      cryptoCode: 'BTC', cryptoName: 'بيتكوين',
      buyPercentage: 1, sellPercentage: 1,
      minBuyFee: 0, maxBuyFee: 0, minSellFee: 0, maxSellFee: 0,
      feeCurrency: 'YER', spreadPercentage: 0.5, networkFeeOverride: 0,
      isActive: true,
    });
    setEditingCrypto(null);
  };

  const openCryptoDialog = (crypto?: CryptoCommission) => {
    if (crypto) {
      setEditingCrypto(crypto);
      setCryptoForm({ ...crypto });
    } else {
      resetCryptoForm();
    }
    setCryptoDialog(true);
  };

  const handleSaveCrypto = async () => {
    if (!cryptoForm.cryptoCode) {
      showToast('يرجى اختيار العملة الرقمية', 'error');
      return;
    }
    setSaving(true);
    try {
      const { id: _cryptoId, ...cryptoData } = cryptoForm;
      if (editingCrypto?.id) {
        await update(ref(database, `adminSettings/commissions/crypto/${editingCrypto.id}`), cryptoData);
        showToast('تم تحديث عمولة الكريبتو', 'success');
      } else {
        await push(ref(database, 'adminSettings/commissions/crypto'), cryptoData);
        showToast('تم إضافة عمولة الكريبتو', 'success');
      }
      setCryptoDialog(false);
      resetCryptoForm();
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCrypto = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/commissions/crypto/${id}`));
      showToast('تم حذف عمولة الكريبتو', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleToggleCrypto = async (crypto: CryptoCommission) => {
    try {
      await update(ref(database, `adminSettings/commissions/crypto/${crypto.id}`), { isActive: !crypto.isActive });
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  // ── Handlers: Investment Commissions ──
  const resetInvestForm = () => {
    setInvestForm({
      planName: '', percentage: 5, minFee: 0, maxFee: 0,
      feeCurrency: 'YER', earlyWithdrawalPenalty: 10, isActive: true,
    });
    setEditingInvest(null);
  };

  const openInvestDialog = (invest?: InvestmentCommission) => {
    if (invest) {
      setEditingInvest(invest);
      setInvestForm({ ...invest });
    } else {
      resetInvestForm();
    }
    setInvestDialog(true);
  };

  const handleSaveInvest = async () => {
    if (!investForm.planName) {
      showToast('يرجى إدخال اسم الخطة', 'error');
      return;
    }
    setSaving(true);
    try {
      const { id: _investId, ...investData } = investForm;
      if (editingInvest?.id) {
        await update(ref(database, `adminSettings/commissions/investment/${editingInvest.id}`), investData);
        showToast('تم تحديث عمولة الاستثمار', 'success');
      } else {
        await push(ref(database, 'adminSettings/commissions/investment'), investData);
        showToast('تم إضافة عمولة الاستثمار', 'success');
      }
      setInvestDialog(false);
      resetInvestForm();
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvest = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/commissions/investment/${id}`));
      showToast('تم حذف عمولة الاستثمار', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleToggleInvest = async (invest: InvestmentCommission) => {
    try {
      await update(ref(database, `adminSettings/commissions/investment/${invest.id}`), { isActive: !invest.isActive });
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  // ── Handlers: Settings ──
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/commissions/settings'), settings);
      showToast('تم حفظ إعدادات العمولات', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Handlers: Export ──
  const handleExportData = () => {
    const data = {
      rules,
      cryptoCommissions,
      investmentCommissions,
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات', 'success');
  };

  // ── Filtering ──
  const filteredRules = rules.filter((r) => {
    const matchSearch = !search || r.name.includes(search) || r.serviceType.includes(search);
    const matchType = filterServiceType === 'all' || r.serviceType === filterServiceType;
    return matchSearch && matchType;
  });

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
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{formatNumber(activeRules)}</p>
          <p className="text-[11px] text-muted-foreground">قاعدة نشطة</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-green-500/10">
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{formatNumber(rules.length)}</p>
          <p className="text-[11px] text-muted-foreground">إجمالي القواعد ({formatNumber(totalRevenueEstimate)} ر.ي تقديرية)</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-orange-500/10">
            <Bitcoin className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">{formatNumber(cryptoCommissions.filter(c => c.isActive).length)}</p>
          <p className="text-[11px] text-muted-foreground">عمولة كريبتو نشطة</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="ios-card p-4">
          <div className="p-2 rounded-xl w-fit bg-emerald-500/10">
            <Landmark className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-foreground mt-2">
            {mostProfitableRule ? (mostProfitableRule.feeType === 'percentage' ? `${mostProfitableRule.feeValue}%` : `${mostProfitableRule.feeValue}`) : '—'}
          </p>
          <p className="text-[11px] text-muted-foreground">أعلى عمولة</p>
        </div>
      </motion.div>
    </div>
  );

  // ── Render: Service Type Icon ──
  const getServiceTypeIcon = (type: string) => {
    const st = SERVICE_TYPES.find(s => s.value === type);
    return st || SERVICE_TYPES[0];
  };

  // ── Render: Tab 1 - Commission Rules ──
  const renderRulesTab = () => (
    <div className="space-y-4">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو نوع الخدمة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterServiceType} onValueChange={setFilterServiceType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="نوع الخدمة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الخدمات</SelectItem>
            {SERVICE_TYPES.map(st => (
              <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rules List */}
      <div className="space-y-2 max-h-[calc(100vh-520px)] overflow-y-auto scrollbar-thin">
        {filteredRules.map((rule, i) => {
          const stInfo = getServiceTypeIcon(rule.serviceType);
          const isExpanded = expandedRuleId === rule.id;
          return (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="ios-card"
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn('p-2 rounded-xl shrink-0', stInfo.bg)}>
                      <stInfo.icon className={cn('w-4 h-4', stInfo.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{rule.name}</p>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold',
                          rule.feeType === 'percentage' ? 'bg-green-500/15 text-green-500' : 'bg-orange-500/15 text-orange-500'
                        )}>
                          {rule.feeType === 'percentage' ? 'نسبة' : 'ثابت'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-500">
                          {stInfo.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {rule.feeType === 'percentage' ? `${rule.feeValue}%` : `${rule.feeValue} ${currencySymbols[rule.currency || 'YER']}`}
                        {rule.minFee > 0 && ` • حد أدنى: ${rule.minFee}`}
                        {rule.maxFee > 0 && ` • حد أقصى: ${rule.maxFee}`}
                        {rule.applyTo !== 'all' && ` • ${rule.applyTo === 'verified' ? 'موثقين فقط' : 'غير موثقين فقط'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {rule.tiers && rule.tiers.length > 0 && (
                      <button
                        onClick={() => setExpandedRuleId(isExpanded ? null : rule.id!)}
                        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    )}
                    <Badge className={cn(
                      'text-[10px]',
                      rule.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                    )}>
                      {rule.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                    <div
                      onClick={() => handleToggleRule(rule)}
                      className={cn('ios-toggle shrink-0 !w-[42px] !h-[26px]', rule.isActive && 'active')}
                    />
                    <button onClick={() => openRuleDialog(rule)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={() => rule.id && handleDeleteRule(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
                {/* Expanded Tiers */}
                <AnimatePresence>
                  {isExpanded && rule.tiers && rule.tiers.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-2">شرائح المبلغ</p>
                        <div className="space-y-1.5">
                          {rule.tiers.map((tier) => (
                            <div key={tier.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-[11px]">
                              <span className="text-muted-foreground">
                                {formatNumber(tier.minAmount)} - {formatNumber(tier.maxAmount)} {currencySymbols[rule.currency]}
                              </span>
                              <span className="font-medium text-foreground">
                                {rule.feeType === 'percentage' ? `${tier.feeValue}%` : `${tier.feeValue} ${currencySymbols[rule.currency]}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
        {filteredRules.length === 0 && (
          <div className="text-center py-12">
            <Percent className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد قواعد عمولات</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أضف قاعدة جديدة لبدء التحكم بالعمولات</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render: Tab 2 - Crypto Commissions ──
  const renderCryptoTab = () => (
    <div className="space-y-4">
      <div className="max-h-[calc(100vh-440px)] overflow-y-auto scrollbar-thin space-y-2">
        {cryptoCommissions.map((crypto, i) => (
          <motion.div
            key={crypto.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="ios-card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Bitcoin className="w-5 h-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{crypto.cryptoName}</p>
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded">{crypto.cryptoCode}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    شراء: {crypto.buyPercentage}% • بيع: {crypto.sellPercentage}% • فروق: {crypto.spreadPercentage}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={cn(
                  'text-[10px]',
                  crypto.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                )}>
                  {crypto.isActive ? 'نشط' : 'معطل'}
                </Badge>
                <div
                  onClick={() => handleToggleCrypto(crypto)}
                  className={cn('ios-toggle shrink-0 !w-[42px] !h-[26px]', crypto.isActive && 'active')}
                />
                <button onClick={() => openCryptoDialog(crypto)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => crypto.id && handleDeleteCrypto(crypto.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
            {/* Detail Row */}
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">حد أدنى شراء</p>
                <p className="text-xs font-medium text-foreground">{formatNumber(crypto.minBuyFee)} {currencySymbols[crypto.feeCurrency]}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">حد أقصى شراء</p>
                <p className="text-xs font-medium text-foreground">{formatNumber(crypto.maxBuyFee)} {currencySymbols[crypto.feeCurrency]}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">حد أدنى بيع</p>
                <p className="text-xs font-medium text-foreground">{formatNumber(crypto.minSellFee)} {currencySymbols[crypto.feeCurrency]}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">رسوم الشبكة</p>
                <p className="text-xs font-medium text-foreground">{crypto.networkFeeOverride > 0 ? `${crypto.networkFeeOverride}` : 'تلقائي'}</p>
              </div>
            </div>
          </motion.div>
        ))}
        {cryptoCommissions.length === 0 && (
          <div className="text-center py-12">
            <Bitcoin className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد عمولات كريبتو</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أضف عملة رقمية لبدء التحكم بالعمولات</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render: Tab 3 - Investment Commissions ──
  const renderInvestmentTab = () => (
    <div className="space-y-4">
      <div className="max-h-[calc(100vh-440px)] overflow-y-auto scrollbar-thin space-y-2">
        {investmentCommissions.map((invest, i) => (
          <motion.div
            key={invest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="ios-card p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{invest.planName}</p>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{invest.percentage}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    عمولة الأرباح: {invest.percentage}% • غرامة السحب المبكر: {invest.earlyWithdrawalPenalty}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={cn(
                  'text-[10px]',
                  invest.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
                )}>
                  {invest.isActive ? 'نشط' : 'معطل'}
                </Badge>
                <div
                  onClick={() => handleToggleInvest(invest)}
                  className={cn('ios-toggle shrink-0 !w-[42px] !h-[26px]', invest.isActive && 'active')}
                />
                <button onClick={() => openInvestDialog(invest)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => invest.id && handleDeleteInvest(invest.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
            {/* Detail Row */}
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">حد أدنى</p>
                <p className="text-xs font-medium text-foreground">{formatNumber(invest.minFee)} {currencySymbols[invest.feeCurrency]}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">حد أقصى</p>
                <p className="text-xs font-medium text-foreground">{formatNumber(invest.maxFee)} {currencySymbols[invest.feeCurrency]}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/5">
                <p className="text-[10px] text-red-500">غرامة سحب مبكر</p>
                <p className="text-xs font-medium text-red-500">{invest.earlyWithdrawalPenalty}%</p>
              </div>
            </div>
          </motion.div>
        ))}
        {investmentCommissions.length === 0 && (
          <div className="text-center py-12">
            <Landmark className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد عمولات استثمار</p>
            <p className="text-xs text-muted-foreground/60 mt-1">أضف خطة استثمارية لبدء التحكم بالعمولات</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Render: Tab 4 - Commission Reports ──
  const renderReportsTab = () => {
    const maxDailyValue = Math.max(...dailyData.map(d => d.value), 1);
    const totalCommission = reports.reduce((sum, r) => sum + r.totalCollected, 0);
    const totalTransactions = reports.reduce((sum, r) => sum + r.transactionCount, 0);

    return (
      <div className="space-y-4">
        {/* Period Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  reportPeriod === p
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                    : 'ios-card text-muted-foreground'
                )}
              >
                {p === 'daily' ? 'يومي' : p === 'weekly' ? 'أسبوعي' : 'شهري'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mr-auto">
            <Input
              type="date"
              value={reportDateFrom}
              onChange={(e) => setReportDateFrom(e.target.value)}
              className="w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">إلى</span>
            <Input
              type="date"
              value={reportDateTo}
              onChange={(e) => setReportDateTo(e.target.value)}
              className="w-36 text-xs"
            />
          </div>
          <button
            onClick={handleExportData}
            className="px-3 py-2 rounded-xl ios-card text-xs font-medium flex items-center gap-1.5 card-press"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير
          </button>
          <button
            onClick={() => setReportSeed(Date.now())}
            className="px-3 py-2 rounded-xl ios-card text-xs font-medium flex items-center gap-1.5 card-press"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="ios-card p-4">
              <div className="p-2 rounded-xl w-fit bg-purple-500/10">
                <BarChart3 className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">{formatNumber(totalCommission)}</p>
              <p className="text-[11px] text-muted-foreground">إجمالي العمولات (ر.ي)</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="ios-card p-4">
              <div className="p-2 rounded-xl w-fit bg-green-500/10">
                <ArrowUpDown className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">{formatNumber(totalTransactions)}</p>
              <p className="text-[11px] text-muted-foreground">إجمالي المعاملات</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="ios-card p-4">
              <div className="p-2 rounded-xl w-fit bg-orange-500/10">
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-lg font-bold text-foreground mt-2">
                {totalTransactions > 0 ? formatNumber(Math.round(totalCommission / totalTransactions)) : 0}
              </p>
              <p className="text-[11px] text-muted-foreground">متوسط العمولة (ر.ي)</p>
            </div>
          </motion.div>
        </div>

        {/* Revenue Chart */}
        <div className="ios-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">إيرادات العمولات عبر الوقت</h3>
          <div className="flex items-end gap-[2px] h-40" dir="ltr">
            {dailyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div
                  className="w-full rounded-t-sm bg-purple-500/80 hover:bg-purple-500 transition-colors cursor-pointer min-h-[2px]"
                  style={{ height: `${(d.value / maxDailyValue) * 100}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 px-2 py-1 rounded-lg bg-foreground text-background text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {d.day}: {formatNumber(d.value)} ر.ي
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-muted-foreground" dir="ltr">
            <span>{dailyData[0]?.day}</span>
            <span>{dailyData[dailyData.length - 1]?.day}</span>
          </div>
        </div>

        {/* Breakdown by Service Type */}
        <div className="ios-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">توزيع العمولات حسب نوع الخدمة</h3>
          <div className="space-y-2.5">
            {reports.map((report) => {
              const stInfo = getServiceTypeIcon(report.serviceType);
              const percentage = totalCommission > 0 ? (report.totalCollected / totalCommission) * 100 : 0;
              return (
                <div key={report.serviceType} className="flex items-center gap-3">
                  <div className={cn('p-1.5 rounded-lg shrink-0', stInfo.bg)}>
                    <stInfo.icon className={cn('w-3.5 h-3.5', stInfo.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{stInfo.label}</span>
                      <span className="text-xs text-muted-foreground">{formatNumber(report.totalCollected)} {currencySymbols[report.currency]}</span>
                    </div>
                    <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-10 text-left">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Render: Tab 5 - Commission Settings ──
  const renderSettingsTab = () => (
    <div className="space-y-4">
      {/* Master Toggle */}
      <div className={cn('ios-card p-5', !settings.commissionEnabled && 'opacity-60')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10">
              <Settings className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">تفعيل نظام العمولات</p>
              <p className="text-[11px] text-muted-foreground">عند التعطيل لن يتم احتساب أي عمولات</p>
            </div>
          </div>
          <div
            onClick={() => setSettings(s => ({ ...s, commissionEnabled: !s.commissionEnabled }))}
            className={cn('ios-toggle', settings.commissionEnabled && 'active')}
          />
        </div>
      </div>

      {/* Default Settings */}
      <div className="ios-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">الإعدادات الافتراضية</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">نسبة العمولة الافتراضية (%)</Label>
            <Input
              type="number"
              value={settings.defaultFeePercentage}
              onChange={(e) => setSettings(s => ({ ...s, defaultFeePercentage: parseFloat(e.target.value) || 0 }))}
              dir="ltr"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">تُطبق على الخدمات الجديدة تلقائياً</p>
          </div>

          <div>
            <Label className="text-xs">طريقة التقريب</Label>
            <Select
              value={settings.roundingMethod}
              onValueChange={(v) => setSettings(s => ({ ...s, roundingMethod: v as 'up' | 'down' | 'nearest' }))}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nearest">أقرب رقم</SelectItem>
                <SelectItem value="up">تقريب لأعلى</SelectItem>
                <SelectItem value="down">تقريب لأدنى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">الحد الأدنى لرسوم المعاملة (ر.ي)</Label>
            <Input
              type="number"
              value={settings.minimumTransactionFee}
              onChange={(e) => setSettings(s => ({ ...s, minimumTransactionFee: parseFloat(e.target.value) || 0 }))}
              dir="ltr"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">الحد الأقصى لرسوم المعاملة (ر.ي)</Label>
            <Input
              type="number"
              value={settings.maximumTransactionFee}
              onChange={(e) => setSettings(s => ({ ...s, maximumTransactionFee: parseFloat(e.target.value) || 0 }))}
              dir="ltr"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">اتركه 0 لإلغاء الحد الأقصى</p>
          </div>
        </div>
      </div>

      {/* Display & Deduction Settings */}
      <div className="ios-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">إعدادات العرض والخصم</h3>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
          <div>
            <p className="text-sm font-medium text-foreground">عرض الرسوم قبل المعاملة</p>
            <p className="text-[11px] text-muted-foreground">إظهار تكلفة العمولة للمستخدم قبل التنفيذ</p>
          </div>
          <div
            onClick={() => setSettings(s => ({ ...s, feeDisplayToUser: !s.feeDisplayToUser }))}
            className={cn('ios-toggle !w-[42px] !h-[26px]', settings.feeDisplayToUser && 'active')}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
          <div>
            <p className="text-sm font-medium text-foreground">خصم من الرصيد المصدر</p>
            <p className="text-[11px] text-muted-foreground">خصم العمولة من رصيد المرسل بدلاً من المبلغ المرسل</p>
          </div>
          <div
            onClick={() => setSettings(s => ({ ...s, deductFromSource: !s.deductFromSource }))}
            className={cn('ios-toggle !w-[42px] !h-[26px]', settings.deductFromSource && 'active')}
          />
        </div>
      </div>

      {/* Tax & Distribution */}
      <div className="ios-card p-5 space-y-5">
        <h3 className="text-sm font-semibold text-foreground">الضرائب وتوزيع العمولات</h3>

        <div>
          <Label className="text-xs">ضريبة على العمولة (%)</Label>
          <Input
            type="number"
            value={settings.taxOnCommission}
            onChange={(e) => setSettings(s => ({ ...s, taxOnCommission: parseFloat(e.target.value) || 0 }))}
            dir="ltr"
            className="mt-1"
          />
          <p className="text-[10px] text-muted-foreground mt-1">نسبة ضريبة تُضاف على قيمة العمولة</p>
        </div>

        <div>
          <Label className="text-xs">توزيع العمولات (المجموع يجب أن يكون 100%)</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-medium text-foreground">حصة المنصة</span>
              </div>
              <Input
                type="number"
                value={settings.platformShare}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setSettings(s => ({ ...s, platformShare: val, agentShare: 100 - val }));
                }}
                dir="ltr"
              />
              <p className="text-[10px] text-purple-500 mt-1">{settings.platformShare}%</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-foreground">حصة الوكيل</span>
              </div>
              <Input
                type="number"
                value={settings.agentShare}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setSettings(s => ({ ...s, agentShare: val, platformShare: 100 - val }));
                }}
                dir="ltr"
              />
              <p className="text-[10px] text-emerald-500 mt-1">{settings.agentShare}%</p>
            </div>
          </div>
          {settings.platformShare + settings.agentShare !== 100 && (
            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <p className="text-[11px] text-red-500">المجموع يجب أن يكون 100% (حالياً: {settings.platformShare + settings.agentShare}%)</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSaveSettings}
        disabled={saving || (settings.platformShare + settings.agentShare !== 100)}
        className="w-full bg-purple-600 hover:bg-purple-700 h-12 rounded-xl text-base font-medium"
      >
        {saving ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <Settings className="w-5 h-5 ml-2" />}
        حفظ إعدادات العمولات
      </Button>
    </div>
  );

  // ── Main Render ──
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ios-large-title text-foreground">ضبط العمولات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة شاملة لعمولات المنتجات والخدمات والكريبتو والاستثمار</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportData}
            className="p-2.5 rounded-xl ios-card card-press"
            title="تصدير البيانات"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
          {activeTab === 'rules' && (
            <button
              onClick={() => openRuleDialog()}
              className="px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              قاعدة جديدة
            </button>
          )}
          {activeTab === 'crypto' && (
            <button
              onClick={() => openCryptoDialog()}
              className="px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              عملة جديدة
            </button>
          )}
          {activeTab === 'investment' && (
            <button
              onClick={() => openInvestDialog()}
              className="px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              خطة جديدة
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-5 h-auto p-1">
          <TabsTrigger value="rules" className="text-xs py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            قواعد العمولات
          </TabsTrigger>
          <TabsTrigger value="crypto" className="text-xs py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            عمولات الكريبتو
          </TabsTrigger>
          <TabsTrigger value="investment" className="text-xs py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            عمولات الاستثمار
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            تقارير العمولات
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs py-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            إعدادات العمولات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4 mt-4">
          {renderRulesTab()}
        </TabsContent>

        <TabsContent value="crypto" className="space-y-4 mt-4">
          {renderCryptoTab()}
        </TabsContent>

        <TabsContent value="investment" className="space-y-4 mt-4">
          {renderInvestmentTab()}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          {renderReportsTab()}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          {renderSettingsTab()}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════════════════════════════════════ */}
      {/* Dialog: Add/Edit Commission Rule */}
      {/* ═══════════════════════════════════════════════════ */}
      <Dialog open={ruleDialog} onOpenChange={(open) => { setRuleDialog(open); if (!open) resetRuleForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{editingRule ? 'تعديل قاعدة العمولة' : 'إضافة قاعدة عمولة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label className="text-xs">اسم القاعدة *</Label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm(f => ({ ...f, name: e.target.value }))}
                placeholder="مثال: عمولة التحويلات المحلية"
                className="mt-1"
              />
            </div>

            {/* Service Type */}
            <div>
              <Label className="text-xs">نوع الخدمة *</Label>
              <Select
                value={ruleForm.serviceType}
                onValueChange={(v) => setRuleForm(f => ({ ...f, serviceType: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(st => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fee Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">نوع الرسوم</Label>
                <Select
                  value={ruleForm.feeType}
                  onValueChange={(v: any) => setRuleForm(f => ({ ...f, feeType: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">قيمة العمولة {ruleForm.feeType === 'percentage' ? '(%)' : ''}</Label>
                <Input
                  type="number"
                  value={ruleForm.feeValue}
                  onChange={(e) => setRuleForm(f => ({ ...f, feeValue: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Currency (only for fixed) */}
            {ruleForm.feeType === 'fixed' && (
              <div>
                <Label className="text-xs">العملة</Label>
                <Select
                  value={ruleForm.currency}
                  onValueChange={(v) => setRuleForm(f => ({ ...f, currency: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">ريال يمني</SelectItem>
                    <SelectItem value="SAR">ريال سعودي</SelectItem>
                    <SelectItem value="USD">دولار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Min/Max Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الحد الأدنى للرسوم</Label>
                <Input
                  type="number"
                  value={ruleForm.minFee}
                  onChange={(e) => setRuleForm(f => ({ ...f, minFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">الحد الأقصى للرسوم</Label>
                <Input
                  type="number"
                  value={ruleForm.maxFee}
                  onChange={(e) => setRuleForm(f => ({ ...f, maxFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Apply To */}
            <div>
              <Label className="text-xs">تطبيق على</Label>
              <Select
                value={ruleForm.applyTo}
                onValueChange={(v: any) => setRuleForm(f => ({ ...f, applyTo: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  <SelectItem value="verified">الموثقين فقط</SelectItem>
                  <SelectItem value="unverified">غير الموثقين فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tiers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">شرائح المبلغ (اختياري)</Label>
                <button
                  onClick={addTier}
                  className="text-[11px] text-purple-500 font-medium flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> إضافة شريحة
                </button>
              </div>
              {ruleForm.tiers.length > 0 && (
                <div className="space-y-2">
                  {ruleForm.tiers.map((tier) => (
                    <div key={tier.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          placeholder="من"
                          value={tier.minAmount}
                          onChange={(e) => updateTier(tier.id, 'minAmount', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          className="text-xs h-8"
                        />
                        <Input
                          type="number"
                          placeholder="إلى"
                          value={tier.maxAmount}
                          onChange={(e) => updateTier(tier.id, 'maxAmount', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          className="text-xs h-8"
                        />
                        <Input
                          type="number"
                          placeholder="الرسوم"
                          value={tier.feeValue}
                          onChange={(e) => updateTier(tier.id, 'feeValue', parseFloat(e.target.value) || 0)}
                          dir="ltr"
                          className="text-xs h-8"
                        />
                      </div>
                      <button onClick={() => removeTier(tier.id)} className="p-1 rounded hover:bg-red-500/10">
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={ruleForm.isActive} onCheckedChange={(v) => setRuleForm(f => ({ ...f, isActive: v }))} />
              <Label className="text-xs">نشط</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRuleDialog(false); resetRuleForm(); }}>إلغاء</Button>
            <Button onClick={handleSaveRule} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingRule ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════ */}
      {/* Dialog: Add/Edit Crypto Commission */}
      {/* ═══════════════════════════════════════════════════ */}
      <Dialog open={cryptoDialog} onOpenChange={(open) => { setCryptoDialog(open); if (!open) resetCryptoForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{editingCrypto ? 'تعديل عمولة الكريبتو' : 'إضافة عمولة كريبتو جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Crypto Code */}
            <div>
              <Label className="text-xs">العملة الرقمية *</Label>
              <Select
                value={cryptoForm.cryptoCode}
                onValueChange={(v) => {
                  const found = CRYPTO_CODES.find(c => c.code === v);
                  setCryptoForm(f => ({ ...f, cryptoCode: v, cryptoName: found?.name || v }));
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRYPTO_CODES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Buy/Sell Percentage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">عمولة الشراء (%)</Label>
                <Input
                  type="number"
                  value={cryptoForm.buyPercentage}
                  onChange={(e) => setCryptoForm(f => ({ ...f, buyPercentage: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">عمولة البيع (%)</Label>
                <Input
                  type="number"
                  value={cryptoForm.sellPercentage}
                  onChange={(e) => setCryptoForm(f => ({ ...f, sellPercentage: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Buy Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الحد الأدنى لرسوم الشراء</Label>
                <Input
                  type="number"
                  value={cryptoForm.minBuyFee}
                  onChange={(e) => setCryptoForm(f => ({ ...f, minBuyFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">الحد الأقصى لرسوم الشراء</Label>
                <Input
                  type="number"
                  value={cryptoForm.maxBuyFee}
                  onChange={(e) => setCryptoForm(f => ({ ...f, maxBuyFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Sell Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الحد الأدنى لرسوم البيع</Label>
                <Input
                  type="number"
                  value={cryptoForm.minSellFee}
                  onChange={(e) => setCryptoForm(f => ({ ...f, minSellFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">الحد الأقصى لرسوم البيع</Label>
                <Input
                  type="number"
                  value={cryptoForm.maxSellFee}
                  onChange={(e) => setCryptoForm(f => ({ ...f, maxSellFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Spread + Network Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">فروق السعر (%)</Label>
                <Input
                  type="number"
                  value={cryptoForm.spreadPercentage}
                  onChange={(e) => setCryptoForm(f => ({ ...f, spreadPercentage: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">الفرق بين سعر الشراء والبيع</p>
              </div>
              <div>
                <Label className="text-xs">رسوم الشبكة البديلة</Label>
                <Input
                  type="number"
                  value={cryptoForm.networkFeeOverride}
                  onChange={(e) => setCryptoForm(f => ({ ...f, networkFeeOverride: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">اتركه 0 للتلقائي</p>
              </div>
            </div>

            {/* Fee Currency */}
            <div>
              <Label className="text-xs">عملة الرسوم</Label>
              <Select
                value={cryptoForm.feeCurrency}
                onValueChange={(v) => setCryptoForm(f => ({ ...f, feeCurrency: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YER">ريال يمني</SelectItem>
                  <SelectItem value="SAR">ريال سعودي</SelectItem>
                  <SelectItem value="USD">دولار</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={cryptoForm.isActive} onCheckedChange={(v) => setCryptoForm(f => ({ ...f, isActive: v }))} />
              <Label className="text-xs">نشط</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCryptoDialog(false); resetCryptoForm(); }}>إلغاء</Button>
            <Button onClick={handleSaveCrypto} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingCrypto ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════ */}
      {/* Dialog: Add/Edit Investment Commission */}
      {/* ═══════════════════════════════════════════════════ */}
      <Dialog open={investDialog} onOpenChange={(open) => { setInvestDialog(open); if (!open) resetInvestForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">{editingInvest ? 'تعديل عمولة الاستثمار' : 'إضافة عمولة استثمار جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Plan Name */}
            <div>
              <Label className="text-xs">اسم خطة الاستثمار *</Label>
              <Input
                value={investForm.planName}
                onChange={(e) => setInvestForm(f => ({ ...f, planName: e.target.value }))}
                placeholder="مثال: خطة الشهر الثابت"
                className="mt-1"
              />
            </div>

            {/* Percentage */}
            <div>
              <Label className="text-xs">نسبة العمولة على الأرباح (%)</Label>
              <Input
                type="number"
                value={investForm.percentage}
                onChange={(e) => setInvestForm(f => ({ ...f, percentage: parseFloat(e.target.value) || 0 }))}
                dir="ltr"
                className="mt-1"
              />
            </div>

            {/* Min/Max Fee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الحد الأدنى للرسوم</Label>
                <Input
                  type="number"
                  value={investForm.minFee}
                  onChange={(e) => setInvestForm(f => ({ ...f, minFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">الحد الأقصى للرسوم</Label>
                <Input
                  type="number"
                  value={investForm.maxFee}
                  onChange={(e) => setInvestForm(f => ({ ...f, maxFee: parseFloat(e.target.value) || 0 }))}
                  dir="ltr"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Early Withdrawal Penalty */}
            <div>
              <Label className="text-xs">غرامة السحب المبكر (%)</Label>
              <Input
                type="number"
                value={investForm.earlyWithdrawalPenalty}
                onChange={(e) => setInvestForm(f => ({ ...f, earlyWithdrawalPenalty: parseFloat(e.target.value) || 0 }))}
                dir="ltr"
                className="mt-1"
              />
              <p className="text-[10px] text-red-500 mt-1">تُطبق عند سحب الأرباح قبل موعد الاستحقاق</p>
            </div>

            {/* Fee Currency */}
            <div>
              <Label className="text-xs">عملة الرسوم</Label>
              <Select
                value={investForm.feeCurrency}
                onValueChange={(v) => setInvestForm(f => ({ ...f, feeCurrency: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YER">ريال يمني</SelectItem>
                  <SelectItem value="SAR">ريال سعودي</SelectItem>
                  <SelectItem value="USD">دولار</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <Switch checked={investForm.isActive} onCheckedChange={(v) => setInvestForm(f => ({ ...f, isActive: v }))} />
              <Label className="text-xs">نشط</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setInvestDialog(false); resetInvestForm(); }}>إلغاء</Button>
            <Button onClick={handleSaveInvest} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
              {editingInvest ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
