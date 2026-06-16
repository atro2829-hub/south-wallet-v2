'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowDownCircle, Image as ImageIcon } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, timeAgo, formatNumber } from '@/lib/utils';

export default function AdminDeposit() {
  const {
    isDark, cardStyle, statusStyles, depositRequests,
    handleApproveDeposit, handleRejectDeposit, setViewReceipt
  } = useAdminContext();

  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredDeposits = depositRequests.filter(d => depositFilter === 'all' || d.status === depositFilter);

  return (
    <motion.div key="deposit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ ...cardStyle, borderRight: '3px solid #F59E0B' }}>
          <p className="text-lg font-bold" style={{ color: '#F59E0B' }}>{depositRequests.filter(d => d.status === 'pending').length}</p>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>قيد الانتظار</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ ...cardStyle, borderRight: '3px solid #10B981' }}>
          <p className="text-lg font-bold" style={{ color: '#10B981' }}>{depositRequests.filter(d => d.status === 'approved').length}</p>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>مقبول</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ ...cardStyle, borderRight: '3px solid #5C1A1B' }}>
          <p className="text-lg font-bold" style={{ color: '#5C1A1B' }}>{depositRequests.filter(d => d.status === 'rejected').length}</p>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>مرفوض</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setDepositFilter(f)} className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
            style={{ background: depositFilter === f ? 'rgba(92,26,27,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', color: depositFilter === f ? '#FFF' : isDark ? '#BBB' : '#666', border: depositFilter === f ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
            {f === 'pending' ? 'قيد الانتظار' : f === 'approved' ? 'مقبول' : f === 'rejected' ? 'مرفوض' : 'الكل'}
          </button>
        ))}
      </div>
      {filteredDeposits.map((dep) => {
        const s = statusStyles[dep.status] || statusStyles.pending;
        return (
          <div key={dep.id} className="rounded-2xl p-4" style={{
            ...cardStyle,
            borderRight: dep.status === 'pending' ? '3px solid #F59E0B' : undefined,
            boxShadow: dep.status === 'pending' ? '0 0 15px rgba(245,158,11,0.08)' : undefined,
          }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{dep.userName}</p>
                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                  {dep.method === 'bank_transfer' ? 'تحويل بنكي' : dep.method === 'cash' ? 'نقدي' : dep.method === 'card' ? 'بطاقة' : dep.method} - {timeAgo(dep.createdAt)}
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{dep.amount.toLocaleString()} {currencySymbols[dep.currency]}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
              </div>
            </div>
            {dep.notes && (
              <div className="p-2 rounded-lg mb-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>ملاحظات</p>
                <p className="text-xs" style={{ color: isDark ? '#CCC' : '#333' }}>{dep.notes}</p>
              </div>
            )}
            {dep.receiptImage && (
              <button onClick={() => setViewReceipt(dep.receiptImage)} className="flex items-center gap-1.5 mb-2 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                <ImageIcon size={12} /> عرض الإيصال
              </button>
            )}
            {dep.status === 'pending' && (
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleApproveDeposit(dep)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                  <CheckCircle2 size={14} /> قبول وإضافة الرصيد
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleRejectDeposit(dep)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  <XCircle size={14} /> رفض
                </motion.button>
              </div>
            )}
          </div>
        );
      })}
      {filteredDeposits.length === 0 && (
        <div className="flex flex-col items-center py-8"><ArrowDownCircle size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات إيداع</p></div>
      )}
    </motion.div>
  );
}
