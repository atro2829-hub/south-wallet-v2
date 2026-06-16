'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOGO_BASE64 } from '@/lib/logo';
import { useAppStore } from '@/lib/store';
import { Fingerprint, Delete } from 'lucide-react';
import { authenticateWithBiometricDetailed, isBiometricAvailable, isBiometricEnabledForUser } from '@/lib/biometric';

interface PinScreenProps {
  onUnlock: () => void;
}

export default function PinScreen({ onUnlock }: PinScreenProps) {
  const { pinCode, setPinCode, biometricEnabled, setBiometricEnabled, user } = useAppStore();
  const isSettingPin = !pinCode;

  const [enteredPin, setEnteredPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [shouldShowBiometric, setShouldShowBiometric] = useState(false);

  // On mount, check if biometric is enabled for this user from localStorage
  // This ensures biometric persists even after logout/re-login
  useEffect(() => {
    if (user?.id && pinCode) {
      const enabled = isBiometricEnabledForUser(user.id);
      if (enabled && !biometricEnabled) {
        setBiometricEnabled(true);
      }
      setShouldShowBiometric(enabled);
    } else {
      setShouldShowBiometric(biometricEnabled);
    }
  }, [user?.id, pinCode, biometricEnabled, setBiometricEnabled]);

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (shouldShowBiometric && pinCode && !isSettingPin && !biometricLoading) {
      const timer = setTimeout(() => {
        handleBiometric();
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowBiometric, pinCode, isSettingPin]);

  const pinLength = 4;
  const currentPin = isConfirmStep ? confirmPin : enteredPin;

  const handleDigitPress = useCallback((digit: string) => {
    setError('');
    if (currentPin.length >= pinLength) return;

    const newPin = currentPin + digit;

    if (isConfirmStep) {
      setConfirmPin(newPin);
    } else {
      setEnteredPin(newPin);
    }

    // Auto-submit when full
    if (newPin.length === pinLength) {
      setTimeout(() => {
        if (isSettingPin) {
          if (!isConfirmStep) {
            // First step of setting PIN - move to confirmation
            setIsConfirmStep(true);
          } else {
            // Confirm step of setting PIN
            if (newPin === enteredPin) {
              setPinCode(newPin);
              onUnlock();
            } else {
              setError('رمز PIN غير متطابق');
              setConfirmPin('');
              setShakeKey(prev => prev + 1);
            }
          }
        } else {
          // Verifying existing PIN
          if (newPin === pinCode) {
            onUnlock();
          } else {
            setError('رمز PIN غير صحيح');
            if (isConfirmStep) {
              setConfirmPin('');
            } else {
              setEnteredPin('');
            }
            setShakeKey(prev => prev + 1);
          }
        }
      }, 150);
    }
  }, [currentPin, isConfirmStep, isSettingPin, enteredPin, pinCode, setPinCode, onUnlock]);

  const handleBackspace = useCallback(() => {
    setError('');
    if (currentPin.length === 0) return;

    if (isConfirmStep) {
      setConfirmPin(prev => prev.slice(0, -1));
    } else {
      setEnteredPin(prev => prev.slice(0, -1));
    }
  }, [currentPin, isConfirmStep]);

  const handleBiometric = useCallback(async () => {
    if (biometricLoading) return;
    setBiometricLoading(true);
    try {
      // Check if biometric is available and enabled
      const available = await isBiometricAvailable();
      if (!available) {
        setError('البصمة غير متاحة على هذا الجهاز');
        return;
      }

      // Check biometric from both store and localStorage (per-user)
      const isPerUserEnabled = user?.id ? isBiometricEnabledForUser(user.id) : biometricEnabled;
      if (!isPerUserEnabled && !biometricEnabled) {
        setError('البصمة غير مفعّلة. فعّلها من الإعدادات');
        return;
      }

      // Authenticate with biometric — use detailed version for better error messages
      const result = await authenticateWithBiometricDetailed('يرجى التحقق بالبصمة للدخول');
      if (result.success) {
        onUnlock();
      } else {
        setError(result.errorMessage || 'فشل التحقق بالبصمة');
      }
    } catch {
      setError('حدث خطأ في التحقق بالبصمة');
    } finally {
      setBiometricLoading(false);
    }
  }, [pinCode, onUnlock, biometricEnabled, biometricLoading, user?.id]);

  const title = isSettingPin
    ? isConfirmStep
      ? 'تأكيد رمز PIN'
      : 'تعيين رمز PIN'
    : 'أدخل رمز PIN';

  const subtitle = isSettingPin
    ? isConfirmStep
      ? 'أعد إدخال الرمز للتأكيد'
      : 'اختر رمزاً مكوناً من 4 أرقام'
    : 'أدخل الرمز للدخول إلى المحفظة';

  const displayDots = isConfirmStep ? confirmPin : enteredPin;

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#0F0F0F' }}
    >
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(92,26,27,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Glassmorphism overlay circles */}
      <div
        className="absolute top-20 right-10 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'rgba(92,26,27,0.04)', filter: 'blur(40px)' }}
      />
      <div
        className="absolute bottom-40 left-8 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: 'rgba(92,26,27,0.03)', filter: 'blur(30px)' }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-6"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)',
            boxShadow: '0 8px 24px rgba(92,26,27,0.3)',
          }}
        >
          <img
            src={LOGO_BASE64}
            alt="محفظة الجنوب"
            className="w-10 h-10 object-contain"
            draggable={false}
          />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h2
        className="text-xl font-bold text-white relative z-10 mb-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {title}
      </motion.h2>

      <motion.p
        className="text-sm relative z-10 mb-8"
        style={{ color: 'rgba(255,255,255,0.4)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {subtitle}
      </motion.p>

      {/* PIN Dots */}
      <motion.div
        key={shakeKey}
        className="flex gap-4 mb-8 relative z-10"
        animate={shakeKey > 0 ? {
          x: [0, -10, 10, -10, 10, -5, 5, 0],
        } : {}}
        transition={{ duration: 0.5 }}
      >
        {Array.from({ length: pinLength }).map((_, i) => (
          <motion.div
            key={i}
            className="w-4 h-4 rounded-full"
            style={{
              border: i < displayDots.length ? 'none' : '2px solid rgba(255,255,255,0.2)',
              background: i < displayDots.length ? '#5C1A1B' : 'transparent',
              boxShadow: i < displayDots.length ? '0 0 12px rgba(92,26,27,0.5)' : 'none',
            }}
            animate={i < displayDots.length ? {
              scale: [1, 1.2, 1],
            } : {}}
            transition={{ duration: 0.2 }}
          />
        ))}
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-xs mb-4 relative z-10"
            style={{ color: '#FF4444' }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Number Pad */}
      <motion.div
        className="grid grid-cols-3 gap-3 px-12 relative z-10 w-full max-w-xs"
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
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <Delete size={22} strokeWidth={1.5} color="rgba(255,255,255,0.5)" />
              </button>
            );
          }

          return (
            <button
              key={digit}
              onClick={() => handleDigitPress(digit)}
              className="w-full aspect-square rounded-2xl flex items-center justify-center text-xl font-bold text-white transition-all active:scale-90 card-press"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {digit}
            </button>
          );
        })}
      </motion.div>

      {/* Biometric button — show if biometric is enabled for this user (from localStorage or store) */}
      {pinCode && (biometricEnabled || shouldShowBiometric) && (
        <motion.button
          className="mt-6 flex items-center gap-2 px-5 py-3 rounded-2xl relative z-10"
          style={{ background: (biometricEnabled || shouldShowBiometric) ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.05)' }}
          onClick={handleBiometric}
          disabled={biometricLoading}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95 }}
        >
          {biometricLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full"
            />
          ) : (
            <Fingerprint size={20} strokeWidth={1.5} color={(biometricEnabled || shouldShowBiometric) ? '#8B5CF6' : '#5C1A1B'} />
          )}
          <span className="text-sm" style={{ color: (biometricEnabled || shouldShowBiometric) ? '#8B5CF6' : 'rgba(255,255,255,0.5)' }}>
            بصمة الإصبع
          </span>
        </motion.button>
      )}
    </div>
  );
}
