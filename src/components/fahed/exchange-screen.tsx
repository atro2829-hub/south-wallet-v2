'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ArrowLeft, ArrowRightLeft, RefreshCw, TrendingUp, TrendingDown,
  Globe, Calculator, History, X, CheckCircle2, Copy, Share2, Download,
  FileText, Wallet, Shield, Bell, BellRing, ChevronDown, Info,
  ArrowUpDown, Zap, Clock, AlertTriangle
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, currencyNames, currencyBadgeColors, formatNumber, formatBalance, timeAgo, defaultExchangeRates } from '@/lib/utils';
import { LOGO_BASE64 } from '@/lib/logo';
import { supabaseService, type DbExchangeRate } from '@/lib/supabase';
import { syncExchangeRatesFromApi, getExchangeRatesFromFirebase } from '@/lib/exchange-rate-sync';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ConversionRecord {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  commission: number;
  date: string;
  referenceNumber?: string;
}

interface VoucherData {
  fromAmount: number;
  fromCurrency: string;
  toAmount: number;
  toCurrency: string;
  rate: number;
  commission: number;
  commissionAmount: number;
  rawResult: number;
  referenceNumber: string;
  date: string;
  userName: string;
  userId: string;
  senderAccount: string;
}

interface RateAlert {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  targetRate: number;
  direction: 'above' | 'below';
  createdAt: string;
  isActive: boolean;
}

interface RateHistoryPoint {
  date: string;
  label: string;
  usdYer: number;
  sarYer: number;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function generateReferenceNumber(): string {
  const prefix = 'EXC';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function formatVoucherDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

// Format a number smartly based on magnitude
function smartFormat(n: number, currency?: string): string {
  if (n === 0) return '0';
  if (n < 0.01 && n > 0) return n.toFixed(6);
  if (n < 1) return n.toFixed(4);
  if (n < 100) return n.toFixed(2);
  return formatNumber(parseFloat(n.toFixed(2)));
}

// Generate mock 7-day rate history (simulating real data)
function generateRateHistory(currentUsdYer: number, currentSarYer: number): RateHistoryPoint[] {
  const history: RateHistoryPoint[] = [];
  const dayLabels = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = dayLabels[date.getDay()] || date.toLocaleDateString('ar-SA', { weekday: 'short' }) ;

    // Simulate rate fluctuation: ±1.5% random walk from current
    const usdFluctuation = 1 + (Math.random() - 0.5) * 0.03;
    const sarFluctuation = 1 + (Math.random() - 0.5) * 0.03;
    const dayFactor = i === 0 ? 1 : usdFluctuation;

    history.push({
      date: date.toISOString().split('T')[0],
      label: dayName,
      usdYer: i === 0 ? currentUsdYer : Math.round(currentUsdYer * dayFactor),
      sarYer: i === 0 ? currentSarYer : Math.round(currentSarYer * sarFluctuation),
    });
  }
  return history;
}

// ═══════════════════════════════════════════════════════════
// ANIMATED NUMBER COMPONENT
// ═══════════════════════════════════════════════════════════

function AnimatedNumber({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const motionVal = useMotionValue(0);
  const display = useTransform(motionVal, (v) => smartFormat(v));

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration: 0.6,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [value, motionVal]);

  return (
    <motion.span className={className} style={style}>
      {display.get() === '0' ? smartFormat(value) : display.get()}
    </motion.span>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function ExchangeScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, setActiveScreen, exchangeRates, setExchangeRates, addNotification } = useAppStore();

  const isVerified = user?.kycStatus === 'verified';

  // Rate data state
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commission, setCommission] = useState<number>(1.5);
  const [rateSource, setRateSource] = useState<string>('يدوي');
  const [previousRates, setPreviousRates] = useState<{ usdYer: number; sarYer: number } | null>(null);

  // Converter state
  const [fromAmount, setFromAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [toCurrency, setToCurrency] = useState<'YER' | 'SAR' | 'USD'>('SAR');
  const [conversionHistory, setConversionHistory] = useState<ConversionRecord[]>([]);

  // Voucher state
  const [showVoucher, setShowVoucher] = useState(false);
  const [voucherData, setVoucherData] = useState<VoucherData | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Confirm dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'converter' | 'history' | 'alerts'>('converter');

  // Rate alerts state
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertFromCurrency, setAlertFromCurrency] = useState<'YER' | 'SAR' | 'USD'>('USD');
  const [alertToCurrency, setAlertToCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [alertTargetRate, setAlertTargetRate] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');

  // Rate history state
  const [rateHistory, setRateHistory] = useState<RateHistoryPoint[]>([]);
  const [historyPair, setHistoryPair] = useState<'usdYer' | 'sarYer'>('usdYer');

  // Receipt ref
  const receiptRef = useRef<HTMLDivElement>(null);

  // Rate trend indicators
  const [trends, setTrends] = useState<Record<string, 'up' | 'down' | 'stable'>>({
    'USD-YER': 'stable', 'SAR-YER': 'stable', 'USD-SAR': 'stable'
  });

  // ═══════════════════════════════════════════════════════════
  // RATE FETCHING
  // ═══════════════════════════════════════════════════════════

  const fetchRates = useCallback(async () => {
    try {
      // Try Supabase first
      const supabaseRate = await supabaseService.getExchangeRates();
      if (supabaseRate) {
        const newRates = {
          YER: 1,
          SAR: supabaseRate.sar_to_yer,
          USD: supabaseRate.usd_to_yer,
        };
        setPreviousRates({ usdYer: exchangeRates.USD, sarYer: exchangeRates.SAR });
        setExchangeRates(newRates);
        setRateSource(supabaseRate.source === 'yemenrates.com' ? 'API مباشر' : 'يدوي');
        setLastUpdate(supabaseRate.updated_at);
        return;
      }
    } catch {
      // Fall through to Firebase
    }

    try {
      const ratesData = await getExchangeRatesFromFirebase();
      setPreviousRates({ usdYer: exchangeRates.USD, sarYer: exchangeRates.SAR });
      setExchangeRates({ YER: ratesData.YER, SAR: ratesData.SAR, USD: ratesData.USD });
      setCommission(ratesData.commission);
      setLastUpdate(ratesData.lastSynced);
      setRateSource('Firebase');
    } catch {
      // Keep defaults
    }
  }, [exchangeRates, setExchangeRates]);

  useEffect(() => {
    fetchRates();
  }, []);

  // Generate rate history when rates change
  useEffect(() => {
    if (exchangeRates.USD > 0 && exchangeRates.SAR > 0) {
      setRateHistory(generateRateHistory(exchangeRates.USD, exchangeRates.SAR));
    }
  }, [exchangeRates.USD, exchangeRates.SAR]);

  // Check alerts whenever rates change
  useEffect(() => {
    alerts.forEach(alert => {
      if (!alert.isActive) return;
      const currentRate = getRate(alert.fromCurrency, alert.toCurrency);
      const triggered =
        (alert.direction === 'above' && currentRate >= alert.targetRate) ||
        (alert.direction === 'below' && currentRate <= alert.targetRate);

      if (triggered) {
        addNotification({
          id: `alert-${alert.id}`,
          title: 'تنبيه سعر الصرف',
          body: `وصل سعر ${currencyNames[alert.fromCurrency]} إلى ${smartFormat(currentRate)} ${currencySymbols[alert.toCurrency]}`,
          type: 'info',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
        setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, isActive: false } : a));
      }
    });
  }, [exchangeRates]);

  // ═══════════════════════════════════════════════════════════
  // CONVERSION LOGIC (USD as base)
  // ═══════════════════════════════════════════════════════════

  // All rates are expressed as: how many YER per 1 unit
  // USD is base: 1 USD = X YER, 1 SAR = Y YER
  const getRate = (from: string, to: string): number => {
    if (from === to) return 1;
    // Convert through USD base:
    // from -> USD -> to
    const fromToUsd: Record<string, number> = {
      YER: 1 / exchangeRates.USD,
      SAR: 1 / (exchangeRates.USD / exchangeRates.SAR),
      USD: 1,
    };
    const usdToTarget: Record<string, number> = {
      YER: exchangeRates.USD,
      SAR: exchangeRates.SAR,
      USD: 1,
    };
    return fromToUsd[from] * usdToTarget[to];
  };

  const currentRate = getRate(fromCurrency, toCurrency);
  const rawResult = (parseFloat(fromAmount) || 0) * currentRate;
  const commissionAmount = rawResult * (commission / 100);
  const result = rawResult - commissionAmount;

  // Get balance for currency
  const getBalance = (currency: string): number => {
    if (!user) return 0;
    switch (currency) {
      case 'YER': return user.balanceYER || 0;
      case 'SAR': return user.balanceSAR || 0;
      case 'USD': return user.balanceUSD || 0;
      default: return 0;
    }
  };

  const fromBalance = getBalance(fromCurrency);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      let newRatesData;
      try {
        newRatesData = await syncExchangeRatesFromApi();
        setRateSource('API مباشر');
      } catch {
        // Try Supabase
        try {
          const supabaseRate = await supabaseService.getExchangeRates();
          if (supabaseRate) {
            newRatesData = {
              YER: 1,
              SAR: supabaseRate.sar_to_yer,
              USD: supabaseRate.usd_to_yer,
              commission: commission,
              lastSynced: supabaseRate.updated_at,
              buyRates: { USD: supabaseRate.usd_to_yer, SAR: supabaseRate.sar_to_yer },
              sellRates: { USD: supabaseRate.usd_to_yer, SAR: supabaseRate.sar_to_yer },
            };
            setRateSource(supabaseRate.source === 'yemenrates.com' ? 'API مباشر' : 'يدوي');
          }
        } catch {
          newRatesData = await getExchangeRatesFromFirebase();
          setRateSource('Firebase');
        }
      }

      if (newRatesData) {
        const newRates = {
          YER: newRatesData.YER,
          SAR: newRatesData.SAR,
          USD: newRatesData.USD,
        };
        setPreviousRates({ usdYer: exchangeRates.USD, sarYer: exchangeRates.SAR });
        setTrends({
          'USD-YER': newRates.USD > exchangeRates.USD ? 'up' : newRates.USD < exchangeRates.USD ? 'down' : 'stable',
          'SAR-YER': newRates.SAR > exchangeRates.SAR ? 'up' : newRates.SAR < exchangeRates.SAR ? 'down' : 'stable',
          'USD-SAR': (newRates.USD / newRates.SAR) > (exchangeRates.USD / exchangeRates.SAR) ? 'up' : 'down',
        });
        setExchangeRates(newRates);
        setCommission(newRatesData.commission);
        setLastUpdate(newRatesData.lastSynced);
      }
    } catch {
      // Keep existing rates
    }
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleConfirmExchange = () => {
    const amount = parseFloat(fromAmount) || 0;
    if (!amount || result <= 0) return;
    if (amount > fromBalance) return;
    setShowConfirm(true);
  };

  const handleSaveConversion = async () => {
    const amount = parseFloat(fromAmount) || 0;
    if (!amount || result <= 0 || !user) return;

    setIsProcessing(true);

    try {
      // Use Supabase RPC for conversion
      let convertedAmount = result;

      try {
        const rpcResult = await supabaseService.convertCurrency(amount, fromCurrency, toCurrency);
        if (rpcResult && rpcResult > 0) {
          convertedAmount = rpcResult - (rpcResult * commission / 100);
        }
      } catch {
        // Fall back to client-side calculation (already computed)
      }

      // Atomic balance updates via Supabase RPC
      try {
        await supabaseService.updateBalance(user.id, fromCurrency, amount, 'subtract');
        await supabaseService.updateBalance(user.id, toCurrency, convertedAmount, 'add');
      } catch (balanceErr) {
        console.warn('Supabase balance update failed, trying Firebase fallback:', balanceErr);

        // Firebase fallback
        const { runTransaction: fbRunTransaction, ref: fbRef, get: fbGet, update: fbUpdate } = await import('firebase/database');
        const { database } = await import('@/lib/firebase');

        const fromBalanceField = `balance${fromCurrency}` as 'balanceYER' | 'balanceSAR' | 'balanceUSD';
        const toBalanceField = `balance${toCurrency}` as 'balanceYER' | 'balanceSAR' | 'balanceUSD';

        const fromTxResult = await fbRunTransaction(fbRef(database, `users/${user.id}/${fromBalanceField}`), (currentVal) => {
          const val = currentVal || 0;
          if (val < amount) return;
          return val - amount;
        });

        if (!fromTxResult.committed) {
          setIsProcessing(false);
          return;
        }

        await fbRunTransaction(fbRef(database, `users/${user.id}/${toBalanceField}`), (currentVal) => {
          return (currentVal || 0) + convertedAmount;
        });
      }

      // Update local user state
      const updatedUser = { ...user };
      const fromKey = `balance${fromCurrency}` as keyof typeof updatedUser;
      const toKey = `balance${toCurrency}` as keyof typeof updatedUser;
      (updatedUser as any)[fromKey] = ((user as any)[fromKey] || 0) - amount;
      (updatedUser as any)[toKey] = ((user as any)[toKey] || 0) + convertedAmount;
      setUser(updatedUser);

      // Create transaction record in Supabase
      try {
        const refNum = generateReferenceNumber();
        await supabaseService.createTransaction({
          user_id: user.id,
          from_user_id: user.id,
          to_user_id: user.id,
          amount: amount,
          currency: fromCurrency,
          fee: commissionAmount,
          fee_currency: toCurrency,
          type: 'exchange',
          status: 'completed',
          description: `تبديل ${formatNumber(amount)} ${currencyNames[fromCurrency]} إلى ${smartFormat(convertedAmount)} ${currencyNames[toCurrency]}`,
          reference_number: refNum,
          receipt_data: {
            exchangeRate: currentRate,
            exchangeFromCurrency: fromCurrency,
            exchangeToCurrency: toCurrency,
            exchangeFromAmount: amount,
            exchangeToAmount: convertedAmount,
            exchangeCommission: commission,
          },
          sender_name: user.name,
          sender_phone: user.phone || '',
          receiver_name: user.name,
          receiver_phone: user.phone || '',
          receiver_card_number: user.cardNumber || '',
          api_provider_id: '',
          api_order_id: '',
          completed_at: new Date().toISOString(),
        });
      } catch {
        // Transaction record creation is non-critical
      }

      // Notification
      addNotification({
        id: Date.now().toString(),
        title: 'تم التبديل بنجاح',
        body: `تم تبديل ${formatNumber(amount)} ${currencySymbols[fromCurrency]} إلى ${smartFormat(convertedAmount)} ${currencySymbols[toCurrency]}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // Generate voucher
      const refNum = generateReferenceNumber();
      const now = new Date().toISOString();

      const record: ConversionRecord = {
        fromAmount: amount,
        fromCurrency,
        toAmount: convertedAmount,
        toCurrency,
        rate: currentRate,
        commission,
        date: now,
        referenceNumber: refNum,
      };
      setConversionHistory(prev => [record, ...prev].slice(0, 10));

      setVoucherData({
        fromAmount: amount,
        fromCurrency,
        toAmount: convertedAmount,
        toCurrency,
        rate: currentRate,
        commission,
        commissionAmount,
        rawResult,
        referenceNumber: refNum,
        date: now,
        userName: user.name || 'مستخدم',
        userId: user.userId || '------',
        senderAccount: user.userId || '------',
      });
      setShowVoucher(true);
      setShowConfirm(false);
    } catch {
      addNotification({
        id: Date.now().toString(),
        title: 'فشل التبديل',
        body: 'حدث خطأ أثناء عملية التبديل، يرجى المحاولة مرة أخرى',
        type: 'security',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Rate alert handlers
  const handleAddAlert = () => {
    const targetVal = parseFloat(alertTargetRate);
    if (!targetVal || targetVal <= 0) return;
    if (alertFromCurrency === alertToCurrency) return;

    const newAlert: RateAlert = {
      id: `alert-${Date.now()}`,
      fromCurrency: alertFromCurrency,
      toCurrency: alertToCurrency,
      targetRate: targetVal,
      direction: alertDirection,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    setAlerts(prev => [newAlert, ...prev]);
    setShowAlertForm(false);
    setAlertTargetRate('');

    addNotification({
      id: `alert-set-${Date.now()}`,
      title: 'تم تعيين التنبيه',
      body: `سيتم إشعارك عندما يصل سعر ${currencyNames[alertFromCurrency]} ${alertDirection === 'above' ? 'إلى' : 'إلى أقل من'} ${smartFormat(targetVal)} ${currencySymbols[alertToCurrency]}`,
      type: 'info',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleCopyRef = () => {
    if (voucherData) {
      navigator.clipboard.writeText(voucherData.referenceNumber).catch(() => {});
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handleShareReceipt = async () => {
    if (!voucherData) return;
    const text = `
سند التحويل - محفظة الجنوب
══════════════════════════════
رقم السند: ${voucherData.referenceNumber}
التاريخ: ${formatVoucherDate(voucherData.date)}
══════════════════════════════
من: ${voucherData.userName}
رقم الحساب: ${voucherData.senderAccount}
══════════════════════════════
المبلغ المرسل: ${formatNumber(voucherData.fromAmount)} ${currencySymbols[voucherData.fromCurrency]} (${currencyNames[voucherData.fromCurrency]})
المبلغ المستلم: ${smartFormat(voucherData.toAmount)} ${currencySymbols[voucherData.toCurrency]} (${currencyNames[voucherData.toCurrency]})
══════════════════════════════
سعر الصرف: 1 ${currencySymbols[voucherData.fromCurrency]} = ${voucherData.rate < 1 ? voucherData.rate.toFixed(4) : voucherData.rate.toFixed(2)} ${currencySymbols[voucherData.toCurrency]}
العمولة (${voucherData.commission}%): ${smartFormat(voucherData.commissionAmount)} ${currencySymbols[voucherData.toCurrency]}
صافي المبلغ: ${smartFormat(voucherData.toAmount)} ${currencySymbols[voucherData.toCurrency]}
══════════════════════════════
محفظة الجنوب - محفظتك الرقمية
`.trim();

    if (navigator.share) {
      try { await navigator.share({ title: 'سند التحويل - محفظة الجنوب', text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: isDark ? '#0F0F0F' : '#FFFFFF',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `receipt-${voucherData?.referenceNumber || 'exchange'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      handleShareReceipt();
    }
  };

  // ═══════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════

  // Live rate cards data
  const liveRateCards = useMemo(() => [
    { from: 'USD', to: 'YER', rate: exchangeRates.USD, key: 'USD-YER', fromSymbol: '$', toSymbol: 'ر.ي',
      change: previousRates ? exchangeRates.USD - previousRates.usdYer : 0 },
    { from: 'SAR', to: 'YER', rate: exchangeRates.SAR, key: 'SAR-YER', fromSymbol: 'ر.س', toSymbol: 'ر.ي',
      change: previousRates ? exchangeRates.SAR - previousRates.sarYer : 0 },
    { from: 'USD', to: 'SAR', rate: exchangeRates.SAR > 0 ? parseFloat((exchangeRates.USD / exchangeRates.SAR).toFixed(4)) : 0,
      key: 'USD-SAR', fromSymbol: '$', toSymbol: 'ر.س', change: 0 },
  ], [exchangeRates, previousRates]);

  const voucherBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const voucherBorderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const voucherDividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)';

  // Yesterday rate for comparison
  const yesterdayUsdYer = rateHistory.length >= 2 ? rateHistory[rateHistory.length - 2].usdYer : exchangeRates.USD;
  const usdChangeFromYesterday = exchangeRates.USD - yesterdayUsdYer;

  // ═══════════════════════════════════════════════════════════
  // KYC CHECK
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!isVerified) {
      addNotification({
        id: Date.now().toString(),
        title: 'يرجى توثيق حسابك أولاً',
        body: 'لا يمكنك تبديل العملات إلا بعد توثيق حسابك',
        type: 'security',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      setActiveScreen('kyc');
    }
  }, [isVerified, addNotification, setActiveScreen]);

  if (!isVerified) return null;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* ═══ Header ═══ */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #1A0A0E 0%, #3D0F10 40%, #5C1A1B 100%)' }}>
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 40%, rgba(196,30,58,0.3), transparent 60%)' }} />
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveScreen('main')}
              className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-xl font-bold">تبديل العملات</h1>
              <p className="text-white/40 text-xs">العملة الأساسية: دولار أمريكي • تحويل فوري</p>
            </div>
            <motion.button whileTap={{ scale: 0.85 }} onClick={handleRefresh}
              animate={{ rotate: isRefreshing ? 360 : 0 }} transition={{ duration: 0.8 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <RefreshCw size={18} color="#FFF" />
            </motion.button>
          </div>

          {/* Rate source badge */}
          <div className="flex items-center gap-2 mt-3">
            <div className="pulse-dot w-2 h-2 rounded-full" style={{ background: rateSource.includes('API') ? '#10B981' : '#F59E0B' }} />
            <span className="text-[10px] font-bold" style={{ color: rateSource.includes('API') ? '#10B981' : '#F59E0B' }}>
              {rateSource}
            </span>
            <span className="text-white/30 text-[10px]">•</span>
            <span className="text-white/30 text-[10px]">آخر تحديث: {timeAgo(lastUpdate)}</span>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 pb-8 space-y-4">
        {/* ═══ Live Exchange Rates ═══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} color="#C41E3A" />
              <span className="text-xs font-bold" style={{ color: '#C41E3A' }}>أسعار مباشرة</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              <span className="text-[9px]" style={{ color: isDark ? '#888' : '#AAA' }}>العملة الأساسية: USD</span>
            </div>
          </div>

          <div className="px-4 pb-4 space-y-2">
            {liveRateCards.map((pair) => {
              const trend = trends[pair.key];
              const changePercent = pair.rate > 0 ? ((pair.change / pair.rate) * 100).toFixed(2) : '0';
              return (
                <motion.div key={pair.key}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{ background: `${currencyBadgeColors[pair.from]}15`, color: currencyBadgeColors[pair.from] }}>
                        {pair.from}
                      </div>
                      <ArrowRightLeft size={10} color="#5C1A1B" />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                        style={{ background: `${currencyBadgeColors[pair.to]}15`, color: currencyBadgeColors[pair.to] }}>
                        {pair.to}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium" style={{ color: isDark ? '#CCC' : '#444' }}>
                        1 {pair.from} → {pair.to}
                      </p>
                      {pair.change !== 0 && (
                        <p className="text-[9px]" style={{ color: pair.change > 0 ? '#10B981' : '#C41E3A' }}>
                          {pair.change > 0 ? '+' : ''}{smartFormat(pair.change)} ({changePercent}%)
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {pair.rate < 1 ? pair.rate.toFixed(4) : formatNumber(parseFloat(pair.rate.toFixed(2)))}
                    </span>
                    {trend === 'up' && <TrendingUp size={14} color="#10B981" />}
                    {trend === 'down' && <TrendingDown size={14} color="#C41E3A" />}
                    {trend === 'stable' && <div className="w-1.5 h-1.5 rounded-full" style={{ background: isDark ? '#555' : '#CCC' }} />}
                  </div>
                </motion.div>
              );
            })}

            {/* Cross rate indicator */}
            <div className="flex items-center justify-center gap-3 p-2 rounded-xl" style={{ background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.04)' }}>
              <span className="text-[10px]" style={{ color: isDark ? '#999' : '#888' }}>سعر متقاطع:</span>
              <span className="text-[11px] font-bold" dir="ltr" style={{ color: '#C41E3A' }}>
                1 SAR = {smartFormat(exchangeRates.SAR / exchangeRates.USD)} USD
              </span>
              <span className="text-[10px]" style={{ color: isDark ? '#999' : '#888' }}>|</span>
              <span className="text-[11px] font-bold" dir="ltr" style={{ color: '#C41E3A' }}>
                1 SAR = {smartFormat(exchangeRates.SAR)} YER
              </span>
            </div>
          </div>
        </motion.div>

        {/* ═══ Tab Selector ═══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex rounded-xl p-1 gap-1" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
          {[
            { key: 'converter' as const, label: 'محول العملات', icon: <Calculator size={14} /> },
            { key: 'history' as const, label: 'سجل الأسعار', icon: <TrendingUp size={14} /> },
            { key: 'alerts' as const, label: 'تنبيهات', icon: <Bell size={14} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all duration-200"
              style={{
                background: activeTab === tab.key ? '#5C1A1B' : 'transparent',
                color: activeTab === tab.key ? '#FFF' : isDark ? '#999' : '#888',
              }}>
              {tab.icon}
              {tab.label}
              {tab.key === 'alerts' && alerts.filter(a => a.isActive).length > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: '#C41E3A' }}>
                  {alerts.filter(a => a.isActive).length}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: CURRENCY CONVERTER
            ═══════════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === 'converter' && (
            <motion.div key="converter" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="space-y-4">

              {/* Converter Card */}
              <div className="rounded-2xl p-4" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                    <Calculator size={16} color="#5C1A1B" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>محول العملات</h3>
                    <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>التحويل عبر العملة الأساسية USD</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* From */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium" style={{ color: isDark ? '#888' : '#999' }}>من</span>
                      <button onClick={() => { const b = getBalance(fromCurrency); setFromAmount(String(b)); }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                        الرصيد: {formatNumber(fromBalance)} {currencySymbols[fromCurrency]}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <input type="number" value={fromAmount} onChange={e => setFromAmount(e.target.value)} placeholder="0" dir="ltr"
                        className="flex-1 bg-transparent outline-none text-2xl font-bold min-w-0" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                      <select value={fromCurrency} onChange={e => setFromCurrency(e.target.value as 'YER' | 'SAR' | 'USD')}
                        className="px-3 py-2 rounded-lg text-sm font-bold outline-none cursor-pointer"
                        style={{ background: `${currencyBadgeColors[fromCurrency]}15`, color: currencyBadgeColors[fromCurrency] }}>
                        <option value="YER">ر.ي YER</option>
                        <option value="SAR">ر.س SAR</option>
                        <option value="USD">$ USD</option>
                      </select>
                    </div>
                    
                    {/* Quick Amount Buttons */}
                    <div className="flex gap-2 mt-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                      {(fromCurrency === 'YER' ? [1000, 5000, 10000, 50000, 100000] :
                        fromCurrency === 'SAR' ? [10, 50, 100, 500, 1000] :
                        [5, 10, 50, 100, 500]
                      ).map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setFromAmount(String(amount))}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all"
                          style={{
                            background: fromAmount === String(amount) ? 'rgba(92,26,27,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                            color: fromAmount === String(amount) ? '#5C1A1B' : (isDark ? '#888' : '#666'),
                            border: fromAmount === String(amount) ? '1px solid rgba(92,26,27,0.3)' : '1px solid transparent',
                          }}
                        >
                          {formatNumber(amount)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Swap button */}
                  <div className="flex justify-center relative">
                    <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                    <motion.button whileTap={{ scale: 0.85, rotate: 180 }} onClick={handleSwap}
                      className="relative z-10 w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #5C1A1B, #3D0F10)' }}>
                      <ArrowRightLeft size={18} color="#FFF" />
                    </motion.button>
                  </div>

                  {/* To */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium" style={{ color: isDark ? '#888' : '#999' }}>إلى</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <motion.p key={result.toFixed(4)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="flex-1 text-2xl font-bold" dir="ltr" style={{ color: '#5C1A1B' }}>
                        {smartFormat(result)}
                      </motion.p>
                      <select value={toCurrency} onChange={e => setToCurrency(e.target.value as 'YER' | 'SAR' | 'USD')}
                        className="px-3 py-2 rounded-lg text-sm font-bold outline-none cursor-pointer"
                        style={{ background: `${currencyBadgeColors[toCurrency]}15`, color: currencyBadgeColors[toCurrency] }}>
                        <option value="YER">ر.ي YER</option>
                        <option value="SAR">ر.س SAR</option>
                        <option value="USD">$ USD</option>
                      </select>
                    </div>
                  </div>

                  {/* Conversion path visualization */}
                  {fromCurrency !== toCurrency && (
                    <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg"
                      style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                      <span className="text-[9px] font-bold" style={{ color: currencyBadgeColors[fromCurrency] }}>{fromCurrency}</span>
                      {fromCurrency !== 'USD' && (
                        <>
                          <ArrowRightLeft size={8} color={isDark ? '#555' : '#BBB'} />
                          <span className="text-[9px] font-bold" style={{ color: currencyBadgeColors['USD'] }}>USD</span>
                        </>
                      )}
                      <ArrowRightLeft size={8} color={isDark ? '#555' : '#BBB'} />
                      <span className="text-[9px] font-bold" style={{ color: currencyBadgeColors[toCurrency] }}>{toCurrency}</span>
                      <span className="text-[9px] mr-1" style={{ color: isDark ? '#666' : '#AAA' }}>
                        (عبر العملة الأساسية)
                      </span>
                    </div>
                  )}

                  {/* Rate & Fee Info */}
                  <div className="space-y-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>سعر الصرف</span>
                      <span className="text-[11px] font-bold" dir="ltr" style={{ color: isDark ? '#CCC' : '#444' }}>
                        1 {currencySymbols[fromCurrency]} = {currentRate < 1 ? currentRate.toFixed(4) : currentRate.toFixed(2)} {currencySymbols[toCurrency]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>المبلغ قبل العمولة</span>
                      <span className="text-[11px] font-bold" dir="ltr" style={{ color: isDark ? '#CCC' : '#444' }}>
                        {smartFormat(rawResult)} {currencySymbols[toCurrency]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>رسوم التبديل ({commission}%)</span>
                      <span className="text-[11px] font-bold" dir="ltr" style={{ color: '#C41E3A' }}>
                        -{smartFormat(commissionAmount)} {currencySymbols[toCurrency]}
                      </span>
                    </div>
                    <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>ستحصل على</span>
                      <span className="text-sm font-bold" dir="ltr" style={{ color: '#10B981' }}>
                        {smartFormat(result)} {currencySymbols[toCurrency]}
                      </span>
                    </div>
                  </div>

                  {/* Insufficient balance warning */}
                  {(parseFloat(fromAmount) || 0) > fromBalance && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(196,30,58,0.1)', border: '1px solid rgba(196,30,58,0.2)' }}>
                      <AlertTriangle size={14} color="#C41E3A" />
                      <span className="text-[11px] font-medium" style={{ color: '#C41E3A' }}>رصيدك غير كافي في {currencyNames[fromCurrency]}</span>
                    </div>
                  )}

                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmExchange}
                    disabled={!fromAmount || result <= 0 || (parseFloat(fromAmount) || 0) > fromBalance || fromCurrency === toCurrency}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-200"
                    style={{
                      background: (!fromAmount || result <= 0 || (parseFloat(fromAmount) || 0) > fromBalance || fromCurrency === toCurrency)
                        ? isDark ? '#333' : '#CCC'
                        : 'linear-gradient(135deg, #5C1A1B, #3D0F10)',
                      opacity: (!fromAmount || result <= 0 || (parseFloat(fromAmount) || 0) > fromBalance || fromCurrency === toCurrency) ? 0.6 : 1,
                    }}>
                    {fromCurrency === toCurrency ? 'اختر عملتين مختلفتين' : 'تأكيد التبديل'}
                  </motion.button>
                </div>
              </div>

              {/* Conversion History */}
              {conversionHistory.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <History size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سجل التحويلات</h3>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {conversionHistory.map((rec, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: currencyBadgeColors[rec.fromCurrency] }}>
                            {rec.fromAmount.toLocaleString()} {currencySymbols[rec.fromCurrency]}
                          </span>
                          <ArrowRightLeft size={10} color={isDark ? '#555' : '#AAA'} />
                          <span className="text-xs font-bold" style={{ color: currencyBadgeColors[rec.toCurrency] }}>
                            {smartFormat(rec.toAmount)} {currencySymbols[rec.toCurrency]}
                          </span>
                        </div>
                        <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(rec.date)}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 2: RATE HISTORY CHART
              ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="space-y-4">

              {/* Chart Card */}
              <div className="rounded-2xl p-4" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سجل الأسعار - 7 أيام</h3>
                  </div>
                  <div className="flex rounded-lg p-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <button onClick={() => setHistoryPair('usdYer')}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all"
                      style={{
                        background: historyPair === 'usdYer' ? '#5C1A1B' : 'transparent',
                        color: historyPair === 'usdYer' ? '#FFF' : isDark ? '#999' : '#888',
                      }}>
                      USD/YER
                    </button>
                    <button onClick={() => setHistoryPair('sarYer')}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all"
                      style={{
                        background: historyPair === 'sarYer' ? '#5C1A1B' : 'transparent',
                        color: historyPair === 'sarYer' ? '#FFF' : isDark ? '#999' : '#888',
                      }}>
                      SAR/YER
                    </button>
                  </div>
                </div>

                {/* Yesterday comparison */}
                <div className="flex items-center gap-3 mb-4 p-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                  <Clock size={12} color={isDark ? '#888' : '#AAA'} />
                  <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>مقارنة بأمس:</span>
                  <span className="text-[11px] font-bold" style={{ color: usdChangeFromYesterday >= 0 ? '#10B981' : '#C41E3A' }}>
                    {usdChangeFromYesterday >= 0 ? '▲' : '▼'} {Math.abs(usdChangeFromYesterday).toFixed(0)} ر.ي
                  </span>
                  <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                    ({usdChangeFromYesterday >= 0 ? '+' : ''}{((usdChangeFromYesterday / exchangeRates.USD) * 100).toFixed(2)}%)
                  </span>
                </div>

                {/* Chart */}
                <div className="h-52" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rateHistory} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <defs>
                        <linearGradient id="maroonGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#5C1A1B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#5C1A1B" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: isDark ? '#888' : '#AAA' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: isDark ? '#888' : '#AAA' }} axisLine={false} tickLine={false}
                        domain={['dataMin - 20', 'dataMax + 20']} />
                      <Tooltip
                        contentStyle={{
                          background: isDark ? '#1A1A1A' : '#FFF',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          borderRadius: '12px',
                          fontSize: '11px',
                          direction: 'rtl',
                        }}
                        formatter={(value: number) => [formatNumber(value), historyPair === 'usdYer' ? 'USD/YER' : 'SAR/YER']}
                      />
                      <Area type="monotone" dataKey={historyPair}
                        stroke={historyPair === 'usdYer' ? '#5C1A1B' : '#059669'}
                        fill={historyPair === 'usdYer' ? 'url(#maroonGradient)' : 'url(#greenGradient)'}
                        strokeWidth={2}
                        dot={{ r: 3, fill: historyPair === 'usdYer' ? '#5C1A1B' : '#059669', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#C41E3A', stroke: '#FFF', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Current Rate Highlight */}
                <div className="flex items-center justify-between mt-3 p-3 rounded-xl"
                  style={{ background: isDark ? 'rgba(92,26,27,0.08)' : 'rgba(92,26,27,0.04)', border: '1px solid rgba(92,26,27,0.1)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.15)' }}>
                      <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                        {historyPair === 'usdYer' ? '$' : 'ر.س'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>السعر الحالي</p>
                      <p className="text-sm font-bold" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        1 {historyPair === 'usdYer' ? 'USD' : 'SAR'} = {formatNumber(historyPair === 'usdYer' ? exchangeRates.USD : exchangeRates.SAR)} ر.ي
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>أعلى سعر</p>
                    <p className="text-[11px] font-bold" dir="ltr" style={{ color: '#10B981' }}>
                      {formatNumber(Math.max(...rateHistory.map(h => h[historyPair])))}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>أدنى سعر</p>
                    <p className="text-[11px] font-bold" dir="ltr" style={{ color: '#C41E3A' }}>
                      {formatNumber(Math.min(...rateHistory.map(h => h[historyPair])))}
                    </p>
                  </div>
                </div>
              </div>

              {/* All Rates Summary */}
              <div className="rounded-2xl p-4" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={16} color="#5C1A1B" />
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>جميع أسعار الصرف</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { from: 'USD', to: 'YER', rate: exchangeRates.USD },
                    { from: 'SAR', to: 'YER', rate: exchangeRates.SAR },
                    { from: 'YER', to: 'USD', rate: 1 / exchangeRates.USD },
                    { from: 'YER', to: 'SAR', rate: 1 / exchangeRates.SAR },
                    { from: 'USD', to: 'SAR', rate: exchangeRates.SAR / exchangeRates.USD },
                    { from: 'SAR', to: 'USD', rate: exchangeRates.USD / exchangeRates.SAR },
                  ].map((pair, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-xl"
                      style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold" style={{ color: currencyBadgeColors[pair.from] }}>{pair.from}</span>
                        <ArrowRightLeft size={7} color={isDark ? '#555' : '#BBB'} />
                        <span className="text-[9px] font-bold" style={{ color: currencyBadgeColors[pair.to] }}>{pair.to}</span>
                      </div>
                      <span className="text-[11px] font-bold" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {pair.rate < 1 ? pair.rate.toFixed(4) : formatNumber(parseFloat(pair.rate.toFixed(2)))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              TAB 3: RATE ALERTS
              ═══════════════════════════════════════════════════════════ */}
          {activeTab === 'alerts' && (
            <motion.div key="alerts" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="space-y-4">

              {/* Add Alert Button */}
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAlertForm(!showAlertForm)}
                className="w-full p-4 rounded-2xl flex items-center justify-center gap-2"
                style={{
                  background: showAlertForm ? 'transparent' : 'linear-gradient(135deg, #5C1A1B, #3D0F10)',
                  border: showAlertForm ? `2px dashed ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` : 'none',
                  color: showAlertForm ? (isDark ? '#888' : '#AAA') : '#FFF',
                }}>
                {showAlertForm ? <X size={16} /> : <BellRing size={16} />}
                <span className="text-sm font-bold">{showAlertForm ? 'إلغاء' : 'إضافة تنبيه سعر جديد'}</span>
              </motion.button>

              {/* Alert Form */}
              <AnimatePresence>
                {showAlertForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="rounded-2xl p-4" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="space-y-3">
                        {/* Currency pair */}
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold mb-1 block" style={{ color: isDark ? '#888' : '#AAA' }}>من عملة</label>
                            <select value={alertFromCurrency} onChange={e => setAlertFromCurrency(e.target.value as 'YER' | 'SAR' | 'USD')}
                              className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none cursor-pointer"
                              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: isDark ? '#FFF' : '#1a1a1a' }}>
                              <option value="YER">ر.ي YER</option>
                              <option value="SAR">ر.س SAR</option>
                              <option value="USD">$ USD</option>
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold mb-1 block" style={{ color: isDark ? '#888' : '#AAA' }}>إلى عملة</label>
                            <select value={alertToCurrency} onChange={e => setAlertToCurrency(e.target.value as 'YER' | 'SAR' | 'USD')}
                              className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none cursor-pointer"
                              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: isDark ? '#FFF' : '#1a1a1a' }}>
                              <option value="YER">ر.ي YER</option>
                              <option value="SAR">ر.س SAR</option>
                              <option value="USD">$ USD</option>
                            </select>
                          </div>
                        </div>

                        {/* Target rate */}
                        <div>
                          <label className="text-[10px] font-bold mb-1 block" style={{ color: isDark ? '#888' : '#AAA' }}>السعر المستهدف</label>
                          <input type="number" value={alertTargetRate} onChange={e => setAlertTargetRate(e.target.value)}
                            placeholder={String(getRate(alertFromCurrency, alertToCurrency).toFixed(2))} dir="ltr"
                            className="w-full px-3 py-2.5 rounded-xl text-sm font-bold outline-none"
                            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', color: isDark ? '#FFF' : '#1a1a1a' }} />
                          <p className="text-[9px] mt-1" style={{ color: isDark ? '#666' : '#AAA' }}>
                            السعر الحالي: {smartFormat(getRate(alertFromCurrency, alertToCurrency))} {currencySymbols[alertToCurrency]}
                          </p>
                        </div>

                        {/* Direction */}
                        <div>
                          <label className="text-[10px] font-bold mb-1 block" style={{ color: isDark ? '#888' : '#AAA' }}>عندما يصل السعر</label>
                          <div className="flex gap-2">
                            <button onClick={() => setAlertDirection('above')}
                              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                              style={{
                                background: alertDirection === 'above' ? 'rgba(16,185,129,0.15)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                color: alertDirection === 'above' ? '#10B981' : isDark ? '#888' : '#AAA',
                                border: alertDirection === 'above' ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                              }}>
                              <TrendingUp size={12} /> أعلى من
                            </button>
                            <button onClick={() => setAlertDirection('below')}
                              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                              style={{
                                background: alertDirection === 'below' ? 'rgba(196,30,58,0.15)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                color: alertDirection === 'below' ? '#C41E3A' : isDark ? '#888' : '#AAA',
                                border: alertDirection === 'below' ? '1px solid rgba(196,30,58,0.3)' : '1px solid transparent',
                              }}>
                              <TrendingDown size={12} /> أقل من
                            </button>
                          </div>
                        </div>

                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddAlert}
                          disabled={!alertTargetRate || alertFromCurrency === alertToCurrency}
                          className="w-full py-3 rounded-xl text-sm font-bold text-white"
                          style={{
                            background: (!alertTargetRate || alertFromCurrency === alertToCurrency)
                              ? isDark ? '#333' : '#CCC'
                              : 'linear-gradient(135deg, #5C1A1B, #3D0F10)',
                          }}>
                          تفعيل التنبيه
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Alerts List */}
              {alerts.length > 0 ? (
                <div className="rounded-2xl p-4" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Bell size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>التنبيهات النشطة</h3>
                  </div>
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <motion.div key={alert.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{
                          background: alert.isActive
                            ? isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                            : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          opacity: alert.isActive ? 1 : 0.5,
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: alert.direction === 'above' ? 'rgba(16,185,129,0.1)' : 'rgba(196,30,58,0.1)' }}>
                            {alert.direction === 'above'
                              ? <TrendingUp size={14} color="#10B981" />
                              : <TrendingDown size={14} color="#C41E3A" />}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold" style={{ color: isDark ? '#CCC' : '#444' }}>
                              {currencySymbols[alert.fromCurrency]} → {currencySymbols[alert.toCurrency]}
                            </p>
                            <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                              {alert.direction === 'above' ? 'أعلى من' : 'أقل من'} {smartFormat(alert.targetRate)} {currencySymbols[alert.toCurrency]}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.isActive ? (
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>نشط</span>
                          ) : (
                            <span className="text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: isDark ? '#666' : '#AAA' }}>مكتمل</span>
                          )}
                          <button onClick={() => handleRemoveAlert(alert.id)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            <X size={10} color={isDark ? '#888' : '#AAA'} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-8 text-center" style={{ background: cardBg, backdropFilter: 'blur(20px)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(92,26,27,0.1)' }}>
                    <Bell size={24} color="#5C1A1B" />
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>لا توجد تنبيهات</p>
                  <p className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                    أضف تنبيهًا ليتم إشعارك عند وصول سعر الصرف إلى هدفك
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CONFIRM DIALOG
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: isDark ? '#1A0A0E' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(196,30,58,0.2)' : 'rgba(92,26,27,0.1)'}` }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                  <Shield size={22} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تأكيد التبديل</h3>
                  <p className="text-[11px]" style={{ color: isDark ? '#888' : '#AAA' }}>هل أنت متأكد من عملية التبديل؟</p>
                </div>
              </div>

              <div className="space-y-2.5 mb-4 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>من</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold" style={{ color: currencyBadgeColors[fromCurrency] }}>
                      {formatNumber(parseFloat(fromAmount) || 0)} {currencySymbols[fromCurrency]}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>إلى</span>
                  <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                    {smartFormat(result)} {currencySymbols[toCurrency]}
                  </span>
                </div>
                <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>سعر الصرف</span>
                  <span className="text-[11px] font-bold" dir="ltr" style={{ color: isDark ? '#CCC' : '#444' }}>
                    1 {currencySymbols[fromCurrency]} = {currentRate < 1 ? currentRate.toFixed(4) : currentRate.toFixed(2)} {currencySymbols[toCurrency]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>العمولة ({commission}%)</span>
                  <span className="text-xs font-bold" style={{ color: '#C41E3A' }}>
                    -{smartFormat(commissionAmount)} {currencySymbols[toCurrency]}
                  </span>
                </div>

                {/* Conversion path */}
                {fromCurrency !== toCurrency && (
                  <div className="flex items-center justify-center gap-1 p-1.5 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                    <Info size={10} color={isDark ? '#666' : '#AAA'} />
                    <span className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                      التحويل: {fromCurrency} → USD → {toCurrency}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#FFF' : '#1a1a1a' }}>
                  إلغاء
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveConversion} disabled={isProcessing}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: isProcessing ? '#555' : 'linear-gradient(135deg, #5C1A1B, #3D0F10)' }}>
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white" />
                      جارٍ التبديل...
                    </span>
                  ) : 'تأكيد'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          TRANSFER VOUCHER / RECEIPT
          ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showVoucher && voucherData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowVoucher(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl overflow-hidden"
              style={{ background: isDark ? '#0F0F0F' : '#F5F5F5', maxHeight: '92vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Voucher Header */}
              <div className="relative px-5 pt-5 pb-4" style={{ background: 'linear-gradient(145deg, #1A0A0E 0%, #3D0F10 50%, #5C1A1B 100%)' }}>
                <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(196,30,58,0.2), transparent 50%)' }} />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
                      <CheckCircle2 size={20} strokeWidth={1.5} color="#10B981" />
                    </div>
                    <div>
                      <h2 className="text-white text-base font-bold">تم التبديل بنجاح</h2>
                      <p className="text-white/40 text-[11px]">سند التحويل</p>
                    </div>
                  </div>
                  <button onClick={() => setShowVoucher(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <X size={16} color="#FFF" />
                  </button>
                </div>
              </div>

              {/* Voucher Body */}
              <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 80px)' }}>
                <div ref={receiptRef}>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: voucherBg,
                      border: `1px solid ${voucherBorderColor}`,
                      boxShadow: isDark ? 'none' : '0 4px 20px rgba(0,0,0,0.08)',
                    }}
                  >
                    {/* Logo + Brand Row */}
                    <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px dashed ${voucherDividerColor}` }}>
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                        <img src={LOGO_BASE64} alt="محفظة الجنوب" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>محفظة الجنوب</p>
                        <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>سند تبديل عملات</p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(16,185,129,0.1)' }}>
                        <CheckCircle2 size={10} color="#10B981" />
                        <span className="text-[9px] font-bold" style={{ color: '#10B981' }}>مكتمل</span>
                      </div>
                    </div>

                    {/* Receipt Number & Date */}
                    <div className="p-4" style={{ borderBottom: `1px dashed ${voucherDividerColor}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={12} color="#5C1A1B" />
                          <span className="text-[10px] font-bold" style={{ color: isDark ? '#888' : '#999' }}>رقم السند</span>
                        </div>
                        <button onClick={handleCopyRef}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md active:scale-95 transition-transform"
                          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                          <span className="text-[11px] font-mono font-bold" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                            {voucherData.referenceNumber}
                          </span>
                          {copiedRef ? <CheckCircle2 size={12} color="#10B981" /> : <Copy size={12} color={isDark ? '#888' : '#AAA'} />}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>التاريخ والوقت</span>
                        <span className="text-[11px] font-medium" dir="ltr" style={{ color: isDark ? '#CCC' : '#555' }}>
                          {formatVoucherDate(voucherData.date)}
                        </span>
                      </div>
                    </div>

                    {/* Sender Info */}
                    <div className="p-4" style={{ borderBottom: `1px dashed ${voucherDividerColor}` }}>
                      <p className="text-[10px] font-bold mb-2" style={{ color: '#5C1A1B' }}>معلومات المرسل</p>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px]" style={{ color: isDark ? '#888' : '#999' }}>اسم المرسل</span>
                        <span className="text-[11px] font-medium" style={{ color: isDark ? '#CCC' : '#444' }}>
                          {voucherData.userName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: isDark ? '#888' : '#999' }}>رقم الحساب</span>
                        <span className="text-[11px] font-mono font-medium" dir="ltr" style={{ color: isDark ? '#CCC' : '#444' }}>
                          {voucherData.senderAccount}
                        </span>
                      </div>
                    </div>

                    {/* From -> To Section */}
                    <div className="p-4" style={{ borderBottom: `1px dashed ${voucherDividerColor}` }}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 text-center">
                          <p className="text-[10px] mb-1" style={{ color: isDark ? '#666' : '#999' }}>من</p>
                          <div className="py-2 px-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                            <p className="text-lg font-bold" dir="ltr" style={{ color: currencyBadgeColors[voucherData.fromCurrency] }}>
                              {formatBalance(voucherData.fromAmount, voucherData.fromCurrency)}
                            </p>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }}>
                              {currencyNames[voucherData.fromCurrency]} ({voucherData.fromCurrency})
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                          <ArrowRightLeft size={14} color="#5C1A1B" />
                        </div>

                        <div className="flex-1 text-center">
                          <p className="text-[10px] mb-1" style={{ color: isDark ? '#666' : '#999' }}>إلى</p>
                          <div className="py-2 px-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                            <p className="text-lg font-bold" dir="ltr" style={{ color: '#10B981' }}>
                              {smartFormat(voucherData.toAmount)}
                            </p>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }}>
                              {currencyNames[voucherData.toCurrency]} ({voucherData.toCurrency})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details Rows */}
                    <div className="p-4 space-y-0">
                      <div className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${voucherDividerColor}` }}>
                        <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>سعر الصرف</span>
                        <span className="text-xs font-bold" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          1 {currencySymbols[voucherData.fromCurrency]} = {voucherData.rate < 1 ? voucherData.rate.toFixed(4) : voucherData.rate.toFixed(2)} {currencySymbols[voucherData.toCurrency]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${voucherDividerColor}` }}>
                        <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>المبلغ قبل العمولة</span>
                        <span className="text-xs font-bold" dir="ltr" style={{ color: isDark ? '#CCC' : '#555' }}>
                          {smartFormat(voucherData.rawResult)} {currencySymbols[voucherData.toCurrency]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${voucherDividerColor}` }}>
                        <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>العمولة ({voucherData.commission}%)</span>
                        <span className="text-xs font-bold" dir="ltr" style={{ color: '#C41E3A' }}>
                          -{smartFormat(voucherData.commissionAmount)} {currencySymbols[voucherData.toCurrency]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>صافي المبلغ المحول</span>
                        <span className="text-xs font-bold" dir="ltr" style={{ color: '#10B981' }}>
                          {smartFormat(voucherData.toAmount)} {currencySymbols[voucherData.toCurrency]}
                        </span>
                      </div>
                    </div>

                    {/* Dashed tear-off line */}
                    <div className="relative h-6" style={{ borderTop: `2px dashed ${voucherDividerColor}` }}>
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }} />
                      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }} />
                    </div>

                    {/* Note */}
                    <div className="px-4 pb-3 pt-1">
                      <div className="p-2.5 rounded-lg text-center" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px dashed ${voucherDividerColor}` }}>
                        <p className="text-[9px]" style={{ color: isDark ? '#888' : '#999' }}>
                          ملاحظة: هذا السند إلكتروني ولا يحتاج توقيع
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-4 pb-4 text-center">
                      <p className="text-[10px] font-bold" style={{ color: isDark ? '#555' : '#999' }}>
                        محفظة الجنوب - محفظتك الرقمية
                      </p>
                      <p className="text-[9px] mt-1" style={{ color: isDark ? '#444' : '#DDD' }}>
                        {voucherData.referenceNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleShareReceipt}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: isDark ? '#FFF' : '#1a1a1a',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}>
                    <Share2 size={16} />
                    مشاركة السند
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                    if (voucherData) {
                      await navigator.clipboard.writeText(
                        `سند تبديل - ${voucherData.referenceNumber}\nمن: ${voucherData.userName}\nالمبلغ: ${formatNumber(voucherData.fromAmount)} ${currencySymbols[voucherData.fromCurrency]} → ${smartFormat(voucherData.toAmount)} ${currencySymbols[voucherData.toCurrency]}`
                      ).catch(() => {});
                    }
                  }}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: isDark ? '#FFF' : '#1a1a1a',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}>
                    <Copy size={16} />
                    نسخ السند
                  </motion.button>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadReceipt}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #5C1A1B, #3D0F10)' }}>
                  <Download size={16} />
                  تحميل السند
                </motion.button>

                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowVoucher(false)}
                  className="w-full mt-3 py-3.5 rounded-xl text-sm font-bold"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  }}>
                  إغلاق
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
