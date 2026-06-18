'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateId, cn, formatDateAr } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdminHelpBox } from '@/components/admin/admin-help-box';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, RefreshCw, History, DollarSign, TrendingUp, ArrowRightLeft, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

// app_config key that stores the autoSync flag (the exchange_rates table
// itself has no such column, so we keep it in a small JSON blob here).
const EXTRAS_KEY = 'exchange_rates_extras';

export default function ExchangeRatesPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [rates, setRates] = useState({ USD_YER: 1558, USD_SAR: 3.75, SAR_YER: 415.47 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Load the latest exchange_rates row + recent history (last 20 rows).
  const loadRates = async () => {
    try {
      // Latest active row = current rates.
      const { data: latest, error: latestErr } = await supabaseAdmin
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestErr) {
        console.warn('[loadRates] latest error:', latestErr.message);
      } else if (latest) {
        setRates({
          USD_YER: Number(latest.usd_to_yer ?? 1558),
          USD_SAR: Number(latest.usd_to_sar ?? 3.75),
          SAR_YER: Number(latest.sar_to_yer ?? 415.47),
        });
      }
      // History: last 20 rows.
      const { data: histRows, error: histErr } = await supabaseAdmin
        .from('exchange_rates')
        .select('id, usd_to_yer, usd_to_sar, sar_to_yer, source, created_at, updated_by')
        .order('created_at', { ascending: false })
        .limit(20);
      if (histErr) {
        console.warn('[loadRates] history error:', histErr.message);
      } else {
        const list = (histRows || []).map((r: any) => ({
          id: r.id,
          USD_YER: Number(r.usd_to_yer ?? 0),
          USD_SAR: Number(r.usd_to_sar ?? 0),
          SAR_YER: Number(r.sar_to_yer ?? 0),
          timestamp: r.created_at,
          adminName: r.source || 'النظام',
        }));
        setHistory(list);
      }
      // autoSync flag from app_config.
      const { data: extrasRow } = await supabaseAdmin
        .from('app_config')
        .select('value')
        .eq('key', EXTRAS_KEY)
        .maybeSingle();
      if (extrasRow?.value) {
        const v = extrasRow.value as Record<string, any>;
        setAutoSync(v.autoSync === true);
      }
    } catch (e) {
      console.error('[loadRates] exception:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
    // Subscribe to realtime changes on exchange_rates so the panel stays in sync.
    const channel = supabaseAdmin
      .channel(`exchange-rates-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exchange_rates' }, () => loadRates())
      .subscribe();
    return () => {
      try { supabaseAdmin.removeChannel(channel); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Insert a new exchange_rates row representing the current rates.
  // Each save creates a new row so we keep a full history.
  const insertRatesRow = async (
    ratesToSave: { USD_YER: number; USD_SAR: number; SAR_YER: number },
    source: string,
    updatedBy: string | null,
  ) => {
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin.from('exchange_rates').insert({
      usd_to_yer: ratesToSave.USD_YER,
      usd_to_sar: ratesToSave.USD_SAR,
      sar_to_yer: ratesToSave.SAR_YER,
      source,
      is_active: true,
      updated_by: updatedBy,
      created_at: nowIso,
      updated_at: nowIso,
    });
    if (error) {
      console.error('[insertRatesRow] error:', error);
      throw error;
    }
  };

  const persistAutoSync = async (value: boolean) => {
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('app_config')
      .upsert({
        key: EXTRAS_KEY,
        value: { autoSync: value, updatedAt: nowIso },
        updated_at: nowIso,
      }, { onConflict: 'key' });
    if (error) console.warn('[persistAutoSync] error:', error.message);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await insertRatesRow(rates, adminUser?.displayName || 'admin', adminUser?.uid || null);
      showToast('تم حفظ أسعار الصرف', 'success');
    } catch (e: any) {
      console.error('Save error:', e);
      showToast('حدث خطأ: ' + (e?.message || ''), 'error');
    }
    finally { setSaving(false); }
  };

  const handleAutoSync = async () => {
    try {
      const newVal = !autoSync;
      setAutoSync(newVal);
      await persistAutoSync(newVal);
      showToast(newVal ? 'تم تفعيل المزامنة التلقائية' : 'تم تعطيل المزامنة التلقائية', 'success');
    } catch (e: any) {
      showToast('حدث خطأ: ' + (e?.message || ''), 'error');
    }
  };

  // Fetch live exchange rates from a free public API (open.er-api.com).
  // Updates the local state; admin still needs to press "حفظ" to persist.
  const [fetchingLive, setFetchingLive] = useState(false);
  const handleFetchLive = async () => {
    setFetchingLive(true);
    try {
      // open.er-api.com is free, no API key required, returns USD-based rates.
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.rates) throw new Error('Invalid response');
      const usdYer = data.rates.YER ? Math.round(data.rates.YER) : rates.USD_YER;
      const usdSar = data.rates.SAR ? Number(data.rates.SAR.toFixed(4)) : rates.USD_SAR;
      const sarYer = usdSar > 0 ? Math.round((usdYer / usdSar) * 100) / 100 : rates.SAR_YER;
      setRates({ USD_YER: usdYer, USD_SAR: usdSar, SAR_YER: sarYer });
      showToast(`تم جلب الأسعار: 1 USD = ${usdYer} YER / ${usdSar} SAR`, 'success');
    } catch (e: any) {
      console.error('Live rates fetch failed:', e);
      showToast('فشل جلب الأسعار من المزود. تحقق من الإنترنت.', 'error');
    } finally {
      setFetchingLive(false);
    }
  };

  // Auto-sync: when enabled, fetch live rates every 30 minutes
  useEffect(() => {
    if (!autoSync) return;
    const fetchAndSave = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!res.ok) return;
        const data = await res.json();
        if (!data.rates) return;
        const usdYer = data.rates.YER ? Math.round(data.rates.YER) : null;
        const usdSar = data.rates.SAR ? Number(data.rates.SAR.toFixed(4)) : null;
        if (usdYer && usdSar) {
          const sarYer = Math.round((usdYer / usdSar) * 100) / 100;
          const newRates = { USD_YER: usdYer, USD_SAR: usdSar, SAR_YER: sarYer };
          setRates(newRates);
          await insertRatesRow(newRates, 'open.er-api.com (auto-sync)', null);
        }
      } catch (e) {
        console.warn('Auto-sync exchange rates failed:', e);
      }
    };
    fetchAndSave();
    const interval = setInterval(fetchAndSave, 30 * 60 * 1000); // 30 min
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync]);

  // Calculated rates
  const calculatedRates = useMemo(() => ({
    YER_USD: 1 / rates.USD_YER,
    SAR_USD: 1 / rates.USD_SAR,
    YER_SAR: 1 / rates.SAR_YER,
  }), [rates]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <AdminHelpBox
        title="كيفية إدارة أسعار الصرف"
        intro="أسعار الصرف بين الريال اليمني (YER) والريال السعودي (SAR) والدولار (USD). تُستخدم تلقائياً في كل التحويلات والمعاملات."
        steps={[
          { title: 'تحديث الأسعار', description: 'أدخل السعر الحالي لكل عملة مقابل الأخريات. مثلاً: 1 USD = 530 YER، 1 SAR = 141 YER.' },
          { title: 'المزامنة التلقائية', description: 'يمكنك تفعيل التحديث التلقائي من مزود خارجي (مثل Yahoo Finance) كل ساعة. مفيد لتتبع السوق.' },
          { title: 'هامش الصرافة', description: 'أضف نسبة هامش (مثلاً 2%) لكل عملية صرف. هذا يضمن ربحك من فروق العملات.' },
          { title: 'حفظ التغييرات', description: 'اضغط "حفظ" — الأسعار الجديدة تُطبَّق فوراً على كل المعاملات الجديدة. المعاملات القديمة لا تُعاد تسويتها.' },
        ]}
        tips={[
          'راجع الأسعار يومياً في حالة تقلب السوق.',
          'لا تضع أسعاراً متباعدة جداً عن السوق — يضر بثقة المستخدم.',
          'احفظ سجل تاريخي للأسعار للتحليل الشهري.',
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="w-7 h-7 text-[#5C1A1B]" />أسعار الصرف</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة أسعار تحويل العملات</p>
      </div>

      {/* Current Rate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { from: 'USD', to: 'YER', rate: rates.USD_YER, label: 'دولار → ريال يمني', color: 'from-blue-600 to-blue-800' },
          { from: 'USD', to: 'SAR', rate: rates.USD_SAR, label: 'دولار → ريال سعودي', color: 'from-green-600 to-green-800' },
          { from: 'SAR', to: 'YER', rate: rates.SAR_YER, label: 'ريال سعودي → ريال يمني', color: 'from-[#5C1A1B] to-[#3D0F10]' },
        ].map((r, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className={cn('h-2 bg-gradient-to-r', r.color)} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{r.label}</p>
                    <p className="text-2xl font-bold mt-1">{formatNumber(r.rate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-muted/50">{r.from}</Badge>
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    <Badge className="bg-muted/50">{r.to}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Rate Editor */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">تعديل الأسعار</h3>
            <div className="flex items-center gap-3">
              <Label className="text-sm">مزامنة تلقائية</Label>
              <Switch checked={autoSync} onCheckedChange={handleAutoSync} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label>USD → YER</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={rates.USD_YER || ''} onChange={e => setRates(r => ({ ...r, USD_YER: Number(e.target.value) }))} className="text-lg font-mono" />
                <span className="text-sm text-muted-foreground">ر.ي</span>
              </div>
              <p className="text-xs text-muted-foreground">العكس: {calculatedRates.YER_USD.toFixed(6)} USD</p>
            </div>
            <div className="space-y-3">
              <Label>USD → SAR</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={rates.USD_SAR || ''} onChange={e => setRates(r => ({ ...r, USD_SAR: Number(e.target.value) }))} step="0.01" className="text-lg font-mono" />
                <span className="text-sm text-muted-foreground">ر.س</span>
              </div>
              <p className="text-xs text-muted-foreground">العكس: {calculatedRates.SAR_USD.toFixed(6)} USD</p>
            </div>
            <div className="space-y-3">
              <Label>SAR → YER</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={rates.SAR_YER || ''} onChange={e => setRates(r => ({ ...r, SAR_YER: Number(e.target.value) }))} step="0.01" className="text-lg font-mono" />
                <span className="text-sm text-muted-foreground">ر.ي</span>
              </div>
              <p className="text-xs text-muted-foreground">العكس: {calculatedRates.YER_SAR.toFixed(6)} SAR</p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Conversion Preview */}
          <div className="p-4 bg-muted/30 rounded-xl">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" />معاينة التحويل</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-xs text-muted-foreground">1 USD</p><p className="text-lg font-bold">{formatNumber(rates.USD_YER)} YER</p></div>
              <div><p className="text-xs text-muted-foreground">1 USD</p><p className="text-lg font-bold">{rates.USD_SAR} SAR</p></div>
              <div><p className="text-xs text-muted-foreground">1 SAR</p><p className="text-lg font-bold">{formatNumber(rates.SAR_YER)} YER</p></div>
            </div>
          </div>

          <div className="flex justify-end mt-4 gap-2">
            <Button onClick={handleFetchLive} disabled={fetchingLive} variant="outline">
              {fetchingLive ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <TrendingUp className="w-4 h-4 ml-2" />}
              جلب الأسعار الحية (USD/YER/SAR)
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ الأسعار
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate Change History */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><History className="w-4 h-4 text-[#5C1A1B]" />سجل التغييرات</h3>
          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">لا يوجد سجل تغييرات</p>
            ) : (
              history.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 text-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{entry.timestamp ? formatDateAr(entry.timestamp) : '-'}</span>
                    <span className="text-xs text-muted-foreground">({entry.adminName || 'النظام'})</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span>USD/YER: <strong>{formatNumber(entry.USD_YER)}</strong></span>
                    <span>USD/SAR: <strong>{entry.USD_SAR}</strong></span>
                    <span>SAR/YER: <strong>{formatNumber(entry.SAR_YER)}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
