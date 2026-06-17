'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminHelpBox } from '@/components/admin/admin-help-box';
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
import { onValue, ref } from '@/lib/db-compat';
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

  // Sync categories — uses Supabase directly (same path as the user app)
  // so admins and users see the exact same data.
  const handleSyncCategories = async () => {
    setSyncing(true);
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      const { testG2BulkConnection, saveG2BulkApiKey, getG2BulkSettings } = await import('@/lib/g2bulk');
      const settings = await getG2BulkSettings();
      if (!settings?.apiKey) throw new Error('G2Bulk API key not configured');

      // Build a minimal ApiProvider-shaped object for the API call helper
      const provider = {
        id: 'g2bulk',
        name: 'G2Bulk',
        baseUrl: 'https://api.g2bulk.com/v1/',
        apiKey: settings.apiKey,
        authHeaderName: 'X-API-Key',
        markupPercent: settings.markupPercent ?? 16,
      };

      // Fetch categories from G2Bulk /v1/category
      const res = await fetch(`${provider.baseUrl}category`, {
        headers: { [provider.authHeaderName]: provider.apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { categories } = await res.json();
      let inserted = 0;
      for (const cat of categories || []) {
        const { error } = await supabaseAdmin.from('api_categories').upsert({
          api_provider_id: 'g2bulk',
          api_category_id: String(cat.id),
          title: cat.title || `Category ${cat.id}`,
          title_en: cat.title || `Category ${cat.id}`,
          description: cat.description || '',
          image_url: cat.image_url || '',
          product_count: cat.product_count || 0,
          is_active: true,
          is_synced: true,
          last_synced_at: new Date().toISOString(),
          section_id: 'digital',
        }, { onConflict: 'api_provider_id,api_category_id' });
        if (!error) inserted++;
      }
      // Update last_sync_at
      await supabaseAdmin.from('api_providers').update({ last_sync_at: new Date().toISOString() }).eq('id', 'g2bulk');
      showToast?.(`تمت مزامنة ${inserted} قسم`, 'success');
    } catch (error: any) {
      console.error('Failed to sync categories:', error);
      showToast?.('فشل المزامنة: ' + error.message, 'error');
    }
    setSyncing(false);
  };

  // Sync products — writes to service_providers + product_packages + api_products
  // (Supabase, not Firebase). Products are routed into the "digital" section so
  // they appear under "الخدمات الرقمية" on the user's home screen.
  const handleSyncProducts = async () => {
    setSyncing(true);
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      const { getG2BulkSettings } = await import('@/lib/g2bulk');
      const settings = await getG2BulkSettings();
      if (!settings?.apiKey) throw new Error('G2Bulk API key not configured');

      const baseUrl = 'https://api.g2bulk.com/v1/';
      const apiKey = settings.apiKey;
      const headers = { 'X-API-Key': apiKey };

      // Fetch products + games in parallel. G2Bulk /v1/products does NOT return
      // image_url, but /v1/games does — so we build a category_id→image_url map
      // from the games endpoint and fall back to a category-title-based icon
      // for non-game categories.
      const [prodRes, gamesRes, catRes] = await Promise.all([
        fetch(`${baseUrl}products`, { headers }),
        fetch(`${baseUrl}games`, { headers }),
        fetch(`${baseUrl}category`, { headers }),
      ]);
      if (!prodRes.ok) throw new Error(`HTTP ${prodRes.status}`);
      const { products } = await prodRes.json();
      const gamesData = gamesRes.ok ? (await gamesRes.json()).games : [];
      const catsData = catRes.ok ? (await catRes.json()).categories : [];

      // Build category lookup: id → { title, image_url }
      const catMap: Record<string, any> = {};
      for (const c of catsData) catMap[String(c.id)] = c;
      // Games endpoint returns image_url — use it as a fallback for any category
      // that matches a game's `name`.
      const gameImageMap: Record<string, string> = {};
      for (const g of gamesData) {
        if (g.image_url) {
          gameImageMap[(g.name || '').toLowerCase()] = g.image_url;
        }
      }

      const markupPercent = settings.markupPercent ?? 16;
      let inserted = 0, errors = 0;
      for (const prod of products || []) {
        try {
          // Generate a deterministic id (TEXT PK, no default)
          const newId = `g2bulk-prod-g2bulk-${prod.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);

          // Pick the best available image for this product:
          // 1) prod.image_url (rare, G2Bulk usually omits it)
          // 2) category's image_url (from /v1/category)
          // 3) game image_url if the category title matches a game name
          // 4) empty string (the UI will fall back to the category icon)
          const cat = catMap[String(prod.category_id)] || {};
          const catTitle = (cat.title || prod.category_title || '').toLowerCase();
          let imageUrl = prod.image_url || cat.image_url || '';
          if (!imageUrl && catTitle) {
            // Try exact match
            if (gameImageMap[catTitle]) imageUrl = gameImageMap[catTitle];
            // Try partial match (e.g. "pubg" in "Pubg Mobile UC")
            else {
              for (const [gameName, url] of Object.entries(gameImageMap)) {
                if (catTitle.includes(gameName) || gameName.includes(catTitle)) {
                  imageUrl = url;
                  break;
                }
              }
            }
          }

          // 1) service_providers — store image_url so the user app can render it
          const { error: spError } = await supabaseAdmin.from('service_providers').upsert({
            id: newId,
            name: prod.title || `منتج ${prod.id}`,
            name_en: prod.title || `Product ${prod.id}`,
            description: prod.description || '',
            section_id: 'digital',          // "الخدمات الرقمية"
            sub_section_id: null,
            api_product_id: String(prod.id),
            api_provider_id: 'g2bulk',
            icon: imageUrl ? '' : 'package',  // use text icon only if no image
            image_url: imageUrl,               // ← store the actual image
            color: '#8B5CF6',
            is_active: true,
            sort_order: prod.id,
            execution_type: 'api',
          }, { onConflict: 'id' });
          if (spError) { errors++; continue; }

          // 2) product_packages — apply markup (USD only)
          const pkgId = `g2bulk-pkg-g2bulk-${prod.id}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
          const costPrice = Number(prod.unit_price) || 0;
          const finalPriceUsd = Number((costPrice * (1 + markupPercent / 100)).toFixed(2));
          const { error: pkgError } = await supabaseAdmin.from('product_packages').upsert({
            id: pkgId,
            provider_id: newId,
            name: prod.title || `منتج ${prod.id}`,
            name_en: prod.title || `Product ${prod.id}`,
            description: prod.description || '',
            price_usd: finalPriceUsd,
            price_yer: 0,
            price_sar: 0,
            cost_price: costPrice,
            cost_currency: 'USD',
            commission_amount: Number((finalPriceUsd - costPrice).toFixed(2)),
            commission_type: 'percentage',
            execution_type: 'api',
            api_product_id: String(prod.id),
            is_active: true,
          }, { onConflict: 'id' });
          if (pkgError) { errors++; continue; }

          // 3) api_products — mirror with image_url
          const { error: apiProdError } = await supabaseAdmin.from('api_products').upsert({
            api_provider_id: 'g2bulk',
            api_category_id: String(prod.category_id),
            api_product_id: String(prod.id),
            name: prod.title || `Product ${prod.id}`,
            name_en: prod.title || `Product ${prod.id}`,
            description: prod.description || '',
            price: costPrice,
            currency: 'USD',
            image_url: imageUrl,
            is_active: true,
            is_synced: true,
            last_synced_at: new Date().toISOString(),
            provider_id: newId,
            package_id: pkgId,
            product_data: prod,
          }, { onConflict: 'api_provider_id,api_product_id' });
          if (apiProdError) { errors++; continue; }

          inserted++;
        } catch (e) {
          errors++;
        }
      }
      await supabaseAdmin.from('api_providers').update({ last_sync_at: new Date().toISOString() }).eq('id', 'g2bulk');
      showToast?.(`تمت مزامنة ${inserted} منتج (${errors} أخطاء)`, errors > 0 ? 'warning' : 'success');
    } catch (error: any) {
      console.error('Failed to sync products:', error);
      showToast?.('فشل المزامنة: ' + error.message, 'error');
    }
    setSyncing(false);
  };

  // Full sync = categories + products + balance refresh
  const handleFullSync = async () => {
    setSyncing(true);
    try {
      await handleSyncCategories();
      await handleSyncProducts();
      // Refresh balance
      const { supabaseAdmin } = await import('@/lib/supabase');
      const balRes = await fetch('https://api.g2bulk.com/v1/getMe', {
        headers: { 'X-API-Key': (await import('@/lib/g2bulk')).getG2BulkSettings ? (await (await import('@/lib/g2bulk')).getG2BulkSettings())?.apiKey : '' },
      });
      if (balRes.ok) {
        const me = await balRes.json();
        await supabaseAdmin.from('api_providers').update({
          balance: me.balance || 0,
          balance_currency: 'USD',
          last_balance_check: new Date().toISOString(),
        }).eq('id', 'g2bulk');
      }
    } catch (error: any) {
      console.error('Failed full sync:', error);
      showToast?.('فشل المزامنة الكاملة: ' + error.message, 'error');
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
      <AdminHelpBox
        title="كيفية استخدام لوحة G2Bulk"
        intro="G2Bulk هو مزود رئيسي للشحن والألعاب والباقات. هذه اللوحة مخصصة لإدارة التكامل معه بشكل تفصيلي."
        steps={[
          { title: 'إعداد API Key', description: 'في "إعدادات API" أدخل مفتاح G2Bulk. اختبر الاتصال بضغط "اختبار" — يجب أن يعيد رصيد حسابك.' },
          { title: 'مزامنة المنتجات', description: 'اضغط "مزامنة" لجلب كل المنتجات والتصنيفات والألعاب. قد تستغرق المزامنة 1-3 دقائق.' },
          { title: 'مراقبة الرصيد', description: 'الرصيد الحالي يظهر في الأعلى. اضغط "تحديث" لجلب آخر قيمة. التنبيه يظهر عند الانخفاض عن 50$.' },
          { title: 'سجل الطلبات', description: 'كل طلبات G2Bulk تُسجَّل مع رقم الطلب، الحالة، التكلفة. يمكنك إعادة المحاولة للطلبات الفاشلة.' },
        ]}
        tips={[
          'أضف رصيداً كافياً في حساب G2Bulk لتجنب فشل الطلبات في أوقات الذروة.',
          'فعّل المزامنة التلقائية يومياً للحصول على المنتجات والأسعار الجديدة.',
          'تواصل مع دعم G2Bulk مباشرة لأي مشكلة في الطلبات الكبيرة.',
        ]}
      />
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
