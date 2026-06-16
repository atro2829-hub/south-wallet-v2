import type { LucideIcon } from 'lucide-react';
import type { ServiceProvider, ProductPackage, Order } from '@/lib/store';

export type AdminTab = 'overview' | 'orders' | 'users' | 'deposit' | 'withdraw' | 'kyc' | 'banks' | 'exchangeRates' | 'products' | 'providers' | 'rechargeProviders' | 'entertainmentServices' | 'codes' | 'banners' | 'notifications' | 'auditLog' | 'charts' | 'analytics' | 'reports' | 'settings';

export interface FirebaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  userId: string;
  role?: string;
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
  isBlocked: boolean;
  balanceYER: number;
  balanceSAR: number;
  balanceUSD: number;
  cardType?: string;
  cardNumber?: string;
  governorate?: string;
  idPhotoUrl?: string;
  selfieUrl?: string;
  avatar?: string;
  createdAt?: string;
}

export interface DepositReq {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: string;
  receiptImage: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  createdAt: string;
}

export interface WithdrawReq {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: string;
  bankDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  createdAt: string;
}

export interface PromoCodeData {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  currency: 'YER' | 'SAR' | 'USD';
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  color: string;
  isActive: boolean;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
  link?: string;
  createdAt: string;
}

export interface AdminExchangeRates {
  YERtoSAR: number;
  YERtoUSD: number;
  SARtoYER: number;
  SARtoUSD: number;
  USDtoYER: number;
  USDtoSAR: number;
  commission: number;
}

export const defaultAdminExchangeRates: AdminExchangeRates = {
  YERtoSAR: 1/410,
  YERtoUSD: 1/1558,
  SARtoYER: 410,
  SARtoUSD: 410/1558,
  USDtoYER: 1558,
  USDtoSAR: 1558/410,
  commission: 2,
};

export interface AppSettings {
  appName: string;
  primaryColor: string;
  maintenanceMode: boolean;
  supportPhone: string;
  supportEmail: string;
  supportWhatsApp: string;
  facebookLink: string;
  twitterLink: string;
  instagramLink: string;
  telegramLink: string;
  termsAndConditions: string;
  privacyPolicy: string;
  minDepositYER: number;
  minDepositSAR: number;
  minDepositUSD: number;
  minWithdrawYER: number;
  minWithdrawSAR: number;
  minWithdrawUSD: number;
}

export const defaultAppSettings: AppSettings = {
  appName: 'محفظة الجنوب',
  primaryColor: '#5C1A1B',
  maintenanceMode: false,
  supportPhone: '+967700000000',
  supportEmail: '',
  supportWhatsApp: '+967700000000',
  facebookLink: '',
  twitterLink: '',
  instagramLink: '',
  telegramLink: '',
  termsAndConditions: 'شروط وأحكام استخدام محفظة الجنوب\n\n1. يجب التحقق من الهوية لاستخدام جميع الخدمات\n2. الحد الأدنى للإيداع 500 ريال يمني\n3. يتم معالجة طلبات الشحن خلال 5-30 دقيقة\n4. لا يمكن استرداد الرصيد بعد شحن الخدمات\n5. يحق للإدارة حظر أي حساب مخالف',
  privacyPolicy: 'سياسة الخصوصية\n\n1. نحافظ على سرية بياناتك الشخصية\n2. لا نشارك معلوماتك مع أطراف ثالثة\n3. يتم تشفير جميع المعاملات المالية\n4. يمكنك طلب حذف حسابك في أي وقت\n5. نلتزم بالقوانين اليمنية لحماية البيانات',
  minDepositYER: 500,
  minDepositSAR: 5,
  minDepositUSD: 1,
  minWithdrawYER: 1000,
  minWithdrawSAR: 10,
  minWithdrawUSD: 2,
};

export interface TabInfo {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
  badge?: number;
}
