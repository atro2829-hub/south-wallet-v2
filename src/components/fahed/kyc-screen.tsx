'use client';

import { useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Camera,
  Upload,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  MapPin,
  FileText,
  X,
  Loader2,
  ShieldCheck,
  BadgeCheck,
  ScanLine,
  UserCheck,
  Brain,
  AlertTriangle,
  RotateCcw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { governorates, cardTypes } from '@/lib/utils';
import { useToast } from '@/components/fahed/toast-provider';
import ImageUpload from '@/components/fahed/image-upload';

// ─── Types ────────────────────────────────────────────────────────

interface VerificationCheck {
  name: string;
  label: string;
  passed: boolean;
  confidence: number;
  details: string;
}

interface VerificationResult {
  success: boolean;
  documentType: string;
  isValid: boolean;
  confidence: number;
  checks: VerificationCheck[];
  overallAssessment: string;
  error?: string;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'warning' | 'failed' | 'error';

// ─── Step Animation Variants ──────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

// ─── Helper: Status color and icon ───────────────────────────────

function getCheckStatus(passed: boolean, confidence: number): { color: string; bgColor: string; icon: React.ReactNode } {
  if (passed && confidence >= 70) {
    return {
      color: '#10B981',
      bgColor: 'rgba(16,185,129,0.1)',
      icon: <CheckCircle2 size={16} strokeWidth={2} color="#10B981" />,
    };
  }
  if (passed && confidence >= 50) {
    return {
      color: '#F59E0B',
      bgColor: 'rgba(245,158,11,0.1)',
      icon: <AlertTriangle size={16} strokeWidth={2} color="#F59E0B" />,
    };
  }
  return {
    color: '#EF4444',
    bgColor: 'rgba(239,68,68,0.1)',
    icon: <X size={16} strokeWidth={2} color="#EF4444" />,
  };
}

// ─── Main Component ───────────────────────────────────────────────

export default function KYCScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, setActiveScreen } = useAppStore();
  const { showToast } = useToast();

  // Step management
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const totalSteps = 6;

  // Form fields
  const [cardType, setCardType] = useState(user?.cardType || '');
  const [cardNumber, setCardNumber] = useState(user?.cardNumber || '');
  const [cardIssuedAt, setCardIssuedAt] = useState(user?.cardIssuedAt || '');
  const [governorate, setGovernorate] = useState(user?.governorate || '');

  // Uploaded document URLs
  const [idFrontUrl, setIdFrontUrl] = useState('');
  const [idBackUrl, setIdBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  // Upload progress
  const [idFrontProgress, setIdFrontProgress] = useState(0);
  const [idBackProgress, setIdBackProgress] = useState(0);
  const [selfieProgress, setSelfieProgress] = useState(0);

  // AI Verification results
  const [idFrontVerification, setIdFrontVerification] = useState<VerificationResult | null>(null);
  const [idBackVerification, setIdBackVerification] = useState<VerificationResult | null>(null);
  const [selfieVerification, setSelfieVerification] = useState<VerificationResult | null>(null);

  // Verification status per document
  const [idFrontStatus, setIdFrontStatus] = useState<VerificationStatus>('idle');
  const [idBackStatus, setIdBackStatus] = useState<VerificationStatus>('idle');
  const [selfieStatus, setSelfieStatus] = useState<VerificationStatus>('idle');

  // General
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const stepLabels = [
    'البيانات الشخصية',
    'وجه البطاقة',
    'خلف البطاقة',
    'صورة شخصية',
    'نتائج التحقق',
    'إرسال الطلب',
  ];

  const stepIcons = [
    <FileText key="1" size={14} />,
    <CreditCard key="2" size={14} />,
    <ScanLine key="3" size={14} />,
    <Camera key="4" size={14} />,
    <Brain key="5" size={14} />,
    <ShieldCheck key="6" size={14} />,
  ];

  // ─── Navigation ──────────────────────────────────────────────────

  const goToStep = useCallback((newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
    setError('');
  }, [step]);

  const canProceed = () => {
    switch (step) {
      case 1: return cardType !== '' && cardNumber.length >= 5 && governorate !== '';
      case 2: return !!idFrontUrl;
      case 3: return !!idBackUrl;
      case 4: return !!selfieUrl;
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  };

  // ─── AI Verification ─────────────────────────────────────────────

  const verifyDocument = async (imageUrl: string, documentType: 'id_front' | 'id_back' | 'selfie') => {
    const setStatusMap = {
      id_front: setIdFrontStatus,
      id_back: setIdBackStatus,
      selfie: setSelfieStatus,
    };
    const setResultMap = {
      id_front: setIdFrontVerification,
      id_back: setIdBackVerification,
      selfie: setSelfieVerification,
    };

    setStatusMap[documentType]('verifying');

    try {
      const response = await fetch('/verify?XTransformPort=3035', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, documentType }),
      });

      const data: VerificationResult = await response.json();

      if (data.success && data.isValid && data.confidence >= 70) {
        setStatusMap[documentType]('success');
      } else if (data.success && data.confidence >= 50) {
        setStatusMap[documentType]('warning');
      } else if (data.success) {
        setStatusMap[documentType]('failed');
      } else {
        setStatusMap[documentType]('error');
      }

      setResultMap[documentType](data);
    } catch {
      setStatusMap[documentType]('error');
      setResultMap[documentType]({
        success: false,
        documentType,
        isValid: false,
        confidence: 0,
        checks: [],
        overallAssessment: 'حدث خطأ في الاتصال بخدمة التحقق',
        error: 'Network error',
      });
    }
  };

  // ─── Upload Handlers ─────────────────────────────────────────────

  const handleIdFrontUpload = useCallback(async (url: string) => {
    setIdFrontUrl(url);
    // Auto-verify after upload
    await verifyDocument(url, 'id_front');
  }, []);

  const handleIdBackUpload = useCallback(async (url: string) => {
    setIdBackUrl(url);
    await verifyDocument(url, 'id_back');
  }, []);

  const handleSelfieUpload = useCallback(async (url: string) => {
    setSelfieUrl(url);
    await verifyDocument(url, 'selfie');
  }, []);

  // ─── Submit KYC ──────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/submit?XTransformPort=3035', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          cardType,
          cardNumber,
          cardIssuedAt,
          governorate,
          nationalId: cardNumber,
          idFrontUrl,
          idBackUrl,
          selfieUrl,
          verificationResults: {
            id_front: idFrontVerification,
            id_back: idBackVerification,
            selfie: selfieVerification,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setUser({
          ...user,
          kycStatus: 'submitted',
          cardType,
          cardNumber,
          cardIssuedAt,
          governorate,
        });
        showToast('success', 'تم الإرسال', 'تم إرسال طلب التحقق بنجاح');
      } else {
        setError(data.error || 'حدث خطأ في الإرسال');
        showToast('error', 'خطأ', data.error || 'حدث خطأ في الإرسال');
      }
    } catch {
      setError('حدث خطأ في الاتصال');
      showToast('error', 'خطأ', 'حدث خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Re-verify document ──────────────────────────────────────────

  const reVerify = async (documentType: 'id_front' | 'id_back' | 'selfie') => {
    const urlMap = { id_front: idFrontUrl, id_back: idBackUrl, selfie: selfieUrl };
    await verifyDocument(urlMap[documentType], documentType);
  };

  // ─── Styles ──────────────────────────────────────────────────────

  const glassCardStyle = {
    background: isDark
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(0,0,0,0.02)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
  };

  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
    color: isDark ? '#FFF' : '#1a1a1a',
  };

  const primaryBtnStyle = (enabled: boolean) => ({
    background: enabled
      ? 'linear-gradient(135deg, #5C1A1B 0%, #3D0F10 50%, #C41E3A 100%)'
      : '#999',
    boxShadow: enabled ? '0 4px 16px rgba(92,26,27,0.3)' : 'none',
  });

  // ─── Verification Status Badge ───────────────────────────────────

  const VerificationBadge = ({ status, onReVerify }: { status: VerificationStatus; onReVerify?: () => void }) => {
    const config: Record<VerificationStatus, { icon: React.ReactNode; text: string; color: string; bg: string }> = {
      idle: { icon: null, text: '', color: '', bg: '' },
      verifying: {
        icon: <Loader2 size={14} className="animate-spin" color="#5C1A1B" />,
        text: 'جاري التحقق...',
        color: '#5C1A1B',
        bg: 'rgba(92,26,27,0.08)',
      },
      success: {
        icon: <CheckCircle2 size={14} strokeWidth={2} color="#10B981" />,
        text: 'تم التحقق',
        color: '#10B981',
        bg: 'rgba(16,185,129,0.08)',
      },
      warning: {
        icon: <AlertTriangle size={14} strokeWidth={2} color="#F59E0B" />,
        text: 'تحقق جزئي',
        color: '#F59E0B',
        bg: 'rgba(245,158,11,0.08)',
      },
      failed: {
        icon: <X size={14} strokeWidth={2} color="#EF4444" />,
        text: 'فشل التحقق',
        color: '#EF4444',
        bg: 'rgba(239,68,68,0.08)',
      },
      error: {
        icon: <AlertCircle size={14} strokeWidth={2} color="#EF4444" />,
        text: 'خطأ في التحقق',
        color: '#EF4444',
        bg: 'rgba(239,68,68,0.08)',
      },
    };

    if (status === 'idle') return null;

    const c = config[status];

    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mt-3"
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}22` }}
        >
          {c.icon}
          <span>{c.text}</span>
        </div>
        {(status === 'warning' || status === 'failed' || status === 'error') && onReVerify && (
          <button
            onClick={onReVerify}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium"
            style={{ background: 'rgba(92,26,27,0.08)', color: '#5C1A1B' }}
          >
            <RotateCcw size={10} />
            إعادة التحقق
          </button>
        )}
      </motion.div>
    );
  };

  // ─── Verification Checks Display ─────────────────────────────────

  const VerificationChecks = ({ verification }: { verification: VerificationResult | null }) => {
    if (!verification) return null;

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-3 space-y-2"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Brain size={14} color="#5C1A1B" />
          <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>
            نتائج التحقق بالذكاء الاصطناعي
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{
              background: verification.confidence >= 70 ? 'rgba(16,185,129,0.1)' : verification.confidence >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
              color: verification.confidence >= 70 ? '#10B981' : verification.confidence >= 50 ? '#F59E0B' : '#EF4444',
            }}
          >
            {verification.confidence}%
          </span>
        </div>

        {verification.checks.map((check, i) => {
          const status = getCheckStatus(check.passed, check.confidence);
          return (
            <motion.div
              key={check.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-2 px-3 py-2 rounded-xl"
              style={{ background: status.bgColor }}
            >
              <div className="mt-0.5 shrink-0">{status.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: status.color }}>
                    {check.label}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: isDark ? '#888' : '#AAA' }}>
                    {check.confidence}%
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#777' : '#999' }}>
                  {check.details}
                </p>
              </div>
            </motion.div>
          );
        })}

        {verification.overallAssessment && (
          <div
            className="px-3 py-2 rounded-xl text-xs"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
          >
            <span className="font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>التقييم: </span>
            <span style={{ color: isDark ? '#DDD' : '#333' }}>{verification.overallAssessment}</span>
          </div>
        )}
      </motion.div>
    );
  };

  // ─── KYC Status Display ──────────────────────────────────────────

  const KYCStatusBanner = () => {
    if (!user?.kycStatus || user.kycStatus === 'pending') return null;

    const configs = {
      submitted: {
        icon: <Clock size={18} color="#F59E0B" />,
        title: 'طلب قيد المراجعة',
        subtitle: 'تم إرسال طلبك وهو قيد المراجعة من قبل الإدارة',
        bg: 'rgba(245,158,11,0.06)',
        border: 'rgba(245,158,11,0.15)',
        color: '#F59E0B',
      },
      rejected: {
        icon: <AlertCircle size={18} color="#EF4444" />,
        title: 'تم رفض الطلب',
        subtitle: 'يمكنك إعادة تقديم الطلب بعد تعديل البيانات',
        bg: 'rgba(239,68,68,0.06)',
        border: 'rgba(239,68,68,0.15)',
        color: '#EF4444',
      },
      verified: {
        icon: <ShieldCheck size={18} color="#10B981" />,
        title: 'هوية موثقة',
        subtitle: 'تم التحقق من بياناتك بنجاح',
        bg: 'rgba(16,185,129,0.06)',
        border: 'rgba(16,185,129,0.15)',
        color: '#10B981',
      },
    };

    const config = configs[user.kycStatus as keyof typeof configs];
    if (!config) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl mt-3"
        style={{ background: config.bg, border: `1px solid ${config.border}` }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${config.color}15` }}
        >
          {config.icon}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: config.color }}>{config.title}</p>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>{config.subtitle}</p>
        </div>
      </motion.div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // VERIFIED VIEW
  // ═══════════════════════════════════════════════════════════════════

  if (user?.kycStatus === 'verified') {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: isDark ? '#1A0A0E' : '#F5F5F5' }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScreen('main')}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: isDark ? '#3D0F10' : '#F0F0F0' }}
            >
              <ArrowRight size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
            </button>
            <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
              بياناتي
            </h1>
          </div>
        </div>

        {/* Verified Content */}
        <div className="flex-1 px-5 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex flex-col items-center mb-8"
            >
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: '2px solid rgba(16,185,129,0.2)',
                }}
              >
                <BadgeCheck size={40} strokeWidth={1.5} color="#10B981" />
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full"
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                <ShieldCheck size={16} strokeWidth={2} color="#10B981" />
                <span className="text-sm font-bold" style={{ color: '#10B981' }}>موثق</span>
              </div>
              <h2 className="text-lg font-bold mt-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                حسابك موثق بالكامل
              </h2>
              <p className="text-xs text-center mt-1 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                تم التحقق من هويتك بنجاح
              </p>
            </motion.div>

            {/* Data Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="w-full rounded-2xl p-5"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              {[
                { icon: <CreditCard size={18} strokeWidth={1.5} color="#5C1A1B" />, label: 'نوع البطاقة', value: user.cardType || '—' },
                { icon: <FileText size={18} strokeWidth={1.5} color="#5C1A1B" />, label: 'رقم البطاقة', value: user.cardNumber || '—', dir: 'ltr' as const },
                { icon: <MapPin size={18} strokeWidth={1.5} color="#5C1A1B" />, label: 'مكان الإصدار', value: user.cardIssuedAt || '—' },
                { icon: <MapPin size={18} strokeWidth={1.5} color="#5C1A1B" />, label: 'المحافظة', value: user.governorate || '—' },
              ].map((item, i, arr) => (
                <div key={item.label}>
                  <div className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(92,26,27,0.08)' }}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium" style={{ color: isDark ? '#666' : '#AAA' }}>{item.label}</p>
                      <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir={item.dir}>
                        {item.value}
                      </p>
                    </div>
                  </div>
                  {i < arr.length - 1 && <div className="h-px mr-12" style={{ background: isDark ? '#2A2A2A' : '#F0F0F0' }} />}
                </div>
              ))}
            </motion.div>

            {/* Verified Status */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="w-full mt-4 rounded-2xl p-4 flex items-center gap-3"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                <ShieldCheck size={20} strokeWidth={1.5} color="#10B981" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: '#10B981' }}>هوية موثقة</p>
                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>تم التحقق من بياناتك بنجاح من قبل الإدارة</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Back Button */}
        <div className="px-5 pb-8 mt-auto">
          <button
            onClick={() => setActiveScreen('main')}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98]"
            style={primaryBtnStyle(true)}
          >
            <ArrowRight size={16} strokeWidth={1.5} />
            <span>العودة</span>
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // SUCCESS VIEW
  // ═══════════════════════════════════════════════════════════════════

  if (success) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: isDark ? '#1A0A0E' : '#F5F5F5' }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'rgba(16,185,129,0.1)',
            }}
          >
            <CheckCircle2 size={40} strokeWidth={1.5} color="#10B981" />
          </motion.div>
          <h2 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            تم إرسال الطلب بنجاح!
          </h2>
          <p className="text-sm text-center mt-2 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
            سيتم مراجعة بياناتك والرد عليك خلال 24 ساعة
          </p>

          {/* AI Verification Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full mt-6 rounded-2xl p-4 space-y-2"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Brain size={16} color="#5C1A1B" />
              <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>ملخص التحقق الذكي</span>
            </div>
            {[
              { label: 'وجه البطاقة', result: idFrontVerification },
              { label: 'خلف البطاقة', result: idBackVerification },
              { label: 'الصورة الشخصية', result: selfieVerification },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>{item.label}</span>
                {item.result && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold" style={{
                      color: item.result.confidence >= 70 ? '#10B981' : item.result.confidence >= 50 ? '#F59E0B' : '#EF4444'
                    }}>
                      {item.result.confidence}%
                    </span>
                    {item.result.isValid && item.result.confidence >= 70 ? (
                      <CheckCircle2 size={12} color="#10B981" />
                    ) : item.result.confidence >= 50 ? (
                      <AlertTriangle size={12} color="#F59E0B" />
                    ) : (
                      <X size={12} color="#EF4444" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </motion.div>

          <button
            onClick={() => setActiveScreen('main')}
            className="mt-6 px-8 py-3 rounded-2xl text-sm font-bold text-white"
            style={primaryBtnStyle(true)}
          >
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN KYC FLOW
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: isDark ? '#1A0A0E' : '#F5F5F5' }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('main')}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isDark ? '#3D0F10' : '#F0F0F0' }}
          >
            <ArrowRight size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            التحقق من الهوية
          </h1>
          <div className="mr-auto flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: 'rgba(92,26,27,0.08)' }}>
            <Sparkles size={12} color="#5C1A1B" />
            <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>AI</span>
          </div>
        </div>

        <KYCStatusBanner />
      </div>

      {/* Progress Bar */}
      <div className="px-5 mt-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? '#3D0F10' : '#EEE' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: i < step
                      ? 'linear-gradient(90deg, #5C1A1B, #C41E3A)'
                      : 'transparent',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: i < step ? '100%' : '0%' }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>
            {stepLabels[step - 1]}
          </span>
          <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
            {step}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-6"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={previewImage} alt="معاينة" className="w-full rounded-2xl" />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X size={16} color="#FFF" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps Content */}
      <div className="flex-1 px-5 mt-4 overflow-y-auto pb-4">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ─── Step 1: Personal Info ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(92,26,27,0.08)', border: '1px solid rgba(92,26,27,0.15)' }}
                >
                  <FileText size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  البيانات الشخصية
                </h3>
                <p className="text-xs text-center mt-1 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  تأكد من صحة بياناتك الشخصية
                </p>
              </div>

              {/* Card Type */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  نوع البطاقة
                </label>
                <div className="space-y-2">
                  {cardTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setCardType(type)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                      style={{
                        background: cardType === type ? 'rgba(92,26,27,0.08)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        border: cardType === type ? '2px solid #5C1A1B' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: cardType === type ? '#5C1A1B' : isDark ? '#555' : '#CCC' }}
                      >
                        {cardType === type && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#5C1A1B' }} />}
                      </div>
                      <span className="text-sm font-medium" style={{ color: cardType === type ? '#5C1A1B' : isDark ? '#FFF' : '#1a1a1a' }}>
                        {type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Number */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  رقم البطاقة
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                  <CreditCard size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input
                    type="text"
                    placeholder="رقم البطاقة"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Issued At */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  مكان الإصدار
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                  <MapPin size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input
                    type="text"
                    placeholder="مكان إصدار البطاقة"
                    value={cardIssuedAt}
                    onChange={(e) => setCardIssuedAt(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
              </div>

              {/* Governorate */}
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  المحافظة
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {governorates.map((gov) => (
                    <button
                      key={gov}
                      onClick={() => setGovernorate(gov)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                      style={{
                        background: governorate === gov ? 'rgba(92,26,27,0.08)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                        border: governorate === gov ? '2px solid #5C1A1B' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: governorate === gov ? '#5C1A1B' : isDark ? '#555' : '#CCC' }}
                      >
                        {governorate === gov && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#5C1A1B' }} />}
                      </div>
                      <span className="text-sm font-medium" style={{ color: governorate === gov ? '#5C1A1B' : isDark ? '#FFF' : '#1a1a1a' }}>
                        {gov}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: ID Front Upload ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(92,26,27,0.08)', border: '1px solid rgba(92,26,27,0.15)' }}
                >
                  <CreditCard size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  وجه البطاقة الشخصية
                </h3>
                <p className="text-xs text-center mt-1 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  ارفع صورة واضحة للوجه الأمامي لبطاقة التعريف
                </p>
              </div>

              <ImageUpload
                onUploadComplete={handleIdFrontUpload}
                onUploadProgress={setIdFrontProgress}
                onError={(err) => showToast('error', 'خطأ', err)}
                storagePath={`kyc/${user?.id || 'unknown'}`}
                label="وجه البطاقة الشخصية"
                hint="تأكد من وضوح الصورة والنص المكتوب"
                accept="image/*"
                maxSizeMB={10}
                preview={idFrontUrl || undefined}
              />

              <VerificationBadge status={idFrontStatus} onReVerify={() => reVerify('id_front')} />
              <VerificationChecks verification={idFrontVerification} />
            </motion.div>
          )}

          {/* ─── Step 3: ID Back Upload ─── */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(92,26,27,0.08)', border: '1px solid rgba(92,26,27,0.15)' }}
                >
                  <ScanLine size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  خلف البطاقة الشخصية
                </h3>
                <p className="text-xs text-center mt-1 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  ارفع صورة واضحة للوجه الخلفي مع الباركود
                </p>
              </div>

              <ImageUpload
                onUploadComplete={handleIdBackUpload}
                onUploadProgress={setIdBackProgress}
                onError={(err) => showToast('error', 'خطأ', err)}
                storagePath={`kyc/${user?.id || 'unknown'}`}
                label="خلف البطاقة الشخصية"
                hint="تأكد من وضوح الباركود والنص"
                accept="image/*"
                maxSizeMB={10}
                preview={idBackUrl || undefined}
              />

              <VerificationBadge status={idBackStatus} onReVerify={() => reVerify('id_back')} />
              <VerificationChecks verification={idBackVerification} />
            </motion.div>
          )}

          {/* ─── Step 4: Selfie Upload ─── */}
          {step === 4 && (
            <motion.div
              key="step4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(92,26,27,0.08)', border: '1px solid rgba(92,26,27,0.15)' }}
                >
                  <UserCheck size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  صورة شخصية
                </h3>
                <p className="text-xs text-center mt-1 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  التقط صورة شخصية واضحة (سيلفي) مع إضاءة جيدة
                </p>
              </div>

              <ImageUpload
                onUploadComplete={handleSelfieUpload}
                onUploadProgress={setSelfieProgress}
                onError={(err) => showToast('error', 'خطأ', err)}
                storagePath={`kyc/${user?.id || 'unknown'}`}
                label="الصورة الشخصية"
                hint="تأكد من نظرك للكاميرا وإضاءة جيدة"
                accept="image/*"
                maxSizeMB={10}
                circular
                preview={selfieUrl || undefined}
              />

              <VerificationBadge status={selfieStatus} onReVerify={() => reVerify('selfie')} />
              <VerificationChecks verification={selfieVerification} />
            </motion.div>
          )}

          {/* ─── Step 5: AI Verification Results Summary ─── */}
          {step === 5 && (
            <motion.div
              key="step5"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(92,26,27,0.08)', border: '1px solid rgba(92,26,27,0.15)' }}
                >
                  <Brain size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  نتائج التحقق الذكي
                </h3>
                <p className="text-xs text-center mt-1 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  ملخص نتائج التحقق بالذكاء الاصطناعي
                </p>
              </div>

              {/* Overall Score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center p-5 rounded-2xl"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                }}
              >
                <div className="relative w-24 h-24 mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={isDark ? '#3D0F10' : '#EEE'}
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={(() => {
                        const avg = Math.round(
                          ((idFrontVerification?.confidence || 0) +
                           (idBackVerification?.confidence || 0) +
                           (selfieVerification?.confidence || 0)) / 3
                        );
                        return avg >= 70 ? '#10B981' : avg >= 50 ? '#F59E0B' : '#EF4444';
                      })()}
                      strokeWidth="3"
                      strokeDasharray={`${Math.round(
                        ((idFrontVerification?.confidence || 0) +
                         (idBackVerification?.confidence || 0) +
                         (selfieVerification?.confidence || 0)) / 3
                      )}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {Math.round(
                        ((idFrontVerification?.confidence || 0) +
                         (idBackVerification?.confidence || 0) +
                         (selfieVerification?.confidence || 0)) / 3
                      )}%
                    </span>
                  </div>
                </div>
                <p className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>
                  نسبة التحقق الإجمالية
                </p>
              </motion.div>

              {/* Individual Results */}
              {[
                { label: 'وجه البطاقة', icon: <CreditCard size={18} color="#5C1A1B" />, verification: idFrontVerification, status: idFrontStatus, docType: 'id_front' as const },
                { label: 'خلف البطاقة', icon: <ScanLine size={18} color="#5C1A1B" />, verification: idBackVerification, status: idBackStatus, docType: 'id_back' as const },
                { label: 'الصورة الشخصية', icon: <UserCheck size={18} color="#5C1A1B" />, verification: selfieVerification, status: selfieStatus, docType: 'selfie' as const },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.08)' }}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          {item.label}
                        </p>
                        <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                          {item.verification?.overallAssessment || 'لم يتم التحقق'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.verification && (
                        <span className="text-sm font-bold" style={{
                          color: item.verification.confidence >= 70 ? '#10B981' :
                                 item.verification.confidence >= 50 ? '#F59E0B' : '#EF4444'
                        }}>
                          {item.verification.confidence}%
                        </span>
                      )}
                      {item.status === 'success' && <CheckCircle2 size={18} color="#10B981" />}
                      {item.status === 'warning' && <AlertTriangle size={18} color="#F59E0B" />}
                      {item.status === 'failed' && <X size={18} color="#EF4444" />}
                      {item.status === 'verifying' && <Loader2 size={18} className="animate-spin" color="#5C1A1B" />}
                      {item.status === 'error' && <AlertCircle size={18} color="#EF4444" />}
                      {item.status === 'idle' && <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: isDark ? '#555' : '#CCC' }} />}
                    </div>
                  </div>

                  {/* Sub-checks */}
                  {item.verification?.checks && item.verification.checks.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {item.verification.checks.map((check) => {
                        const status = getCheckStatus(check.passed, check.confidence);
                        return (
                          <div key={check.name} className="flex items-center gap-2 text-xs">
                            {status.icon}
                            <span style={{ color: isDark ? '#AAA' : '#888' }}>{check.label}</span>
                            <span className="mr-auto text-[10px]" style={{ color: isDark ? '#666' : '#BBB' }}>
                              {check.confidence}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Re-verify button */}
                  {(item.status === 'warning' || item.status === 'failed' || item.status === 'error') && (
                    <button
                      onClick={() => reVerify(item.docType)}
                      className="mt-2 flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(92,26,27,0.08)', color: '#5C1A1B' }}
                    >
                      <RotateCcw size={10} />
                      إعادة التحقق
                    </button>
                  )}
                </motion.div>
              ))}

              {/* Note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-2 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
              >
                <AlertTriangle size={16} color="#F59E0B" className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold" style={{ color: '#F59E0B' }}>ملاحظة</p>
                  <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }}>
                    التحقق بالذكاء الاصطناعي استرشادي فقط. سيتم مراجعة المستندات يدوياً من قبل الإدارة.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── Step 6: Submit for Manual Review ─── */}
          {step === 6 && (
            <motion.div
              key="step6"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(92,26,27,0.08)', border: '1px solid rgba(92,26,27,0.15)' }}
                >
                  <ShieldCheck size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  إرسال الطلب
                </h3>
                <p className="text-xs text-center mt-1 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  تأكد من صحة البيانات قبل الإرسال
                </p>
              </div>

              {/* Summary Card */}
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{
                  ...glassCardStyle,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} color="#5C1A1B" />
                  <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    بياناتك
                  </span>
                </div>

                {[
                  { label: 'نوع البطاقة', value: cardType },
                  { label: 'رقم البطاقة', value: cardNumber, dir: 'ltr' as const },
                  { label: 'مكان الإصدار', value: cardIssuedAt },
                  { label: 'المحافظة', value: governorate },
                ].map((item, i, arr) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>{item.label}</span>
                      <span className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir={item.dir}>
                        {item.value}
                      </span>
                    </div>
                    {i < arr.length - 1 && <div className="h-px mt-2" style={{ background: isDark ? '#2A2A2A' : '#F0F0F0' }} />}
                  </div>
                ))}
              </div>

              {/* Documents Summary */}
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{
                  ...glassCardStyle,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Camera size={16} color="#5C1A1B" />
                  <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    المستندات
                  </span>
                </div>

                {[
                  { label: 'وجه البطاقة', uploaded: !!idFrontUrl, verification: idFrontVerification },
                  { label: 'خلف البطاقة', uploaded: !!idBackUrl, verification: idBackVerification },
                  { label: 'الصورة الشخصية', uploaded: !!selfieUrl, verification: selfieVerification },
                ].map((item, i, arr) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.uploaded ? (
                          <CheckCircle2 size={14} color="#10B981" />
                        ) : (
                          <X size={14} color="#EF4444" />
                        )}
                        <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.verification && (
                          <span className="text-[10px] font-bold" style={{
                            color: item.verification.confidence >= 70 ? '#10B981' :
                                   item.verification.confidence >= 50 ? '#F59E0B' : '#EF4444'
                          }}>
                            {item.verification.confidence}%
                          </span>
                        )}
                        <span className="text-xs font-medium" style={{ color: item.uploaded ? '#10B981' : '#EF4444' }}>
                          {item.uploaded ? 'تم الرفع' : 'لم يتم الرفع'}
                        </span>
                      </div>
                    </div>
                    {i < arr.length - 1 && <div className="h-px mt-2" style={{ background: isDark ? '#2A2A2A' : '#F0F0F0' }} />}
                  </div>
                ))}
              </div>

              {/* AI Verification Note */}
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: 'rgba(92,26,27,0.04)', border: '1px solid rgba(92,26,27,0.1)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(92,26,27,0.08)' }}>
                  <Brain size={18} color="#5C1A1B" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#5C1A1B' }}>تحقق ذكي</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                    سيتم مراجعة المستندات يدوياً بجانب نتيجة الذكاء الاصطناعي
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl mt-4"
            style={{ background: 'rgba(92,26,27,0.1)' }}
          >
            <AlertCircle size={16} color="#5C1A1B" />
            <p className="text-xs" style={{ color: '#5C1A1B' }}>{error}</p>
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-5 pb-6 pt-3" style={{
        background: isDark ? 'linear-gradient(to top, #1A0A0E 60%, transparent)' : 'linear-gradient(to top, #F5F5F5 60%, transparent)',
      }}>
        {step < totalSteps ? (
          <button
            onClick={() => goToStep(step + 1)}
            disabled={!canProceed()}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={primaryBtnStyle(canProceed())}
          >
            <span>التالي</span>
            <ArrowLeft size={16} strokeWidth={1.5} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={primaryBtnStyle(true)}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>إرسال للمراجعة</span>
              </>
            )}
          </button>
        )}

        {step > 1 && (
          <button
            onClick={() => goToStep(step - 1)}
            className="w-full py-3 mt-2 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
            style={{ color: isDark ? '#AAA' : '#888' }}
          >
            <ArrowRight size={16} strokeWidth={1.5} />
            <span>السابق</span>
          </button>
        )}
      </div>
    </div>
  );
}
