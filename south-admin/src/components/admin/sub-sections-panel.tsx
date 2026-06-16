'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Layers3, Search, Loader2, Plus, Edit, Trash2,
  Save, Eye, EyeOff, GripVertical, ChevronDown,
  FolderOpen, Folder,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Section {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
}

interface SubSection {
  id?: string;
  sectionId: string;
  sectionName: string;
  name: string;
  nameEn?: string;
  icon?: string;
  description?: string;
  order: number;
  isActive: boolean;
  visible: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function SubSectionsPanel() {
  const { showToast } = useAdminStore();
  const [subSections, setSubSections] = useState<SubSection[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');

  // Dialog
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<SubSection | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formSectionId, setFormSectionId] = useState('');
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [formVisible, setFormVisible] = useState(true);

  useEffect(() => {
    const sectionsRef = ref(database, 'sections');
    const unsub1 = onValue(sectionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Section[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        name: val.name || val.nameAr || '',
        nameEn: val.nameEn || '',
        icon: val.icon || '',
      }));
      setSections(list);
    });

    const subRef = ref(database, 'subSections');
    const unsub2 = onValue(subRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: SubSection[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        sectionId: val.sectionId || '',
        sectionName: val.sectionName || '',
        name: val.name || val.nameAr || '',
        nameEn: val.nameEn || '',
        icon: val.icon || '',
        description: val.description || '',
        order: val.order || 0,
        isActive: val.isActive !== false,
        visible: val.visible !== false,
        createdAt: val.createdAt || new Date().toISOString(),
        updatedAt: val.updatedAt || '',
      }));
      list.sort((a, b) => a.order - b.order);
      setSubSections(list);
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const filtered = useMemo(() => {
    return subSections.filter(s => {
      const matchSearch = search === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.sectionName.toLowerCase().includes(search.toLowerCase());
      const matchSection = sectionFilter === 'all' || s.sectionId === sectionFilter;
      return matchSearch && matchSection;
    });
  }, [subSections, search, sectionFilter]);

  const openDialog = (sub?: SubSection) => {
    if (sub) {
      setEditing(sub);
      setFormSectionId(sub.sectionId);
      setFormName(sub.name);
      setFormNameEn(sub.nameEn || '');
      setFormIcon(sub.icon || '');
      setFormDescription(sub.description || '');
      setFormOrder(sub.order);
      setFormActive(sub.isActive);
      setFormVisible(sub.visible);
    } else {
      setEditing(null);
      setFormSectionId(sections[0]?.id || '');
      setFormName('');
      setFormNameEn('');
      setFormIcon('');
      setFormDescription('');
      setFormOrder(subSections.length + 1);
      setFormActive(true);
      setFormVisible(true);
    }
    setDialog(true);
  };

  const save = async () => {
    if (!formName.trim()) { showToast('أدخل اسم القسم الفرعي', 'error'); return; }
    if (!formSectionId) { showToast('اختر القسم الرئيسي', 'error'); return; }
    setSaving(true);
    try {
      const section = sections.find(s => s.id === formSectionId);
      const data: Omit<SubSection, 'id'> = {
        sectionId: formSectionId,
        sectionName: section?.name || '',
        name: formName.trim(),
        nameEn: formNameEn.trim(),
        icon: formIcon.trim(),
        description: formDescription.trim(),
        order: formOrder,
        isActive: formActive,
        visible: formVisible,
        createdAt: editing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editing?.id) {
        await update(ref(database, `subSections/${editing.id}`), data);
      } else {
        await push(ref(database, 'subSections'), data);
      }
      showToast(editing ? 'تم تحديث القسم الفرعي' : 'تم إضافة القسم الفرعي', 'success');
      setDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSub = async (id: string) => {
    try {
      await remove(ref(database, `subSections/${id}`));
      showToast('تم حذف القسم الفرعي', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const toggleVisible = async (sub: SubSection) => {
    try {
      await update(ref(database, `subSections/${sub.id}`), { visible: !sub.visible });
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const toggleActive = async (sub: SubSection) => {
    try {
      await update(ref(database, `subSections/${sub.id}`), { isActive: !sub.isActive });
    } catch (e) {
      showToast('حدث خطأ', 'error');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers3 className="w-7 h-7 text-[#5C1A1B]" />
            الأقسام الفرعية
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الأقسام الفرعية تحت كل قسم رئيسي</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
          <Plus className="w-4 h-4 ml-2" />
          إضافة قسم فرعي
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="القسم الرئيسي" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأقسام</SelectItem>
                {sections.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Layers3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">لا توجد أقسام فرعية</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow', !sub.isActive && 'opacity-50')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#5C1A1B]/10 flex items-center justify-center shrink-0">
                          {sub.icon ? (
                            <span className="text-lg">{sub.icon}</span>
                          ) : (
                            <Folder className="w-5 h-5 text-[#5C1A1B]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{sub.name}</p>
                            {sub.nameEn && <span className="text-xs text-muted-foreground">({sub.nameEn})</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FolderOpen className="w-3 h-3" />
                            <span>{sub.sectionName}</span>
                            {sub.description && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[150px]">{sub.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">#{sub.order}</Badge>
                        <Badge variant="outline" className={cn('text-[10px]', sub.visible ? 'text-green-500' : 'text-red-500')}>
                          {sub.visible ? 'مرئي' : 'مخفي'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleVisible(sub)}>
                            {sub.visible ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDialog(sub)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => sub.id && deleteSub(sub.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل القسم الفرعي' : 'إضافة قسم فرعي'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>القسم الرئيسي</Label>
              <Select value={formSectionId} onValueChange={setFormSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم بالعربي</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="القسم الفرعي..." />
              </div>
              <div>
                <Label>الاسم بالإنجليزي</Label>
                <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="Sub section..." dir="ltr" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الأيقونة (إيموجي)</Label>
                <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="📱" />
              </div>
              <div>
                <Label>الترتيب</Label>
                <Input type="number" value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="وصف مختصر..." />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={formActive} onCheckedChange={setFormActive} />
                <Label>مفعّل</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formVisible} onCheckedChange={setFormVisible} />
                <Label>مرئي</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
