'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import {
  getApiProviders,
  fullG2BulkSync,
  syncAllProviders,
  testProviderConnection,
  type ApiProvider,
} from '@/lib/api-providers';
import {
  RefreshCw,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Database,
  Gamepad2,
  Package,
  Layers,
  Loader2,
  Play,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ProviderStats {
  id: string;
  name: string;
  lastSync: string | null;
  status: 'synced' | 'syncing' | 'error' | 'never';
  categories: number;
  games: number;
  products: number;
  balance: number;
  balanceCurrency: string;
  enabled: boolean;
}

export default function ApiSyncPanel() {
  const { showToast } = useAdminStore();
  const [providers, setProviders] = useState<ProviderStats[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<{ categories: number; products: number; games: number; errors: string[] } | null>(null);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const apiProviders = await getApiProviders();

      // جلب إحصائيات المزودين من Supabase
      const stats: ProviderStats[] = await Promise.all(
        apiProviders.map(async (prov): Promise<ProviderStats> => {
          const [{ count: catCount }, { count: gameCount }] = await Promise.all([
            supabase.from('api_categories').select('id', { count: 'exact', head: true })
              .eq('api_provider_id', prov.id).neq('category_type', 'game'),
            supabase.from('api_games').select('id', { count: 'exact', head: true })
              .eq('api_provider_id', prov.id),
          ]);
          const prodResult = await supabase.from('api_products').select('id', { count: 'exact', head: true })
            .eq('api_provider_id', prov.id);
          const prodCount = prodResult.count || 0;

          return {
            id: prov.id,
            name: prov.name,
            lastSync: prov.lastSync,
            status: prov.lastSync ? 'synced' : 'never',
            categories: catCount || 0,
            games: gameCount || 0,
            products: prodCount || 0,
            balance: prov.balance || 0,
            balanceCurrency: prov.balanceCurrency || 'USD',
            enabled: prov.enabled,
          };
        })
      );

      setProviders(stats);
    } catch (e: any) {
      console.error('loadProviders', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const handleSyncProvider = async (providerId: string) => {
    setSyncing(providerId);
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, status: 'syncing' } : p));
    try {
      const apiProv = (await getApiProviders()).find(p => p.id === providerId);
      if (!apiProv) throw new Error('المزود غير موجود');

      const result = await fullG2BulkSync(apiProv);

      setProviders(prev => prev.map(p => p.id === providerId ? {
        ...p,
        status: 'synced',
        categories: result.categories,
        games: result.games,
        products: result.products,
        lastSync: new Date().toISOString(),
      } : p));

      showToast(`تمت مزامنة ${result.categories} تصنيف، ${result.products} منتج، ${result.games} لعبة`, 'success');
    } catch (e: any) {
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, status: 'error' } : p));
      showToast(`فشلت المزامنة: ${e.message}`, 'error');
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const result = await syncAllProviders();
      setLastSyncResult({
        categories: result.totalCategories,
        products: result.totalProducts,
        games: result.totalGames,
        errors: result.errors,
      });
      showToast(
        `اكتملت المزامنة الشاملة: ${result.totalCategories} تصنيف، ${result.totalProducts} منتج، ${result.totalGames} لعبة`,
        result.errors.length > 0 ? 'warning' : 'success'
      );
      await loadProviders();
    } catch (e: any) {
      showToast(`فشلت المزامنة الشاملة: ${e.message}`, 'error');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleTestConnection = async (providerId: string) => {
    const apiProv = (await getApiProviders()).find(p => p.id === providerId);
    if (!apiProv) return;
    const result = await testProviderConnection(apiProv);
    if (result.success) {
      showToast(`الاتصال ناجح - الرصيد: ${result.balance} USD`, 'success');
      // تحديث الرصيد في الجدول
      await supabase.from('api_providers').update({
        balance: result.balance,
        last_balance_check: new Date().toISOString(),
      }).eq('id', providerId);
      setProviders(prev => prev.map(p => p.id === providerId ? { ...p, balance: result.balance || 0 } : p));
    } else {
      showToast(`فشل الاتصال: ${result.error}`, 'error');
    }
  };

  const statusIcon = (status: ProviderStats['status'], isCurrentlySyncing: boolean) => {
    if (isCurrentlySyncing) return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    switch (status) {
      case 'synced':   return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'syncing':  return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':    return <XCircle className="w-4 h-4 text-red-500" />;
      default:         return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'لم تتم';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return d.toLocaleDateString('ar-YE');
  };

  const totalStats = providers.reduce((acc, p) => ({
    categories: acc.categories + p.categories,
    games: acc.games + p.games,
    products: acc.products + p.products,
  }), { categories: 0, games: 0, products: 0 });

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">مزامنة مزودي API</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            مزامنة الفئات والمنتجات والألعاب من مزودي الخدمة الخارجيين
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadProviders}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#5C1A1B' }}
          >
            {syncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            مزامنة الكل
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Layers, label: 'التصنيفات', value: totalStats.categories, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Gamepad2, label: 'الألعاب', value: totalStats.games, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { icon: Package, label: 'المنتجات', value: totalStats.products, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="admin-card p-3 text-center rounded-xl">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mx-auto mb-1.5`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-lg font-bold">{loading ? '...' : value.toLocaleString('ar')}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Last Sync Result */}
      {lastSyncResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-1">
            <CheckCircle2 className="w-4 h-4" />
            آخر مزامنة شاملة
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{lastSyncResult.categories} تصنيف</span>
            <span>{lastSyncResult.products} منتج</span>
            <span>{lastSyncResult.games} لعبة</span>
          </div>
          {lastSyncResult.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {lastSyncResult.errors.map((err, i) => (
                <p key={i} className="text-[11px] text-red-500 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {err}
                </p>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Providers List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">لا يوجد مزودي API</p>
          <p className="text-xs text-muted-foreground mt-1">أضف مزوداً من لوحة إدارة المزودين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((prov) => {
            const isSyncing = syncing === prov.id;
            return (
              <motion.div
                key={prov.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="admin-card p-4 rounded-xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#5C1A1B20' }}>
                      <Server className="w-4 h-4" style={{ color: '#5C1A1B' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{prov.name}</p>
                        {statusIcon(prov.status, isSyncing)}
                        {!prov.enabled && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
                            معطل
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        آخر مزامنة: {formatDate(prov.lastSync)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleTestConnection(prov.id)}
                      disabled={isSyncing}
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                      title="اختبار الاتصال"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSyncProvider(prov.id)}
                      disabled={isSyncing || syncingAll}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: '#5C1A1B' }}
                    >
                      {isSyncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      مزامنة
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { icon: Layers, label: 'تصنيف', value: prov.categories, color: '#3B82F6' },
                    { icon: Gamepad2, label: 'لعبة', value: prov.games, color: '#8B5CF6' },
                    { icon: Package, label: 'منتج', value: prov.products, color: '#10B981' },
                    { icon: Database, label: 'USD رصيد', value: `${prov.balance.toFixed(2)}`, color: '#F59E0B' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="text-center p-2 rounded-lg bg-muted/30">
                      <Icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color }} />
                      <p className="text-sm font-semibold">{isSyncing ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : value}</p>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
