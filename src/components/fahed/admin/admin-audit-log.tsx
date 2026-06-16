'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, FileText, Download, RefreshCw, ChevronDown, X } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { auditActionLabels, auditActionColors, AuditAction, fetchAuditLog, type AuditLogEntry } from '@/lib/audit-log';
import { timeAgo, formatNumber } from '@/lib/utils';
import { onValue, ref } from 'firebase/database';
import { database } from '@/lib/firebase';
import { exportToCSV } from '@/lib/export-reports';

export default function AdminAuditLog() {
  const { isDark, cardStyle, inputStyle } = useAdminContext();

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen to audit log in real-time
  useEffect(() => {
    const auditRef = ref(database, 'auditLog');
    const unsubscribe = onValue(auditRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: AuditLogEntry[] = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          userId: val.userId || '',
          userName: val.userName || '',
          action: val.action || '',
          details: val.details || '',
          timestamp: val.timestamp || '',
          ipAddress: val.ipAddress,
        }));
        setEntries(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        setEntries([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter entries
  useEffect(() => {
    let filtered = [...entries];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.details.toLowerCase().includes(q) ||
        e.userName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.userId.toLowerCase().includes(q)
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(e => e.action === actionFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let startDate: Date;

      switch (dateFilter) {
        case 'today':
          startDate = startOfDay;
          break;
        case '7days':
          startDate = new Date(startOfDay.getTime() - 7 * 86400000);
          break;
        case '30days':
          startDate = new Date(startOfDay.getTime() - 30 * 86400000);
          break;
        case '90days':
          startDate = new Date(startOfDay.getTime() - 90 * 86400000);
          break;
        default:
          startDate = new Date(0);
      }
      filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= startDate.getTime());
    }

    setFilteredEntries(filtered);
  }, [entries, searchQuery, actionFilter, dateFilter]);

  // Export audit log as CSV
  const handleExportCSV = () => {
    const data = filteredEntries.map(e => ({
      الوقت: e.timestamp ? new Date(e.timestamp).toLocaleString('ar-SA') : '-',
      المستخدم: e.userName,
      'معرف المستخدم': e.userId,
      'نوع العملية': auditActionLabels[e.action] || e.action,
      التفاصيل: e.details,
      'عنوان IP': e.ipAddress || '-',
    }));
    exportToCSV(data, `audit-log-${new Date().toISOString().split('T')[0]}`);
  };

  // Get unique action types from entries
  const actionTypes = [...new Set(entries.map(e => e.action))].sort();

  return (
    <motion.div key="audit-log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Header */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText size={18} color="#5C1A1B" />
            <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سجل المراجعة</h3>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleExportCSV}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              title="تصدير CSV"
            >
              <Download size={14} color={isDark ? '#AAA' : '#666'} />
            </motion.button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3" style={inputStyle}>
          <Search size={16} color={isDark ? '#666' : '#AAA'} />
          <input
            type="text"
            placeholder="بحث في السجل..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={14} color={isDark ? '#666' : '#AAA'} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium"
            style={{ background: showFilters ? 'rgba(92,26,27,0.1)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: showFilters ? '#5C1A1B' : isDark ? '#AAA' : '#666' }}
          >
            <Filter size={12} />
            فلاتر
            <ChevronDown size={10} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
            {formatNumber(filteredEntries.length)} سجل
          </span>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid grid-cols-2 gap-2 mt-3">
                {/* Action filter */}
                <select
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="all">جميع العمليات</option>
                  {actionTypes.map(action => (
                    <option key={action} value={action}>{auditActionLabels[action] || action}</option>
                  ))}
                </select>

                {/* Date filter */}
                <select
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl text-xs outline-none"
                  style={inputStyle}
                >
                  <option value="all">كل الأوقات</option>
                  <option value="today">اليوم</option>
                  <option value="7days">آخر 7 أيام</option>
                  <option value="30days">آخر 30 يوم</option>
                  <option value="90days">آخر 90 يوم</option>
                </select>
              </div>

              {(actionFilter !== 'all' || dateFilter !== 'all') && (
                <button
                  onClick={() => { setActionFilter('all'); setDateFilter('all'); }}
                  className="mt-2 text-[10px] px-3 py-1.5 rounded-lg"
                  style={{ background: 'rgba(92,26,27,0.08)', color: '#5C1A1B' }}
                >
                  إعادة تعيين الفلاتر
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'اليوم', count: entries.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length, color: '#10B981' },
          { label: 'هذا الأسبوع', count: entries.filter(e => new Date(e.timestamp).getTime() > Date.now() - 7 * 86400000).length, color: '#F59E0B' },
          { label: 'هذا الشهر', count: entries.filter(e => new Date(e.timestamp).getTime() > Date.now() - 30 * 86400000).length, color: '#3B82F6' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-3 text-center" style={cardStyle}>
            <p className="text-lg font-bold" style={{ color: stat.color }}>{formatNumber(stat.count)}</p>
            <p className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Entries List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <FileText size={32} color={isDark ? '#333' : '#DDD'} />
            <p className="text-xs mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد سجلات</p>
          </div>
        ) : (
          filteredEntries.map((entry, i) => {
            const actionLabel = auditActionLabels[entry.action] || entry.action;
            const actionColor = auditActionColors[entry.action] || '#666';
            return (
              <motion.div
                key={entry.id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="rounded-xl p-3"
                style={{
                  ...cardStyle,
                  borderRight: `3px solid ${actionColor}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: `${actionColor}18`, color: actionColor }}
                      >
                        {actionLabel}
                      </span>
                      {entry.ipAddress && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#555' : '#AAA' }} dir="ltr">
                          IP: {entry.ipAddress}
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: isDark ? '#CCC' : '#333' }}>
                      {entry.details}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                        {entry.userName || entry.userId}
                      </span>
                      <span className="text-[10px]" style={{ color: isDark ? '#444' : '#CCC' }}>•</span>
                      <span className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
