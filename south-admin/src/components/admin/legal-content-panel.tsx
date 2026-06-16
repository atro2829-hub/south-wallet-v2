'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LegalContentPanel() {
  const { showToast } = useAdminStore();
  const [content, setContent] = useState({
    faq: '',
    privacyPolicy: '',
    aboutApp: '',
    termsOfService: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('faq');

  useEffect(() => {
    const ref_ = ref(database, 'adminSettings/legalContent');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      setContent({
        faq: data.faq || '',
        privacyPolicy: data.privacyPolicy || '',
        aboutApp: data.aboutApp || '',
        termsOfService: data.termsOfService || '',
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(database, 'adminSettings/legalContent'), content);
      showToast('تم حفظ المحتوى', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  const tabs = [
    { key: 'faq', label: 'الأسئلة الشائعة' },
    { key: 'privacyPolicy', label: 'سياسة الخصوصية' },
    { key: 'aboutApp', label: 'عن التطبيق' },
    { key: 'termsOfService', label: 'شروط الخدمة' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المحتوى القانوني</h1>
        <p className="text-muted-foreground text-sm mt-1">تعديل المحتوى القانوني والتوضيحي</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4 mb-4">
                {tabs.map(t => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}
              </TabsList>
              {tabs.map(t => (
                <TabsContent key={t.key} value={t.key}>
                  <Label className="mb-2 block">{t.label}</Label>
                  <Textarea
                    value={(content as any)[t.key]}
                    onChange={(e) => setContent({ ...content, [t.key]: e.target.value })}
                    className="min-h-[400px]"
                    placeholder={`اكتب محتوى ${t.label} هنا...`}
                  />
                </TabsContent>
              ))}
            </Tabs>

            <Button onClick={handleSave} disabled={saving} className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ المحتوى
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
