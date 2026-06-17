'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from '@/lib/db-compat';
import { database } from '@/lib/db-compat';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateGiftCode } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AdminHelpBox } from '@/components/admin/admin-help-box';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Trash2, Gift, Copy, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GiftCodesPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [codes, setCodes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState('5');
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('YER');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [visibleToUsers, setVisibleToUsers] = useState(false);

  useEffect(() => {
    const ref_ = ref(database, 'giftCodes');
    const unsub = onValue(ref_, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setCodes(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!amount) return;
    try {
      // Look up admin's Supabase UUID from their Firebase UID
      let adminUuid = 'ad7cb1d3-ab79-4e9e-b76f-314c38a3e0c2'; // fallback to owner UUID
      if (adminUser?.uid) {
        try {
          const { data } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('firebase_uid', adminUser.uid)
            .maybeSingle();
          if (data?.id) adminUuid = data.id;
        } catch (e) { /* use fallback */ }
      }

      const codeList: { code: string; payload: any }[] = [];
      if (bulkMode) {
        const count = parseInt(bulkCount) || 1;
        for (let i = 0; i < count; i++) {
          const c = generateGiftCode();
          codeList.push({
            code: c,
            payload: {
              code: c,
              amount: parseFloat(amount),
              currency,
              max_uses: parseInt(maxUses) || 1,
              used_count: 0,
              expires_at: expiresAt || null,
              is_active: isActive,
              visible_to_users: visibleToUsers,
              status: isActive ? 'active' : 'cancelled',
              created_by: adminUuid,
              created_at: new Date().toISOString(),
            },
          });
        }
        showToast(`تم إنشاء ${count} كود هدية`, 'success');
      } else {
        const c = code || generateGiftCode();
        codeList.push({
          code: c,
          payload: {
            code: c,
            amount: parseFloat(amount),
            currency,
            max_uses: parseInt(maxUses) || 1,
            used_count: 0,
            expires_at: expiresAt || null,
            is_active: isActive,
            visible_to_users: visibleToUsers,
            status: isActive ? 'active' : 'cancelled',
            created_by: adminUuid,
            created_at: new Date().toISOString(),
          },
        });
        showToast('تم إنشاء كود الهدية', 'success');
      }

      // 1) Insert into Firebase (legacy/realtime)
      for (const { code: c, payload } of codeList) {
        await push(ref(database, 'giftCodes'), {
          code: c,
          amount: payload.amount,
          currency: payload.currency,
          maxUses: payload.max_uses,
          usedCount: 0,
          expiresAt: payload.expires_at || '',
          isActive: payload.is_active,
          visibleToUsers: payload.visible_to_users,
          createdBy: 'admin',
          createdAt: payload.created_at,
        });
      }

      // 2) Insert into Supabase (PRIMARY source — user app reads from here)
      try {
        await supabaseAdmin.from('gift_codes').insert(codeList.map((c) => c.payload));
      } catch (supaErr) {
        console.warn('Supabase gift_codes insert failed (non-fatal):', supaErr);
      }

      setDialog(false);
      setCode(''); setAmount(''); setMaxUses('1'); setExpiresAt(''); setIsActive(true); setVisibleToUsers(false);
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleToggle = async (c: any) => {
    try {
      await update(ref(database, `giftCodes/${c.id}`), { isActive: !c.isActive });
      // Mirror to Supabase by code (Firebase id is not the same as Supabase id)
      try {
        await supabaseAdmin.from('gift_codes').update({ is_active: !c.isActive, updated_at: new Date().toISOString() }).eq('code', c.code);
      } catch (e) { /* non-fatal */ }
      showToast(c.isActive ? 'تم تعطيل الكود' : 'تم تفعيل الكود', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleToggleVisibility = async (c: any) => {
    try {
      await update(ref(database, `giftCodes/${c.id}`), { visibleToUsers: !c.visibleToUsers });
      try {
        await supabaseAdmin.from('gift_codes').update({ visible_to_users: !c.visibleToUsers, updated_at: new Date().toISOString() }).eq('code', c.code);
      } catch (e) { /* non-fatal */ }
      showToast(c.visibleToUsers ? 'تم إخفاء الكود من المستخدمين' : 'تم إظهار الكود للمستخدمين', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const c = codes.find((x) => x.id === id);
      await remove(ref(database, `giftCodes/${id}`));
      if (c?.code) {
        try {
          await supabaseAdmin.from('gift_codes').delete().eq('code', c.code);
        } catch (e) { /* non-fatal */ }
      }
      showToast('تم حذف الكود', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const filtered = codes.filter(c => !search || c.code?.includes(search));

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <AdminHelpBox
        title="كيفية إدارة أكواد الهدايا المالية"
        intro="أنشئ أكواداً يربحها المستخدم عند إدخالها (مثل كود بقيمة 1000 ر.ي). مفيدة للعروض الترويجية، التعويضات، والهدايا بين المستخدمين."
        steps={[
          { title: 'إنشاء كود', description: 'اضغط "إنشاء كود". أدخل: القيمة بالعملة المختارة، تاريخ الانتهاء، عدد مرات الاستخدام (1 لمرة واحدة، أو أكثر للترويج).' },
          { title: 'تخصيص لمستخدم', description: 'يمكنك تخصيص كود لمستخدم محدد بحيث لا يستخدمه غيره. مفيد للتعويضات الفردية.' },
          { title: 'توزيع جماعي', description: 'أنشئ مجموعة أكواد (مثلاً 100 كود بقيمة 500 ر.ي) ل حملة ترويجية. صدّرها كـ CSV للتوزيع.' },
          { title: 'تتبع الاستخدام', description: 'في تبويب "مستخدمة" سترى كل كود تم استخدامه مع اسم المستخدم وتاريخ الاستخدام.' },
        ]}
        tips={[
          'حدّد دائماً تاريخ انتهاء — الأكواد الدائمة قد تُساء مستقبلاً.',
          'لا تنشر أكواداً عالية القيمة بشكل عام — استخدم التخصيص الفردي.',
          'راقب الاستخدام المتكرر من نفس الجهاز — قد يكون احتيالاً.',
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">أكواد الهدايا المالية</h1>
          <p className="text-muted-foreground text-sm mt-1">{formatNumber(codes.length)} كود</p>
        </div>
        <Button onClick={() => { setCode(generateGiftCode()); setVisibleToUsers(false); setDialog(true); }} size="sm">
          <Plus className="w-4 h-4 ml-1" /> كود جديد
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالكود..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" dir="ltr" />
      </div>

      <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
        {filtered.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10"><Gift className="w-5 h-5 text-purple-500" /></div>
                    <div>
                      <p className="font-mono text-sm font-bold" dir="ltr">{c.code}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(c.amount)} {currencySymbols[c.currency || 'YER']} - {c.usedCount || 0}/{c.maxUses || 1} استخدام</p>
                      <div className="flex items-center gap-2 mt-1">
                        {c.createdBy === 'admin' && (
                          <Badge className="bg-purple-500/20 text-purple-600 text-xs h-4">إدارة</Badge>
                        )}
                        <Badge className={c.visibleToUsers ? 'bg-green-500/20 text-green-600 text-xs h-4' : 'bg-gray-500/20 text-gray-500 text-xs h-4'}>
                          {c.visibleToUsers ? 'ظاهر للمستخدمين' : 'مخفي'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={c.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>
                      {c.isActive ? 'نشط' : 'معطل'}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleToggleVisibility(c)} title={c.visibleToUsers ? 'إخفاء من المستخدمين' : 'إظهار للمستخدمين'}>
                      {c.visibleToUsers ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                    </Button>
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
          <DialogHeader><DialogTitle>إنشاء كود هدية</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2"><Switch checked={bulkMode} onCheckedChange={setBulkMode} /><Label>إنشاء متعدد</Label></div>
            {bulkMode && <div><Label>العدد</Label><Input type="number" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} dir="ltr" /></div>}
            {!bulkMode && <div><Label>الكود</Label><Input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" /></div>}
            <div><Label>المبلغ</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" /></div>
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
            <div><Label>الحد الأقصى للاستخدام</Label><Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} dir="ltr" /></div>
            <div><Label>تاريخ الانتهاء</Label><Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
            <div className="flex items-center gap-2"><Switch checked={visibleToUsers} onCheckedChange={setVisibleToUsers} /><Label>ظاهر للمستخدمين</Label></div>
            <p className="text-xs text-muted-foreground">
              {visibleToUsers
                ? 'هذا الكود سيكون مرئيا للمستخدمين في قسم استبدال الأكواد'
                : 'هذا الكود سيكون مخفيا من المستخدمين ولا يمكن استبداله إلا عبر الإدارة'}
            </p>
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
