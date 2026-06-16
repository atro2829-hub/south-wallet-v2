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
import { Textarea } from '@/components/ui/textarea';
import {
  Tag, Search, Loader2, Plus, Edit, Trash2,
  Percent, DollarSign, Calculator, TrendingUp,
  ArrowUpDown, Save, AlertCircle, CheckCircle,
  Settings, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PriceRule {
  id?: string;
  productId: string;
  productName: string;
  providerId: string;
  providerName: string;
  costPrice: number;
  sellingPrice: number;
  marginType: 'percentage' | 'fixed';
  marginValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface GlobalMarkup {
  id?: string;
  name: string;
  providerId: string;
  providerName: string;
  markupType: 'percentage' | 'fixed';
  markupValue: number;
  isActive: boolean;
  applyTo: 'all' | 'category' | 'product';
  category?: string;
}

export default function PriceCustomizationPanel() {
  const { showToast, adminUser } = useAdminStore();
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [globalMarkups, setGlobalMarkups] = useState<GlobalMarkup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('products');

  // Dialog state
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formProduct, setFormProduct] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formMarginType, setFormMarginType] = useState<'percentage' | 'fixed'>('percentage');
  const [formMarginValue, setFormMarginValue] = useState(0);
  const [formActive, setFormActive] = useState(true);

  // Global markup dialog
  const [markupDialog, setMarkupDialog] = useState(false);
  const [editingMarkup, setEditingMarkup] = useState<GlobalMarkup | null>(null);
  const [markupName, setMarkupName] = useState('');
  const [markupProvider, setMarkupProvider] = useState('');
  const [markupType, setMarkupType] = useState<'percentage' | 'fixed'>('percentage');
  const [markupValue, setMarkupValue] = useState(0);
  const [markupApplyTo, setMarkupApplyTo] = useState<'all' | 'category' | 'product'>('all');

  useEffect(() => {
    const rulesRef = ref(database, 'priceCustomization/rules');
    const unsub1 = onValue(rulesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: PriceRule[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        productId: val.productId || '',
        productName: val.productName || '',
        providerId: val.providerId || '',
        providerName: val.providerName || '',
        costPrice: val.costPrice || 0,
        sellingPrice: val.sellingPrice || 0,
        marginType: val.marginType || 'percentage',
        marginValue: val.marginValue || 0,
        isActive: val.isActive !== false,
        createdAt: val.createdAt || new Date().toISOString(),
        updatedAt: val.updatedAt || '',
      }));
      setRules(list);
    });

    const markupRef = ref(database, 'priceCustomization/globalMarkups');
    const unsub2 = onValue(markupRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: GlobalMarkup[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        name: val.name || '',
        providerId: val.providerId || '',
        providerName: val.providerName || '',
        markupType: val.markupType || 'percentage',
        markupValue: val.markupValue || 0,
        isActive: val.isActive !== false,
        applyTo: val.applyTo || 'all',
        category: val.category || '',
      }));
      setGlobalMarkups(list);
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const sellingPrice = useMemo(() => {
    if (formMarginType === 'percentage') {
      return formCostPrice + (formCostPrice * formMarginValue / 100);
    }
    return formCostPrice + formMarginValue;
  }, [formCostPrice, formMarginType, formMarginValue]);

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      const match = search === '' ||
        r.productName.toLowerCase().includes(search.toLowerCase()) ||
        r.providerName.toLowerCase().includes(search.toLowerCase());
      return match;
    });
  }, [rules, search]);

  const openRuleDialog = (rule?: PriceRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormProduct(rule.productName);
      setFormProvider(rule.providerName);
      setFormCostPrice(rule.costPrice);
      setFormMarginType(rule.marginType);
      setFormMarginValue(rule.marginValue);
      setFormActive(rule.isActive);
    } else {
      setEditingRule(null);
      setFormProduct('');
      setFormProvider('');
      setFormCostPrice(0);
      setFormMarginType('percentage');
      setFormMarginValue(0);
      setFormActive(true);
    }
    setRuleDialog(true);
  };

  const saveRule = async () => {
    if (!formProduct.trim()) { showToast('أدخل اسم المنتج', 'error'); return; }
    setSaving(true);
    try {
      const ruleData: Omit<PriceRule, 'id'> = {
        productId: editingRule?.productId || generateId(),
        productName: formProduct.trim(),
        providerId: editingRule?.providerId || generateId(),
        providerName: formProvider.trim(),
        costPrice: formCostPrice,
        sellingPrice,
        marginType: formMarginType,
        marginValue: formMarginValue,
        isActive: formActive,
        createdAt: editingRule?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingRule?.id) {
        await update(ref(database, `priceCustomization/rules/${editingRule.id}`), ruleData);
      } else {
        await push(ref(database, 'priceCustomization/rules'), ruleData);
      }
      showToast(editingRule ? 'تم تحديث القاعدة' : 'تم إضافة القاعدة', 'success');
      setRuleDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await remove(ref(database, `priceCustomization/rules/${id}`));
      showToast('تم حذف القاعدة', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const toggleRuleActive = async (rule: PriceRule) => {
    try {
      await update(ref(database, `priceCustomization/rules/${rule.id}`), { isActive: !rule.isActive });
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const saveMarkup = async () => {
    if (!markupName.trim()) { showToast('أدخل اسم القاعدة', 'error'); return; }
    setSaving(true);
    try {
      const data: Omit<GlobalMarkup, 'id'> = {
        name: markupName.trim(),
        providerId: editingMarkup?.providerId || generateId(),
        providerName: markupProvider.trim(),
        markupType,
        markupValue,
        isActive: true,
        applyTo: markupApplyTo,
      };
      if (editingMarkup?.id) {
        await update(ref(database, `priceCustomization/globalMarkups/${editingMarkup.id}`), data);
      } else {
        await push(ref(database, 'priceCustomization/globalMarkups'), data);
      }
      showToast('تم حفظ القاعدة العامة', 'success');
      setMarkupDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
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
            <Tag className="w-7 h-7 text-[#5C1A1B]" />
            تخصيص الأسعار
          </h1>
          <p className="text-muted-foreground text-sm mt-1">تحديد الهوامش والأسعار المخصصة للمنتجات</p>
        </div>
        <Button
          onClick={() => activeTab === 'products' ? openRuleDialog() : setMarkupDialog(true)}
          className="bg-[#5C1A1B] hover:bg-[#3D0F10]"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="products">أسعار المنتجات</TabsTrigger>
          <TabsTrigger value="global">الهوامش العامة</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالمنتج أو المزود..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredRules.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Tag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground">لا توجد قواعد تسعير</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                filteredRules.map((rule, i) => (
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
                              <Tag className="w-5 h-5 text-[#5C1A1B]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{rule.productName}</p>
                              <p className="text-xs text-muted-foreground">{rule.providerName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">التكلفة:</span>
                                <span className="font-bold">{formatNumber(rule.costPrice)}</span>
                                <ArrowUpDown className="w-3 h-3" />
                                <span className="text-muted-foreground">البيع:</span>
                                <span className="font-bold text-green-600">{formatNumber(rule.sellingPrice)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>الهامش: {rule.marginValue}{rule.marginType === 'percentage' ? '%' : ' ثابت'}</span>
                                <Badge variant="outline" className={cn('text-[10px]', rule.isActive ? 'text-green-500' : 'text-red-500')}>
                                  {rule.isActive ? 'مفعّل' : 'معطّل'}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleRuleActive(rule)}>
                                {rule.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openRuleDialog(rule)}>
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
        </TabsContent>

        <TabsContent value="global" className="mt-4 space-y-4">
          <div className="space-y-3">
            <AnimatePresence>
              {globalMarkups.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-12 text-center">
                      <Settings className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground">لا توجد هوامش عامة</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                globalMarkups.map((markup, i) => (
                  <motion.div
                    key={markup.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                              <Percent className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{markup.name}</p>
                              <p className="text-xs text-muted-foreground">{markup.providerName} • {markup.applyTo === 'all' ? 'الكل' : markup.applyTo === 'category' ? 'فئة' : 'منتج'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-sm">
                              {markup.markupValue}{markup.markupType === 'percentage' ? '%' : ' ثابت'}
                            </Badge>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                              setEditingMarkup(markup);
                              setMarkupName(markup.name);
                              setMarkupProvider(markup.providerName);
                              setMarkupType(markup.markupType);
                              setMarkupValue(markup.markupValue);
                              setMarkupApplyTo(markup.applyTo);
                              setMarkupDialog(true);
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => markup.id && remove(ref(database, `priceCustomization/globalMarkups/${markup.id}`))}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'تعديل قاعدة التسعير' : 'إضافة قاعدة تسعير'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المنتج</Label>
              <Input value={formProduct} onChange={(e) => setFormProduct(e.target.value)} placeholder="اسم المنتج..." />
            </div>
            <div>
              <Label>اسم المزود</Label>
              <Input value={formProvider} onChange={(e) => setFormProvider(e.target.value)} placeholder="اسم المزود..." />
            </div>
            <div>
              <Label>سعر التكلفة</Label>
              <Input type="number" value={formCostPrice} onChange={(e) => setFormCostPrice(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع الهامش</Label>
                <Select value={formMarginType} onValueChange={(v: any) => setFormMarginType(v)}>
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
                <Label>قيمة الهامش</Label>
                <Input type="number" value={formMarginValue} onChange={(e) => setFormMarginValue(Number(e.target.value))} />
              </div>
            </div>
            {/* Preview */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">سعر التكلفة:</span>
                <span className="font-bold">{formatNumber(formCostPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الهامش ({formMarginType === 'percentage' ? '%' : 'ثابت'}):</span>
                <span className="font-bold text-[#5C1A1B]">
                  +{formMarginType === 'percentage' ? formatNumber(formCostPrice * formMarginValue / 100) : formatNumber(formMarginValue)}
                </span>
              </div>
              <div className="border-t border-border mt-2 pt-2 flex items-center justify-between text-sm">
                <span className="font-semibold">سعر البيع:</span>
                <span className="font-bold text-green-600">{formatNumber(sellingPrice)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>مفعّل</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(false)}>إلغاء</Button>
            <Button onClick={saveRule} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Global Markup Dialog */}
      <Dialog open={markupDialog} onOpenChange={setMarkupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMarkup ? 'تعديل الهامش العام' : 'إضافة هامش عام'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم القاعدة</Label>
              <Input value={markupName} onChange={(e) => setMarkupName(e.target.value)} placeholder="مثال: هامش الجملة" />
            </div>
            <div>
              <Label>المزود</Label>
              <Input value={markupProvider} onChange={(e) => setMarkupProvider(e.target.value)} placeholder="اسم المزود..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع الهامش</Label>
                <Select value={markupType} onValueChange={(v: any) => setMarkupType(v)}>
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
                <Label>قيمة الهامش</Label>
                <Input type="number" value={markupValue} onChange={(e) => setMarkupValue(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>التطبيق على</Label>
              <Select value={markupApplyTo} onValueChange={(v: any) => setMarkupApplyTo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المنتجات</SelectItem>
                  <SelectItem value="category">فئة محددة</SelectItem>
                  <SelectItem value="product">منتج محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkupDialog(false)}>إلغاء</Button>
            <Button onClick={saveMarkup} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
