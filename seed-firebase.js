/**
 * Seed Firebase Realtime Database with all product data
 * from the default categories, providers, and packages in store.ts
 * 
 * This script pushes data to:
 * - ownerSettings/sections/  (categories)
 * - providers/               (service providers) 
 * - packages/                (product packages)
 * - adminSettings/visibility/ (visibility toggles)
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const serviceAccount = require('./upload/southern-portfolio-firebase-adminsdk-fbsvc-46f601a3ba.json');

// Initialize Firebase Admin
const app = getApps().length === 0
  ? initializeApp({
      credential: cert(serviceAccount),
      databaseURL: 'https://southern-portfolio-default-rtdb.firebaseio.com'
    })
  : getApps()[0];

const db = getDatabase(app);

// ═══════════════════════════════════════════════════════════
//  SECTIONS (Categories)
// ═══════════════════════════════════════════════════════════
const sections = [
  { name: 'الاتصالات', iconKey: 'phone', order: 0, isVisible: true, categoryId: 'telecom' },
  { name: 'الإنترنت', iconKey: 'wifi', order: 1, isVisible: true, categoryId: 'internet' },
  { name: 'خدمات ترفيهية', iconKey: 'gamepad', order: 2, isVisible: true, categoryId: 'entertainment' },
  { name: 'بطاقات رقمية', iconKey: 'credit-card', order: 3, isVisible: true, categoryId: 'cards' },
  { name: 'الكهرباء والماء', iconKey: 'zap', order: 4, isVisible: true, categoryId: 'electricity' },
  { name: 'خدمات حكومية', iconKey: 'landmark', order: 5, isVisible: true, categoryId: 'government' },
  { name: 'الكريبتو', iconKey: 'bitcoin', order: 6, isVisible: true, categoryId: 'crypto' },
  { name: 'استثمار الكريبتو', iconKey: 'trending-up', order: 7, isVisible: true, categoryId: 'investment' },
];

// ═══════════════════════════════════════════════════════════
//  PROVIDERS (Service Providers)
// ═══════════════════════════════════════════════════════════
const providers = [
  // الاتصالات
  { id: 'yemen-mobile', categoryId: 'telecom', name: 'يمن موبايل', color: '#C41E3A', icon: '', isActive: true, inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967' },
  { id: 'yo', categoryId: 'telecom', name: 'يو', color: '#FF6B00', icon: '', isActive: true, inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967' },
  { id: 'sabafon', categoryId: 'telecom', name: 'سبأفون', color: '#2563EB', icon: '', isActive: true, inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967' },
  { id: 'y', categoryId: 'telecom', name: 'واي', color: '#059669', icon: '', isActive: true, inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967' },

  // الإنترنت
  { id: 'yemen-net', categoryId: 'internet', name: 'يمن نت', color: '#8B5CF6', icon: '', isActive: true, inputLabel: 'رقم الحساب', inputType: 'text' },
  { id: 'y-net-internet', categoryId: 'internet', name: 'واي نت', color: '#059669', icon: '', isActive: true, inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967' },
  { id: 'sabafon-internet', categoryId: 'internet', name: 'سبأفون نت', color: '#2563EB', icon: '', isActive: true, inputLabel: 'رقم الهاتف', inputType: 'phone', inputPrefix: '+967' },

  // خدمات ترفيهية
  { id: 'pubg', categoryId: 'entertainment', name: 'ببجي موبايل', color: '#F59E0B', icon: '', isActive: true, inputLabel: 'Player ID', inputType: 'text' },
  { id: 'freefire', categoryId: 'entertainment', name: 'فري فاير', color: '#EC4899', icon: '', isActive: true, inputLabel: 'Player ID', inputType: 'text' },
  { id: 'call-of-duty', categoryId: 'entertainment', name: 'كال اوف ديوتي', color: '#1a1a1a', icon: '', isActive: true, inputLabel: 'Player ID', inputType: 'text' },
  { id: 'clash-royale', categoryId: 'entertainment', name: 'كلاش رويال', color: '#3B82F6', icon: '', isActive: true, inputLabel: 'Player Tag', inputType: 'text' },
  { id: 'clash-of-clans', categoryId: 'entertainment', name: 'كلاش اوف كلانس', color: '#F59E0B', icon: '', isActive: true, inputLabel: 'Player Tag', inputType: 'text' },
  { id: 'roblox', categoryId: 'entertainment', name: 'روبلوكس', color: '#E60000', icon: '', isActive: true, inputLabel: 'Username', inputType: 'text' },
  { id: 'fortnite', categoryId: 'entertainment', name: 'فورتنايت', color: '#6D28D9', icon: '', isActive: true, inputLabel: 'Epic ID', inputType: 'text' },
  { id: 'minecraft', categoryId: 'entertainment', name: 'ماينكرافت', color: '#4ADE80', icon: '', isActive: true, inputLabel: 'Username', inputType: 'text' },
  { id: 'valorant', categoryId: 'entertainment', name: 'فالورانت', color: '#FF4655', icon: '', isActive: true, inputLabel: 'Riot ID', inputType: 'text' },
  { id: 'league-legends', categoryId: 'entertainment', name: 'ليق اوف ليجندز', color: '#C8AA6E', icon: '', isActive: true, inputLabel: 'Riot ID', inputType: 'text' },
  { id: 'apex-legends', categoryId: 'entertainment', name: 'ابيكس ليجندز', color: '#DA292A', icon: '', isActive: true, inputLabel: 'EA Account', inputType: 'text' },
  { id: 'genshin-impact', categoryId: 'entertainment', name: 'جينشين امباكت', color: '#FFD700', icon: '', isActive: true, inputLabel: 'UID', inputType: 'text' },
  { id: 'honkai-star', categoryId: 'entertainment', name: 'هنكاي ستار ريل', color: '#7C3AED', icon: '', isActive: true, inputLabel: 'UID', inputType: 'text' },
  { id: 'ea-fc', categoryId: 'entertainment', name: 'EA FC 25', color: '#22C55E', icon: '', isActive: true, inputLabel: 'EA Account', inputType: 'text' },
  { id: 'steam', categoryId: 'entertainment', name: 'ستيم', color: '#1B2838', icon: '', isActive: true, inputLabel: 'Steam ID', inputType: 'text' },
  { id: 'netflix', categoryId: 'entertainment', name: 'نتفلكس', color: '#E50914', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'spotify', categoryId: 'entertainment', name: 'سبوتيفاي', color: '#1DB954', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'youtube-premium', categoryId: 'entertainment', name: 'يوتيوب بريميوم', color: '#FF0000', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },

  // بطاقات رقمية
  { id: 'google-play', categoryId: 'cards', name: 'بطاقة جوجل بلاي', color: '#34A853', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'apple-itunes', categoryId: 'cards', name: 'بطاقة آيتونز', color: '#007AFF', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'amazon-gift', categoryId: 'cards', name: 'بطاقة امازون', color: '#FF9900', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'psn-card', categoryId: 'cards', name: 'بطاقة بلايستيشن', color: '#00439C', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'xbox-card', categoryId: 'cards', name: 'بطاقة اكسبوكس', color: '#107C10', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'nintendo-card', categoryId: 'cards', name: 'بطاقة نينتندو', color: '#E60012', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'visa-virtual', categoryId: 'cards', name: 'بطاقة فيزا افتراضية', color: '#1A1F71', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'mastercard-virtual', categoryId: 'cards', name: 'بطاقة ماستركارد افتراضية', color: '#EB001B', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },
  { id: 'paypal', categoryId: 'cards', name: 'شحن بايبال', color: '#003087', icon: '', isActive: true, inputLabel: 'البريد الإلكتروني', inputType: 'text' },

  // الكهرباء والماء
  { id: 'elec-sanaa', categoryId: 'electricity', name: 'كهرباء صنعاء', color: '#F59E0B', icon: '', isActive: true, inputLabel: 'رقم العداد', inputType: 'text' },
  { id: 'elec-aden', categoryId: 'electricity', name: 'كهرباء عدن', color: '#3B82F6', icon: '', isActive: true, inputLabel: 'رقم العداد', inputType: 'text' },
  { id: 'water-sanaa', categoryId: 'electricity', name: 'مياه صنعاء', color: '#06B6D4', icon: '', isActive: true, inputLabel: 'رقم الاشتراك', inputType: 'text' },
  { id: 'water-aden', categoryId: 'electricity', name: 'مياه عدن', color: '#0EA5E9', icon: '', isActive: true, inputLabel: 'رقم الاشتراك', inputType: 'text' },

  // خدمات حكومية
  { id: 'civil-registry', categoryId: 'government', name: 'السجل المدني', color: '#6B7280', icon: '', isActive: true, inputLabel: 'رقم الهوية', inputType: 'text' },
  { id: 'passport', categoryId: 'government', name: 'جواز السفر', color: '#1E40AF', icon: '', isActive: true, inputLabel: 'رقم الجواز', inputType: 'text' },
  { id: 'traffic', categoryId: 'government', name: 'المرور', color: '#DC2626', icon: '', isActive: true, inputLabel: 'رقم اللوحة', inputType: 'text' },
  { id: 'municipal', categoryId: 'government', name: 'البلدية', color: '#059669', icon: '', isActive: true, inputLabel: 'رقم الرخصة', inputType: 'text' },

  // الكريبتو
  { id: 'bitcoin', categoryId: 'crypto', name: 'بيتكوين BTC', color: '#F7931A', icon: '', isActive: true, inputLabel: 'محفظة البيتكوين', inputType: 'text' },
  { id: 'ethereum', categoryId: 'crypto', name: 'إيثريوم ETH', color: '#627EEA', icon: '', isActive: true, inputLabel: 'محفظة الإيثريوم', inputType: 'text' },
  { id: 'usdt', categoryId: 'crypto', name: 'تيثر USDT', color: '#26A17B', icon: '', isActive: true, inputLabel: 'محفظة USDT', inputType: 'text' },
  { id: 'bnb', categoryId: 'crypto', name: 'بينانس BNB', color: '#F3BA2F', icon: '', isActive: true, inputLabel: 'محفظة بينانس', inputType: 'text' },
  { id: 'solana', categoryId: 'crypto', name: 'سولانا SOL', color: '#9945FF', icon: '', isActive: true, inputLabel: 'محفظة سولانا', inputType: 'text' },
  { id: 'tron', categoryId: 'crypto', name: 'ترون TRX', color: '#FF0013', icon: '', isActive: true, inputLabel: 'محفظة ترون', inputType: 'text' },

  // استثمار الكريبتو
  { id: 'usdt-daily', categoryId: 'investment', name: 'USDT يومي', color: '#26A17B', icon: '', isActive: true, inputLabel: 'مبلغ الاستثمار', inputType: 'text' },
  { id: 'usdt-weekly', categoryId: 'investment', name: 'USDT أسبوعي', color: '#26A17B', icon: '', isActive: true, inputLabel: 'مبلغ الاستثمار', inputType: 'text' },
  { id: 'usdt-monthly', categoryId: 'investment', name: 'USDT شهري', color: '#26A17B', icon: '', isActive: true, inputLabel: 'مبلغ الاستثمار', inputType: 'text' },
  { id: 'usdt-quarterly', categoryId: 'investment', name: 'USDT ربع سنوي', color: '#26A17B', icon: '', isActive: true, inputLabel: 'مبلغ الاستثمار', inputType: 'text' },
];

// ═══════════════════════════════════════════════════════════
//  PACKAGES (Product Packages)
// ═══════════════════════════════════════════════════════════
const packages = [
  // TELECOM - Yemen Mobile (يمن موبايل)
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'شحنة 100 ر.ي', price: 100, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'شحنة 200 ر.ي', price: 200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'شحنة 500 ر.ي', price: 500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'شحنة 1000 ر.ي', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'شحنة 2000 ر.ي', price: 2000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'شحنة 5000 ر.ي', price: 5000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'باقة فورجي 1 جيجا', price: 200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'باقة فورجي 4 جيجا', price: 500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'باقة فورجي 10 جيجا', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'باقة فورجي 20 جيجا', price: 2000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-mobile', providerName: 'يمن موبايل', name: 'باقة فورجي غير محدودة', price: 3000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // TELECOM - Yo (يو)
  { providerId: 'yo', providerName: 'يو', name: 'شحنة 100 ر.ي', price: 100, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yo', providerName: 'يو', name: 'شحنة 200 ر.ي', price: 200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yo', providerName: 'يو', name: 'شحنة 500 ر.ي', price: 500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yo', providerName: 'يو', name: 'شحنة 1000 ر.ي', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yo', providerName: 'يو', name: 'شحنة 2000 ر.ي', price: 2000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yo', providerName: 'يو', name: 'باقة إنترنت 2 جيجا', price: 300, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yo', providerName: 'يو', name: 'باقة إنترنت 5 جيجا', price: 600, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yo', providerName: 'يو', name: 'باقة إنترنت 10 جيجا', price: 1100, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // TELECOM - Sabafon (سبأفون)
  { providerId: 'sabafon', providerName: 'سبأفون', name: 'شحنة 100 ر.ي', price: 100, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon', providerName: 'سبأفون', name: 'شحنة 200 ر.ي', price: 200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon', providerName: 'سبأفون', name: 'شحنة 500 ر.ي', price: 500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon', providerName: 'سبأفون', name: 'شحنة 1000 ر.ي', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon', providerName: 'سبأفون', name: 'باقة إنترنت 3 جيجا', price: 400, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon', providerName: 'سبأفون', name: 'باقة إنترنت 7 جيجا', price: 800, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon', providerName: 'سبأفون', name: 'باقة إنترنت 15 جيجا', price: 1500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // TELECOM - WA (واي)
  { providerId: 'y', providerName: 'واي', name: 'شحنة 100 ر.ي', price: 100, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y', providerName: 'واي', name: 'شحنة 200 ر.ي', price: 200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y', providerName: 'واي', name: 'شحنة 500 ر.ي', price: 500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y', providerName: 'واي', name: 'شحنة 1000 ر.ي', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y', providerName: 'واي', name: 'باقة إنترنت 2 جيجا', price: 250, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y', providerName: 'واي', name: 'باقة إنترنت 5 جيجا', price: 550, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // INTERNET - Yemen Net (يمن نت)
  { providerId: 'yemen-net', providerName: 'يمن نت', name: 'باقة 1 جيجا - يوم', price: 150, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-net', providerName: 'يمن نت', name: 'باقة 5 جيجا - أسبوع', price: 500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-net', providerName: 'يمن نت', name: 'باقة 10 جيجا - شهر', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-net', providerName: 'يمن نت', name: 'باقة 20 جيجا - شهر', price: 1800, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'yemen-net', providerName: 'يمن نت', name: 'باقة غير محدودة - شهر', price: 3500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y-net-internet', providerName: 'واي نت', name: 'باقة 3 جيجا - أسبوع', price: 400, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y-net-internet', providerName: 'واي نت', name: 'باقة 8 جيجا - شهر', price: 900, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'y-net-internet', providerName: 'واي نت', name: 'باقة 15 جيجا - شهر', price: 1500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon-internet', providerName: 'سبأفون نت', name: 'باقة 3 جيجا - أسبوع', price: 400, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'sabafon-internet', providerName: 'سبأفون نت', name: 'باقة 10 جيجا - شهر', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - PUBG Mobile
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: '60 شدة ببجي', price: 1200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: '325 شدة ببجي', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: '660 شدة ببجي', price: 10500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: '1800 شدة ببجي', price: 28000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: '3850 شدة ببجي', price: 58000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: '8100 شدة ببجي', price: 120000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: 'عضوية رويال باس شهري', price: 3000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'pubg', providerName: 'ببجي موبايل', name: 'عضوية رويال باس أسبوعي', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Free Fire
  { providerId: 'freefire', providerName: 'فري فاير', name: '100 جوهرة فري فاير', price: 800, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'freefire', providerName: 'فري فاير', name: '310 جوهرة فري فاير', price: 2200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'freefire', providerName: 'فري فاير', name: '520 جوهرة فري فاير', price: 3500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'freefire', providerName: 'فري فاير', name: '1060 جوهرة فري فاير', price: 6500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'freefire', providerName: 'فري فاير', name: '2180 جوهرة فري فاير', price: 13000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'freefire', providerName: 'فري فاير', name: '5600 جوهرة فري فاير', price: 32000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'freefire', providerName: 'فري فاير', name: 'عضوية ماموث أسبوعية', price: 1200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'freefire', providerName: 'فري فاير', name: 'عضوية ماموث شهرية', price: 4000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Call of Duty Mobile
  { providerId: 'call-of-duty', providerName: 'كال اوف ديوتي', name: '80 CP كود', price: 1500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'call-of-duty', providerName: 'كال اوف ديوتي', name: '400 CP كود', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'call-of-duty', providerName: 'كال اوف ديوتي', name: '800 CP كود', price: 10500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'call-of-duty', providerName: 'كال اوف ديوتي', name: '2000 CP كود', price: 25000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'call-of-duty', providerName: 'كال اوف ديوتي', name: '4000 CP كود', price: 48000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'call-of-duty', providerName: 'كال اوف ديوتي', name: 'بطاقة قتال الموسم', price: 3500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Fortnite
  { providerId: 'fortnite', providerName: 'فورتنايت', name: '1000 V-Bucks', price: 2000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'fortnite', providerName: 'فورتنايت', name: '2800 V-Bucks', price: 5200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'fortnite', providerName: 'فورتنايت', name: '5000 V-Bucks', price: 9000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'fortnite', providerName: 'فورتنايت', name: '13500 V-Bucks', price: 22000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'fortnite', providerName: 'فورتنايت', name: 'بطاقة قتال الموسم', price: 2500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Valorant
  { providerId: 'valorant', providerName: 'فالورانت', name: '125 VP فالورانت', price: 1800, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'valorant', providerName: 'فالورانت', name: '420 VP فالورانت', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'valorant', providerName: 'فالورانت', name: '700 VP فالورانت', price: 9000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'valorant', providerName: 'فالورانت', name: '1375 VP فالورانت', price: 17000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'valorant', providerName: 'فالورانت', name: '2400 VP فالورانت', price: 29000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'valorant', providerName: 'فالورانت', name: '4000 VP فالورانت', price: 48000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Apex Legends
  { providerId: 'apex-legends', providerName: 'ابيكس ليجندز', name: '1000 عملة ابكس', price: 1500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'apex-legends', providerName: 'ابيكس ليجندز', name: '2150 عملة ابكس', price: 3000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'apex-legends', providerName: 'ابيكس ليجندز', name: '4350 عملة ابكس', price: 5800, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'apex-legends', providerName: 'ابيكس ليجندز', name: '6700 عملة ابكس', price: 8800, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Clash Royale
  { providerId: 'clash-royale', providerName: 'كلاش رويال', name: '80 جوهرة', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-royale', providerName: 'كلاش رويال', name: '500 جوهرة', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-royale', providerName: 'كلاش رويال', name: '1200 جوهرة', price: 12000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-royale', providerName: 'كلاش رويال', name: '2500 جوهرة', price: 23000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-royale', providerName: 'كلاش رويال', name: 'ممر البطولة', price: 3000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Clash of Clans
  { providerId: 'clash-of-clans', providerName: 'كلاش اوف كلانس', name: '80 جوهرة', price: 1000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-of-clans', providerName: 'كلاش اوف كلانس', name: '500 جوهرة', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-of-clans', providerName: 'كلاش اوف كلانس', name: '1200 جوهرة', price: 12000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-of-clans', providerName: 'كلاش اوف كلانس', name: '2500 جوهرة', price: 23000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'clash-of-clans', providerName: 'كلاش اوف كلانس', name: 'ممر الذهب', price: 3000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - League of Legends
  { providerId: 'league-legends', providerName: 'ليق اوف ليجندز', name: '650 RIOT نقاط', price: 2000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'league-legends', providerName: 'ليق اوف ليجندز', name: '1380 RIOT نقاط', price: 4000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'league-legends', providerName: 'ليق اوف ليجندز', name: '2800 RIOT نقاط', price: 7500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'league-legends', providerName: 'ليق اوف ليجندز', name: '5000 RIOT نقاط', price: 13000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Roblox
  { providerId: 'roblox', providerName: 'روبلوكس', name: '400 Robux', price: 900, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'roblox', providerName: 'روبلوكس', name: '800 Robux', price: 1700, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'roblox', providerName: 'روبلوكس', name: '1700 Robux', price: 3500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'roblox', providerName: 'روبلوكس', name: '4500 Robux', price: 9000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'roblox', providerName: 'روبلوكس', name: '10000 Robux', price: 19000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'roblox', providerName: 'روبلوكس', name: 'عضوية بريميوم 450', price: 1200, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Minecraft
  { providerId: 'minecraft', providerName: 'ماينكرافت', name: 'بطاقة ماينكرافت 660 جوهرة', price: 2500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'minecraft', providerName: 'ماينكرافت', name: 'بطاقة ماينكرافت 1720 جوهرة', price: 6000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'minecraft', providerName: 'ماينكرافت', name: 'بطاقة ماينكرافت 3240 جوهرة', price: 11000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'minecraft', providerName: 'ماينكرافت', name: 'رخصة Java Edition', price: 35000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Genshin Impact
  { providerId: 'genshin-impact', providerName: 'جينشين امباكت', name: '60 جينشين كريستال', price: 1500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'genshin-impact', providerName: 'جينشين امباكت', name: '330 جينشين كريستال', price: 7500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'genshin-impact', providerName: 'جينشين امباكت', name: '1090 جينشين كريستال', price: 23000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'genshin-impact', providerName: 'جينشين امباكت', name: '2240 جينشين كريستال', price: 45000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'genshin-impact', providerName: 'جينشين امباكت', name: '3880 جينشين كريستال', price: 78000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'genshin-impact', providerName: 'جينشين امباكت', name: 'بطاقة القمر المبارك', price: 4000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Honkai Star Rail
  { providerId: 'honkai-star', providerName: 'هنكاي ستار ريل', name: '60 هنكاي كريستال', price: 1500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'honkai-star', providerName: 'هنكاي ستار ريل', name: '330 هنكاي كريستال', price: 7500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'honkai-star', providerName: 'هنكاي ستار ريل', name: '1090 هنكاي كريستال', price: 23000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'honkai-star', providerName: 'هنكاي ستار ريل', name: '2240 هنكاي كريستال', price: 45000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'honkai-star', providerName: 'هنكاي ستار ريل', name: 'تذكرة السفر السري', price: 4000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - Steam
  { providerId: 'steam', providerName: 'ستيم', name: 'بطاقة ستيم 5$', price: 5000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'steam', providerName: 'ستيم', name: 'بطاقة ستيم 10$', price: 10000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'steam', providerName: 'ستيم', name: 'بطاقة ستيم 25$', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'steam', providerName: 'ستيم', name: 'بطاقة ستيم 50$', price: 47000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'steam', providerName: 'ستيم', name: 'بطاقة ستيم 100$', price: 92000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GAMING - EA FC 25
  { providerId: 'ea-fc', providerName: 'EA FC 25', name: '500 FC Points', price: 3000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'ea-fc', providerName: 'EA FC 25', name: '1050 FC Points', price: 6000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'ea-fc', providerName: 'EA FC 25', name: '2200 FC Points', price: 12000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'ea-fc', providerName: 'EA FC 25', name: '4600 FC Points', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'ea-fc', providerName: 'EA FC 25', name: '12000 FC Points', price: 58000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // STREAMING - Netflix
  { providerId: 'netflix', providerName: 'نتفلكس', name: 'اشتراك نتفلكس شهري - أساسي', price: 3500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'netflix', providerName: 'نتفلكس', name: 'اشتراك نتفلكس شهري - قياسي', price: 6000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'netflix', providerName: 'نتفلكس', name: 'اشتراك نتفلكس شهري - مميز', price: 9000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'netflix', providerName: 'نتفلكس', name: 'اشتراك نتفلكس سنوي - أساسي', price: 38000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // STREAMING - Spotify
  { providerId: 'spotify', providerName: 'سبوتيفاي', name: 'اشتراك سبوتيفاي فردي شهر', price: 2500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'spotify', providerName: 'سبوتيفاي', name: 'اشتراك سبوتيفاي عائلي شهر', price: 4000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'spotify', providerName: 'سبوتيفاي', name: 'اشتراك سبوتيفاي سنوي', price: 25000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // STREAMING - YouTube Premium
  { providerId: 'youtube-premium', providerName: 'يوتيوب بريميوم', name: 'اشتراك يوتيوب فردي شهر', price: 2000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'youtube-premium', providerName: 'يوتيوب بريميوم', name: 'اشتراك يوتيوب عائلي شهر', price: 3500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'youtube-premium', providerName: 'يوتيوب بريميوم', name: 'اشتراك يوتيوب سنوي', price: 20000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - Google Play
  { providerId: 'google-play', providerName: 'بطاقة جوجل بلاي', name: 'بطاقة جوجل بلاي 5$', price: 5000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'google-play', providerName: 'بطاقة جوجل بلاي', name: 'بطاقة جوجل بلاي 10$', price: 10000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'google-play', providerName: 'بطاقة جوجل بلاي', name: 'بطاقة جوجل بلاي 25$', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'google-play', providerName: 'بطاقة جوجل بلاي', name: 'بطاقة جوجل بلاي 50$', price: 47000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - iTunes
  { providerId: 'apple-itunes', providerName: 'بطاقة آيتونز', name: 'بطاقة آيتونز 5$', price: 5000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'apple-itunes', providerName: 'بطاقة آيتونز', name: 'بطاقة آيتونز 10$', price: 10000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'apple-itunes', providerName: 'بطاقة آيتونز', name: 'بطاقة آيتونز 25$', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'apple-itunes', providerName: 'بطاقة آيتونز', name: 'بطاقة آيتونز 50$', price: 47000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - Amazon
  { providerId: 'amazon-gift', providerName: 'بطاقة امازون', name: 'بطاقة امازون 10$', price: 10000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'amazon-gift', providerName: 'بطاقة امازون', name: 'بطاقة امازون 25$', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'amazon-gift', providerName: 'بطاقة امازون', name: 'بطاقة امازون 50$', price: 47000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'amazon-gift', providerName: 'بطاقة امازون', name: 'بطاقة امازون 100$', price: 92000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - PlayStation
  { providerId: 'psn-card', providerName: 'بطاقة بلايستيشن', name: 'بطاقة بلايستيشن 10$', price: 10000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'psn-card', providerName: 'بطاقة بلايستيشن', name: 'بطاقة بلايستيشن 25$', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'psn-card', providerName: 'بطاقة بلايستيشن', name: 'بطاقة بلايستيشن 50$', price: 47000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - Xbox
  { providerId: 'xbox-card', providerName: 'بطاقة اكسبوكس', name: 'بطاقة اكسبوكس 10$', price: 10000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'xbox-card', providerName: 'بطاقة اكسبوكس', name: 'بطاقة اكسبوكس 25$', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'xbox-card', providerName: 'بطاقة اكسبوكس', name: 'بطاقة اكسبوكس 50$', price: 47000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - Nintendo
  { providerId: 'nintendo-card', providerName: 'بطاقة نينتندو', name: 'بطاقة نينتندو 10$', price: 10000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'nintendo-card', providerName: 'بطاقة نينتندو', name: 'بطاقة نينتندو 25$', price: 24000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'nintendo-card', providerName: 'بطاقة نينتندو', name: 'بطاقة نينتندو 50$', price: 47000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - Visa Virtual
  { providerId: 'visa-virtual', providerName: 'بطاقة فيزا افتراضية', name: 'بطاقة فيزا 5$', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'visa-virtual', providerName: 'بطاقة فيزا افتراضية', name: 'بطاقة فيزا 10$', price: 10500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'visa-virtual', providerName: 'بطاقة فيزا افتراضية', name: 'بطاقة فيزا 25$', price: 25000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'visa-virtual', providerName: 'بطاقة فيزا افتراضية', name: 'بطاقة فيزا 50$', price: 48000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - Mastercard Virtual
  { providerId: 'mastercard-virtual', providerName: 'بطاقة ماستركارد افتراضية', name: 'بطاقة ماستركارد 5$', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'mastercard-virtual', providerName: 'بطاقة ماستركارد افتراضية', name: 'بطاقة ماستركارد 10$', price: 10500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'mastercard-virtual', providerName: 'بطاقة ماستركارد افتراضية', name: 'بطاقة ماستركارد 25$', price: 25000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'mastercard-virtual', providerName: 'بطاقة ماستركارد افتراضية', name: 'بطاقة ماستركارد 50$', price: 48000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CARDS - PayPal
  { providerId: 'paypal', providerName: 'شحن بايبال', name: 'شحن بايبال 5$', price: 5500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'paypal', providerName: 'شحن بايبال', name: 'شحن بايبال 10$', price: 10500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'paypal', providerName: 'شحن بايبال', name: 'شحن بايبال 25$', price: 25000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'paypal', providerName: 'شحن بايبال', name: 'شحن بايبال 50$', price: 48000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'paypal', providerName: 'شحن بايبال', name: 'شحن بايبال 100$', price: 93000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // ELECTRICITY - Sanaa
  { providerId: 'elec-sanaa', providerName: 'كهرباء صنعاء', name: 'فاتورة كهرباء صنعاء', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // ELECTRICITY - Aden
  { providerId: 'elec-aden', providerName: 'كهرباء عدن', name: 'فاتورة كهرباء عدن', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // WATER
  { providerId: 'water-sanaa', providerName: 'مياه صنعاء', name: 'فاتورة مياه صنعاء', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'water-aden', providerName: 'مياه عدن', name: 'فاتورة مياه عدن', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // GOVERNMENT
  { providerId: 'civil-registry', providerName: 'السجل المدني', name: 'خدمة السجل المدني', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'passport', providerName: 'جواز السفر', name: 'خدمة جواز السفر', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'traffic', providerName: 'المرور', name: 'خدمة المرور', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'municipal', providerName: 'البلدية', name: 'خدمة البلدية', price: 0, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CRYPTO - Bitcoin
  { providerId: 'bitcoin', providerName: 'بيتكوين BTC', name: 'شراء 0.001 BTC', price: 150000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'bitcoin', providerName: 'بيتكوين BTC', name: 'شراء 0.01 BTC', price: 1500000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CRYPTO - Ethereum
  { providerId: 'ethereum', providerName: 'إيثريوم ETH', name: 'شراء 0.01 ETH', price: 40000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'ethereum', providerName: 'إيثريوم ETH', name: 'شراء 0.1 ETH', price: 380000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CRYPTO - USDT
  { providerId: 'usdt', providerName: 'تيثر USDT', name: 'شراء 10 USDT', price: 15500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
  { providerId: 'usdt', providerName: 'تيثر USDT', name: 'شراء 50 USDT', price: 77500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CRYPTO - BNB
  { providerId: 'bnb', providerName: 'بينانس BNB', name: 'شراء 0.1 BNB', price: 4000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CRYPTO - Solana
  { providerId: 'solana', providerName: 'سولانا SOL', name: 'شراء 1 SOL', price: 2000, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },

  // CRYPTO - Tron
  { providerId: 'tron', providerName: 'ترون TRX', name: 'شراء 100 TRX', price: 1500, currency: 'YER', executionType: 'manual', isActive: true, available: -1, sold: 0, autoDisableAtZero: false },
];

// ═══════════════════════════════════════════════════════════
//  MAIN: Push all data to Firebase
// ═══════════════════════════════════════════════════════════
async function seedDatabase() {
  try {
    console.log('🚀 Starting Firebase database seeding...\n');

    const updates = {};
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    // 1. SEED SECTIONS
    console.log(`📋 Seeding ${sections.length} sections...`);
    sections.forEach((sec, i) => {
      const key = `section_${i}`;
      updates[`ownerSettings/sections/${key}`] = { ...sec, order: i };
      updates[`adminSettings/visibility/sections/${sec.categoryId}`] = sec.isVisible !== false;
    });

    // 2. SEED PROVIDERS
    console.log(`🏢 Seeding ${providers.length} providers...`);
    providers.forEach((prov) => {
      const firebaseKey = prov.id.replace(/[^a-zA-Z0-9_-]/g, '_');
      updates[`providers/${firebaseKey}`] = { ...prov, id: generateId() };
      updates[`adminSettings/visibility/providers/${firebaseKey}`] = prov.isActive !== false;
    });

    // 3. SEED PACKAGES
    console.log(`📦 Seeding ${packages.length} packages...`);
    packages.forEach((pkg) => {
      const newKey = db.ref().push().key;
      updates[`packages/${newKey}`] = { ...pkg, id: generateId() };
    });

    // Execute the update
    console.log('\n⏳ Writing to Firebase Realtime Database...');
    await db.ref().update(updates);

    console.log('\n✅ Database seeded successfully!');
    console.log(`   - ${sections.length} sections/categories`);
    console.log(`   - ${providers.length} service providers`);
    console.log(`   - ${packages.length} product packages`);
    console.log(`   - Total Firebase paths updated: ${Object.keys(updates).length}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
