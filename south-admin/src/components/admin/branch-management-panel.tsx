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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin, Search, Loader2, Plus, Edit, Trash2,
  Save, Phone, Clock, Building2, Mail,
  Navigation, CheckCircle, XCircle, Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Branch {
  id?: string;
  name: string;
  nameEn?: string;
  address: string;
  city: string;
  governorate: string;
  phone: string;
  whatsapp: string;
  email: string;
  managerName: string;
  managerPhone: string;
  isActive: boolean;
  workingHours: {
    from: string;
    to: string;
  };
  weekendDays: string[];
  location: { lat: number; lng: number };
  services: string[];
  notes: string;
  createdAt: string;
  updatedAt?: string;
}

const defaultWorkingHours = { from: '08:00', to: '20:00' };
const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function BranchManagementPanel() {
  const { showToast } = useAdminStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');

  // Dialog
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formGovernorate, setFormGovernorate] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formManager, setFormManager] = useState('');
  const [formManagerPhone, setFormManagerPhone] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formWorkFrom, setFormWorkFrom] = useState('08:00');
  const [formWorkTo, setFormWorkTo] = useState('20:00');
  const [formWeekend, setFormWeekend] = useState<string[]>(['الجمعة']);
  const [formLat, setFormLat] = useState(0);
  const [formLng, setFormLng] = useState(0);
  const [formServices, setFormServices] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    const ref_ = ref(database, 'branches');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Branch[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        name: val.name || '',
        nameEn: val.nameEn || '',
        address: val.address || '',
        city: val.city || '',
        governorate: val.governorate || '',
        phone: val.phone || '',
        whatsapp: val.whatsapp || '',
        email: val.email || '',
        managerName: val.managerName || '',
        managerPhone: val.managerPhone || '',
        isActive: val.isActive !== false,
        workingHours: val.workingHours || defaultWorkingHours,
        weekendDays: val.weekendDays || ['الجمعة'],
        location: val.location || { lat: 0, lng: 0 },
        services: val.services || [],
        notes: val.notes || '',
        createdAt: val.createdAt || new Date().toISOString(),
        updatedAt: val.updatedAt || '',
      }));
      setBranches(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const cities = useMemo(() => Array.from(new Set(branches.map(b => b.city).filter(Boolean))), [branches]);

  const filtered = useMemo(() => {
    return branches.filter(b => {
      const matchSearch = search === '' ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.city.toLowerCase().includes(search.toLowerCase()) ||
        b.address.toLowerCase().includes(search.toLowerCase());
      const matchCity = cityFilter === 'all' || b.city === cityFilter;
      return matchSearch && matchCity;
    });
  }, [branches, search, cityFilter]);

  const openDialog = (branch?: Branch) => {
    if (branch) {
      setEditing(branch);
      setFormName(branch.name);
      setFormNameEn(branch.nameEn || '');
      setFormAddress(branch.address);
      setFormCity(branch.city);
      setFormGovernorate(branch.governorate);
      setFormPhone(branch.phone);
      setFormWhatsapp(branch.whatsapp);
      setFormEmail(branch.email);
      setFormManager(branch.managerName);
      setFormManagerPhone(branch.managerPhone);
      setFormActive(branch.isActive);
      setFormWorkFrom(branch.workingHours?.from || '08:00');
      setFormWorkTo(branch.workingHours?.to || '20:00');
      setFormWeekend(branch.weekendDays || []);
      setFormLat(branch.location?.lat || 0);
      setFormLng(branch.location?.lng || 0);
      setFormServices(branch.services?.join(', ') || '');
      setFormNotes(branch.notes);
    } else {
      setEditing(null);
      setFormName('');
      setFormNameEn('');
      setFormAddress('');
      setFormCity('');
      setFormGovernorate('');
      setFormPhone('');
      setFormWhatsapp('');
      setFormEmail('');
      setFormManager('');
      setFormManagerPhone('');
      setFormActive(true);
      setFormWorkFrom('08:00');
      setFormWorkTo('20:00');
      setFormWeekend(['الجمعة']);
      setFormLat(0);
      setFormLng(0);
      setFormServices('');
      setFormNotes('');
    }
    setDialog(true);
  };

  const save = async () => {
    if (!formName.trim()) { showToast('أدخل اسم الفرع', 'error'); return; }
    setSaving(true);
    try {
      const data: Omit<Branch, 'id'> = {
        name: formName.trim(),
        nameEn: formNameEn.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        governorate: formGovernorate.trim(),
        phone: formPhone.trim(),
        whatsapp: formWhatsapp.trim(),
        email: formEmail.trim(),
        managerName: formManager.trim(),
        managerPhone: formManagerPhone.trim(),
        isActive: formActive,
        workingHours: { from: formWorkFrom, to: formWorkTo },
        weekendDays: formWeekend,
        location: { lat: formLat, lng: formLng },
        services: formServices.split(',').map(s => s.trim()).filter(Boolean),
        notes: formNotes.trim(),
        createdAt: editing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editing?.id) {
        await update(ref(database, `branches/${editing.id}`), data);
      } else {
        await push(ref(database, 'branches'), data);
      }
      showToast(editing ? 'تم تحديث الفرع' : 'تم إضافة الفرع', 'success');
      setDialog(false);
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (branch: Branch) => {
    try {
      await update(ref(database, `branches/${branch.id}`), { isActive: !branch.isActive });
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const deleteBranch = async (id: string) => {
    try {
      await remove(ref(database, `branches/${id}`));
      showToast('تم حذف الفرع', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const toggleWeekendDay = (day: string) => {
    setFormWeekend(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
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
            <MapPin className="w-7 h-7 text-[#5C1A1B]" />
            إدارة الفروع
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الفروع والمواقع الفعلية</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
          <Plus className="w-4 h-4 ml-2" />
          إضافة فرع
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'إجمالي الفروع', value: branches.length, icon: Building2, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'فروع نشطة', value: branches.filter(b => b.isActive).length, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'فروع معطلة', value: branches.filter(b => !b.isActive).length, icon: XCircle, color: 'from-red-600 to-red-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث بالاسم أو المدينة..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="المدينة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المدن</SelectItem>
                {cities.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">لا توجد فروع</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map((branch, i) => (
              <motion.div
                key={branch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow', !branch.isActive && 'opacity-50')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5C1A1B]/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-[#5C1A1B]" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{branch.name}</p>
                          <p className="text-xs text-muted-foreground">{branch.city} • {branch.governorate}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px]', branch.isActive ? 'text-green-500' : 'text-red-500')}>
                        {branch.isActive ? 'نشط' : 'معطّل'}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {branch.address && (
                        <p className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{branch.address}</span>
                        </p>
                      )}
                      {branch.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span dir="ltr">{branch.phone}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{branch.workingHours?.from} - {branch.workingHours?.to}</span>
                      </p>
                      {branch.managerName && (
                        <p className="flex items-center gap-2">
                          <Navigation className="w-3 h-3 shrink-0" />
                          <span>المدير: {branch.managerName}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => toggleActive(branch)}>
                        {branch.isActive ? <XCircle className="w-3 h-3 ml-1 text-red-500" /> : <CheckCircle className="w-3 h-3 ml-1 text-green-500" />}
                        {branch.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => openDialog(branch)}>
                        <Edit className="w-3 h-3 ml-1" />
                        تعديل
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-500" onClick={() => branch.id && deleteBranch(branch.id)}>
                        <Trash2 className="w-3 h-3 ml-1" />
                        حذف
                      </Button>
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الفرع' : 'إضافة فرع جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم الفرع (عربي)</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="فرع صنعاء الرئيسي" />
              </div>
              <div>
                <Label>اسم الفرع (إنجليزي)</Label>
                <Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="Sanaa Main Branch" dir="ltr" />
              </div>
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="شارع الزبيري، بجوار..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المدينة</Label>
                <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="صنعاء" />
              </div>
              <div>
                <Label>المحافظة</Label>
                <Input value={formGovernorate} onChange={(e) => setFormGovernorate(e.target.value)} placeholder="أمانة العاصمة" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الهاتف</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+967..." dir="ltr" />
              </div>
              <div>
                <Label>واتساب</Label>
                <Input value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} placeholder="+967..." dir="ltr" />
              </div>
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="branch@example.com" dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم المدير</Label>
                <Input value={formManager} onChange={(e) => setFormManager(e.target.value)} />
              </div>
              <div>
                <Label>هاتف المدير</Label>
                <Input value={formManagerPhone} onChange={(e) => setFormManagerPhone(e.target.value)} dir="ltr" />
              </div>
            </div>
            <div>
              <Label>ساعات العمل</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">من</Label>
                  <Input type="time" value={formWorkFrom} onChange={(e) => setFormWorkFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">إلى</Label>
                  <Input type="time" value={formWorkTo} onChange={(e) => setFormWorkTo(e.target.value)} />
                </div>
              </div>
            </div>
            <div>
              <Label>عطلة نهاية الأسبوع</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {weekDays.map(day => (
                  <Button
                    key={day}
                    size="sm"
                    variant={formWeekend.includes(day) ? 'default' : 'outline'}
                    className={cn('text-xs h-7', formWeekend.includes(day) && 'bg-[#5C1A1B] hover:bg-[#3D0F10]')}
                    onClick={() => toggleWeekendDay(day)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>خط العرض</Label>
                <Input type="number" value={formLat} onChange={(e) => setFormLat(Number(e.target.value))} step="0.0001" />
              </div>
              <div>
                <Label>خط الطول</Label>
                <Input type="number" value={formLng} onChange={(e) => setFormLng(Number(e.target.value))} step="0.0001" />
              </div>
            </div>
            <div>
              <Label>الخدمات (مفصولة بفاصلة)</Label>
              <Input value={formServices} onChange={(e) => setFormServices(e.target.value)} placeholder="تحويل، إيداع، سحب..." />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="ملاحظات إضافية..." />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label>فرع نشط</Label>
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
