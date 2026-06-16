'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Bell,
  Headphones,
  Eye,
  EyeOff,
  FileText,
  ArrowLeftRight,
  RotateCcw,
  Smartphone,
  ShoppingBag,
  Wifi,
  FileSpreadsheet,
  Gamepad2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

// ====== SERVICES: Line Icons with red accent - Minimalist style ======
const services = [
  { icon: FileText, label: 'المدفوعات الفورية' },
  { icon: ArrowLeftRight, label: 'تحويل الأموال' },
  { icon: RotateCcw, label: 'طلب الأموال' },
  { icon: Smartphone, label: 'شحن رصيد' },
  { icon: ShoppingBag, label: 'متجر الجيب' },
  { icon: Wifi, label: 'دفع الفواتير' },
  { icon: FileSpreadsheet, label: 'كشف حساب' },
  { icon: Gamepad2, label: 'بطاقات الألعاب' },
  { icon: Wallet, label: 'المحفظة' },
];

const transactions = [
  { id: 1, title: 'شراء', subtitle: 'متجر إلكتروني', amount: -150, currency: 'YER', date: 'اليوم ١٠:٣٠', type: 'purchase' },
  { id: 2, title: 'تحويل وارد', subtitle: 'من أحمد', amount: 500, currency: 'SAR', date: 'أمس ٠٢:١٥', type: 'incoming' },
  { id: 3, title: 'دفع فاتورة', subtitle: 'فاتورة كهرباء', amount: -200, currency: 'YER', date: '٠٣/٠٦', type: 'bill' },
  { id: 4, title: 'شحن رصيد', subtitle: 'خط 773649653', amount: -50, currency: 'YER', date: '٠٢/٠٦', type: 'recharge' },
  { id: 5, title: 'تحويل وارد', subtitle: 'من سارة', amount: 1000, currency: 'USD', date: '٠١/٠٦', type: 'incoming' },
];

// ====== BALANCE CARDS: 3 currencies with gradient colors ======
const balanceCards = [
  {
    id: 0,
    currency: 'YER',
    currencyAr: 'ر.ي',
    currencyName: 'الريال اليمني',
    balance: 0,
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
    gradientFrom: '#0D47A1',
    gradientTo: '#1565C0',
    flagEmoji: '🇺🇸',
  },
];

// ====== CARD PATTERN: SVG texture like a real plastic card ======
function CardPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
      {/* Top-right decorative circle */}
      <circle cx="350" cy="30" r="60" fill="white" fillOpacity="0.05" />
      <circle cx="370" cy="10" r="40" fill="white" fillOpacity="0.03" />
      {/* Bottom-left decorative circle */}
      <circle cx="50" cy="180" r="50" fill="white" fillOpacity="0.04" />
      {/* Dot pattern - bottom area like real card */}
      <g fill="white" fillOpacity="0.06">
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 12 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={20 + col * 16} cy={140 + row * 8} r="1.5" />
          ))
        )}
      </g>
      {/* Subtle wave lines */}
      <path d="M0 160 Q100 140 200 160 Q300 180 400 160" stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none" />
      <path d="M0 170 Q100 150 200 170 Q300 190 400 170" stroke="white" strokeOpacity="0.03" strokeWidth="1" fill="none" />
    </svg>
  );
}

// ====== BALANCE CARD: Looks like a real plastic card ======
function BalanceCard({
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
      {/* Card texture pattern */}
      <CardPattern />

      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-5 h-full flex flex-col justify-between">
        {/* Top row: Logo + Currency badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Wallet className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-wide">جيب</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 backdrop-blur-sm">
            <span className="text-sm">{card.flagEmoji}</span>
            <span className="text-white/90 text-[11px] font-semibold">{card.currency}</span>
          </div>
        </div>

        {/* Balance section */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-white/60 text-[11px] mb-1.5">رصيدك الحالي</p>
          <motion.div
            className="flex items-end gap-2"
            key={`bal-${balanceVisible}-${card.currency}`}
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <span className="text-white text-[44px] font-bold leading-none tracking-tight">
              {balanceVisible ? card.balance.toLocaleString('ar-SA') : '••••'}
            </span>
            <span className="text-white/40 text-base font-semibold mb-1.5">{card.currencyAr}</span>
          </motion.div>
        </div>

        {/* Bottom row: Currency name + Eye toggle (Privacy Feature) */}
        <div className="flex items-center justify-between">
          <span className="text-white/35 text-[11px] font-medium">{card.currencyName}</span>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBalance();
            }}
            className="p-2 rounded-full bg-white/15 backdrop-blur-sm active:scale-90 transition-transform"
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

// ====== HOME SCREEN: Main layout following the detailed design specs ======
export default function HomeScreen() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeCard, setActiveCard] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 40;
    if (info.offset.x < -threshold) {
      setActiveCard((prev) => Math.min(balanceCards.length - 1, prev + 1));
    } else if (info.offset.x > threshold) {
      setActiveCard((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const goToCard = useCallback((index: number) => {
    setActiveCard(index);
  }, []);

  return (
    <div className="pb-4">
      {/* ====== 1. HEADER (Welcoming) ====== */}
      {/* User name in bold + notification icon with badge + support/AI assistant */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        {/* Icons on the left side (in RTL) */}
        <div className="flex items-center gap-3">
          {/* Notification bell with red badge */}
          <button className="relative p-2.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95 transition-transform">
            <Bell className="w-[20px] h-[20px] text-[#1a1a1a] stroke-[1.5px]" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#5C1A1B] rounded-full border-2 border-white" />
          </button>
          {/* Support / AI Assistant button */}
          <button className="p-2.5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95 transition-transform">
            <Headphones className="w-[20px] h-[20px] text-[#1a1a1a] stroke-[1.5px]" />
          </button>
        </div>
        {/* Greeting with user name in bold */}
        <div className="text-right">
          <p className="text-[13px] text-gray-400 font-medium">مساء الخير،</p>
          <p className="text-[17px] font-bold text-[#1a1a1a]">محمود</p>
        </div>
      </div>

      {/* ====== PULL TO REFRESH HINT ====== */}
      {/* Light gray instructional text - Micro-UX detail */}
      <div className="flex items-center justify-center gap-1.5 py-1.5">
        <RefreshCw className="w-3 h-3 text-gray-400" />
        <span className="text-[10px] text-gray-400 font-medium">اسحب للأسفل للتحديث</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </div>

      {/* ====== 2. BALANCE CARD CAROUSEL ====== */}
      {/* viewportFraction ~0.82 - main card takes 82%, adjacent cards peek at edges */}
      {/* Visual Cue: showing edges of adjacent cards hints at swipeable content */}
      {/* Scale: center=1, sides=0.88 | Opacity: center=1, sides=0.45 | Focus effect */}
      <div className="px-4 pb-1">
        <div
          ref={containerRef}
          className="relative overflow-visible"
          style={{ height: '195px' }}
        >
          {/* Render ALL visible cards - viewportFraction effect */}
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
                  // RTL direction: negative x moves card to the left
                  x: offset * -82, // ~82% card width offset
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
                <BalanceCard
                  card={card}
                  balanceVisible={balanceVisible}
                  onToggleBalance={() => setBalanceVisible(!balanceVisible)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* ====== PAGE INDICATOR DOTS ====== */}
        {/* Red for active, gray for inactive - Visual Cue for swipe */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {balanceCards.map((card, i) => (
            <motion.button
              key={i}
              onClick={() => goToCard(i)}
              className="relative"
              whileTap={{ scale: 0.8 }}
            >
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

      {/* ====== 3. PROMOTIONAL BANNER ====== */}
      {/* Horizontal dynamic strip - separates account area from services */}
      {/* Dark theme matching brand colors */}
      <div className="px-4 py-3">
        <motion.div
          className="relative rounded-2xl p-4 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-28 h-28 bg-white/[0.03] rounded-full -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/[0.02] rounded-full translate-x-1/4 translate-y-1/4" />
          <div className="absolute top-3 right-20 w-2 h-2 bg-[#5C1A1B]/30 rounded-full" />
          <div className="absolute bottom-4 right-32 w-1.5 h-1.5 bg-[#5C1A1B]/20 rounded-full" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-sm mb-0.5">شحن ألعاب ترفيهية</h3>
              <p className="text-white/50 text-[11px]">بطاقات ببجي، فري فاير والمزيد</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-11 h-11 bg-[#5C1A1B]/20 rounded-xl flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-[#5C1A1B]" />
              </div>
              <button className="bg-white/10 p-1.5 rounded-full active:scale-90 transition-transform">
                <ChevronLeft className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ====== 4. SERVICES GRID (3x3) ====== */}
      {/* Minimalist Line Icons with red accent touch */}
      {/* Black icons + red dot on each for visual consistency */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-3 gap-3">
          {services.map((service, index) => (
            <motion.button
              key={index}
              className="relative flex flex-col items-center gap-2.5 p-3.5 bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 transition-transform"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              whileTap={{ scale: 0.92 }}
            >
              {/* Line icon - minimalist with red accent dot */}
              <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#F8F8F8]">
                <service.icon className="w-[22px] h-[22px] text-[#1a1a1a] stroke-[1.5px]" />
                {/* Small red dot accent on each icon - brand visual link */}
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#5C1A1B] rounded-full border border-white" />
              </div>
              <span className="text-[11px] text-[#1a1a1a] text-center leading-tight font-semibold">
                {service.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ====== TRANSACTIONS SECTION ====== */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-[#1a1a1a]">العمليات الأخيرة</h2>
          <button className="text-[#5C1A1B] text-xs font-bold">عرض الكل</button>
        </div>
        <div className="space-y-2.5">
          {transactions.map((tx, index) => {
            const txCurrency = balanceCards.find(c => c.currency === tx.currency);
            return (
              <motion.div
                key={tx.id}
                className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                {/* Transaction icon - line style */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
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
                  <h4 className="text-[13px] font-bold text-[#1a1a1a]">{tx.title}</h4>
                  <p className="text-[11px] text-gray-400 truncate font-medium">{tx.subtitle}</p>
                </div>
                <div className="text-left">
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
