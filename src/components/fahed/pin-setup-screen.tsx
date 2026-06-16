'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Fingerprint, Lock, Trash2, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useTheme } from 'next-themes';
import { authenticateWithBiometricDetailed, isBiometricAvailable } from '@/lib/biometric';

export default function PinSetupScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, pinCode, setPinCode, setActiveScreen, setActiveTab } = useAppStore();
  const [mode, setMode] = useState<'options' | 'create' | 'change' | 'remove-confirm'>('options');
  const [enteredPin, setEnteredPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [removeConfirmStep, setRemoveConfirmStep] = useState(false);
  const [biometricAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const pinLength = 4;
  const currentPin = isConfirmStep ? confirmPin : enteredPin;
  const hasPin = !!pinCode;

  const handleDigitPress = useCallback((digit: string) => {
    setError('');
    if (currentPin.length >= pinLength) return;

    const newPin = currentPin + digit;

    if (isConfirmStep) {
      setConfirmPin(newPin);
    } else {
      setEnteredPin(newPin);
    }

    if (newPin.length === pinLength) {
      setTimeout(() => {
        if (!isConfirmStep) {
          setIsConfirmStep(true);
        } else {
          if (newPin === enteredPin) {
            setPinCode(newPin);
            setSuccess('تم تعيين رمز PIN بنجاح');
            setTimeout(() => {
              setActiveScreen('main');
              setActiveTab('account');
            }, 1500);
          } else {
            setError('رمز PIN غير متطابق');
            setConfirmPin('');
            setShakeKey(prev => prev + 1);
          }
        }
      }, 150);
    }
  }, [currentPin, isConfirmStep, enteredPin, setPinCode, setActiveScreen, setActiveTab]);

  const handleBackspace = useCallback(() => {
    setError('');
    if (currentPin.length === 0) return;
    if (isConfirmStep) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setEnteredPin(prev => prev.slice(0, -1));
    }
  }, [currentPin, isConfirmStep]);

  const handleRemovePin = async () => {
    if (!removeConfirmStep) {
      setRemoveConfirmStep(true);
      return;
    }
    // Require biometric or just remove
    if (biometricAvailable) {
      const result = await authenticateWithBiometricDetailed('يرجى التحقق لإزالة رمز PIN');
      if (!result.success) {
        setError(result.errorMessage || 'فشل التحقق');
        setRemoveConfirmStep(false);
        return;
      }
    }
    setPinCode('');
    setSuccess('تم إزالة رمز PIN');
    setTimeout(() => {
      setActiveScreen('main');
      setActiveTab('account');
    }, 1500);
  };

  const handleBack = () => {
    if (mode === 'options') {
      setActiveScreen('main');
      setActiveTab('account');
    } else {
      setMode('options');
      setEnteredPin('');
      setConfirmPin('');
      setIsConfirmStep(false);
      setError('');
      setSuccess('');
    }
  };

  const title = mode === 'create' || mode === 'change'
    ? isConfirmStep ? 'تأكيد رمز PIN' : hasPin ? 'تغيير رمز PIN' : 'تعيين رمز PIN'
    : 'إزالة رمز PIN';

  const subtitle = mode === 'create' || mode === 'change'
    ? isConfirmStep ? 'أعد إدخال الرمز للتأكيد' : 'اختر رمزاً مكوناً من 4 أرقام'
    : 'سيتم إزالة رمز PIN';

  const displayDots = isConfirmStep ? confirmPin : enteredPin;
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ArrowRight size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            رقم التعريف الشخصي
          </h1>
        </div>
      </div>

      {/* Options Mode */}
      {mode === 'options' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-4 space-y-3"
        >
          {/* Current PIN Status */}
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{
              background: hasPin ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${hasPin ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`,
            }}
          >
            <Lock size={20} strokeWidth={1.5} color={hasPin ? '#10B981' : '#F59E0B'} />
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: hasPin ? '#10B981' : '#F59E0B' }}>
                {hasPin ? 'رمز PIN مفعّل' : 'رمز PIN غير مفعّل'}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#888' : '#999' }}>
                {hasPin ? 'يمكنك تغيير أو إزالة رمز PIN' : 'قم بتعيين رمز PIN لحماية التطبيق'}
              </p>
            </div>
          </div>

          {/* Set/Change PIN */}
          <button
            onClick={() => {
              setMode(hasPin ? 'change' : 'create');
              setEnteredPin('');
              setConfirmPin('');
              setIsConfirmStep(false);
              setError('');
              setSuccess('');
            }}
            className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(92,26,27,0.1)' }}
            >
              <Lock size={20} strokeWidth={1.5} color="#5C1A1B" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                {hasPin ? 'تغيير رمز PIN' : 'تعيين رمز PIN'}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#888' : '#999' }}>
                {hasPin ? 'تغيير الرمز الحالي برمز جديد' : 'تعيين رمز PIN مكون من 4 أرقام'}
              </p>
            </div>
          </button>

          {/* Remove PIN */}
          {hasPin && (
            <button
              onClick={() => {
                setMode('remove-confirm');
                setRemoveConfirmStep(false);
                setError('');
                setSuccess('');
              }}
              className="w-full rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-[0.98]"
              style={{
                background: isDark ? '#1A1A1A' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(220,38,38,0.1)' }}
              >
                <Trash2 size={20} strokeWidth={1.5} color="#DC2626" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm font-bold" style={{ color: '#DC2626' }}>إلغاء رمز PIN</p>
                <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#888' : '#999' }}>
                  إزالة حماية رمز PIN من التطبيق
                </p>
              </div>
            </button>
          )}
        </motion.div>
      )}

      {/* Remove PIN confirmation */}
      {mode === 'remove-confirm' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-4"
        >
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(220,38,38,0.1)' }}
            >
              <Trash2 size={28} strokeWidth={1.5} color="#DC2626" />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
              إلغاء رمز PIN
            </h3>
            <p className="text-xs mb-6" style={{ color: isDark ? '#888' : '#999' }}>
              {removeConfirmStep
                ? 'اضغط مرة أخرى للتأكيد'
                : 'هل أنت متأكد من إلغاء رمز PIN؟ سيتم إزالة الحماية من التطبيق'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: isDark ? '#2D2D2D' : '#F0F0F0', color: isDark ? '#FFF' : '#1a1a1a' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleRemovePin}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: '#DC2626' }}
              >
                تأكيد الإزالة
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* PIN Entry (create/change) */}
      {(mode === 'create' || mode === 'change') && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <motion.h2
            className="text-xl font-bold mb-1"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {title}
          </motion.h2>

          <motion.p
            className="text-sm mb-8"
            style={{ color: isDark ? '#888' : '#AAA' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {subtitle}
          </motion.p>

          {/* PIN Dots */}
          <motion.div
            key={shakeKey}
            className="flex gap-4 mb-8"
            animate={shakeKey > 0 ? { x: [0, -10, 10, -10, 10, -5, 5, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            {Array.from({ length: pinLength }).map((_, i) => (
              <motion.div
                key={i}
                className="w-4 h-4 rounded-full"
                style={{
                  border: i < displayDots.length ? 'none' : '2px solid rgba(92,26,27,0.3)',
                  background: i < displayDots.length ? '#5C1A1B' : 'transparent',
                  boxShadow: i < displayDots.length ? '0 0 12px rgba(92,26,27,0.5)' : 'none',
                }}
                animate={i < displayDots.length ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.2 }}
              />
            ))}
          </motion.div>

          {/* Error/Success */}
          <AnimatePresence>
            {error && (
              <motion.p
                className="text-xs mb-4"
                style={{ color: '#FF4444' }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p
                className="text-xs mb-4"
                style={{ color: '#10B981' }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                {success}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Number Pad */}
          <motion.div
            className="grid grid-cols-3 gap-3 px-12 w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {digits.map((digit, i) => {
              if (digit === '') {
                return <div key={`empty-${i}`} className="w-full aspect-square" />;
              }
              if (digit === 'backspace') {
                return (
                  <button
                    key="backspace"
                    onClick={handleBackspace}
                    className="w-full aspect-square rounded-2xl flex items-center justify-center transition-all active:scale-90"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                  >
                    <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#999', fontSize: '20px' }}>⌫</span>
                  </button>
                );
              }
              return (
                <button
                  key={digit}
                  onClick={() => handleDigitPress(digit)}
                  className="w-full aspect-square rounded-2xl flex items-center justify-center text-xl font-bold transition-all active:scale-90"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    color: isDark ? '#FFF' : '#1a1a1a',
                  }}
                >
                  {digit}
                </button>
              );
            })}
          </motion.div>
        </div>
      )}
    </div>
  );
}
