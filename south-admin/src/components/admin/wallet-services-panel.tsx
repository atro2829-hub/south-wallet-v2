'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, compressBase64Image } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Edit, Trash2, Wallet, Upload, Package, ChevronDown, ChevronUp, PackagePlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WalletServicesPanel() {
  const { showToast } = useAdminStore();
  const [services, setServices] = useState<Record<string, any>>({});
  const [sections, setSections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [packageDialog, setPackageDialog] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingPkg, setEditingPkg] = useState<string | null>(null);
  const [parentService, setParentService] = useState<string | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#5C1A1B');
  const [categoryId, setCategoryId] = useState('wallet-services');
  const [sectionId, setSectionId] = useState('wallet-services');
  const [inputLabel, setInputLabel] = useState('معرف العميل');
  const [inputType, setInputType] = useState('text');
  const [inputPrefix, setInputPrefix] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  // Package form state
  const [pkgName, setPkgName] = useState('');
  const [pkgPrice, setPkgPrice] = useState(0);
  const [pkgCurrency, setPkgCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [pkgCostPrice, setPkgCostPrice] = useState(0);
  const [pkgCommission, setPkgCommission] = useState(0);
  const [pkgCommissionType, setPkgCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [pkgExecutionType, setPkgExecutionType] = useState<'manual' | 'auto'>('manual');
  const [pkgApiProviderId, setPkgApiProviderId] = useState('');
  const [pkgApiProductId, setPkgApiProductId] = useState('');
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [pkgSortOrder, setPkgSortOrder] = useState(0);
  const [pkgDescription, setPkgDescription] = useState('');

  // Listen to wallet services
  useEffect(() => {
    const servicesRef = ref(database, 'walletServices');
    const unsub = onValue(servicesRef, (snapshot) => {
      setServices(snapshot.val() || {});
      setLoading(false);
    }, (error) => {
      console.error('[WalletServicesPanel] Firebase listen error:', error);
      showToast('خطأ في تحميل الخدمات من Firebase', 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [showToast]);

  // Listen to sections
  useEffect(() => {
    const sectionsRef = ref(database, 'sections');
    const unsub = onValue(sectionsRef, (snapshot) => {
      setSections(snapshot.val() || {});
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setName(''); setDescription(''); setIcon(''); setColor('#5C1A1B'); setCategoryId('wallet-services');
    setSectionId('wallet-services'); setInputLabel('معرف العميل'); setInputType('text'); setInputPrefix('');
    setIsActive(true); setSortOrder(0); setEditing(null);
  };

  const resetPkgForm = () => {
    setPkgName(''); setPkgPrice(0); setPkgCurrency('YER'); setPkgCostPrice(0); setPkgCommission(0);
    setPkgCommissionType('percentage'); setPkgExecutionType('manual'); setPkgApiProviderId('');
    setPkgApiProductId(''); setPkgIsActive(true); setPkgSortOrder(0); setPkgDescription('');
    setEditingPkg(null); setParentService(null);
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2000000) {
      showToast('حجم الصورة يجب أن يكون أقل من 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target?.result as string;
        // Compress to max 128x128 for Firebase RTDB size limits and user app performance
        const compressed = await compressBase64Image(base64, 128, 0.7);
        setIcon(compressed);
        showToast('تم رفع الأيقونة بنجاح', 'success');
      } catch (err) {
        console.error('[WalletServicesPanel] Icon compression failed:', err);
        // Fallback to original if compression fails
        setIcon(ev.target?.result as string);
        showToast('تم رفع الأيقونة (بدون ضغط)', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('يرجى إدخال الاسم', 'error'); return; }
    setSaving(true);
    try {
      const serviceId = editing || name.trim().replace(/[\s]+/g, '-').replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, '').toLowerCase() || `service-${Date.now()}`;

      const data = {
        id: serviceId, name: name.trim(), description: description.trim(), icon, color, categoryId,
        sectionId, inputLabel: inputLabel.trim(), inputType, inputPrefix: inputPrefix.trim(),
        isActive, sortOrder, updatedAt: new Date().toISOString(),
        createdAt: editing && services[editing]?.createdAt ? services[editing].createdAt : new Date().toISOString(),
      };

      // Use update() instead of set() to avoid overwriting nested data like packages
      await update(ref(database, `walletServices/${serviceId}`), data);

      // Also sync to providers path for compatibility with user app
      // Use update() to avoid overwriting existing provider fields that may have been set elsewhere
      await update(ref(database, `providers/${serviceId}`), {
        id: serviceId, name: name.trim(), color, icon, categoryId, sectionId,
        inputLabel: inputLabel.trim(), inputType, inputPrefix: inputPrefix.trim(), isActive,
        updatedAt: new Date().toISOString(),
      });

      // Update visibility
      await update(ref(database, `adminSettings/visibility/providers/${serviceId}`), {});

      showToast(editing ? 'تم تحديث الخدمة بنجاح' : 'تم إضافة الخدمة بنجاح', 'success');
      setDialog(false);
      resetForm();
    } catch (e) {
      console.error('[WalletServicesPanel] handleSave error:', e);
      showToast(`حدث خطأ أثناء الحفظ: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePkg = async () => {
    if (!pkgName.trim() || !parentService) { showToast('يرجى إدخال البيانات', 'error'); return; }
    setSaving(true);
    try {
      const pkgId = editingPkg || `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const data = {
        id: pkgId, name: pkgName.trim(), price: pkgPrice, currency: pkgCurrency,
        costPrice: pkgCostPrice, commission: pkgCommission, commissionType: pkgCommissionType,
        executionType: pkgExecutionType, apiProviderId: pkgApiProviderId.trim(),
        apiProductId: pkgApiProductId.trim(), isActive: pkgIsActive, sortOrder: pkgSortOrder,
        description: pkgDescription.trim(),
      };

      await set(ref(database, `walletServices/${parentService}/packages/${pkgId}`), data);
      showToast(editingPkg ? 'تم تحديث الباقة' : 'تم إضافة الباقة', 'success');
      setPackageDialog(false);
      resetPkgForm();
    } catch (e) {
      console.error('[WalletServicesPanel] handleSavePkg error:', e);
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
    try {
      await remove(ref(database, `walletServices/${id}`));
      await remove(ref(database, `providers/${id}`));
      await remove(ref(database, `adminSettings/visibility/providers/${id}`));
      showToast('تم حذف الخدمة بنجاح', 'success');
    } catch (e) {
      console.error('[WalletServicesPanel] handleDelete error:', e);
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleDeletePkg = async (serviceId: string, pkgId: string) => {
    try {
      await remove(ref(database, `walletServices/${serviceId}/packages/${pkgId}`));
      showToast('تم حذف الباقة', 'success');
    } catch (e) {
      console.error('[WalletServicesPanel] handleDeletePkg error:', e);
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleToggleActive = async (serviceId: string, active: boolean) => {
    try {
      const now = new Date().toISOString();
      // Update walletServices path
      await update(ref(database, `walletServices/${serviceId}`), { isActive: active, updatedAt: now });
      // Also sync isActive to providers path so user app sees the change
      await update(ref(database, `providers/${serviceId}`), { isActive: active, updatedAt: now });
      showToast(active ? 'تم تفعيل الخدمة' : 'تم تعطيل الخدمة', 'success');
    } catch (e) {
      console.error('[WalletServicesPanel] handleToggleActive error:', e);
      showToast('حدث خطأ أثناء تحديث الحالة', 'error');
    }
  };

  const sectionOptions = [
    { value: 'wallet-services', label: 'خدمات المحفظة' },
    { value: 'entertainment', label: 'الخدمات الترفيهية' },
    { value: 'providers', label: 'مزودين الخدمات' },
    { value: 'telecom', label: 'الاتصالات' },
    { value: 'internet', label: 'الإنترنت' },
    { value: 'electricity', label: 'الكهرباء والماء' },
    { value: 'government', label: 'خدمات حكومية' },
    { value: 'crypto', label: 'الكريبتو' },
    ...Object.entries(sections).map(([id, s]: [string, any]) => ({ value: id, label: s.name || id })),
  ];

  const serviceList = Object.entries(services).map(([id, s]) => ({ id, ...s }));
  const filteredServices = serviceList.filter(s => !search || s.name?.includes(search) || s.description?.includes(search));

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">خدمات المحفظة</h1>
          <p className="text-muted-foreground text-sm mt-1">{formatNumber(serviceList.length)} خدمة مخصصة</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialog(true); }}>
          <Plus className="w-4 h-4 ml-1" /> خدمة جديدة
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {filteredServices.map((svc, i) => {
          const isExpanded = expandedService === svc.id;
          const packages = svc.packages || {};
          const pkgCount = Object.keys(packages).length;
          const sectionLabel = sectionOptions.find(s => s.value === svc.sectionId)?.label || svc.sectionId;

          return (
            <motion.div key={svc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
              <Card className="admin-card border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {svc.icon ? (
                        <img src={svc.icon} className="w-10 h-10 rounded-lg object-cover shrink-0" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (svc.color || '#5C1A1B') + '20' }}>
                          <Wallet className="w-5 h-5" style={{ color: svc.color || '#5C1A1B' }} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{svc.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] py-0">{sectionLabel}</Badge>
                          {pkgCount > 0 && <Badge variant="outline" className="text-[10px] py-0">{pkgCount} باقة</Badge>}
                          {svc.inputLabel && <span className="text-[10px] text-muted-foreground">حقل: {svc.inputLabel}</span>}
                        </div>
                        {svc.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{svc.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Switch checked={svc.isActive !== false} onCheckedChange={(v) => handleToggleActive(svc.id, v)} />
                      <Button variant="ghost" size="sm" onClick={() => {
                        setParentService(svc.id);
                        resetPkgForm();
                        setPackageDialog(true);
                      }} title="إضافة باقة">
                        <PackagePlus className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setExpandedService(isExpanded ? null : svc.id)}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditing(svc.id);
                        setName(svc.name || ''); setDescription(svc.description || ''); setIcon(svc.icon || '');
                        setColor(svc.color || '#5C1A1B'); setCategoryId(svc.categoryId || 'wallet-services');
                        setSectionId(svc.sectionId || 'wallet-services');
                        setInputLabel(svc.inputLabel || 'معرف العميل'); setInputType(svc.inputType || 'text');
                        setInputPrefix(svc.inputPrefix || ''); setIsActive(svc.isActive !== false);
                        setSortOrder(svc.sortOrder || 0); setDialog(true);
                      }}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(svc.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>

                  {/* Expanded: Show packages */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-2 max-h-60 overflow-y-auto scrollbar-thin">
                          {pkgCount > 0 ? (
                            Object.entries(packages).map(([pkgId, pkg]: [string, any]) => (
                              <div key={pkgId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium truncate">{pkg.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-medium">{pkg.price} {pkg.currency}</span>
                                      {pkg.commission > 0 && <span className="text-[10px] text-green-600">عمولة: {pkg.commission}{pkg.commissionType === 'percentage' ? '%' : ''}</span>}
                                      {pkg.executionType === 'auto' && <Badge className="bg-blue-500/20 text-blue-600 text-[9px] py-0">تلقائي</Badge>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Badge className={pkg.isActive !== false ? 'bg-green-500/20 text-green-600 text-[9px] py-0' : 'bg-red-500/20 text-red-500 text-[9px] py-0'}>
                                    {pkg.isActive !== false ? 'نشط' : 'معطل'}
                                  </Badge>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                                    setParentService(svc.id);
                                    setEditingPkg(pkgId);
                                    setPkgName(pkg.name || ''); setPkgPrice(pkg.price || 0);
                                    setPkgCurrency(pkg.currency || 'YER'); setPkgCostPrice(pkg.costPrice || 0);
                                    setPkgCommission(pkg.commission || 0); setPkgCommissionType(pkg.commissionType || 'percentage');
                                    setPkgExecutionType(pkg.executionType || 'manual');
                                    setPkgApiProviderId(pkg.apiProviderId || ''); setPkgApiProductId(pkg.apiProductId || '');
                                    setPkgIsActive(pkg.isActive !== false); setPkgSortOrder(pkg.sortOrder || 0);
                                    setPkgDescription(pkg.description || '');
                                    setPackageDialog(true);
                                  }}><Edit className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeletePkg(svc.id, pkgId)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">لا توجد باقات. اضغط على + لإضافة باقة</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {filteredServices.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد خدمات مخصصة</p>}
      </div>

      {/* Service Dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'تعديل خدمة' : 'إضافة خدمة'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الاسم</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ببجي موبايل" /></div>
            <div><Label>الوصف</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر" /></div>
            <div>
              <Label>القسم</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {sectionOptions.map(opt => (
                  <button key={opt.value} onClick={() => { setSectionId(opt.value); setCategoryId(opt.value); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sectionId === opt.value ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>اللون</Label><Input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></div>
            <div>
              <Label>الأيقونة</Label>
              <div className="flex items-center gap-3 mt-1">
                {icon ? (
                  <div className="relative">
                    <img src={icon} className="w-10 h-10 rounded-lg object-cover" alt="" />
                    <button
                      type="button"
                      onClick={() => setIcon('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}
                <Button variant="outline" size="sm" asChild>
                  <label><Upload className="w-4 h-4 ml-1" /> رفع أيقونة<input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} /></label>
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">سيتم ضغط الصورة تلقائياً (128x128) لتسريع التحميل في تطبيق المستخدم</p>
            </div>
            <div><Label>تسمية حقل الإدخال</Label><Input value={inputLabel} onChange={(e) => setInputLabel(e.target.value)} placeholder="مثال: Player ID" /></div>
            <div>
              <Label>نوع حقل الإدخال</Label>
              <div className="flex gap-2 mt-1">
                {['text', 'phone', 'number', 'email'].map(t => (
                  <button key={t} onClick={() => setInputType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${inputType === t ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                    {t === 'text' ? 'نص' : t === 'phone' ? 'هاتف' : t === 'number' ? 'رقم' : 'بريد'}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>بادئة الحقل</Label><Input value={inputPrefix} onChange={(e) => setInputPrefix(e.target.value)} dir="ltr" placeholder="مثال: +967" /></div>
            <div><Label>ترتيب الفرز</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Dialog */}
      <Dialog open={packageDialog} onOpenChange={(open) => { setPackageDialog(open); if (!open) resetPkgForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPkg ? 'تعديل باقة' : 'إضافة باقة'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">الخدمة: {services[parentService!]?.name || parentService}</span>
            </div>
            <div><Label>اسم الباقة</Label><Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} placeholder="مثال: 100 UC" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>السعر</Label><Input type="number" value={pkgPrice} onChange={(e) => setPkgPrice(Number(e.target.value))} /></div>
              <div>
                <Label>العملة</Label>
                <div className="flex gap-1 mt-1">
                  {(['YER', 'SAR', 'USD'] as const).map(c => (
                    <button key={c} onClick={() => setPkgCurrency(c)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${pkgCurrency === c ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>سعر التكلفة</Label><Input type="number" value={pkgCostPrice} onChange={(e) => setPkgCostPrice(Number(e.target.value))} /></div>
              <div>
                <Label>العمولة</Label>
                <div className="flex gap-1">
                  <Input type="number" value={pkgCommission} onChange={(e) => setPkgCommission(Number(e.target.value))} className="flex-1" />
                  <button onClick={() => setPkgCommissionType('percentage')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium ${pkgCommissionType === 'percentage' ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'}`}>%</button>
                  <button onClick={() => setPkgCommissionType('fixed')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium ${pkgCommissionType === 'fixed' ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'}`}>ثابت</button>
                </div>
              </div>
            </div>
            <div>
              <Label>نوع التنفيذ</Label>
              <div className="flex gap-2 mt-1">
                <button onClick={() => setPkgExecutionType('manual')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${pkgExecutionType === 'manual' ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                  يدوي
                </button>
                <button onClick={() => setPkgExecutionType('auto')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${pkgExecutionType === 'auto' ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}>
                  تلقائي (API)
                </button>
              </div>
            </div>
            {pkgExecutionType === 'auto' && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                <div><Label>معرف مزود API</Label><Input value={pkgApiProviderId} onChange={(e) => setPkgApiProviderId(e.target.value)} dir="ltr" placeholder="g2bulk" /></div>
                <div><Label>معرف المنتج في API</Label><Input value={pkgApiProductId} onChange={(e) => setPkgApiProductId(e.target.value)} dir="ltr" placeholder="123" /></div>
              </div>
            )}
            <div><Label>الوصف (اختياري)</Label><Input value={pkgDescription} onChange={(e) => setPkgDescription(e.target.value)} placeholder="وصف الباقة" /></div>
            <div><Label>ترتيب الفرز</Label><Input type="number" value={pkgSortOrder} onChange={(e) => setPkgSortOrder(Number(e.target.value))} /></div>
            <div className="flex items-center gap-2"><Switch checked={pkgIsActive} onCheckedChange={setPkgIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPackageDialog(false); resetPkgForm(); }}>إلغاء</Button>
            <Button onClick={handleSavePkg} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
              {editingPkg ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
