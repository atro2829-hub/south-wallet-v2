'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, ShieldCheck, Phone, Heart, CreditCard, X, KeyRound, Fingerprint, CheckCircle2, FileText, Shield, MessageCircle, Facebook, Twitter, Instagram, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { auth, database } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, get, update, onValue } from 'firebase/database';
import { generateUserId, generateUniqueUserId } from '@/lib/utils';
import {
  isBiometricAvailable,
  isBiometricLoginEnabled,
  authenticateWithBiometricDetailed,
  getBiometricCredentials,
  checkBiometricAvailability,
  syncBiometricPreference,
  setLastLoggedInUser,
  storeBiometricCredentials,
} from '@/lib/biometric';

type AuthStep = 'login' | 'register-step1' | 'register-step2' | 'register-step3' | 'password-recovery';

interface AuthBanner {
  id: string;
  imageUrl: string;
  description: string;
}

interface SocialLinksData {
  whatsapp: string;
  facebook: string;
  twitter: string;
  instagram: string;
  telegram: string;
}

// Yemen flag indicator
function YemenFlagIndicator() {
  return (
    <div className="flex flex-col w-6 h-4 rounded-sm overflow-hidden shrink-0">
      <div className="flex-1 bg-red-600" />
      <div className="flex-1 bg-white" />
      <div className="flex-1 bg-black" />
    </div>
  );
}

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'الشخصية' },
    { num: 2, label: 'الحساب' },
    { num: 3, label: 'الهاتف' },
  ];

  return (
    <div className="flex items-center justify-center gap-0 my-4">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{
                scale: currentStep >= step.num ? 1 : 0.8,
                backgroundColor: currentStep >= step.num ? '#5C1A1B' : 'transparent',
                borderColor: currentStep >= step.num ? '#5C1A1B' : '#CCC',
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
              style={{ borderColor: currentStep >= step.num ? '#5C1A1B' : '#CCC' }}
            >
              {currentStep > step.num ? (
                <CheckCircle2 size={16} color="#FFF" />
              ) : (
                <span className="text-xs font-bold" style={{ color: currentStep >= step.num ? '#FFF' : '#999' }}>
                  {step.num}
                </span>
              )}
            </motion.div>
            <span className="text-[9px] mt-1 font-medium" style={{ color: currentStep >= step.num ? '#5C1A1B' : '#999' }}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-10 h-0.5 mx-1 mt-[-12px]" style={{ background: currentStep > step.num ? '#5C1A1B' : '#DDD' }} />
          )}
        </div>
      ))}
    </div>
  );
}

// Banner Carousel Component
function BannerCarousel({ isDark }: { isDark: boolean }) {
  const [banners, setBanners] = useState<AuthBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load banners from Firebase
  useEffect(() => {
    const bannersRef = ref(database, 'adminSettings/authBanners');
    const unsubscribe = onValue(bannersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const bannerList: AuthBanner[] = Object.entries(data)
          .map(([id, val]: [string, any]) => ({
            id,
            imageUrl: val?.imageUrl ?? '',
            description: val?.description ?? '',
          }))
          .filter((b) => b.imageUrl);
        setBanners(bannerList);
        setCurrentIndex(0);
      } else {
        setBanners([]);
      }
    }, () => {
      setBanners([]);
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll every 4 seconds
  const startAutoScroll = useCallback(() => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    autoScrollRef.current = setInterval(() => {
      setCurrentIndex((prev) => (banners.length > 0 ? (prev + 1) % banners.length : 0));
    }, 4000);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length > 1) {
      startAutoScroll();
    }
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [banners.length, startAutoScroll]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && banners.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }
    if (isRightSwipe && banners.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
    startAutoScroll();
  };

  const goTo = (index: number) => {
    setCurrentIndex(index);
    startAutoScroll();
  };

  if (banners.length === 0) {
    return (
      <div className="w-full px-4 pt-4">
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            height: '190px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(92,26,27,0.12) 0%, rgba(26,26,26,0.6) 100%)'
              : 'linear-gradient(135deg, rgba(92,26,27,0.06) 0%, rgba(255,255,255,0.8) 100%)',
          }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-2" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(92,26,27,0.08)' }}>
              <img
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23E60000' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M3 9h18'/%3E%3Cpath d='M9 21V9'/%3E%3C/svg%3E"
                alt=""
                className="w-6 h-6"
              />
            </div>
            <p className="text-xs font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }}>
              محفظة الجنوب
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pt-4">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{
          height: '190px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(92,26,27,0.08) 0%, rgba(26,26,26,0.9) 100%)'
            : 'linear-gradient(135deg, rgba(92,26,27,0.04) 0%, rgba(255,255,255,0.9) 100%)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <img
              src={banners[currentIndex]?.imageUrl}
              alt={banners[currentIndex]?.description || 'Banner'}
              className="w-full h-full object-cover rounded-2xl"
            />
            {banners[currentIndex]?.description && (
              <div
                className="absolute bottom-0 left-0 right-0 p-3 rounded-b-2xl"
                style={{
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                }}
              >
                <p className="text-[11px] text-white/90 font-medium line-clamp-2">
                  {banners[currentIndex].description}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows (desktop) */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => goTo((currentIndex - 1 + banners.length) % banners.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-opacity opacity-60 hover:opacity-100"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
            >
              <ChevronRight size={14} color="#FFF" />
            </button>
            <button
              onClick={() => goTo((currentIndex + 1) % banners.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-opacity opacity-60 hover:opacity-100"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
            >
              <ChevronLeft size={14} color="#FFF" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: currentIndex === index ? '18px' : '6px',
                height: '6px',
                background: currentIndex === index
                  ? '#5C1A1B'
                  : isDark
                    ? 'rgba(255,255,255,0.2)'
                    : 'rgba(0,0,0,0.15)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Social Links Component
function SocialLinksBar({ isDark }: { isDark: boolean }) {
  const [socialLinks, setSocialLinks] = useState<SocialLinksData>({
    whatsapp: '',
    facebook: '',
    twitter: '',
    instagram: '',
    telegram: '',
  });

  useEffect(() => {
    // First try adminSettings/socialLinks
    const socialLinksRef = ref(database, 'adminSettings/socialLinks');
    const unsubSocial = onValue(socialLinksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSocialLinks({
          whatsapp: data.whatsapp || '',
          facebook: data.facebook || data.facebookLink || '',
          twitter: data.twitter || data.twitterLink || '',
          instagram: data.instagram || data.instagramLink || '',
          telegram: data.telegram || data.telegramLink || '',
        });
      } else {
        // Fallback: read from adminSettings/appSettings
        const appSettingsRef = ref(database, 'adminSettings/appSettings');
        get(appSettingsRef).then((appSnapshot) => {
          if (appSnapshot.exists()) {
            const data = appSnapshot.val();
            setSocialLinks({
              whatsapp: data.supportWhatsApp || '',
              facebook: data.facebookLink || '',
              twitter: data.twitterLink || '',
              instagram: data.instagramLink || '',
              telegram: data.telegramLink || '',
            });
          }
        });
      }
    }, () => {
      // On error, try appSettings fallback
      const appSettingsRef = ref(database, 'adminSettings/appSettings');
      get(appSettingsRef).then((appSnapshot) => {
        if (appSnapshot.exists()) {
          const data = appSnapshot.val();
          setSocialLinks({
            whatsapp: data.supportWhatsApp || '',
            facebook: data.facebookLink || '',
            twitter: data.twitterLink || '',
            instagram: data.instagramLink || '',
            telegram: data.telegramLink || '',
          });
        }
      });
    });

    return () => unsubSocial();
  }, []);

  const socialItems = [
    { key: 'whatsapp' as const, icon: MessageCircle, label: 'WhatsApp', url: socialLinks.whatsapp },
    { key: 'facebook' as const, icon: Facebook, label: 'Facebook', url: socialLinks.facebook },
    { key: 'twitter' as const, icon: Twitter, label: 'Twitter', url: socialLinks.twitter },
    { key: 'instagram' as const, icon: Instagram, label: 'Instagram', url: socialLinks.instagram },
    { key: 'telegram' as const, icon: Send, label: 'Telegram', url: socialLinks.telegram },
  ].filter(item => item.url && item.url.trim() !== '');

  if (socialItems.length === 0) return null;

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex items-center justify-center gap-3 py-4 px-6">
      {socialItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => handleLinkClick(item.url)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-105"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}
            title={item.label}
            aria-label={item.label}
          >
            <Icon size={16} strokeWidth={1.5} color={isDark ? '#AAA' : '#888'} />
          </button>
        );
      })}
    </div>
  );
}

export default function AuthScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setUser, setBiometricEnabled, featureFlags } = useAppStore();

  const [step, setStep] = useState<AuthStep>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields - Step 1: Personal info
  const [regFirstName, setRegFirstName] = useState('');
  const [regSecondName, setRegSecondName] = useState('');
  const [regThirdName, setRegThirdName] = useState('');
  const [regFamilyName, setRegFamilyName] = useState('');
  const [regNationalId, setRegNationalId] = useState('');

  // Register fields - Step 2: Account info
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');

  // Register fields - Step 3: Phone
  const [regPhone, setRegPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // Password recovery fields
  const [recoveryNationalId, setRecoveryNationalId] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'input' | 'reset'>('input');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryUid, setRecoveryUid] = useState('');

  const inputStyle = {
    background: isDark ? '#1A1A1A' : '#F8F8F8',
    border: isDark ? '1px solid #333' : '1px solid #EEE',
    color: isDark ? '#FFF' : '#1a1a1a',
  };

  // Compute full name from parts
  const getFullName = () => {
    return [regFirstName, regSecondName, regThirdName, regFamilyName].filter(n => n.trim()).join(' ');
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const uid = userCredential.user.uid;
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const isAdminEmail = loginEmail.toLowerCase().includes('admin');
        let effectiveRole: 'user' | 'admin' | 'owner' = userData.role || 'user';
        if (effectiveRole === 'owner') {
          // Owner role is set in Firebase, keep it
        } else if (effectiveRole === 'admin' || isAdminEmail) {
          effectiveRole = 'admin';
          if (isAdminEmail && userData.role !== 'admin') {
            await update(ref(database, `users/${uid}`), { role: 'admin' });
          }
        }
        const fullName = [userData.firstName, userData.secondName, userData.thirdName, userData.familyName].filter((n: string) => n && n.trim()).join(' ') || userData.name || '';
        setUser({
          id: uid, email: userData.email || loginEmail, phone: userData.phone || '',
          name: fullName, firstName: userData.firstName || '', secondName: userData.secondName || '',
          thirdName: userData.thirdName || '', familyName: userData.familyName || '',
          nationalId: userData.nationalId || '', avatar: userData.avatar || '', role: effectiveRole,
          userId: userData.userId || '', kycStatus: userData.kycStatus || 'pending',
          isBlocked: userData.isBlocked || false, balanceYER: userData.balanceYER || 0,
          balanceSAR: userData.balanceSAR || 0, balanceUSD: userData.balanceUSD || 0,
          cardType: userData.cardType || '', cardNumber: userData.cardNumber || '',
          cardIssuedAt: userData.cardIssuedAt || '', governorate: userData.governorate || '',
          theme: userData.theme || 'light',
        });
        // Store last logged-in user for biometric persistence
        setLastLoggedInUser(uid);
        storeBiometricCredentials(uid, userData.email || loginEmail);
        // Sync biometric preference from Firebase
        const bioPref = await syncBiometricPreference(uid);
        setBiometricEnabled(bioPref);
      } else {
        const newUserId = await generateUniqueUserId(database);
        const isAdminEmail = loginEmail.toLowerCase().includes('admin');
        const newUserData = { email: loginEmail, phone: '', name: '', firstName: '', secondName: '', thirdName: '', familyName: '', nationalId: '', avatar: '', role: isAdminEmail ? 'admin' as const : 'user' as const, userId: newUserId, kycStatus: 'pending' as const, isBlocked: false, balanceYER: 0, balanceSAR: 0, balanceUSD: 0, cardType: '', cardNumber: '', cardIssuedAt: '', governorate: '', theme: 'light' as const };
        await update(ref(database), {
          [`users/${uid}`]: newUserData,
          [`userIds/${newUserId}`]: uid,
        });
        setUser({ id: uid, ...newUserData });
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/user-not-found') setError('الحساب غير موجود');
      else if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') setError('كلمة المرور غير صحيحة');
      else setError('حدث خطأ في تسجيل الدخول');
    } finally { setIsLoading(false); }
  };

  const handleRegisterStep1 = () => {
    if (!regFirstName.trim() || !regFamilyName.trim()) {
      setError('يرجى إدخال الاسم الأول واسم العائلة على الأقل');
      return;
    }
    if (!regNationalId.trim()) {
      setError('يرجى إدخال رقم البطاقة الشخصية');
      return;
    }
    if (regNationalId && (regNationalId.length < 6 || regNationalId.length > 20 || !/^\d+$/.test(regNationalId))) {
      setError('رقم البطاقة الشخصية يجب أن يكون أرقاماً فقط بين 6 إلى 20 رقم');
      return;
    }
    setError('');
    setStep('register-step2');
  };

  const handleRegisterStep2 = () => {
    if (!regEmail) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!regPassword) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }
    if (regPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError('كلمة المرور غير متطابقة');
      return;
    }
    setError('');
    setStep('register-step3');
  };

  const handleRegisterStep3 = async () => {
    if (!agreeTerms || !agreePrivacy) {
      setError('يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const uid = userCredential.user.uid;
      const newUserId = await generateUniqueUserId(database);
      const isAdminEmail = regEmail.toLowerCase().includes('admin');
      const fullName = getFullName();
      const userData = {
        email: regEmail,
        phone: regPhone ? `+967${regPhone}` : '',
        name: fullName,
        firstName: regFirstName.trim(),
        secondName: regSecondName.trim(),
        thirdName: regThirdName.trim(),
        familyName: regFamilyName.trim(),
        nationalId: regNationalId.trim(),
        avatar: '',
        role: isAdminEmail ? 'admin' as const : 'user' as const,
        userId: newUserId,
        kycStatus: 'pending' as const,
        isBlocked: false,
        balanceYER: 0,
        balanceSAR: 0,
        balanceUSD: 0,
        cardType: '',
        cardNumber: '',
        cardIssuedAt: '',
        governorate: '',
        theme: 'light' as const,
      };
      const firebaseUpdates: Record<string, unknown> = {
        [`users/${uid}`]: userData,
        [`userIds/${newUserId}`]: uid,
      };
      if (regPhone) {
        firebaseUpdates[`phones/P967${regPhone}`] = uid;
      }
      if (regNationalId.trim()) {
        firebaseUpdates[`nationalIds/${regNationalId.trim()}`] = uid;
      }
      await update(ref(database), firebaseUpdates);
      setUser({
        id: uid, email: regEmail, phone: regPhone ? `+967${regPhone}` : '',
        name: fullName, firstName: regFirstName.trim(), secondName: regSecondName.trim(),
        thirdName: regThirdName.trim(), familyName: regFamilyName.trim(),
        nationalId: regNationalId.trim(), avatar: '', role: isAdminEmail ? 'admin' : 'user',
        userId: newUserId, kycStatus: 'pending',
        isBlocked: false, balanceYER: 0, balanceSAR: 0, balanceUSD: 0,
        cardType: '', cardNumber: '',
        cardIssuedAt: '', governorate: '',
        theme: 'light',
      });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/email-already-in-use') setError('البريد الإلكتروني مسجل مسبقاً');
      else if (firebaseError.code === 'auth/weak-password') setError('كلمة المرور ضعيفة');
      else setError('حدث خطأ في التسجيل');
    } finally { setIsLoading(false); }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 9);
    setRegPhone(cleaned);
  };

  const handleNationalIdChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 20);
    setRegNationalId(cleaned);
  };

  // Password Recovery - Step 1: Find user by nationalId and email
  const handleRecoverySearch = async () => {
    if (!recoveryNationalId.trim() || !recoveryEmail.trim()) {
      setError('يرجى إدخال رقم البطاقة الشخصية والبريد الإلكتروني');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const nationalIdRef = ref(database, `nationalIds/${recoveryNationalId.trim()}`);
      const nidSnapshot = await get(nationalIdRef);
      if (!nidSnapshot.exists()) {
        setError('لا يوجد حساب مرتبط بهذا رقم البطاقة الشخصية');
        setIsLoading(false);
        return;
      }
      const uid = nidSnapshot.val();
      const userRef = ref(database, `users/${uid}`);
      const userSnapshot = await get(userRef);
      if (!userSnapshot.exists()) {
        setError('لم يتم العثور على الحساب');
        setIsLoading(false);
        return;
      }
      const userData = userSnapshot.val();
      if (userData.email?.toLowerCase() !== recoveryEmail.trim().toLowerCase()) {
        setError('البريد الإلكتروني لا يتطابق مع رقم البطاقة الشخصية');
        setIsLoading(false);
        return;
      }
      setRecoveryUid(uid);
      setRecoveryStep('reset');
      setError('');
    } catch {
      setError('حدث خطأ في البحث عن الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  // Password Recovery - Step 2: Send password reset email
  const handlePasswordReset = async () => {
    if (!recoveryNewPassword || recoveryNewPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setError('كلمة المرور غير متطابقة');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, recoveryEmail.trim());
      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
      setRecoveryStep('input');
      setRecoveryNationalId('');
      setRecoveryEmail('');
      setRecoveryNewPassword('');
      setRecoveryConfirmPassword('');
      setTimeout(() => {
        setStep('login');
        setLoginMode('login');
        setSuccess('');
      }, 3000);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/user-not-found') {
        setError('لم يتم العثور على حساب بهذا البريد');
      } else {
        setError('حدث خطأ في إرسال رابط إعادة التعيين');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Skeleton loading component
  const SkeletonPulse = () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 rounded-2xl" style={{ background: isDark ? '#222' : '#EEE' }} />
      <div className="h-12 rounded-2xl" style={{ background: isDark ? '#222' : '#EEE' }} />
      <div className="h-12 rounded-2xl w-3/4" style={{ background: isDark ? '#222' : '#EEE' }} />
    </div>
  );

  const btnPrimary = {
    background: 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)',
    boxShadow: '0 4px 16px rgba(92,26,27,0.3)',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Banner Carousel at the Top */}
      <BannerCarousel isDark={isDark} />

      {/* Mode Toggle */}
      {step !== 'password-recovery' && (
        <div className="flex items-center justify-center gap-3 pt-3 pb-2 px-6">
          {featureFlags.registrationEnabled && (
          <button
            onClick={() => { setLoginMode('register'); setStep('register-step1'); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all"
            style={{
              background: loginMode === 'register' ? 'rgba(92,26,27,0.1)' : 'transparent',
              border: loginMode === 'register' ? '1px solid rgba(92,26,27,0.3)' : '1px solid transparent',
            }}
          >
            <Heart size={16} strokeWidth={1.5} color={loginMode === 'register' ? '#5C1A1B' : (isDark ? '#555' : '#AAA')} fill={loginMode === 'register' ? '#5C1A1B' : 'none'} />
            <span className="text-xs font-medium" style={{ color: loginMode === 'register' ? '#5C1A1B' : (isDark ? '#555' : '#AAA') }}>تسجيل جديد</span>
          </button>
          )}
          <button
            onClick={() => { setLoginMode('login'); setStep('login'); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all"
            style={{
              background: loginMode === 'login' ? 'rgba(92,26,27,0.1)' : 'transparent',
              border: loginMode === 'login' ? '1px solid rgba(92,26,27,0.3)' : '1px solid transparent',
            }}
          >
            <User size={16} strokeWidth={1.5} color={loginMode === 'login' ? '#5C1A1B' : (isDark ? '#555' : '#AAA')} />
            <span className="text-xs font-medium" style={{ color: loginMode === 'login' ? '#5C1A1B' : (isDark ? '#555' : '#AAA') }}>تسجيل الدخول</span>
          </button>
        </div>
      )}

      {/* Form Area */}
      <div className="flex-1 px-6">
        <AnimatePresence mode="wait">
          {/* LOGIN STEP */}
          {step === 'login' && (
            <motion.div
              key="login"
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="space-y-4"
            >
              {/* Login Card */}
              <div className="rounded-2xl p-5" style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}` }}>
                <h2 className="text-lg font-bold mb-4 text-center" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  تسجيل الدخول
                </h2>

                {/* Email */}
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl mb-3" style={inputStyle}>
                  <Mail size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input type="email" placeholder="البريد الإلكتروني" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" autoComplete="email" />
                </div>

                {/* Password */}
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl mb-3" style={inputStyle}>
                  <Lock size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="كلمة المرور" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" autoComplete="current-password" />
                  <button onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} strokeWidth={1.5} color={isDark ? '#888' : '#AAA'} /> : <Eye size={18} strokeWidth={1.5} color="#5C1A1B" />}
                  </button>
                </div>

                {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center" style={{ color: '#5C1A1B' }}>{error}</motion.p>}
                {success && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center" style={{ color: '#10B981' }}>{success}</motion.p>}

                <button onClick={handleLogin} disabled={isLoading} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 mt-2" style={btnPrimary}>
                  {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <span>تسجيل الدخول</span>}
                </button>

                {/* Biometric login button */}
                {biometricAvailable && (
                  <button
                    onClick={async () => {
                      if (biometricLoading) return;
                      setBiometricLoading(true);
                      setError('');
                      try {
                        // Check if any user has biometric enabled on this device
                        // Look for stored biometric credentials
                        const storedCredStr = localStorage.getItem('biometric-cred-find');
                        let storedCred: { uid: string; email: string } | null = null;

                        // Try to find any stored biometric credential
                        for (let i = 0; i < localStorage.length; i++) {
                          const key = localStorage.key(i);
                          if (key?.startsWith('biometric-cred-')) {
                            try {
                              const parsed = JSON.parse(localStorage.getItem(key) || '');
                              if (parsed.uid && parsed.email) {
                                storedCred = parsed;
                                break;
                              }
                            } catch { /* ignore */ }
                          }
                        }

                        if (!storedCred) {
                          setError('لم يتم تفعيل البصمة لحسابك. فعّلها من الإعدادات أولاً');
                          setBiometricLoading(false);
                          return;
                        }

                        // Check if biometric is enabled for this user
                        const enabled = await isBiometricLoginEnabled(storedCred.uid);
                        if (!enabled) {
                          setError('البصمة غير مفعّلة لحسابك. فعّلها من الإعدادات');
                          setBiometricLoading(false);
                          return;
                        }

                        // Authenticate with biometric
                        const result = await authenticateWithBiometricDetailed('يرجى التحقق بالبصمة لتسجيل الدخول');
                        if (!result.success) {
                          setError(result.errorMessage || 'فشل التحقق بالبصمة');
                          setBiometricLoading(false);
                          return;
                        }

                        // Biometric succeeded — sign in with stored credentials
                        // Since we don't store the password, we need to check if Firebase auth is still valid
                        const { onAuthStateChanged } = await import('firebase/auth');
                        const currentUser = await new Promise<typeof import('firebase/auth').User>((resolve) => {
                          const unsubscribe = onAuthStateChanged(auth, (u) => {
                            unsubscribe();
                            resolve(u as typeof import('firebase/auth').User);
                          });
                        });

                        if (currentUser && currentUser.uid === storedCred.uid) {
                          // User is already authenticated in Firebase — load user data
                          const uid = currentUser.uid;
                          const userRef = ref(database, `users/${uid}`);
                          const snapshot = await get(userRef);
                          if (snapshot.exists()) {
                            const userData = snapshot.val();
                            const fullName = [userData.firstName, userData.secondName, userData.thirdName, userData.familyName].filter((n: string) => n && n.trim()).join(' ') || userData.name || '';
                            setUser({
                              id: uid, email: userData.email || storedCred.email, phone: userData.phone || '',
                              name: fullName, firstName: userData.firstName || '', secondName: userData.secondName || '',
                              thirdName: userData.thirdName || '', familyName: userData.familyName || '',
                              nationalId: userData.nationalId || '', avatar: userData.avatar || '', role: userData.role || 'user',
                              userId: userData.userId || '', kycStatus: userData.kycStatus || 'pending',
                              isBlocked: userData.isBlocked || false, balanceYER: userData.balanceYER || 0,
                              balanceSAR: userData.balanceSAR || 0, balanceUSD: userData.balanceUSD || 0,
                              cardType: userData.cardType || '', cardNumber: userData.cardNumber || '',
                              cardIssuedAt: userData.cardIssuedAt || '', governorate: userData.governorate || '',
                              theme: userData.theme || 'light',
                            });
                            // Sync biometric preference
                            const bioPref = await syncBiometricPreference(uid);
                            setBiometricEnabled(bioPref);
                          }
                        } else {
                          // Firebase Auth session expired — try to re-authenticate silently
                          // Check if we have stored credentials for auto-login
                          try {
                            const { signInAnonymously } = await import('firebase/auth');
                            // Cannot re-authenticate without password — inform user
                            setError('انتهت جلسة الدخول. يرجى تسجيل الدخول بالبريد وكلمة المرور، ثم تفعيل البصمة مرة أخرى من الإعدادات');
                          } catch {
                            setError('يرجى تسجيل الدخول بالبريد الإلكتروني وكلمة المرور أولاً');
                          }
                        }
                      } catch {
                        setError('حدث خطأ في الدخول بالبصمة');
                      } finally {
                        setBiometricLoading(false);
                      }
                    }}
                    disabled={biometricLoading}
                    className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm mt-3 transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.06)', color: '#8B5CF6', border: `1px solid rgba(139,92,246,0.15)` }}
                  >
                    {biometricLoading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full" />
                    ) : (
                      <Fingerprint size={18} strokeWidth={1.5} color="#8B5CF6" />
                    )}
                    <span className="font-medium">الدخول بالبصمة</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => { setStep('password-recovery'); setError(''); setSuccess(''); setRecoveryStep('input'); }}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm"
                style={{ background: isDark ? '#1A1A1A' : '#F0F0F0', color: isDark ? '#AAA' : '#888', border: `1px solid ${isDark ? '#333' : '#EEE'}` }}
              >
                <KeyRound size={16} strokeWidth={1.5} />
                استعادة كلمة المرور
              </button>
            </motion.div>
          )}

          {/* PASSWORD RECOVERY */}
          {step === 'password-recovery' && (
            <motion.div
              key="password-recovery"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setStep('login'); setLoginMode('login'); setError(''); setSuccess(''); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}>
                  <ArrowLeft size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
                </button>
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>استعادة كلمة المرور</h2>
              </div>

              <div className="flex flex-col items-center mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(92,26,27,0.1)' }}>
                  <KeyRound size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <p className="text-xs text-center max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  أدخل رقم البطاقة الشخصية والبريد الإلكتروني المرتبط بحسابك لاستعادة كلمة المرور
                </p>
              </div>

              {recoveryStep === 'input' ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                    <CreditCard size={18} strokeWidth={1.5} color="#5C1A1B" />
                    <input type="tel" placeholder="رقم البطاقة الشخصية" value={recoveryNationalId} onChange={(e) => setRecoveryNationalId(e.target.value.replace(/\D/g, '').slice(0, 20))} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                    <Mail size={18} strokeWidth={1.5} color="#5C1A1B" />
                    <input type="email" placeholder="البريد الإلكتروني" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" autoComplete="email" />
                  </div>

                  {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center" style={{ color: '#5C1A1B' }}>{error}</motion.p>}

                  <button onClick={handleRecoverySearch} disabled={isLoading} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50" style={btnPrimary}>
                    {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <span>بحث عن الحساب</span>}
                  </button>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-2xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p className="text-xs text-center" style={{ color: '#10B981' }}>تم العثور على حسابك. سيتم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.</p>
                  </div>

                  {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center" style={{ color: '#5C1A1B' }}>{error}</motion.p>}

                  <button onClick={handlePasswordReset} disabled={isLoading} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50" style={btnPrimary}>
                    {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <span>إرسال رابط إعادة التعيين</span>}
                  </button>

                  <button onClick={() => { setRecoveryStep('input'); setError(''); }} className="w-full py-3 rounded-2xl flex items-center justify-center text-sm" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0', color: isDark ? '#AAA' : '#888', border: `1px solid ${isDark ? '#333' : '#EEE'}` }}>
                    رجوع
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* REGISTER STEP 1 - Personal Info */}
          {step === 'register-step1' && (
            <motion.div key="register-step1" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setStep('login'); setLoginMode('login'); setError(''); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}>
                  <ArrowLeft size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
                </button>
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إنشاء حسابك الجديد</h2>
              </div>

              <StepIndicator currentStep={1} />

              {/* First Name */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <User size={18} strokeWidth={1.5} color="#5C1A1B" />
                <input type="text" placeholder="الاسم الأول *" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
              </div>

              {/* Second Name */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <User size={18} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
                <input type="text" placeholder="الاسم الثاني" value={regSecondName} onChange={(e) => setRegSecondName(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
              </div>

              {/* Third Name */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <User size={18} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
                <input type="text" placeholder="الاسم الثالث" value={regThirdName} onChange={(e) => setRegThirdName(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
              </div>

              {/* Family Name */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <User size={18} strokeWidth={1.5} color="#5C1A1B" />
                <input type="text" placeholder="اسم العائلة *" value={regFamilyName} onChange={(e) => setRegFamilyName(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
              </div>

              {/* National ID */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <CreditCard size={18} strokeWidth={1.5} color="#5C1A1B" />
                <input type="tel" placeholder="رقم البطاقة الشخصية *" value={regNationalId} onChange={(e) => handleNationalIdChange(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" />
              </div>

              {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center" style={{ color: '#5C1A1B' }}>{error}</motion.p>}

              <button onClick={handleRegisterStep1} className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98]" style={btnPrimary}>
                <span>التالي</span>
                <ArrowLeft size={16} strokeWidth={1.5} />
              </button>
            </motion.div>
          )}

          {/* REGISTER STEP 2 - Account Info */}
          {step === 'register-step2' && (
            <motion.div key="register-step2" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setStep('register-step1'); setError(''); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}>
                  <ArrowLeft size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
                </button>
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معلومات الحساب</h2>
              </div>

              <StepIndicator currentStep={2} />

              {/* Email */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <Mail size={18} strokeWidth={1.5} color="#5C1A1B" />
                <input type="email" placeholder="البريد الإلكتروني *" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" autoComplete="email" />
              </div>

              {/* Password */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <Lock size={18} strokeWidth={1.5} color="#5C1A1B" />
                <input type="password" placeholder="كلمة المرور (6 أحرف على الأقل) *" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" autoComplete="new-password" />
              </div>

              {/* Confirm Password */}
              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <ShieldCheck size={18} strokeWidth={1.5} color="#5C1A1B" />
                <input type="password" placeholder="تأكيد كلمة المرور *" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" autoComplete="new-password" />
              </div>

              {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center" style={{ color: '#5C1A1B' }}>{error}</motion.p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep('register-step1'); setError(''); }} className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98]" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0', color: isDark ? '#FFF' : '#1a1a1a', border: `1px solid ${isDark ? '#333' : '#EEE'}` }}>
                  السابق
                </button>
                <button onClick={handleRegisterStep2} className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98]" style={btnPrimary}>
                  <span>التالي</span>
                  <ArrowLeft size={16} strokeWidth={1.5} />
                </button>
              </div>
            </motion.div>
          )}

          {/* REGISTER STEP 3 - Phone & Terms */}
          {step === 'register-step3' && (
            <motion.div key="register-step3" initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -300, opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setStep('register-step2'); setError(''); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}>
                  <ArrowLeft size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
                </button>
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>رقم الهاتف</h2>
              </div>

              <StepIndicator currentStep={3} />

              <div className="flex flex-col items-center mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(92,26,27,0.1)' }}>
                  <Phone size={28} strokeWidth={1.5} color="#5C1A1B" />
                </div>
                <p className="text-xs text-center max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                  يمكنك إضافة رقم هاتفك لاستقبال التحويلات عبر الهاتف
                </p>
              </div>

              <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputStyle}>
                <YemenFlagIndicator />
                <span className="text-sm font-medium shrink-0" style={{ color: isDark ? '#AAA' : '#888' }} dir="ltr">+967</span>
                <div className="w-px h-5 shrink-0" style={{ background: isDark ? '#444' : '#DDD' }} />
                <input type="tel" placeholder="7XX XXX XXX" value={regPhone} onChange={(e) => handlePhoneChange(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" />
              </div>

              {/* Terms & Conditions Checkbox */}
              <button
                onClick={() => setAgreeTerms(!agreeTerms)}
                className="w-full flex items-start gap-3 p-3 rounded-2xl text-right"
                style={{ background: agreeTerms ? 'rgba(92,26,27,0.06)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: agreeTerms ? '1px solid rgba(92,26,27,0.2)' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: agreeTerms ? '#5C1A1B' : 'transparent', border: agreeTerms ? 'none' : `1px solid ${isDark ? '#555' : '#CCC'}` }}>
                  {agreeTerms && <CheckCircle2 size={12} color="#FFF" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} color="#5C1A1B" />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أوافق على الشروط والأحكام</span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }}>الموافقة على شروط استخدام محفظة الجنوب</p>
                </div>
              </button>

              {/* Privacy Policy Checkbox */}
              <button
                onClick={() => setAgreePrivacy(!agreePrivacy)}
                className="w-full flex items-start gap-3 p-3 rounded-2xl text-right"
                style={{ background: agreePrivacy ? 'rgba(92,26,27,0.06)' : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: agreePrivacy ? '1px solid rgba(92,26,27,0.2)' : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}
              >
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: agreePrivacy ? '#5C1A1B' : 'transparent', border: agreePrivacy ? 'none' : `1px solid ${isDark ? '#555' : '#CCC'}` }}>
                  {agreePrivacy && <CheckCircle2 size={12} color="#FFF" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Shield size={14} color="#5C1A1B" />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أوافق على سياسة الخصوصية</span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#888' : '#AAA' }}>الموافقة على سياسة حماية البيانات الشخصية</p>
                </div>
              </button>

              {error && <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-center" style={{ color: '#5C1A1B' }}>{error}</motion.p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep('register-step2'); setError(''); }} className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98]" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0', color: isDark ? '#FFF' : '#1a1a1a', border: `1px solid ${isDark ? '#333' : '#EEE'}` }}>
                  السابق
                </button>
                <button onClick={handleRegisterStep3} disabled={isLoading} className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50" style={btnPrimary}>
                  {isLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <span>إنشاء الحساب</span>}
                </button>
              </div>

              <button onClick={() => { setRegPhone(''); handleRegisterStep3(); }} disabled={isLoading} className="w-full py-3 rounded-2xl flex items-center justify-center text-sm font-medium disabled:opacity-50" style={{ background: isDark ? '#1A1A1A' : '#F0F0F0', color: isDark ? '#AAA' : '#888', border: `1px solid ${isDark ? '#333' : '#EEE'}` }}>
                تخطي - بدون رقم هاتف
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Social Media Links at the Bottom - only on login page */}
      {step === 'login' && (
        <SocialLinksBar isDark={isDark} />
      )}
    </div>
  );
}
