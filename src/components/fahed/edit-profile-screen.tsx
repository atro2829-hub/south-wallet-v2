'use client';

import { useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Camera,
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  Lock,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { governorates, compressBase64Image } from '@/lib/utils';
import { LOGO_BASE64 } from '@/lib/logo';
import { useToast } from '@/components/fahed/toast-provider';
import { ref, update } from 'firebase/database';
import { database } from '@/lib/firebase';

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

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setUser, setActiveScreen } = useAppStore();
  const { showToast } = useToast();

  const isVerified = user?.kycStatus === 'verified';

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [secondName, setSecondName] = useState(user?.secondName || '');
  const [thirdName, setThirdName] = useState(user?.thirdName || '');
  const [familyName, setFamilyName] = useState(user?.familyName || '');
  const [phone, setPhone] = useState(user?.phone ? user.phone.replace('+967', '') : '');
  const [email] = useState(user?.email || '');
  const [nationalId] = useState(user?.nationalId || '');
  const [selectedGovernorate, setSelectedGovernorate] = useState(user?.governorate || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isVerified) {
      if (!firstName.trim() || firstName.trim().length < 2) {
        newErrors.firstName = 'الاسم الأول يجب أن يكون حرفين على الأقل';
      }
      if (!familyName.trim() || familyName.trim().length < 2) {
        newErrors.familyName = 'اسم العائلة يجب أن يكون حرفين على الأقل';
      }
      const cleanedPhone = phone.replace(/\D/g, '');
      if (cleanedPhone && (cleanedPhone.length !== 9 || !cleanedPhone.startsWith('7'))) {
        newErrors.phone = 'رقم الهاتف يجب أن يبدأ بـ 7 ويتكون من 9 أرقام';
      }
    }

    if (!selectedGovernorate) {
      newErrors.governorate = 'يرجى اختيار المحافظة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 9);
    setPhone(cleaned);
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'خطأ', 'حجم الصورة كبير جداً');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setAvatarPreview(base64);
      try {
        const compressed = await compressBase64Image(base64, 200, 0.7);
        setAvatar(compressed);
      } catch {
        setAvatar(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user || !validate()) return;

    setIsLoading(true);
    try {
      const fullPhone = phone ? `+967${phone}` : user.phone;
      const fullName = [firstName, secondName, thirdName, familyName].filter(n => n.trim()).join(' ');
      const updates: Record<string, unknown> = {
        governorate: selectedGovernorate,
        avatar,
      };

      if (!isVerified) {
        updates.name = fullName;
        updates.firstName = firstName.trim();
        updates.secondName = secondName.trim();
        updates.thirdName = thirdName.trim();
        updates.familyName = familyName.trim();
        updates.phone = fullPhone;
      }

      // Update Firebase
      try {
        const userRef = ref(database, `users/${user.id}`);
        await update(userRef, updates);
      } catch {
        // Continue locally
      }

      // Update local store
      setUser({
        ...user,
        ...(isVerified ? {} : {
          name: fullName,
          firstName: firstName.trim(),
          secondName: secondName.trim(),
          thirdName: thirdName.trim(),
          familyName: familyName.trim(),
          phone: fullPhone,
        }),
        governorate: selectedGovernorate,
        avatar,
      });

      showToast('success', 'تم التحديث', 'تم تحديث بياناتك بنجاح');

      setTimeout(() => {
        setActiveScreen('main');
      }, 800);
    } catch {
      showToast('error', 'خطأ', 'حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const inputContainerStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
  };

  const frozenInputContainerStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
    opacity: 0.7,
  };

  const inputErrorStyle = (field: string) =>
    errors[field]
      ? { border: '1px solid #5C1A1B', boxShadow: '0 0 0 2px rgba(92,26,27,0.1)' }
      : {};

  // Frozen field renderer - for verified users
  const renderFrozenField = (label: string, value: string, icon: React.ReactNode) => (
    <div>
      <label
        className="text-xs font-medium mb-1.5 flex items-center gap-1"
        style={{ color: isDark ? '#AAA' : '#888' }}
      >
        {label}
        <div title="لا يمكن تعديل هذه البيانات بعد التوثيق" className="relative group">
          <Lock size={10} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
          {/* Tooltip on hover */}
          <div className="absolute bottom-full right-0 mb-1 px-2 py-1 rounded-lg text-[9px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{ background: isDark ? '#333' : '#333', color: '#FFF' }}>
            لا يمكن تعديل هذه البيانات بعد التوثيق
          </div>
        </div>
      </label>
      <div
        className="flex items-center gap-2 px-4 py-3.5 rounded-2xl"
        style={frozenInputContainerStyle}
      >
        {icon}
        <input
          type="text"
          value={value}
          readOnly
          disabled
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: isDark ? '#777' : '#AAA' }}
        />
        <div title="لا يمكن تعديل هذه البيانات بعد التوثيق">
          <Lock size={14} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('main')}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}
          >
            <ArrowRight size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1
            className="text-xl font-bold"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          >
            تعديل الملف الشخصي
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 mt-4 pb-8 overflow-y-auto">
        {/* Avatar Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative">
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                background: isDark ? '#1A1A1A' : '#F0F0F0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={firstName || user?.name || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={40} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 left-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: '#5C1A1B',
                boxShadow: '0 2px 8px rgba(92,26,27,0.4)',
              }}
            >
              <Camera size={14} strokeWidth={1.5} color="#FFF" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </motion.div>

        {/* Frozen data notice */}
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-4 rounded-2xl"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={16} strokeWidth={1.5} color="#10B981" />
              <span className="text-xs font-bold" style={{ color: '#10B981' }}>حساب موثق</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: isDark ? '#AAA' : '#666' }}>
              هذه البيانات مجمدة بسبب اكتمال التوثيق. لا يمكن تعديل الاسم أو رقم الهاتف أو البريد الإلكتروني أو رقم البطاقة الشخصية. يمكنك فقط تعديل المحافظة والصورة الشخصية.
            </p>
          </motion.div>
        )}

        {/* Form */}
        <div className="space-y-4">
          {/* First Name */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            {isVerified ? (
              renderFrozenField('الاسم الأول', firstName, <User size={18} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />)
            ) : (
              <>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  الاسم الأول
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={{ ...inputContainerStyle, ...inputErrorStyle('firstName') }}>
                  <User size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input
                    type="text"
                    placeholder="الاسم الأول"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                    }}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
                {errors.firstName && <p className="text-[10px] mt-1" style={{ color: '#5C1A1B' }}>{errors.firstName}</p>}
              </>
            )}
          </motion.div>

          {/* Second Name */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 }}
          >
            {isVerified ? (
              renderFrozenField('الاسم الثاني', secondName, <User size={18} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />)
            ) : (
              <>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  الاسم الثاني
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputContainerStyle}>
                  <User size={18} strokeWidth={1.5} color={isDark ? '#666' : '#CCC'} />
                  <input
                    type="text"
                    placeholder="الاسم الثاني"
                    value={secondName}
                    onChange={(e) => setSecondName(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
              </>
            )}
          </motion.div>

          {/* Third Name */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.11 }}
          >
            {isVerified ? (
              renderFrozenField('الاسم الثالث', thirdName, <User size={18} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />)
            ) : (
              <>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  الاسم الثالث
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={inputContainerStyle}>
                  <User size={18} strokeWidth={1.5} color={isDark ? '#666' : '#CCC'} />
                  <input
                    type="text"
                    placeholder="الاسم الثالث"
                    value={thirdName}
                    onChange={(e) => setThirdName(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
              </>
            )}
          </motion.div>

          {/* Family Name */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.14 }}
          >
            {isVerified ? (
              renderFrozenField('اسم العائلة', familyName, <User size={18} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />)
            ) : (
              <>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  اسم العائلة
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={{ ...inputContainerStyle, ...inputErrorStyle('familyName') }}>
                  <User size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input
                    type="text"
                    placeholder="اسم العائلة"
                    value={familyName}
                    onChange={(e) => {
                      setFamilyName(e.target.value);
                      if (errors.familyName) setErrors((prev) => ({ ...prev, familyName: '' }));
                    }}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
                {errors.familyName && <p className="text-[10px] mt-1" style={{ color: '#5C1A1B' }}>{errors.familyName}</p>}
              </>
            )}
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.17 }}
          >
            {isVerified ? (
              renderFrozenField('رقم الهاتف', user?.phone || '', <Phone size={18} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />)
            ) : (
              <>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  رقم الهاتف
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={{ ...inputContainerStyle, ...inputErrorStyle('phone') }}>
                  <Phone size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <YemenFlagIndicator />
                  <span className="text-sm font-medium shrink-0" style={{ color: isDark ? '#AAA' : '#888' }} dir="ltr">+967</span>
                  <div className="w-px h-5 shrink-0" style={{ background: isDark ? '#444' : '#DDD' }} />
                  <input
                    type="tel"
                    placeholder="7XX XXX XXX"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    dir="ltr"
                  />
                </div>
                {errors.phone && <p className="text-[10px] mt-1" style={{ color: '#5C1A1B' }}>{errors.phone}</p>}
              </>
            )}
          </motion.div>

          {/* Email (always readonly) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label
              className="text-xs font-medium mb-1.5 flex items-center gap-1"
              style={{ color: isDark ? '#AAA' : '#888' }}
            >
              البريد الإلكتروني
              <Lock size={10} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
            </label>
            <div
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl"
              style={{
                ...inputContainerStyle,
                opacity: 0.6,
              }}
            >
              <Mail size={18} strokeWidth={1.5} color="#5C1A1B" />
              <input
                type="email"
                value={email}
                readOnly
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: isDark ? '#888' : '#AAA' }}
                dir="ltr"
              />
              <Lock size={14} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: isDark ? '#555' : '#CCC' }}>
              لا يمكن تغيير البريد
            </p>
          </motion.div>

          {/* National ID (frozen when verified) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.23 }}
          >
            {isVerified ? (
              renderFrozenField('رقم البطاقة الشخصية', nationalId, <CreditCard size={18} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />)
            ) : (
              <>
                <label className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: isDark ? '#AAA' : '#888' }}>
                  رقم البطاقة الشخصية
                  <Lock size={10} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
                </label>
                <div className="flex items-center gap-2 px-4 py-3.5 rounded-2xl" style={{ ...inputContainerStyle, opacity: 0.6 }}>
                  <CreditCard size={18} strokeWidth={1.5} color="#5C1A1B" />
                  <input
                    type="text"
                    value={nationalId}
                    readOnly
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#888' : '#AAA' }}
                    dir="ltr"
                  />
                  <Lock size={14} strokeWidth={1.5} color={isDark ? '#555' : '#CCC'} />
                </div>
                <p className="text-[10px] mt-1" style={{ color: isDark ? '#555' : '#CCC' }}>
                  لا يمكن تغيير رقم البطاقة بعد التسجيل
                </p>
              </>
            )}
          </motion.div>

          {/* Governorate (always editable) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.26 }}
          >
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: isDark ? '#AAA' : '#888' }}
            >
              المحافظة
            </label>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ ...inputContainerStyle, ...inputErrorStyle('governorate') }}
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <MapPin size={18} strokeWidth={1.5} color="#5C1A1B" />
                <select
                  value={selectedGovernorate}
                  onChange={(e) => {
                    setSelectedGovernorate(e.target.value);
                    if (errors.governorate) setErrors((prev) => ({ ...prev, governorate: '' }));
                  }}
                  className="flex-1 bg-transparent outline-none text-sm appearance-none"
                  style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                >
                  <option value="" disabled style={{ background: isDark ? '#222' : '#FFF' }}>
                    اختر المحافظة
                  </option>
                  {governorates.map((gov) => (
                    <option
                      key={gov}
                      value={gov}
                      style={{ background: isDark ? '#222' : '#FFF' }}
                    >
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.governorate && (
              <p className="text-[10px] mt-1" style={{ color: '#5C1A1B' }}>{errors.governorate}</p>
            )}
          </motion.div>
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)',
              boxShadow: '0 4px 16px rgba(92,26,27,0.3)',
            }}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Save size={18} strokeWidth={1.5} />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
