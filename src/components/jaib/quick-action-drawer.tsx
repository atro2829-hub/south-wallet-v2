'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeftRight,
  Smartphone,
  FileText,
  QrCode,
  RotateCcw,
  HandCoins,
} from 'lucide-react';

interface QuickActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Quick actions - line icons with red accent matching brand
const quickActions = [
  { icon: ArrowLeftRight, label: 'تحويل أموال', desc: 'إرسال أموال فوراً' },
  { icon: RotateCcw, label: 'طلب أموال', desc: 'اطلب تحويلاً' },
  { icon: Smartphone, label: 'شحن رصيد', desc: 'شحن خطك' },
  { icon: QrCode, label: 'مسح QR', desc: 'ادفع بالمسح' },
  { icon: FileText, label: 'دفع فواتير', desc: 'سدد فواتيرك' },
  { icon: HandCoins, label: 'إيداع رصيد', desc: 'أضف رصيدك' },
];

export default function QuickActionDrawer({ isOpen, onClose }: QuickActionDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-w-md mx-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 className="text-lg font-bold text-[#1a1a1a]">إجراء سريع</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-[#F8F8F8] active:scale-90 transition-transform"
              >
                <X className="w-4 h-4 text-[#1a1a1a] stroke-[1.5px]" />
              </button>
            </div>

            {/* Quick Actions Grid - Line icons with red accent */}
            <div className="px-5 pb-8 pt-2">
              <div className="grid grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={index}
                    className="relative flex flex-col items-center gap-2 p-3 rounded-2xl active:scale-95 transition-transform"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                  >
                    {/* Line icon with light background + red accent dot */}
                    <div className="relative w-14 h-14 bg-[#F8F8F8] rounded-2xl flex items-center justify-center">
                      <action.icon className="w-7 h-7 text-[#1a1a1a] stroke-[1.5px]" />
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#5C1A1B] rounded-full border border-white" />
                    </div>
                    <span className="text-xs font-bold text-[#1a1a1a] text-center leading-tight">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
