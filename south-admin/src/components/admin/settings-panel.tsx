'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, Settings as SettingsIcon, Wrench, AlertTriangle, Bell, Power, Navigation, Check, Globe, Shield, Smartphone, CreditCard, Wallet, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface MaintenanceData {
  active: boolean;
  message: string;
  estimatedTime: string;
  activatedAt: string;
  activatedBy: string;
}

interface ForceUpdateData {
  active: boolean;
  minVersion: string;
  updateUrl: string;
}

interface FeatureFlags {
  deposits: boolean;
  withdrawals: boolean;
  transfers: boolean;
  orders: boolean;
  kyc: boolean;
  giftCodes: boolean;
  escrow: boolean;
  exchange: boolean;
  cryptoWallet: boolean;
  investments: boolean;
}

export default function SettingsPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  // General settings
  const [appName, setAppName] = useState('');
  const [appNameEn, setAppNameEn] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [maxTransferAmount, setMaxTransferAmount] = useState(500000);
  const [minDepositAmount, setMinDepositAmount] = useState(1000);

  // Maintenance
  const [maintenance, setMaintenance] = useState<MaintenanceData>({
    active: false, message: '', estimatedTime: '', activatedAt: '', activatedBy: '',
  });

  // Force Update
  const [forceUpdate, setForceUpdate] = useState<ForceUpdateData>({
    active: false, minVersion: '1.0.0', updateUrl: '',
  });

  // Feature Flags
  const [features, setFeatures] = useState<FeatureFlags>({
    deposits: true, withdrawals: true, transfers: true, orders: true,
    kyc: true, giftCodes: true, escrow: true, exchange: true,
    cryptoWallet: true, investments: true,
  });

  // Notification settings
  const [depositNotifications, setDepositNotifications] = useState(true);
  const [withdrawNotifications, setWithdrawNotifications] = useState(true);
  const [kycNotifications, setKycNotifications] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const settingsRef = ref(database, 'ownerSettings/projectConfig');
    const unsub1 = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAppName(data.appName || '');
        setAppNameEn(data.appNameEn || '');
        setSupportEmail(data.supportEmail || '');
        setSupportPhone(data.supportPhone || '');
        setMaxTransferAmount(data.maxTransferAmount || 500000);
        setMinDepositAmount(data.minDepositAmount || 1000);
      }
    });

    const maintRef = ref(database, 'adminSettings/maintenance');
    const unsub2 = onValue(maintRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setMaintenance(data);
    });

    const updateRef = ref(database, 'adminSettings/forceUpdate');
    const unsub3 = onValue(updateRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setForceUpdate(data);
    });

    const featRef = ref(database, 'adminSettings/featureFlags');
    const unsub4 = onValue(featRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setFeatures({ ...features, ...data });
    });

    const notifRef = ref(database, 'adminSettings/notificationSettings');
    const unsub5 = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setDepositNotifications(data.depositNotifications !== false);
        setWithdrawNotifications(data.withdrawNotifications !== false);
        setKycNotifications(data.kycNotifications !== false);
        setOrderNotifications(data.orderNotifications !== false);
        setSoundEnabled(data.soundEnabled !== false);
      }
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'ownerSettings/projectConfig'), {
        appName, appNameEn, supportEmail, supportPhone,
        maxTransferAmount, minDepositAmount,
        updatedAt: new Date().toISOString(), updatedBy: adminUser?.uid,
      });
      showToast('تم حفظ الإعدادات', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
  };

  const handleToggleMaintenance = async () => {
    try {
      const newActive = !maintenance.active;
      await set(ref(database, 'adminSettings/maintenance'), {
        ...maintenance, active: newActive,
        activatedAt: newActive ? new Date().toISOString() : maintenance.activatedAt,
        activatedBy: newActive ? adminUser?.uid : maintenance.activatedBy,
      });
      showToast(newActive ? 'تم تفعيل وضع الصيانة' : 'تم تعطيل وضع الصيانة', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleSaveMaintenance = async () => {
    try {
      await set(ref(database, 'adminSettings/maintenance'), maintenance);
      showToast('تم حفظ إعدادات الصيانة', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleSaveForceUpdate = async () => {
    try {
      await set(ref(database, 'adminSettings/forceUpdate'), forceUpdate);
      showToast('تم حفظ إعدادات التحديث الإجباري', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleToggleFeature = async (key: keyof FeatureFlags) => {
    try {
      const newFeatures = { ...features, [key]: !features[key] };
      setFeatures(newFeatures);
      await set(ref(database, 'adminSettings/featureFlags'), newFeatures);
      showToast(`تم ${newFeatures[key] ? 'تفعيل' : 'تعطيل'} الميزة`, 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleSaveNotifications = async () => {
    try {
      await set(ref(database, 'adminSettings/notificationSettings'), {
        depositNotifications, withdrawNotifications, kycNotifications, orderNotifications, soundEnabled,
      });
      showToast('تم حفظ إعدادات الإشعارات', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  const featureItems: { key: keyof FeatureFlags; label: string; icon: React.ElementType }[] = [
    { key: 'deposits', label: 'الإيداعات', icon: Wallet },
    { key: 'withdrawals', label: 'السحوبات', icon: CreditCard },
    { key: 'transfers', label: 'التحويلات', icon: ArrowLeftRight },
    { key: 'orders', label: 'الطلبات', icon: Smartphone },
    { key: 'kyc', label: 'التحقق من الهوية', icon: Shield },
    { key: 'giftCodes', label: 'أكواد الهدايا', icon: Gift },
    { key: 'escrow', label: 'الضمان', icon: Shield },
    { key: 'exchange', label: 'الصرافة', icon: ArrowLeftRight },
    { key: 'cryptoWallet', label: 'محفظة الكريبتو', icon: Wallet },
    { key: 'investments', label: 'الاستثمارات', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="w-7 h-7 text-[#5C1A1B]" />الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">إعدادات النظام العامة</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 flex-wrap h-auto">
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="features">الميزات</TabsTrigger>
          <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
          <TabsTrigger value="update">التحديث</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>اسم التطبيق (عربي)</Label><Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="محفظة الجنوب" /></div>
                <div><Label>اسم التطبيق (إنجليزي)</Label><Input value={appNameEn} onChange={e => setAppNameEn(e.target.value)} placeholder="South Wallet" /></div>
                <div><Label>بريد الدعم</Label><Input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="support@southwallet.com" /></div>
                <div><Label>هاتف الدعم</Label><Input value={supportPhone} onChange={e => setSupportPhone(e.target.value)} placeholder="+967..." /></div>
                <div><Label>الحد الأقصى للتحويل (YER)</Label><Input type="number" value={maxTransferAmount} onChange={e => setMaxTransferAmount(Number(e.target.value))} /></div>
                <div><Label>الحد الأدنى للإيداع (YER)</Label><Input type="number" value={minDepositAmount} onChange={e => setMinDepositAmount(Number(e.target.value))} /></div>
              </div>
              <Button onClick={handleSaveGeneral} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
                {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}حفظ
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags */}
        <TabsContent value="features" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Power className="w-5 h-5 text-[#5C1A1B]" />تبديل الميزات</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featureItems.map(item => (
                  <div key={item.key} className={cn('flex items-center justify-between p-4 rounded-xl border border-border/30', !features[item.key] && 'opacity-50')}>
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-[#5C1A1B]" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <Switch checked={features[item.key]} onCheckedChange={() => handleToggleFeature(item.key)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Mode */}
        <TabsContent value="maintenance" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-[#5C1A1B]" />
                  <h3 className="text-lg font-bold">وضع الصيانة</h3>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={cn('text-xs', maintenance.active ? 'bg-red-500/15 text-red-600' : 'bg-green-500/15 text-green-600')}>
                    {maintenance.active ? 'مفعّل' : 'معطّل'}
                  </Badge>
                  <Switch checked={maintenance.active} onCheckedChange={handleToggleMaintenance} />
                </div>
              </div>

              {maintenance.active && (
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">وضع الصيانة مفعّل - التطبيق غير متاح للمستخدمين</span>
                </div>
              )}

              <div><Label>رسالة الصيانة</Label><Textarea value={maintenance.message} onChange={e => setMaintenance(m => ({ ...m, message: e.target.value }))} placeholder="التطبيق تحت الصيانة..." rows={2} /></div>
              <div><Label>الوقت المتوقع للانتهاء</Label><Input value={maintenance.estimatedTime} onChange={e => setMaintenance(m => ({ ...m, estimatedTime: e.target.value }))} placeholder="ساعة واحدة" /></div>
              <Button onClick={handleSaveMaintenance} variant="outline"><Save className="w-4 h-4 ml-2" />حفظ إعدادات الصيانة</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Force Update */}
        <TabsContent value="update" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2"><Navigation className="w-5 h-5 text-[#5C1A1B]" />تحديث إجباري</h3>
                <Switch checked={forceUpdate.active} onCheckedChange={v => setForceUpdate(f => ({ ...f, active: v }))} />
              </div>
              <div><Label>الحد الأدنى للإصدار</Label><Input value={forceUpdate.minVersion} onChange={e => setForceUpdate(f => ({ ...f, minVersion: e.target.value }))} placeholder="1.0.0" /></div>
              <div><Label>رابط التحديث</Label><Input value={forceUpdate.updateUrl} onChange={e => setForceUpdate(f => ({ ...f, updateUrl: e.target.value }))} placeholder="https://..." /></div>
              <Button onClick={handleSaveForceUpdate} variant="outline"><Save className="w-4 h-4 ml-2" />حفظ إعدادات التحديث</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-[#5C1A1B]" />إعدادات الإشعارات</h3>
              <div className="space-y-3">
                {[
                  { label: 'إشعارات الإيداع', value: depositNotifications, setter: setDepositNotifications },
                  { label: 'إشعارات السحب', value: withdrawNotifications, setter: setWithdrawNotifications },
                  { label: 'إشعارات التحقق', value: kycNotifications, setter: setKycNotifications },
                  { label: 'إشعارات الطلبات', value: orderNotifications, setter: setOrderNotifications },
                  { label: 'الأصوات', value: soundEnabled, setter: setSoundEnabled },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Switch checked={item.value} onCheckedChange={item.setter} />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveNotifications} variant="outline"><Save className="w-4 h-4 ml-2" />حفظ إعدادات الإشعارات</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
