'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  FileText,
  CreditCard,
  CalendarClock,
  Settings,
  ArrowLeftRight,
  Receipt,
  Wallet,
  HandCoins,
  Store,
} from 'lucide-react';

// Main services - line icons with red accent instead of colored backgrounds
const mainServices = [
  { icon: FileText, label: 'دفع فواتيري الآن', desc: 'ادفع فواتيرك بسهولة وسرعة' },
  { icon: CreditCard, label: 'دفع فواتيري في أقساط', desc: 'ميزة الدفع بالتقسيط', badge: 'ميزة' },
  { icon: CalendarClock, label: 'فواتيري المستقبلية', desc: 'إدارة الفواتير القادمة' },
  { icon: Settings, label: 'طريقة دفع فاتورتي', desc: 'تخصيص طريقة الدفع' },
  { icon: ArrowLeftRight, label: 'تحويل وبنك', desc: 'التحويل البنكي السريع' },
  { icon: Receipt, label: 'المدفوعات التي تمت عبر جيب', desc: 'سجل المدفوعات' },
];

const quickActions = [
  { icon: Wallet, label: 'المدفوعات' },
  { icon: FileText, label: 'فواتير قابلة' },
  { icon: Store, label: 'من صرافي' },
  { icon: HandCoins, label: 'لدفع فواتيري' },
];

export default function ServicesScreen() {
  return (
    <div className="pb-4">
      {/* Header - Red gradient matching brand identity */}
      <div className="relative px-5 pt-4 pb-6 rounded-b-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #C1121F 0%, #5C1A1B 100%)' }}
      >
        {/* Decorative pattern */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-4 left-8 w-3 h-3 bg-white/10 rounded-full" />
        <div className="absolute top-12 left-16 w-2 h-2 bg-white/10 rounded-full" />
        <div className="absolute bottom-8 left-6 w-4 h-4 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <button className="p-2 rounded-full bg-white/15 backdrop-blur-sm active:scale-90 transition-transform">
              <ArrowRight className="w-5 h-5 text-white stroke-[1.5px]" />
            </button>
            <h1 className="text-xl font-bold text-white">خدمات الدفع</h1>
          </div>
        </div>
      </div>

      {/* Main Services List - Line icons with red accent */}
      <div className="px-4 -mt-4 space-y-3">
        {mainServices.map((service, index) => (
          <motion.button
            key={index}
            className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-transform"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06 }}
          >
            {/* Line icon with light background + red dot accent */}
            <div className="relative w-11 h-11 bg-[#F8F8F8] rounded-xl flex items-center justify-center shrink-0">
              <service.icon className="w-5 h-5 text-[#1a1a1a] stroke-[1.5px]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#5C1A1B] rounded-full border border-white" />
            </div>
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1a1a1a]">{service.label}</h3>
                {service.badge && (
                  <span className="text-[10px] bg-[#5C1A1B] text-white px-2 py-0.5 rounded-full font-bold">
                    {service.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-medium">{service.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 stroke-[1.5px]" />
          </motion.button>
        ))}
      </div>

      {/* Quick Actions Grid - Line icons matching brand */}
      <div className="px-4 pt-5">
        <h2 className="text-[15px] font-bold text-[#1a1a1a] mb-3">الوصول السريع</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.button
              key={index}
              className="relative flex items-center gap-3 bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-transform"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
            >
              {/* Line icon with red accent */}
              <div className="relative w-10 h-10 bg-[#F8F8F8] rounded-xl flex items-center justify-center shrink-0">
                <action.icon className="w-5 h-5 text-[#1a1a1a] stroke-[1.5px]" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#5C1A1B] rounded-full border border-white" />
              </div>
              <span className="text-sm font-bold text-[#1a1a1a]">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
