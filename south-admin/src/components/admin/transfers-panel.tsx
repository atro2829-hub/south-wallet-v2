'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, timeAgo, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeftRight, Search, Loader2, Filter,
  ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle,
  XCircle, DollarSign, User, Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Transfer {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  currency: string;
  fee: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  type: 'internal' | 'external';
  note?: string;
  createdAt: string;
}

const statusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', icon: Clock },
  completed: { label: 'مكتمل', color: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: CheckCircle },
  failed: { label: 'فشل', color: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: XCircle },
  cancelled: { label: 'ملغي', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400', icon: XCircle },
};

export default function TransfersPanel() {
  const { showToast } = useAdminStore();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  useEffect(() => {
    const transRef = ref(database, 'transfers');
    const unsub = onValue(transRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Transfer[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        senderId: val.senderId || '',
        senderName: val.senderName || 'غير معروف',
        receiverId: val.receiverId || '',
        receiverName: val.receiverName || 'غير معروف',
        amount: val.amount || 0,
        currency: val.currency || 'USD',
        fee: val.fee || 0,
        status: val.status || 'pending',
        type: val.type || 'internal',
        note: val.note || '',
        createdAt: val.createdAt || new Date().toISOString(),
      }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransfers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return transfers.filter(t => {
      const matchSearch = search === '' ||
        t.senderName.toLowerCase().includes(search.toLowerCase()) ||
        t.receiverName.toLowerCase().includes(search.toLowerCase()) ||
        t.id.includes(search);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchCurrency = currencyFilter === 'all' || t.currency === currencyFilter;
      return matchSearch && matchStatus && matchCurrency;
    });
  }, [transfers, search, statusFilter, currencyFilter]);

  const stats = useMemo(() => {
    const total = transfers.length;
    const completed = transfers.filter(t => t.status === 'completed').length;
    const pending = transfers.filter(t => t.status === 'pending').length;
    const totalAmount = transfers.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0);
    const totalFees = transfers.filter(t => t.status === 'completed').reduce((s, t) => s + t.fee, 0);
    return { total, completed, pending, totalAmount, totalFees };
  }, [transfers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري تحميل التحويلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-7 h-7 text-[#5C1A1B]" />
          التحويلات
        </h1>
        <p className="text-muted-foreground text-sm mt-1">عرض وإدارة جميع تحويلات المستخدمين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي التحويلات', value: stats.total, icon: ArrowLeftRight, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'مكتملة', value: stats.completed, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'قيد الانتظار', value: stats.pending, icon: Clock, color: 'from-yellow-600 to-yellow-800' },
          { label: 'إجمالي المبالغ', value: formatNumber(stats.totalAmount), icon: DollarSign, color: 'from-blue-600 to-blue-800' },
          { label: 'إجمالي الرسوم', value: formatNumber(stats.totalFees), icon: DollarSign, color: 'from-purple-600 to-purple-800' },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو الرقم..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="العملة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العملات</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="YER">YER</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">لا توجد تحويلات</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.slice(0, 50).map((transfer, i) => {
              const st = statusMap[transfer.status] || statusMap.pending;
              const StatusIcon = st.icon;
              return (
                <motion.div
                  key={transfer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-[#5C1A1B]/10 flex items-center justify-center shrink-0">
                            <ArrowLeftRight className="w-5 h-5 text-[#5C1A1B]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm truncate">{transfer.senderName}</span>
                              <ArrowLeftRight className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="font-semibold text-sm truncate">{transfer.receiverName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {timeAgo(transfer.createdAt)}
                              </span>
                              {transfer.note && (
                                <span className="truncate max-w-[150px]">ملاحظة: {transfer.note}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="font-bold text-sm">
                            {formatNumber(transfer.amount)} {transfer.currency}
                          </p>
                          {transfer.fee > 0 && (
                            <p className="text-xs text-muted-foreground">
                              رسوم: {formatNumber(transfer.fee)} {transfer.currency}
                            </p>
                          )}
                          <Badge variant="outline" className={cn('text-[10px] mt-1', st.color)}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {st.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {filtered.length > 50 && (
        <p className="text-center text-xs text-muted-foreground">
          عرض 50 من {filtered.length} تحويل
        </p>
      )}
    </div>
  );
}
