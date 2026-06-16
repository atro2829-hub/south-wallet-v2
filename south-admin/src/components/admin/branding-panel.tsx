'use client';

import { useState, useEffect } from 'react';
import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Palette, Save, Loader2, Upload, Eye, Smartphone, Type, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BrandingPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [appNameAr, setAppNameAr] = useState('');
  const [appNameEn, setAppNameEn] = useState('');
  const [appIcon, setAppIcon] = useState('');
  const [appIconPreview, setAppIconPreview] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#5C1A1B');
  const [secondaryColor, setSecondaryColor] = useState('#C41E3A');
  const [accentColor, setAccentColor] = useState('#D44A5C');
  const [splashBgColor, setSplashBgColor] = useState('#1A0A0E');
  const [splashTextColor, setSplashTextColor] = useState('#F5E6E8');

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const snapshot = await get(ref(database, 'ownerSettings/branding'));
        const data = snapshot.val();
        if (data) {
          setAppNameAr(data.appNameAr || '');
          setAppNameEn(data.appNameEn || '');
          setAppIcon(data.appIcon || '');
          setAppIconPreview(data.appIcon || '');
          setPrimaryColor(data.primaryColor || '#5C1A1B');
          setSecondaryColor(data.secondaryColor || '#C41E3A');
          setAccentColor(data.accentColor || '#D44A5C');
          setSplashBgColor(data.splashBgColor || '#1A0A0E');
          setSplashTextColor(data.splashTextColor || '#F5E6E8');
        }
      } catch (e) {
        console.error('Error loading branding:', e);
      }
      setLoading(false);
    };
    loadBranding();
  }, []);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAppIcon(result);
      setAppIconPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(database, 'ownerSettings/branding'), {
        appNameAr, appNameEn, appIcon, primaryColor, secondaryColor,
        accentColor, splashBgColor, splashTextColor,
        updatedAt: new Date().toISOString(), updatedBy: adminUser?.uid,
      });
      // Also update project config for app name
      await update(ref(database, 'ownerSettings/projectConfig'), {
        appName: appNameAr, appNameEn,
      });
      setSaveSuccess(true);
      showToast('تم حفظ إعدادات العلامة التجارية', 'success');
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="w-7 h-7 text-[#5C1A1B]" />العلامة التجارية</h1>
        <p className="text-muted-foreground text-sm mt-1">تخصيص مظهر وشعار التطبيق</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* App Name */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Type className="w-5 h-5 text-[#5C1A1B]" />اسم التطبيق</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>الاسم بالعربي</Label><Input value={appNameAr} onChange={e => setAppNameAr(e.target.value)} placeholder="محفظة الجنوب" /></div>
                <div><Label>الاسم بالإنجليزي</Label><Input value={appNameEn} onChange={e => setAppNameEn(e.target.value)} placeholder="South Wallet" /></div>
              </div>
            </CardContent>
          </Card>

          {/* App Icon */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Smartphone className="w-5 h-5 text-[#5C1A1B]" />شعار التطبيق</h3>
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#5C1A1B] to-[#3D0F10] flex items-center justify-center overflow-hidden shadow-lg">
                  {appIconPreview ? (
                    <img src={appIconPreview} alt="شعار" className="w-16 h-16 object-contain" />
                  ) : (
                    <Palette className="w-8 h-8 text-white/50" />
                  )}
                </div>
                <div className="flex-1">
                  <Label>رفع شعار جديد</Label>
                  <p className="text-xs text-muted-foreground mt-1">PNG أو SVG، يفضل 512×512 بكسل</p>
                  <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-sm">
                    <Upload className="w-4 h-4" />اختر ملف
                    <input type="file" accept="image/*" onChange={handleIconUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Palette className="w-5 h-5 text-[#5C1A1B]" />الألوان</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>اللون الأساسي</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                    <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <Label>اللون الثانوي</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                    <Input value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <Label>لون التمييز</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                    <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Splash Screen */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Smartphone className="w-5 h-5 text-[#5C1A1B]" />شاشة البداية</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>لون الخلفية</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={splashBgColor} onChange={e => setSplashBgColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                    <Input value={splashBgColor} onChange={e => setSplashBgColor(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <Label>لون النص</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={splashTextColor} onChange={e => setSplashTextColor(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
                    <Input value={splashTextColor} onChange={e => setSplashTextColor(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full bg-[#5C1A1B] hover:bg-[#3D0F10] h-12">
            {saving ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : saveSuccess ? <Check className="w-5 h-5 ml-2" /> : <Save className="w-5 h-5 ml-2" />}
            {saveSuccess ? 'تم الحفظ بنجاح' : 'حفظ التغييرات'}
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Eye className="w-4 h-4 text-[#5C1A1B]" />معاينة</h3>

              {/* Phone Frame */}
              <div className="relative mx-auto w-[200px] h-[380px] rounded-[2rem] border-4 border-gray-800 overflow-hidden shadow-2xl">
                {/* Splash Screen Preview */}
                <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: splashBgColor }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg mb-3" style={{ backgroundColor: primaryColor }}>
                    {appIconPreview ? <img src={appIconPreview} alt="" className="w-10 h-10 object-contain" /> : <Palette className="w-8 h-8 text-white/50" />}
                  </div>
                  <p className="text-sm font-bold" style={{ color: splashTextColor }}>{appNameAr || 'محفظة الجنوب'}</p>
                  <p className="text-[10px] mt-1 opacity-60" style={{ color: splashTextColor }}>{appNameEn || 'South Wallet'}</p>
                </div>
              </div>

              {/* Color Palette Preview */}
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">لوحة الألوان</p>
                <div className="flex gap-2">
                  <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: primaryColor }} />
                  <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: secondaryColor }} />
                  <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: accentColor }} />
                </div>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span className="flex-1 text-center">أساسي</span>
                  <span className="flex-1 text-center">ثانوي</span>
                  <span className="flex-1 text-center">تمييز</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
