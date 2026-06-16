'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Palette, RotateCcw, Save, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CardColor {
  primary: string;
  gradient: string;
  gradientStart: string;
  gradientEnd: string;
}

interface CardColors {
  YER: CardColor;
  SAR: CardColor;
  USD: CardColor;
}

const defaultColors: CardColors = {
  YER: { primary: '#5C1A1B', gradient: '#3D0F10', gradientStart: '#5C1A1B', gradientEnd: '#3D0F10' },
  SAR: { primary: '#059669', gradient: '#065F46', gradientStart: '#059669', gradientEnd: '#065F46' },
  USD: { primary: '#2563EB', gradient: '#1E40AF', gradientStart: '#2563EB', gradientEnd: '#1E40AF' },
};

const currencyNames: Record<string, string> = { YER: 'الريال اليمني', SAR: 'الريال السعودي', USD: 'الدولار الأمريكي' };
const currencySymbols: Record<string, string> = { YER: 'ر.ي', SAR: 'ر.س', USD: '$' };

export default function CardColorsPanel() {
  const { showToast } = useAdminStore();
  const [colors, setColors] = useState<CardColors>(defaultColors);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const ref_ = ref(database, 'adminSettings/cardColors');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setColors({
          YER: { ...defaultColors.YER, ...data.YER },
          SAR: { ...defaultColors.SAR, ...data.SAR },
          USD: { ...defaultColors.USD, ...data.USD },
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleColorChange = (currency: keyof CardColors, field: keyof CardColor, value: string) => {
    setColors((prev) => ({ ...prev, [currency]: { ...prev[currency], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Ensure each color has the `gradient` field (required by user app's CardColor type)
      const dataToSave: CardColors = {} as CardColors;
      for (const currency of Object.keys(colors) as Array<keyof CardColors>) {
        const c = colors[currency];
        dataToSave[currency] = {
          primary: c.primary,
          gradient: c.gradientEnd || c.gradient || c.gradientStart,
          gradientStart: c.gradientStart,
          gradientEnd: c.gradientEnd,
        };
      }
      await set(ref(database, 'adminSettings/cardColors'), dataToSave);
      showToast('تم حفظ ألوان البطائق بنجاح في Firebase', 'success');
    } catch (e) {
      showToast('حدث خطأ في الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Write test colors
      const testColors: CardColors = {
        YER: { primary: '#FF0000', gradient: '#990000', gradientStart: '#FF0000', gradientEnd: '#990000' },
        SAR: { primary: '#00CC00', gradient: '#006600', gradientStart: '#00CC00', gradientEnd: '#006600' },
        USD: { primary: '#0066FF', gradient: '#003399', gradientStart: '#0066FF', gradientEnd: '#003399' },
      };
      await set(ref(database, 'adminSettings/cardColors'), testColors);

      // Verify they're readable
      const snapshot = await get(ref(database, 'adminSettings/cardColors'));
      const readData = snapshot.val();
      if (readData && readData.YER && readData.SAR && readData.USD) {
        showToast('اختبار ناجح - الألوان قابلة للقراءة والكتابة', 'success');
        // Restore original colors
        await set(ref(database, 'adminSettings/cardColors'), colors);
      } else {
        showToast('فشل الاختبار - لم يتم قراءة الألوان بشكل صحيح', 'error');
      }
    } catch (e) {
      showToast('فشل اختبار الألوان', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => setColors(defaultColors);
  const handleResetCurrency = (currency: keyof CardColors) => setColors((prev) => ({ ...prev, [currency]: defaultColors[currency] }));

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ألوان البطائق</h1>
          <p className="text-muted-foreground text-sm mt-1">تخصيص ألوان بطائق المحفظة - يتم حفظها في adminSettings/cardColors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTest} size="sm" disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
            اختبار
          </Button>
          <Button variant="outline" onClick={handleReset} size="sm"><RotateCcw className="w-4 h-4 ml-1" /> إعادة تعيين</Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-purple-600 hover:bg-purple-700">
            {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
            حفظ التغييرات
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.keys(colors) as Array<keyof CardColors>).map((currency, idx) => (
          <motion.div key={currency} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className="admin-card border-0 shadow-none overflow-hidden">
              {/* Live Preview */}
              <div className="p-6 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors[currency].gradientStart}, ${colors[currency].gradientEnd})` }}>
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                  <div className="absolute top-4 left-4 w-20 h-20 rounded-full border-2 border-white/30" />
                  <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border-2 border-white/20" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <CreditCard className="w-8 h-8 opacity-80" />
                    <span className="text-sm opacity-80">{currencyNames[currency]}</span>
                  </div>
                  <p className="text-3xl font-bold mb-1">{currencySymbols[currency]}</p>
                  <p className="text-sm opacity-70">0.00</p>
                  <p className="text-xs opacity-50 mt-4 font-mono" dir="ltr">**** **** **** 1234</p>
                </div>
              </div>

              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{currencyNames[currency]}</h3>
                  <Button variant="ghost" size="sm" onClick={() => handleResetCurrency(currency)}><RotateCcw className="w-3 h-3" /></Button>
                </div>
                <div className="space-y-3">
                  {(['primary', 'gradientStart', 'gradientEnd'] as const).map(field => (
                    <div key={field}>
                      <Label className="text-xs">{field === 'primary' ? 'اللون الأساسي' : field === 'gradientStart' ? 'بداية التدرج' : 'نهاية التدرج'}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input type="color" value={colors[currency][field]} onChange={(e) => handleColorChange(currency, field, e.target.value)} className="w-12 h-8 p-1 cursor-pointer" />
                        <Input value={colors[currency][field]} onChange={(e) => handleColorChange(currency, field, e.target.value)} dir="ltr" className="flex-1 text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
