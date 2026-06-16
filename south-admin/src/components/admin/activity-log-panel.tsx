'use client';

import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, timeAgo } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Activity, User, Shield, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ActivityLogPanel() {
  const { showToast } = useAdminStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logRef = ref(database, 'ownerSettings/activityLog');
    const unsub = onValue(logRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      setLogs(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = logs.filter((l) => {
    const ms = !search || l.action?.includes(search) || l.details?.includes(search) || l.adminName?.includes(search);
    const mf = typeFilter === 'all' || l.type === typeFilter;
    return ms && mf;
  });

  const typeIcon: Record<string, React.ElementType> = {
    admin: Shield,
    user: User,
    system: Monitor,
  };

  const typeColor: Record<string, string> = {
    admin: 'bg-purple-500/10 text-purple-600',
    user: 'bg-blue-500/10 text-blue-600',
    system: 'bg-green-500/10 text-green-600',
  };

  const typeLabel: Record<string, string> = {
    admin: 'مدير',
    user: 'مستخدم',
    system: 'نظام',
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">سجل النشاط</h1>
        <p className="text-muted-foreground text-sm mt-1">{formatNumber(logs.length)} سجل</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="admin">مدير</SelectItem>
            <SelectItem value="user">مستخدم</SelectItem>
            <SelectItem value="system">نظام</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {filtered.map((log, i) => {
          const Icon = typeIcon[log.type] || Activity;
          return (
            <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}>
              <Card className="admin-card border-0 shadow-none">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg shrink-0', typeColor[log.type] || 'bg-gray-500/10')}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{log.action}</p>
                      <Badge className={cn('text-xs shrink-0', typeColor[log.type])}>{typeLabel[log.type] || log.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.adminName || 'النظام'} - {log.timestamp ? timeAgo(log.timestamp) : ''}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد سجلات</p>}
      </div>
    </div>
  );
}

function cn(...classes: any[]) { return classes.filter(Boolean).join(' '); }
