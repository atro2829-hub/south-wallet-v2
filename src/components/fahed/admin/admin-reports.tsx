'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Table, Users, ShoppingBag, DollarSign, ArrowLeftRight } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { exportToCSV, exportToPDF, prepareOrdersReport, prepareUsersReport, prepareFinancialReport } from '@/lib/export-reports';
import { formatNumber } from '@/lib/utils';

interface AdminReportsProps {
  allOrders: any[];
  firebaseUsers: any[];
  depositRequests: any[];
  withdrawRequests: any[];
  isDark: boolean;
  cardStyle: { background: string; backdropFilter: 'blur(20px)'; border: string };
}

export default function AdminReports({ allOrders, firebaseUsers, depositRequests, withdrawRequests, isDark, cardStyle }: AdminReportsProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExportOrdersCSV = () => {
    const data = prepareOrdersReport(allOrders);
    exportToCSV(data, `orders-report-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportOrdersPDF = () => {
    const data = prepareOrdersReport(allOrders);
    exportToPDF('تقرير الطلبات', data, [
      { key: 'id', label: 'رقم الطلب' },
      { key: 'userName', label: 'المستخدم' },
      { key: 'providerName', label: 'المزود' },
      { key: 'packageName', label: 'الباقة' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'currency', label: 'العملة' },
      { key: 'status', label: 'الحالة' },
      { key: 'createdAt', label: 'التاريخ' },
    ]);
  };

  const handleExportUsersCSV = () => {
    const data = prepareUsersReport(firebaseUsers);
    exportToCSV(data, `users-report-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportUsersPDF = () => {
    const data = prepareUsersReport(firebaseUsers);
    exportToPDF('تقرير المستخدمين', data, [
      { key: 'userId', label: 'رقم الحساب' },
      { key: 'name', label: 'الاسم' },
      { key: 'email', label: 'البريد' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'kycStatus', label: 'حالة التحقق' },
      { key: 'balanceYER', label: 'رصيد ر.ي' },
      { key: 'balanceSAR', label: 'رصيد ر.س' },
      { key: 'balanceUSD', label: 'رصيد $' },
    ]);
  };

  const handleExportFinancialPDF = () => {
    const { transactions, summary } = prepareFinancialReport(allOrders, depositRequests, withdrawRequests);
    exportToPDF('التقرير المالي', transactions, [
      { key: 'id', label: 'رقم المرجع' },
      { key: 'type', label: 'النوع' },
      { key: 'userName', label: 'المستخدم' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'currency', label: 'العملة' },
      { key: 'status', label: 'الحالة' },
      { key: 'createdAt', label: 'التاريخ' },
    ]);
  };

  const handleExportFinancialCSV = () => {
    const { transactions } = prepareFinancialReport(allOrders, depositRequests, withdrawRequests);
    exportToCSV(transactions, `financial-report-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportTransactionsCSV = () => {
    const data = allOrders.map(o => ({
      id: o.id,
      userName: o.userName,
      providerName: o.providerName,
      packageName: o.packageName,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt,
    }));
    exportToCSV(data, `transactions-report-${new Date().toISOString().split('T')[0]}`);
  };

  const reportCards = [
    {
      id: 'orders',
      title: 'تقرير الطلبات',
      description: 'تصدير جميع الطلبات مع تفاصيل الحالة والمبالغ',
      icon: ShoppingBag,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.12)',
      stats: `${formatNumber(allOrders.length)} طلب`,
      onCSV: handleExportOrdersCSV,
      onPDF: handleExportOrdersPDF,
    },
    {
      id: 'users',
      title: 'تقرير المستخدمين',
      description: 'تصدير بيانات المستخدمين وأرصدتهم',
      icon: Users,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.12)',
      stats: `${formatNumber(firebaseUsers.length)} مستخدم`,
      onCSV: handleExportUsersCSV,
      onPDF: handleExportUsersPDF,
    },
    {
      id: 'financial',
      title: 'التقرير المالي',
      description: 'ملخص الإيرادات والمصروفات والعمولات',
      icon: DollarSign,
      color: '#10B981',
      bg: 'rgba(16,185,129,0.12)',
      stats: `${formatNumber(allOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.amount, 0))} ر.ي إيرادات`,
      onCSV: handleExportFinancialCSV,
      onPDF: handleExportFinancialPDF,
    },
    {
      id: 'transactions',
      title: 'تقرير المعاملات',
      description: 'تصدير جميع المعاملات والتحويلات',
      icon: ArrowLeftRight,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
      stats: `${formatNumber(allOrders.length + depositRequests.length + withdrawRequests.length)} معاملة`,
      onCSV: handleExportTransactionsCSV,
      onPDF: () => {
        const data = allOrders.map(o => ({
          id: o.id,
          type: 'طلب',
          userName: o.userName,
          amount: o.amount,
          currency: o.currency,
          status: o.status,
          createdAt: o.createdAt,
        }));
        exportToPDF('تقرير المعاملات', data, [
          { key: 'id', label: 'رقم المرجع' },
          { key: 'type', label: 'النوع' },
          { key: 'userName', label: 'المستخدم' },
          { key: 'amount', label: 'المبلغ' },
          { key: 'currency', label: 'العملة' },
          { key: 'status', label: 'الحالة' },
          { key: 'createdAt', label: 'التاريخ' },
        ]);
      },
    },
  ];

  return (
    <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Header */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-2">
          <Download size={18} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تصدير التقارير</h3>
        </div>
        <p className="text-xs" style={{ color: isDark ? '#666' : '#AAA' }}>
          قم بتصدير تقارير مفصلة بصيغة CSV أو PDF للاحتفاظ بها أو طباعتها
        </p>
      </div>

      {/* Report Cards */}
      {reportCards.map((report, i) => {
        const Icon = report.icon;
        return (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4"
            style={cardStyle}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: report.bg }}>
                <Icon size={22} strokeWidth={1.5} color={report.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{report.title}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${report.color}15`, color: report.color }}>
                    {report.stats}
                  </span>
                </div>
                <p className="text-[10px] mb-3" style={{ color: isDark ? '#666' : '#AAA' }}>{report.description}</p>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={report.onCSV}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium"
                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#CCC' : '#666' }}
                  >
                    <Table size={12} />
                    CSV
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={report.onPDF}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-white"
                    style={{ background: report.color }}
                  >
                    <FileText size={12} />
                    PDF
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
