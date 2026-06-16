'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Edit, Trash2, Server, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

const categoryOptions = [
  { value: 'telecom', label: 'الاتصالات' },
  { value: 'internet', label: 'الإنترنت' },
  { value: 'entertainment', label: 'خدمات ترفيهية' },
  { value: 'cards', label: 'بطاقات رقمية' },
  { value: 'electricity', label: 'الكهرباء والماء' },
  { value: 'government', label: 'خدمات حكومية' },
  { value: 'crypto', label: 'الكريبتو' },
  { value: 'investment', label: 'استثمار الكريبتو' },
];

export default function ProvidersPanel() {
  const { showToast } = useAdminStore();
  const [providers, setProviders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  // Form
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('telecom');
  const [color, setColor] = useState('#6C3CE1');
  const [icon, setIcon] = useState('');
  const [inputLabel, setInputLabel] = useState('رقم الهاتف');
  const [inputType, setInputType] = useState('phone');
  const [inputPrefix, setInputPrefix] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const provRef = ref(database, 'providers');
    const unsub = onValue(provRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setProviders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setName(''); setCategoryId('telecom'); setColor('#6C3CE1');
    setIcon(''); setInputLabel('رقم الهاتف'); setInputType('phone');
    setInputPrefix(''); setIsActive(true); setEditing(null);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500000) {
      showToast('حجم الصورة يجب أن يكون أقل من 500KB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setIcon(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name) { showToast('يرجى إدخال الاسم', 'error'); return; }
    try {
      const data = {
        name, categoryId, color, icon, inputLabel, inputType, inputPrefix, isActive,
      };
      if (editing) {
        const updates: Record<string, any> = {
          [`providers/${editing.id}`]: { ...data, id: editing.id },
        };
        // Sync visibility to adminSettings/visibility/providers/{id}
        updates[`adminSettings/visibility/providers/${editing.id}`] = isActive;
        await update(ref(database), updates);
        showToast('تم تحديث المزود', 'success');
      } else {
        // Generate a clean slug-based ID from the provider name (Arabic-safe)
        const cleanId = name.trim()
          .replace(/[\s]+/g, '-')
          .replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, '')
          .toLowerCase();
        // Fallback to timestamp-based ID if name is empty after cleaning
        const providerId = cleanId || `provider-${Date.now()}`;
        const updates: Record<string, any> = {
          [`providers/${providerId}`]: { ...data, id: providerId },
        };
        // Sync visibility to adminSettings/visibility/providers/{id}
        updates[`adminSettings/visibility/providers/${providerId}`] = isActive;
        await update(ref(database), updates);
        showToast('تم إضافة المزود', 'success');
      }
      setDialog(false);
      resetForm();
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const updates: Record<string, any> = {
        [`providers/${id}`]: null,
        [`adminSettings/visibility/providers/${id}`]: null,
      };
      await update(ref(database), updates);
      showToast('تم حذف المزود', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleBulkToggle = async (enable: boolean) => {
    try {
      const updates: Record<string, any> = {};
      filteredProviders.forEach(p => {
        updates[`providers/${p.id}/isActive`] = enable;
        // Sync visibility to adminSettings/visibility/providers/{id}
        updates[`adminSettings/visibility/providers/${p.id}`] = enable;
      });
      await update(ref(database), updates);
      showToast(enable ? 'تم تفعيل جميع المزودين' : 'تم تعطيل جميع المزودين', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const filteredProviders = providers.filter(p => {
    const matchesSearch = !search || p.name?.includes(search) || p.categoryId?.includes(search);
    const matchesCategory = filterCategory === 'all' || p.categoryId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المزودون والخدمات</h1>
          <p className="text-muted-foreground text-sm mt-1">{formatNumber(providers.length)} مزود</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleBulkToggle(true)}>تفعيل الكل</Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkToggle(false)}>تعطيل الكل</Button>
          <Button size="sm" onClick={() => { resetForm(); setDialog(true); }}>
            <Plus className="w-4 h-4 ml-1" /> مزود جديد
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="التصنيف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع التصنيفات</SelectItem>
            {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin">
        {filteredProviders.map((prov, i) => (
          <motion.div key={prov.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {prov.icon ? (
                      <img src={prov.icon} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: prov.color + '20' }}>
                        <Server className="w-5 h-5" style={{ color: prov.color }} />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{prov.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryOptions.find(c => c.value === prov.categoryId)?.label || prov.categoryId}
                      </p>
                      {prov.inputLabel && <p className="text-xs text-muted-foreground">حقل: {prov.inputLabel} ({prov.inputType})</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={prov.isActive !== false}
                      onCheckedChange={(v) => update(ref(database), { [`providers/${prov.id}/isActive`]: v, [`adminSettings/visibility/providers/${prov.id}`]: v })}
                    />
                    <Badge className={prov.isActive !== false ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>
                      {prov.isActive !== false ? 'نشط' : 'معطل'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(prov);
                      setName(prov.name); setCategoryId(prov.categoryId || 'telecom');
                      setColor(prov.color || '#6C3CE1'); setIcon(prov.icon || '');
                      setInputLabel(prov.inputLabel || 'رقم الهاتف'); setInputType(prov.inputType || 'phone');
                      setInputPrefix(prov.inputPrefix || ''); setIsActive(prov.isActive !== false);
                      setDialog(true);
                    }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(prov.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filteredProviders.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد مزودين</p>}
      </div>

      {/* Provider Dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'تعديل مزود' : 'إضافة مزود'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>التصنيف</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>اللون</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
            <div>
              <Label>الأيقونة</Label>
              <div className="flex items-center gap-3 mt-1">
                {icon && <img src={icon} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                <Button variant="outline" size="sm" asChild>
                  <label><Upload className="w-4 h-4 ml-1" /> رفع أيقونة<input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} /></label>
                </Button>
                {icon && <Button variant="ghost" size="sm" onClick={() => setIcon('')}><Trash2 className="w-4 h-4" /></Button>}
              </div>
            </div>
            <div><Label>تسمية الحقل</Label><Input value={inputLabel} onChange={(e) => setInputLabel(e.target.value)} /></div>
            <div><Label>نوع الحقل</Label>
              <Select value={inputType} onValueChange={setInputType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">هاتف</SelectItem>
                  <SelectItem value="text">نص</SelectItem>
                  <SelectItem value="number">رقم</SelectItem>
                  <SelectItem value="account">حساب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>بادئة الحقل</Label><Input value={inputPrefix} onChange={(e) => setInputPrefix(e.target.value)} dir="ltr" placeholder="مثال: 967" /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSave}>{editing ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
