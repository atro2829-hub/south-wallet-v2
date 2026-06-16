'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, get, set, push, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, timeAgo, generateId } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Upload, Loader2, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BackupPanel() {
  const { adminUser, showToast } = useAdminStore();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const backupRef = ref(database, 'ownerSettings/backups');
    const unsub = onValue(backupRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setBackups(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const paths = ['users', 'orders', 'depositRequests', 'withdrawRequests', 'providers', 'packages', 'giftCodes', 'promo-codes', 'adminSettings', 'ownerSettings', 'supportChats', 'notifications'];
      const backupData: Record<string, any> = {};

      for (const path of paths) {
        const snapshot = await get(ref(database, path));
        backupData[path] = snapshot.val() || {};
      }

      // Save backup record
      await push(ref(database, 'ownerSettings/backups'), {
        timestamp: new Date().toISOString(),
        adminId: adminUser?.uid,
        adminName: adminUser?.displayName,
        size: JSON.stringify(backupData).length,
        type: 'manual',
      });

      // Download as JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `south-wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('تم تصدير النسخة الاحتياطية', 'success');
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ في التصدير', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        for (const [path, value] of Object.entries(data)) {
          if (value && typeof value === 'object') {
            await set(ref(database, path), value);
          }
        }

        await push(ref(database, 'ownerSettings/backups'), {
          timestamp: new Date().toISOString(),
          adminId: adminUser?.uid,
          adminName: adminUser?.displayName,
          size: text.length,
          type: 'import',
        });

        showToast('تم استيراد النسخة الاحتياطية بنجاح', 'success');
      } catch (e) {
        showToast('حدث خطأ في الاستيراد - تأكد من صحة الملف', 'error');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">النسخ الاحتياطي</h1>
        <p className="text-muted-foreground text-sm mt-1">تصدير واستيراد نسخ احتياطية</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="admin-card border-0 shadow-none cursor-pointer card-press" onClick={handleExport}>
            <CardContent className="p-6 text-center">
              <Download className="w-10 h-10 text-purple-500 mx-auto mb-3" />
              <p className="font-semibold">تصدير نسخة احتياطية</p>
              <p className="text-xs text-muted-foreground mt-1">تحميل نسخة كاملة من قاعدة البيانات</p>
              {exporting && <Loader2 className="w-5 h-5 mx-auto mt-2 animate-spin text-purple-500" />}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="admin-card border-0 shadow-none cursor-pointer card-press" onClick={handleImport}>
            <CardContent className="p-6 text-center">
              <Upload className="w-10 h-10 text-orange-500 mx-auto mb-3" />
              <p className="font-semibold">استيراد نسخة احتياطية</p>
              <p className="text-xs text-muted-foreground mt-1">استعادة من ملف نسخة احتياطية</p>
              {importing && <Loader2 className="w-5 h-5 mx-auto mt-2 animate-spin text-orange-500" />}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">تحذير</p>
          <p className="text-xs text-muted-foreground">الاستيراد سيستبدل جميع البيانات الحالية. تأكد من عمل نسخة احتياطية قبل الاستيراد.</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">سجل النسخ الاحتياطي</h2>
        <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto scrollbar-thin">
          {backups.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
              <Card className="admin-card border-0 shadow-none">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10"><Database className="w-4 h-4 text-purple-500" /></div>
                    <div>
                      <p className="text-sm font-medium">{b.type === 'import' ? 'استيراد' : 'تصدير'}</p>
                      <p className="text-xs text-muted-foreground">{b.adminName || 'النظام'} - {formatSize(b.size || 0)}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">{b.timestamp ? timeAgo(b.timestamp) : ''}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {backups.length === 0 && <p className="text-center text-muted-foreground py-4">لا توجد سجلات</p>}
        </div>
      </div>
    </div>
  );
}
