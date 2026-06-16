'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  Key,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Package,
  FolderOpen,
  Settings,
  ArrowUpDown,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import {
  testG2BulkConnection,
  saveG2BulkApiKey,
  getG2BulkSettings,
  updateG2BulkSettings,
  syncG2BulkCategories,
  syncG2BulkProducts,
  fullG2BulkSync,
  getG2BulkCategoriesFromFirebase,
  getG2BulkProductsFromFirebase,
  updateG2BulkCategory,
  updateG2BulkProduct,
  checkG2BulkBalance,
  checkG2BulkOrderStatus,
  type G2BulkCategory,
  type G2BulkProduct,
} from '@/lib/g2bulk';
import { onValue, ref } from 'firebase/database';
import { database } from '@/lib/firebase';

export default function G2BulkPanel() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    balance?: number;
    username?: string;
    error?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(0);
  const [lastSync, setLastSync] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [categories, setCategories] = useState<Record<string, G2BulkCategory>>({});
  const [products, setProducts] = useState<Record<string, G2BulkProduct>>({});
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const settingsRef = ref(database, 'adminSettings/g2bulk');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setApiKey(data.apiKey || '');
        setEnabled(data.enabled || false);
        setAutoSync(data.autoSync || false);
        setMarkupPercent(data.markupPercent || 0);
        setLastSync(data.lastSync || '');
        setCategories(data.categories || {});
        setProducts(data.products || {});
      }
      setLoading(false);
    });

    return () => {
      // Firebase onValue doesn't return a standard unsubscribe function
      // but we should clean up
    };
  }, []);

  // Test API connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testG2BulkConnection(apiKey);
      setTestResult(result);
      if (result.success && result.balance !== undefined) {
        setBalance(result.balance);
      }
    } catch (error: unknown) {
      setTestResult({ success: false, error: (error as Error).message });
    }
    setTesting(false);
  };

  // Save API key
  const handleSaveApiKey = async () => {
    setSaving(true);
    try {
      await saveG2BulkApiKey(apiKey);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
    setSaving(false);
  };

  // Save general settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateG2BulkSettings({ enabled, autoSync, markupPercent });
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    setSaving(false);
  };

  // Sync categories
  const handleSyncCategories = async () => {
    setSyncing(true);
    try {
      await syncG2BulkCategories();
    } catch (error) {
      console.error('Failed to sync categories:', error);
    }
    setSyncing(false);
  };

  // Sync products
  const handleSyncProducts = async () => {
    setSyncing(true);
    try {
      await syncG2BulkProducts();
    } catch (error) {
      console.error('Failed to sync products:', error);
    }
    setSyncing(false);
  };

  // Full sync
  const handleFullSync = async () => {
    setSyncing(true);
    try {
      await fullG2BulkSync();
    } catch (error) {
      console.error('Failed to full sync:', error);
    }
    setSyncing(false);
  };

  // Check balance
  const handleCheckBalance = async () => {
    try {
      const result = await checkG2BulkBalance();
      if (result.success) {
        setBalance(result.balance);
      }
    } catch (error) {
      console.error('Failed to check balance:', error);
    }
  };

  // Toggle category enabled
  const handleToggleCategory = async (catId: string, enabled: boolean) => {
    try {
      await updateG2BulkCategory(Number(catId), { enabled });
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  // Map category to section
  const handleMapCategory = async (catId: string, mappedToSection: string) => {
    try {
      await updateG2BulkCategory(Number(catId), { mappedToSection });
    } catch (error) {
      console.error('Failed to map category:', error);
    }
  };

  // Toggle product enabled
  const handleToggleProduct = async (prodId: string, enabled: boolean) => {
    try {
      await updateG2BulkProduct(Number(prodId), { enabled });
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  // Update product markup
  const handleProductMarkup = async (prodId: string, markupPercent: number) => {
    try {
      await updateG2BulkProduct(Number(prodId), { markupPercent });
    } catch (error) {
      console.error('Failed to update product markup:', error);
    }
  };

  const sectionOptions = [
    { value: '', label: 'غير محدد' },
    { value: 'telecom', label: 'الاتصالات' },
    { value: 'entertainment', label: 'الخدمات الترفيهية' },
    { value: 'games', label: 'الألعاب' },
    { value: 'gift-cards', label: 'بطاقات الهدايا' },
    { value: 'digital-wallets', label: 'المحافظ الرقمية' },
    { value: 'usdt', label: 'شراء USDT' },
    { value: 'investment', label: 'الاستثمار' },
  ];

  const categoriesList = Object.values(categories);
  const productsList = Object.values(products);
  const enabledProductsCount = productsList.filter((p) => p.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Globe className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">مزود G2Bulk</h2>
            <p className="text-sm text-muted-foreground">
              إدارة مزود الخدمات G2Bulk والمزامنة مع الأقسام
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={enabled ? 'default' : 'secondary'} className={enabled ? 'bg-green-600' : ''}>
            {enabled ? 'مفعّل' : 'معطّل'}
          </Badge>
          {balance !== null && (
            <Badge variant="outline" className="text-blue-400 border-blue-500/30">
              <DollarSign className="w-3 h-3 ml-1" />
              رصيد: ${balance.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 ml-1" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderOpen className="w-4 h-4 ml-1" />
            الأقسام ({categoriesList.length})
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 ml-1" />
            المنتجات ({enabledProductsCount}/{productsList.length})
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="w-4 h-4 ml-1" />
            المزامنة
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {/* API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-500" />
                مفتاح API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="أدخل مفتاح G2Bulk API"
                    className="pl-10"
                    dir="ltr"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button onClick={handleSaveApiKey} disabled={saving || !apiKey}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testing || !apiKey}
                  className="flex-1"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 ml-2" />
                  )}
                  اختبار الاتصال
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCheckBalance}
                  disabled={!apiKey}
                >
                  <DollarSign className="w-4 h-4 ml-2" />
                  فحص الرصيد
                </Button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {testResult.success
                        ? `متصل بنجاح - المستخدم: ${testResult.username}`
                        : `فشل الاتصال: ${testResult.error}`}
                    </p>
                    {testResult.balance !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        الرصيد: ${testResult.balance.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                الإعدادات العامة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>تفعيل مزود G2Bulk</Label>
                  <p className="text-xs text-muted-foreground">
                    تفعيل أو تعطيل مزود G2Bulk في تطبيق المستخدم
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>مزامنة تلقائية</Label>
                  <p className="text-xs text-muted-foreground">
                    مزامنة المنتجات والأقسام تلقائياً
                  </p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>

              <div className="space-y-2">
                <Label>نسبة الهامش الافتراضي (%)</Label>
                <p className="text-xs text-muted-foreground">
                  نسبة الزيادة على سعر المنتج عند البيع للمستخدم
                </p>
                <Input
                  type="number"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={1}
                  dir="ltr"
                />
              </div>

              <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                حفظ الإعدادات
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-orange-400" />
                  الأقسام المتاحة
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncCategories}
                  disabled={syncing || !apiKey}
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {categoriesList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>لا توجد أقسام. قم بالمزامنة أولاً.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoriesList.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={cat.enabled !== false}
                          onCheckedChange={(checked) =>
                            handleToggleCategory(String(cat.id), checked)
                          }
                        />
                        <div>
                          <p className="text-sm font-medium">{cat.title}</p>
                          <p className="text-xs text-muted-foreground">ID: {cat.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={cat.mappedToSection || ''}
                          onChange={(e) =>
                            handleMapCategory(String(cat.id), e.target.value)
                          }
                          className="text-xs bg-background border border-border rounded px-2 py-1"
                          dir="rtl"
                        >
                          {sectionOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  المنتجات ({enabledProductsCount}/{productsList.length})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncProducts}
                  disabled={syncing || !apiKey}
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>لا توجد منتجات. قم بالمزامنة أولاً.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {productsList.map((prod) => {
                    const finalPrice =
                      prod.customPrice > 0
                        ? prod.customPrice
                        : prod.unit_price * (1 + (prod.markupPercent || markupPercent) / 100);
                    return (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={prod.enabled !== false}
                            onCheckedChange={(checked) =>
                              handleToggleProduct(String(prod.id), checked)
                            }
                          />
                          <div>
                            <p className="text-sm font-medium">{prod.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                ${prod.unit_price.toFixed(2)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">→</span>
                              <Badge className="text-xs bg-green-600/20 text-green-400 border-green-500/30">
                                ${finalPrice.toFixed(2)}
                              </Badge>
                              {prod.stock > 0 ? (
                                <Badge variant="outline" className="text-xs text-blue-400">
                                  مخزون: {prod.stock}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-red-400">
                                  نفذ
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Label className="text-xs text-muted-foreground">هامش:</Label>
                            <Input
                              type="number"
                              value={prod.markupPercent || 0}
                              onChange={(e) =>
                                handleProductMarkup(String(prod.id), Number(e.target.value))
                              }
                              className="w-16 h-7 text-xs text-center"
                              min={0}
                              max={500}
                              dir="ltr"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                المزامنة مع G2Bulk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastSync && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground">
                    آخر مزامنة: {new Date(lastSync).toLocaleString('ar')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={handleSyncCategories}
                  disabled={syncing || !apiKey}
                  className="h-auto py-4 flex-col gap-2"
                >
                  <FolderOpen className="w-6 h-6 text-orange-400" />
                  <span className="text-sm">مزامنة الأقسام</span>
                  <span className="text-xs text-muted-foreground">
                    {categoriesList.length} قسم
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSyncProducts}
                  disabled={syncing || !apiKey}
                  className="h-auto py-4 flex-col gap-2"
                >
                  <Package className="w-6 h-6 text-purple-400" />
                  <span className="text-sm">مزامنة المنتجات</span>
                  <span className="text-xs text-muted-foreground">
                    {productsList.length} منتج
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleFullSync}
                  disabled={syncing || !apiKey}
                  className="h-auto py-4 flex-col gap-2"
                >
                  <ArrowUpDown className="w-6 h-6 text-cyan-400" />
                  <span className="text-sm">مزامنة كاملة</span>
                  <span className="text-xs text-muted-foreground">أقسام + منتجات</span>
                </Button>
              </div>

              {syncing && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span className="text-sm text-muted-foreground">جارٍ المزامنة...</span>
                </div>
              )}

              {!apiKey && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <p className="text-sm text-yellow-600">
                    يرجى إدخال مفتاح API وحفظه أولاً قبل المزامنة
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <FolderOpen className="w-6 h-6 mx-auto mb-1 text-orange-400" />
                <p className="text-2xl font-bold">{categoriesList.length}</p>
                <p className="text-xs text-muted-foreground">قسم</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                <p className="text-2xl font-bold">{productsList.length}</p>
                <p className="text-xs text-muted-foreground">منتج</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-400" />
                <p className="text-2xl font-bold">{enabledProductsCount}</p>
                <p className="text-xs text-muted-foreground">مفعّل</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                <p className="text-2xl font-bold">
                  {balance !== null ? `$${balance.toFixed(2)}` : '-'}
                </p>
                <p className="text-xs text-muted-foreground">رصيد G2Bulk</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
