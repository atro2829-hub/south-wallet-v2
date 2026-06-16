'use client';

import { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Building2,
  CreditCard,
  FileText,
  Car,
  Shield,
  Hash,
  DollarSign,
  CheckCircle2,
  Loader2,
  Receipt,
  Clock,
  AlertCircle,
  Download,
  Share2,
  RotateCcw,
  X,
  BadgeCheck,
  Stamp,
  Landmark,
  Fingerprint,
  ClipboardList,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, generateReference } from '@/lib/utils';

type GovServiceId = 'civil-registry' | 'passport' | 'traffic' | 'municipal';
type PaymentStep = 'form' | 'confirm' | 'processing' | 'success' | 'receipt';

interface GovService {
  id: GovServiceId;
  name: string;
  nameEn: string;
  color: string;
  icon: React.ReactNode;
  inputLabel: string;
  inputPlaceholder: string;
  inputPrefix?: string;
  amount: number;
  description: string;
}

interface PaymentRecord {
  id: string;
  serviceId: GovServiceId;
  serviceName: string;
  referenceNumber: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
}

const govServices: GovService[] = [
  {
    id: 'civil-registry',
    name: 'السجل المدني',
    nameEn: 'Civil Registry',
    color: '#6B7280',
    icon: <Fingerprint size={22} strokeWidth={1.5} />,
    inputLabel: 'رقم الهوية',
    inputPlaceholder: 'أدخل رقم الهوية الشخصية',
    amount: 2000,
    description: 'استخراج أو تجديد بطاقة شخصية',
  },
  {
    id: 'passport',
    name: 'جواز السفر',
    nameEn: 'Passport',
    color: '#1E40AF',
    icon: <Stamp size={22} strokeWidth={1.5} />,
    inputLabel: 'رقم الجواز',
    inputPlaceholder: 'أدخل رقم جواز السفر',
    amount: 15000,
    description: 'استخراج أو تجديد جواز سفر',
  },
  {
    id: 'traffic',
    name: 'المرور',
    nameEn: 'Traffic',
    color: '#DC2626',
    icon: <Car size={22} strokeWidth={1.5} />,
    inputLabel: 'رقم اللوحة',
    inputPlaceholder: 'أدخل رقم اللوحة',
    inputPrefix: 'صنعاء',
    amount: 5000,
    description: 'مخالفات مرورية ورسوم تجديد',
  },
  {
    id: 'municipal',
    name: 'البلدية',
    nameEn: 'Municipal',
    color: '#059669',
    icon: <Building2 size={22} strokeWidth={1.5} />,
    inputLabel: 'رقم الرخصة',
    inputPlaceholder: 'أدخل رقم رخصة البلدية',
    amount: 8000,
    description: 'رسوم تراخيص وخدمات بلدية',
  },
];

// Mock payment history
const mockPaymentHistory: PaymentRecord[] = [
  { id: 'GOV-001', serviceId: 'civil-registry', serviceName: 'السجل المدني', referenceNumber: '123456789', amount: 2000, date: '2025-01-10T09:30:00', status: 'completed' },
  { id: 'GOV-002', serviceId: 'traffic', serviceName: 'المرور', referenceNumber: 'صنعاء-45678', amount: 5000, date: '2025-01-05T14:20:00', status: 'completed' },
  { id: 'GOV-003', serviceId: 'passport', serviceName: 'جواز السفر', referenceNumber: 'AB1234567', amount: 15000, date: '2024-12-20T11:00:00', status: 'completed' },
];

export default function GovernmentPaymentScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, user, addTransaction, addNotification, setUser } = useAppStore();

  const [selectedService, setSelectedService] = useState<GovServiceId | null>(null);
  const [step, setStep] = useState<PaymentStep>('form');
  const [referenceInput, setReferenceInput] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>(mockPaymentHistory);
  const [completedPayment, setCompletedPayment] = useState<PaymentRecord | null>(null);

  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const subTextColor = isDark ? '#888' : '#AAA';
  const inputBg = isDark ? '#141414' : '#F8F8F8';

  const currentService = govServices.find(s => s.id === selectedService);
  const effectiveAmount = currentService ? (customAmount ? parseInt(customAmount) : currentService.amount) : 0;

  const handleServiceSelect = (serviceId: GovServiceId) => {
    setSelectedService(serviceId);
    setReferenceInput('');
    setCustomAmount('');
    setStep('form');
  };

  const handleProceedToConfirm = () => {
    if (!referenceInput.trim() || !selectedService) return;
    setStep('confirm');
  };

  const handleConfirmPayment = async () => {
    if (!currentService || !user) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const currentBalance = user.balanceYER || 0;
      const newBalance = currentBalance - effectiveAmount;

      const paymentId = generateReference();
      const newPayment: PaymentRecord = {
        id: paymentId,
        serviceId: currentService.id,
        serviceName: currentService.name,
        referenceNumber: referenceInput.trim(),
        amount: effectiveAmount,
        date: new Date().toISOString(),
        status: 'completed',
      };

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update user balance
      const updatedUser = { ...user, balanceYER: newBalance };
      setUser(updatedUser);

      // Add transaction
      addTransaction({
        id: generateReference(),
        fromUserId: user.id,
        toUserId: 'government',
        amount: effectiveAmount,
        currency: 'YER',
        type: 'payment',
        status: 'completed',
        description: `دفع خدمة ${currentService.name} - ${referenceInput.trim()}`,
        createdAt: new Date().toISOString(),
      });

      // Add notification
      addNotification({
        id: generateReference(),
        title: 'تم الدفع بنجاح',
        body: `تم دفع ${effectiveAmount.toLocaleString()} ${currencySymbols.YER} لخدمة ${currentService.name}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      setPaymentHistory(prev => [newPayment, ...prev]);
      setCompletedPayment(newPayment);
      setStep('receipt');
    } catch {
      setStep('form');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedService(null);
    setReferenceInput('');
    setCustomAmount('');
    setStep('form');
    setCompletedPayment(null);
  };

  const handleShareReceipt = async () => {
    if (!completedPayment || !currentService) return;
    const text = `إيصال دفع حكومي - محفظة الجنوب\nرقم المرجع: ${completedPayment.id}\nالخدمة: ${currentService.name}\nالرقم المرجعي: ${completedPayment.referenceNumber}\nالمبلغ: ${effectiveAmount.toLocaleString()} ${currencySymbols.YER}\nالتاريخ: ${new Date().toLocaleDateString('ar-SA')}\nالحالة: مكتمل`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'إيصال دفع حكومي', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
      } catch {}
    }
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: isDark ? '#0A0A0A' : '#F5F5F5' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'form' && !selectedService) {
                setActiveScreen('main');
              } else if (step === 'form') {
                setSelectedService(null);
              } else if (step === 'confirm') {
                setStep('form');
              } else {
                handleReset();
              }
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            خدمات حكومية
          </h1>
        </div>
      </motion.div>

      <div className="px-4">
        <AnimatePresence mode="wait">
          {/* ==================== SERVICE LIST ==================== */}
          {!selectedService && step === 'form' && (
            <motion.div
              key="service-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-3"
            >
              {/* Services */}
              {govServices.map((service, index) => (
                <motion.button
                  key={service.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * index }}
                  onClick={() => handleServiceSelect(service.id)}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${service.color}15` }}
                  >
                    <span style={{ color: service.color }}>{service.icon}</span>
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {service.name}
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: subTextColor }}>
                      {service.description}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="text-sm font-bold" style={{ color: service.color }}>
                      {service.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px]" style={{ color: subTextColor }}>{currencySymbols.YER}</p>
                  </div>
                </motion.button>
              ))}

              {/* Payment History */}
              {paymentHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} strokeWidth={1.5} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      سجل المدفوعات
                    </h3>
                  </div>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                  >
                    {paymentHistory.slice(0, 5).map((record, index) => {
                      const svc = govServices.find(s => s.id === record.serviceId);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 px-4 py-3"
                          style={{
                            borderBottom: index < Math.min(paymentHistory.length, 5) - 1
                              ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
                              : 'none',
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${svc?.color || '#6B7280'}15` }}
                          >
                            {svc?.icon && <span style={{ color: svc.color, transform: 'scale(0.8)' }}>{svc.icon}</span>}
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                              {record.serviceName}
                            </p>
                            <p className="text-[9px] mt-0.5" style={{ color: subTextColor }}>
                              {new Date(record.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-xs font-bold" style={{ color: svc?.color || '#6B7280' }}>
                              {record.amount.toLocaleString()} {currencySymbols.YER}
                            </p>
                            <span className="text-[9px] font-medium" style={{ color: record.status === 'completed' ? '#10B981' : '#F59E0B' }}>
                              {record.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ==================== PAYMENT FORM ==================== */}
          {selectedService && step === 'form' && currentService && (
            <motion.div
              key="payment-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Selected Service Header */}
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, ${currentService.color}20 0%, ${currentService.color}10 100%)`,
                  border: `1px solid ${currentService.color}30`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${currentService.color}20` }}
                >
                  <span style={{ color: currentService.color }}>{currentService.icon}</span>
                </div>
                <div className="flex-1 text-right">
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {currentService.name}
                  </h3>
                  <p className="text-[11px]" style={{ color: subTextColor }}>
                    {currentService.description}
                  </p>
                </div>
              </div>

              {/* Reference Number Input */}
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  {currentService.inputLabel}
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3.5 rounded-2xl"
                  style={{ background: inputBg, border: `1px solid ${borderColor}` }}
                >
                  <Hash size={18} strokeWidth={1.5} color={currentService.color} />
                  {currentService.inputPrefix && (
                    <>
                      <span className="text-sm font-medium shrink-0" style={{ color: subTextColor }}>
                        {currentService.inputPrefix}
                      </span>
                      <div className="w-px h-5 shrink-0" style={{ background: isDark ? '#333' : '#DDD' }} />
                    </>
                  )}
                  <input
                    type="text"
                    placeholder={currentService.inputPlaceholder}
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  المبلغ
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3.5 rounded-2xl"
                  style={{ background: inputBg, border: `1px solid ${borderColor}` }}
                >
                  <DollarSign size={18} strokeWidth={1.5} color={currentService.color} />
                  <input
                    type="number"
                    placeholder={currentService.amount.toLocaleString()}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm font-medium"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    dir="ltr"
                  />
                  <span
                    className="text-[10px] px-2 py-1 rounded-lg font-bold text-white shrink-0"
                    style={{ background: '#5C1A1B' }}
                  >
                    {currencySymbols.YER}
                  </span>
                </div>
                <p className="text-[10px] mt-1.5" style={{ color: subTextColor }}>
                  الرسم الافتراضي: {currentService.amount.toLocaleString()} {currencySymbols.YER}
                </p>
              </div>

              {/* Proceed Button */}
              <motion.button
                onClick={handleProceedToConfirm}
                disabled={!referenceInput.trim()}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm transition-all disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${currentService.color} 0%, ${currentService.color}CC 100%)`,
                  boxShadow: `0 4px 16px ${currentService.color}40`,
                }}
              >
                <CreditCard size={18} strokeWidth={2} />
                متابعة الدفع
              </motion.button>
            </motion.div>
          )}

          {/* ==================== CONFIRMATION ==================== */}
          {step === 'confirm' && currentService && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div
                className="rounded-2xl p-4"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Receipt size={16} strokeWidth={1.5} color="#5C1A1B" />
                  <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    تأكيد الدفع
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>الخدمة</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {currentService.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>{currentService.inputLabel}</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">
                      {currentService.inputPrefix && `${currentService.inputPrefix}-`}{referenceInput}
                    </span>
                  </div>
                  <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المبلغ</span>
                    <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                      {effectiveAmount.toLocaleString()} {currencySymbols.YER}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>رصيدك الحالي</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {(user?.balanceYER || 0).toLocaleString()} {currencySymbols.YER}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>الرصيد بعد الدفع</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: (user?.balanceYER || 0) - effectiveAmount >= 0 ? '#10B981' : '#5C1A1B' }}
                    >
                      {((user?.balanceYER || 0) - effectiveAmount).toLocaleString()} {currencySymbols.YER}
                    </span>
                  </div>
                </div>
              </div>

              {(user?.balanceYER || 0) < effectiveAmount && (
                <div
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <AlertCircle size={18} strokeWidth={1.5} color="#EF4444" />
                  <p className="text-xs font-medium" style={{ color: '#EF4444' }}>
                    رصيدك غير كافي لهذه العملية
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm"
                  style={{
                    background: isDark ? '#2D2D2D' : '#F0F0F0',
                    color: isDark ? '#FFF' : '#1a1a1a',
                  }}
                >
                  رجوع
                </button>
                <motion.button
                  onClick={handleConfirmPayment}
                  disabled={(user?.balanceYER || 0) < effectiveAmount}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${currentService.color} 0%, ${currentService.color}CC 100%)`,
                    boxShadow: `0 4px 16px ${currentService.color}40`,
                  }}
                >
                  <CreditCard size={16} strokeWidth={2} />
                  تأكيد الدفع
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ==================== PROCESSING ==================== */}
          {step === 'processing' && currentService && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${currentService.color}15` }}>
                <Loader2 size={28} strokeWidth={1.5} color={currentService.color} className="animate-spin" />
              </div>
              <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                جاري المعالجة
              </h3>
              <p className="text-sm mt-2" style={{ color: subTextColor }}>
                يرجى الانتظار...
              </p>
            </motion.div>
          )}

          {/* ==================== RECEIPT ==================== */}
          {step === 'receipt' && completedPayment && currentService && (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Success Badge */}
              <div className="flex flex-col items-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(16,185,129,0.15)' }}
                >
                  <CheckCircle2 size={32} strokeWidth={2} color="#10B981" />
                </motion.div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  تم الدفع بنجاح
                </h3>
                <p className="text-sm mt-1" style={{ color: subTextColor }}>
                  دفعة خدمة {currentService.name}
                </p>
              </div>

              {/* Receipt Card */}
              <div
                className="rounded-2xl p-4"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>رقم المرجع</span>
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">
                      {completedPayment.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>الخدمة</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {currentService.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>{currentService.inputLabel}</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">
                      {completedPayment.referenceNumber}
                    </span>
                  </div>
                  <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المبلغ</span>
                    <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                      {completedPayment.amount.toLocaleString()} {currencySymbols.YER}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>التاريخ</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {new Date(completedPayment.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>الحالة</span>
                    <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                      <BadgeCheck size={12} className="inline ml-1" />
                      مكتمل
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleShareReceipt}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{
                    background: isDark ? '#2D2D2D' : '#F0F0F0',
                    color: isDark ? '#FFF' : '#1a1a1a',
                  }}
                >
                  <Share2 size={14} strokeWidth={1.5} />
                  مشاركة
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <RotateCcw size={14} strokeWidth={1.5} />
                  عملية جديدة
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
