'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Search, Eye, EyeOff, Save, Loader2, Layers, Globe, Shield, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface VisibilityItem {
  id: string;
  name: string;
  type: 'section' | 'provider' | 'feature';
  isVisible: boolean;
  dbId?: string;
}

export default function VisibilityPanel() {
  const { showToast } = useAdminStore();
  const [items, setItems] = useState<VisibilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [bulkAction, setBulkAction] = useState<'show' | 'hide'>('show');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const { data: sectionsData } = await supabaseAdmin
          .from('sections').select('id,name,is_visible').order('sort_order');
        const sectionItems: VisibilityItem[] = (sectionsData || []).map((s: any) => ({
          id: `section_${s.id}`,
          dbId: s.id,
          name: s.name || s.id,
          type: 'section' as const,
          isVisible: s.is_visible !== false,
        }));

        const { data: providersData } = await supabaseAdmin
          .from('service_providers').select('id,name,is_visible').order('sort_order').limit(500);
        const providerItems: VisibilityItem[] = (providersData || []).map((p: any) => ({
          id: `provider_${p.id}`,
          dbId: p.id,
          name: p.name || p.id,
          type: 'provider' as const,
          isVisible: p.is_visible !== false,
        }));

        const { data: featRow } = await supabaseAdmin
          .from('app_config').select('value').eq('key', 'featureFlags').maybeSingle();
        const featData: Record<string, boolean> = (featRow?.value as any) || {};
        const featureItems: VisibilityItem[] = Object.entries(featData).map(([key, val]) => ({
          id: `feature_${key}`,
          dbId: key,
          name: key,
          type: 'feature' as const,
          isVisible: val !== false,
        }));

        if (!cancelled) setItems([...sectionItems, ...providerItems, ...featureItems]);
      } catch (e) {
        console.error('[visibility-panel] load error:', e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const secChannel = supabaseAdmin.channel(`visibility-sec-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => load())
      .subscribe();
    const provChannel = supabaseAdmin.channel(`visibility-prov-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_providers' }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      try { supabaseAdmin.removeChannel(secChannel); } catch {}
      try { supabaseAdmin.removeChannel(provChannel); } catch {}
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const ms = !search || item.name.toLowerCase().includes(search.toLowerCase());
      const mt = typeFilter === 'all' || item.type === typeFilter;
      return ms && mt;
    });
  }, [items, search, typeFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    visible: items.filter(i => i.isVisible).length,
    hidden: items.filter(i => !i.isVisible).length,
    sections: items.filter(i => i.type === 'section').length,
    providers: items.filter(i => i.type === 'provider').length,
    features: items.filter(i => i.type === 'feature').length,
  }), [items]);

  const toggleItem = async (item: VisibilityItem) => {
    try {
      const newVisible = !item.isVisible;
      if (item.type === 'section') {
        const { error } = await supabaseAdmin.from('sections')
          .update({ is_visible: newVisible, updated_at: new Date().toISOString() })
          .eq('id', item.dbId);
        if (error) throw error;
      } else if (item.type === 'provider') {
        const { error } = await supabaseAdmin.from('service_providers')
          .update({ is_visible: newVisible, updated_at: new Date().toISOString() })
          .eq('id', item.dbId);
        if (error) throw error;
      } else {
        const { data: row } = await supabaseAdmin.from('app_config')
          .select('value').eq('key', 'featureFlags').maybeSingle();
        const cur: Record<string, boolean> = (row?.value as any) || {};
        cur[item.dbId!] = newVisible;
        const { error } = await supabaseAdmin.from('app_config')
          .upsert({ key: 'featureFlags', value: cur, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        if (error) throw error;
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isVisible: newVisible } : i));
      showToast(`تم ${newVisible ? 'إظهار' : 'إخفاء'} ${item.name}`, 'success');
    } catch (e: any) {
      console.error('[toggleItem] error:', e);
      showToast('حدث خطأ: ' + (e.message || ''), 'error');
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) { showToast('اختر عناصر أولاً', 'error'); return; }
    setSaving(true);
    try {
      const target = bulkAction === 'show';
      const sectionIds: string[] = [];
      const providerIds: string[] = [];
      const featureIds: string[] = [];
      selectedIds.forEach(id => {
        const item = items.find(i => i.id === id);
        if (!item || !item.dbId) return;
        if (item.type === 'section') sectionIds.push(item.dbId);
        else if (item.type === 'provider') providerIds.push(item.dbId);
        else featureIds.push(item.dbId);
      });
      const count = selectedIds.size;
      if (sectionIds.length > 0) {
        await supabaseAdmin.from('sections').update({ is_visible: target, updated_at: new Date().toISOString() }).in('id', sectionIds);
      }
      if (providerIds.length > 0) {
        await supabaseAdmin.from('service_providers').update({ is_visible: target, updated_at: new Date().toISOString() }).in('id', providerIds);
      }
      if (featureIds.length > 0) {
        const { data: row } = await supabaseAdmin.from('app_config').select('value').eq('key', 'featureFlags').maybeSingle();
        const cur: Record<string, boolean> = (row?.value as any) || {};
        featureIds.forEach(id => { cur[id] = target; });
        await supabaseAdmin.from('app_config').upsert({ key: 'featureFlags', value: cur, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      }
      setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, isVisible: target } : i));
      setSelectedIds(new Set());
      showToast(`تم ${target ? 'إظهار' : 'إخفاء'} ${count} عنصر`, 'success');
    } catch (e: any) {
      showToast('حدث خطأ: ' + (e.message || ''), 'error');
    } finally { setSaving(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  };

  const typeIcon: Record<string, React.ElementType> = { section: Layers, provider: Globe, feature: Shield };
  const typeLabel: Record<string, string> = { section: 'قسم', provider: 'مزود', feature: 'ميزة' };
  const typeColor: Record<string, string> = { section: 'bg-[#5C1A1B]/10 text-[#5C1A1B]', provider: 'bg-blue-500/10 text-blue-500', feature: 'bg-green-500/10 text-green-500' };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Eye className="w-7 h-7 text-[#5C1A1B]" />الرؤية والإخفاء</h1>
        <p className="text-muted-foreground text-sm mt-1">التحكم في ظهور الأقسام والمزودين والميزات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total },
          { label: 'مرئي', value: stats.visible },
          { label: 'مخفي', value: stats.hidden },
          { label: 'أقسام', value: stats.sections },
          { label: 'مزودين', value: stats.providers },
          { label: 'ميزات', value: stats.features },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="border-0 shadow-sm"><CardContent className="p-3 text-center"><p className="text-lg font-bold">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]"><div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" /></div></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">الكل</SelectItem><SelectItem value="section">أقسام</SelectItem><SelectItem value="provider">مزودين</SelectItem><SelectItem value="feature">ميزات</SelectItem></SelectContent>
            </Select>
            <Separator className="h-8 w-px bg-border" />
            <Label className="text-xs text-muted-foreground">محدد: {selectedIds.size}</Label>
            <Select value={bulkAction} onValueChange={(v: any) => setBulkAction(v)}>
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="show">إظهار</SelectItem><SelectItem value="hide">إخفاء</SelectItem></SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkUpdate} disabled={saving || selectedIds.size === 0} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 ml-1" />}
              تطبيق
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Eye className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">لا توجد عناصر</p></CardContent></Card>
        ) : (
          filtered.map((item, i) => {
            const Icon = typeIcon[item.type] || Shield;
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.01 }}>
                <Card className={cn('border-0 shadow-sm transition-shadow hover:shadow-md', !item.isVisible && 'opacity-50')}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button onClick={() => toggleSelect(item.id)} className={cn('w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors', selectedIds.has(item.id) ? 'bg-[#5C1A1B] border-[#5C1A1B]' : 'border-border')}>
                          {selectedIds.has(item.id) && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', typeColor[item.type])}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <Badge className={cn('text-[9px]', typeColor[item.type])}>{typeLabel[item.type]}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={cn('text-[9px]', item.isVisible ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600')}>
                          {item.isVisible ? 'مرئي' : 'مخفي'}
                        </Badge>
                        <Switch checked={item.isVisible} onCheckedChange={() => toggleItem(item)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
