'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, cn, generateId, formatDateAr } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Trash2, Landmark, Copy, Check, Loader2, Building2, Phone, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Bank {
  id?: string;
  name: string;
  accountName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  branch?: string;
  isActive: boolean;
  createdAt: string;
}

export default function BanksPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formIban, setFormIban] = useState('');
  const [formSwift, setFormSwift] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formActive, setFormActive] = useState(true);

  useEffect(() => {
    const banksRef = ref(database, 'adminSettings/banks');
    const unsub = onValue(banksRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Bank[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        name: val.name || '',
        accountName: val.accountName || '',
        accountNumber: val.accountNumber || '',
        iban: val.iban || '',
        swiftCode: val.swiftCode || '',
        branch: val.branch || '',
        isActive: val.isActive !== false,
        createdAt: val.createdAt || new Date().toISOString(),
      }));
      setBanks(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return banks.filter(b => !search || b.name.includes(search) || b.accountName.includes(search) || b.accountNumber.includes(search));
  }, [banks, search]);

  const stats = useMemo(() => ({
    total: banks.length,
    active: banks.filter(b => b.isActive).length,
    inactive: banks.filter(b => !b.isActive).length,
  }), [banks]);

  const openDialog = (bank?: Bank) => {
    if (bank) {
      setEditing(bank);
      setFormName(bank.name);
      setFormAccountName(bank.accountName);
      setFormAccountNumber(bank.accountNumber);
      setFormIban(bank.iban || '');
      setFormSwift(bank.swiftCode || '');
      setFormBranch(bank.branch || '');
      setFormActive(bank.isActive);
    } else {
      setEditing(null);
      setFormName('');
      setFormAccountName('');
      setFormAccountNumber('');
      setFormIban('');
      setFormSwift('');
      setFormBranch('');
      setFormActive(true);
    }
    setDialog(true);
  };

  const save = async () => {
    if (!formName.trim() || !formAccountName.trim() || !formAccountNumber.trim()) {
      showToast('أدخل البيانات المطلوبة', 'error'); return;
    }
    setSaving(true);
    try {
      const data = {
        name: formName.trim(), accountName: formAccountName.trim(),
        accountNumber: formAccountNumber.trim(), iban: formIban.trim(),
        swiftCode: formSwift.trim(), branch: formBranch.trim(),
        isActive: formActive,
        updatedAt: new Date().toISOString(),
      };
      if (editing?.id) {
        await update(ref(database, `adminSettings/banks/${editing.id}`), data);
      } else {
        await push(ref(database, 'adminSettings/banks'), { ...data, createdAt: new Date().toISOString() });
      }
      showToast(editing ? 'تم تحديث البنك' : 'تم إضافة البنك', 'success');
      setDialog(false);
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
  };

  const deleteBank = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/banks/${id}`));
      showToast('تم حذف البنك', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const toggleActive = async (bank: Bank) => {
    try {
      await update(ref(database, `adminSettings/banks/${bank.id}`), { isActive: !bank.isActive });
    } catch { showToast('حدث خطأ', 'error'); }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('تم النسخ', 'success');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Landmark className="w-7 h-7 text-[#5C1A1B]" />الحسابات البنكية</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الحسابات البنكية للإيداع</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
          <Plus className="w-4 h-4 ml-2" />إضافة بنك
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: Landmark, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'نشط', value: stats.active, icon: Check, color: 'from-green-600 to-green-800' },
          { label: 'معطّل', value: stats.inactive, icon: Building2, color: 'from-gray-600 to-gray-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}><s.icon className="w-4 h-4" /></div>
                  <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative"><Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" /></div>

      {/* Banks List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center"><Landmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-muted-foreground">لا توجد بنوك</p></CardContent></Card>
            </motion.div>
          ) : (
            filtered.map((bank, i) => (
              <motion.div key={bank.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className={cn('border-0 shadow-sm hover:shadow-md transition-shadow', !bank.isActive && 'opacity-50')}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#5C1A1B]/10 flex items-center justify-center shrink-0">
                          <Landmark className="w-6 h-6 text-[#5C1A1B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm">{bank.name}</p>
                            <Badge className={cn('text-[9px]', bank.isActive ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600')}>
                              {bank.isActive ? 'نشط' : 'معطّل'}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">اسم الحساب:</span>
                              <span className="font-medium">{bank.accountName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground">رقم الحساب:</span>
                              <span className="font-mono font-medium" dir="ltr">{bank.accountNumber}</span>
                              <button onClick={() => copyToClipboard(bank.accountNumber, bank.id || '')} className="p-1 rounded hover:bg-muted/50">
                                {copiedId === bank.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                              </button>
                            </div>
                            {bank.iban && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">IBAN:</span>
                                <span className="font-mono text-xs" dir="ltr">{bank.iban}</span>
                              </div>
                            )}
                            {bank.branch && <p className="text-xs text-muted-foreground">الفرع: {bank.branch}</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleActive(bank)}>
                          {bank.isActive ? <Check className="w-4 h-4 text-green-500" /> : <Building2 className="w-4 h-4 text-red-500" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDialog(bank)}><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => bank.id && deleteBank(bank.id)}><Trash2 className="w-4 h-4" /></Button>
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
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'تعديل البنك' : 'إضافة بنك'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم البنك *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="بنك اليمن والكويت..." /></div>
            <div><Label>اسم صاحب الحساب *</Label><Input value={formAccountName} onChange={e => setFormAccountName(e.target.value)} placeholder="محمد أحمد..." /></div>
            <div><Label>رقم الحساب *</Label><Input value={formAccountNumber} onChange={e => setFormAccountNumber(e.target.value)} placeholder="0123456789" dir="ltr" /></div>
            <div><Label>IBAN</Label><Input value={formIban} onChange={e => setFormIban(e.target.value)} placeholder="YE00..." dir="ltr" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SWIFT Code</Label><Input value={formSwift} onChange={e => setFormSwift(e.target.value)} placeholder="YOABYESC" dir="ltr" /></div>
              <div><Label>الفرع</Label><Input value={formBranch} onChange={e => setFormBranch(e.target.value)} placeholder="الفرع الرئيسي" /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={formActive} onCheckedChange={setFormActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Plus className="w-4 h-4 ml-2" />}
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
