'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSections,
  upsertSection,
  deleteSection,
  reorderSections,
  toggleSectionVisibility,
  getApiProviders,
  type DbSection,
  type DbApiProvider,
  supabase,
} from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Layers, ArrowUp, ArrowDown, RotateCcw, Save, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Default sections matching user app's serviceIcons keys
const defaultSections: Partial<DbSection>[] = [
  { id: 'telecom', name: 'الاتصالات والشحن', icon: 'phone', sort_order: 0, is_visible: true, type: 'manual', color: '#5C1A1B' },
  { id: 'entertainment', name: 'الخدمات الترفيهية', icon: 'tv', sort_order: 1, is_visible: true, type: 'manual', color: '#5C1A1B' },
  { id: 'games', name: 'الألعاب', icon: 'gamepad-2', sort_order: 2, is_visible: true, type: 'manual', color: '#5C1A1B' },
  { id: 'gift-cards', name: 'بطاقات الهدايا', icon: 'gift', sort_order: 3, is_visible: true, type: 'manual', color: '#5C1A1B' },
  { id: 'digital-wallets', name: 'المحافظ الرقمية', icon: 'wallet', sort_order: 4, is_visible: true, type: 'manual', color: '#5C1A1B' },
];

const sectionTypes = [
  { value: 'manual', label: 'يدوي' },
  { value: 'api', label: 'API' },
  { value: 'wallet', label: 'محفظة' },
];

export default function SectionsPanel() {
  const { showToast } = useAdminStore();
  const [sections, setSections] = useState<DbSection[]>([]);
  const [apiProviders, setApiProviders] = useState<DbApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<DbSection | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [secId, setSecId] = useState('');
  const [secName, setSecName] = useState('');
  const [secNameEn, setSecNameEn] = useState('');
  const [secIcon, setSecIcon] = useState('');
  const [secColor, setSecColor] = useState('#5C1A1B');
  const [secOrder, setSecOrder] = useState('0');
  const [secVisible, setSecVisible] = useState(true);
  const [secActive, setSecActive] = useState(true);
  const [secType, setSecType] = useState<DbSection['type']>('manual');
  const [secApiProviderId, setSecApiProviderId] = useState('');
  const [secDescription, setSecDescription] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [secs, providers] = await Promise.all([getSections(), getApiProviders()]);
    setSections(secs);
    setApiProviders(providers);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('sections-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const handleInitializeDefaults = async () => {
    setSaving(true);
    try {
      for (const sec of defaultSections) {
        await upsertSection({
          id: sec.id!,
          name: sec.name || '',
          name_en: sec.id || '',
          description: '',
          icon: sec.icon || '',
          color: sec.color || '#5C1A1B',
          image_url: '',
          sort_order: sec.sort_order || 0,
          is_active: true,
          is_visible: sec.is_visible !== false,
          type: (sec.type as DbSection['type']) || 'manual',
          api_provider_id: '',
        });
      }
      showToast('تم إنشاء الأقسام الافتراضية', 'success');
      loadData();
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
    setSaving(false);
  };

  const openDialog = (section?: DbSection) => {
    if (section) {
      setEditing(section);
      setSecId(section.id);
      setSecName(section.name);
      setSecNameEn(section.name_en || '');
      setSecIcon(section.icon || '');
      setSecColor(section.color || '#5C1A1B');
      setSecOrder(String(section.sort_order));
      setSecVisible(section.is_visible);
      setSecActive(section.is_active);
      setSecType(section.type);
      setSecApiProviderId(section.api_provider_id || '');
      setSecDescription(section.description || '');
    } else {
      setEditing(null);
      setSecId('');
      setSecName('');
      setSecNameEn('');
      setSecIcon('');
      setSecColor('#5C1A1B');
      setSecOrder('0');
      setSecVisible(true);
      setSecActive(true);
      setSecType('manual');
      setSecApiProviderId('');
      setSecDescription('');
    }
    setDialog(true);
  };

  const handleSave = async () => {
    if (!secName || !secId) {
      showToast('يرجى ملء الحقول المطلوبة', 'error');
      return;
    }
    setSaving(true);
    try {
      const success = await upsertSection({
        id: secId,
        name: secName,
        name_en: secNameEn,
        description: secDescription,
        icon: secIcon,
        color: secColor,
        image_url: '',
        sort_order: parseInt(secOrder) || sections.length,
        is_active: secActive,
        is_visible: secVisible,
        type: secType,
        api_provider_id: secApiProviderId,
      });
      if (success) {
        showToast(editing ? 'تم التحديث' : 'تم الإضافة', 'success');
        setDialog(false);
        loadData();
      } else {
        showToast('حدث خطأ في الحفظ', 'error');
      }
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
    setSaving(false);
  };

  const handleMove = async (section: DbSection, direction: 'up' | 'down') => {
    const sorted = [...sections].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(s => s.id === section.id);
    if (direction === 'up' && idx > 0) {
      const prev = sorted[idx - 1];
      await Promise.all([
        upsertSection({ ...section, sort_order: prev.sort_order }),
        upsertSection({ ...prev, sort_order: section.sort_order }),
      ]);
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      await Promise.all([
        upsertSection({ ...section, sort_order: next.sort_order }),
        upsertSection({ ...next, sort_order: section.sort_order }),
      ]);
    }
    loadData();
  };

  const handleDelete = async (id: string) => {
    const success = await deleteSection(id);
    if (success) {
      showToast('تم الحذف', 'success');
      loadData();
    } else {
      showToast('حدث خطأ في الحذف', 'error');
    }
  };

  const handleToggle = async (s: DbSection) => {
    const success = await toggleSectionVisibility(s.id, !s.is_visible);
    if (!success) showToast('حدث خطأ', 'error');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-[#8B1E3A] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الأقسام</h1>
          <p className="text-muted-foreground text-sm mt-1">{formatNumber(sections.length)} قسم</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleInitializeDefaults} disabled={saving}>
            <RotateCcw className="w-4 h-4 ml-1" /> إنشاء الأقسام الافتراضية
          </Button>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 ml-1" /> تحديث
          </Button>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="w-4 h-4 ml-1" /> قسم جديد
          </Button>
        </div>
      </div>

      {/* Default sections reference */}
      <Card className="admin-card border-0 shadow-none">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">الأقسام المسموح بها في التطبيق:</p>
          <div className="flex flex-wrap gap-2">
            {defaultSections.map((sec, i) => (
              <Badge key={i} variant="outline" className="text-xs">{sec.name} ({sec.id})</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {sections.map((s, i) => {
          const provider = apiProviders.find(p => p.id === s.api_provider_id);
          return (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <Card className="admin-card border-0 shadow-none">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleMove(s, 'up')} className="text-muted-foreground hover:text-foreground"><ArrowUp className="w-3 h-3" /></button>
                      <button onClick={() => handleMove(s, 'down')} className="text-muted-foreground hover:text-foreground"><ArrowDown className="w-3 h-3" /></button>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: `${s.color || '#5C1A1B'}20` }}>
                      <Layers className="w-4 h-4" style={{ color: s.color || '#5C1A1B' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ترتيب: {s.sort_order} | {s.id}
                        {s.icon ? ` | أيقونة: ${s.icon}` : ''}
                        {s.type !== 'manual' ? ` | نوع: ${sectionTypes.find(t => t.value === s.type)?.label}` : ''}
                        {provider ? ` | مزود: ${provider.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={s.is_visible} onCheckedChange={() => handleToggle(s)} />
                    <Badge className={s.is_visible ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                      {s.is_visible ? 'ظاهر' : 'مخفي'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {sectionTypes.find(t => t.value === s.type)?.label || s.type}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => openDialog(s)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {sections.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">لا توجد أقسام. اضغط على &quot;إنشاء الأقسام الافتراضية&quot; للبدء</p>
          </div>
        )}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'تعديل قسم' : 'إضافة قسم'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>معرف القسم (ID) *</Label>
              <Input value={secId} onChange={(e) => setSecId(e.target.value)} placeholder="مثال: telecom" dir="ltr" disabled={!!editing} />
              <p className="text-xs text-muted-foreground mt-1">المسموح: telecom, entertainment, games, gift-cards, digital-wallets</p>
            </div>
            <div>
              <Label>الاسم (عربي) *</Label>
              <Input value={secName} onChange={(e) => setSecName(e.target.value)} />
            </div>
            <div>
              <Label>الاسم (إنجليزي)</Label>
              <Input value={secNameEn} onChange={(e) => setSecNameEn(e.target.value)} dir="ltr" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={secDescription} onChange={(e) => setSecDescription(e.target.value)} />
            </div>
            <div>
              <Label>مفتاح الأيقونة (iconKey)</Label>
              <Input value={secIcon} onChange={(e) => setSecIcon(e.target.value)} placeholder="مثال: phone, tv, gamepad-2, gift, wallet" dir="ltr" />
            </div>
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 items-center">
                <Input type="color" value={secColor} onChange={(e) => setSecColor(e.target.value)} className="w-12 h-8 p-0 border-0" />
                <Input value={secColor} onChange={(e) => setSecColor(e.target.value)} dir="ltr" className="flex-1" />
              </div>
            </div>
            <div>
              <Label>الترتيب</Label>
              <Input type="number" value={secOrder} onChange={(e) => setSecOrder(e.target.value)} dir="ltr" />
            </div>
            <div>
              <Label>نوع القسم</Label>
              <Select value={secType} onValueChange={(v) => setSecType(v as DbSection['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sectionTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {secType === 'api' && (
              <div>
                <Label>مزود API</Label>
                <Select value={secApiProviderId} onValueChange={setSecApiProviderId}>
                  <SelectTrigger><SelectValue placeholder="اختر مزود API" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون</SelectItem>
                    {apiProviders.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={secVisible} onCheckedChange={setSecVisible} /><Label>ظاهر</Label></div>
              <div className="flex items-center gap-2"><Switch checked={secActive} onCheckedChange={setSecActive} /><Label>مفعل</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !secName || !secId}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
