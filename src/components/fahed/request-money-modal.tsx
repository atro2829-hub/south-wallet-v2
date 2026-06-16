'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DollarSign,
  FileText,
  ChevronDown,
  CheckCircle2,
  Copy,
  Share2,
  User,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, currencyNames, currencyBadgeColors } from '@/lib/utils';

type Currency = 'YER' | 'SAR' | 'USD';

function CurrencyBadge({ currency }: { currency: string }) {
  const bgColor = currencyBadgeColors[currency] || '#666';
  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
      style={{ background: bgColor }}
    >
      {currency}
    </span>
  );
}

export default function RequestMoneyModal() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isRequestMoneyOpen, setRequestMoneyOpen, user } = useAppStore();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('YER');
  const [description, setDescription] = useState('');
  const [fromWho, setFromWho] = useState('');
  const [showCurrencySelect, setShowCurrencySelect] = useState(false);
  const [copied, setCopied] = useState(false);

  const currencies: Currency[] = ['YER', 'SAR', 'USD'];

  const handleClose = () => {
    setRequestMoneyOpen(false);
    setTimeout(() => {
      setAmount('');
      setCurrency('YER');
      setDescription('');
      setFromWho('');
      setCopied(false);
      setShowCurrencySelect(false);
    }, 300);
  };

  const generateRequestText = () => {
    if (!amount) return '';
    const parts = [`طلب منك ${Number(amount).toLocaleString()} ${currencySymbols[currency]}`];
    if (fromWho) parts.push(`من ${fromWho}`);
    parts.push(`عبر محفظة الجنوب`);
    if (description) parts.push(`- ${description}`);
    if (user?.userId) parts.push(`رقم الحساب: ${user.userId}`);
    return parts.join(' ');
  };

  const requestText = generateRequestText();

  const handleCopy = async () => {
    if (!requestText) return;
    try {
      await navigator.clipboard.writeText(requestText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = requestText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!requestText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'طلب أموال - محفظة الجنوب',
          text: requestText,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const canGenerate = amount && Number(amount) > 0;

  return (
    <AnimatePresence>
      {isRequestMoneyOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 rounded-t-3xl overflow-hidden"
            style={{ background: isDark ? '#1A1A1A' : '#FFFFFF' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: isDark ? '#444' : '#DDD' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <DollarSign size={16} strokeWidth={1.5} color="#8B5CF6" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  طلب أموال
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: isDark ? '#2D2D2D' : '#F0F0F0' }}
              >
                <X size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 pb-8 space-y-4">
              {/* Amount Input */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  المبلغ
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    border: isDark ? '1px solid #333' : '1px solid #EEE',
                  }}
                >
                  <DollarSign size={18} strokeWidth={1.5} color="#8B5CF6" />
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    dir="ltr"
                  />
                  <span className="text-sm font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>
                    {currencySymbols[currency]}
                  </span>
                </div>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  العملة
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCurrencySelect(!showCurrencySelect)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl"
                    style={{
                      background: isDark ? '#222' : '#F8F8F8',
                      border: isDark ? '1px solid #333' : '1px solid #EEE',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <CurrencyBadge currency={currency} />
                      <span className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {currencyNames[currency]}
                      </span>
                    </span>
                    <ChevronDown size={16} strokeWidth={1.5} color={isDark ? '#AAA' : '#888'} />
                  </button>

                  <AnimatePresence>
                    {showCurrencySelect && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden z-10"
                        style={{
                          background: isDark ? '#2D2D2D' : '#FFF',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        }}
                      >
                        {currencies.map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setCurrency(c);
                              setShowCurrencySelect(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#8B5CF6]/5 transition-colors"
                            style={{
                              borderBottom: isDark ? '1px solid #333' : '1px solid #F0F0F0',
                            }}
                          >
                            <CurrencyBadge currency={c} />
                            <span className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                              {currencyNames[c]}
                            </span>
                            <span className="text-xs mr-auto" style={{ color: isDark ? '#888' : '#AAA' }}>
                              {currencySymbols[c]}
                            </span>
                            {currency === c && (
                              <CheckCircle2 size={16} color="#8B5CF6" strokeWidth={1.5} />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  الوصف (اختياري)
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    border: isDark ? '1px solid #333' : '1px solid #EEE',
                  }}
                >
                  <FileText size={18} strokeWidth={1.5} color="#8B5CF6" />
                  <input
                    type="text"
                    placeholder="أضف وصفاً للطلب"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
              </div>

              {/* From Who */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: isDark ? '#AAA' : '#888' }}>
                  من (اختياري)
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    border: isDark ? '1px solid #333' : '1px solid #EEE',
                  }}
                >
                  <User size={18} strokeWidth={1.5} color="#8B5CF6" />
                  <input
                    type="text"
                    placeholder="اسم الشخص المطلوب منه"
                    value={fromWho}
                    onChange={(e) => setFromWho(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                  />
                </div>
              </div>

              {/* Generated request text */}
              {canGenerate && requestText && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? '#222' : '#F8F8F8',
                    border: `1px solid ${isDark ? '#333' : '#EEE'}`,
                  }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: isDark ? '#CCC' : '#555' }}>
                    {requestText}
                  </p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  disabled={!canGenerate}
                  className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: isDark ? '#2D2D2D' : '#F5F5F5',
                    color: isDark ? '#FFF' : '#1a1a1a',
                    border: `1px solid ${isDark ? '#444' : '#EEE'}`,
                  }}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={18} strokeWidth={1.5} color="#10B981" />
                      <span style={{ color: '#10B981' }}>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} strokeWidth={1.5} />
                      <span>نسخ</span>
                    </>
                  )}
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  disabled={!canGenerate}
                  className="flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                    boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
                  }}
                >
                  <Share2 size={18} strokeWidth={1.5} />
                  <span>مشاركة</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
