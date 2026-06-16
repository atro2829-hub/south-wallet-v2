'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  Wallet,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
} from 'lucide-react';

const balanceCards = [
  {
    id: 0,
    currency: 'YER',
    currencyAr: 'ر.ي',
    currencyName: 'الريال اليمني',
    balance: 0,
    income: 4300,
    expense: 1130,
    gradientFrom: '#C1121F',
    gradientTo: '#5C1A1B',
    flagEmoji: '🇾🇪',
  },
  {
    id: 1,
    currency: 'SAR',
    currencyAr: 'ر.س',
    currencyName: 'الريال السعودي',
    balance: 0,
    income: 2000,
    expense: 500,
    gradientFrom: '#0D5A1F',
    gradientTo: '#1B7A2B',
    flagEmoji: '🇸🇦',
  },
  {
    id: 2,
    currency: 'USD',
    currencyAr: '$',
    currencyName: 'الدولار الأمريكي',
    balance: 0,
    income: 1000,
    expense: 350,
    gradientFrom: '#0D47A1',
    gradientTo: '#1565C0',
    flagEmoji: '🇺🇸',
  },
];

const walletTransactions = [
  { id: 1, title: 'تحويل إلى أحمد', subtitle: 'تحويل أموال', amount: -500, currency: 'SAR', date: 'اليوم ١١:٤٥', type: 'transfer' },
  { id: 2, title: 'إيداع رصيد', subtitle: 'عبر نقطة البيع', amount: 2000, currency: 'YER', date: 'اليوم ٠٩:٣٠', type: 'deposit' },
  { id: 3, title: 'شراء من المتجر', subtitle: 'متجر إلكتروني', amount: -350, currency: 'USD', date: 'أمس ١٥:٢٠', type: 'purchase' },
  { id: 4, title: 'تحويل وارد', subtitle: 'من محمد', amount: 800, currency: 'SAR', date: 'أمس ١٢:٠٠', type: 'incoming' },
  { id: 5, title: 'دفع فاتورة كهرباء', subtitle: 'شركة الكهرباء', amount: -180, currency: 'YER', date: '٠٤/٠٦', type: 'bill' },
  { id: 6, title: 'شحن رصيد', subtitle: 'خط 773649653', amount: -25, currency: 'YER', date: '٠٣/٠٦', type: 'recharge' },
  { id: 7, title: 'تحويل وارد', subtitle: 'من ليلى', amount: 1500, currency: 'USD', date: '٠٢/٠٦', type: 'incoming' },
  { id: 8, title: 'شراء بطاقة لعبة', subtitle: 'ببجي موبايل', amount: -75, currency: 'SAR', date: '٠١/٠٦', type: 'purchase' },
];

const filterTabs = ['الكل', 'وارد', 'صادر'];

// SVG card pattern matching home screen
function CardPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="none">
      <circle cx="350" cy="30" r="60" fill="white" fillOpacity="0.05" />
      <circle cx="370" cy="10" r="40" fill="white" fillOpacity="0.03" />
      <circle cx="50" cy="210" r="50" fill="white" fillOpacity="0.04" />
      <g fill="white" fillOpacity="0.06">
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 12 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={20 + col * 16} cy={170 + row * 8} r="1.5" />
          ))
        )}
      </g>
      <path d="M0 200 Q100 180 200 200 Q300 220 400 200" stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none" />
    </svg>
  );
}

function WalletBalanceCard({
  card,
  balanceVisible,
  onToggleBalance,
}: {
  card: typeof balanceCards[0];
  balanceVisible: boolean;
  onToggleBalance: () => void;
}) {
  return (
    <div
      className="relative w-full h-full rounded-[20px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${card.gradientFrom} 0%, ${card.gradientTo} 50%, ${card.gradientFrom} 100%)`,
      }}
    >
      <CardPattern />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 p-5 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/70 text-sm font-bold">رصيد المحفظة</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 backdrop-blur-sm">
            <span className="text-sm">{card.flagEmoji}</span>
            <span className="text-white/80 text-xs font-medium">{card.currency}</span>
          </div>
        </div>

        <motion.div
          className="flex items-baseline gap-2 mb-4"
          key={`wbal-${balanceVisible}-${card.currency}`}
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.4 }}
        >
          <span className="text-white text-3xl font-bold tracking-tight">
            {balanceVisible ? card.balance.toLocaleString('ar-SA') : '••••'}
          </span>
          <span className="text-white/40 text-sm font-semibold">{card.currencyAr}</span>
        </motion.div>

        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 flex-1 backdrop-blur-sm">
            <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div>
              <p className="text-white/50 text-[9px]">وارد</p>
              <p className="text-white text-xs font-bold">
                {balanceVisible ? card.income.toLocaleString('ar-SA') : '••••'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 flex-1 backdrop-blur-sm">
            <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div>
              <p className="text-white/50 text-[9px]">صادر</p>
              <p className="text-white text-xs font-bold">
                {balanceVisible ? card.expense.toLocaleString('ar-SA') : '••••'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/35 text-[11px] font-medium">{card.currencyName}</span>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBalance();
            }}
            className="p-1.5 rounded-full bg-white/15 backdrop-blur-sm"
            whileTap={{ scale: 0.85, rotate: 15 }}
          >
            {balanceVisible ? (
              <Eye className="w-4 h-4 text-white/70" />
            ) : (
              <EyeOff className="w-4 h-4 text-white/70" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default function WalletScreen() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeFilter, setActiveFilter] = useState('الكل');
  const [activeCard, setActiveCard] = useState(0);

  const currentBalance = balanceCards[activeCard];

  const filteredTransactions = walletTransactions.filter((tx) => {
    if (activeFilter === 'الكل') return true;
    if (activeFilter === 'وارد') return tx.amount > 0;
    return tx.amount < 0;
  });

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 40;
    if (info.offset.x < -threshold) {
      setActiveCard((prev) => Math.min(balanceCards.length - 1, prev + 1));
    } else if (info.offset.x > threshold) {
      setActiveCard((prev) => Math.max(0, prev - 1));
    }
  }, []);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-[20px] font-bold text-[#1a1a1a]">المحفظة</h1>
      </div>

      {/* Balance Card Carousel - viewportFraction with side peek */}
      <div className="px-4 py-2">
        <div className="relative overflow-visible" style={{ height: '240px' }}>
          {balanceCards.map((card, index) => {
            const offset = index - activeCard;
            const isActive = offset === 0;
            const isVisible = Math.abs(offset) <= 1;

            if (!isVisible) return null;

            return (
              <motion.div
                key={card.id}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                style={{
                  zIndex: 10 - Math.abs(offset),
                  margin: '0 4px',
                }}
                animate={{
                  x: offset * -82,
                  scale: isActive ? 1 : 0.88,
                  opacity: isActive ? 1 : 0.45,
                  rotateZ: isActive ? 0 : offset * -1.5,
                }}
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 280,
                  damping: 30,
                  mass: 0.8,
                }}
                drag={isActive ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={isActive ? handleDragEnd : undefined}
                whileDrag={isActive ? {
                  scale: 0.96,
                  boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                } : undefined}
              >
                <WalletBalanceCard
                  card={card}
                  balanceVisible={balanceVisible}
                  onToggleBalance={() => setBalanceVisible(!balanceVisible)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {balanceCards.map((card, i) => (
            <motion.button key={i} onClick={() => setActiveCard(i)} whileTap={{ scale: 0.8 }}>
              <motion.div
                className="rounded-full"
                animate={{
                  width: i === activeCard ? 24 : 8,
                  height: 8,
                  backgroundColor: i === activeCard ? card.gradientTo : '#d1d5db',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-2 pt-1">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <Search className="w-[18px] h-[18px] text-gray-400 stroke-[1.5px]" />
          <input
            type="text"
            placeholder="ابحث في العمليات..."
            className="flex-1 text-sm bg-transparent outline-none text-[#1a1a1a] placeholder:text-gray-400 font-medium"
          />
          <button className="p-1.5 rounded-lg bg-[#F8F8F8] active:scale-90 transition-transform">
            <Filter className="w-[18px] h-[18px] text-[#1a1a1a] stroke-[1.5px]" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFilter === tab
                  ? 'bg-[#5C1A1B] text-white shadow-[0_2px_8px_rgba(92,26,27,0.25)]'
                  : 'bg-white text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-[#1a1a1a]">آخر العمليات</h2>
          <button className="text-[#5C1A1B] text-xs font-bold">عرض الكل</button>
        </div>
        <div className="space-y-2.5 max-h-96 overflow-y-auto">
          {filteredTransactions.map((tx, index) => {
            const txCurrency = balanceCards.find(c => c.currency === tx.currency);
            return (
              <motion.div
                key={tx.id}
                className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  {tx.amount > 0 ? (
                    <ArrowDownRight className="w-[18px] h-[18px] text-green-500 stroke-[1.5px]" />
                  ) : (
                    <ArrowUpRight className="w-[18px] h-[18px] text-[#5C1A1B] stroke-[1.5px]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-bold text-[#1a1a1a] truncate">{tx.title}</h4>
                  <p className="text-[11px] text-gray-400 truncate font-medium">{tx.subtitle}</p>
                </div>
                <div className="text-left shrink-0">
                  <p
                    className={`text-[13px] font-bold ${
                      tx.amount > 0 ? 'text-green-500' : 'text-[#5C1A1B]'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount.toLocaleString('ar-SA')}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-[9px]">{txCurrency?.flagEmoji}</span>
                    <p className="text-[9px] text-gray-400 font-medium">{txCurrency?.currencyAr}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
