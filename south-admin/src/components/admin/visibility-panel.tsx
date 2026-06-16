'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Eye, EyeOff, Save, Loader2, Layers, Globe, CreditCard, Wallet, Shield, Gift, ArrowLeftRight, Check, X, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

interface VisibilityItem {
  id: string;
  name: string;
  type: 'section' | 'provider' | 'feature';
  isVisible: boolean;
  parentName?: string;
}

export default function VisibilityPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [items, setItems] = useState<VisibilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [bulkAction, setBulkAction] = useState<'show' | 'hide'>('show');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load sections
    const sectionsRef = ref(database, 'sections');
    const unsub1 = onValue(sectionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const sectionItems: VisibilityItem[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: `section_${key}`, name: val.name || key, type: 'section' as const,
        isVisible: val.isActive !== false,
      }));

      // Load providers
      const providersRef = ref(database, 'providers');
      const unsub2 = onValue(providersRef, (snapshot2) => {
        const provData = snapshot2.val() || {};
        const providerItems: VisibilityItem[] = Object.entries(provData).map(([key, val]: [string, any]) => ({
          id: `provider_${key}`, name: val.name || key, type: 'provider' as const,
          isVisible: val.isActive !== false,
        }));

        // Load feature flags
        const featRef = ref(database, 'adminSettings/featureFlags');
        const unsub3 = onValue(featRef, (snapshot3) => {
          const featData = snapshot3.val() || {};
          const featureItems: VisibilityItem[] = Object.entries(featData).map(([key, val]: [string, any]) => ({
            id: `feature_${key}`, name: key, type: 'feature' as const,
            isVisible: val !== false,
          }));

          setItems([...sectionItems, ...providerItems, ...featureItems]);
          setLoading(false);
        });
        return () => unsub3();
      });
      return () => unsub2();
    });
    return () => unsub1();
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
      const [type, key] = item.id.split('_');
      const path = type === 'section' ? `sections/${key}/isActive` :
        type === 'provider' ? `providers/${key}/isActive` :
        `adminSettings/featureFlags/${key}`;
      await update(ref(database), { [path]: !item.isVisible });
      showToast(`تم ${!item.isVisible ? 'إظهار' : 'إخفاء'} ${item.name}`, 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) { showToast('اختر عناصر أولاً', 'error'); return; }
    setSaving(true);
    try {
      const updates: Record<string, boolean> = {};
      selectedIds.forEach(id => {
        const item = items.find(i => i.id === id);
        if (item) {
          const [type, key] = id.split('_');
          const path = type === 'section' ? `sections/${key}/isActive` :
            type === 'provider' ? `providers/${key}/isActive` :
            `adminSettings/featureFlags/${key}`;
          updates[path] = bulkAction === 'show';
        }
      });
      await update(ref(database), updates);
      setSelectedIds(new Set());
      showToast(`تم ${bulkAction === 'show' ? 'إظهار' : 'إخفاء'} ${selectedIds.size} عنصر`, 'success');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
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

      {/* Stats */}
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

      {/* Bulk Actions */}
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

      {/* Items List */}
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
