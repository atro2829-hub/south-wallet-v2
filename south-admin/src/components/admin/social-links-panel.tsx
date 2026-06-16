'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SocialLinksPanel() {
  const { showToast } = useAdminStore();
  const [links, setLinks] = useState({
    whatsapp: '',
    facebook: '',
    twitter: '',
    instagram: '',
    telegram: '',
    youtube: '',
    supportEmail: '',
    adminContact: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ref_ = ref(database, 'adminSettings/socialLinks');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      setLinks({
        whatsapp: data.whatsapp || '',
        facebook: data.facebook || '',
        twitter: data.twitter || '',
        instagram: data.instagram || '',
        telegram: data.telegram || '',
        youtube: data.youtube || '',
        supportEmail: data.supportEmail || '',
        adminContact: data.adminContact || '',
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await update(ref(database, 'adminSettings/socialLinks'), links);
      showToast('تم حفظ الروابط', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  const fields = [
    { key: 'whatsapp', label: 'واتساب', icon: 'W' },
    { key: 'facebook', label: 'فيسبوك', icon: 'F' },
    { key: 'twitter', label: 'تويتر / X', icon: 'X' },
    { key: 'instagram', label: 'انستغرام', icon: 'I' },
    { key: 'telegram', label: 'تيليغرام', icon: 'T' },
    { key: 'youtube', label: 'يوتيوب', icon: 'Y' },
    { key: 'supportEmail', label: 'بريد الدعم', icon: '@' },
    { key: 'adminContact', label: 'تواصل المدير', icon: 'A' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">روابط التواصل</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة روابط التواصل الاجتماعي</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-6 space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 font-bold text-sm shrink-0">
                  {f.icon}
                </div>
                <div className="flex-1">
                  <Label>{f.label}</Label>
                  <Input
                    value={(links as any)[f.key]}
                    onChange={(e) => setLinks({ ...links, [f.key]: e.target.value })}
                    dir="ltr"
                    placeholder={`رابط ${f.label}...`}
                  />
                </div>
              </div>
            ))}

            <Button onClick={handleSave} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ الروابط
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
