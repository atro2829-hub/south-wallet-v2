'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateGiftCode } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Trash2, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PromoCodesPanel() {
  const { showToast } = useAdminStore();
  const [codes, setCodes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [pCode, setPCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [currency, setCurrency] = useState('YER');
  const [maxUses, setMaxUses] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const ref_ = ref(database, 'promo-codes');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setCodes(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!pCode || !discount) return;
    try {
      await push(ref(database, 'promo-codes'), {
        code: pCode,
        discount: parseFloat(discount),
        type,
        currency,
        maxUses: parseInt(maxUses) || 10,
        usedCount: 0,
        expiresAt: expiresAt || '',
        isActive,
        createdAt: new Date().toISOString(),
      });
      showToast('تم إنشاء كود الخصم', 'success');
      setDialog(false);
      setPCode(''); setDiscount(''); setMaxUses('10'); setExpiresAt(''); setIsActive(true);
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleToggle = async (c: any) => {
    try {
      await update(ref(database, `promo-codes/${c.id}`), { isActive: !c.isActive });
      showToast(c.isActive ? 'تم تعطيل الكود' : 'تم تفعيل الكود', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(database, `promo-codes/${id}`));
      showToast('تم حذف الكود', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const filtered = codes.filter(c => !search || c.code?.includes(search));

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">أكواد الخصم والعروض</h1>
          <p className="text-muted-foreground text-sm mt-1">{formatNumber(codes.length)} كود</p>
        </div>
        <Button onClick={() => { setPCode('PROMO-' + Math.random().toString(36).substr(2, 6).toUpperCase()); setDialog(true); }} size="sm">
          <Plus className="w-4 h-4 ml-1" /> كود جديد
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" dir="ltr" />
      </div>

      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
        {filtered.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10"><Tag className="w-5 h-5 text-orange-500" /></div>
                    <div>
                      <p className="font-mono text-sm font-bold" dir="ltr">{c.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.type === 'percentage' ? `${c.discount}% خصم` : `${formatNumber(c.discount)} ${currencySymbols[c.currency || 'YER']} خصم`}
                        {' - '}{c.usedCount || 0}/{c.maxUses || 10} استخدام
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={c.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>
                      {c.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(c)}><Switch checked={c.isActive} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد أكواد</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء كود خصم</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>الكود</Label><Input value={pCode} onChange={(e) => setPCode(e.target.value)} dir="ltr" /></div>
            <div><Label>نوع الخصم</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة مئوية</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>قيمة الخصم {type === 'percentage' ? '(%)' : ''}</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} dir="ltr" /></div>
            {type === 'fixed' && (
              <div><Label>العملة</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">ريال يمني</SelectItem>
                    <SelectItem value="SAR">ريال سعودي</SelectItem>
                    <SelectItem value="USD">دولار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>الحد الأقصى للاستخدام</Label><Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} dir="ltr" /></div>
            <div><Label>تاريخ الانتهاء</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={handleCreate}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
