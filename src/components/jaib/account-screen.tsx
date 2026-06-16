'use client';

import { motion } from 'framer-motion';
import {
  Cloud,
  CreditCard,
  User,
  Users,
  Shield,
  Settings,
  MessageCircle,
  Diamond,
  Share2,
  ChevronLeft,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

// Settings items - line icons with red accent (no colored backgrounds)
const settingsItems = [
  { icon: Cloud, label: 'تحويل الأموال بسهولة', hasArrow: false },
  { icon: CreditCard, label: 'إدارة البطاقات', hasArrow: false },
  { icon: User, label: 'حسابي', hasArrow: true },
  { icon: Users, label: 'إدارة المستخدمين والشركات', hasArrow: true },
  { icon: Shield, label: 'الأمان والحماية', hasArrow: true },
  { icon: Settings, label: 'إعدادات التطبيق', hasArrow: true },
  { icon: MessageCircle, label: 'الدعم والمساعدة', hasArrow: true },
  { icon: Diamond, label: 'المدفوعات المفضلة', hasArrow: true },
  { icon: Share2, label: 'شارك مع أصدقائك', hasArrow: false },
];

export default function AccountScreen() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="pb-4">
      {/* Profile Section */}
      <div className="flex flex-col items-center pt-6 pb-4 px-4">
        {/* Avatar - Red gradient matching brand */}
        <motion.div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-3 shadow-[0_4px_20px_rgba(92,26,27,0.2)]"
          style={{ background: 'linear-gradient(135deg, #C1121F 0%, #5C1A1B 100%)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center">
            <svg viewBox="0 0 80 80" className="w-16 h-16">
              <circle cx="40" cy="30" r="14" fill="#5C1A1B" />
              <ellipse cx="40" cy="65" rx="22" ry="16" fill="#5C1A1B" />
              <circle cx="34" cy="28" r="2.5" fill="white" />
              <circle cx="46" cy="28" r="2.5" fill="white" />
              <path d="M35 35 Q40 40 45 35" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <p className="text-[#1a1a1a] text-sm leading-relaxed font-medium">
            بسم الله الرحمن الرحيم
          </p>
          <p className="text-[#1a1a1a] font-bold text-base mt-1">
            مرحباً بك في محفظتك
          </p>
        </motion.div>

        {/* Account Numbers Card - Red gradient matching brand */}
        <motion.div
          className="w-full rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #C1121F 0%, #5C1A1B 100%)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Card pattern matching balance cards */}
          <div className="absolute top-0 left-0 w-28 h-28 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-3 right-20 w-2 h-2 bg-white/10 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">أرقام الحساب</h3>
              <button className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform">
                <QrCode className="w-5 h-5 text-white stroke-[1.5px]" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div>
                  <p className="text-white/60 text-[10px] font-medium">الرقم الأول</p>
                  <p className="text-white font-bold text-sm tracking-wide" dir="ltr">7824461</p>
                </div>
                <button
                  onClick={() => handleCopy('7824461', 'first')}
                  className="p-1.5 rounded-lg bg-white/10 active:scale-90 transition-transform"
                >
                  {copied === 'first' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/70" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <div>
                  <p className="text-white/60 text-[10px] font-medium">الرقم الثاني</p>
                  <p className="text-white font-bold text-sm tracking-wide" dir="ltr">773649653</p>
                </div>
                <button
                  onClick={() => handleCopy('773649653', 'second')}
                  className="p-1.5 rounded-lg bg-white/10 active:scale-90 transition-transform"
                >
                  {copied === 'second' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/70" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Settings Menu - Line icons with red accent dots */}
      <div className="px-4 pt-2">
        <div className="space-y-2.5">
          {settingsItems.map((item, index) => (
            <motion.button
              key={index}
              className="w-full flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-transform"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            >
              {/* Line icon with red accent dot */}
              <div className="relative w-10 h-10 bg-[#F8F8F8] rounded-xl flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-[#1a1a1a] stroke-[1.5px]" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#5C1A1B] rounded-full border border-white" />
              </div>
              <span className="flex-1 text-sm font-bold text-[#1a1a1a] text-right">{item.label}</span>
              {item.hasArrow && (
                <ChevronLeft className="w-4 h-4 text-gray-400 shrink-0 stroke-[1.5px]" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* App Version */}
      <div className="text-center py-4 mt-2">
        <p className="text-xs text-gray-400 font-medium">جيب الإصدار 2.0.1</p>
      </div>
    </div>
  );
}
