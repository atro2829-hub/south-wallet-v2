'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, cn, formatDateAr } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download, Loader2, Users, ArrowDownCircle, ArrowUpCircle,
  ShoppingCart, FileSpreadsheet, Calendar, Clock,
  CheckCircle, AlertCircle, Archive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: 'preparing' | 'ready' | 'failed';
  recordCount: number;
  createdAt: string;
  filename?: string;
}

export default function DataExportPanel() {
  const { showToast } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [exportType, setExportType] = useState('users');
  const [exportFormat, setExportFormat] = useState('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportJob[]>([]);

  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const depsRef = ref(database, 'depositRequests');
    const unsub1 = onValue(depsRef, (snap) => {
      const data = snap.val() || {};
      setDeposits(Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v })));
    });

    const withRef = ref(database, 'withdrawRequests');
    const unsub2 = onValue(withRef, (snap) => {
      const data = snap.val() || {};
      setWithdrawals(Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v })));
    });

    const usersRef = ref(database, 'users');
    const unsub3 = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      setAllUsers(Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v })));
      setLoading(false);
    });

    const ordersRef = ref(database, 'orders');
    const unsub4 = onValue(ordersRef, (snap) => {
      const data = snap.val() || {};
      setOrders(Object.entries(data).map(([k, v]: [string, any]) => ({ id: k, ...v })));
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  const getDataByType = () => {
    const from = dateFrom ? new Date(dateFrom) : new Date(0);
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date();

    switch (exportType) {
      case 'users':
        return allUsers.filter(u => {
          const d = new Date(u.createdAt || u.timestamp || 0);
          return d >= from && d <= to && (includeInactive || u.isActive !== false);
        }).map(u => ({
          id: u.id,
          name: u.name || u.firstName || '',
          email: u.email || '',
          phone: u.phone || '',
          balance: u.balance || 0,
          currency: u.currency || 'USD',
          kycStatus: u.kycStatus || 'none',
          isActive: u.isActive !== false ? 'نعم' : 'لا',
          createdAt: u.createdAt || u.timestamp || '',
        }));

      case 'deposits':
        return deposits.filter(d => {
          const dt = new Date(d.createdAt || d.timestamp || 0);
          return dt >= from && dt <= to;
        }).map(d => ({
          id: d.id,
          userId: d.userId || '',
          userName: d.userName || d.name || '',
          amount: d.amount || 0,
          currency: d.currency || 'USD',
          method: d.method || d.paymentMethod || '',
          status: d.status || '',
          createdAt: d.createdAt || d.timestamp || '',
        }));

      case 'withdrawals':
        return withdrawals.filter(w => {
          const dt = new Date(w.createdAt || w.timestamp || 0);
          return dt >= from && dt <= to;
        }).map(w => ({
          id: w.id,
          userId: w.userId || '',
          userName: w.userName || w.name || '',
          amount: w.amount || 0,
          currency: w.currency || 'USD',
          method: w.method || w.paymentMethod || '',
          status: w.status || '',
          createdAt: w.createdAt || w.timestamp || '',
        }));

      case 'orders':
        return orders.filter(o => {
          const dt = new Date(o.createdAt || o.timestamp || 0);
          return dt >= from && dt <= to;
        }).map(o => ({
          id: o.id,
          userId: o.userId || '',
          userName: o.userName || '',
          serviceName: o.serviceName || o.productName || '',
          amount: o.amount || 0,
          currency: o.currency || 'USD',
          status: o.status || '',
          createdAt: o.createdAt || o.timestamp || '',
        }));

      default:
        return [];
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = getDataByType();

      if (data.length === 0) {
        showToast('لا توجد بيانات للتصدير', 'error');
        setExporting(false);
        return;
      }

      // Add to history
      const job: ExportJob = {
        id: Date.now().toString(),
        type: exportType,
        format: exportFormat,
        status: 'preparing',
        recordCount: data.length,
        createdAt: new Date().toISOString(),
      };

      await new Promise(r => setTimeout(r, 500)); // Simulate processing

      const typeNames: Record<string, string> = {
        users: 'المستخدمين',
        deposits: 'الإيداعات',
        withdrawals: 'السحوبات',
        orders: 'الطلبات',
      };

      const filename = `${typeNames[exportType] || exportType}_${new Date().toISOString().split('T')[0]}`;

      if (exportFormat === 'csv') {
        const headers = Object.keys(data[0]);
        const csv = [
          headers.join(','),
          ...data.map((row: any) =>
            headers.map(h => {
              const val = String(row[h] || '');
              return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
            }).join(',')
          )
        ].join('\n');

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Excel format (TSV that Excel can open)
        const headers = Object.keys(data[0]);
        const tsv = [
          headers.join('\t'),
          ...data.map((row: any) =>
            headers.map(h => String(row[h] || '')).join('\t')
          )
        ].join('\n');

        const blob = new Blob(['\ufeff' + tsv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.xls`;
        a.click();
        URL.revokeObjectURL(url);
      }

      job.status = 'ready';
      job.filename = filename;
      setExportHistory(prev => [job, ...prev]);
      showToast(`تم تصدير ${data.length} سجل بنجاح`, 'success');
    } catch (e) {
      showToast('حدث خطأ أثناء التصدير', 'error');
    } finally {
      setExporting(false);
    }
  };

  const typeConfig: Record<string, { label: string; icon: React.ElementType; count: number; color: string }> = {
    users: { label: 'المستخدمين', icon: Users, count: allUsers.length, color: 'from-blue-600 to-blue-800' },
    deposits: { label: 'الإيداعات', icon: ArrowDownCircle, count: deposits.length, color: 'from-green-600 to-green-800' },
    withdrawals: { label: 'السحوبات', icon: ArrowUpCircle, count: withdrawals.length, color: 'from-orange-600 to-orange-800' },
    orders: { label: 'الطلبات', icon: ShoppingCart, count: orders.length, color: 'from-purple-600 to-purple-800' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Download className="w-7 h-7 text-[#5C1A1B]" />
          تصدير البيانات
        </h1>
        <p className="text-muted-foreground text-sm mt-1">تصدير البيانات بتنسيق CSV أو Excel</p>
      </div>

      {/* Data Sources */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(typeConfig).map(([key, config], i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={cn(
                'border-0 shadow-sm cursor-pointer transition-all hover:shadow-md',
                exportType === key && 'ring-2 ring-[#5C1A1B]'
              )}
              onClick={() => setExportType(key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', config.color)}>
                    <config.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(config.count)} سجل</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Export Options */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#5C1A1B]" />
            خيارات التصدير
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>نوع البيانات</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">المستخدمين</SelectItem>
                  <SelectItem value="deposits">الإيداعات</SelectItem>
                  <SelectItem value="withdrawals">السحوبات</SelectItem>
                  <SelectItem value="orders">الطلبات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>صيغة الملف</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel (XLS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>من تاريخ</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <Label>إلى تاريخ</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
            <Label>تضمين الحسابات المعطلة</Label>
          </div>

          {/* Preview */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">عدد السجلات:</span>
              <span className="font-bold">{formatNumber(getDataByType().length)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">نوع البيانات:</span>
              <span className="font-bold">{typeConfig[exportType]?.label}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الصيغة:</span>
              <span className="font-bold">{exportFormat === 'csv' ? 'CSV' : 'Excel (XLS)'}</span>
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={exporting || getDataByType().length === 0}
            className="w-full mt-4 bg-[#5C1A1B] hover:bg-[#3D0F10]"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 ml-2" />
            )}
            {exporting ? 'جاري التصدير...' : 'تصدير البيانات'}
          </Button>
        </CardContent>
      </Card>

      {/* Export History */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5 text-[#5C1A1B]" />
            سجل التصدير
          </h3>

          {exportHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">لا توجد عمليات تصدير سابقة</p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {exportHistory.map((job, i) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        job.status === 'ready' ? 'bg-green-500/10' : 'bg-red-500/10'
                      )}>
                        {job.status === 'ready' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {typeConfig[job.type]?.label || job.type} • {job.format.toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.recordCount} سجل • {new Date(job.createdAt).toLocaleString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      'text-[10px]',
                      job.status === 'ready' ? 'text-green-500' : 'text-red-500'
                    )}>
                      {job.status === 'ready' ? 'تم' : 'فشل'}
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
