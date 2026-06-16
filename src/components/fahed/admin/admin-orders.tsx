'use client';

import { motion } from 'framer-motion';
import { Search, CheckCircle2, XCircle, RotateCcw, ShoppingBag } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, timeAgo } from '@/lib/utils';
import { useState } from 'react';

export default function AdminOrders() {
  const {
    isDark, cardStyle, inputStyle, statusStyles, filteredOrders, providers,
    handleCompleteOrder, handleCancelOrder
  } = useAdminContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  const displayOrders = filteredOrders.filter(o => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return o.userName?.toLowerCase().includes(q) || o.customerInput?.includes(q) || o.providerName?.includes(q) || o.packageName?.includes(q);
    }
    return true;
  });

  return (
    <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={cardStyle}>
        <Search size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
        <input type="text" placeholder="ابحث بالاسم، الرقم، الخدمة..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'completed', 'cancelled'] as const).map((filter) => (
          <motion.button key={filter} whileTap={{ scale: 0.95 }} onClick={() => setOrderFilter(filter)}
            className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
            style={{ background: orderFilter === filter ? 'rgba(92,26,27,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', color: orderFilter === filter ? '#FFF' : isDark ? '#BBB' : '#666', border: orderFilter === filter ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
            {filter === 'all' ? 'الكل' : filter === 'pending' ? 'قيد الانتظار' : filter === 'completed' ? 'مكتمل' : 'ملغى'}
          </motion.button>
        ))}
      </div>
      {displayOrders.map((order) => {
        const statusStyle = statusStyles[order.status] || statusStyles.pending;
        const provider = providers.find(p => p.id === order.providerId);
        return (
          <div key={order.id} className="rounded-2xl overflow-hidden" style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
            border: order.status === 'pending' ? '1px solid rgba(245,158,11,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            borderRight: order.status === 'pending' ? '3px solid #F59E0B' : undefined,
            boxShadow: order.status === 'pending' ? '0 0 15px rgba(245,158,11,0.1)' : undefined,
          }}>
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {provider?.icon && provider.icon.startsWith('data:') ? (
                    <img src={provider.icon} alt={provider.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider?.color || '#5C1A1B'}18` }}>
                      <span className="font-bold text-xs" style={{ color: provider?.color || '#5C1A1B' }}>{(provider?.name || order.providerName)?.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.packageName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                    </div>
                    <p className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>{order.providerName}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{order.amount.toLocaleString()} {currencySymbols[order.currency]}</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{timeAgo(order.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3 p-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>العميل</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.userName}</p></div>
                <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>الرقم/المعرف</p><p className="text-xs font-medium" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.customerInput}</p></div>
                <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>النوع</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: order.executionType === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: order.executionType === 'manual' ? '#F59E0B' : '#10B981' }}>
                    {order.executionType === 'manual' ? 'يدوي' : 'تلقائي'}
                  </span>
                </div>
              </div>
              {order.status === 'pending' && (
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCompleteOrder(order)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                    <CheckCircle2 size={14} /> تم الشحن
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCancelOrder(order)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                    <RotateCcw size={14} /> إلغاء وإعادة
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {displayOrders.length === 0 && (
        <div className="flex flex-col items-center py-8"><ShoppingBag size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات</p></div>
      )}
    </motion.div>
  );
}
