'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateId, cn, formatDateAr } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, RefreshCw, History, DollarSign, TrendingUp, ArrowRightLeft, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExchangeRatesPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [rates, setRates] = useState({ USD_YER: 1558, USD_SAR: 3.75, SAR_YER: 415.47 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const ratesRef = ref(database, 'adminSettings/exchangeRates');
    const unsub1 = onValue(ratesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRates({
          USD_YER: data.USD_YER || 1558,
          USD_SAR: data.USD_SAR || 3.75,
          SAR_YER: data.SAR_YER || 415.47,
        });
        setAutoSync(data.autoSync || false);
      }
      setLoading(false);
    });

    const histRef = ref(database, 'adminSettings/exchangeRateHistory');
    const unsub2 = onValue(histRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([key, val]: [string, any]) => ({ id: key, ...val }))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);
      setHistory(list);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/exchangeRates'), {
        ...rates, autoSync, updatedAt: new Date().toISOString(), updatedBy: adminUser?.uid,
      });

      // Log to history
      await push(ref(database, 'adminSettings/exchangeRateHistory'), {
        USD_YER: rates.USD_YER, USD_SAR: rates.USD_SAR, SAR_YER: rates.SAR_YER,
        timestamp: new Date().toISOString(), updatedBy: adminUser?.uid, adminName: adminUser?.displayName,
      });

      showToast('تم حفظ أسعار الصرف', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
  };

  const handleAutoSync = async () => {
    try {
      await set(ref(database, 'adminSettings/exchangeRates/autoSync'), !autoSync);
      showToast(!autoSync ? 'تم تفعيل المزامنة التلقائية' : 'تم تعطيل المزامنة التلقائية', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

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

          <div className="flex justify-end mt-4">
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
