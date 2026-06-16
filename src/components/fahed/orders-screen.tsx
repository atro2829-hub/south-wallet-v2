'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Receipt,
  FileText,
  ShoppingBag,
  ChevronLeft,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';

type OrderTab = 'all' | 'pending' | 'completed' | 'cancelled';

const orderCategories = [
  { id: 'orders-list', label: 'قائمة الطلبات', icon: ClipboardCheck, color: '#10B981', desc: 'جميع طلباتك' },
  { id: 'invoices', label: 'فواتير', icon: Receipt, color: '#5C1A1B', desc: 'فواتير الشراء' },
  { id: 'requests', label: 'طلبات', icon: FileText, color: '#F59E0B', desc: 'الطلبات المعلقة' },
  { id: 'seller-requests', label: 'طلبات البائع', icon: ShoppingBag, color: '#2563EB', desc: 'طلبات الشراء من البائعين' },
];

export default function OrdersScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { orders, setActiveScreen } = useAppStore();

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} strokeWidth={1.5} color="#F59E0B" />;
      case 'completed': return <CheckCircle2 size={14} strokeWidth={1.5} color="#10B981" />;
      case 'cancelled': return <XCircle size={14} strokeWidth={1.5} color="#5C1A1B" />;
      default: return <AlertCircle size={14} strokeWidth={1.5} color="#666" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'completed': return '#10B981';
      case 'cancelled': return '#5C1A1B';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen pb-4">
      {/* Header - Jaib Style with back arrow */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => useAppStore.getState().setActiveTab('home')}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أوامر</h1>
        </div>
      </motion.div>

      {/* Order Categories - Jaib Style Cards */}
      <div className="px-4 space-y-3">
        {orderCategories.map((category, index) => {
          const Icon = category.icon;
          const count = category.id === 'orders-list' ? orders.length
            : category.id === 'invoices' ? completedOrders.length
            : category.id === 'requests' ? pendingOrders.length
            : 0;

          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl card-press"
              style={{
                background: isDark ? '#1A1A1A' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${category.color}12` }}
              >
                <Icon size={22} strokeWidth={1.5} color={category.color} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  {category.label}
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#666' : '#AAA' }}>
                  {category.desc}
                </p>
              </div>
              {count > 0 && (
                <span
                  className="min-w-[24px] h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-2"
                  style={{ background: category.color }}
                >
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Recent Orders */}
      {orders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-4 mt-5"
        >
          <h3 className="text-sm font-bold mb-3" style={{ color: isDark ? '#AAA' : '#888' }}>آخر الطلبات</h3>
          <div className="space-y-2">
            {orders.slice(0, 10).map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * index }}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{
                  background: isDark ? '#1A1A1A' : '#FFFFFF',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${getStatusColor(order.status)}10` }}>
                  {getStatusIcon(order.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {order.packageName || order.providerName}
                  </p>
                  <p className="text-[11px]" style={{ color: isDark ? '#555' : '#AAA' }}>
                    {order.customerInput}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {order.amount.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <span className="text-[9px] font-bold" style={{ color: getStatusColor(order.status) }}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-4 mt-8"
        >
          <div
            className="rounded-2xl p-8 flex flex-col items-center"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
              <ClipboardCheck size={32} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
            </div>
            <p className="text-sm mt-3 font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد طلبات بعد</p>
            <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>طلباتك ستظهر هنا</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
