import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format balance with Arabic numerals
export function formatBalance(amount: number, currency: string): string {
  const formatted = amount.toLocaleString('ar-SA');
  return formatted;
}

// Generate userId with expandable prefix
// Supports "10" prefix (6 digits) and expands to "11"+ when "10" range is exhausted
// The system auto-detects the next available prefix from Firebase
let _userIdCounter: number | null = null;

export function generateUserId(): string {
  const random4 = Math.floor(1000 + Math.random() * 9000).toString();
  return '10' + random4;
}

// Generate userId with expandable prefix (11, 12, 20, etc.)
// Call this async version for guaranteed unique IDs across the system
export async function generateUniqueUserId(database: import('firebase/database').Database): Promise<string> {
  const { ref, get } = await import('firebase/database');
  
  // Try prefixes in order: 10, 11, 12, 13, ... 19, 20, 21, ... 99
  for (let prefix = 10; prefix <= 99; prefix++) {
    const prefixStr = String(prefix);
    // Try up to 5 random IDs with this prefix
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
      const candidate = prefixStr + randomDigits;
      const snapshot = await get(ref(database, `userIds/${candidate}`));
      if (!snapshot.exists()) {
        return candidate;
      }
    }
  }
  // If all 2-digit prefixes exhausted, expand to 3-digit prefix (100-999)
  for (let prefix = 100; prefix <= 999; prefix++) {
    const prefixStr = String(prefix);
    const random3 = Math.floor(100 + Math.random() * 900).toString();
    const candidate = prefixStr + random3;
    const snapshot = await get(ref(database, `userIds/${candidate}`));
    if (!snapshot.exists()) {
      return candidate;
    }
  }
  // Fallback
  return '10' + Math.floor(1000 + Math.random() * 9000).toString();
}

// Generate transaction reference
export function generateReference(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'JN-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Currency symbols (default 3 + dynamic from admin)
export const currencySymbols: Record<string, string> = {
  YER: 'ر.ي',
  SAR: 'ر.س',
  USD: '$',
  USDT: 'USDT',
  BTC: '₿',
  ETH: 'Ξ',
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  TRY: '₺',
  OMR: 'ر.ع',
  KWD: 'د.ك',
  BHD: 'د.ب',
  QAR: 'ر.ق',
};

export const currencyNames: Record<string, string> = {
  YER: 'الريال اليمني',
  SAR: 'الريال السعودي',
  USD: 'الدولار الأمريكي',
  USDT: 'تيثر',
  BTC: 'بيتكوين',
  ETH: 'إيثريوم',
  AED: 'الدرهم الإماراتي',
  EUR: 'اليورو',
  GBP: 'الجنيه الإسترليني',
  TRY: 'الليرة التركية',
  OMR: 'الريال العماني',
  KWD: 'الدينار الكويتي',
  BHD: 'الدينار البحريني',
  QAR: 'الريال القطري',
};

// Currency flags - text indicators (NO emojis)
export const currencyFlags: Record<string, string> = {
  YER: 'YER',
  SAR: 'SAR',
  USD: 'USD',
  USDT: 'USDT',
  BTC: 'BTC',
  ETH: 'ETH',
  AED: 'AED',
  EUR: 'EUR',
  GBP: 'GBP',
  TRY: 'TRY',
  OMR: 'OMR',
  KWD: 'KWD',
  BHD: 'BHD',
  QAR: 'QAR',
};

// Currency badge background colors
export const currencyBadgeColors: Record<string, string> = {
  YER: '#5C1A1B',
  SAR: '#059669',
  USD: '#2563EB',
  USDT: '#26A17B',
  BTC: '#F7931A',
  ETH: '#627EEA',
  AED: '#007A3D',
  EUR: '#003399',
  GBP: '#C8102E',
  TRY: '#E30A17',
  OMR: '#DB161B',
  KWD: '#007A3D',
  BHD: '#CE1126',
  QAR: '#8D1B3D',
};

// Southern Yemen governorates
export const governorates = [
  'عدن',
  'لحج',
  'أبين',
  'شبوة',
  'حضرموت',
  'المهرة',
  'الضالع',
  'سقطرى',
];

// Card types
export const cardTypes = [
  'بطاقة شخصية',
  'جواز سفر',
  'رخصة قيادة',
];

// Animated number formatting
export function formatNumber(num: number): string {
  return num.toLocaleString('ar-SA');
}

// Time ago in Arabic
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 604800)} أسبوع`;
  return date.toLocaleDateString('ar-SA');
}

// Compress base64 image
export function compressBase64Image(base64: string, maxWidth = 200, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
}

// Transaction type labels in Arabic
export const transactionTypeLabels: Record<string, string> = {
  transfer: 'تحويل',
  deposit: 'إيداع',
  withdraw: 'سحب',
  payment: 'دفع',
  recharge: 'شحن',
  bill: 'فاتورة',
  purchase: 'شراء',
  order: 'طلب',
  refund: 'استرداد',
};

// Transaction type colors
export const transactionTypeColors: Record<string, string> = {
  transfer: '#5C1A1B',
  deposit: '#10B981',
  withdraw: '#F59E0B',
  payment: '#3B82F6',
  recharge: '#8B5CF6',
  bill: '#EC4899',
  purchase: '#F97316',
  order: '#14B8A6',
  refund: '#6366F1',
};

// Order status timeline steps
export const orderTimelineSteps = [
  { key: 'pending', label: 'تم الاستلام', icon: 'received' },
  { key: 'processing', label: 'قيد التنفيذ', icon: 'processing' },
  { key: 'completed', label: 'تم التنفيذ', icon: 'completed' },
];

// Currency exchange default rates (synced from yemenrates.com API)
// 1 USD = 1558 YER (sell), 1 SAR = 410 YER (sell)
export const defaultExchangeRates = {
  YER: 1,
  SAR: 410,
  USD: 1558,
};

// Support FAQ
export const faqItems = [
  { q: 'كيف أشحن رصيدي؟', a: 'يمكنك شحن رصيدك من قسم الإيداع في المحفظة، أو عبر نقاط البيع المعتمدة' },
  { q: 'كم تستغرق عملية الشحن؟', a: 'الشحن يتم خلال 5-30 دقيقة كحد أقصى، وسيتم إشعارك فوراً عند التنفيذ' },
  { q: 'كيف أحول أموال لصديق؟', a: 'من زر التحويل، أدخل رقم حساب الصديق أو رقم هاتفه وحدد المبلغ' },
  { q: 'هل يمكنني استرداد رصيدي؟', a: 'نعم، يمكنك طلب سحب رصيدك من قسم السحب وسيتم التحويل خلال 24 ساعة' },
  { q: 'ما هي عملات المحفظة؟', a: 'المحفظة تدعم ثلاث عملات: الريال اليمني، الريال السعودي، والدولار الأمريكي' },
  { q: 'كيف أتحقق من هويتي؟', a: 'من إعدادات الحساب، اختر التحقق من الهوية واتبع الخطوات الست' },
  { q: 'نسيت رمز PIN، ماذا أفعل؟', a: 'يمكنك إعادة تعيين رمز PIN من إعدادات الأمان بعد التحقق من هويتك' },
];
