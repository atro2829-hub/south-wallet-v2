'use client';

// =====================================================================
// G2BulkPanel — لوحة تحكم G2Bulk الكاملة (مُعاد كتابتها)
// South Wallet Admin — لا يستخدم Firebase إطلاقاً، يعتمد Supabase فقط.
// =====================================================================
// Tabs:
//   1) الإعدادات  — مفتاح API، اختبار الاتصال، عرض الرصيد
//   2) المزامنة  — مزامنة الفئات + المنتجات + الألعاب مع تتبع مباشر
//   3) الألعاب   — تصفح الألعاب المُزامَنة (api_games) مع صورها وأيقوناتها
//   4) الاختبار  — تجربة checkPlayerId + استعراض الباقات + تجربة placeOrder
// =====================================================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Globe, Key, RefreshCw, CheckCircle, XCircle, Loader2, DollarSign,
  Package, FolderOpen, Settings, Eye, EyeOff, Save, AlertTriangle,
  ShoppingCart, Gamepad2, Search, Play, Phone, User, Database, Zap,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import {
  type ApiProvider, type ApiGame, type ApiGameCatalogue, type ApiGameFields,
  getG2BulkBalance, syncG2BulkCategories, syncG2BulkProducts, syncG2BulkGames,
  fullG2BulkSync, getGameFields, getGameCatalogue, checkPlayerId,
  placeGameOrder, checkGameOrderStatus, getApiProvider,
} from '@/lib/api-providers';

// ---------- helper: small toast since admin store isn't always wired up --
function useLocalToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const show = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return { toast, show };
}

// ---------- main component ----------
export default function G2BulkPanel() {
  const [activeTab, setActiveTab] = useState('settings');
  const [provider, setProvider] = useState<ApiProvider | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings tab state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; balance?: number; username?: string; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(10);

  // Sync tab state
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<Array<{ time: string; msg: string; type: 'info' | 'success' | 'error' }>>([]);
  const [syncStats, setSyncStats] = useState<{ categories: number; products: number; games: number }>({ categories: 0, products: 0, games: 0 });

  // Games browse tab state
  const [games, setGames] = useState<ApiGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Test tab state
  const [selectedGame, setSelectedGame] = useState<ApiGame | null>(null);
  const [gameFields, setGameFields] = useState<ApiGameFields | null>(null);
  const [catalogue, setCatalogue] = useState<ApiGameCatalogue[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [serverId, setServerId] = useState('');
  const [playerVerify, setPlayerVerify] = useState<{ valid: boolean; name?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const { toast, show } = useLocalToast();

  const appendLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setSyncLog(prev => [...prev.slice(-100), { time: new Date().toLocaleTimeString('ar-EG'), msg, type }]);
  };

  // Load provider on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await getApiProvider('g2bulk');
        if (p) {
          setProvider(p);
          setApiKey(p.apiKey);
          setMarkupPercent(p.markupPercent || 10);
        }
      } catch (e) {
        console.error('Failed to load G2Bulk provider:', e);
      }
      setLoading(false);
    })();
  }, []);

  // ---------- Settings handlers ----------
  const handleTestConnection = async () => {
    if (!provider) return;
    setTesting(true);
    setTestResult(null);
    try {
      const balance = await getG2BulkBalance(provider);
      setTestResult({
        success: balance.success,
        balance: balance.balance,
        username: balance.username,
        error: balance.success ? undefined : 'تعذّر جلب الرصيد',
      });
      if (balance.success) {
        show('تم الاتصال بنجاح ✓', 'success');
      } else {
        show('فشل الاتصال بـ G2Bulk', 'error');
      }
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
      show('فشل الاتصال: ' + error.message, 'error');
    }
    setTesting(false);
  };

  const handleSaveSettings = async () => {
    if (!provider) return;
    setSaving(true);
    try {
      const { error } = await supabaseAdmin
        .from('api_providers')
        .update({
          api_key: apiKey,
          default_commission: markupPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'g2bulk');
      if (error) throw error;
      // Refresh the local provider object
      const updated = await getApiProvider('g2bulk');
      if (updated) setProvider(updated);
      show('تم حفظ الإعدادات بنجاح', 'success');
    } catch (error: any) {
      show('فشل الحفظ: ' + error.message, 'error');
    }
    setSaving(false);
  };

  // ---------- Sync handlers ----------
  const runSync = async (kind: 'categories' | 'products' | 'games' | 'all') => {
    if (!provider) return;
    setSyncing(true);
    setSyncLog([]);
    appendLog(`بدء المزامنة (${kind})...`, 'info');
    try {
      if (kind === 'all') {
        const result = await fullG2BulkSync(provider);
        setSyncStats(result);
        appendLog(`اكتملت المزامنة الكاملة: ${result.categories} فئة، ${result.products} منتج، ${result.games} لعبة`, 'success');
        show(`تمت المزامنة: ${result.categories} فئة / ${result.products} منتج / ${result.games} لعبة`, 'success');
      } else {
        let count = 0;
        if (kind === 'categories') {
          const cats = await syncG2BulkCategories(provider);
          count = cats.length;
          setSyncStats(s => ({ ...s, categories: count }));
        } else if (kind === 'products') {
          const prods = await syncG2BulkProducts(provider);
          count = prods.length;
          setSyncStats(s => ({ ...s, products: count }));
        } else if (kind === 'games') {
          const games = await syncG2BulkGames(provider);
          count = games.length;
          setSyncStats(s => ({ ...s, games: count }));
        }
        appendLog(`اكتملت مزامنة ${kind}: ${count} عنصر`, 'success');
        show(`تمت مزامنة ${count} ${kind === 'games' ? 'لعبة' : kind === 'products' ? 'منتج' : 'فئة'}`, 'success');
      }
    } catch (error: any) {
      appendLog(`فشل المزامنة: ${error.message}`, 'error');
      show('فشل المزامنة: ' + error.message, 'error');
    }
    setSyncing(false);
  };

  // ---------- Games browse handlers ----------
  const loadGames = useCallback(async () => {
    setGamesLoading(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('api_games')
        .select('*')
        .eq('api_provider_id', 'g2bulk')
        .eq('is_active', true)
        .order('sort_order')
        .limit(200);
      if (error) throw error;
      const mapped: ApiGame[] = (data || []).map(g => ({
        id: Number(g.id.split('-').pop() || 0),
        code: g.game_code,
        name: g.name,
        name_ar: g.name_ar || g.name,
        image_url: g.image_url || '',
        banner_url: g.banner_url || g.image_url || '',
        description: g.description || '',
        provider_id: 'g2bulk',
        enabled: g.is_active,
        is_featured: g.is_featured,
        tags: g.tags || [],
      }));
      setGames(mapped);
    } catch (error: any) {
      show('فشل تحميل الألعاب: ' + error.message, 'error');
    }
    setGamesLoading(false);
  }, [show]);

  useEffect(() => {
    if (activeTab === 'games' && games.length === 0) loadGames();
  }, [activeTab, games.length, loadGames]);

  // ---------- Test tab handlers ----------
  const handleSelectGameForTest = async (game: ApiGame) => {
    setSelectedGame(game);
    setGameFields(null);
    setCatalogue([]);
    setPlayerId('');
    setServerId('');
    setPlayerVerify(null);
    setOrderResult(null);
    if (!provider) return;
    try {
      const [fields, cat] = await Promise.all([
        getGameFields(provider, game.code),
        getGameCatalogue(provider, game.code),
      ]);
      setGameFields(fields);
      setCatalogue(cat);
      show(`تم تحميل ${cat.length} باقة للعبة ${game.name}`, 'success');
    } catch (error: any) {
      show('فشل تحميل بيانات اللعبة: ' + error.message, 'error');
    }
  };

  const handleVerifyPlayer = async () => {
    if (!provider || !selectedGame || !playerId) return;
    setVerifying(true);
    setPlayerVerify(null);
    try {
      const result = await checkPlayerId(provider, selectedGame.code, playerId, serverId || undefined);
      setPlayerVerify({ valid: result.valid, name: result.name });
      if (result.valid) {
        show(`✓ اسم اللاعب: ${result.name}`, 'success');
      } else {
        show('✗ معرف غير صالح', 'error');
      }
    } catch (error: any) {
      setPlayerVerify({ valid: false });
      show('فشل التحقق: ' + error.message, 'error');
    }
    setVerifying(false);
  };

  const handleTestOrder = async (catalogue: ApiGameCatalogue) => {
    if (!provider || !selectedGame || !playerId) return;
    if (!playerVerify?.valid) {
      show('يجب التحقق من معرف اللاعب أولاً', 'error');
      return;
    }
    setOrdering(true);
    setOrderResult(null);
    try {
      const result = await placeGameOrder(
        provider,
        selectedGame.code,
        catalogue.name,
        playerId,
        serverId || undefined,
      );
      setOrderResult(result);
      if (result.success) {
        show(`✓ تم إنشاء الطلب #${result.order.order_id}`, 'success');
        // Poll for status
        const poll = async (attempt = 0) => {
          if (attempt > 12) return;
          try {
            const status = await checkGameOrderStatus(provider, result.order.order_id, selectedGame.code);
            setOrderResult((prev: any) => ({ ...prev, _status: status }));
            if (status.status === 'PENDING' || status.status === 'PROCESSING') {
              setTimeout(() => poll(attempt + 1), 5000);
            }
          } catch {}
        };
        setTimeout(() => poll(), 5000);
      } else {
        show('✗ فشل الطلب: ' + result.message, 'error');
      }
    } catch (error: any) {
      setOrderResult({ success: false, message: error.message });
      show('فشل الطلب: ' + error.message, 'error');
    }
    setOrdering(false);
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm ${
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'error' ? 'bg-red-600 text-white' :
          'bg-blue-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            لوحة تحكم G2Bulk
            <Badge variant="outline" className="mr-2">المزود الافتراضي</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" /> الإعدادات
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> المزامنة
          </TabsTrigger>
          <TabsTrigger value="games" className="flex items-center gap-1">
            <Gamepad2 className="h-4 w-4" /> الألعاب
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-1">
            <Play className="h-4 w-4" /> الاختبار
          </TabsTrigger>
        </TabsList>

        {/* ===== Settings tab ===== */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" /> مفتاح API
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="api-key">مفتاح G2Bulk API</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="أدخل مفتاح API من G2Bulk"
                    dir="ltr"
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="markup">نسبة الربح (%)</Label>
                <Input
                  id="markup"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={markupPercent}
                  onChange={e => setMarkupPercent(Number(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  تُضاف هذه النسبة إلى سعر تكلفة كل منتج/باقة لتحديد سعر البيع للمستخدم.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
                  حفظ الإعدادات
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={testing || !apiKey}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Zap className="h-4 w-4 ml-2" />}
                  اختبار الاتصال
                </Button>
              </div>
            </CardContent>
          </Card>

          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {testResult.success ? (
                    <><CheckCircle className="h-4 w-4 text-green-600" /> تم الاتصال بنجاح</>
                  ) : (
                    <><XCircle className="h-4 w-4 text-red-600" /> فشل الاتصال</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResult.success ? (
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      المستخدم: <span className="font-mono">{testResult.username || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      الرصيد: <span className="font-mono font-bold text-green-600">${testResult.balance?.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">{testResult.error}</div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">معلومات المزود</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>الاسم: <span className="font-mono">{provider?.name || 'G2Bulk'}</span></div>
              <div>الرابط: <span className="font-mono" dir="ltr">{provider?.baseUrl || 'https://api.g2bulk.com'}</span></div>
              <div>آخر مزامنة: <span className="font-mono">{provider?.lastSync ? new Date(provider.lastSync).toLocaleString('ar-EG') : '—'}</span></div>
              <div>الحالة: {provider?.enabled ? <Badge className="bg-green-100 text-green-700">مُفعّل</Badge> : <Badge variant="secondary">معطّل</Badge>}</div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Sync tab ===== */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">مزامنة البيانات من G2Bulk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{syncStats.categories}</div>
                  <div className="text-xs text-muted-foreground">فئة</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{syncStats.products}</div>
                  <div className="text-xs text-muted-foreground">منتج</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{syncStats.games}</div>
                  <div className="text-xs text-muted-foreground">لعبة</div>
                </div>
                <div className="rounded-lg border p-3 bg-amber-50">
                  <div className="text-xs text-muted-foreground">آخر مزامنة</div>
                  <div className="text-xs font-mono">{provider?.lastSync ? new Date(provider.lastSync).toLocaleString('ar-EG') : '—'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => runSync('categories')} disabled={syncing} variant="outline">
                  <FolderOpen className="h-4 w-4 ml-2" /> مزامنة الفئات
                </Button>
                <Button onClick={() => runSync('products')} disabled={syncing} variant="outline">
                  <Package className="h-4 w-4 ml-2" /> مزامنة المنتجات
                </Button>
                <Button onClick={() => runSync('games')} disabled={syncing} variant="outline">
                  <Gamepad2 className="h-4 w-4 ml-2" /> مزامنة الألعاب
                </Button>
                <Button onClick={() => runSync('all')} disabled={syncing}>
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <RefreshCw className="h-4 w-4 ml-2" />}
                  مزامنة شاملة
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <strong>ملاحظة:</strong> المزامنة الشاملة تجلب الفئات والمنتجات والألعاب بالتوازي.
                الفئات تُنشأ كـ sub-sections تحت القسم الرئيسي <code className="bg-white px-1">g2bulk-root</code>،
                والألعاب تُخزَّن في جدول <code className="bg-white px-1">api_games</code> وتظهر تحت قسم
                <code className="bg-white px-1">الألعاب</code>.
              </div>
            </CardContent>
          </Card>

          {syncLog.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" /> سجل المزامنة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full rounded border p-3 bg-slate-50">
                  <div className="space-y-1 font-mono text-xs">
                    {syncLog.map((entry, i) => (
                      <div key={i} className={
                        entry.type === 'success' ? 'text-green-700' :
                        entry.type === 'error' ? 'text-red-700' : 'text-slate-700'
                      }>
                        <span className="text-slate-400">[{entry.time}]</span> {entry.msg}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Games browse tab ===== */}
        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" /> الألعاب المُزامَنة ({games.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="ابحث عن لعبة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" onClick={loadGames} disabled={gamesLoading}>
                  {gamesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>

              {gamesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : games.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gamepad2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  لا توجد ألعاب مُزامَنة. اضغط على "مزامنة الألعاب" من تبويب المزامنة.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {games
                    .filter(g => !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.code.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(game => {
                      const imgUrl = game.image_url && game.image_url.startsWith('http')
                        ? game.image_url
                        : game.image_url
                          ? `https://api.g2bulk.com${game.image_url}`
                          : '';
                      return (
                        <button
                          key={game.code}
                          onClick={() => { setActiveTab('test'); handleSelectGameForTest(game); }}
                          className="rounded-lg border p-2 hover:bg-accent transition-colors text-right"
                        >
                          <div className="aspect-square bg-slate-100 rounded-md overflow-hidden mb-2 flex items-center justify-center">
                            {imgUrl ? (
                              <img src={imgUrl} alt={game.name} className="w-full h-full object-contain" />
                            ) : (
                              <Gamepad2 className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="text-xs font-medium truncate">{game.name}</div>
                          <div className="text-xs text-muted-foreground truncate" dir="ltr">{game.code}</div>
                        </button>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Test tab ===== */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4" /> اختبار تدفق شراء اللعبة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                اختر لعبة من تبويب "الألعاب" أو اكتب كود اللعبة يدويًا، ثم جرّب التحقق من معرف اللاعب وإنشاء طلب اختباري.
              </p>

              {!selectedGame ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  اختر لعبة من تبويب "الألعاب" لبدء الاختبار.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected game info */}
                  <div className="rounded-lg border p-3 bg-slate-50">
                    <div className="flex items-center gap-3">
                      {selectedGame.image_url && (
                        <img
                          src={selectedGame.image_url.startsWith('http') ? selectedGame.image_url : `https://api.g2bulk.com${selectedGame.image_url}`}
                          alt={selectedGame.name}
                          className="w-12 h-12 rounded-md object-contain bg-white"
                        />
                      )}
                      <div>
                        <div className="font-medium">{selectedGame.name}</div>
                        <div className="text-xs text-muted-foreground" dir="ltr">{selectedGame.code}</div>
                      </div>
                    </div>
                    {gameFields && (
                      <div className="mt-3 text-xs">
                        <span className="font-medium">الحقول المطلوبة:</span>{' '}
                        {gameFields.fields.length > 0 ? (
                          <span className="font-mono">{gameFields.fields.join('، ')}</span>
                        ) : (
                          <span className="text-muted-foreground">لا توجد</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Player ID verification */}
                  <div className="space-y-2">
                    <Label>معرف اللاعب (Player ID)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={playerId}
                        onChange={e => setPlayerId(e.target.value)}
                        placeholder="أدخل معرف اللاعب"
                        dir="ltr"
                      />
                      <Button onClick={handleVerifyPlayer} disabled={verifying || !playerId}>
                        {verifying ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Search className="h-4 w-4 ml-1" />}
                        تحقق
                      </Button>
                    </div>

                    {gameFields?.fields.includes('serverid') && (
                      <div>
                        <Label className="text-xs">معرف السيرفر (Server ID)</Label>
                        <Input
                          value={serverId}
                          onChange={e => setServerId(e.target.value)}
                          placeholder="أدخل معرف السيرفر (إن لزم)"
                          dir="ltr"
                          className="mt-1"
                        />
                      </div>
                    )}

                    {playerVerify && (
                      <div className={`rounded-md p-2 text-sm flex items-center gap-2 ${
                        playerVerify.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {playerVerify.valid ? (
                          <><CheckCircle className="h-4 w-4" /> ✓ الاسم: <strong>{playerVerify.name}</strong></>
                        ) : (
                          <><XCircle className="h-4 w-4" /> ✗ معرف غير صالح</>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Catalogue */}
                  {catalogue.length > 0 && (
                    <div>
                      <Label>الباقات المتاحة ({catalogue.length})</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        {catalogue.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => handleTestOrder(cat)}
                            disabled={ordering || !playerVerify?.valid}
                            className="rounded-md border p-2 hover:bg-accent transition-colors text-right disabled:opacity-50"
                          >
                            <div className="font-medium text-sm truncate">{cat.name}</div>
                            <div className="text-xs text-green-600 font-bold">${cat.amount.toFixed(2)}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Order result */}
                  {orderResult && (
                    <div className={`rounded-lg p-3 text-sm ${
                      orderResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {orderResult.success ? (
                          <><CheckCircle className="h-4 w-4 text-green-600" /> تم إنشاء الطلب</>
                        ) : (
                          <><AlertTriangle className="h-4 w-4 text-red-600" /> فشل الطلب</>
                        )}
                      </div>
                      {orderResult.success && (
                        <div className="space-y-1 font-mono text-xs">
                          <div>Order ID: {orderResult.order?.order_id}</div>
                          <div>Status: {orderResult._status?.status || orderResult.order?.status}</div>
                          <div>Price: ${orderResult.order?.price}</div>
                          {orderResult._status?.delivery_items && (
                            <div className="text-green-700">Delivery: {JSON.stringify(orderResult._status.delivery_items)}</div>
                          )}
                        </div>
                      )}
                      {!orderResult.success && (
                        <div className="text-red-600 text-xs">{orderResult.message}</div>
                      )}
                    </div>
                  )}

                  {ordering && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin ml-2" />
                      <span className="text-sm">جاري إنشاء الطلب...</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
