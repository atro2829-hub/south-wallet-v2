'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/store';
import { formatNumber, currencySymbols, generateId } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit, TrendingUp, Search, Loader2, CheckCircle, XCircle, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendNotificationToUser } from '@/lib/notifications';

interface InvestmentPlan {
  id?: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  durationDays: number;
  minAmount: number;
  maxAmount: number;
  currency: string;
  profitRate: number;
  isActive: boolean;
  createdAt: string;
}

interface UserInvestment {
  id?: string;
  uid?: string;
  userName?: string;
  planId: string;
  planName: string;
  amount: number;
  currency: string;
  profitRate: number;
  status: 'active' | 'matured' | 'cancelled';
  startDate: string;
  endDate: string;
  totalProfit: number;
  earnedProfit: number;
}

export default function InvestmentsPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [investments, setInvestments] = useState<UserInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<InvestmentPlan | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [autoCompletion, setAutoCompletion] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'complete' | 'cancel'; investment: UserInvestment | null }>({ type: 'complete', investment: null });

  // Plan form state
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('daily');
  const [planDuration, setPlanDuration] = useState('30');
  const [planMinAmount, setPlanMinAmount] = useState('');
  const [planMaxAmount, setPlanMaxAmount] = useState('');
  const [planCurrency, setPlanCurrency] = useState('YER');
  const [planProfitRate, setPlanProfitRate] = useState('');
  const [planIsActive, setPlanIsActive] = useState(true);

  // FIX: read investment_plans and investments directly from Supabase tables.
  // Previously used `adminSettings/investmentPlans` (Firebase path that collapsed
  // to a single app_config row → only one plan was visible) and
  // `users/{uid}/investments` (extractField on a non-existent column → empty).
  useEffect(() => {
    let plansChannel: any = null;
    let investmentsChannel: any = null;

    const loadPlans = async () => {
      try {
        const { data, error } = await supabaseAdmin
          .from('investment_plans')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const list: InvestmentPlan[] = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.name_en || 'خطة',
          type: p.duration_days <= 7 ? 'daily' : p.duration_days <= 30 ? 'monthly' : p.duration_days <= 90 ? 'quarterly' : 'weekly',
          durationDays: p.duration_days || 30,
          minAmount: Number(p.min_amount) || 0,
          maxAmount: Number(p.max_amount) || 0,
          currency: p.currency || 'USDT',
          profitRate: Number(p.profit_rate) || 0,
          isActive: p.is_active !== false,
          createdAt: p.created_at || new Date().toISOString(),
        }));
        setPlans(list);
      } catch (e: any) {
        console.error('[investments-panel] plans load error:', e);
        showToast('فشل تحميل الخطط: ' + e.message, 'error');
      }
    };

    const loadInvestments = async () => {
      try {
        const { data, error } = await supabaseAdmin
          .from('investments')
          .select('*, users!inner(name, email, phone)')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        const list: UserInvestment[] = (data || []).map((inv: any) => ({
          id: inv.id,
          uid: inv.user_id,
          userName: inv.users?.name || inv.users?.email || inv.users?.phone || inv.user_id,
          planId: inv.plan_id || '',
          planName: inv.plan_name || '',
          amount: Number(inv.amount) || 0,
          currency: inv.currency || 'USDT',
          profitRate: Number(inv.daily_return) || 0,
          status: inv.status || 'active',
          startDate: inv.starts_at || inv.created_at,
          endDate: inv.ends_at || '',
          totalProfit: Number(inv.total_return) || 0,
          earnedProfit: 0, // FIX: earned_return column doesn't exist yet
        }));
        setInvestments(list);
      } catch (e: any) {
        console.error('[investments-panel] investments load error:', e);
        setInvestments([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
    loadInvestments();

    // Subscribe to realtime changes
    plansChannel = supabaseAdmin
      .channel(`investment-plans-admin-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investment_plans' }, () => loadPlans())
      .subscribe();
    investmentsChannel = supabaseAdmin
      .channel(`investments-admin-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => loadInvestments())
      .subscribe();

    return () => {
      try { supabaseAdmin.removeChannel(plansChannel); } catch {}
      try { supabaseAdmin.removeChannel(investmentsChannel); } catch {}
    };
  }, []);

  const resetForm = () => {
    setPlanName(''); setPlanType('daily'); setPlanDuration('30');
    setPlanMinAmount(''); setPlanMaxAmount(''); setPlanCurrency('YER');
    setPlanProfitRate(''); setPlanIsActive(true); setEditing(null);
  };

  const handleSavePlan = async () => {
    if (!planName || !planProfitRate) { showToast('يرجى ملء جميع الحقول المطلوبة', 'error'); return; }
    try {
      const payload = {
        name: planName,
        name_en: planName,
        description: '',
        min_amount: parseFloat(planMinAmount) || 0,
        max_amount: parseFloat(planMaxAmount) || 0,
        duration_days: parseInt(planDuration) || 30,
        profit_rate: parseFloat(planProfitRate) || 0,
        currency: planCurrency,
        is_active: planIsActive,
        updated_at: new Date().toISOString(),
      };
      if (editing?.id) {
        const { error } = await supabaseAdmin
          .from('investment_plans')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        showToast('تم تحديث خطة الاستثمار', 'success');
      } else {
        const { error } = await supabaseAdmin
          .from('investment_plans')
          .insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        showToast('تم إضافة خطة الاستثمار', 'success');
      }
      setDialog(false); resetForm();
    } catch (e: any) { showToast('حدث خطأ: ' + e.message, 'error'); }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      const { error } = await supabaseAdmin.from('investment_plans').delete().eq('id', id);
      if (error) throw error;
      showToast('تم حذف خطة الاستثمار', 'success');
    } catch (e: any) { showToast('حدث خطأ: ' + e.message, 'error'); }
  };

  const handleToggleAutoCompletion = async (value: boolean) => {
    try {
      // Store in app_config as a JSON blob
      const { error } = await supabaseAdmin
        .from('app_config')
        .upsert({ key: 'investmentAutoCompletion', value: { enabled: value }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      setAutoCompletion(value);
      showToast(value ? 'تم تفعيل الإكمال التلقائي' : 'تم تعطيل الإكمال التلقائي', 'success');
    } catch (e: any) { showToast('حدث خطأ: ' + e.message, 'error'); }
  };

  const handleCompleteInvestment = async () => {
    const inv = confirmDialog.investment;
    if (!inv?.uid || !inv?.id) return;
    try {
      const { error } = await supabaseAdmin
        .from('investments')
        .update({ status: 'matured', updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      if (error) throw error;
      // Send FCM push notification + in-app notification
      try {
        await sendNotificationToUser(inv.uid, {
          title: 'تم إكمال الاستثمار',
          body: `تم إكمال استثمارك في خطة ${inv.planName || ''} بمبلغ ${inv.amount} ${currencySymbols[inv.currency || 'YER']}`,
          type: 'transaction',
          data: { action: 'investment_completed', planName: inv.planName, amount: inv.amount },
        });
      } catch {}
      showToast('تم إكمال الاستثمار', 'success');
      setConfirmDialog({ type: 'complete', investment: null });
    } catch (e: any) { showToast('حدث خطأ: ' + e.message, 'error'); }
  };

  const handleCancelInvestment = async () => {
    const inv = confirmDialog.investment;
    if (!inv?.uid || !inv?.id) return;
    try {
      const { error } = await supabaseAdmin
        .from('investments')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', inv.id);
      if (error) throw error;

      // Refund the investment amount via atomic update_user_balance RPC
      if (inv.amount) {
        const cur = (inv.currency || 'YER').toUpperCase();
        const currencyField = cur === 'YER' ? 'balance_yer' : cur === 'SAR' ? 'balance_sar' : 'balance_usd';
        const { error: refundErr } = await supabaseAdmin
          .from('users')
          .update({ [currencyField]: supabaseAdmin.rpc('update_user_balance', {
            p_user_id: inv.uid, p_currency: cur, p_amount: inv.amount, p_operation: 'add'
          }) })
          .eq('id', inv.uid);
        // Fallback: direct increment if RPC didn't work
        if (refundErr) {
          const { data: u } = await supabaseAdmin.from('users').select(currencyField).eq('id', inv.uid).maybeSingle();
          const currentBalance = Number((u as any)?.[currencyField]) || 0;
          await supabaseAdmin.from('users').update({ [currencyField]: currentBalance + inv.amount }).eq('id', inv.uid);
        }
      }

      // Send FCM push notification + in-app notification
      try {
        await sendNotificationToUser(inv.uid, {
          title: 'تم إلغاء الاستثمار',
          body: `تم إلغاء استثمارك في خطة ${inv.planName || ''} واسترداد ${inv.amount} ${currencySymbols[inv.currency || 'YER']}`,
          type: 'transaction',
          data: { action: 'investment_cancelled', planName: inv.planName, amount: inv.amount },
        });
      } catch {}
      showToast('تم إلغاء الاستثمار واسترداد المبلغ', 'success');
      setConfirmDialog({ type: 'cancel', investment: null });
    } catch (e: any) { showToast('حدث خطأ: ' + e.message, 'error'); }
  };

  const filteredInvestments = investments.filter((inv) => {
    const matchesSearch = !search || inv.userName?.includes(search) || inv.planName?.includes(search);
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeInvestments = investments.filter((i) => i.status === 'active');
  const completedInvestments = investments.filter((i) => i.status === 'matured');
  const totalInvested = investments.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalProfitsPaid = completedInvestments.reduce((sum, i) => sum + (i.totalProfit || 0), 0);

  const typeLabels: Record<string, string> = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربع سنوي' };
  const statusLabels: Record<string, string> = { active: 'نشط', matured: 'مكتمل', cancelled: 'ملغي' };
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-600 dark:text-green-400',
    matured: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    cancelled: 'bg-red-500/20 text-red-600 dark:text-red-400',
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الاستثمار</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة خطط الاستثمار ومتابعة المستثمرين</p>
        </div>
        <Button onClick={() => { resetForm(); setDialog(true); }} size="sm"><Plus className="w-4 h-4 ml-1" /> خطة جديدة</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', value: activeInvestments.length, label: 'استثمارات نشطة' },
          { icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10', value: totalInvested, label: 'إجمالي المستثمر' },
          { icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-500/10', value: totalProfitsPaid, label: 'أرباح مدفوعة' },
          { icon: CheckCircle, color: 'text-teal-500', bg: 'bg-teal-500/10', value: completedInvestments.length, label: 'مكتملة' },
        ].map((card, index) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardContent className="p-4 text-center">
                <card.icon className={`w-6 h-6 mx-auto mb-2 ${card.color}`} />
                <p className="text-xl font-bold">{formatNumber(card.value)}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="w-full">
          <TabsTrigger value="plans" className="flex-1">خطط الاستثمار</TabsTrigger>
          <TabsTrigger value="investments" className="flex-1">استثمارات المستخدمين</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="space-y-3 max-h-[calc(100vh-440px)] overflow-y-auto scrollbar-thin">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-500" /></div>
                        <div>
                          <p className="font-medium text-sm">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">{typeLabels[plan.type] || plan.type} - {plan.durationDays} يوم - عائد {plan.profitRate}%</p>
                          <p className="text-xs text-muted-foreground">من {formatNumber(plan.minAmount)} إلى {formatNumber(plan.maxAmount)} {currencySymbols[plan.currency || 'YER']}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={plan.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>{plan.isActive ? 'نشط' : 'معطل'}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditing(plan); setPlanName(plan.name); setPlanType(plan.type);
                          setPlanDuration(String(plan.durationDays)); setPlanMinAmount(String(plan.minAmount));
                          setPlanMaxAmount(String(plan.maxAmount)); setPlanCurrency(plan.currency);
                          setPlanProfitRate(String(plan.profitRate)); setPlanIsActive(plan.isActive); setDialog(true);
                        }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => plan.id && handleDeletePlan(plan.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {plans.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد خطط استثمار</p>}
          </div>
        </TabsContent>

        <TabsContent value="investments" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="matured">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 max-h-[calc(100vh-480px)] overflow-y-auto scrollbar-thin">
            {filteredInvestments.map((inv, i) => (
              <motion.div key={`${inv.uid}-${inv.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: inv.status === 'active' ? 'rgba(34,197,94,0.1)' : inv.status === 'matured' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)' }}>
                          {inv.status === 'active' ? <Clock className="w-5 h-5 text-green-500" /> : inv.status === 'matured' ? <CheckCircle className="w-5 h-5 text-blue-500" /> : <XCircle className="w-5 h-5 text-red-500" />}}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{inv.userName}</p>
                          <p className="text-xs text-muted-foreground">{inv.planName} - {formatNumber(inv.amount)} {currencySymbols[inv.currency || 'YER']}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[inv.status] || ''}>{statusLabels[inv.status] || inv.status}</Badge>
                        {inv.status === 'active' && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => setConfirmDialog({ type: 'complete', investment: inv })}><CheckCircle className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setConfirmDialog({ type: 'cancel', investment: inv })}><XCircle className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filteredInvestments.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد استثمارات</p>}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="admin-card border-0 shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
                <div>
                  <p className="font-medium text-sm">الإكمال التلقائي للاستثمارات</p>
                  <p className="text-xs text-muted-foreground">إكمال الاستثمارات تلقائيا عند انتهاء المدة</p>
                </div>
                <Switch checked={autoCompletion} onCheckedChange={handleToggleAutoCompletion} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Plan Dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'تعديل خطة' : 'إضافة خطة استثمار'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم الخطة</Label><Input value={planName} onChange={(e) => setPlanName(e.target.value)} /></div>
            <div><Label>نوع الخطة</Label>
              <Select value={planType} onValueChange={(v: any) => { setPlanType(v); const d: Record<string, string> = { daily: '30', weekly: '28', monthly: '30', quarterly: '90' }; setPlanDuration(d[v] || '30'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem><SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem><SelectItem value="quarterly">ربع سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>المدة بالأيام</Label><Input type="number" value={planDuration} onChange={(e) => setPlanDuration(e.target.value)} dir="ltr" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>الحد الأدنى</Label><Input type="number" value={planMinAmount} onChange={(e) => setPlanMinAmount(e.target.value)} dir="ltr" /></div>
              <div><Label>الحد الأقصى</Label><Input type="number" value={planMaxAmount} onChange={(e) => setPlanMaxAmount(e.target.value)} dir="ltr" /></div>
            </div>
            <div><Label>العملة</Label>
              <Select value={planCurrency} onValueChange={setPlanCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="YER">ريال يمني</SelectItem><SelectItem value="SAR">ريال سعودي</SelectItem><SelectItem value="USD">دولار</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>نسبة الربح (%)</Label><Input type="number" value={planProfitRate} onChange={(e) => setPlanProfitRate(e.target.value)} dir="ltr" /></div>
            <div className="flex items-center gap-2"><Switch checked={planIsActive} onCheckedChange={setPlanIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSavePlan}>{editing ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmDialog.investment} onOpenChange={(open) => { if (!open) setConfirmDialog({ type: 'complete', investment: null }); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirmDialog.type === 'complete' ? 'إكمال الاستثمار' : 'إلغاء الاستثمار'}</AlertDialogTitle></AlertDialogHeader>
          <p className="text-sm text-muted-foreground">{confirmDialog.type === 'complete' ? 'هل أنت متأكد من إكمال هذا الاستثمار؟' : 'هل أنت متأكد من إلغاء هذا الاستثمار؟'}</p>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.type === 'complete' ? handleCompleteInvestment : handleCancelInvestment} className={confirmDialog.type === 'complete' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
              {confirmDialog.type === 'complete' ? 'إكمال' : 'إلغاء الاستثمار'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
