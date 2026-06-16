'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Clock,
  Mic,
  MicOff,
  ArrowLeft,
  Sparkles,
  Wifi,
  Receipt,
  Users,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { productIcons } from '@/lib/product-icons';
import { serviceIcons } from '@/lib/service-icons';

// ─── Types ───
interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: 'services' | 'providers' | 'products' | 'transactions' | 'contacts';
  icon?: string;
  iconBg?: string;
  action: () => void;
}

interface SearchGroup {
  category: 'services' | 'providers' | 'products' | 'transactions' | 'contacts';
  label: string;
  icon: React.ReactNode;
  results: SearchResult[];
}

// ─── Category icons map ───
const categoryIconMap: Record<string, string> = {
  'service-providers': 'providers-category',
  'wallet-services': 'wallet-services-category',
  'telecom': 'telecom-category',
  'entertainment': 'entertainment-category',
  'cards': 'cards-category',
  'electricity': 'pay-bills',
  'government': 'government-category',
  'internet': 'internet-category',
};

const categoryLabels: Record<string, string> = {
  'service-providers': 'مزودين الخدمات',
  'wallet-services': 'خدمات المحفظة',
  telecom: 'الاتصالات',
  entertainment: 'خدمات ترفيهية',
  cards: 'بطاقات رقمية',
  electricity: 'الكهرباء والماء',
  government: 'خدمات حكومية',
  internet: 'الإنترنت',
};

// ─── Suggested searches based on popular services ───
const suggestedSearches = [
  { text: 'شحن يمن موبايل', icon: 'yemen-mobile' },
  { text: 'شدات ببجي', icon: 'pubg' },
  { text: 'بطاقة جوجل بلاي', icon: 'google-play' },
  { text: 'فواتير الكهرباء', icon: 'pay-bills' },
  { text: 'سبوتيفاي', icon: 'spotify' },
  { text: 'نتفلكس', icon: 'netflix' },
  { text: 'فري فاير', icon: 'freefire' },
  { text: 'ستيم', icon: 'steam' },
];

// ─── Recent Searches Storage ───
const RECENT_SEARCHES_KEY = 'janoub-recent-searches';
const MAX_RECENT = 8;

function getRecentSearches(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((s) => s !== query);
    filtered.unshift(query);
    const trimmed = filtered.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore
  }
}

// ─── Debounce hook ───
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ─── Main Global Search Component ───
interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    providers,
    categories,
    transactions,
    setActiveScreen,
    setSelectedProvider,
    setOrderOpen,
    setSelectedCategory,
    setTransferOpen,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Stop voice search helper (non-hook, called from effect)
  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Load recent searches
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      // Focus input after opening
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      stopVoice();
    }
  }, [isOpen, stopVoice]);

  // Check speech API support
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, []);

  // ─── Search logic ───
  const searchResults = useCallback((): SearchGroup[] => {
    if (!debouncedQuery.trim()) return [];

    const q = debouncedQuery.trim().toLowerCase();
    const groups: SearchGroup[] = [];

    // 1. Search services/categories
    const matchedCategories = categories.filter(
      (cat) => cat.name.includes(q) || cat.id.includes(q)
    );
    if (matchedCategories.length > 0) {
      groups.push({
        category: 'services',
        label: 'الخدمات',
        icon: <Wifi size={14} />,
        results: matchedCategories.map((cat) => ({
          id: `cat-${cat.id}`,
          title: cat.name,
          subtitle: categoryLabels[cat.id] || cat.type,
          category: 'services',
          icon: productIcons[categoryIconMap[cat.id]] || serviceIcons[cat.id] || serviceIcons['instant-pay'],
          action: () => {
            setSelectedCategory(cat.id);
            setActiveScreen('category-detail');
            saveRecentSearch(cat.name);
            onClose();
          },
        })),
      });
    }

    // 2. Search providers
    const matchedProviders = providers.filter(
      (p) => p.name.includes(q) || p.id.includes(q)
    ).slice(0, 10);
    if (matchedProviders.length > 0) {
      groups.push({
        category: 'providers',
        label: 'مزودي الخدمة',
        icon: <Zap size={14} />,
        results: matchedProviders.map((p) => ({
          id: `prov-${p.id}`,
          title: p.name,
          subtitle: categoryLabels[p.categoryId] || p.categoryId,
          category: 'providers',
          icon: productIcons[p.id] || serviceIcons[p.id] || serviceIcons['instant-pay'],
          iconBg: p.color,
          action: () => {
            // Navigate based on provider type
            const telecomIds = ['yemen-mobile', 'yo', 'sabafon', 'y'];

            if (telecomIds.includes(p.id)) {
              setActiveScreen('recharge');
            } else {
              setSelectedProvider(p);
              setOrderOpen(true);
            }
            saveRecentSearch(p.name);
            onClose();
          },
        })),
      });
    }

    // 3. Search products/packages
    const { packages } = useAppStore.getState();
    const matchedPackages = packages.filter(
      (pkg) => pkg.name.includes(q) || pkg.providerId.includes(q)
    ).slice(0, 8);
    if (matchedPackages.length > 0) {
      groups.push({
        category: 'products',
        label: 'المنتجات',
        icon: <ShoppingBag size={14} />,
        results: matchedPackages.map((pkg) => {
          const provider = providers.find((p) => p.id === pkg.providerId);
          return {
            id: `pkg-${pkg.id}`,
            title: pkg.name,
            subtitle: `${provider?.name || ''} • ${pkg.price.toLocaleString()} ${pkg.currency === 'YER' ? 'ر.ي' : pkg.currency}`,
            category: 'products' as const,
            icon: productIcons[pkg.providerId] || serviceIcons[pkg.providerId] || serviceIcons['instant-pay'],
            action: () => {
              if (provider) {
                setSelectedProvider(provider);
                setOrderOpen(true);
              }
              saveRecentSearch(pkg.name);
              onClose();
            },
          };
        }),
      });
    }

    // 4. Search transactions
    const matchedTx = transactions.filter(
      (tx) =>
        tx.description?.includes(q) ||
        tx.type.includes(q) ||
        tx.id.includes(q)
    ).slice(0, 5);
    if (matchedTx.length > 0) {
      groups.push({
        category: 'transactions',
        label: 'المعاملات',
        icon: <Receipt size={14} />,
        results: matchedTx.map((tx) => ({
          id: `tx-${tx.id}`,
          title: tx.description || tx.type,
          subtitle: `${tx.amount.toLocaleString()} ${tx.currency} • ${new Date(tx.createdAt).toLocaleDateString('ar')}`,
          category: 'transactions',
          action: () => {
            setActiveScreen('transaction-detail');
            saveRecentSearch(tx.description || tx.type);
            onClose();
          },
        })),
      });
    }

    // 5. Search contacts (from recent transactions)
    const contactNames = new Map<string, { name: string; id: string }>();
    transactions.forEach((tx) => {
      if (tx.description && tx.toUserId && tx.toUserId !== useAppStore.getState().user?.id) {
        if (!contactNames.has(tx.toUserId) && tx.description.includes(q)) {
          contactNames.set(tx.toUserId, { name: tx.description, id: tx.toUserId });
        }
      }
    });
    const matchedContacts = Array.from(contactNames.values()).slice(0, 5);
    if (matchedContacts.length > 0) {
      groups.push({
        category: 'contacts',
        label: 'جهات الاتصال',
        icon: <Users size={14} />,
        results: matchedContacts.map((c) => ({
          id: `contact-${c.id}`,
          title: c.name,
          subtitle: 'تحويل أموال',
          category: 'contacts',
          action: () => {
            setTransferOpen(true);
            saveRecentSearch(c.name);
            onClose();
          },
        })),
      });
    }

    return groups;
  }, [debouncedQuery, providers, categories, transactions]);

  const results = searchResults();

  // ─── Voice Search ───
  const startVoiceSearch = useCallback(() => {
    if (!speechSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-YE';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setQuery(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [speechSupported]);

  // ─── Handle search submission ───
  const handleSubmit = () => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
    }
  };

  // ─── Handle clicking a recent search ───
  const handleRecentClick = (search: string) => {
    setQuery(search);
  };

  // ─── Colors ───
  const bgColor = isDark ? '#0A0A0A' : '#F5F5F5';
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const textColor = isDark ? '#FFF' : '#1a1a1a';
  const secondaryText = isDark ? '#AAA' : '#666';
  const subtleText = isDark ? '#666' : '#999';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const inputBg = isDark ? '#1A1A1A' : '#FFFFFF';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Search Overlay */}
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex flex-col max-w-md mx-auto"
            style={{ background: bgColor }}
          >
            {/* ─── Search Header ─── */}
            <div
              className="sticky top-0 z-10 px-4 pt-4 pb-3"
              style={{
                background: bgColor,
                borderBottom: `1px solid ${borderColor}`,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div
                  className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl"
                  style={{
                    background: inputBg,
                    border: `1px solid ${isListening ? '#5C1A1B' : borderColor}`,
                    boxShadow: isListening ? '0 0 0 2px rgba(92,26,27,0.2)' : 'none',
                  }}
                >
                  {isListening ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <Mic size={18} strokeWidth={1.5} color="#5C1A1B" />
                    </motion.div>
                  ) : (
                    <Search size={18} strokeWidth={1.5} color={subtleText} />
                  )}
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="ابحث عن خدمة، مزود، منتج..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: textColor }}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className="active:scale-95 transition-transform"
                    >
                      <X size={16} strokeWidth={1.5} color={subtleText} />
                    </button>
                  )}
                </div>

                {/* Voice Search Button */}
                {speechSupported && (
                  <button
                    onClick={isListening ? stopVoice : startVoiceSearch}
                    className="w-11 h-11 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                    style={{
                      background: isListening ? 'rgba(92,26,27,0.15)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    }}
                  >
                    {isListening ? (
                      <MicOff size={18} strokeWidth={1.5} color="#5C1A1B" />
                    ) : (
                      <Mic size={18} strokeWidth={1.5} color={subtleText} />
                    )}
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-11 h-11 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                  style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                >
                  <ArrowLeft size={18} strokeWidth={1.5} color={subtleText} />
                </button>
              </div>

              {/* Voice search indicator */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 flex items-center gap-2"
                >
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 rounded-full bg-[#5C1A1B]"
                        animate={{
                          height: [4, Math.random() * 16 + 4, 4],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#5C1A1B' }}>
                    جاري الاستماع...
                  </span>
                </motion.div>
              )}
            </div>

            {/* ─── Search Content ─── */}
            <div className="flex-1 overflow-y-auto pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
              {/* Search Results */}
              {debouncedQuery.trim() ? (
                results.length > 0 ? (
                  <div className="px-4 pt-3">
                    {results.map((group, groupIndex) => (
                      <motion.div
                        key={group.category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * groupIndex, duration: 0.25 }}
                        className="mb-4"
                      >
                        {/* Group header */}
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <span style={{ color: '#5C1A1B' }}>{group.icon}</span>
                          <span className="text-xs font-bold" style={{ color: secondaryText }}>
                            {group.label}
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{
                              background: isDark ? 'rgba(92,26,27,0.1)' : 'rgba(92,26,27,0.08)',
                              color: '#5C1A1B',
                            }}
                          >
                            {group.results.length}
                          </span>
                        </div>

                        {/* Group results */}
                        <div
                          className="rounded-2xl overflow-hidden"
                          style={{
                            background: cardBg,
                            border: `1px solid ${borderColor}`,
                          }}
                        >
                          {group.results.map((result, rIndex) => (
                            <motion.button
                              key={result.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.03 * rIndex, duration: 0.2 }}
                              onClick={result.action}
                              className="w-full flex items-center gap-3 px-4 py-3 active:scale-[0.98] transition-transform"
                              style={{
                                borderBottom: rIndex < group.results.length - 1
                                  ? `1px solid ${borderColor}`
                                  : 'none',
                              }}
                            >
                              {/* Icon */}
                              {result.icon && (
                                <div
                                  className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                                  style={{
                                    background: result.iconBg
                                      ? `${result.iconBg}15`
                                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  }}
                                >
                                  <img
                                    src={result.icon}
                                    alt=""
                                    className="w-7 h-7 object-contain"
                                    draggable={false}
                                  />
                                </div>
                              )}

                              {/* Text */}
                              <div className="flex-1 min-w-0 text-right">
                                <p
                                  className="text-sm font-medium truncate"
                                  style={{ color: textColor }}
                                >
                                  {result.title}
                                </p>
                                {result.subtitle && (
                                  <p
                                    className="text-[11px] truncate"
                                    style={{ color: subtleText }}
                                  >
                                    {result.subtitle}
                                  </p>
                                )}
                              </div>

                              {/* Category badge */}
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-bold"
                                style={{
                                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  color: subtleText,
                                }}
                              >
                                {group.label}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* No results */
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-4 pt-12"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}
                      >
                        <Search size={28} strokeWidth={1.5} color={subtleText} />
                      </div>
                      <p className="text-base font-bold mb-1" style={{ color: textColor }}>
                        لا توجد نتائج
                      </p>
                      <p className="text-sm" style={{ color: subtleText }}>
                        جرب البحث بكلمات مختلفة
                      </p>
                    </div>
                  </motion.div>
                )
              ) : (
                /* ─── No query: Show suggestions & recent ─── */
                <div className="px-4 pt-3">
                  {/* Voice search prompt */}
                  {speechSupported && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      onClick={startVoiceSearch}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl mb-4 active:scale-[0.98] transition-transform"
                      style={{
                        background: 'linear-gradient(145deg, rgba(92,26,27,0.1) 0%, rgba(61,15,16,0.08) 100%)',
                        border: '1px solid rgba(92,26,27,0.15)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(92,26,27,0.15)' }}
                      >
                        <Mic size={20} strokeWidth={1.5} color="#5C1A1B" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-bold" style={{ color: textColor }}>
                          بحث صوتي
                        </p>
                        <p className="text-[11px]" style={{ color: subtleText }}>
                          اضغط وقل اسم الخدمة التي تبحث عنها
                        </p>
                      </div>
                    </motion.button>
                  )}

                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} strokeWidth={1.5} color={subtleText} />
                          <span className="text-xs font-bold" style={{ color: secondaryText }}>
                            عمليات البحث الأخيرة
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            clearRecentSearches();
                            setRecentSearches([]);
                          }}
                          className="text-[10px] font-bold"
                          style={{ color: '#5C1A1B' }}
                        >
                          مسح الكل
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((search, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.03 * i }}
                            onClick={() => handleRecentClick(search)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                              border: `1px solid ${borderColor}`,
                            }}
                          >
                            <Clock size={10} strokeWidth={1.5} color={subtleText} />
                            <span className="text-xs font-medium" style={{ color: secondaryText }}>
                              {search}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Searches */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2 px-1">
                      <Sparkles size={12} strokeWidth={1.5} color="#5C1A1B" />
                      <span className="text-xs font-bold" style={{ color: secondaryText }}>
                        خدمات مقترحة
                      </span>
                    </div>
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: cardBg,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {suggestedSearches.map((suggestion, i) => {
                        const iconSrc = productIcons[suggestion.icon] || serviceIcons[suggestion.icon] || serviceIcons['instant-pay'];
                        return (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.03 * i }}
                            onClick={() => handleRecentClick(suggestion.text)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 active:scale-[0.98] transition-transform"
                            style={{
                              borderBottom: i < suggestedSearches.length - 1
                                ? `1px solid ${borderColor}`
                                : 'none',
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                            >
                              <img src={iconSrc} alt="" className="w-5 h-5 object-contain" draggable={false} />
                            </div>
                            <span className="text-sm font-medium flex-1 text-right" style={{ color: textColor }}>
                              {suggestion.text}
                            </span>
                            <Search size={12} strokeWidth={1.5} color={subtleText} />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
