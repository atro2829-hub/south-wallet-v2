'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, generateId } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Zap, Search, Play, BookOpen, Code, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface InstantRechargeConfig {
  id?: string;
  providerId: string;
  providerName: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  method: 'GET' | 'POST';
  headers: string;
  bodyTemplate: string;
  isActive: boolean;
  testNumber: string;
}

export default function InstantRechargePanel() {
  const { adminUser, showToast } = useAdminStore();
  const [configs, setConfigs] = useState<InstantRechargeConfig[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<InstantRechargeConfig | null>(null);
  const [search, setSearch] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form
  const [formProviderId, setFormProviderId] = useState('');
  const [formApiUrl, setFormApiUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formApiSecret, setFormApiSecret] = useState('');
  const [formMethod, setFormMethod] = useState<'GET' | 'POST'>('POST');
  const [formHeaders, setFormHeaders] = useState('{}');
  const [formBodyTemplate, setFormBodyTemplate] = useState('{}');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formTestNumber, setFormTestNumber] = useState('');

  useEffect(() => {
    const confRef = ref(database, 'adminSettings/instantRecharge');
    const unsub1 = onValue(confRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: InstantRechargeConfig[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setConfigs(list);
    });

    const provRef = ref(database, 'providers');
    const unsub2 = onValue(provRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      setProviders(list.filter(p => p.categoryId === 'telecom'));
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const resetForm = () => {
    setFormProviderId(''); setFormApiUrl(''); setFormApiKey('');
    setFormApiSecret(''); setFormMethod('POST'); setFormHeaders('{}');
    setFormBodyTemplate('{}'); setFormIsActive(true); setFormTestNumber('');
    setEditing(null);
  };

  const handleSave = async () => {
    if (!formProviderId || !formApiUrl) {
      showToast('يرجى ملء الحقول المطلوبة', 'error');
      return;
    }
    try {
      const provider = providers.find(p => p.id === formProviderId);
      const data: Omit<InstantRechargeConfig, 'id'> = {
        providerId: formProviderId,
        providerName: provider?.name || formProviderId,
        apiUrl: formApiUrl,
        apiKey: formApiKey,
        apiSecret: formApiSecret,
        method: formMethod,
        headers: formHeaders,
        bodyTemplate: formBodyTemplate,
        isActive: formIsActive,
        testNumber: formTestNumber,
      };
      if (editing?.id) {
        await update(ref(database, `adminSettings/instantRecharge/${editing.id}`), data);
        showToast('تم تحديث إعدادات الشحن الفوري', 'success');
      } else {
        await push(ref(database, 'adminSettings/instantRecharge'), data);
        showToast('تم إضافة إعدادات الشحن الفوري', 'success');
      }
      setDialog(false);
      resetForm();
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/instantRecharge/${id}`));
      showToast('تم حذف الإعدادات', 'success');
    } catch (e) { showToast('حدث خطأ', 'error'); }
  };

  const handleTest = async (config: InstantRechargeConfig) => {
    setTesting(config.id || '');
    setTestResult(null);
    try {
      const response = await fetch(config.apiUrl, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          ...JSON.parse(config.headers || '{}'),
        },
        body: config.method === 'POST' ? JSON.stringify({
          ...JSON.parse(config.bodyTemplate || '{}'),
          phone: config.testNumber || '967770000000',
          amount: 100,
        }) : undefined,
      });
      const text = await response.text();
      setTestResult({ success: response.ok, message: `الحالة: ${response.status} - ${text.substring(0, 200)}` });
      showToast(response.ok ? 'الاتصال ناجح' : 'الاتصال فشل', response.ok ? 'success' : 'error');
    } catch (e: any) {
      setTestResult({ success: false, message: `خطأ: ${e.message}` });
      showToast('فشل الاتصال', 'error');
    } finally {
      setTesting(null);
    }
  };

  const filteredConfigs = configs.filter(c =>
    !search || c.providerName?.includes(search) || c.providerId?.includes(search)
  );

  const scriptTemplate = `// سكربت إضافة مزودين بشكل جماعي
// قم بتعديل البيانات حسب حاجتك ثم نفذ السكربت

const providers = [
  {
    providerId: "yemen_mobile",
    providerName: "يمن موبايل",
    apiUrl: "https://api.example.com/recharge",
    apiKey: "YOUR_API_KEY",
    apiSecret: "YOUR_API_SECRET",
    method: "POST",
    headers: JSON.stringify({ "X-Custom-Header": "value" }),
    bodyTemplate: JSON.stringify({ phone: "{{phone}}", amount: "{{amount}}" }),
    isActive: true,
    testNumber: "967770000000"
  },
  {
    providerId: "sabafon",
    providerName: "سبأفون",
    apiUrl: "https://api.example.com/recharge",
    apiKey: "YOUR_API_KEY",
    apiSecret: "YOUR_API_SECRET",
    method: "POST",
    headers: "{}",
    bodyTemplate: "{}",
    isActive: true,
    testNumber: "967770000000"
  },
];

// حفظ في Firebase
const database = getDatabase();
for (const provider of providers) {
  await push(ref(database, 'adminSettings/instantRecharge'), provider);
}`;

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">خدمات الشحن الفوري</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة اتصالات API لمزودي الاتصالات</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialog(true); }}>
          <Plus className="w-4 h-4 ml-1" /> إعدادات جديدة
        </Button>
      </div>

      <Tabs defaultValue="configs">
        <TabsList className="w-full">
          <TabsTrigger value="configs" className="flex-1">إعدادات API</TabsTrigger>
          <TabsTrigger value="instructions" className="flex-1">التعليمات</TabsTrigger>
          <TabsTrigger value="script" className="flex-1">السكربت</TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
          </div>

          {testResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className={`admin-card border-0 shadow-none ${testResult.success ? 'border-green-500/30' : 'border-red-500/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {testResult.success ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    <span className="font-medium text-sm">{testResult.success ? 'الاختبار ناجح' : 'الاختبار فشل'}</span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded-lg overflow-auto max-h-40" dir="ltr">{testResult.message}</pre>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTestResult(null)}>إغلاق</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin">
            {filteredConfigs.map((config, i) => (
              <motion.div key={config.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{config.providerName}</p>
                          <p className="text-xs text-muted-foreground">{config.method} - {config.apiUrl?.substring(0, 40)}...</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={config.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>
                          {config.isActive ? 'نشط' : 'معطل'}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => handleTest(config)} disabled={!!testing}>
                          {testing === config.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditing(config);
                          setFormProviderId(config.providerId); setFormApiUrl(config.apiUrl);
                          setFormApiKey(config.apiKey); setFormApiSecret(config.apiSecret);
                          setFormMethod(config.method); setFormHeaders(config.headers || '{}');
                          setFormBodyTemplate(config.bodyTemplate || '{}'); setFormIsActive(config.isActive);
                          setFormTestNumber(config.testNumber || '');
                          setDialog(true);
                        }}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => config.id && handleDelete(config.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                    {config.testNumber && (
                      <p className="text-xs text-muted-foreground">رقم الاختبار: {config.testNumber}</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filteredConfigs.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد إعدادات شحن فوري</p>}
          </div>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-4">
          <Card className="admin-card border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-500" /> تعليمات إضافة API للشحن الفوري
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted">
                  <p className="font-medium text-sm mb-1">الخطوة 1: الحصول على بيانات API</p>
                  <p className="text-xs text-muted-foreground">تواصل مع مزود الخدمة للحصول على رابط API ومفتاح التشفير والسر</p>
                </div>
                <div className="p-3 rounded-xl bg-muted">
                  <p className="font-medium text-sm mb-1">الخطوة 2: إضافة الإعدادات</p>
                  <p className="text-xs text-muted-foreground">اضغط على &quot;إعدادات جديدة&quot; وأدخل بيانات الاتصال الخاصة بالمزود</p>
                </div>
                <div className="p-3 rounded-xl bg-muted">
                  <p className="font-medium text-sm mb-1">الخطوة 3: اختبار الاتصال</p>
                  <p className="text-xs text-muted-foreground">استخدم رقم اختبار للتأكد من عمل API بشكل صحيح قبل التفعيل</p>
                </div>
                <div className="p-3 rounded-xl bg-muted">
                  <p className="font-medium text-sm mb-1">الخطوة 4: تفعيل الخدمة</p>
                  <p className="text-xs text-muted-foreground">بعد نجاح الاختبار، فعّل الخدمة ليتمكن المستخدمون من الشحن الفوري</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ملاحظة: تأكد من أن API يُرجع حالة الطلب بشكل واضح. يمكنك استخدام القوالب التالية في bodyTemplate: {'{{phone}}'} و {'{{amount}}'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-4">
          <Card className="admin-card border-0 shadow-none">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-500" /> سكربت إضافة جماعية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-xl overflow-auto max-h-96 scrollbar-thin" dir="ltr" style={{ whiteSpace: 'pre-wrap' }}>
                {scriptTemplate}
              </pre>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                navigator.clipboard.writeText(scriptTemplate);
                showToast('تم نسخ السكربت', 'success');
              }}>نسخ السكربت</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'تعديل إعدادات الشحن' : 'إضافة إعدادات شحن فوري'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>المزود</Label>
              <Select value={formProviderId} onValueChange={setFormProviderId}>
                <SelectTrigger><SelectValue placeholder="اختر المزود" /></SelectTrigger>
                <SelectContent>
                  {providers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>رابط API</Label><Input value={formApiUrl} onChange={(e) => setFormApiUrl(e.target.value)} dir="ltr" placeholder="https://api.example.com/recharge" /></div>
            <div><Label>مفتاح API</Label><Input type="password" value={formApiKey} onChange={(e) => setFormApiKey(e.target.value)} dir="ltr" /></div>
            <div><Label>السر (Secret)</Label><Input type="password" value={formApiSecret} onChange={(e) => setFormApiSecret(e.target.value)} dir="ltr" /></div>
            <div><Label>طريقة الطلب</Label>
              <Select value={formMethod} onValueChange={(v: any) => setFormMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>الHeaders (JSON)</Label><Textarea value={formHeaders} onChange={(e) => setFormHeaders(e.target.value)} dir="ltr" className="min-h-[80px] font-mono text-xs" placeholder='{"X-Custom-Header": "value"}' /></div>
            <div><Label>قالب الBody (JSON)</Label><Textarea value={formBodyTemplate} onChange={(e) => setFormBodyTemplate(e.target.value)} dir="ltr" className="min-h-[80px] font-mono text-xs" placeholder='{"phone": "{{phone}}", "amount": "{{amount}}"}' /></div>
            <div><Label>رقم الاختبار</Label><Input value={formTestNumber} onChange={(e) => setFormTestNumber(e.target.value)} dir="ltr" placeholder="967770000000" /></div>
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
