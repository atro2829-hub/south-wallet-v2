'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, update, remove, set, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Search, Plus, Edit, Trash2, Server, RefreshCw, CheckCircle2, XCircle,
  Loader2, ChevronDown, ChevronUp, Eye, EyeOff, Globe, KeyRound, Zap,
  DollarSign, Wallet, Upload, AlertTriangle, Download, Clock, Activity,
  TrendingDown, TrendingUp, BarChart3, ArrowUpDown, Filter, Repeat,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  testApiConnection,
  fetchProviderBalance,
  syncProviderToFirebase,
  type ApiProviderConfig,
} from '@/lib/api-provider';

// ─── Maroon Theme ─────────────────────────────────────────────────────
const MAROON = {
  primary: '#5C1A1B',
  dark: '#3D0F10',
  darkest: '#1A0A0E',
  accent: '#C41E3A',
  light: '#8B3A3A',
  muted: '#A05050',
  bg: '#2A1012',
  card: '#331416',
  border: '#5C1A1B40',
};

const LOW_BALANCE_THRESHOLD = 50;

// ─── Chart Config ─────────────────────────────────────────────────────
const balanceChartConfig: ChartConfig = {
  balance: {
    label: 'الرصيد',
    color: MAROON.accent,
  },
};

// ─── Types ────────────────────────────────────────────────────────────
interface BalanceLogEntry {
  id: string;
  providerId: string;
  providerName: string;
  previousBalance: number;
  newBalance: number;
  currency: string;
  changedAt: string;
}

interface BalanceHistoryPoint {
  date: string;
  balance: number;
}

export default function ApiProvidersPanel() {
  const { showToast } = useAdminStore();
  const [providers, setProviders] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [refreshingBalance, setRefreshingBalance] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ providerId: string; success: boolean; message: string; balance?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('providers');
  const [balanceLogs, setBalanceLogs] = useState<BalanceLogEntry[]>([]);
  const [logFilterProvider, setLogFilterProvider] = useState<string>('all');
  const [checkingAllBalances, setCheckingAllBalances] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [authHeader, setAuthHeader] = useState('X-API-Key');
  const [isActive, setIsActive] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [sectionId, setSectionId] = useState('service-providers');
  const [commission, setCommission] = useState(0);
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [icon, setIcon] = useState('');

  // Listen to API providers from Firebase
  useEffect(() => {
    const provRef = ref(database, 'adminSettings/apiProviders');
    const unsub = onValue(provRef, (snapshot) => {
      setProviders(snapshot.val() || {});
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Listen to sections for assignment dropdown
  useEffect(() => {
    const sectionsRef = ref(database, 'sections');
    const unsub = onValue(sectionsRef, (snapshot) => {
      setSections(snapshot.val() || {});
    });
    return () => unsub();
  }, []);

  // Load balance logs from Firebase
  useEffect(() => {
    const logRef = ref(database, 'adminSettings/balanceLogs');
    const unsub = onValue(logRef, (snapshot) => {
      const data = snapshot.val() || {};
      const logs: BalanceLogEntry[] = Object.entries(data).map(([id, v]: [string, any]) => ({
        id,
        providerId: v.providerId || '',
        providerName: v.providerName || '',
        previousBalance: v.previousBalance || 0,
        newBalance: v.newBalance || 0,
        currency: v.currency || 'USD',
        changedAt: v.changedAt || '',
      }));
      logs.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
      setBalanceLogs(logs);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setName(''); setBaseUrl(''); setApiKey(''); setApiSecret(''); setAuthHeader('X-API-Key');
    setIsActive(true); setSyncEnabled(true); setEditing(null); setShowApiKey(false);
    setSectionId('service-providers'); setCommission(0); setCommissionType('percentage');
    setIcon('');
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) { showToast('حجم الصورة يجب أن يكون أقل من 500KB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setIcon(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ─── Record balance log ────────────────────────────────────────────
  const recordBalanceLog = useCallback(async (
    providerId: string,
    providerName: string,
    previousBalance: number,
    newBalance: number,
    currency: string,
  ) => {
    if (previousBalance === newBalance) return;
    const logRef = push(ref(database, 'adminSettings/balanceLogs'));
    await set(logRef, {
      providerId,
      providerName,
      previousBalance,
      newBalance,
      currency,
      changedAt: new Date().toISOString(),
    });
  }, []);

  // ─── Record balance history point ──────────────────────────────────
  const recordBalanceHistory = useCallback(async (
    providerId: string,
    balance: number,
    currency: string,
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const historyRef = ref(database, `adminSettings/apiProviders/${providerId}/balanceHistory/${today}`);
    await set(historyRef, {
      date: today,
      balance,
      currency,
      recordedAt: new Date().toISOString(),
    });
  }, []);

  // ─── Save Provider ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { showToast('يرجى إدخال الاسم', 'error'); return; }
    if (!baseUrl.trim()) { showToast('يرجى إدخال رابط API', 'error'); return; }
    if (!apiKey.trim()) { showToast('يرجى إدخال مفتاح API', 'error'); return; }

    try {
      const providerId = editing || name.trim().toLowerCase().replace(/[\s]+/g, '-').replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, '') || `provider-${Date.now()}`;

      const data: any = {
        id: providerId,
        name: name.trim(),
        baseUrl: baseUrl.trim().endsWith('/') ? baseUrl.trim() : baseUrl.trim() + '/',
        apiKey: apiKey.trim(),
        authHeader: authHeader.trim() || 'X-API-Key',
        isActive,
        syncEnabled,
        sectionId: sectionId || 'service-providers',
        commission: commission || 0,
        commissionType: commissionType || 'percentage',
        icon: icon || '',
        createdAt: editing && providers[editing]?.createdAt ? providers[editing].createdAt : new Date().toISOString(),
      };

      if (apiSecret.trim()) data.apiSecret = apiSecret.trim();

      if (sectionId && sections[sectionId]) {
        data.sectionName = sections[sectionId].name || '';
        data.sectionIcon = sections[sectionId].icon || '';
      }

      await set(ref(database, `adminSettings/apiProviders/${providerId}`), {
        ...providers[providerId],
        ...data,
      });

      const targetSectionId = sectionId || 'service-providers';
      const subSectionData = {
        id: providerId,
        name: name.trim(),
        icon: icon || '',
        isActive,
        parentId: targetSectionId,
        sortOrder: 0,
        apiProviderId: providerId,
      };
      await set(ref(database, `sections/${targetSectionId}/subSections/${providerId}`), subSectionData);

      if (!sections[targetSectionId]) {
        await set(ref(database, `sections/${targetSectionId}`), {
          id: targetSectionId,
          name: targetSectionId === 'service-providers' ? 'خدمات المزودين' : targetSectionId,
          icon: icon || 'globe',
          color: MAROON.accent,
          sortOrder: 1,
          isActive: true,
          type: 'main',
          subSections: { [providerId]: subSectionData },
        });
      }

      // Also upsert to Supabase api_providers table
      try {
        const { error: sbError } = await supabase
          .from('api_providers')
          .upsert({
            id: providerId,
            name: name.trim(),
            description: '',
            website: '',
            api_url: baseUrl.trim().endsWith('/') ? baseUrl.trim() : baseUrl.trim() + '/',
            api_key: apiKey.trim(),
            auth_header: authHeader.trim() || 'X-API-Key',
            auth_type: authHeader.trim().toLowerCase() === 'authorization' ? 'bearer' : 'header',
            is_active: isActive,
            balance: providers[providerId]?.balance || 0,
            balance_currency: providers[providerId]?.balanceCurrency || 'USD',
            last_balance_check: providers[providerId]?.lastBalanceCheck || null,
            default_commission: commission || 0,
            commission_type: commissionType || 'percentage',
            sync_categories: syncEnabled,
            sync_products: syncEnabled,
            last_sync_at: null,
            config: { icon: icon || '', sectionId: sectionId || 'service-providers' },
          }, { onConflict: 'id' });
        if (sbError) console.warn('Supabase upsert warning:', sbError.message);
      } catch (sbErr) {
        console.warn('Supabase sync warning:', sbErr);
      }

      showToast(editing ? 'تم تحديث المزود' : 'تم إضافة المزود', 'success');
      setDialog(false);
      resetForm();
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  // ─── Delete Provider (with confirmation) ───────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/apiProviders/${id}`));
      const prov = providers[id];
      if (prov?.sectionId) {
        await remove(ref(database, `sections/${prov.sectionId}/subSections/${id}`));
      }
      // Also delete from Supabase
      try {
        await supabase.from('api_providers').delete().eq('id', id);
      } catch (sbErr) {
        console.warn('Supabase delete warning:', sbErr);
      }
      showToast('تم حذف المزود', 'success');
      setDeleteConfirm(null);
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  // ─── Test Connection ───────────────────────────────────────────────
  const handleTest = async (providerId: string) => {
    setTestingProvider(providerId);
    setTestResult(null);
    try {
      const prov = providers[providerId];
      const config: ApiProviderConfig = {
        id: prov.id, name: prov.name, baseUrl: prov.baseUrl, apiKey: prov.apiKey,
        authHeader: prov.authHeader || 'X-API-Key', method: 'GET', responseFormat: 'json',
        isActive: true, syncEnabled: true, createdAt: prov.createdAt || '',
      };

      const result = await testApiConnection(config);
      setTestResult({
        providerId, success: result.success,
        message: result.success ? `الاتصال ناجح (${result.responseTime}ms)` : (result.error || 'فشل الاتصال'),
      });

      if (result.success) {
        const balanceResult = await fetchProviderBalance(config);
        if (balanceResult) {
          const prevBalance = prov.balance || 0;
          setTestResult(prev => prev ? { ...prev, balance: `${balanceResult.balance} ${balanceResult.currency}` } : null);
          await update(ref(database, `adminSettings/apiProviders/${providerId}`), {
            balance: balanceResult.balance,
            balanceCurrency: balanceResult.currency,
            lastBalanceCheck: new Date().toISOString(),
          });
          await recordBalanceLog(providerId, prov.name, prevBalance, balanceResult.balance, balanceResult.currency);
          await recordBalanceHistory(providerId, balanceResult.balance, balanceResult.currency);
        }
      }
    } catch (e: any) {
      setTestResult({ providerId, success: false, message: e.message || 'فشل الاتصال' });
    } finally {
      setTestingProvider(null);
    }
  };

  // ─── Check Balance ─────────────────────────────────────────────────
  const handleRefreshBalance = async (providerId: string) => {
    setRefreshingBalance(providerId);
    try {
      const prov = providers[providerId];
      const config: ApiProviderConfig = {
        id: prov.id, name: prov.name, baseUrl: prov.baseUrl, apiKey: prov.apiKey,
        authHeader: prov.authHeader || 'X-API-Key', method: 'GET', responseFormat: 'json',
        isActive: true, syncEnabled: true, createdAt: prov.createdAt || '',
      };
      const balanceResult = await fetchProviderBalance(config);
      if (balanceResult) {
        const prevBalance = prov.balance || 0;
        await update(ref(database, `adminSettings/apiProviders/${providerId}`), {
          balance: balanceResult.balance,
          balanceCurrency: balanceResult.currency,
          lastBalanceCheck: new Date().toISOString(),
        });
        await recordBalanceLog(providerId, prov.name, prevBalance, balanceResult.balance, balanceResult.currency);
        await recordBalanceHistory(providerId, balanceResult.balance, balanceResult.currency);
        showToast(`الرصيد: ${balanceResult.balance} ${balanceResult.currency}`, 'success');
      } else {
        showToast('لم يتم الحصول على الرصيد', 'error');
      }
    } catch (e: any) {
      showToast(`خطأ: ${e.message}`, 'error');
    } finally {
      setRefreshingBalance(null);
    }
  };

  // ─── Check All Balances ────────────────────────────────────────────
  const handleCheckAllBalances = async () => {
    setCheckingAllBalances(true);
    const providerList = Object.entries(providers).map(([id, p]) => ({ id, ...p }));
    const activeProviders = providerList.filter(p => p.isActive !== false);
    let checked = 0;
    for (const prov of activeProviders) {
      try {
        const config: ApiProviderConfig = {
          id: prov.id, name: prov.name, baseUrl: prov.baseUrl, apiKey: prov.apiKey,
          authHeader: prov.authHeader || 'X-API-Key', method: 'GET', responseFormat: 'json',
          isActive: true, syncEnabled: true, createdAt: prov.createdAt || '',
        };
        const balanceResult = await fetchProviderBalance(config);
        if (balanceResult) {
          const prevBalance = prov.balance || 0;
          await update(ref(database, `adminSettings/apiProviders/${prov.id}`), {
            balance: balanceResult.balance,
            balanceCurrency: balanceResult.currency,
            lastBalanceCheck: new Date().toISOString(),
          });
          await recordBalanceLog(prov.id, prov.name, prevBalance, balanceResult.balance, balanceResult.currency);
          await recordBalanceHistory(prov.id, balanceResult.balance, balanceResult.currency);
          checked++;
        }
      } catch {
        // skip this provider
      }
    }
    setCheckingAllBalances(false);
    showToast(`تم فحص رصيد ${checked} مزود`, 'success');
  };

  // ─── Sync Provider ─────────────────────────────────────────────────
  const handleSync = async (providerId: string) => {
    setSyncingProvider(providerId);
    try {
      const prov = providers[providerId];
      const config: ApiProviderConfig = {
        id: prov.id, name: prov.name, baseUrl: prov.baseUrl, apiKey: prov.apiKey,
        authHeader: prov.authHeader || 'X-API-Key', method: 'GET', responseFormat: 'json',
        isActive: true, syncEnabled: true, createdAt: prov.createdAt || '',
        sectionId: prov.sectionId || 'service-providers',
        icon: prov.icon || '',
      };
      const result = await syncProviderToFirebase(config, database, ref, update);
      showToast(`تمت المزامنة: ${result.categoriesCount} تصنيف و ${result.productsCount} منتج`, 'success');
    } catch (e: any) {
      showToast(`فشلت المزامنة: ${e.message}`, 'error');
    } finally {
      setSyncingProvider(null);
    }
  };

  // ─── Toggle Active ─────────────────────────────────────────────────
  const handleToggleActive = async (providerId: string, active: boolean) => {
    try {
      await update(ref(database, `adminSettings/apiProviders/${providerId}`), { isActive: active });
      const prov = providers[providerId];
      if (prov?.sectionId) {
        await update(ref(database, `sections/${prov.sectionId}/subSections/${providerId}`), { isActive: active });
      }
      // Also update Supabase
      try {
        await supabase.from('api_providers').update({ is_active: active }).eq('id', providerId);
      } catch (sbErr) {
        console.warn('Supabase update warning:', sbErr);
      }
      showToast(active ? 'تم تفعيل المزود' : 'تم تعطيل المزود', 'success');
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  // ─── Quick Add G2Bulk ──────────────────────────────────────────────
  const handleQuickAddG2Bulk = async () => {
    try {
      const g2bulkData = {
        id: 'g2bulk', name: 'G2Bulk', baseUrl: 'https://api.g2bulk.com/v1/',
        apiKey: '4882984fe50f9038432b21e5fb37ecbf38a029c40a45c73f27da374ac933bd45',
        authHeader: 'X-API-Key', isActive: true, syncEnabled: true,
        sectionId: 'service-providers', sectionName: 'خدمات المزودين', sectionIcon: 'globe',
        commission: 5, commissionType: 'percentage',
        balance: 0, balanceCurrency: 'USD', lastBalanceCheck: '',
        createdAt: new Date().toISOString(),
      };
      await set(ref(database, 'adminSettings/apiProviders/g2bulk'), g2bulkData);

      await set(ref(database, 'sections/service-providers/subSections/g2bulk'), {
        id: 'g2bulk', name: 'G2Bulk', icon: '', isActive: true,
        parentId: 'service-providers', sortOrder: 0, apiProviderId: 'g2bulk',
      });

      // Also insert to Supabase
      try {
        await supabase.from('api_providers').upsert({
          id: 'g2bulk',
          name: 'G2Bulk',
          description: 'G2Bulk API Provider',
          website: 'https://g2bulk.com',
          api_url: 'https://api.g2bulk.com/v1/',
          api_key: '4882984fe50f9038432b21e5fb37ecbf38a029c40a45c73f27da374ac933bd45',
          auth_header: 'X-API-Key',
          auth_type: 'header',
          is_active: true,
          balance: 0,
          balance_currency: 'USD',
          default_commission: 5,
          commission_type: 'percentage',
          sync_categories: true,
          sync_products: true,
          config: { sectionId: 'service-providers' },
        }, { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('Supabase insert warning:', sbErr);
      }

      showToast('تم إضافة G2Bulk', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  // ─── Export Balance Logs to CSV ────────────────────────────────────
  const handleExportCSV = () => {
    const filtered = logFilterProvider === 'all'
      ? balanceLogs
      : balanceLogs.filter(l => l.providerId === logFilterProvider);

    if (filtered.length === 0) {
      showToast('لا توجد بيانات للتصدير', 'error');
      return;
    }

    const headers = ['المزود', 'الرصيد السابق', 'الرصيد الجديد', 'العملة', 'التاريخ'];
    const rows = filtered.map(l => [
      l.providerName,
      l.previousBalance.toString(),
      l.newBalance.toString(),
      l.currency,
      new Date(l.changedAt).toLocaleString('ar'),
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير السجل بنجاح', 'success');
  };

  // ─── Compute Stats ─────────────────────────────────────────────────
  const providerList = Object.entries(providers).map(([id, p]) => ({ id, ...p }));
  const filteredProviders = providerList.filter(p => !search || p.name?.includes(search) || p.baseUrl?.includes(search));
  const activeProviders = providerList.filter(p => p.isActive !== false);
  const inactiveProviders = providerList.filter(p => p.isActive === false);
  const totalBalance = activeProviders.reduce((sum, p) => sum + (p.balance || 0), 0);
  const lowBalanceProviders = activeProviders.filter(p => (p.balance || 0) < LOW_BALANCE_THRESHOLD);
  const lastSyncTime = providerList.reduce((latest: string | null, p) => {
    if (p.lastSync && (!latest || p.lastSync > latest)) return p.lastSync;
    return latest;
  }, null);

  // ─── Get Balance History for chart (last 7 days) ──────────────────
  const getBalanceHistory = (prov: any): BalanceHistoryPoint[] => {
    const history = prov.balanceHistory || {};
    const points: BalanceHistoryPoint[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const entry = history[dateKey];
      if (entry) {
        points.push({ date: dateKey, balance: entry.balance || 0 });
      } else if (points.length > 0) {
        // Carry forward last known balance
        points.push({ date: dateKey, balance: points[points.length - 1].balance });
      }
    }
    return points;
  };

  const sectionOptions = [
    { value: 'service-providers', label: 'خدمات المزودين' },
    { value: 'entertainment', label: 'الخدمات الترفيهية' },
    { value: 'telecom', label: 'خدمات الاتصالات' },
    { value: 'internet', label: 'الإنترنت' },
    { value: 'electricity', label: 'الكهرباء والماء' },
    { value: 'government', label: 'خدمات حكومية' },
    { value: 'wallet-services', label: 'خدمات المحفظة' },
    { value: 'crypto', label: 'الكريبتو' },
    ...Object.entries(sections).map(([id, s]: [string, any]) => ({ value: id, label: s.name || id })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${MAROON.accent} transparent transparent transparent` }} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ─── Stats Dashboard ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${MAROON.accent}20` }}>
                  <Globe className="w-5 h-5" style={{ color: MAROON.accent }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: MAROON.muted }}>إجمالي المزودين</p>
                  <p className="text-xl font-bold text-white">{formatNumber(providerList.length)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#22C55E20' }}>
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs" style={{ color: MAROON.muted }}>إجمالي الأرصدة</p>
                  <p className="text-xl font-bold text-white">{formatNumber(totalBalance)} $</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#22C55E20' }}>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs" style={{ color: MAROON.muted }}>نشط / غير نشط</p>
                  <p className="text-xl font-bold text-white">
                    <span className="text-green-400">{activeProviders.length}</span>
                    <span className="mx-1" style={{ color: MAROON.muted }}>/</span>
                    <span className="text-red-400">{inactiveProviders.length}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${MAROON.accent}20` }}>
                  <Clock className="w-5 h-5" style={{ color: MAROON.accent }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: MAROON.muted }}>آخر مزامنة</p>
                  <p className="text-sm font-bold text-white">
                    {lastSyncTime ? new Date(lastSyncTime).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'لا يوجد'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Low Balance Alert ──────────────────────────────────────────── */}
      {lowBalanceProviders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-sm" style={{ backgroundColor: '#7F1D1D' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-200">
                    تنبيه: {lowBalanceProviders.length} مزود برصيد منخفض (أقل من {LOW_BALANCE_THRESHOLD}$)
                  </p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {lowBalanceProviders.map(p => (
                      <Badge key={p.id} variant="outline" className="text-[10px] text-amber-300 border-amber-500/50">
                        {p.name}: {p.balance || 0} {p.balanceCurrency || 'USD'}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
                  onClick={handleCheckAllBalances}
                  disabled={checkingAllBalances}
                >
                  {checkingAllBalances ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-1" />}
                  فحص الكل
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Tabs ──────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="providers" className="gap-1.5 text-xs">
              <Server className="w-3.5 h-3.5" /> المزودين
            </TabsTrigger>
            <TabsTrigger value="balance" className="gap-1.5 text-xs">
              <Wallet className="w-3.5 h-3.5" /> الأرصدة
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" /> سجل الأرصدة
            </TabsTrigger>
            <TabsTrigger value="g2bulk" className="gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5" /> G2Bulk
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {activeTab === 'providers' && (
              <Button size="sm" onClick={() => { resetForm(); setDialog(true); }} style={{ backgroundColor: MAROON.accent }}>
                <Plus className="w-4 h-4 ml-1" /> مزود جديد
              </Button>
            )}
            {activeTab === 'balance' && (
              <Button size="sm" variant="outline" onClick={handleCheckAllBalances} disabled={checkingAllBalances}>
                {checkingAllBalances ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-1" />}
                فحص أرصدة الكل
              </Button>
            )}
            {activeTab === 'logs' && (
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 ml-1" /> تصدير CSV
              </Button>
            )}
          </div>
        </div>

        {/* ─── Tab: Providers ─────────────────────────────────────────── */}
        <TabsContent value="providers" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث عن مزود..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>

          {/* Quick Add G2Bulk */}
          {providerList.length === 0 && (
            <Card className="border-dashed border-2" style={{ borderColor: `${MAROON.accent}50`, backgroundColor: `${MAROON.darkest}` }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${MAROON.accent}20` }}>
                      <Zap className="w-5 h-5" style={{ color: MAROON.accent }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-white">إضافة G2Bulk تلقائياً</p>
                      <p className="text-xs" style={{ color: MAROON.muted }}>أضف مزود G2Bulk API بالإعدادات الافتراضية</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" style={{ borderColor: MAROON.accent, color: MAROON.accent }} onClick={handleQuickAddG2Bulk}>
                    إضافة سريعة
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3 max-h-[calc(100vh-420px)] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {filteredProviders.map((prov, i) => {
              const isExpanded = expandedProvider === prov.id;
              const categories = prov.categories || {};
              const categoryCount = Object.keys(categories).length;
              let productCount = 0;
              Object.values(categories).forEach((cat: any) => {
                if (cat.products) productCount += Object.keys(cat.products).length;
              });
              const isSyncing = syncingProvider === prov.id;
              const isTesting = testingProvider === prov.id;
              const isRefreshing = refreshingBalance === prov.id;
              const testRes = testResult?.providerId === prov.id ? testResult : null;
              const assignedSection = sectionOptions.find(s => s.value === prov.sectionId);
              const isLowBalance = (prov.balance || 0) < LOW_BALANCE_THRESHOLD;

              return (
                <motion.div key={prov.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <Card className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: prov.icon ? 'transparent' : `${MAROON.accent}20` }}>
                            {prov.icon ? (
                              <img src={prov.icon} alt="" className="w-full h-full object-contain rounded-lg" />
                            ) : (
                              <Globe className="w-5 h-5" style={{ color: MAROON.accent }} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-white truncate">{prov.name}</p>
                              {isLowBalance && prov.balance !== undefined && (
                                <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">رصيد منخفض</Badge>
                              )}
                            </div>
                            <p className="text-xs truncate" style={{ color: MAROON.muted }} dir="ltr">{prov.baseUrl}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {categoryCount > 0 && <Badge variant="outline" className="text-[10px] py-0" style={{ borderColor: MAROON.border, color: MAROON.muted }}>{categoryCount} تصنيف</Badge>}
                              {productCount > 0 && <Badge variant="outline" className="text-[10px] py-0" style={{ borderColor: MAROON.border, color: MAROON.muted }}>{productCount} منتج</Badge>}
                              {assignedSection && <Badge variant="outline" className="text-[10px] py-0" style={{ borderColor: MAROON.border, color: MAROON.muted }}>{assignedSection.label}</Badge>}
                              {prov.commission > 0 && <Badge variant="outline" className="text-[10px] py-0" style={{ borderColor: MAROON.border, color: MAROON.muted }}>عمولة: {prov.commission}{prov.commissionType === 'percentage' ? '%' : ''}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Switch checked={prov.isActive !== false} onCheckedChange={(v) => handleToggleActive(prov.id, v)} />
                          <Button variant="ghost" size="sm" onClick={() => handleRefreshBalance(prov.id)} disabled={isRefreshing} title="تحديث الرصيد">
                            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" style={{ color: MAROON.muted }} />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleTest(prov.id)} disabled={isTesting} title="اختبار الاتصال">
                            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" style={{ color: MAROON.muted }} />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleSync(prov.id)} disabled={isSyncing || !prov.syncEnabled} title="مزامنة">
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" style={{ color: MAROON.muted }} />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setExpandedProvider(isExpanded ? null : prov.id)}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: MAROON.muted }} /> : <ChevronDown className="w-4 h-4" style={{ color: MAROON.muted }} />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditing(prov.id);
                            setName(prov.name || ''); setBaseUrl(prov.baseUrl || ''); setApiKey(prov.apiKey || '');
                            setApiSecret(prov.apiSecret || ''); setAuthHeader(prov.authHeader || 'X-API-Key');
                            setIsActive(prov.isActive !== false); setSyncEnabled(prov.syncEnabled !== false);
                            setSectionId(prov.sectionId || 'service-providers');
                            setCommission(prov.commission || 0); setCommissionType(prov.commissionType || 'percentage');
                            setIcon(prov.icon || '');
                            setDialog(true);
                          }}><Edit className="w-4 h-4" style={{ color: MAROON.muted }} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(prov.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Balance & Info Bar */}
                      {(prov.balance !== undefined || prov.lastBalanceCheck) && (
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          {prov.balance !== undefined && (
                            <div className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                              isLowBalance ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-600"
                            )}>
                              <DollarSign size={12} />
                              <span>{prov.balance} {prov.balanceCurrency || 'USD'}</span>
                              {isLowBalance && <AlertTriangle size={12} className="mr-1" />}
                            </div>
                          )}
                          {prov.lastBalanceCheck && (
                            <span className="text-[10px]" style={{ color: MAROON.muted }}>
                              آخر فحص: {new Date(prov.lastBalanceCheck).toLocaleString('ar')}
                            </span>
                          )}
                          {prov.lastSync && (
                            <span className="text-[10px]" style={{ color: MAROON.muted }}>
                              آخر مزامنة: {new Date(prov.lastSync).toLocaleString('ar')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Test result */}
                      {testRes && (
                        <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${testRes.success ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                          {testRes.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <span>{testRes.message}</span>
                          {testRes.balance && <Badge variant="outline" className="text-[10px] mr-auto">الرصيد: {testRes.balance}</Badge>}
                        </div>
                      )}

                      {/* Expanded: Show categories and products */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mt-3 pt-3 space-y-2 max-h-80 overflow-y-auto" style={{ borderTop: `1px solid ${MAROON.border}`, scrollbarWidth: 'thin' }}>
                              {categoryCount > 0 ? (
                                Object.entries(categories).map(([catId, cat]: [string, any]) => {
                                  const catProducts = cat.products || {};
                                  const catProductCount = Object.keys(catProducts).length;
                                  return (
                                    <div key={catId} className="p-2 rounded-lg" style={{ backgroundColor: MAROON.darkest }}>
                                      <div className="flex items-center gap-2">
                                        {cat.icon ? (
                                          <img src={cat.icon} alt="" className="w-6 h-6 object-contain rounded" />
                                        ) : (
                                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${MAROON.accent}20` }}>
                                            <Server className="w-3 h-3" style={{ color: MAROON.accent }} />
                                          </div>
                                        )}
                                        <span className="text-xs font-medium text-white flex-1">{cat.title}</span>
                                        <Badge variant="outline" className="text-[9px] py-0" style={{ borderColor: MAROON.border, color: MAROON.muted }}>{catProductCount} منتج</Badge>
                                      </div>
                                      {catProductCount > 0 && (
                                        <div className="mt-1.5 grid grid-cols-2 gap-1">
                                          {Object.entries(catProducts).slice(0, 6).map(([prodId, prod]: [string, any]) => (
                                            <div key={prodId} className="text-[10px] px-1.5 py-0.5 rounded truncate" style={{ backgroundColor: MAROON.bg, color: MAROON.muted }}>
                                              {prod.title} - {prod.unit_price}$
                                            </div>
                                          ))}
                                          {catProductCount > 6 && (
                                            <div className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: MAROON.bg, color: MAROON.muted }}>
                                              +{catProductCount - 6} المزيد
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-center py-4" style={{ color: MAROON.muted }}>
                                  لم يتم مزامنة التصنيفات بعد. اضغط على زر المزامنة
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {filteredProviders.length === 0 && <p className="text-center py-8" style={{ color: MAROON.muted }}>لا يوجد مزودي API</p>}
          </div>
        </TabsContent>

        {/* ─── Tab: Balance Tracking ──────────────────────────────────── */}
        <TabsContent value="balance" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providerList.map((prov, i) => {
              const isRefreshing = refreshingBalance === prov.id;
              const isLowBalance = (prov.balance || 0) < LOW_BALANCE_THRESHOLD;
              const balanceHistory = getBalanceHistory(prov);
              const hasHistory = balanceHistory.length > 0;

              return (
                <motion.div key={prov.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="border-0 shadow-sm overflow-hidden" style={{ backgroundColor: MAROON.card }}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${MAROON.accent}20` }}>
                            {prov.icon ? (
                              <img src={prov.icon} alt="" className="w-5 h-5 object-contain rounded" />
                            ) : (
                              <Globe className="w-4 h-4" style={{ color: MAROON.accent }} />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-sm text-white">{prov.name}</CardTitle>
                            <CardDescription className="text-[10px]" style={{ color: MAROON.muted }}>
                              {prov.isActive !== false ? 'نشط' : 'غير نشط'}
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          style={{ borderColor: isLowBalance ? '#F59E0B' : MAROON.accent, color: isLowBalance ? '#F59E0B' : MAROON.accent }}
                          onClick={() => handleRefreshBalance(prov.id)}
                          disabled={isRefreshing}
                        >
                          {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 ml-1" />}
                          فحص الرصيد
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {/* Balance Display */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg",
                          isLowBalance ? "bg-amber-500/10" : "bg-green-500/10"
                        )}>
                          <DollarSign className={cn("w-5 h-5", isLowBalance ? "text-amber-500" : "text-green-500")} />
                          <div>
                            <p className={cn("text-lg font-bold", isLowBalance ? "text-amber-400" : "text-green-400")}>
                              {prov.balance !== undefined ? formatNumber(prov.balance) : '—'}
                            </p>
                            <p className="text-[10px]" style={{ color: MAROON.muted }}>{prov.balanceCurrency || 'USD'}</p>
                          </div>
                        </div>
                        <div className="flex-1">
                          {prov.lastBalanceCheck ? (
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} style={{ color: MAROON.muted }} />
                              <span className="text-[10px]" style={{ color: MAROON.muted }}>
                                آخر فحص: {new Date(prov.lastBalanceCheck).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px]" style={{ color: MAROON.muted }}>لم يتم فحص الرصيد بعد</span>
                          )}
                          {isLowBalance && prov.balance !== undefined && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <AlertTriangle size={12} className="text-amber-500" />
                              <span className="text-[10px] text-amber-400">رصيد منخفض — أقل من {LOW_BALANCE_THRESHOLD}$</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Balance History Chart */}
                      {hasHistory && (
                        <div className="mt-2 rounded-lg p-2" style={{ backgroundColor: MAROON.darkest }}>
                          <p className="text-[10px] mb-1.5" style={{ color: MAROON.muted }}>آخر 7 أيام</p>
                          <ChartContainer config={balanceChartConfig} className="h-[80px] w-full">
                            <AreaChart data={balanceHistory} margin={{ top: 2, right: 4, left: 4, bottom: 2 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={MAROON.border} />
                              <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 9, fill: MAROON.muted }}
                                tickFormatter={(v) => new Date(v).getDate().toString()}
                              />
                              <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 9, fill: MAROON.muted }}
                                width={35}
                              />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <defs>
                                <linearGradient id={`fillBalance-${prov.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={MAROON.accent} stopOpacity={0.4} />
                                  <stop offset="95%" stopColor={MAROON.accent} stopOpacity={0.05} />
                                </linearGradient>
                              </defs>
                              <Area
                                type="monotone"
                                dataKey="balance"
                                stroke={MAROON.accent}
                                fill={`url(#fillBalance-${prov.id})`}
                                strokeWidth={2}
                              />
                            </AreaChart>
                          </ChartContainer>
                        </div>
                      )}

                      {!hasHistory && prov.balance === undefined && (
                        <div className="text-center py-3 rounded-lg" style={{ backgroundColor: MAROON.darkest }}>
                          <p className="text-[10px]" style={{ color: MAROON.muted }}>اضغط &quot;فحص الرصيد&quot; لبدء تسجيل البيانات</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {providerList.length === 0 && (
              <div className="col-span-2 text-center py-12" style={{ color: MAROON.muted }}>
                <Globe className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>لا يوجد مزودين. أضف مزود أولاً.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Tab: Balance Logs ──────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: MAROON.muted }} />
              <Select value={logFilterProvider} onValueChange={setLogFilterProvider}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="تصفية حسب المزود" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المزودين</SelectItem>
                  {providerList.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="text-[10px]" style={{ borderColor: MAROON.border, color: MAROON.muted }}>
              {logFilterProvider === 'all' ? balanceLogs.length : balanceLogs.filter(l => l.providerId === logFilterProvider).length} سجل
            </Badge>
          </div>

          <Card className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-360px)] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ borderBottomColor: MAROON.border }}>
                      <TableHead className="text-xs" style={{ color: MAROON.muted }}>المزود</TableHead>
                      <TableHead className="text-xs" style={{ color: MAROON.muted }}>الرصيد السابق</TableHead>
                      <TableHead className="text-xs" style={{ color: MAROON.muted }}>الرصيد الجديد</TableHead>
                      <TableHead className="text-xs" style={{ color: MAROON.muted }}>التغيير</TableHead>
                      <TableHead className="text-xs" style={{ color: MAROON.muted }}>العملة</TableHead>
                      <TableHead className="text-xs" style={{ color: MAROON.muted }}>التاريخ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logFilterProvider === 'all' ? balanceLogs : balanceLogs.filter(l => l.providerId === logFilterProvider))
                      .slice(0, 100)
                      .map((log) => {
                        const change = log.newBalance - log.previousBalance;
                        const isPositive = change > 0;
                        const isNeutral = change === 0;
                        return (
                          <TableRow key={log.id} style={{ borderBottomColor: MAROON.border }}>
                            <TableCell className="text-xs font-medium text-white">{log.providerName}</TableCell>
                            <TableCell className="text-xs" style={{ color: MAROON.muted }}>{formatNumber(log.previousBalance)}</TableCell>
                            <TableCell className="text-xs font-medium text-white">{formatNumber(log.newBalance)}</TableCell>
                            <TableCell className="text-xs">
                              <span className={cn(
                                "inline-flex items-center gap-1",
                                isNeutral ? "text-muted-foreground" : isPositive ? "text-green-500" : "text-red-500"
                              )}>
                                {isPositive ? <TrendingUp size={12} /> : isNeutral ? <ArrowUpDown size={12} /> : <TrendingDown size={12} />}
                                {isPositive ? '+' : ''}{formatNumber(change)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs" style={{ color: MAROON.muted }}>{log.currency}</TableCell>
                            <TableCell className="text-xs" style={{ color: MAROON.muted }}>
                              {new Date(log.changedAt).toLocaleString('ar', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {balanceLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8" style={{ color: MAROON.muted }}>
                          لا توجد سجلات أرصدة بعد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab: G2Bulk Integration ────────────────────────────────── */}
        <TabsContent value="g2bulk" className="space-y-4 mt-4">
          {(() => {
            const g2bulk = providers['g2bulk'];
            const isSyncingG2 = syncingProvider === 'g2bulk';
            const categories = g2bulk?.categories || {};
            const categoryCount = Object.keys(categories).length;
            let productCount = 0;
            Object.values(categories).forEach((cat: any) => {
              if (cat.products) productCount += Object.keys(cat.products).length;
            });

            if (!g2bulk) {
              return (
                <Card className="border-dashed border-2" style={{ borderColor: `${MAROON.accent}50`, backgroundColor: MAROON.darkest }}>
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: `${MAROON.accent}20` }}>
                        <Zap className="w-8 h-8" style={{ color: MAROON.accent }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">G2Bulk API</h3>
                        <p className="text-sm mt-1" style={{ color: MAROON.muted }}>مزود خدمات جملة متكامل — تصنيفات ومنتجات متنوعة</p>
                      </div>
                      <div className="space-y-2 text-xs" style={{ color: MAROON.muted }}>
                        <p>API URL: <code dir="ltr" className="px-2 py-0.5 rounded" style={{ backgroundColor: MAROON.bg }}>https://api.g2bulk.com/v1/</code></p>
                      </div>
                      <Button onClick={handleQuickAddG2Bulk} style={{ backgroundColor: MAROON.accent }} className="gap-2">
                        <Plus className="w-4 h-4" /> إضافة وتفعيل G2Bulk
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <>
                {/* G2Bulk Status Card */}
                <Card className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${MAROON.accent}20` }}>
                          <Zap className="w-6 h-6" style={{ color: MAROON.accent }} />
                        </div>
                        <div>
                          <CardTitle className="text-base text-white">G2Bulk</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn("text-[10px]", g2bulk.isActive !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                              {g2bulk.isActive !== false ? 'نشط' : 'معطل'}
                            </Badge>
                            {g2bulk.lastSync && (
                              <span className="text-[10px]" style={{ color: MAROON.muted }}>
                                آخر مزامنة: {new Date(g2bulk.lastSync).toLocaleString('ar')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          style={{ borderColor: MAROON.accent, color: MAROON.accent }}
                          onClick={() => handleSync('g2bulk')}
                          disabled={isSyncingG2}
                        >
                          {isSyncingG2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4 ml-1" />}
                          مزامنة الآن
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshBalance('g2bulk')}
                          disabled={refreshingBalance === 'g2bulk'}
                        >
                          {refreshingBalance === 'g2bulk' ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 ml-1" />}
                          فحص الرصيد
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    {/* Sync Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-lg p-3 text-center" style={{ backgroundColor: MAROON.darkest }}>
                        <p className="text-xl font-bold text-white">{categoryCount}</p>
                        <p className="text-[10px]" style={{ color: MAROON.muted }}>تصنيف</p>
                      </div>
                      <div className="rounded-lg p-3 text-center" style={{ backgroundColor: MAROON.darkest }}>
                        <p className="text-xl font-bold text-white">{productCount}</p>
                        <p className="text-[10px]" style={{ color: MAROON.muted }}>منتج</p>
                      </div>
                      <div className="rounded-lg p-3 text-center" style={{ backgroundColor: MAROON.darkest }}>
                        <p className={cn("text-xl font-bold", (g2bulk.balance || 0) < LOW_BALANCE_THRESHOLD ? "text-amber-400" : "text-green-400")}>
                          {g2bulk.balance !== undefined ? formatNumber(g2bulk.balance) : '—'}
                        </p>
                        <p className="text-[10px]" style={{ color: MAROON.muted }}>{g2bulk.balanceCurrency || 'USD'}</p>
                      </div>
                    </div>

                    {/* API Info */}
                    <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: MAROON.darkest }}>
                      <div className="flex items-center gap-2">
                        <Globe size={12} style={{ color: MAROON.muted }} />
                        <span className="text-[10px]" style={{ color: MAROON.muted }}>API URL:</span>
                        <code className="text-[10px] text-white" dir="ltr">https://api.g2bulk.com/v1/</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <KeyRound size={12} style={{ color: MAROON.muted }} />
                        <span className="text-[10px]" style={{ color: MAROON.muted }}>API Key:</span>
                        <code className="text-[10px] text-white" dir="ltr">{g2bulk.apiKey ? `${g2bulk.apiKey.slice(0, 12)}...` : '—'}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity size={12} style={{ color: MAROON.muted }} />
                        <span className="text-[10px]" style={{ color: MAROON.muted }}>Auth Header:</span>
                        <code className="text-[10px] text-white" dir="ltr">{g2bulk.authHeader || 'X-API-Key'}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories & Products Grid */}
                {categoryCount > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">التصنيفات والمنتجات</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {Object.entries(categories).map(([catId, cat]: [string, any]) => {
                        const catProducts = cat.products || {};
                        const catProductCount = Object.keys(catProducts).length;
                        return (
                          <Card key={catId} className="border-0 shadow-sm" style={{ backgroundColor: MAROON.card }}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-2">
                                {cat.icon ? (
                                  <img src={cat.icon} alt="" className="w-7 h-7 object-contain rounded" />
                                ) : (
                                  <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: `${MAROON.accent}20` }}>
                                    <Server className="w-3.5 h-3.5" style={{ color: MAROON.accent }} />
                                  </div>
                                )}
                                <span className="text-xs font-medium text-white flex-1">{cat.title}</span>
                                <Badge variant="outline" className="text-[9px] py-0" style={{ borderColor: MAROON.border, color: MAROON.muted }}>{catProductCount} منتج</Badge>
                              </div>
                              {catProductCount > 0 && (
                                <div className="space-y-1 max-h-32 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                  {Object.entries(catProducts).slice(0, 10).map(([prodId, prod]: [string, any]) => (
                                    <div key={prodId} className="flex items-center justify-between text-[10px] px-2 py-1 rounded" style={{ backgroundColor: MAROON.darkest }}>
                                      <span className="truncate text-white">{prod.title}</span>
                                      <span style={{ color: MAROON.muted }}>{prod.unit_price}$</span>
                                    </div>
                                  ))}
                                  {catProductCount > 10 && (
                                    <p className="text-[10px] text-center" style={{ color: MAROON.muted }}>+{catProductCount - 10} المزيد</p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ─── Provider Add/Edit Dialog ────────────────────────────────── */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" style={{ backgroundColor: MAROON.card, border: `1px solid ${MAROON.border}` }}>
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? 'تعديل مزود API' : 'إضافة مزود API'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">الاسم</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: G2Bulk" className="mt-1" style={{ backgroundColor: MAROON.darkest, color: 'white', border: `1px solid ${MAROON.border}` }} />
            </div>

            {/* Icon Upload */}
            <div>
              <Label className="text-white">أيقونة المزود</Label>
              <div className="flex items-center gap-3 mt-1">
                {icon && <img src={icon} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                <Button variant="outline" size="sm" asChild style={{ borderColor: MAROON.border, color: MAROON.muted }}>
                  <label><Upload className="w-4 h-4 ml-1" /> رفع أيقونة<input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} /></label>
                </Button>
                {icon && <Button variant="ghost" size="sm" onClick={() => setIcon('')}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            </div>

            <div>
              <Label className="text-white">رابط API الأساسي</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} dir="ltr" placeholder="https://api.g2bulk.com/v1/" className="mt-1" style={{ backgroundColor: MAROON.darkest, color: 'white', border: `1px solid ${MAROON.border}` }} />
            </div>
            <div>
              <Label className="text-white">مفتاح API</Label>
              <div className="relative mt-1">
                <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} dir="ltr" type={showApiKey ? 'text' : 'password'} placeholder="أدخل مفتاح API" className="pl-10" style={{ backgroundColor: MAROON.darkest, color: 'white', border: `1px solid ${MAROON.border}` }} />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute left-2 top-1/2 -translate-y-1/2 hover:text-foreground" style={{ color: MAROON.muted }}>
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-white">رأس المصادقة</Label>
              <Input value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} dir="ltr" placeholder="X-API-Key" className="mt-1" style={{ backgroundColor: MAROON.darkest, color: 'white', border: `1px solid ${MAROON.border}` }} />
              <p className="text-[10px] mt-1" style={{ color: MAROON.muted }}>مثال: X-API-Key أو Authorization</p>
            </div>
            <div>
              <Label className="text-white">API Secret (اختياري)</Label>
              <Input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} dir="ltr" type="password" placeholder="اختياري" className="mt-1" style={{ backgroundColor: MAROON.darkest, color: 'white', border: `1px solid ${MAROON.border}` }} />
            </div>

            {/* Section Assignment */}
            <div>
              <Label className="text-white">القسم الذي يظهر فيه</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {sectionOptions.map(opt => (
                  <button key={opt.value} onClick={() => setSectionId(opt.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: sectionId === opt.value ? MAROON.accent : MAROON.darkest,
                      color: sectionId === opt.value ? 'white' : MAROON.muted,
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Commission */}
            <div>
              <Label className="text-white">العمولة</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} className="flex-1" placeholder="0" style={{ backgroundColor: MAROON.darkest, color: 'white', border: `1px solid ${MAROON.border}` }} />
                <div className="flex gap-1">
                  <button onClick={() => setCommissionType('percentage')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: commissionType === 'percentage' ? MAROON.accent : MAROON.darkest,
                      color: commissionType === 'percentage' ? 'white' : MAROON.muted,
                    }}>
                    %
                  </button>
                  <button onClick={() => setCommissionType('fixed')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: commissionType === 'fixed' ? MAROON.accent : MAROON.darkest,
                      color: commissionType === 'fixed' ? 'white' : MAROON.muted,
                    }}>
                    ثابت
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-white">نشط</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
              <Label className="text-white">تفعيل المزامنة</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(false); resetForm(); }} style={{ borderColor: MAROON.border, color: MAROON.muted }}>إلغاء</Button>
            <Button onClick={handleSave} style={{ backgroundColor: MAROON.accent }}>{editing ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent style={{ backgroundColor: MAROON.card, border: `1px solid ${MAROON.border}` }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">تأكيد حذف المزود</AlertDialogTitle>
            <AlertDialogDescription style={{ color: MAROON.muted }}>
              هل أنت متأكد من حذف المزود &quot;{deleteConfirm ? providers[deleteConfirm]?.name : ''}&quot;؟ لا يمكن التراجع عن هذا الإجراء. سيتم حذف جميع التصنيفات والمنتجات المرتبطة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderColor: MAROON.border, color: MAROON.muted }}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-red-600 hover:bg-red-700 text-white">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
