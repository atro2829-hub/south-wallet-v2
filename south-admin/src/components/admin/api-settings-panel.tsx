'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, set, get, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Textarea } from '@/components/ui/textarea';
import {
  Save, Loader2, Code, CheckCircle, XCircle, RefreshCw, DollarSign,
  Plus, Trash2, Edit, Zap, ArrowRight, Clock, Globe, Layers,
  ChevronDown, ChevronUp, Wifi, Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { testApiConnection, generateApiProviderId, type ApiProviderConfig, type ApiTestResult } from '@/lib/api-provider';
import { syncExchangeRatesFromApi } from '@/lib/exchange-rate-sync';

// ─── Exchange Rate Settings Sub-Component ──────────────────────────────

function ExchangeRateSettings() {
  const { showToast } = useAdminStore();
  const [exchangeRateUrl, setExchangeRateUrl] = useState('https://cygrlhmnmckoefefnsjc.supabase.co/functions/v1/public-api/latest?city=aden&currency=usd');
  const [syncInterval, setSyncInterval] = useState('15');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; data?: Record<string, unknown>; error?: string } | null>(null);
  const [currentRates, setCurrentRates] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiRef = ref(database, 'adminSettings/apiSettings');
    const unsub2 = onValue(apiRef, (snapshot) => {
      const data = snapshot.val() || {};
      setExchangeRateUrl(data.exchangeRateUrl || 'https://cygrlhmnmckoefefnsjc.supabase.co/functions/v1/public-api/latest?city=aden&currency=usd');
      setSyncInterval(String(data.exchangeRateSyncInterval || '15'));
      setSyncEnabled(data.syncEnabled || false);
      setManualOverrides(data.manualOverrides || {});
    });

    const ratesRef = ref(database, 'adminSettings/exchangeRates');
    const unsub3 = onValue(ratesRef, (snapshot) => {
      setCurrentRates(snapshot.val() || {});
      setLoading(false);
    });

    return () => { unsub2(); unsub3(); };
  }, []);

  const handleSaveExchangeRateSettings = async () => {
    setSaving(true);
    try {
      await set(ref(database, 'adminSettings/apiSettings'), {
        exchangeRateUrl,
        exchangeRateSyncInterval: parseInt(syncInterval) || 15,
        syncEnabled,
        manualOverrides,
      });
      showToast('تم حفظ إعدادات أسعار الصرف', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
    finally { setSaving(false); }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Use the new sync utility which fetches both USD and SAR from the API
      const ratesData = await syncExchangeRatesFromApi();
      setTestResult({
        success: true,
        data: {
          USD_sell: ratesData.sellRates.USD,
          USD_buy: ratesData.buyRates.USD,
          SAR_sell: ratesData.sellRates.SAR,
          SAR_buy: ratesData.buyRates.SAR,
          YER_USD: ratesData.USD,
          YER_SAR: ratesData.SAR,
          commission: ratesData.commission,
          lastSynced: ratesData.lastSynced,
        },
      });
      setCurrentRates({
        YER_USD: ratesData.USD,
        YER_SAR: ratesData.SAR,
        USD_buy: ratesData.buyRates.USD,
        USD_sell: ratesData.sellRates.USD,
        SAR_buy: ratesData.buyRates.SAR,
        SAR_sell: ratesData.sellRates.SAR,
        commission: ratesData.commission,
        lastSynced: ratesData.lastSynced,
      });
      showToast('تم جلب الأسعار وتحديثها بنجاح', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({ success: false, error: message });
      showToast('فشل الاتصال', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveOverrides = async () => {
    try {
      await update(ref(database, 'adminSettings/apiSettings'), { manualOverrides });
      await update(ref(database, 'adminSettings/exchangeRates'), manualOverrides);
      showToast('تم حفظ الأسعار اليدوية', 'success');
    } catch { showToast('حدث خطأ', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card border-0 shadow-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-500" /> إعدادات أسعار الصرف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>رابط API لأسعار الصرف</Label>
              <Input value={exchangeRateUrl} onChange={(e) => setExchangeRateUrl(e.target.value)} dir="ltr" placeholder="https://api.yemen-rate.com/v1/rates" />
            </div>
            <div>
              <Label>فترة المزامنة التلقائية</Label>
              <Select value={syncInterval} onValueChange={setSyncInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">كل 5 دقائق</SelectItem>
                  <SelectItem value="15">كل 15 دقيقة</SelectItem>
                  <SelectItem value="30">كل 30 دقيقة</SelectItem>
                  <SelectItem value="60">كل ساعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
              <div>
                <p className="text-sm font-medium">تفعيل المزامنة التلقائية</p>
                <p className="text-xs text-muted-foreground">تحديث الأسعار تلقائيا من API</p>
              </div>
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>
            <Button onClick={handleTestConnection} disabled={testing} variant="outline" className="w-full">
              {testing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
              اختبار الاتصال وجلب الأسعار
            </Button>
            {testResult && (
              <div className={`p-3 rounded-xl ${testResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="text-sm font-medium">{testResult.success ? 'الاتصال ناجح' : 'الاتصال فشل'}</span>
                </div>
                {testResult.success && testResult.data && (
                  <pre className="text-xs bg-muted p-2 rounded-lg overflow-auto max-h-40" dir="ltr">{JSON.stringify(testResult.data, null, 2)}</pre>
                )}
                {testResult.error && <p className="text-xs text-red-500">{testResult.error}</p>}
              </div>
            )}
            <Button onClick={handleSaveExchangeRateSettings} disabled={saving} className="w-full bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ إعدادات أسعار الصرف
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {Object.keys(currentRates).length > 0 && (
        <Card className="admin-card border-0 shadow-none">
          <CardHeader><CardTitle className="text-base">الأسعار الحالية</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(currentRates).map(([key, value]) => (
                <div key={key} className="p-3 rounded-xl bg-muted text-center">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="font-bold">{typeof value === 'number' ? value.toFixed(2) : String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="admin-card border-0 shadow-none">
        <CardHeader><CardTitle className="text-base">تجاوز الأسعار يدويا</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">أدخل قيم الأسعار لتجاوز القيم من API</p>
          {[{key: 'YER_USD', label: 'دولار إلى ريال يمني'}, {key: 'YER_SAR', label: 'ريال سعودي إلى ريال يمني'}].map(({key, label}) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="w-40 text-xs">{label} ({key})</Label>
              <Input type="number" value={manualOverrides[key] || ''} onChange={(e) => setManualOverrides(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))} dir="ltr" className="flex-1" />
            </div>
          ))}
          <Button onClick={handleSaveOverrides} variant="outline" size="sm">حفظ التجاوزات</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── API Provider Form Sub-Component ───────────────────────────────────

interface ApiProviderFormProps {
  editing: ApiProviderConfig | null;
  onSave: (config: ApiProviderConfig) => void;
  onCancel: () => void;
  onTest: (config: Record<string, unknown>) => Promise<ApiTestResult>;
}

function ApiProviderForm({ editing, onSave, onCancel, onTest }: ApiProviderFormProps) {
  const [name, setName] = useState(editing?.name || '');
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl || '');
  const [apiKey, setApiKey] = useState(editing?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(editing?.apiSecret || '');
  const [method, setMethod] = useState<'GET' | 'POST'>(editing?.method || 'POST');
  const [headersText, setHeadersText] = useState(
    editing?.headers ? JSON.stringify(editing.headers, null, 2) : '{}'
  );
  const [bodyTemplate, setBodyTemplate] = useState(editing?.bodyTemplate || '');
  const [responseFormat, setResponseFormat] = useState<'json' | 'xml'>(editing?.responseFormat || 'json');
  const [sectionName, setSectionName] = useState(editing?.sectionName || '');
  const [sectionId, setSectionId] = useState(editing?.sectionId || '');
  const [isActive, setIsActive] = useState(editing?.isActive !== false);

  // Field mappings
  const [statusField, setStatusField] = useState(editing?.fieldMappings?.statusField || '');
  const [successValue, setSuccessValue] = useState(editing?.fieldMappings?.successValue || '');
  const [balanceField, setBalanceField] = useState(editing?.fieldMappings?.balanceField || '');
  const [messageField, setMessageField] = useState(editing?.fieldMappings?.messageField || '');
  const [transactionIdField, setTransactionIdField] = useState(editing?.fieldMappings?.transactionIdField || '');
  const [errorCodeField, setErrorCodeField] = useState(editing?.fieldMappings?.errorCodeField || '');

  // Test result
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Show/hide sections
  const [showMappings, setShowMappings] = useState(!!editing?.fieldMappings);
  const [showAdvanced, setShowAdvanced] = useState(!!editing?.headers && Object.keys(editing.headers).length > 0);

  const handleTest = async () => {
    if (!baseUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      const config = {
        name,
        baseUrl,
        apiKey,
        apiSecret,
        method,
        headers: JSON.parse(headersText || '{}'),
        bodyTemplate,
        responseFormat,
        fieldMappings: (statusField && successValue) ? {
          statusField,
          successValue,
          balanceField: balanceField || undefined,
          messageField: messageField || undefined,
          transactionIdField: transactionIdField || undefined,
          errorCodeField: errorCodeField || undefined,
        } : undefined,
      };
      const result = await onTest(config);
      setTestResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTestResult({
        success: false,
        responseTime: 0,
        availableFields: [],
        error: message,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!name || !baseUrl) return;

    let parsedHeaders: Record<string, string> = {};
    try {
      parsedHeaders = JSON.parse(headersText || '{}');
    } catch {
      parsedHeaders = {};
    }

    const config: ApiProviderConfig = {
      id: editing?.id || generateApiProviderId(),
      name,
      baseUrl,
      apiKey,
      apiSecret: apiSecret || undefined,
      method,
      headers: parsedHeaders,
      bodyTemplate: bodyTemplate || undefined,
      responseFormat,
      fieldMappings: (statusField && successValue) ? {
        statusField,
        successValue,
        balanceField: balanceField || undefined,
        messageField: messageField || undefined,
        transactionIdField: transactionIdField || undefined,
        errorCodeField: errorCodeField || undefined,
      } : undefined,
      syncEnabled: true,
      isActive,
      createdAt: editing?.createdAt || new Date().toISOString(),
      sectionName: sectionName || undefined,
      sectionId: sectionId || name.replace(/\s+/g, '-').toLowerCase(),
      sectionIcon: undefined,
    };

    onSave(config);
  };

  // Auto-fill mapping fields from test result
  const handleAutoFillMapping = (fieldPath: string, target: 'status' | 'balance' | 'message' | 'transactionId' | 'errorCode') => {
    switch (target) {
      case 'status': setStatusField(fieldPath); break;
      case 'balance': setBalanceField(fieldPath); break;
      case 'message': setMessageField(fieldPath); break;
      case 'transactionId': setTransactionIdField(fieldPath); break;
      case 'errorCode': setErrorCodeField(fieldPath); break;
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card className="admin-card border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-500" /> معلومات المزود
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><Label>اسم المزود (عربي)</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مزود الشحن السريع" /></div>
          <div><Label>رابط API الأساسي</Label><Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} dir="ltr" placeholder="https://api.provider.com/v1/charge" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>مفتاح API</Label><Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} dir="ltr" placeholder="sk-xxxxx..." /></div>
            <div><Label>API Secret (اختياري)</Label><Input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} dir="ltr" placeholder="اختياري" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>طريقة الطلب</Label>
              <Select value={method} onValueChange={(v: string) => setMethod(v as 'GET' | 'POST')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>صيغة الاستجابة</Label>
              <Select value={responseFormat} onValueChange={(v: string) => setResponseFormat(v as 'json' | 'xml')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category/Section Info */}
      <Card className="admin-card border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-500" /> قسم الخدمات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">عند إضافة قسم، ستظهر خدمات هذا المزود كقسم جديد في شاشة الخدمات بجانب &quot;خدمات المحفظة الخاصة&quot;</p>
          <div><Label>اسم القسم (عربي)</Label><Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="مثال: خدمات الشحن السريع" /></div>
          <div><Label>معرف القسم</Label><Input value={sectionId} onChange={(e) => setSectionId(e.target.value)} dir="ltr" placeholder="auto-generated أو أدخل يدوياً" /></div>
        </CardContent>
      </Card>

      {/* Request Configuration */}
      <Card className="admin-card border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="w-5 h-5 text-purple-500" /> إعدادات الطلب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Advanced Headers */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-purple-500 hover:text-purple-400"
          >
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Headers مخصصة
          </button>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <Label className="text-xs">Headers (JSON) - مفاتيح وقيم إضافية</Label>
                <Textarea
                  value={headersText}
                  onChange={(e) => setHeadersText(e.target.value)}
                  dir="ltr"
                  rows={4}
                  placeholder='{"X-Custom-Header": "value"}'
                  className="font-mono text-xs"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Body Template */}
          {method === 'POST' && (
            <div>
              <Label>قالب Body (JSON)</Label>
              <p className="text-xs text-muted-foreground mb-1">
                استخدم المتغيرات: {'{{customerId}}'}, {'{{packageId}}'}, {'{{amount}}'}, {'{{currency}}'}, {'{{phone}}'}, {'{{apiKey}}'}, {'{{apiSecret}}'}
              </p>
              <Textarea
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                dir="ltr"
                rows={6}
                placeholder={`{\n  "customer_id": "{{customerId}}",\n  "product_id": "{{packageId}}",\n  "amount": "{{amount}}"\n}`}
                className="font-mono text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test API Button */}
      <Card className="admin-card border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> اختبار الاتصال
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleTest} disabled={testing || !baseUrl} variant="outline" className="w-full border-amber-500/30 hover:bg-amber-500/10">
            {testing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Zap className="w-4 h-4 ml-2" />}
            اختبار API الآن
          </Button>

          {testResult && (
            <div className={`p-4 rounded-xl ${testResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {/* Status Header */}
              <div className="flex items-center gap-2 mb-3">
                {testResult.success ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                <span className="font-bold">{testResult.success ? 'الاتصال ناجح' : 'الاتصال فشل'}</span>
                <Badge variant="outline" className="mr-auto">
                  <Clock className="w-3 h-3 ml-1" /> {testResult.responseTime}ms
                </Badge>
                {testResult.statusCode && (
                  <Badge className={testResult.statusCode < 400 ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                    HTTP {testResult.statusCode}
                  </Badge>
                )}
              </div>

              {/* Error */}
              {testResult.error && (
                <div className="p-2 rounded-lg bg-red-500/10 mb-3">
                  <p className="text-xs text-red-500 font-medium">{testResult.error}</p>
                </div>
              )}

              {/* Mapped Values */}
              {testResult.mappedValues && (
                <div className="mb-3">
                  <p className="text-xs font-semibold mb-2">القيم المستخرجة:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {testResult.mappedValues.status !== undefined && (
                      <div className="p-2 rounded-lg bg-muted">
                        <p className="text-[10px] text-muted-foreground">الحالة</p>
                        <p className="text-xs font-bold">{testResult.mappedValues.status}</p>
                      </div>
                    )}
                    {testResult.mappedValues.balance !== undefined && (
                      <div className="p-2 rounded-lg bg-muted">
                        <p className="text-[10px] text-muted-foreground">الرصيد</p>
                        <p className="text-xs font-bold">{testResult.mappedValues.balance}</p>
                      </div>
                    )}
                    {testResult.mappedValues.message !== undefined && (
                      <div className="p-2 rounded-lg bg-muted">
                        <p className="text-[10px] text-muted-foreground">الرسالة</p>
                        <p className="text-xs font-bold">{testResult.mappedValues.message}</p>
                      </div>
                    )}
                    {testResult.mappedValues.transactionId !== undefined && (
                      <div className="p-2 rounded-lg bg-muted">
                        <p className="text-[10px] text-muted-foreground">رقم المعاملة</p>
                        <p className="text-xs font-bold">{testResult.mappedValues.transactionId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Available Fields */}
              {testResult.availableFields.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold mb-2">الحقول المتاحة في الاستجابة:</p>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {testResult.availableFields.map(field => (
                      <Badge key={field} variant="outline" className="text-[10px] cursor-pointer hover:bg-purple-500/10" title="انقر لتعيين كحقل">
                        {field}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Response */}
              {testResult.rawResponse && (
                <details className="mt-2">
                  <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                    عرض الاستجابة الخام
                  </summary>
                  <pre className="text-[10px] bg-muted p-2 rounded-lg overflow-auto max-h-48 mt-2" dir="ltr">
                    {typeof testResult.parsedResponse === 'object'
                      ? JSON.stringify(testResult.parsedResponse, null, 2)
                      : testResult.rawResponse}
                  </pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card className="admin-card border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-purple-500" /> تعيين الحقول
            </span>
            <button onClick={() => setShowMappings(!showMappings)} className="text-sm text-purple-500">
              {showMappings ? 'إخفاء' : 'إظهار'}
            </button>
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {showMappings && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  عيّن حقول استجابة API إلى حقول التطبيق. انقر على الحقول المتاحة أعلاه لنسخها.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">حقل الحالة *</Label>
                    <Input value={statusField} onChange={(e) => setStatusField(e.target.value)} dir="ltr" placeholder="data.status" />
                  </div>
                  <div>
                    <Label className="text-xs">قيمة النجاح *</Label>
                    <Input value={successValue} onChange={(e) => setSuccessValue(e.target.value)} dir="ltr" placeholder="success أو 200 أو 1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">حقل الرصيد</Label>
                    <Input value={balanceField} onChange={(e) => setBalanceField(e.target.value)} dir="ltr" placeholder="data.balance" />
                  </div>
                  <div>
                    <Label className="text-xs">حقل الرسالة</Label>
                    <Input value={messageField} onChange={(e) => setMessageField(e.target.value)} dir="ltr" placeholder="data.message" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">حقل رقم المعاملة</Label>
                    <Input value={transactionIdField} onChange={(e) => setTransactionIdField(e.target.value)} dir="ltr" placeholder="data.transactionId" />
                  </div>
                  <div>
                    <Label className="text-xs">حقل رمز الخطأ</Label>
                    <Input value={errorCodeField} onChange={(e) => setErrorCodeField(e.target.value)} dir="ltr" placeholder="data.errorCode" />
                  </div>
                </div>

                {/* Quick map from test result */}
                {testResult && testResult.availableFields.length > 0 && (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <p className="text-xs font-semibold mb-2">تعيين سريع من الاستجابة:</p>
                    <div className="space-y-2">
                      {['status', 'balance', 'message', 'transactionId', 'errorCode'].map(target => (
                        <div key={target} className="flex items-center gap-2">
                          <span className="text-xs w-24 text-muted-foreground">{target === 'status' ? 'الحالة' : target === 'balance' ? 'الرصيد' : target === 'message' ? 'الرسالة' : target === 'transactionId' ? 'المعاملة' : 'الخطأ'}</span>
                          <div className="flex flex-wrap gap-1">
                            {testResult.availableFields.slice(0, 10).map(field => (
                              <button
                                key={field}
                                onClick={() => handleAutoFillMapping(field, target as 'status' | 'balance' | 'message' | 'transactionId' | 'errorCode')}
                                className="text-[9px] px-1.5 py-0.5 rounded border border-border hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors"
                              >
                                {field.split('.').pop()}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Active Switch + Actions */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted">
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <div>
            <p className="text-sm font-medium">{isActive ? 'مزود نشط' : 'مزود معطل'}</p>
            <p className="text-xs text-muted-foreground">{isActive ? 'سيتم استخدام هذا المزود للطلبات' : 'لن يتم استخدام هذا المزود'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={!name || !baseUrl} className="flex-1 bg-purple-600 hover:bg-purple-700">
          <Save className="w-4 h-4 ml-2" />
          {editing ? 'تحديث المزود' : 'إضافة المزود'}
        </Button>
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
      </div>
    </div>
  );
}

// ─── Main API Settings Panel ───────────────────────────────────────────

export default function ApiSettingsPanel() {
  const { showToast } = useAdminStore();
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProviderConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load providers from Firebase
  useEffect(() => {
    const providersRef = ref(database, 'adminSettings/apiProviders');
    const unsub = onValue(providersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: ApiProviderConfig[] = Object.values(data).map((p: Record<string, string | boolean | Record<string, string> | undefined>) => ({
          id: String(p.id || ''),
          name: String(p.name || ''),
          baseUrl: String(p.baseUrl || ''),
          apiKey: String(p.apiKey || ''),
          apiSecret: p.apiSecret ? String(p.apiSecret) : undefined,
          method: (p.method === 'GET' ? 'GET' : 'POST') as 'GET' | 'POST',
          headers: (p.headers as Record<string, string>) || {},
          bodyTemplate: p.bodyTemplate ? String(p.bodyTemplate) : undefined,
          responseFormat: (p.responseFormat === 'xml' ? 'xml' : 'json') as 'json' | 'xml',
          fieldMappings: (p.fieldMappings as ApiProviderConfig['fieldMappings']) || undefined,
          syncEnabled: p.syncEnabled !== false,
          isActive: p.isActive !== false,
          createdAt: String(p.createdAt || ''),
          sectionName: p.sectionName ? String(p.sectionName) : undefined,
          sectionId: p.sectionId ? String(p.sectionId) : undefined,
          sectionIcon: p.sectionIcon ? String(p.sectionIcon) : undefined,
        }));
        setProviders(list);
      } else {
        setProviders([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Firebase API providers error:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSaveProvider = async (config: ApiProviderConfig) => {
    try {
      const providerRef = ref(database, `adminSettings/apiProviders/${config.id}`);
      await set(providerRef, config);
      showToast(editingProvider ? 'تم تحديث المزود' : 'تم إضافة المزود', 'success');
      setShowForm(false);
      setEditingProvider(null);

      // If sectionName is set, create the category in Firebase for the services screen
      if (config.sectionName && config.sectionId) {
        const categoryRef = ref(database, `adminSettings/categories/api-${config.sectionId}`);
        const snapshot = await get(categoryRef);
        if (!snapshot.exists()) {
          await set(categoryRef, {
            id: `api-${config.sectionId}`,
            name: config.sectionName,
            type: 'api',
            icon: config.sectionIcon || 'api',
          });
        }
      }
    } catch {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      await remove(ref(database, `adminSettings/apiProviders/${id}`));
      showToast('تم حذف المزود', 'success');
    } catch {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleToggleProvider = async (provider: ApiProviderConfig) => {
    try {
      await update(ref(database, `adminSettings/apiProviders/${provider.id}`), {
        isActive: !provider.isActive,
      });
      showToast(provider.isActive ? 'تم تعطيل المزود' : 'تم تفعيل المزود', 'success');
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleTestApi = async (config: Record<string, unknown>): Promise<ApiTestResult> => {
    return testApiConnection(config as any);
  };

  const filteredProviders = providers.filter(p =>
    !searchQuery || p.name.includes(searchQuery) || p.baseUrl.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إعدادات API</h1>
        <p className="text-muted-foreground text-sm mt-1">تكوين مزودي API وأسعار الصرف</p>
      </div>

      <Tabs defaultValue="providers">
        <TabsList className="w-full">
          <TabsTrigger value="providers" className="flex-1">مزودو API</TabsTrigger>
          <TabsTrigger value="exchange-rate" className="flex-1">أسعار الصرف</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {!showForm ? (
            <>
              {/* Provider List Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث عن مزود..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
                <Button onClick={() => { setEditingProvider(null); setShowForm(true); }} size="sm">
                  <Plus className="w-4 h-4 ml-1" /> مزود جديد
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="admin-card border-0 shadow-none">
                    <CardContent className="p-4 text-center">
                      <Code className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                      <p className="text-2xl font-bold">{providers.length}</p>
                      <p className="text-xs text-muted-foreground">إجمالي المزودين</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="admin-card border-0 shadow-none">
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{providers.filter(p => p.isActive).length}</p>
                      <p className="text-xs text-muted-foreground">مزود نشط</p>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="admin-card border-0 shadow-none">
                    <CardContent className="p-4 text-center">
                      <Layers className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                      <p className="text-2xl font-bold">{providers.filter(p => p.sectionName).length}</p>
                      <p className="text-xs text-muted-foreground">قسم خدمات</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Provider List */}
              {filteredProviders.length === 0 ? (
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-8 text-center">
                    <Wifi className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="font-medium text-muted-foreground">لا يوجد مزودو API</p>
                    <p className="text-xs text-muted-foreground mt-1">أضف مزود API لربط الخدمات تلقائياً</p>
                    <Button onClick={() => { setEditingProvider(null); setShowForm(true); }} size="sm" className="mt-3">
                      <Plus className="w-4 h-4 ml-1" /> إضافة مزود
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin">
                  {filteredProviders.map((provider, i) => (
                    <motion.div key={provider.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <Card className="admin-card border-0 shadow-none">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                                <Code className="w-5 h-5 text-purple-500" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{provider.name}</p>
                                <p className="text-xs text-muted-foreground" dir="ltr">{provider.baseUrl}</p>
                                {provider.sectionName && (
                                  <Badge variant="outline" className="mt-1 text-[10px]">
                                    <Layers className="w-3 h-3 ml-1" /> {provider.sectionName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={provider.isActive ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}>
                                {provider.isActive ? 'نشط' : 'معطل'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {provider.method}
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleProvider(provider)}>
                                <Switch checked={provider.isActive} />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setEditingProvider(provider); setShowForm(true); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteProvider(provider.id)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                          {/* Show field mappings summary */}
                          {provider.fieldMappings && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-[10px] text-muted-foreground mb-1">تعيينات الحقول:</p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-[9px]">
                                  الحالة: {provider.fieldMappings.statusField} = {provider.fieldMappings.successValue}
                                </Badge>
                                {provider.fieldMappings.balanceField && (
                                  <Badge variant="outline" className="text-[9px]">الرصيد: {provider.fieldMappings.balanceField}</Badge>
                                )}
                                {provider.fieldMappings.messageField && (
                                  <Badge variant="outline" className="text-[9px]">الرسالة: {provider.fieldMappings.messageField}</Badge>
                                )}
                                {provider.fieldMappings.transactionIdField && (
                                  <Badge variant="outline" className="text-[9px]">المعاملة: {provider.fieldMappings.transactionIdField}</Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <ApiProviderForm
              editing={editingProvider}
              onSave={handleSaveProvider}
              onCancel={() => { setShowForm(false); setEditingProvider(null); }}
              onTest={handleTestApi}
            />
          )}
        </TabsContent>

        <TabsContent value="exchange-rate">
          <ExchangeRateSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
