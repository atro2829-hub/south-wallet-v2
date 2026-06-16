'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, remove, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { QRCodeSVG } from 'qrcode.react';
import {
  Save, Loader2, Plus, Trash2, Edit, CreditCard, Wallet, Coins,
  QrCode, Network, Copy, Check, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CryptoNetwork {
  networkName: string;
  walletAddress: string;
  isActive: boolean;
}

interface CurrencyCard {
  id: string;
  code: string;
  name: string;
  symbol: string;
  color: string;
  icon: string;
  isActive: boolean;
  isCrypto: boolean;
  network?: string; // legacy
  walletAddress?: string; // legacy
  networks?: CryptoNetwork[];
  minDeposit?: number;
  minWithdraw?: number;
  exchangeRateToYER?: number;
}

const networkPresets = [
  'TRC20', 'ERC20', 'BEP20', 'Bitcoin', 'Solana', 'Polygon', 'Arbitrum', 'Optimism',
];

const defaultCurrencies: Omit<CurrencyCard, 'id'>[] = [
  { code: 'USDT', name: 'تيثر', symbol: 'USDT', color: '#26A17B', icon: 'crypto', isActive: true, isCrypto: true, networks: [{ networkName: 'TRC20', walletAddress: '', isActive: true }] , minDeposit: 10, minWithdraw: 20 },
  { code: 'BTC', name: 'بيتكوين', symbol: '₿', color: '#F7931A', icon: 'crypto', isActive: false, isCrypto: true, networks: [{ networkName: 'Bitcoin', walletAddress: '', isActive: true }], minDeposit: 0.0001, minWithdraw: 0.0002 },
  { code: 'ETH', name: 'إيثريوم', symbol: 'Ξ', color: '#627EEA', icon: 'crypto', isActive: false, isCrypto: true, networks: [{ networkName: 'ERC20', walletAddress: '', isActive: true }], minDeposit: 0.001, minWithdraw: 0.002 },
  { code: 'AED', name: 'الدرهم الإماراتي', symbol: 'د.إ', color: '#007A3D', icon: 'fiat', isActive: false, isCrypto: false, exchangeRateToYER: 425 },
  { code: 'EUR', name: 'اليورو', symbol: '€', color: '#003399', icon: 'fiat', isActive: false, isCrypto: false, exchangeRateToYER: 1700 },
  { code: 'TRY', name: 'الليرة التركية', symbol: '₺', color: '#E30A17', icon: 'fiat', isActive: false, isCrypto: false, exchangeRateToYER: 45 },
  { code: 'OMR', name: 'الريال العماني', symbol: 'ر.ع', color: '#DB161B', icon: 'fiat', isActive: false, isCrypto: false, exchangeRateToYER: 4046 },
  { code: 'KWD', name: 'الدينار الكويتي', symbol: 'د.ك', color: '#007A3D', icon: 'fiat', isActive: false, isCrypto: false, exchangeRateToYER: 5070 },
];

// Convert legacy format to networks array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeNetworks(cur: Record<string, any>): CryptoNetwork[] {
  // If networks array already exists, use it
  if (cur.networks && Array.isArray(cur.networks) && cur.networks.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return cur.networks.map((n: Record<string, any>) => ({
      networkName: n.networkName || '',
      walletAddress: n.walletAddress || '',
      isActive: n.isActive !== false,
    }));
  }
  // Convert legacy single network/walletAddress
  const nets: CryptoNetwork[] = [];
  if (cur.network || cur.walletAddress) {
    nets.push({
      networkName: cur.network || '',
      walletAddress: cur.walletAddress || '',
      isActive: true,
    });
  }
  return nets;
}

export default function CurrencyCardsPanel() {
  const { showToast } = useAdminStore();
  const [currencies, setCurrencies] = useState<CurrencyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<Omit<CurrencyCard, 'id'>>({
    code: '', name: '', symbol: '', color: '#627EEA', icon: 'fiat',
    isActive: true, isCrypto: false, networks: [],
    minDeposit: 0, minWithdraw: 0, exchangeRateToYER: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const curRef = ref(database, 'adminSettings/currencyCards');
    const unsub = onValue(curRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: CurrencyCard[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          code: val.code || '',
          name: val.name || '',
          symbol: val.symbol || '',
          color: val.color || '#627EEA',
          icon: val.icon || 'fiat',
          isActive: val.isActive !== false,
          isCrypto: val.isCrypto || false,
          network: val.network || '',
          walletAddress: val.walletAddress || '',
          networks: normalizeNetworks(val),
          minDeposit: val.minDeposit || 0,
          minWithdraw: val.minWithdraw || 0,
          exchangeRateToYER: val.exchangeRateToYER || 0,
        }));
        setCurrencies(list);
      } else {
        setCurrencies([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      showToast('يرجى إدخال رمز العملة واسمها', 'error');
      return;
    }
    setSaving(true);
    try {
      // eslint-disable-next-line react-hooks/purity
      const id = editingId || `cur-${Date.now()}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const saveData: Record<string, any> = {
        code: form.code,
        name: form.name,
        symbol: form.symbol,
        color: form.color,
        icon: form.icon,
        isActive: form.isActive,
        isCrypto: form.isCrypto,
        minDeposit: form.minDeposit,
        minWithdraw: form.minWithdraw,
        exchangeRateToYER: form.exchangeRateToYER,
        id,
      };
      // Save networks for crypto
      if (form.isCrypto && form.networks) {
        saveData.networks = form.networks;
      }
      // Keep legacy fields for backward compat
      if (form.isCrypto && form.networks && form.networks.length > 0) {
        saveData.network = form.networks[0].networkName;
        saveData.walletAddress = form.networks[0].walletAddress;
      }
      await set(ref(database, `adminSettings/currencyCards/${id}`), saveData);
      showToast(editingId ? 'تم تحديث العملة' : 'تم إضافة العملة', 'success');
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/currencyCards/${id}`));
      showToast('تم حذف العملة', 'success');
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleToggle = async (cur: CurrencyCard) => {
    try {
      await update(ref(database, `adminSettings/currencyCards/${cur.id}`), { isActive: !cur.isActive });
      showToast(cur.isActive ? 'تم تعطيل العملة' : 'تم تفعيل العملة', 'success');
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleEdit = (cur: CurrencyCard) => {
    setEditingId(cur.id);
    const networks = cur.networks && cur.networks.length > 0
      ? cur.networks
      : (cur.network || cur.walletAddress
        ? [{ networkName: cur.network || '', walletAddress: cur.walletAddress || '', isActive: true }]
        : []);
    setForm({
      code: cur.code, name: cur.name, symbol: cur.symbol, color: cur.color, icon: cur.icon,
      isActive: cur.isActive, isCrypto: cur.isCrypto, networks,
      minDeposit: cur.minDeposit || 0, minWithdraw: cur.minWithdraw || 0,
      exchangeRateToYER: cur.exchangeRateToYER || 0,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      code: '', name: '', symbol: '', color: '#627EEA', icon: 'fiat',
      isActive: true, isCrypto: false, networks: [],
      minDeposit: 0, minWithdraw: 0, exchangeRateToYER: 0,
    });
  };

  const handleInitDefaults = async () => {
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {};
      defaultCurrencies.forEach((cur, i) => {
        const id = `cur-default-${i}`;
        updates[id] = { ...cur, id };
      });
      await update(ref(database, 'adminSettings/currencyCards'), updates);
      showToast('تم إضافة العملات الافتراضية', 'success');
    } catch {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Network management helpers
  const addNetwork = (networkName: string = '') => {
    const currentNetworks = form.networks || [];
    setForm({
      ...form,
      networks: [...currentNetworks, { networkName, walletAddress: '', isActive: true }],
    });
  };

  const removeNetwork = (index: number) => {
    const currentNetworks = form.networks || [];
    setForm({
      ...form,
      networks: currentNetworks.filter((_, i) => i !== index),
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateNetwork = (index: number, field: keyof CryptoNetwork, value: any) => {
    const currentNetworks = form.networks || [];
    const updated = [...currentNetworks];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, networks: updated });
  };

  const handleCopyAddress = (address: string, key: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedAddress(key);
      setTimeout(() => setCopiedAddress(null), 2000);
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedAddress(key);
      setTimeout(() => setCopiedAddress(null), 2000);
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">بطاقات العملات</h1>
          <p className="text-muted-foreground text-sm mt-1">إضافة عملات رقمية وأجنبية مع شبكات متعددة ورموز QR</p>
        </div>
        <div className="flex gap-2">
          {currencies.length === 0 && (
            <Button onClick={handleInitDefaults} variant="outline" size="sm" disabled={saving}>
              إضافة الافتراضية
            </Button>
          )}
          <Button onClick={() => { setShowForm(!showForm); if (!showForm) { setEditingId(null); resetForm(); } }} size="sm">
            <Plus className="w-4 h-4 ml-1" />
            عملة جديدة
          </Button>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {form.isCrypto ? <Coins className="w-5 h-5 text-purple-500" /> : <CreditCard className="w-5 h-5 text-purple-500" />}
                  {editingId ? 'تعديل العملة' : 'إضافة عملة جديدة'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>رمز العملة (مثال: USDT)</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} dir="ltr" placeholder="USDT" />
                  </div>
                  <div>
                    <Label>اسم العملة (عربي)</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="تيثر" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الرمز</Label>
                    <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} dir="ltr" placeholder="$" />
                  </div>
                  <div>
                    <Label>اللون</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-10 p-1" />
                      <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} dir="ltr" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                  <div>
                    <p className="text-sm font-medium">عملة رقمية (كريبتو)</p>
                    <p className="text-xs text-muted-foreground">{form.isCrypto ? 'سيتم عرض خيارات الشبكات والمحفظة' : 'عملة ورقية تقليدية'}</p>
                  </div>
                  <Switch checked={form.isCrypto} onCheckedChange={(v) => setForm({ ...form, isCrypto: v, networks: v ? (form.networks && form.networks.length > 0 ? form.networks : []) : [] })} />
                </div>

                {form.isCrypto && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Network className="w-4 h-4" />
                        الشبكات
                      </Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => addNetwork()}>
                        <Plus className="w-3 h-3 ml-1" /> إضافة شبكة
                      </Button>
                    </div>

                    {/* Quick-add presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {networkPresets.map((preset) => {
                        const alreadyAdded = (form.networks || []).some(n => n.networkName === preset);
                        return (
                          <Button
                            key={preset}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={alreadyAdded}
                            onClick={() => addNetwork(preset)}
                            className="text-xs h-7"
                          >
                            {alreadyAdded && <Check className="w-3 h-3 ml-1" />}
                            {preset}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Networks list */}
                    <AnimatePresence>
                      {(form.networks || []).map((net, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 rounded-xl border bg-muted/30 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">شبكة {index + 1}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">نشطة</span>
                                <Switch
                                  checked={net.isActive}
                                  onCheckedChange={(v) => updateNetwork(index, 'isActive', v)}
                                />
                              </div>
                              <Button type="button" variant="ghost" size="sm" className="text-red-500 h-7 w-7 p-0" onClick={() => removeNetwork(index)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">اسم الشبكة</Label>
                              <Input
                                value={net.networkName}
                                onChange={(e) => updateNetwork(index, 'networkName', e.target.value)}
                                dir="ltr"
                                placeholder="TRC20"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">عنوان المحفظة</Label>
                              <Input
                                value={net.walletAddress}
                                onChange={(e) => updateNetwork(index, 'walletAddress', e.target.value)}
                                dir="ltr"
                                placeholder="TJxR4f8mQb..."
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>

                          {/* QR preview for this network */}
                          {net.walletAddress && (
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-background">
                              <div className="w-16 h-16 p-1 bg-white rounded-lg flex-shrink-0">
                                <QRCodeSVG
                                  value={net.walletAddress}
                                  size={56}
                                  level="M"
                                  bgColor="#FFFFFF"
                                  fgColor="#000000"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-muted-foreground">رمز QR لـ {net.networkName || 'شبكة'}</p>
                                <p className="text-xs font-mono truncate" dir="ltr">{net.walletAddress}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleCopyAddress(net.walletAddress, `${form.code}-${index}`)}
                              >
                                {copiedAddress === `${form.code}-${index}` ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {(form.networks || []).length === 0 && (
                      <div className="text-center p-4 rounded-xl bg-muted/20">
                        <Network className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">لم تتم إضافة شبكات بعد</p>
                        <p className="text-xs text-muted-foreground">أضف شبكة واحدة على الأقل أو استخدم الأزرار السريعة أعلاه</p>
                      </div>
                    )}
                  </div>
                )}

                {!form.isCrypto && (
                  <div>
                    <Label>سعر الصرف إلى الريال اليمني</Label>
                    <Input type="number" value={form.exchangeRateToYER} onChange={(e) => setForm({ ...form, exchangeRateToYER: parseFloat(e.target.value) || 0 })} dir="ltr" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الحد الأدنى للإيداع</Label>
                    <Input type="number" value={form.minDeposit} onChange={(e) => setForm({ ...form, minDeposit: parseFloat(e.target.value) || 0 })} dir="ltr" />
                  </div>
                  <div>
                    <Label>الحد الأدنى للسحب</Label>
                    <Input type="number" value={form.minWithdraw} onChange={(e) => setForm({ ...form, minWithdraw: parseFloat(e.target.value) || 0 })} dir="ltr" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700">
                    {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                    {editingId ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>إلغاء</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Currency Cards Grid */}
      {currencies.length === 0 ? (
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-8 text-center">
            <Wallet className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">لا توجد عملات إضافية</p>
            <p className="text-xs text-muted-foreground mt-1">أضف عملات رقمية أو أجنبية أو استخدم الافتراضية</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currencies.map((cur, i) => {
            const activeNetworks = (cur.networks || []).filter(n => n.isActive);
            return (
              <motion.div key={cur.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${cur.color}20`, color: cur.color }}>
                        {cur.symbol || cur.code}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{cur.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground" dir="ltr">{cur.code}</span>
                          {cur.isCrypto && <Badge variant="outline" className="text-[9px]">كريبتو</Badge>}
                        </div>
                      </div>
                      <Badge className={cur.isActive ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                        {cur.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>

                    {/* Networks section for crypto */}
                    {cur.isCrypto && (
                      <div className="mb-3">
                        {activeNetworks.length > 0 ? (
                          <div className="space-y-2">
                            {activeNetworks.map((net, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                                {/* QR Code thumbnail */}
                                {net.walletAddress ? (
                                  <div className="w-10 h-10 p-0.5 bg-white rounded flex-shrink-0">
                                    <QRCodeSVG
                                      value={net.walletAddress}
                                      size={36}
                                      level="L"
                                      bgColor="#FFFFFF"
                                      fgColor="#000000"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded flex items-center justify-center bg-muted flex-shrink-0">
                                    <QrCode className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <Badge variant="outline" className="text-[9px] mb-0.5">{net.networkName}</Badge>
                                  <p className="text-[10px] text-muted-foreground truncate" dir="ltr">
                                    {net.walletAddress || 'لا يوجد عنوان'}
                                  </p>
                                </div>
                                {net.walletAddress && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleCopyAddress(net.walletAddress, `${cur.id}-${idx}`)}
                                  >
                                    {copiedAddress === `${cur.id}-${idx}` ? (
                                      <Check className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : cur.network || cur.walletAddress ? (
                          /* Legacy format display */
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                            {cur.walletAddress ? (
                              <div className="w-10 h-10 p-0.5 bg-white rounded flex-shrink-0">
                                <QRCodeSVG
                                  value={cur.walletAddress}
                                  size={36}
                                  level="L"
                                  bgColor="#FFFFFF"
                                  fgColor="#000000"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded flex items-center justify-center bg-muted flex-shrink-0">
                                <QrCode className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {cur.network && <Badge variant="outline" className="text-[9px] mb-0.5">{cur.network}</Badge>}
                              <p className="text-[10px] text-muted-foreground truncate" dir="ltr">
                                {cur.walletAddress || 'لا يوجد عنوان'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">لا توجد شبكات مضافة</p>
                        )}
                      </div>
                    )}

                    {!cur.isCrypto && cur.exchangeRateToYER ? (
                      <p className="text-xs text-muted-foreground mb-1">السعر: 1 {cur.code} = {cur.exchangeRateToYER} ر.ي</p>
                    ) : null}

                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(cur)}>
                        <Edit className="w-3 h-3 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleToggle(cur)}>
                        {cur.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleDelete(cur.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
