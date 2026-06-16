'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, push, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, cn, generateId } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Percent, Search, Loader2, Plus, Edit, Trash2,
  DollarSign, Calculator, Save, Globe, Package,
  Settings, TrendingUp, Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommissionRule {
  id?: string;
  name: string;
  providerId: string;
  providerName: string;
  productId?: string;
  productName?: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  commissionCurrency: string;
  minCommission: number;
  maxCommission: number;
  isActive: boolean;
  scope: 'global' | 'provider' | 'product';
  createdAt: string;
  updatedAt?: string;
}

export default function CommissionConfigPanel() {
  const { showToast, adminUser } = useAdminStore();
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<CommissionRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewAmount, setPreviewAmount] = useState(100);

  // Form
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formProduct, setFormProduct] = useState('');
  const [formType, setFormType] = useState<'percentage' | 'fixed'>('percentage');
  const [formValue, setFormValue] = useState(0);
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formMin, setFormMin] = useState(0);
  const [formMax, setFormMax] = useState(0);
  const [formScope, setFormScope] = useState<'global' | 'provider' | 'product'>('global');
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    const ref_ = ref(database, 'commissionConfig/rules');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      const list: CommissionRule[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        name: val.name || '',
        providerId: val.providerId || '',
        providerName: val.providerName || '',
        productId: val.productId || '',
        productName: val.productName || '',
        commissionType: val.commissionType || 'percentage',
        commissionValue: val.commissionValue || 0,
        commissionCurrency: val.commissionCurrency || 'USD',
        minCommission: val.minCommission || 0,
        maxCommission: val.maxCommission || 0,
        isActive: val.isActive !== false,
        scope: val.scope || 'global',
        createdAt: val.createdAt || new Date().toISOString(),
        updatedAt: val.updatedAt || '',
      }));
      setRules(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return rules.filter(r => {
      const matchSearch = search === '' ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.providerName.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === 'all' || r.scope === activeTab;
      return matchSearch && matchTab;
    });
  }, [rules, search, activeTab]);

  const previewCommission = useMemo(() => {
    if (formType === 'percentage') {
      const raw = previewAmount * formValue / 100;
      return Math.min(Math.max(raw, formMin), formMax || Infinity);
    }
    return Math.min(Math.max(formValue, formMin), formMax || Infinity);
  }, [previewAmount, formType, formValue, formMin, formMax]);

  const openDialog = (rule?: CommissionRule) => {
    if (rule) {
      setEditing(rule);
      setFormName(rule.name);
      setFormProvider(rule.providerName);
      setFormProduct(rule.productName || '');
      setFormType(rule.commissionType);
      setFormValue(rule.commissionValue);
      setFormCurrency(rule.commissionCurrency);
      setFormMin(rule.minCommission);
      setFormMax(rule.maxCommission);
      setFormScope(rule.scope);
      setFormActive(rule.isActive);
    } else {
      setEditing(null);
      setFormName('');
      setFormProvider('');
      setFormProduct('');
      setFormType('percentage');
      setFormValue(0);
      setFormCurrency('USD');
      setFormMin(0);
      setFormMax(0);
      setFormScope('global');
      setFormActive(true);
    }
    setDialog(true);
  };

  const save = async () => {
    if (!formName.trim()) { showToast('أدخل اسم القاعدة', 'error'); return; }
    setSaving(true);
    try {
      const data: Omit<CommissionRule, 'id'> = {
        name: formName.trim(),
        providerId: editing?.providerId || generateId(),
        providerName: formProvider.trim(),
        productId: formScope === 'product' ? (editing?.productId || generateId()) : '',
        productName: formScope === 'product' ? formProduct.trim() : '',
        commissionType: formType,
        commissionValue: formValue,
        commissionCurrency: formCurrency,
        minCommission: formMin,
        maxCommission: formMax,
        isActive: formActive,
        scope: formScope,
        createdAt: editing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editing?.id) {
        await update(ref(database, `commissionConfig/rules/${editing.id}`), data);
      } else {
        await push(ref(database, 'commissionConfig/rules'), data);
      }
      showToast(editing ? 'تم تحديث القاعدة' : 'تم إضافة القاعدة', 'success');
      setDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule: CommissionRule) => {
    try {
      await update(ref(database, `commissionConfig/rules/${rule.id}`), { isActive: !rule.isActive });
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await remove(ref(database, `commissionConfig/rules/${id}`));
      showToast('تم حذف القاعدة', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const scopeLabel: Record<string, string> = { global: 'عام', provider: 'المزود', product: 'المنتج' };
  const scopeColor: Record<string, string> = { global: 'bg-blue-500/10 text-blue-600', provider: 'bg-purple-500/10 text-purple-600', product: 'bg-orange-500/10 text-orange-600' };

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
            <Percent className="w-7 h-7 text-[#5C1A1B]" />
            تخصيص العمولة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إعداد نسب العمولة حسب المزود والمنتج</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
          <Plus className="w-4 h-4 ml-2" />
          إضافة قاعدة
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي القواعد', value: rules.length, icon: Settings },
          { label: 'عامة', value: rules.filter(r => r.scope === 'global').length, icon: Globe },
          { label: 'للمزود', value: rules.filter(r => r.scope === 'provider').length, icon: TrendingUp },
          { label: 'للمنتج', value: rules.filter(r => r.scope === 'product').length, icon: Package },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#5C1A1B]/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-[#5C1A1B]" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="global">عام</TabsTrigger>
            <TabsTrigger value="provider">المزود</TabsTrigger>
            <TabsTrigger value="product">المنتج</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Percent className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">لا توجد قواعد عمولة</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow', !rule.isActive && 'opacity-50')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#5C1A1B]/10 flex items-center justify-center shrink-0">
                          <Percent className="w-5 h-5 text-[#5C1A1B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{rule.name}</p>
                            <Badge variant="outline" className={cn('text-[10px]', scopeColor[rule.scope])}>
                              {scopeLabel[rule.scope]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rule.providerName}{rule.productName ? ` • ${rule.productName}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-sm font-bold text-[#5C1A1B]">
                            {rule.commissionValue}{rule.commissionType === 'percentage' ? '%' : ` ${rule.commissionCurrency}`}
                          </p>
                          {(rule.minCommission > 0 || rule.maxCommission > 0) && (
                            <p className="text-[10px] text-muted-foreground">
                              {rule.minCommission > 0 ? `Min: ${rule.minCommission}` : ''} {rule.maxCommission > 0 ? `Max: ${rule.maxCommission}` : ''}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={cn('text-[10px]', rule.isActive ? 'text-green-500' : 'text-red-500')}>
                          {rule.isActive ? 'مفعّل' : 'معطّل'}
                        </Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleActive(rule)}>
                            {rule.isActive ? <Eye className="w-4 h-4 text-green-500" /> : <Eye className="w-4 h-4 text-red-500" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDialog(rule)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => rule.id && deleteRule(rule.id)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل قاعدة العمولة' : 'إضافة قاعدة عمولة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم القاعدة</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثال: عمولة التحويل" />
            </div>
            <div>
              <Label>النطاق</Label>
              <Select value={formScope} onValueChange={(v: any) => setFormScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">عام (جميع العمليات)</SelectItem>
                  <SelectItem value="provider">مزود محدد</SelectItem>
                  <SelectItem value="product">منتج محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formScope === 'provider' || formScope === 'product') && (
              <div>
                <Label>اسم المزود</Label>
                <Input value={formProvider} onChange={(e) => setFormProvider(e.target.value)} placeholder="اسم المزود..." />
              </div>
            )}
            {formScope === 'product' && (
              <div>
                <Label>اسم المنتج</Label>
                <Input value={formProduct} onChange={(e) => setFormProduct(e.target.value)} placeholder="اسم المنتج..." />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع العمولة</Label>
                <Select value={formType} onValueChange={(v: any) => setFormType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>قيمة العمولة</Label>
                <Input type="number" value={formValue} onChange={(e) => setFormValue(Number(e.target.value))} />
              </div>
            </div>
            {formType === 'fixed' && (
              <div>
                <Label>عملة العمولة</Label>
                <Select value={formCurrency} onValueChange={setFormCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="YER">YER</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>حد أدنى للعمولة</Label>
                <Input type="number" value={formMin} onChange={(e) => setFormMin(Number(e.target.value))} />
              </div>
              <div>
                <Label>حد أقصى للعمولة</Label>
                <Input type="number" value={formMax} onChange={(e) => setFormMax(Number(e.target.value))} />
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-[#5C1A1B]" />
                <span className="text-sm font-semibold">معاينة العمولة</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-xs">مبلغ المعاملة:</Label>
                <Input
                  type="number"
                  value={previewAmount}
                  onChange={(e) => setPreviewAmount(Number(e.target.value))}
                  className="h-8 w-32 text-sm"
                />
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
                <span>العمولة المتوقعة:</span>
                <span className="font-bold text-[#5C1A1B]">
                  {formatNumber(previewCommission)} {formType === 'fixed' ? formCurrency : '%'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>مفعّل</Label>
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
