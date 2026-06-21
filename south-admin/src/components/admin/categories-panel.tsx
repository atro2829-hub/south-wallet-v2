'use client';

// =====================================================================
// CategoriesPanel — إدارة الأقسام (Tree View) + مطابقة المزودين
// South Wallet Admin
// =====================================================================
// هيكل self-referencing: جدول categories واحد بـ parent_id
// - parent_id = NULL → قسم رئيسي
// - parent_id = X → قسم فرعي تابع للقسم X
//
// مزايا:
// 1. عرض شجري (Tree View) قابل للتوسع/الطي
// 2. إضافة/تعديل/حذف قسم مع اختيار القسم الأب
// 3. نظام مطابقة فئات G2Bulk مع الأقسام المحلية
// =====================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminHelpBox } from '@/components/admin/admin-help-box';
import {
  Plus, Trash2, Edit3, ChevronDown, ChevronRight, Folder, FolderOpen,
  Tag, Link2, AlertCircle, CheckCircle, Loader2, ArrowRight, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
  category_type: string;
  api_provider_id: string;
  children?: Category[];
}

interface ProviderCategory {
  id: string;
  provider_id: string;
  provider_category_id: string;
  provider_category_name: string;
  local_category_id: string | null;
  is_mapped: boolean;
  needs_attention: boolean;
  product_count: number;
  last_synced_at: string | null;
}

export default function CategoriesPanel() {
  const { showToast } = useAdminStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [providerCats, setProviderCats] = useState<ProviderCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState('tree');
  const [search, setSearch] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formParentId, setFormParentId] = useState('none');
  const [formSort, setFormSort] = useState('100');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIsVisible, setFormIsVisible] = useState(true);
  const [formType, setFormType] = useState('catalog');
  const [saving, setSaving] = useState(false);

  // Load categories from Supabase
  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;

      // Build tree structure
      const allCats: Category[] = (data || []).map((c: any) => ({
        ...c,
        children: [],
      }));

      const tree: Category[] = [];
      const map = new Map<string, Category>();
      allCats.forEach(c => map.set(c.id, { ...c, children: [] }));

      allCats.forEach(c => {
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.children!.push(map.get(c.id)!);
        } else if (!c.parent_id) {
          tree.push(map.get(c.id)!);
        }
      });

      setCategories(tree);
    } catch (e: any) {
      showToast('فشل تحميل الأقسام: ' + e.message, 'error');
    }
  }, [showToast]);

  // Load provider categories (for mapping tab)
  const loadProviderCats = useCallback(async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('provider_categories')
        .select('*')
        .order('needs_attention', { ascending: false })
        .order('provider_category_name', { ascending: true });
      if (error) throw error;
      setProviderCats(data || []);
    } catch (e: any) {
      console.warn('[categories] provider_categories load:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadCategories(), loadProviderCats()]);
      setLoading(false);
    })();
  }, [loadCategories, loadProviderCats]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId?: string) => {
    setEditing(null);
    setFormName('');
    setFormNameEn('');
    setFormIcon('');
    setFormParentId(parentId || 'none');
    setFormSort('100');
    setFormIsActive(true);
    setFormIsVisible(true);
    setFormType('catalog');
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormName(cat.name);
    setFormNameEn(cat.name_en);
    setFormIcon(cat.icon);
    setFormParentId(cat.parent_id || 'none');
    setFormSort(String(cat.sort_order));
    setFormIsActive(cat.is_active);
    setFormIsVisible(cat.is_visible);
    setFormType(cat.category_type);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('أدخل اسم القسم', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        name_en: formNameEn.trim(),
        icon: formIcon.trim(),
        parent_id: formParentId === 'none' ? null : formParentId,
        sort_order: parseInt(formSort) || 100,
        is_active: formIsActive,
        is_visible: formIsVisible,
        category_type: formType,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabaseAdmin
          .from('categories')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('تم تحديث القسم', 'success');
      } else {
        const id = formName.trim().toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 50) + '-' + Date.now().toString(36);
        const { error } = await supabaseAdmin
          .from('categories')
          .insert({ ...payload, id, slug: id });
        if (error) throw error;
        showToast('تم إضافة القسم', 'success');
      }
      setDialogOpen(false);
      await loadCategories();
    } catch (e: any) {
      showToast('حدث خطأ: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف الأقسام الفرعية التابعة له.')) return;
    try {
      // First, set parent_id=NULL for children
      await supabaseAdmin.from('categories').update({ parent_id: null }).eq('parent_id', id);
      // Then delete
      const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
      if (error) throw error;
      showToast('تم حذف القسم', 'success');
      await loadCategories();
    } catch (e: any) {
      showToast('حدث خطأ: ' + e.message, 'error');
    }
  };

  const handleMapProvider = async (pcId: string, localCatId: string) => {
    try {
      const { error } = await supabaseAdmin
        .from('provider_categories')
        .update({
          local_category_id: localCatId || null,
          is_mapped: !!localCatId,
          needs_attention: !localCatId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pcId);
      if (error) throw error;
      showToast('تم ربط الفئة بنجاح', 'success');
      await loadProviderCats();
    } catch (e: any) {
      showToast('حدث خطأ: ' + e.message, 'error');
    }
  };

  // Render tree node
  const renderNode = (cat: Category, level: number = 0) => {
    const isExpanded = expandedIds.has(cat.id);
    const hasChildren = cat.children && cat.children.length > 0;
    const matchesSearch = !search || cat.name.includes(search) || cat.name_en.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch && !hasChildren) return null;

    return (
      <div key={cat.id} style={{ marginRight: level * 24 }}>
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl transition-colors',
          level === 0 ? 'bg-muted/30' : 'hover:bg-muted/20'
        )}>
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button onClick={() => toggleExpand(cat.id)} className="p-1 hover:bg-muted rounded-lg">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Icon */}
          <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
            {cat.icon ? <span className="text-lg">{cat.icon}</span> : <Folder className="w-4 h-4 text-[#5C1A1B]" />}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{cat.name}</span>
              {level === 0 ? (
                <Badge className="bg-[#5C1A1B]/10 text-[#5C1A1B] text-[9px]">رئيسي</Badge>
              ) : (
                <Badge className="bg-blue-500/10 text-blue-600 text-[9px]">فرعي</Badge>
              )}
              {!cat.is_visible && <Badge className="bg-gray-500/10 text-gray-500 text-[9px]">مخفي</Badge>}
            </div>
            {cat.name_en && <span className="text-[10px] text-muted-foreground">{cat.name_en}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openCreate(cat.id)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cat)}>
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleDelete(cat.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Children */}
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {cat.children!.map(child => renderNode(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Flatten categories for the parent select
  const flatCategories = useCallback((): Category[] => {
    const result: Category[] = [];
    const walk = (cats: Category[]) => {
      for (const c of cats) {
        result.push(c);
        if (c.children) walk(c.children);
      }
    };
    walk(categories);
    return result;
  }, [categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#5C1A1B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHelpBox
        title="إدارة الأقسام"
        intro="نظام أقسام موحد (Self-referencing) — قسم رئيسي وفرعي في جدول واحد. اضغط السهم لتوسيع القسم الرئيسي ورؤية الفرعيين."
        steps={[
          { title: 'إضافة قسم رئيسي', description: 'اضغط "إضافة قسم" واترك حقل "القسم الأب" فارغاً.' },
          { title: 'إضافة قسم فرعي', description: 'اضغط + بجانب أي قسم رئيسي، أو اختر القسم الأب من القائمة المنسدلة.' },
          { title: 'مطابقة المزودين', description: 'في تبويب "مطابقة G2Bulk"، اربط كل فئة من المزود بقسمك المحلي.' },
        ]}
        tips={['يمكنك نقل قسم فرعي لقسم آخر بتغيير القسم الأب.', 'الأقسام المخفية لا تظهر للمستخدمين.']}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="w-7 h-7 text-[#5C1A1B]" /> إدارة الأقسام
          </h1>
          <p className="text-muted-foreground text-sm mt-1">أقسام رئيسية وفرعية + مطابقة المزودين</p>
        </div>
        <Button onClick={() => openCreate()} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
          <Plus className="w-4 h-4 ml-2" /> إضافة قسم
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tree"><Folder className="w-4 h-4 ml-1" /> الأقسام</TabsTrigger>
          <TabsTrigger value="mapping">
            <Link2 className="w-4 h-4 ml-1" /> مطابقة G2Bulk
            {providerCats.filter(p => p.needs_attention).length > 0 && (
              <Badge className="mr-2 bg-red-500/20 text-red-600 text-[9px]">
                {providerCats.filter(p => p.needs_attention).length} جديدة
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Tree View Tab ─── */}
        <TabsContent value="tree" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الأقسام..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-1">
              {categories.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  لا توجد أقسام. اضغط "إضافة قسم" للبدء.
                </div>
              ) : (
                categories.map(cat => renderNode(cat))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Provider Mapping Tab ─── */}
        <TabsContent value="mapping" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">مطابقة فئات G2Bulk مع أقسامك</CardTitle>
            </CardHeader>
            <CardContent>
              {providerCats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  لا توجد فئات من المزود. قم بتشغيل المزامنة أولاً.
                </div>
              ) : (
                <div className="space-y-2">
                  {providerCats.map(pc => (
                    <div
                      key={pc.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border',
                        pc.needs_attention
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : pc.is_mapped
                          ? 'border-green-500/20 bg-green-500/5'
                          : 'border-border'
                      )}
                    >
                      {pc.needs_attention ? (
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      ) : pc.is_mapped ? (
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <Tag className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pc.provider_category_name || pc.provider_category_id}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {pc.product_count} منتج • {pc.is_mapped ? 'مربوط' : 'غير مربوط'}
                        </p>
                      </div>
                      <Select
                        value={pc.local_category_id || 'none'}
                        onValueChange={(val) => handleMapProvider(pc.id, val === 'none' ? '' : val)}
                      >
                        <SelectTrigger className="w-48 h-8 text-xs">
                          <SelectValue placeholder="اختر القسم المحلي" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— غير مربوط —</SelectItem>
                          {flatCategories().map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.parent_id ? '  └─ ' : ''}{c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Add/Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل قسم' : 'إضافة قسم جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم القسم (عربي) *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثال: ببجي موبايل" />
            </div>
            <div>
              <Label>الاسم (إنجليزي)</Label>
              <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="PUBG Mobile" />
            </div>
            <div>
              <Label>الأيقونة (emoji أو اسم)</Label>
              <Input value={formIcon} onChange={(e) => setFormIcon(e.target.value)} placeholder="🎮" />
            </div>
            <div>
              <Label>القسم الأب</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="قسم رئيسي (لا أب)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— قسم رئيسي (لا أب) —</SelectItem>
                  {flatCategories()
                    .filter(c => c.id !== editing?.id) // prevent self-reference
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.parent_id ? '  └─ ' : ''}{c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الترتيب</Label>
                <Input type="number" value={formSort} onChange={(e) => setFormSort(e.target.value)} />
              </div>
              <div>
                <Label>النوع</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="catalog">منتجات/ألعاب</SelectItem>
                    <SelectItem value="service">خدمات</SelectItem>
                    <SelectItem value="wallet">محفظة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                <Label className="text-sm">نشط</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formIsVisible} onCheckedChange={setFormIsVisible} />
                <Label className="text-sm">مرئي للمستخدمين</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}