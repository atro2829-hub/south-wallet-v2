'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Plus, Edit3, Trash2, ChevronRight, ChevronDown,
  Loader2, Search, RefreshCw, Eye, EyeOff, Check, X,
  Gamepad2, Gift, Smartphone, Signal, Banknote, Wifi, Tag,
  AlertCircle, GripVertical, Star, FolderOpen, FolderPlus,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';

interface Category {
  id: string;
  name_ar: string;
  name_en: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  category_type: string;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
  screen_type: string;
  show_in_home: boolean;
  show_in_services: boolean;
  is_featured: boolean;
  section_group: string;
  description: string;
  depth: number;
  parent_section_id: string | null;
  api_category_id: string | null;
  children?: Category[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  'gamepad-2': Gamepad2, 'gift': Gift, 'smartphone': Smartphone,
  'signal': Signal, 'banknote': Banknote, 'wifi': Wifi, 'tag': Tag,
  'layout-grid': LayoutGrid, 'folder-open': FolderOpen,
};

function CatIcon({ icon, color, size = 16 }: { icon: string; color: string; size?: number }) {
  const I = ICON_MAP[icon] || LayoutGrid;
  return <I style={{ color, width: size, height: size }} />;
}

const SCREEN_TYPES = [
  { value: 'api-games', label: 'ألعاب API' },
  { value: 'api-products', label: 'منتجات API' },
  { value: 'telecom', label: 'اتصالات' },
  { value: 'exchange', label: 'صرف عملات' },
  { value: 'manual', label: 'يدوي' },
  { value: 'usdt', label: 'USDT' },
  { value: 'investment', label: 'استثمار' },
  { value: 'escrow', label: 'وسيط' },
];

const GROUPS = [
  { value: 'providers', label: 'مزودو الخدمات' },
  { value: 'services', label: 'الخدمات المالية' },
  { value: 'promotional', label: 'ترويجي' },
  { value: 'main', label: 'رئيسي' },
];

function buildTree(cats: Category[]): Category[] {
  const roots = cats.filter(c => !c.parent_section_id);
  const children = cats.filter(c => !!c.parent_section_id);
  return roots.map(r => ({
    ...r,
    children: children.filter(c => c.parent_section_id === r.id).sort((a, b) => a.sort_order - b.sort_order),
  })).sort((a, b) => a.sort_order - b.sort_order);
}

const EMPTY_FORM = {
  name_ar: '', name_en: '', slug: '', icon: 'layout-grid', color: '#5C1A1B',
  category_type: 'root', screen_type: 'api-products', section_group: 'providers',
  is_featured: false, show_in_home: true, show_in_services: false,
  description: '', api_category_id: '', parent_section_id: '',
};

export default function OrganizedCategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [activeView, setActiveView] = useState<'tree' | 'flat'>('tree');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: err } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('sort_order');
    if (err) { setError(err.message); setLoading(false); return; }
    const cats = data || [];
    setCategories(cats);
    setTree(buildTree(cats.filter(c => c.depth !== undefined ? c.depth <= 1 : true)));
    // Auto-expand top-level
    const exp: Record<string, boolean> = {};
    cats.filter(c => !c.parent_section_id).forEach(c => { exp[c.id] = true; });
    setExpanded(exp);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name_ar.trim() || !form.slug.trim()) {
      setError('الاسم والـ slug مطلوبان');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name_ar: form.name_ar,
        name_en: form.name_en,
        name: form.name_ar,
        slug: form.slug,
        icon: form.icon,
        color: form.color,
        category_type: form.parent_section_id ? 'sub' : 'root',
        screen_type: form.screen_type,
        section_group: form.section_group,
        is_featured: form.is_featured,
        show_in_home: form.show_in_home,
        show_in_services: form.show_in_services,
        description: form.description,
        api_category_id: form.api_category_id || null,
        parent_section_id: form.parent_section_id || null,
        depth: form.parent_section_id ? 1 : 0,
        is_active: true,
        is_visible: true,
        sort_order: editingCat ? editingCat.sort_order : categories.length,
        updated_at: new Date().toISOString(),
      };
      if (editingCat) {
        await supabaseAdmin.from('categories').update(payload).eq('id', editingCat.id);
      } else {
        await supabaseAdmin.from('categories').insert(payload);
      }
      setShowForm(false);
      setEditingCat(null);
      setForm({ ...EMPTY_FORM });
      await load();
    } catch (e: any) {
      setError(e.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const deleteCat = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
    await supabaseAdmin.from('categories').delete().eq('id', id);
    await load();
  };

  const toggle = async (cat: Category) => {
    await supabaseAdmin.from('categories').update({
      is_active: !cat.is_active, is_visible: !cat.is_visible,
    }).eq('id', cat.id);
    await load();
  };

  const toggleHome = async (cat: Category) => {
    await supabaseAdmin.from('categories').update({ show_in_home: !cat.show_in_home }).eq('id', cat.id);
    await load();
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setForm({
      name_ar: cat.name_ar || '', name_en: cat.name_en || '',
      slug: cat.slug || '', icon: cat.icon || 'layout-grid', color: cat.color || '#5C1A1B',
      category_type: cat.category_type || 'root', screen_type: cat.screen_type || 'api-products',
      section_group: cat.section_group || 'providers', is_featured: cat.is_featured || false,
      show_in_home: cat.show_in_home ?? true, show_in_services: cat.show_in_services ?? false,
      description: cat.description || '', api_category_id: cat.api_category_id || '',
      parent_section_id: cat.parent_section_id || '',
    });
    setShowForm(true);
  };

  const rootCats = categories.filter(c => !c.parent_section_id && c.is_active !== false);
  const filteredFlat = categories.filter(c =>
    c.name_ar?.toLowerCase().includes(search.toLowerCase()) ||
    c.name_en?.toLowerCase().includes(search.toLowerCase()) ||
    c.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: categories.length,
    roots: categories.filter(c => !c.parent_section_id).length,
    subs: categories.filter(c => !!c.parent_section_id).length,
    active: categories.filter(c => c.is_active).length,
    home: categories.filter(c => c.show_in_home).length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-purple-500" />
            إدارة الأقسام المنظّمة
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            هرمية كاملة: أقسام رئيسية → أقسام فرعية (ألعاب، هدايا، تطبيقات، اتصالات…)
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="mr-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'الكل', value: stats.total, color: 'purple' },
          { label: 'رئيسية', value: stats.roots, color: 'blue' },
          { label: 'فرعية', value: stats.subs, color: 'green' },
          { label: 'نشطة', value: stats.active, color: 'emerald' },
          { label: 'الرئيسية', value: stats.home, color: 'orange' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الـ slug..."
            className="w-full bg-background border border-border rounded-lg pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['tree', 'flat'] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${activeView === v ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
              {v === 'tree' ? 'هرمي' : 'مسطّح'}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingCat(null); setForm({ ...EMPTY_FORM }); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          قسم جديد
        </button>
        <button
          onClick={() => { setShowForm(true); setEditingCat(null); setForm({ ...EMPTY_FORM, parent_section_id: rootCats[0]?.id || '', category_type: 'sub' }); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          قسم فرعي
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-500" />
              {editingCat ? 'تعديل القسم' : 'إضافة قسم جديد'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الاسم (عربي) *</label>
                <input value={form.name_ar} onChange={e => setForm(p => ({ ...p, name_ar: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="مثال: الألعاب" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الاسم (إنجليزي)</label>
                <input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-left" dir="ltr" placeholder="Games" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Slug *</label>
                <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-left" dir="ltr" placeholder="games-pubg" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">القسم الأب (اتركه فارغاً للرئيسي)</label>
                <select value={form.parent_section_id} onChange={e => setForm(p => ({ ...p, parent_section_id: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">قسم رئيسي (بلا أب)</option>
                  {rootCats.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">نوع الشاشة</label>
                <select value={form.screen_type} onChange={e => setForm(p => ({ ...p, screen_type: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {SCREEN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">المجموعة</label>
                <select value={form.section_group} onChange={e => setForm(p => ({ ...p, section_group: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اللون</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border border-border" />
                  <span className="text-sm text-muted-foreground font-mono">{form.color}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">معرّف API Category</label>
                <input value={form.api_category_id} onChange={e => setForm(p => ({ ...p, api_category_id: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-left" dir="ltr" placeholder="pubg, freefire, itunes…" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">الوصف</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="وصف مختصر…" />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-4">
                {[
                  { key: 'show_in_home', label: 'يظهر في الرئيسية' },
                  { key: 'show_in_services', label: 'يظهر في الخدمات' },
                  { key: 'is_featured', label: 'مميز (نجمة)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(form as any)[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-purple-600" />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowForm(false); setEditingCat(null); }}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">إلغاء</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingCat ? 'حفظ التعديلات' : 'إضافة القسم'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : activeView === 'tree' ? (
        /* ── Tree View ── */
        <div className="space-y-3">
          {(search ? filteredFlat.filter(c => !c.parent_section_id) : tree).map(cat => (
            <motion.div key={cat.id} layout className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Root row */}
              <div className="flex items-center gap-3 p-3">
                <button onClick={() => setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  {expanded[cat.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: cat.color + '20' }}>
                  <CatIcon icon={cat.icon} color={cat.color} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{cat.name_ar}</p>
                    {cat.is_featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    {!cat.is_active && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded-full">معطّل</span>}
                    <span className="text-xs text-muted-foreground font-mono hidden md:block">{cat.slug}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{cat.screen_type}</span>
                    {cat.show_in_home && <span className="text-xs text-green-600">رئيسية</span>}
                    <span className="text-xs text-muted-foreground">{cat.children?.length || 0} أقسام فرعية</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleHome(cat)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="تبديل الرئيسية">
                    {cat.show_in_home ? <Eye className="w-3.5 h-3.5 text-green-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => toggle(cat)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    {cat.is_active ? <Check className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-red-500" />}
                  </button>
                  <button onClick={() => deleteCat(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-categories */}
              <AnimatePresence>
                {expanded[cat.id] && (cat.children || []).length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="border-t border-border overflow-hidden">
                    <div className="p-2 space-y-1">
                      {(cat.children || []).map(sub => (
                        <div key={sub.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: sub.color + '20' }}>
                            <CatIcon icon={sub.icon || 'layout-grid'} color={sub.color} size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{sub.name_ar}</p>
                            <span className="text-xs text-muted-foreground font-mono">{sub.slug}</span>
                          </div>
                          {sub.api_category_id && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-mono hidden md:block">
                              {sub.api_category_id}
                            </span>
                          )}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(sub)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button onClick={() => toggle(sub)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                              {sub.is_active ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />}
                            </button>
                            <button onClick={() => deleteCat(sub.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        /* ── Flat View ── */
        <div className="space-y-2">
          {(search ? filteredFlat : categories).map(cat => (
            <div key={cat.id} className={`flex items-center gap-3 p-3 bg-card border border-border rounded-xl ${cat.parent_section_id ? 'mr-8 border-l-4' : ''}`}
              style={cat.parent_section_id ? { borderLeftColor: cat.color } : {}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: cat.color + '20' }}>
                <CatIcon icon={cat.icon || 'layout-grid'} color={cat.color} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cat.name_ar}
                  {cat.name_en && <span className="text-xs text-muted-foreground ml-2">({cat.name_en})</span>}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-mono">{cat.slug}</span>
                  <span className="text-xs px-1 py-0.5 rounded bg-muted text-muted-foreground">{cat.screen_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(cat)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggle(cat)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                  {cat.is_active ? <Eye className="w-3.5 h-3.5 text-green-500" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                </button>
                <button onClick={() => deleteCat(cat.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
