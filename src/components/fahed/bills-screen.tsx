'use client';

import { useState, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Search,
  Zap,
  Droplets,
  Wifi,
  Landmark,
  Hash,
  CreditCard,
  CheckCircle2,
  Loader2,
  Receipt,
  Clock,
  AlertCircle,
  Share2,
  RotateCcw,
  X,
  BadgeCheck,
  Plus,
  ToggleLeft,
  ToggleRight,
  FileText,
  BookmarkPlus,
  Bookmark,
  Calendar,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, generateReference } from '@/lib/utils';

type BillCategory = 'electricity' | 'water' | 'internet' | 'government';
type BillStep = 'search' | 'details' | 'confirm' | 'processing' | 'success' | 'receipt';

interface BillCategoryDef {
  id: BillCategory;
  name: string;
  icon: React.ReactNode;
  color: string;
  providers: BillProvider[];
}

interface BillProvider {
  id: string;
  name: string;
  color: string;
  inputLabel: string;
  inputPlaceholder: string;
}

interface BillDetails {
  accountNumber: string;
  providerName: string;
  providerId: string;
  category: BillCategory;
  amount: number;
  dueDate: string;
  period: string;
  status: 'unpaid' | 'overdue' | 'paid';
}

interface SavedAccount {
  id: string;
  accountNumber: string;
  providerName: string;
  providerId: string;
  category: BillCategory;
  label: string;
  autoPay: boolean;
}

interface BillPaymentRecord {
  id: string;
  accountNumber: string;
  providerName: string;
  category: BillCategory;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
}

const billCategories: BillCategoryDef[] = [
  {
    id: 'electricity',
    name: 'كهرباء',
    icon: <Zap size={20} strokeWidth={1.5} />,
    color: '#F59E0B',
    providers: [
      { id: 'elec-sanaa', name: 'كهرباء صنعاء', color: '#F59E0B', inputLabel: 'رقم العداد', inputPlaceholder: 'أدخل رقم العداد' },
      { id: 'elec-aden', name: 'كهرباء عدن', color: '#3B82F6', inputLabel: 'رقم العداد', inputPlaceholder: 'أدخل رقم العداد' },
    ],
  },
  {
    id: 'water',
    name: 'مياه',
    icon: <Droplets size={20} strokeWidth={1.5} />,
    color: '#06B6D4',
    providers: [
      { id: 'water-sanaa', name: 'مياه صنعاء', color: '#06B6D4', inputLabel: 'رقم الاشتراك', inputPlaceholder: 'أدخل رقم الاشتراك' },
      { id: 'water-aden', name: 'مياه عدن', color: '#0EA5E9', inputLabel: 'رقم الاشتراك', inputPlaceholder: 'أدخل رقم الاشتراك' },
    ],
  },
  {
    id: 'internet',
    name: 'إنترنت',
    icon: <Wifi size={20} strokeWidth={1.5} />,
    color: '#8B5CF6',
    providers: [
      { id: 'yemen-net', name: 'يمن نت', color: '#8B5CF6', inputLabel: 'رقم الحساب', inputPlaceholder: 'أدخل رقم الحساب' },
      { id: 'y-net-internet', name: 'واي نت', color: '#059669', inputLabel: 'رقم الهاتف', inputPlaceholder: 'أدخل رقم الهاتف' },
    ],
  },
  {
    id: 'government',
    name: 'حكومية',
    icon: <Landmark size={20} strokeWidth={1.5} />,
    color: '#6B7280',
    providers: [
      { id: 'civil-registry', name: 'السجل المدني', color: '#6B7280', inputLabel: 'رقم الهوية', inputPlaceholder: 'أدخل رقم الهوية' },
      { id: 'traffic', name: 'المرور', color: '#DC2626', inputLabel: 'رقم اللوحة', inputPlaceholder: 'أدخل رقم اللوحة' },
    ],
  },
];

// Mock bill details based on account number
const mockBillDetails: Record<string, BillDetails> = {
  '12345': {
    accountNumber: '12345',
    providerName: 'كهرباء صنعاء',
    providerId: 'elec-sanaa',
    category: 'electricity',
    amount: 4500,
    dueDate: '2025-02-28',
    period: 'يناير 2025',
    status: 'unpaid',
  },
  '67890': {
    accountNumber: '67890',
    providerName: 'مياه صنعاء',
    providerId: 'water-sanaa',
    category: 'water',
    amount: 3200,
    dueDate: '2025-02-20',
    period: 'يناير 2025',
    status: 'unpaid',
  },
  '11111': {
    accountNumber: '11111',
    providerName: 'يمن نت',
    providerId: 'yemen-net',
    category: 'internet',
    amount: 3500,
    dueDate: '2025-02-15',
    period: 'فبراير 2025',
    status: 'overdue',
  },
};

// Mock saved accounts
const initialSavedAccounts: SavedAccount[] = [
  { id: 'saved-1', accountNumber: '12345', providerName: 'كهرباء صنعاء', providerId: 'elec-sanaa', category: 'electricity', label: 'منزل - صنعاء', autoPay: true },
  { id: 'saved-2', accountNumber: '67890', providerName: 'مياه صنعاء', providerId: 'water-sanaa', category: 'water', label: 'منزل - صنعاء', autoPay: false },
];

// Mock payment history
const initialPaymentHistory: BillPaymentRecord[] = [
  { id: 'BILL-001', accountNumber: '12345', providerName: 'كهرباء صنعاء', category: 'electricity', amount: 4200, date: '2025-01-05T10:30:00', status: 'completed' },
  { id: 'BILL-002', accountNumber: '67890', providerName: 'مياه صنعاء', category: 'water', amount: 3100, date: '2025-01-03T14:20:00', status: 'completed' },
  { id: 'BILL-003', accountNumber: '12345', providerName: 'كهرباء صنعاء', category: 'electricity', amount: 3800, date: '2024-12-05T09:15:00', status: 'completed' },
];

export default function BillsScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, user, addTransaction, addNotification, setUser } = useAppStore();

  const [step, setStep] = useState<BillStep>('search');
  const [selectedCategory, setSelectedCategory] = useState<BillCategory | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<BillProvider | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [billDetails, setBillDetails] = useState<BillDetails | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(initialSavedAccounts);
  const [paymentHistory, setPaymentHistory] = useState<BillPaymentRecord[]>(initialPaymentHistory);
  const [completedPayment, setCompletedPayment] = useState<BillPaymentRecord | null>(null);
  const [searchError, setSearchError] = useState('');
  const [saveAccountLabel, setSaveAccountLabel] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const subTextColor = isDark ? '#888' : '#AAA';
  const inputBg = isDark ? '#141414' : '#F8F8F8';

  const getCategoryColor = (catId: BillCategory) => {
    return billCategories.find(c => c.id === catId)?.color || '#5C1A1B';
  };

  const getCategoryIcon = (catId: BillCategory) => {
    return billCategories.find(c => c.id === catId)?.icon;
  };

  const handleSearchBill = async () => {
    if (!accountNumber.trim()) return;

    setIsSearching(true);
    setSearchError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const found = mockBillDetails[accountNumber.trim()];
    if (found) {
      setBillDetails(found);
      setStep('details');
    } else {
      // Generate a mock bill for any account number
      if (selectedProvider) {
        setBillDetails({
          accountNumber: accountNumber.trim(),
          providerName: selectedProvider.name,
          providerId: selectedProvider.id,
          category: selectedCategory || 'electricity',
          amount: Math.floor(1000 + Math.random() * 5000),
          dueDate: '2025-02-28',
          period: 'يناير 2025',
          status: 'unpaid',
        });
        setStep('details');
      } else {
        setSearchError('لم يتم العثور على فاتورة بهذا الرقم');
      }
    }
    setIsSearching(false);
  };

  const handleSavedAccountClick = (account: SavedAccount) => {
    setAccountNumber(account.accountNumber);
    setSelectedCategory(account.category);
    const provider = billCategories
      .flatMap(c => c.providers)
      .find(p => p.id === account.providerId);
    if (provider) {
      setSelectedProvider(provider);
    }
    // Auto search
    const found = mockBillDetails[account.accountNumber];
    if (found) {
      setBillDetails(found);
      setStep('details');
    }
  };

  const handleConfirmPayment = async () => {
    if (!billDetails || !user) return;

    setIsProcessing(true);
    setStep('processing');

    try {
      const currentBalance = user.balanceYER || 0;
      const newBalance = currentBalance - billDetails.amount;

      await new Promise(resolve => setTimeout(resolve, 1500));

      const updatedUser = { ...user, balanceYER: newBalance };
      setUser(updatedUser);

      const paymentId = generateReference();
      const newPayment: BillPaymentRecord = {
        id: paymentId,
        accountNumber: billDetails.accountNumber,
        providerName: billDetails.providerName,
        category: billDetails.category,
        amount: billDetails.amount,
        date: new Date().toISOString(),
        status: 'completed',
      };

      addTransaction({
        id: generateReference(),
        fromUserId: user.id,
        toUserId: 'bill-payment',
        amount: billDetails.amount,
        currency: 'YER',
        type: 'bill',
        status: 'completed',
        description: `دفع فاتورة ${billDetails.providerName} - ${billDetails.accountNumber}`,
        createdAt: new Date().toISOString(),
      });

      addNotification({
        id: generateReference(),
        title: 'تم الدفع بنجاح',
        body: `تم دفع فاتورة ${billDetails.providerName} بمبلغ ${billDetails.amount.toLocaleString()} ${currencySymbols.YER}`,
        type: 'transaction',
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      setPaymentHistory(prev => [newPayment, ...prev]);
      setCompletedPayment(newPayment);
      setStep('receipt');
    } catch {
      setStep('details');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAutoPay = (accountId: string) => {
    setSavedAccounts(prev =>
      prev.map(acc =>
        acc.id === accountId ? { ...acc, autoPay: !acc.autoPay } : acc
      )
    );
  };

  const handleSaveAccount = () => {
    if (!saveAccountLabel.trim() || !billDetails) return;
    const newSaved: SavedAccount = {
      id: `saved-${Date.now()}`,
      accountNumber: billDetails.accountNumber,
      providerName: billDetails.providerName,
      providerId: billDetails.providerId,
      category: billDetails.category,
      label: saveAccountLabel.trim(),
      autoPay: false,
    };
    setSavedAccounts(prev => [newSaved, ...prev]);
    setShowSaveDialog(false);
    setSaveAccountLabel('');
  };

  const handleShareReceipt = async () => {
    if (!completedPayment || !billDetails) return;
    const text = `إيصال دفع فاتورة - محفظة الجنوب\nرقم المرجع: ${completedPayment.id}\nالمزود: ${billDetails.providerName}\nرقم الحساب: ${billDetails.accountNumber}\nالمبلغ: ${billDetails.amount.toLocaleString()} ${currencySymbols.YER}\nالفترة: ${billDetails.period}\nالتاريخ: ${new Date().toLocaleDateString('ar-SA')}\nالحالة: مكتمل`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'إيصال دفع فاتورة', text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      try { await navigator.clipboard.writeText(text); } catch {}
    }
  };

  const handleReset = () => {
    setSelectedCategory(null);
    setSelectedProvider(null);
    setAccountNumber('');
    setBillDetails(null);
    setStep('search');
    setSearchError('');
    setCompletedPayment(null);
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: isDark ? '#0A0A0A' : '#F5F5F5' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'search') {
                setActiveScreen('main');
              } else if (step === 'details') {
                setStep('search');
              } else if (step === 'confirm') {
                setStep('details');
              } else {
                handleReset();
              }
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            سداد الفواتير
          </h1>
        </div>
      </motion.div>

      <div className="px-4">
        <AnimatePresence mode="wait">
          {/* ==================== SEARCH STEP ==================== */}
          {step === 'search' && (
            <motion.div
              key="search-step"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              {/* Bill Categories */}
              <div>
                <h3 className="text-xs font-bold mb-3" style={{ color: isDark ? '#AAA' : '#888' }}>
                  اختر نوع الفاتورة
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {billCategories.map((cat, index) => (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.03 * index }}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedProvider(null);
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                      style={{
                        background: selectedCategory === cat.id
                          ? (isDark ? '#1A1A1A' : '#FFFFFF')
                          : (isDark ? '#141414' : '#FAFAFA'),
                        border: selectedCategory === cat.id
                          ? `2px solid ${cat.color}`
                          : `1px solid ${borderColor}`,
                        boxShadow: selectedCategory === cat.id
                          ? `0 4px 12px ${cat.color}20`
                          : 'none',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${cat.color}15`, color: cat.color }}
                      >
                        {cat.icon}
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {cat.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Provider Selection */}
              {selectedCategory && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-xs font-bold mb-3" style={{ color: isDark ? '#AAA' : '#888' }}>
                    اختر المزود
                  </h3>
                  <div className="space-y-2">
                    {billCategories.find(c => c.id === selectedCategory)?.providers.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => setSelectedProvider(provider)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                        style={{
                          background: selectedProvider?.id === provider.id
                            ? (isDark ? '#1A1A1A' : '#FFFFFF')
                            : inputBg,
                          border: selectedProvider?.id === provider.id
                            ? `2px solid ${provider.color}`
                            : `1px solid ${borderColor}`,
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${provider.color}15` }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ background: provider.color }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                          {provider.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Account Number Search */}
              {selectedProvider && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-xs font-bold mb-3" style={{ color: isDark ? '#AAA' : '#888' }}>
                    {selectedProvider.inputLabel}
                  </h3>
                  <div
                    className="flex items-center gap-2 px-4 py-3.5 rounded-2xl"
                    style={{ background: inputBg, border: `1px solid ${borderColor}` }}
                  >
                    <Hash size={18} strokeWidth={1.5} color={selectedProvider.color} />
                    <input
                      type="text"
                      placeholder={selectedProvider.inputPlaceholder}
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        setSearchError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearchBill();
                      }}
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    />
                  </div>

                  {searchError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs mt-2 flex items-center gap-1"
                      style={{ color: '#EF4444' }}
                    >
                      <AlertCircle size={12} strokeWidth={1.5} />
                      {searchError}
                    </motion.p>
                  )}

                  <motion.button
                    onClick={handleSearchBill}
                    disabled={!accountNumber.trim() || isSearching}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm mt-3 disabled:opacity-40"
                    style={{
                      background: `linear-gradient(135deg, ${selectedProvider.color} 0%, ${selectedProvider.color}CC 100%)`,
                      boxShadow: `0 4px 12px ${selectedProvider.color}30`,
                    }}
                  >
                    {isSearching ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Search size={16} strokeWidth={2} />
                        بحث عن فاتورة
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}

              {/* Saved Accounts */}
              {savedAccounts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Bookmark size={16} strokeWidth={1.5} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      الحسابات المحفوظة
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {savedAccounts.map((account, index) => {
                      const catColor = getCategoryColor(account.category);
                      return (
                        <motion.button
                          key={account.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.04 * index }}
                          onClick={() => handleSavedAccountClick(account)}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center gap-3 p-3 rounded-2xl"
                          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${catColor}15` }}
                          >
                            <span style={{ color: catColor, transform: 'scale(0.85)' }}>
                              {getCategoryIcon(account.category)}
                            </span>
                          </div>
                          <div className="flex-1 text-right min-w-0">
                            <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                              {account.label}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: subTextColor }}>
                              {account.providerName} • {account.accountNumber}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {account.autoPay && (
                              <span
                                className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.15)' }}
                              >
                                تلقائي
                              </span>
                            )}
                            <ChevronLeft size={14} strokeWidth={1.5} color={subTextColor} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Payment History */}
              {paymentHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} strokeWidth={1.5} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      سجل المدفوعات
                    </h3>
                  </div>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                  >
                    {paymentHistory.slice(0, 5).map((record, index) => {
                      const catColor = getCategoryColor(record.category);
                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 px-4 py-3"
                          style={{
                            borderBottom: index < Math.min(paymentHistory.length, 5) - 1
                              ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
                              : 'none',
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${catColor}15` }}
                          >
                            <span style={{ color: catColor, transform: 'scale(0.75)' }}>
                              {getCategoryIcon(record.category)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                              {record.providerName}
                            </p>
                            <p className="text-[9px] mt-0.5" style={{ color: subTextColor }}>
                              {new Date(record.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-xs font-bold" style={{ color: catColor }}>
                              {record.amount.toLocaleString()} {currencySymbols.YER}
                            </p>
                            <span className="text-[9px] font-medium" style={{ color: '#10B981' }}>مكتمل</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ==================== BILL DETAILS ==================== */}
          {step === 'details' && billDetails && (
            <motion.div
              key="bill-details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* Bill Card */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${getCategoryColor(billDetails.category)}15 0%, ${getCategoryColor(billDetails.category)}05 100%)`,
                  border: `1px solid ${getCategoryColor(billDetails.category)}20`,
                }}
              >
                <div className="p-4">
                  {/* Provider Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${getCategoryColor(billDetails.category)}20` }}
                    >
                      <span style={{ color: getCategoryColor(billDetails.category), transform: 'scale(0.85)' }}>
                        {getCategoryIcon(billDetails.category)}
                      </span>
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {billDetails.providerName}
                      </h3>
                      <p className="text-[11px]" style={{ color: subTextColor }}>
                        رقم الحساب: {billDetails.accountNumber}
                      </p>
                    </div>
                  </div>

                  {/* Bill Info */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: subTextColor }}>الفترة</span>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {billDetails.period}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: subTextColor }}>تاريخ الاستحقاق</span>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                        {new Date(billDetails.dueDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="h-px" style={{ background: `${getCategoryColor(billDetails.category)}15` }} />
                    <div className="flex justify-between items-end">
                      <span className="text-xs" style={{ color: subTextColor }}>المبلغ المستحق</span>
                      <div className="text-left">
                        <p className="text-xl font-bold" style={{ color: getCategoryColor(billDetails.category) }}>
                          {billDetails.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px]" style={{ color: subTextColor }}>{currencySymbols.YER}</p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs" style={{ color: subTextColor }}>الحالة</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{
                          background: billDetails.status === 'overdue' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          color: billDetails.status === 'overdue' ? '#EF4444' : '#F59E0B',
                          border: `1px solid ${billDetails.status === 'overdue' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                        }}
                      >
                        {billDetails.status === 'overdue' ? 'متأخرة' : 'غير مدفوعة'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Check */}
              <div
                className="rounded-2xl p-4"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                <div className="flex justify-between">
                  <span className="text-xs" style={{ color: subTextColor }}>رصيدك الحالي</span>
                  <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    {(user?.balanceYER || 0).toLocaleString()} {currencySymbols.YER}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>الرصيد بعد الدفع</span>
                  <span
                    className="text-sm font-bold"
                    style={{ color: (user?.balanceYER || 0) - billDetails.amount >= 0 ? '#10B981' : '#5C1A1B' }}
                  >
                    {((user?.balanceYER || 0) - billDetails.amount).toLocaleString()} {currencySymbols.YER}
                  </span>
                </div>
              </div>

              {(user?.balanceYER || 0) < billDetails.amount && (
                <div
                  className="rounded-2xl p-3 flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                  <AlertCircle size={14} strokeWidth={1.5} color="#EF4444" />
                  <p className="text-[11px] font-medium" style={{ color: '#EF4444' }}>
                    رصيدك غير كافي لدفع هذه الفاتورة
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center gap-1.5"
                  style={{
                    background: isDark ? '#2D2D2D' : '#F0F0F0',
                    color: isDark ? '#FFF' : '#1a1a1a',
                  }}
                >
                  <BookmarkPlus size={14} strokeWidth={1.5} />
                  حفظ
                </button>
                <motion.button
                  onClick={() => setStep('confirm')}
                  disabled={(user?.balanceYER || 0) < billDetails.amount}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(billDetails.category)} 0%, ${getCategoryColor(billDetails.category)}CC 100%)`,
                    boxShadow: `0 4px 12px ${getCategoryColor(billDetails.category)}30`,
                  }}
                >
                  <CreditCard size={16} strokeWidth={2} />
                  دفع الفاتورة
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ==================== CONFIRM ==================== */}
          {step === 'confirm' && billDetails && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div
                className="rounded-2xl p-4"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Receipt size={16} strokeWidth={1.5} color="#5C1A1B" />
                  <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                    تأكيد دفع الفاتورة
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المزود</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {billDetails.providerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>رقم الحساب</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">
                      {billDetails.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>الفترة</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {billDetails.period}
                    </span>
                  </div>
                  <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المبلغ</span>
                    <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                      {billDetails.amount.toLocaleString()} {currencySymbols.YER}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>الرصيد بعد الدفع</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: (user?.balanceYER || 0) - billDetails.amount >= 0 ? '#10B981' : '#5C1A1B' }}
                    >
                      {((user?.balanceYER || 0) - billDetails.amount).toLocaleString()} {currencySymbols.YER}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm"
                  style={{
                    background: isDark ? '#2D2D2D' : '#F0F0F0',
                    color: isDark ? '#FFF' : '#1a1a1a',
                  }}
                >
                  رجوع
                </button>
                <motion.button
                  onClick={handleConfirmPayment}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(billDetails.category)} 0%, ${getCategoryColor(billDetails.category)}CC 100%)`,
                    boxShadow: `0 4px 12px ${getCategoryColor(billDetails.category)}30`,
                  }}
                >
                  <CreditCard size={16} strokeWidth={2} />
                  تأكيد الدفع
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ==================== PROCESSING ==================== */}
          {step === 'processing' && billDetails && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${getCategoryColor(billDetails.category)}15` }}>
                <Loader2 size={28} strokeWidth={1.5} color={getCategoryColor(billDetails.category)} className="animate-spin" />
              </div>
              <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                جاري المعالجة
              </h3>
              <p className="text-sm mt-2" style={{ color: subTextColor }}>
                يرجى الانتظار...
              </p>
            </motion.div>
          )}

          {/* ==================== RECEIPT ==================== */}
          {step === 'receipt' && completedPayment && billDetails && (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Success Badge */}
              <div className="flex flex-col items-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: 'rgba(16,185,129,0.15)' }}
                >
                  <CheckCircle2 size={32} strokeWidth={2} color="#10B981" />
                </motion.div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  تم الدفع بنجاح
                </h3>
                <p className="text-sm mt-1" style={{ color: subTextColor }}>
                  فاتورة {billDetails.providerName}
                </p>
              </div>

              {/* Receipt Card */}
              <div
                className="rounded-2xl p-4"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>رقم المرجع</span>
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">
                      {completedPayment.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المزود</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {billDetails.providerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>رقم الحساب</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">
                      {billDetails.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>الفترة</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {billDetails.period}
                    </span>
                  </div>
                  <div className="h-px" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>المبلغ</span>
                    <span className="text-sm font-bold" style={{ color: '#5C1A1B' }}>
                      {completedPayment.amount.toLocaleString()} {currencySymbols.YER}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>التاريخ</span>
                    <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                      {new Date(completedPayment.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ color: subTextColor }}>الحالة</span>
                    <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                      <BadgeCheck size={12} className="inline ml-1" />
                      مكتمل
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleShareReceipt}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{
                    background: isDark ? '#2D2D2D' : '#F0F0F0',
                    color: isDark ? '#FFF' : '#1a1a1a',
                  }}
                >
                  <Share2 size={14} strokeWidth={1.5} />
                  مشاركة
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <RotateCcw size={14} strokeWidth={1.5} />
                  فاتورة جديدة
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save Account Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-5"
              style={{ background: cardBg, border: `1px solid ${borderColor}` }}
            >
              <h3 className="text-sm font-bold mb-4" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                حفظ الحساب
              </h3>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
                style={{ background: inputBg, border: `1px solid ${borderColor}` }}
              >
                <BookmarkPlus size={16} strokeWidth={1.5} color="#5C1A1B" />
                <input
                  type="text"
                  placeholder="اسم للحساب (مثل: منزل صنعاء)"
                  value={saveAccountLabel}
                  onChange={(e) => setSaveAccountLabel(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: isDark ? '#2D2D2D' : '#F0F0F0',
                    color: isDark ? '#FFF' : '#1a1a1a',
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveAccount}
                  disabled={!saveAccountLabel.trim()}
                  className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-40"
                  style={{ background: '#5C1A1B' }}
                >
                  حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
