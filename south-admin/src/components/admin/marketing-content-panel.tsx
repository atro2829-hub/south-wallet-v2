'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Megaphone, Save, Loader2, MessageSquare, Bell,
  Mail, Gift, Sparkles, FileText, Palette,
  Smartphone, Globe,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface MarketingContent {
  welcomeMessage: string;
  welcomeMessageEn: string;
  welcomeEnabled: boolean;
  promoBanner: string;
  promoBannerEn: string;
  promoBannerEnabled: boolean;
  promoBannerLink: string;
  notificationTemplate: string;
  notificationTemplateEn: string;
  emailTemplate: string;
  emailTemplateEn: string;
  referralMessage: string;
  referralMessageEn: string;
  referralEnabled: boolean;
  maintenanceMessage: string;
  maintenanceMessageEn: string;
  termsSummary: string;
  aboutApp: string;
  aboutAppEn: string;
  featuredServices: string;
}

const defaultContent: MarketingContent = {
  welcomeMessage: 'مرحباً بك في محفظتنا!',
  welcomeMessageEn: 'Welcome to our wallet!',
  welcomeEnabled: true,
  promoBanner: '',
  promoBannerEn: '',
  promoBannerEnabled: false,
  promoBannerLink: '',
  notificationTemplate: '',
  notificationTemplateEn: '',
  emailTemplate: '',
  emailTemplateEn: '',
  referralMessage: 'ادعُ أصدقاءك واحصل على مكافأة!',
  referralMessageEn: 'Invite friends and earn rewards!',
  referralEnabled: true,
  maintenanceMessage: 'نحن نقوم بصيانة النظام. سنعود قريباً.',
  maintenanceMessageEn: 'We are under maintenance. We will be back soon.',
  termsSummary: '',
  aboutApp: '',
  aboutAppEn: '',
  featuredServices: '',
};

export default function MarketingContentPanel() {
  const { showToast } = useAdminStore();
  const [content, setContent] = useState<MarketingContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('welcome');

  useEffect(() => {
    const ref_ = ref(database, 'marketingContent');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      setContent({ ...defaultContent, ...data });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(database, 'marketingContent'), content);
      showToast('تم حفظ المحتوى التسويقي', 'success');
    } catch (e) {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'welcome', label: 'رسالة الترحيب', icon: MessageSquare },
    { id: 'promo', label: 'البانر الترويجي', icon: Gift },
    { id: 'notifications', label: 'قوالب الإشعارات', icon: Bell },
    { id: 'email', label: 'قوالب البريد', icon: Mail },
    { id: 'referral', label: 'الإحالة', icon: Sparkles },
    { id: 'about', label: 'عن التطبيق', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-[#5C1A1B]" />
            المحتوى التسويقي
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة المحتوى التسويقي والرسائل الترويجية</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          حفظ الكل
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          {tabs.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs gap-1">
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Welcome Message */}
        <TabsContent value="welcome" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-[#5C1A1B]" />
                  <h3 className="font-semibold">رسالة الترحيب</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={content.welcomeEnabled} onCheckedChange={(v) => setContent({ ...content, welcomeEnabled: v })} />
                  <Label>تفعيل رسالة الترحيب</Label>
                </div>
                <div>
                  <Label>الرسالة بالعربي</Label>
                  <Textarea
                    value={content.welcomeMessage}
                    onChange={(e) => setContent({ ...content, welcomeMessage: e.target.value })}
                    placeholder="رسالة الترحيب بالعربي..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>الرسالة بالإنجليزي</Label>
                  <Textarea
                    value={content.welcomeMessageEn}
                    onChange={(e) => setContent({ ...content, welcomeMessageEn: e.target.value })}
                    placeholder="Welcome message..."
                    rows={3}
                    dir="ltr"
                  />
                </div>
                {/* Preview */}
                {content.welcomeEnabled && content.welcomeMessage && (
                  <div className="p-4 bg-[#5C1A1B]/5 rounded-xl border border-[#5C1A1B]/10">
                    <p className="text-xs text-muted-foreground mb-1">معاينة:</p>
                    <p className="text-sm">{content.welcomeMessage}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Promo Banner */}
        <TabsContent value="promo" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-[#5C1A1B]" />
                  <h3 className="font-semibold">البانر الترويجي</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={content.promoBannerEnabled} onCheckedChange={(v) => setContent({ ...content, promoBannerEnabled: v })} />
                  <Label>تفعيل البانر</Label>
                </div>
                <div>
                  <Label>النص بالعربي</Label>
                  <Textarea
                    value={content.promoBanner}
                    onChange={(e) => setContent({ ...content, promoBanner: e.target.value })}
                    placeholder="عرض خاص! خصم 20% على جميع التحويلات..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>النص بالإنجليزي</Label>
                  <Textarea
                    value={content.promoBannerEn}
                    onChange={(e) => setContent({ ...content, promoBannerEn: e.target.value })}
                    placeholder="Special offer! 20% off all transfers..."
                    rows={2}
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>رابط البانر</Label>
                  <Input
                    value={content.promoBannerLink}
                    onChange={(e) => setContent({ ...content, promoBannerLink: e.target.value })}
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
                {content.promoBannerEnabled && content.promoBanner && (
                  <div className="p-4 bg-gradient-to-l from-[#5C1A1B] to-[#3D0F10] rounded-xl text-white">
                    <p className="text-sm font-semibold">{content.promoBanner}</p>
                    {content.promoBannerLink && <p className="text-xs mt-1 opacity-70">{content.promoBannerLink}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Notification Templates */}
        <TabsContent value="notifications" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-5 h-5 text-[#5C1A1B]" />
                  <h3 className="font-semibold">قوالب الإشعارات</h3>
                </div>
                <p className="text-xs text-muted-foreground">استخدم المتغيرات: {'{userName}'}, {'{amount}'}, {'{service}'}</p>
                <div>
                  <Label>قالب الإشعار بالعربي</Label>
                  <Textarea
                    value={content.notificationTemplate}
                    onChange={(e) => setContent({ ...content, notificationTemplate: e.target.value })}
                    placeholder="مرحباً {userName}، تم تنفيذ عملية {service} بمبلغ {amount}"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>قالب الإشعار بالإنجليزي</Label>
                  <Textarea
                    value={content.notificationTemplateEn}
                    onChange={(e) => setContent({ ...content, notificationTemplateEn: e.target.value })}
                    placeholder="Hello {userName}, {service} of {amount} has been processed"
                    rows={3}
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="email" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-5 h-5 text-[#5C1A1B]" />
                  <h3 className="font-semibold">قوالب البريد الإلكتروني</h3>
                </div>
                <div>
                  <Label>قالب البريد بالعربي</Label>
                  <Textarea
                    value={content.emailTemplate}
                    onChange={(e) => setContent({ ...content, emailTemplate: e.target.value })}
                    placeholder="مرحباً {userName}..."
                    rows={5}
                  />
                </div>
                <div>
                  <Label>قالب البريد بالإنجليزي</Label>
                  <Textarea
                    value={content.emailTemplateEn}
                    onChange={(e) => setContent({ ...content, emailTemplateEn: e.target.value })}
                    placeholder="Hello {userName}..."
                    rows={5}
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Referral */}
        <TabsContent value="referral" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-[#5C1A1B]" />
                  <h3 className="font-semibold">رسالة الإحالة</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={content.referralEnabled} onCheckedChange={(v) => setContent({ ...content, referralEnabled: v })} />
                  <Label>تفعيل نظام الإحالة</Label>
                </div>
                <div>
                  <Label>الرسالة بالعربي</Label>
                  <Textarea
                    value={content.referralMessage}
                    onChange={(e) => setContent({ ...content, referralMessage: e.target.value })}
                    placeholder="ادعُ أصدقاءك واحصل على مكافأة!"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>الرسالة بالإنجليزي</Label>
                  <Textarea
                    value={content.referralMessageEn}
                    onChange={(e) => setContent({ ...content, referralMessageEn: e.target.value })}
                    placeholder="Invite friends and earn rewards!"
                    rows={2}
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* About App */}
        <TabsContent value="about" className="mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-[#5C1A1B]" />
                  <h3 className="font-semibold">عن التطبيق</h3>
                </div>
                <div>
                  <Label>الوصف بالعربي</Label>
                  <Textarea
                    value={content.aboutApp}
                    onChange={(e) => setContent({ ...content, aboutApp: e.target.value })}
                    placeholder="وصف التطبيق بالعربي..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>الوصف بالإنجليزي</Label>
                  <Textarea
                    value={content.aboutAppEn}
                    onChange={(e) => setContent({ ...content, aboutAppEn: e.target.value })}
                    placeholder="App description in English..."
                    rows={4}
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
