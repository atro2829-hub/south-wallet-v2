'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DollarSign,
  Wallet,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  RefreshCw,
  Coins,
  Copy,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Types ──────────────────────────────────────────────────────────
interface UsdtProvider {
  id: string;
  section_id: string;
  sub_section_id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  input_label: string;
  input_type: string;
  is_active: boolean;
  sort_order: number;
  type: string;
  execution_type: string;
  created_at?: string;
  updated_at?: string;
}

interface UsdtPackage {
  id: string;
  provider_id: string;
  name: string;
  name_en: string;
  description: string;
  price_usd: number;
  price_yer: number;
  price_sar: number;
  cost_price: number;
  cost_currency: string;
  commission_amount: number;
  commission_type: string;
  execution_type: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface UsdtWalletAddress {
  id: string;
  network: string;
  network_name: string;
  address: string;
  label: string;
  qr_code_url: string;
  is_active: boolean;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

const USDT_IMAGE = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdt.svg';

const networkPresets = [
  { network: 'TRC20', network_name: 'TRON (TRC20)', label: 'USDT TRC20' },
  { network: 'ERC20', network_name: 'Ethereum (ERC20)', label: 'USDT ERC20' },
  { network: 'BEP20', network_name: 'Binance (BEP20)', label: 'USDT BEP20' },
];

const networkColors: Record<string, string> = {
  TRC20: '#26A17B',
  ERC20: '#627EEA',
  BEP20: '#F0B90B',
};

export default function UsdtPanel() {
  const { showToast } = useAdminStore();

  // ─── Data state ─────────────────────────────────────────────────
  const [providers, setProviders] = useState<UsdtProvider[]>([]);
  const [packages, setPackages] = useState<UsdtPackage[]>([]);
  const [walletAddresses, setWalletAddresses] = useState<UsdtWalletAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [activeTab, setActiveTab] = useState<'providers' | 'wallets'>('providers');

  // ─── Provider dialog state ──────────────────────────────────────
  const [providerDialog, setProviderDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<UsdtProvider | null>(null);
  const [provForm, setProvForm] = useState({
    id: '',
    name: '',
    name_en: '',
    sub_section_id: 'buy-usdt',
    description: '',
    image_url: USDT_IMAGE,
    input_label: 'عنوان محفظة USDT',
    input_type: 'text',
    is_active: true,
    sort_order: 1,
  });

  // ─── Package dialog state ───────────────────────────────────────
  const [packageDialog, setPackageDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<UsdtPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({
    id: '',
    provider_id: '',
    name: '',
    name_en: '',
    description: '',
    price_usd: 0,
    cost_price: 0,
    cost_currency: 'USD',
    commission_amount: 0,
    commission_type: 'percentage',
    is_active: true,
    sort_order: 1,
  });

  // ─── Wallet address dialog state ────────────────────────────────
  const [walletDialog, setWalletDialog] = useState(false);
  const [editingWallet, setEditingWallet] = useState<UsdtWalletAddress | null>(null);
  const [walletForm, setWalletForm] = useState({
    id: '',
    network: 'TRC20',
    network_name: 'TRON (TRC20)',
    address: '',
    label: 'USDT TRC20',
    qr_code_url: '',
    is_active: true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ─── Load everything ────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      // Providers
      const { data: provData, error: provErr } = await supabaseAdmin
        .from('service_providers')
        .select('*')
        .eq('section_id', 'usdt')
        .order('sort_order');
      if (provErr) throw provErr;
      setProviders((provData || []) as UsdtProvider[]);

      // Packages for those providers
      const provIds = (provData || []).map((p: any) => p.id);
      if (provIds.length === 0) {
        setPackages([]);
      } else {
        const { data: pkgData, error: pkgErr } = await supabaseAdmin
          .from('product_packages')
          .select('*')
          .in('provider_id', provIds)
          .order('sort_order');
        if (pkgErr) throw pkgErr;
        setPackages((pkgData || []) as UsdtPackage[]);
      }

      // Wallet addresses (USDT only)
      const { data: waData, error: waErr } = await supabaseAdmin
        .from('wallet_addresses')
        .select('*')
        .eq('currency', 'USDT')
        .order('created_at', { ascending: false });
      if (waErr) throw waErr;
      setWalletAddresses((waData || []) as UsdtWalletAddress[]);
    } catch (e) {
      console.error('[UsdtPanel] loadAll error:', e);
      showToast(`خطأ في التحميل: ${e instanceof Error ? e.message : 'غير معروف'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    // Realtime subscription so multiple admins stay in sync.
    const channel = supabaseAdmin
      .channel(`usdt-panel-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_providers', filter: 'section_id=eq.usdt' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_packages' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_addresses', filter: 'currency=eq.USDT' }, () => loadAll())
      .subscribe();
    return () => {
      try { supabaseAdmin.removeChannel(channel); } catch {}
    };
  }, [loadAll]);

  // ─── Provider handlers ──────────────────────────────────────────
  const resetProvForm = () => {
    setProvForm({
      id: '', name: '', name_en: '', sub_section_id: 'buy-usdt',
      description: '', image_url: USDT_IMAGE,
      input_label: 'عنوان محفظة USDT', input_type: 'text',
      is_active: true, sort_order: providers.length + 1,
    });
    setEditingProvider(null);
  };

  const openProviderDialog = (provider?: UsdtProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setProvForm({
        id: provider.id,
        name: provider.name || '',
        name_en: provider.name_en || '',
        sub_section_id: provider.sub_section_id || 'buy-usdt',
        description: provider.description || '',
        image_url: provider.image_url || USDT_IMAGE,
        input_label: provider.input_label || 'عنوان محفظة USDT',
        input_type: provider.input_type || 'text',
        is_active: provider.is_active !== false,
        sort_order: provider.sort_order ?? 1,
      });
    } else {
      resetProvForm();
    }
    setProviderDialog(true);
  };

  const handleSaveProvider = async () => {
    if (!provForm.name.trim()) {
      showToast('يرجى إدخال اسم المزود', 'error');
      return;
    }
    setSavingProvider(true);
    try {
      const now = new Date().toISOString();
      const payload: any = {
        section_id: 'usdt',
        sub_section_id: provForm.sub_section_id,
        name: provForm.name.trim(),
        name_en: provForm.name_en.trim() || provForm.name.trim(),
        description: provForm.description.trim(),
        icon: '',
        color: '#26A17B',
        image_url: provForm.image_url.trim() || USDT_IMAGE,
        input_label: provForm.input_label.trim(),
        input_type: provForm.input_type || 'text',
        input_prefix: '',
        is_active: provForm.is_active,
        is_visible: provForm.is_active,
        sort_order: provForm.sort_order,
        type: 'manual',
        api_provider_id: '',
        api_product_id: '',
        execution_type: 'manual',
        updated_at: now,
      };

      if (editingProvider) {
        const { error } = await supabaseAdmin
          .from('service_providers')
          .update(payload)
          .eq('id', editingProvider.id);
        if (error) throw error;
        showToast('تم تحديث المزود بنجاح', 'success');
      } else {
        const newId = `usdt-prov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        payload.id = newId;
        payload.created_at = now;
        const { error } = await supabaseAdmin
          .from('service_providers')
          .insert(payload);
        if (error) throw error;
        showToast('تم إضافة المزود بنجاح', 'success');
      }
      setProviderDialog(false);
      resetProvForm();
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleSaveProvider error:', e);
      showToast(`خطأ في الحفظ: ${e instanceof Error ? e.message : 'غير معروف'}`, 'error');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleToggleProvider = async (provider: UsdtProvider, active: boolean) => {
    try {
      const { error } = await supabaseAdmin
        .from('service_providers')
        .update({ is_active: active, is_visible: active, updated_at: new Date().toISOString() })
        .eq('id', provider.id);
      if (error) throw error;
      showToast(active ? 'تم تفعيل المزود' : 'تم تعطيل المزود', 'success');
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleToggleProvider error:', e);
      showToast('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDeleteProvider = async (provider: UsdtProvider) => {
    if (!confirm(`هل أنت متأكد من حذف المزود "${provider.name}"؟ سيتم حذف جميع الباقات المرتبطة به.`)) return;
    try {
      // Delete packages first (no ON DELETE CASCADE in some schemas)
      await supabaseAdmin.from('product_packages').delete().eq('provider_id', provider.id);
      const { error } = await supabaseAdmin.from('service_providers').delete().eq('id', provider.id);
      if (error) throw error;
      showToast('تم حذف المزود بنجاح', 'success');
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleDeleteProvider error:', e);
      showToast('خطأ في الحذف', 'error');
    }
  };

  // ─── Package handlers ───────────────────────────────────────────
  const resetPkgForm = () => {
    setPkgForm({
      id: '', provider_id: '', name: '', name_en: '',
      description: '', price_usd: 0, cost_price: 0, cost_currency: 'USD',
      commission_amount: 0, commission_type: 'percentage',
      is_active: true, sort_order: 1,
    });
    setEditingPackage(null);
  };

  const openPackageDialog = (provider: UsdtProvider, pkg?: UsdtPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPkgForm({
        id: pkg.id,
        provider_id: pkg.provider_id,
        name: pkg.name || '',
        name_en: pkg.name_en || '',
        description: pkg.description || '',
        price_usd: Number(pkg.price_usd) || 0,
        cost_price: Number(pkg.cost_price) || 0,
        cost_currency: pkg.cost_currency || 'USD',
        commission_amount: Number(pkg.commission_amount) || 0,
        commission_type: pkg.commission_type || 'percentage',
        is_active: pkg.is_active !== false,
        sort_order: pkg.sort_order ?? 1,
      });
    } else {
      resetPkgForm();
      const providerPkgs = packages.filter(p => p.provider_id === provider.id);
      setPkgForm(prev => ({
        ...prev,
        provider_id: provider.id,
        sort_order: providerPkgs.length + 1,
      }));
    }
    setPackageDialog(true);
  };

  const handleSavePackage = async () => {
    if (!pkgForm.provider_id) {
      showToast('اختر المزود أولاً', 'error');
      return;
    }
    if (!pkgForm.name.trim()) {
      showToast('يرجى إدخال اسم الباقة', 'error');
      return;
    }
    setSavingPackage(true);
    try {
      const now = new Date().toISOString();
      const commissionAmount = Number((pkgForm.price_usd - pkgForm.cost_price).toFixed(2));
      const payload: any = {
        provider_id: pkgForm.provider_id,
        name: pkgForm.name.trim(),
        name_en: pkgForm.name_en.trim() || pkgForm.name.trim(),
        description: pkgForm.description.trim(),
        price_usd: Number(pkgForm.price_usd) || 0,
        price_yer: 0,
        price_sar: 0,
        cost_price: Number(pkgForm.cost_price) || 0,
        cost_currency: pkgForm.cost_currency || 'USD',
        commission_amount: commissionAmount,
        commission_type: pkgForm.commission_type || 'percentage',
        execution_type: 'manual',
        api_product_id: '',
        is_active: pkgForm.is_active,
        sort_order: pkgForm.sort_order,
        updated_at: now,
      };

      if (editingPackage) {
        const { error } = await supabaseAdmin
          .from('product_packages')
          .update(payload)
          .eq('id', editingPackage.id);
        if (error) throw error;
        showToast('تم تحديث الباقة بنجاح', 'success');
      } else {
        const newId = `usdt-pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        payload.id = newId;
        payload.created_at = now;
        const { error } = await supabaseAdmin
          .from('product_packages')
          .insert(payload);
        if (error) throw error;
        showToast('تم إضافة الباقة بنجاح', 'success');
      }
      setPackageDialog(false);
      resetPkgForm();
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleSavePackage error:', e);
      showToast(`خطأ في الحفظ: ${e instanceof Error ? e.message : 'غير معروف'}`, 'error');
    } finally {
      setSavingPackage(false);
    }
  };

  const handleTogglePackage = async (pkg: UsdtPackage, active: boolean) => {
    try {
      const { error } = await supabaseAdmin
        .from('product_packages')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('id', pkg.id);
      if (error) throw error;
      showToast(active ? 'تم تفعيل الباقة' : 'تم تعطيل الباقة', 'success');
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleTogglePackage error:', e);
      showToast('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDeletePackage = async (pkg: UsdtPackage) => {
    if (!confirm(`هل أنت متأكد من حذف الباقة "${pkg.name}"؟`)) return;
    try {
      const { error } = await supabaseAdmin.from('product_packages').delete().eq('id', pkg.id);
      if (error) throw error;
      showToast('تم حذف الباقة بنجاح', 'success');
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleDeletePackage error:', e);
      showToast('خطأ في الحذف', 'error');
    }
  };

  // ─── Wallet address handlers ────────────────────────────────────
  const resetWalletForm = () => {
    setWalletForm({
      id: '', network: 'TRC20', network_name: 'TRON (TRC20)',
      address: '', label: 'USDT TRC20', qr_code_url: '',
      is_active: true,
    });
    setEditingWallet(null);
  };

  const openWalletDialog = (wa?: UsdtWalletAddress) => {
    if (wa) {
      setEditingWallet(wa);
      setWalletForm({
        id: wa.id,
        network: wa.network || 'TRC20',
        network_name: wa.network_name || '',
        address: wa.address || '',
        label: wa.label || '',
        qr_code_url: wa.qr_code_url || '',
        is_active: wa.is_active !== false,
      });
    } else {
      resetWalletForm();
    }
    setWalletDialog(true);
  };

  const handleSaveWallet = async () => {
    if (!walletForm.address.trim()) {
      showToast('يرجى إدخال عنوان المحفظة', 'error');
      return;
    }
    setSavingWallet(true);
    try {
      const now = new Date().toISOString();
      const payload: any = {
        network: walletForm.network,
        network_name: walletForm.network_name || walletForm.network,
        address: walletForm.address.trim(),
        label: walletForm.label.trim() || `USDT ${walletForm.network}`,
        qr_code_url: walletForm.qr_code_url.trim(),
        is_active: walletForm.is_active,
        currency: 'USDT',
        updated_at: now,
      };

      if (editingWallet) {
        const { error } = await supabaseAdmin
          .from('wallet_addresses')
          .update(payload)
          .eq('id', editingWallet.id);
        if (error) throw error;
        showToast('تم تحديث العنوان بنجاح', 'success');
      } else {
        const { error } = await supabaseAdmin
          .from('wallet_addresses')
          .insert({ ...payload, created_at: now });
        if (error) throw error;
        showToast('تم إضافة العنوان بنجاح', 'success');
      }
      setWalletDialog(false);
      resetWalletForm();
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleSaveWallet error:', e);
      showToast(`خطأ في الحفظ: ${e instanceof Error ? e.message : 'غير معروف'}`, 'error');
    } finally {
      setSavingWallet(false);
    }
  };

  const handleToggleWallet = async (wa: UsdtWalletAddress, active: boolean) => {
    try {
      const { error } = await supabaseAdmin
        .from('wallet_addresses')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('id', wa.id);
      if (error) throw error;
      showToast(active ? 'تم تفعيل العنوان' : 'تم تعطيل العنوان', 'success');
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleToggleWallet error:', e);
      showToast('خطأ في تحديث الحالة', 'error');
    }
  };

  const handleDeleteWallet = async (wa: UsdtWalletAddress) => {
    if (!confirm(`هل أنت متأكد من حذف العنوان "${wa.label}"؟`)) return;
    try {
      const { error } = await supabaseAdmin.from('wallet_addresses').delete().eq('id', wa.id);
      if (error) throw error;
      showToast('تم حذف العنوان بنجاح', 'success');
      await loadAll();
    } catch (e) {
      console.error('[UsdtPanel] handleDeleteWallet error:', e);
      showToast('خطأ في الحذف', 'error');
    }
  };

  const handleCopyAddress = async (address: string, id: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('تم نسخ العنوان', 'success');
    } catch {
      showToast('فشل النسخ', 'error');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 border-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(38,161,123,0.15)' }}>
            <DollarSign className="w-6 h-6" style={{ color: '#26A17B' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة USDT</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              إدارة مزودي خدمة USDT وباقاتهم وعناوين المحافظ
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadAll()}>
          <RefreshCw className="w-4 h-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">المزودون</span>
            </div>
            <p className="text-2xl font-bold mt-1">{providers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">الباقات</span>
            </div>
            <p className="text-2xl font-bold mt-1">{packages.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">العناوين</span>
            </div>
            <p className="text-2xl font-bold mt-1">{walletAddresses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'providers' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          المزودون والباقات
        </button>
        <button
          onClick={() => setActiveTab('wallets')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'wallets' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          عناوين المحافظ ({walletAddresses.length})
        </button>
      </div>

      {/* Providers + packages tab */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              مزودو خدمة USDT وباقاتهم (الأسعار بالدولار)
            </p>
            <Button size="sm" onClick={() => openProviderDialog()}>
              <Plus className="w-4 h-4 ml-1" />
              مزود جديد
            </Button>
          </div>

          {providers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  لا يوجد مزودو USDT بعد. اضغط &quot;مزود جديد&quot; لإضافة أول مزود.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-360px)] overflow-y-auto scrollbar-thin pr-1">
              {providers.map((provider, idx) => {
                const providerPkgs = packages.filter(p => p.provider_id === provider.id);
                return (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  >
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        {/* Provider header */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'rgba(38,161,123,0.1)' }}>
                              {provider.image_url ? (
                                <img src={provider.image_url} alt="" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <Wallet className="w-5 h-5 text-emerald-500" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{provider.name}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {provider.sub_section_id === 'buy-usdt' ? 'شراء' :
                                   provider.sub_section_id === 'sell-usdt' ? 'بيع' :
                                   provider.sub_section_id === 'usdt-plans' ? 'خطط' : provider.sub_section_id}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] py-0">{providerPkgs.length} باقة</Badge>
                                <Badge className={provider.is_active !== false ? 'bg-green-500/20 text-green-600 text-[9px] py-0' : 'bg-red-500/20 text-red-500 text-[9px] py-0'}>
                                  {provider.is_active !== false ? 'نشط' : 'معطل'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Switch
                              checked={provider.is_active !== false}
                              onCheckedChange={(v) => handleToggleProvider(provider, v)}
                            />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openProviderDialog(provider)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteProvider(provider)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {/* Packages */}
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          {providerPkgs.length === 0 ? (
                            <div className="flex items-center justify-between py-2">
                              <p className="text-xs text-muted-foreground">لا توجد باقات لهذا المزود</p>
                              <Button size="sm" variant="outline" onClick={() => openPackageDialog(provider)}>
                                <Plus className="w-3 h-3 ml-1" />
                                باقة
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground">الباقات:</p>
                                <Button size="sm" variant="outline" onClick={() => openPackageDialog(provider)}>
                                  <Plus className="w-3 h-3 ml-1" />
                                  باقة
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {providerPkgs.map((pkg) => {
                                  const margin = Number(pkg.price_usd) - Number(pkg.cost_price);
                                  const marginPct = Number(pkg.cost_price) > 0
                                    ? ((margin / Number(pkg.cost_price)) * 100).toFixed(1)
                                    : '0.0';
                                  return (
                                    <div
                                      key={pkg.id}
                                      className="rounded-lg border border-border p-2.5 text-xs"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium truncate">{pkg.name}</span>
                                        <Switch
                                          checked={pkg.is_active !== false}
                                          onCheckedChange={(v) => handleTogglePackage(pkg, v)}
                                        />
                                      </div>
                                      <div className="mt-1.5 space-y-0.5 text-[11px]">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">سعر البيع:</span>
                                          <span className="font-bold text-emerald-600">${Number(pkg.price_usd).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">التكلفة:</span>
                                          <span>${Number(pkg.cost_price).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">هامش الربح:</span>
                                          <span className={margin > 0 ? 'text-green-600' : 'text-red-500'}>
                                            ${margin.toFixed(2)} ({marginPct}%)
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-[11px]"
                                          onClick={() => openPackageDialog(provider, pkg)}
                                        >
                                          <Edit className="w-3 h-3 ml-1" />
                                          تعديل
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-[11px] text-red-500"
                                          onClick={() => handleDeletePackage(pkg)}
                                        >
                                          <Trash2 className="w-3 h-3 ml-1" />
                                          حذف
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Wallet addresses tab */}
      {activeTab === 'wallets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              عناوين محافظ USDT المستخدمة لاستلام الودائع (TRC20 / ERC20 / BEP20)
            </p>
            <Button size="sm" onClick={() => openWalletDialog()}>
              <Plus className="w-4 h-4 ml-1" />
              عنوان جديد
            </Button>
          </div>

          {walletAddresses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Wallet className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  لا توجد عناوين USDT بعد. اضغط &quot;عنوان جديد&quot; لإضافة عنوان.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-360px)] overflow-y-auto scrollbar-thin pr-1">
              {walletAddresses.map((wa, idx) => {
                const networkColor = networkColors[wa.network] || '#5C1A1B';
                return (
                  <motion.div
                    key={wa.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  >
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: networkColor + '20' }}>
                              <Coins className="w-5 h-5" style={{ color: networkColor }} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{wa.label}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[10px] py-0" style={{ borderColor: networkColor + '60', color: networkColor }}>
                                  {wa.network}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] py-0">USDT</Badge>
                                <Badge className={wa.is_active !== false ? 'bg-green-500/20 text-green-600 text-[9px] py-0' : 'bg-red-500/20 text-red-500 text-[9px] py-0'}>
                                  {wa.is_active !== false ? 'نشط' : 'معطل'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 mt-1.5 max-w-full">
                                <code className="text-[10px] bg-muted/50 px-2 py-0.5 rounded truncate max-w-[260px] block" dir="ltr">
                                  {wa.address}
                                </code>
                                <button
                                  onClick={() => handleCopyAddress(wa.address, wa.id)}
                                  className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors"
                                  title="نسخ"
                                >
                                  {copiedId === wa.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Switch
                              checked={wa.is_active !== false}
                              onCheckedChange={(v) => handleToggleWallet(wa, v)}
                            />
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openWalletDialog(wa)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteWallet(wa)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Provider Dialog */}
      <Dialog open={providerDialog} onOpenChange={(open) => { setProviderDialog(open); if (!open) resetProvForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'تعديل المزود' : 'إضافة مزود USDT'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>القسم الفرعي</Label>
              <select
                value={provForm.sub_section_id}
                onChange={(e) => setProvForm(prev => ({ ...prev, sub_section_id: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="buy-usdt">شراء USDT</option>
                <option value="sell-usdt">بيع USDT</option>
                <option value="usdt-plans">خطط USDT</option>
              </select>
            </div>
            <div>
              <Label>الاسم (عربي)</Label>
              <Input
                value={provForm.name}
                onChange={(e) => setProvForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="شراء USDT - TRC20"
              />
            </div>
            <div>
              <Label>الاسم (إنجليزي)</Label>
              <Input
                value={provForm.name_en}
                onChange={(e) => setProvForm(prev => ({ ...prev, name_en: e.target.value }))}
                placeholder="Buy USDT TRC20"
                dir="ltr"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input
                value={provForm.description}
                onChange={(e) => setProvForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف مختصر"
              />
            </div>
            <div>
              <Label>رابط الصورة</Label>
              <Input
                value={provForm.image_url}
                onChange={(e) => setProvForm(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder={USDT_IMAGE}
                dir="ltr"
              />
            </div>
            <div>
              <Label>عنوان حقل الإدخال (التسمية التي يراها المستخدم)</Label>
              <Input
                value={provForm.input_label}
                onChange={(e) => setProvForm(prev => ({ ...prev, input_label: e.target.value }))}
                placeholder="عنوان محفظة USDT (TRC20)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={provForm.sort_order}
                  onChange={(e) => setProvForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                  dir="ltr"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={provForm.is_active}
                  onCheckedChange={(v) => setProvForm(prev => ({ ...prev, is_active: v }))}
                />
                <Label>نشط</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProviderDialog(false); resetProvForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleSaveProvider} disabled={savingProvider}>
              {savingProvider ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              {editingProvider ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Dialog */}
      <Dialog open={packageDialog} onOpenChange={(open) => { setPackageDialog(open); if (!open) resetPkgForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'تعديل الباقة' : 'إضافة باقة USDT'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم الباقة</Label>
              <Input
                value={pkgForm.name}
                onChange={(e) => setPkgForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="USDT 10"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                ملاحظة: عند شراء المستخدم بكمية مخصصة، يتم استخراج القيمة الرقمية من اسم الباقة (مثلًا &quot;USDT 10&quot; → 10).
              </p>
            </div>
            <div>
              <Label>الاسم (إنجليزي)</Label>
              <Input
                value={pkgForm.name_en}
                onChange={(e) => setPkgForm(prev => ({ ...prev, name_en: e.target.value }))}
                placeholder="USDT 10"
                dir="ltr"
              />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input
                value={pkgForm.description}
                onChange={(e) => setPkgForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="وصف مختصر (اختياري)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>سعر البيع (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pkgForm.price_usd}
                  onChange={(e) => setPkgForm(prev => ({ ...prev, price_usd: Number(e.target.value) }))}
                  dir="ltr"
                />
              </div>
              <div>
                <Label>التكلفة (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pkgForm.cost_price}
                  onChange={(e) => setPkgForm(prev => ({ ...prev, cost_price: Number(e.target.value) }))}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">هامش الربح:</span>
                <span className="font-bold" style={{ color: (pkgForm.price_usd - pkgForm.cost_price) > 0 ? '#16a34a' : '#dc2626' }}>
                  ${(pkgForm.price_usd - pkgForm.cost_price).toFixed(2)}
                  {' '}
                  ({pkgForm.cost_price > 0 ? (((pkgForm.price_usd - pkgForm.cost_price) / pkgForm.cost_price) * 100).toFixed(1) : '0.0'}%)
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الترتيب</Label>
                <Input
                  type="number"
                  value={pkgForm.sort_order}
                  onChange={(e) => setPkgForm(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                  dir="ltr"
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={pkgForm.is_active}
                  onCheckedChange={(v) => setPkgForm(prev => ({ ...prev, is_active: v }))}
                />
                <Label>نشط</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPackageDialog(false); resetPkgForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleSavePackage} disabled={savingPackage}>
              {savingPackage ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              {editingPackage ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Address Dialog */}
      <Dialog open={walletDialog} onOpenChange={(open) => { setWalletDialog(open); if (!open) resetWalletForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWallet ? 'تعديل العنوان' : 'إضافة عنوان USDT'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>إضافة سريعة</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {networkPresets.map((preset) => (
                  <button
                    key={preset.network}
                    onClick={() => setWalletForm(prev => ({
                      ...prev,
                      network: preset.network,
                      network_name: preset.network_name,
                      label: prev.label || preset.label,
                    }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${walletForm.network === preset.network ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الشبكة</Label>
                <Input
                  value={walletForm.network}
                  onChange={(e) => setWalletForm(prev => ({ ...prev, network: e.target.value }))}
                  placeholder="TRC20"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>اسم الشبكة</Label>
                <Input
                  value={walletForm.network_name}
                  onChange={(e) => setWalletForm(prev => ({ ...prev, network_name: e.target.value }))}
                  placeholder="TRON (TRC20)"
                />
              </div>
            </div>
            <div>
              <Label>التسمية</Label>
              <Input
                value={walletForm.label}
                onChange={(e) => setWalletForm(prev => ({ ...prev, label: e.target.value }))}
                placeholder="USDT TRC20 - المحفظة الرئيسية"
              />
            </div>
            <div>
              <Label>عنوان المحفظة</Label>
              <Input
                value={walletForm.address}
                onChange={(e) => setWalletForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="T..."
                dir="ltr"
                className="text-left font-mono"
              />
            </div>
            <div>
              <Label>رابط رمز QR (اختياري)</Label>
              <Input
                value={walletForm.qr_code_url}
                onChange={(e) => setWalletForm(prev => ({ ...prev, qr_code_url: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={walletForm.is_active}
                onCheckedChange={(v) => setWalletForm(prev => ({ ...prev, is_active: v }))}
              />
              <Label>نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWalletDialog(false); resetWalletForm(); }}>
              إلغاء
            </Button>
            <Button onClick={handleSaveWallet} disabled={savingWallet}>
              {savingWallet ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              {editingWallet ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
