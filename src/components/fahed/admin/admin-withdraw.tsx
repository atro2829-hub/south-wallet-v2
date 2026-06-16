'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowUpCircle } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, timeAgo } from '@/lib/utils';

export default function AdminWithdraw() {
  const {
    isDark, cardStyle, statusStyles, withdrawRequests,
    handleApproveWithdraw, handleRejectWithdraw
  } = useAdminContext();

  const [withdrawFilter, setWithdrawFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredWithdraws = withdrawRequests.filter(w => withdrawFilter === 'all' || w.status === withdrawFilter);

  return (
    <motion.div key="withdraw" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ ...cardStyle, borderRight: '3px solid #F59E0B' }}>
          <p className="text-lg font-bold" style={{ color: '#F59E0B' }}>{withdrawRequests.filter(w => w.status === 'pending').length}</p>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>قيد الانتظار</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ ...cardStyle, borderRight: '3px solid #10B981' }}>
          <p className="text-lg font-bold" style={{ color: '#10B981' }}>{withdrawRequests.filter(w => w.status === 'approved').length}</p>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>مقبول</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ ...cardStyle, borderRight: '3px solid #5C1A1B' }}>
          <p className="text-lg font-bold" style={{ color: '#5C1A1B' }}>{withdrawRequests.filter(w => w.status === 'rejected').length}</p>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>مرفوض</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setWithdrawFilter(f)} className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
            style={{ background: withdrawFilter === f ? 'rgba(92,26,27,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', color: withdrawFilter === f ? '#FFF' : isDark ? '#BBB' : '#666', border: withdrawFilter === f ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
            {f === 'pending' ? 'قيد الانتظار' : f === 'approved' ? 'مقبول' : f === 'rejected' ? 'مرفوض' : 'الكل'}
          </button>
        ))}
      </div>
      {filteredWithdraws.map((w) => {
        const s = statusStyles[w.status] || statusStyles.pending;
        return (
          <div key={w.id} className="rounded-2xl p-4" style={{
            ...cardStyle,
            borderRight: w.status === 'pending' ? '3px solid #F59E0B' : undefined,
            boxShadow: w.status === 'pending' ? '0 0 15px rgba(245,158,11,0.08)' : undefined,
          }}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{w.userName}</p>
                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                  {w.method === 'bank_transfer' ? 'تحويل بنكي' : w.method === 'cash' ? 'نقدي' : w.method === 'wallet' ? 'محفظة' : w.method} - {timeAgo(w.createdAt)}
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{w.amount.toLocaleString()} {currencySymbols[w.currency]}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
              </div>
            </div>
            {w.bankDetails && (
              <div className="p-2.5 rounded-lg mb-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className="text-[10px] mb-0.5" style={{ color: isDark ? '#666' : '#AAA' }}>تفاصيل البنك</p>
                <p className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#333' }}>{w.bankDetails}</p>
              </div>
            )}
            {w.notes && (
              <div className="p-2.5 rounded-lg mb-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className="text-[10px] mb-0.5" style={{ color: isDark ? '#666' : '#AAA' }}>ملاحظات</p>
                <p className="text-xs" style={{ color: isDark ? '#CCC' : '#333' }}>{w.notes}</p>
              </div>
            )}
            {w.status === 'pending' && (
              <div className="flex gap-2 mt-1">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleApproveWithdraw(w)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                  <CheckCircle2 size={14} /> قبول وتنفيذ
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleRejectWithdraw(w)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  <XCircle size={14} /> رفض وإعادة
                </motion.button>
              </div>
            )}
          </div>
        );
      })}
      {filteredWithdraws.length === 0 && (
        <div className="flex flex-col items-center py-8"><ArrowUpCircle size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات سحب</p></div>
      )}
    </motion.div>
  );
}
