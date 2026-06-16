'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, update, remove, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Package, Search, Upload, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';

interface PackageItem {
  id?: string;
  providerId: string;
  providerName: string;
  name: string;
  price: number;
  currency: string;
  executionType: 'manual' | 'auto';
  isActive: boolean;
  available?: number;
  sold?: number;
  autoDisableAtZero?: boolean;
}

export default function PackagesPanel() {
  const { showToast } = useAdminStore();
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<PackageItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form
  const [formProviderId, setFormProviderId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState('YER');
  const [formExecution, setFormExecution] = useState<'manual' | 'auto'>('manual');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAvailable, setFormAvailable] = useState('');
  const [formAutoDisable, setFormAutoDisable] = useState(true);

  useEffect(() => {
    const pkgRef = ref(database, 'packages');
    const unsub1 = onValue(pkgRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: PackageItem[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setPackages(list);
    });

    const provRef = ref(database, 'providers');
    const unsub2 = onValue(provRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setProviders(list);
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const resetForm = () => {
    setFormProviderId(''); setFormName(''); setFormPrice('');
    setFormCurrency('YER'); setFormExecution('manual'); setFormIsActive(true);
    setFormAvailable(''); setFormAutoDisable(true); setEditing(null);
  };

  const handleSave = async () => {
    if (!formName || !formPrice || !formProviderId) {
      showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    try {
      const provider = providers.find(p => p.id === formProviderId);
      const data = {
        providerId: formProviderId,
        providerName: provider?.name || '',
        name: formName,
        price: parseFloat(formPrice) || 0,
        currency: formCurrency,
        executionType: formExecution,
        isActive: formIsActive,
        available: formAvailable ? parseInt(formAvailable) : -1,
        sold: editing?.sold || 0,
        autoDisableAtZero: formAutoDisable,
      };
      if (editing?.id) {
        await update(ref(database, `packages/${editing.id}`), data);
        showToast('تم تحديث الباقة', 'success');
      } else {
        await push(ref(database, 'packages'), { ...data, id: generateId() });
        showToast('تم إضافة الباقة', 'success');
      }
      setDialog(false);
      resetForm();
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(database, `packages/${id}`));
      showToast('تم حذف الباقة', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let added = 0;
        for (const row of rows) {
          if (!row.providerId || !row.name || !row.price) continue;
          const provider = providers.find(p => p.id === row.providerId || p.name === row.providerId);
          try {
            await push(ref(database, 'packages'), {
              providerId: row.providerId,
              providerName: provider?.name || row.providerId,
              name: row.name,
              price: parseFloat(row.price) || 0,
              currency: row.currency || 'YER',
              executionType: row.executionType || 'manual',
              isActive: row.isActive === 'true' || row.isActive === '1' || true,
              available: -1,
              sold: 0,
              autoDisableAtZero: false,
              id: generateId(),
            });
            added++;
          } catch (e) { /* skip */ }
        }
        showToast(`تم استيراد ${added} باقة`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: () => {
        showToast('خطأ في قراءة ملف CSV', 'error');
      },
    });
  };

  const filteredPackages = packages.filter(p => {
    const matchesSearch = !search || p.name?.includes(search) || p.providerName?.includes(search);
    const matchesProvider = filterProvider === 'all' || p.providerId === filterProvider;
    return matchesSearch && matchesProvider;
  });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الباقات</h1>
          <p className="text-muted-foreground text-sm mt-1">{formatNumber(packages.length)} باقة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <label>
              <FileSpreadsheet className="w-4 h-4 ml-1" /> استيراد CSV
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
            </label>
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setDialog(true); }}>
            <Plus className="w-4 h-4 ml-1" /> باقة جديدة
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="w-40"><SelectValue placeholder="المزود" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المزودين</SelectItem>
            {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* CSV Template Info */}
      <Card className="admin-card border-0 shadow-none">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            صيغة CSV: providerId, name, price, currency, executionType, isActive
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin">
        {filteredPackages.map((pkg, i) => (
          <motion.div key={pkg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">{pkg.providerName}</p>
                      <p className="text-sm font-bold">{formatNumber(pkg.price)} {currencySymbols[pkg.currency || 'YER']}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-left text-xs">
                      <p className={pkg.available === -1 ? 'text-green-600' : (pkg.available || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                        {pkg.available === -1 ? 'غير محدود' : `متوفر: ${pkg.available}`}
                      </p>
                      {pkg.sold !== undefined && <p className="text-muted-foreground">مباع: {pkg.sold}</p>}
                    </div>
                    <Badge className={pkg.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>
                      {pkg.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(pkg);
                      setFormProviderId(pkg.providerId); setFormName(pkg.name);
                      setFormPrice(String(pkg.price)); setFormCurrency(pkg.currency);
                      setFormExecution(pkg.executionType || 'manual'); setFormIsActive(pkg.isActive);
                      setFormAvailable(pkg.available === -1 ? '' : String(pkg.available || ''));
                      setFormAutoDisable(pkg.autoDisableAtZero !== false);
                      setDialog(true);
                    }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => pkg.id && handleDelete(pkg.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filteredPackages.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد باقات</p>}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'تعديل باقة' : 'إضافة باقة'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>المزود</Label>
              <Select value={formProviderId} onValueChange={setFormProviderId}>
                <SelectTrigger><SelectValue placeholder="اختر مزود" /></SelectTrigger>
                <SelectContent>
                  {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>اسم الباقة</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            <div><Label>السعر</Label><Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} dir="ltr" /></div>
            <div><Label>العملة</Label>
              <Select value={formCurrency} onValueChange={setFormCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YER">ريال يمني</SelectItem>
                  <SelectItem value="SAR">ريال سعودي</SelectItem>
                  <SelectItem value="USD">دولار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>نوع التنفيذ</Label>
              <Select value={formExecution} onValueChange={(v: any) => setFormExecution(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">يدوي</SelectItem>
                  <SelectItem value="auto">تلقائي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>الكمية المتوفرة (اتركه فارغا لغير محدود)</Label>
              <Input type="number" value={formAvailable} onChange={(e) => setFormAvailable(e.target.value)} dir="ltr" placeholder="غير محدود" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formAutoDisable} onCheckedChange={setFormAutoDisable} />
              <Label>تعطيل تلقائي عند نفاد الكمية</Label>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formIsActive} onCheckedChange={setFormIsActive} /><Label>نشط</Label></div>
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
