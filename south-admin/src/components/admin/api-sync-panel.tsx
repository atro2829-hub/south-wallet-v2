'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAdminStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { database } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import {
  RefreshCw,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SyncProvider {
  id: string;
  name: string;
  lastSync: string | null;
  status: 'synced' | 'syncing' | 'error' | 'never';
  autoSync: boolean;
}

export default function ApiSyncPanel() {
  const { adminUser } = useAdminStore();
  const [providers, setProviders] = useState<SyncProvider[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const providersRef = ref(database, 'apiProviders');
    const unsub = onValue(providersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: SyncProvider[] = Object.entries(data).map(([id, val]: [string, any]) => ({
        id,
        name: val.name || val.displayName || 'مزود غير معروف',
        lastSync: val.lastSync || val.lastSyncAt || null,
        status: val.syncStatus || (val.lastSync ? 'synced' : 'never'),
        autoSync: val.autoSync ?? true,
      }));
      setProviders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSync = async (providerId: string) => {
    setSyncing(providerId);
    try {
      const { set: firebaseSet } = await import('firebase/database');
      await firebaseSet(ref(database, `apiProviders/${providerId}/syncStatus`), 'syncing');
      await firebaseSet(ref(database, `apiProviders/${providerId}/lastSync`), new Date().toISOString());
      // Simulate sync completion
      setTimeout(async () => {
        try {
          await firebaseSet(ref(database, `apiProviders/${providerId}/syncStatus`), 'synced');
        } catch {}
        setSyncing(null);
      }, 2000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    for (const provider of providers) {
      await handleSync(provider.id);
    }
  };

  const statusIcon = (status: SyncProvider['status']) => {
    switch (status) {
      case 'synced': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'syncing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'never': return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: SyncProvider['status']) => {
    switch (status) {
      case 'synced': return 'متزامن';
      case 'syncing': return 'جاري المزامنة';
      case 'error': return 'خطأ';
      case 'never': return 'لم يتم المزامنة';
    }
  };

  const syncedCount = providers.filter(p => p.status === 'synced').length;
  const errorCount = providers.filter(p => p.status === 'error').length;

  const stats = [
    { label: 'إجمالي المزودين', value: providers.length, icon: Server, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'متزامن', value: syncedCount, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'أخطاء', value: errorCount, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'مزامنة تلقائية', value: providers.filter(p => p.autoSync).length, icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ios-large-title text-foreground">المزامنة</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة مزامنة بيانات مزودي API</p>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncing !== null || providers.length === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
            syncing !== null || providers.length === 0
              ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
              : 'bg-[#5C1A1B] text-white hover:bg-[#3D0F10] active:scale-[0.98] shadow-lg shadow-[#5C1A1B]/20'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
          مزامنة الكل
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="ios-card p-4">
              <div className={cn('p-2 rounded-xl w-fit', stat.bg)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <p className="text-xl font-bold text-foreground mt-2">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Provider Sync List */}
      <div className="ios-card overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground">حالة المزامنة</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">آخر تحديث لكل مزود</p>
        </div>
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : providers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا يوجد مزودون مسجلون</p>
          ) : (
            providers.map((provider, i) => (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="ios-list-item gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#5C1A1B]/10 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5 text-[#5C1A1B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{provider.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {statusIcon(provider.status)}
                    <span className="text-[11px] text-muted-foreground">{statusLabel(provider.status)}</span>
                    {provider.lastSync && (
                      <span className="text-[10px] text-muted-foreground/60 mr-1">
                        {new Date(provider.lastSync).toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSync(provider.id)}
                  disabled={syncing === provider.id}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    syncing === provider.id
                      ? 'bg-blue-500/10 text-blue-500 cursor-wait'
                      : 'bg-[#5C1A1B]/5 text-[#5C1A1B] hover:bg-[#5C1A1B]/10 active:scale-[0.98]'
                  )}
                >
                  <RefreshCw className={cn('w-3.5 h-3.5', syncing === provider.id && 'animate-spin')} />
                  {syncing === provider.id ? 'جاري المزامنة...' : 'مزامنة'}
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
