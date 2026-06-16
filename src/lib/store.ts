import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { isBiometricEnabledForUser } from '@/lib/biometric';
import { supabaseService } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  phone: string;
  name: string; // computed: ${firstName} ${secondName} ${thirdName} ${familyName}
  firstName: string;
  secondName: string;
  thirdName: string;
  familyName: string;
  nationalId: string;
  avatar: string;
  role: 'user' | 'admin' | 'owner';
  userId: string;
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
  isBlocked: boolean;
  balanceYER: number;
  balanceSAR: number;
  balanceUSD: number;
  cardType: string;
  cardNumber: string;
  cardIssuedAt: string;
  governorate: string;
  theme: 'light' | 'dark';
}

interface Transaction {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  type: 'transfer' | 'deposit' | 'withdraw' | 'payment' | 'recharge' | 'bill' | 'purchase' | 'order';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  description: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'transaction' | 'security' | 'promo';
  isRead: boolean;
  createdAt: string;
  navigationTarget?: string; // e.g., "transaction:abc123", "kyc", "url:https://..."
  navigationParams?: Record<string, unknown>; // Additional params for navigation
  data?: Record<string, unknown>; // Extra data payload from FCM or Supabase
}

// Service categories and providers
export interface ServiceCategory {
  id: string;
  name: string;
  type: 'telecom' | 'internet' | 'games' | 'cards' | 'electricity' | 'government' | 'crypto' | 'providers' | 'wallet-services';
  icon: string; // Base64 or icon key
}

export interface ServiceProvider {
  id: string;
  categoryId: string;
  name: string;
  color: string;
  icon: string; // Base64 string for custom icons
  isActive: boolean;
  inputLabel: string; // e.g. "رقم الهاتف" or "Player ID"
  inputType: 'phone' | 'text';
  inputPrefix?: string; // e.g. "+967"
  subSectionId?: string; // reference to sub_sections.id from Supabase
}

export interface ProductPackage {
  id: string;
  providerId: string;
  name: string;
  price: number;
  currency: 'YER' | 'SAR' | 'USD';
  executionType: 'manual' | 'auto';
  isActive: boolean;
  apiProvider?: string;       // Name of the external API provider company
  productIdInApi?: string;    // Product ID in the external API system
  costPrice?: number;         // Cost price from the provider
  commission?: number;        // Profit margin (selling price - cost price)
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  providerId: string;
  providerName: string;
  packageId: string;
  packageName: string;
  customerInput: string; // Phone number or Player ID
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  executionType: 'manual' | 'auto';
  createdAt: string;
  completedAt?: string;
  // API Provider fields
  apiProviderId?: string;  // Provider ID in Firebase (e.g., "g2bulk")
  apiProductId?: string;   // Product ID in the API
  apiCategoryId?: string;  // Category ID in the API
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: 'bank_transfer' | 'cash' | 'card' | 'crypto';
  receiptImage: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  createdAt: string;
  reviewedAt?: string;
  cryptoId?: string;
  cryptoSymbol?: string;
  cryptoNetwork?: string;
  cryptoTxHash?: string;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: 'bank_transfer' | 'cash' | 'crypto';
  bankDetails: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  createdAt: string;
  reviewedAt?: string;
  cryptoId?: string;
  cryptoSymbol?: string;
  cryptoNetwork?: string;
  cryptoWalletAddress?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  message: string;
  category: 'technical' | 'financial' | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  messages: { sender: 'user' | 'support'; text: string; time: string }[];
  createdAt: string;
}

export interface PromoCode {
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

export interface GiftCode {
  id: string;
  code: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  description?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: 'YER' | 'SAR' | 'USD';
  icon: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  planId: string;
  planName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  profitRate: number;
  expectedProfit: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  completedAt?: string;
}

export interface UserGiftCode {
  id: string;
  code: string;
  creatorUid: string;
  creatorName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  message: string;
  status: 'active' | 'redeemed' | 'cancelled';
  createdAt: string;
  redeemedBy?: string;
  redeemedAt?: string;
}

export interface CardColor {
  YER: { primary: string; gradient: string; gradientStart?: string; gradientEnd?: string };
  SAR: { primary: string; gradient: string; gradientStart?: string; gradientEnd?: string };
  USD: { primary: string; gradient: string; gradientStart?: string; gradientEnd?: string };
}

export interface MaintenanceMode {
  active: boolean;
  message: string;
  estimatedTime: string;
  activatedAt?: string;
  activatedBy?: string;
}

export interface ForceUpdate {
  active: boolean;
  minVersion: string;
  updateUrl: string;
  message: string;
}

export interface MoneyRequest {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
  partialAmount?: number;
  createdAt: string;
}

export interface InvestmentPlan {
  id: string;
  name: string;
  type: string;
  durationDays: number;
  minAmount: number;
  maxAmount: number;
  currency: 'YER' | 'SAR' | 'USD';
  profitRate: number;
  isActive: boolean;
}

export interface SupportChatMessage {
  sender: 'user' | 'admin';
  text: string;
  time: string;
  senderName?: string;
}

// Feature flags controlled by admin
export interface FeatureFlags {
  transfersEnabled: boolean;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
  exchangeEnabled: boolean;
  servicesEnabled: boolean;
  rechargeEnabled: boolean;
  billsEnabled: boolean;
  investmentEnabled: boolean;
  cryptoEnabled: boolean;
  giftCodesEnabled: boolean;
  qrPaymentsEnabled: boolean;
  referralEnabled: boolean;
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  darkModeEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  registrationEnabled: boolean;
}

// Transaction limits controlled by admin
export interface TransactionLimits {
  maxSingleTransfer: number;
  maxDailyTransfer: number;
  maxMonthlyTransfer: number;
  maxSingleDeposit: number;
  maxDailyDeposit: number;
  maxBalance: number;
}

// Default feature flags - all TRUE so the app works even without Firebase
export const defaultFeatureFlags: FeatureFlags = {
  transfersEnabled: true,
  depositsEnabled: true,
  withdrawalsEnabled: true,
  exchangeEnabled: true,
  servicesEnabled: true,
  rechargeEnabled: true,
  billsEnabled: true,
  investmentEnabled: true,
  cryptoEnabled: true,
  giftCodesEnabled: true,
  qrPaymentsEnabled: true,
  referralEnabled: true,
  notificationsEnabled: true,
  biometricEnabled: true,
  pinEnabled: true,
  darkModeEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
  registrationEnabled: true,
};

// Default transaction limits
export const defaultTransactionLimits: TransactionLimits = {
  maxSingleTransfer: 500000,
  maxDailyTransfer: 1000000,
  maxMonthlyTransfer: 5000000,
  maxSingleDeposit: 1000000,
  maxDailyDeposit: 2000000,
  maxBalance: 10000000,
};

// Limits by user tier
export const limitsByTier = {
  unverified: {
    maxSingleTransfer: 50000,
    maxDailyTransfer: 100000,
    maxMonthlyTransfer: 500000,
    maxSingleDeposit: 100000,
    maxDailyDeposit: 200000,
    maxBalance: 500000,
  },
  verified: {
    maxSingleTransfer: 500000,
    maxDailyTransfer: 1000000,
    maxMonthlyTransfer: 5000000,
    maxSingleDeposit: 1000000,
    maxDailyDeposit: 2000000,
    maxBalance: 10000000,
  },
  premium: {
    maxSingleTransfer: 0, // unlimited
    maxDailyTransfer: 0,
    maxMonthlyTransfer: 0,
    maxSingleDeposit: 0,
    maxDailyDeposit: 0,
    maxBalance: 0,
  },
};

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Navigation
  activeTab: 'home' | 'services' | 'wallet' | 'account';
  setActiveTab: (tab: 'home' | 'services' | 'wallet' | 'account') => void;
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  previousScreen: string;
  setPreviousScreen: (screen: string) => void;

  // QR screen initial tab (set before navigating to QR screen)
  qrInitialTab: 'scan' | 'generate' | null;
  setQrInitialTab: (tab: 'scan' | 'generate' | null) => void;

  // Balance visibility
  balanceVisible: boolean;
  toggleBalance: () => void;

  // Active currency card
  activeCard: number;
  setActiveCard: (index: number) => void;

  // Transactions
  transactions: Transaction[];
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;

  // Notifications
  notifications: Notification[];
  setNotifications: (notifs: Notification[]) => void;
  addNotification: (notif: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markNotificationRead: (id: string) => void;
  unreadCount: () => number;

  // Service system
  categories: ServiceCategory[];
  setCategories: (cats: ServiceCategory[]) => void;
  providers: ServiceProvider[];
  setProviders: (provs: ServiceProvider[]) => void;
  packages: ProductPackage[];
  setPackages: (pkgs: ProductPackage[]) => void;
  addPackage: (pkg: ProductPackage) => void;
  updatePackage: (id: string, pkg: Partial<ProductPackage>) => void;

  // Firebase realtime data (raw) for services
  fbSections: Record<string, any>;
  setFbSections: (data: Record<string, any>) => void;
  fbWalletServices: Record<string, any>;
  setFbWalletServices: (data: Record<string, any>) => void;
  fbApiProviders: Record<string, any>;
  setFbApiProviders: (data: Record<string, any>) => void;
  fbVisibility: { sections: Record<string, boolean>; providers: Record<string, boolean>; features: Record<string, boolean> };
  setFbVisibility: (data: { sections: Record<string, boolean>; providers: Record<string, boolean>; features: Record<string, boolean> }) => void;

  // Wallet addresses (from adminSettings/walletAddresses)
  fbWalletAddresses: Record<string, any>;
  setFbWalletAddresses: (data: Record<string, any>) => void;

  // Bottom navigation (from adminSettings/bottomNav)
  fbBottomNav: Record<string, { visible: boolean; label: string; icon?: string }>;
  setFbBottomNav: (data: Record<string, { visible: boolean; label: string; icon?: string }>) => void;

  // Kill switch (from adminSettings/killSwitch)
  killSwitch: { active: boolean; message: string; activatedAt: string; activatedBy: string; deactivateAt: string; duration: number } | null;
  setKillSwitch: (data: { active: boolean; message: string; activatedAt: string; activatedBy: string; deactivateAt: string; duration: number } | null) => void;

  // Orders
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;

  // Quick Action Drawer
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;

  // Transfer modal
  isTransferOpen: boolean;
  setTransferOpen: (open: boolean) => void;

  // Request money modal
  isRequestMoneyOpen: boolean;
  setRequestMoneyOpen: (open: boolean) => void;

  // Order modal (bottom sheet)
  isOrderOpen: boolean;
  setOrderOpen: (open: boolean) => void;
  selectedProvider: ServiceProvider | null;
  setSelectedProvider: (prov: ServiceProvider | null) => void;

  // Selected category for detail screen
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;

  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // PIN Lock
  pinCode: string;
  setPinCode: (pin: string) => void;
  isPinLocked: boolean;
  setPinLocked: (locked: boolean) => void;

  // Favorites
  favorites: string[];
  toggleFavorite: (providerId: string) => void;

  // Recent services
  recentServices: string[];
  addRecentService: (providerId: string) => void;

  // Deposit requests
  depositRequests: DepositRequest[];
  addDepositRequest: (req: DepositRequest) => void;
  updateDepositStatus: (id: string, status: DepositRequest['status'], reviewedAt?: string) => void;

  // Withdraw requests
  withdrawRequests: WithdrawRequest[];
  addWithdrawRequest: (req: WithdrawRequest) => void;
  updateWithdrawStatus: (id: string, status: WithdrawRequest['status'], reviewedAt?: string) => void;

  // Support tickets
  supportTickets: SupportTicket[];
  addTicket: (ticket: SupportTicket) => void;
  updateTicket: (id: string, updates: Partial<SupportTicket>) => void;

  // Exchange rates
  exchangeRates: { YER: number; SAR: number; USD: number };
  setExchangeRates: (rates: { YER: number; SAR: number; USD: number }) => void;

  // Promo codes
  promoCodes: PromoCode[];
  applyPromoCode: (code: string) => Promise<PromoCode | null>;

  // Gift codes
  redeemGiftCode: (code: string) => Promise<{ success: boolean; message: string; amount?: number; currency?: string }>;

  // Savings goals
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: SavingsGoal) => void;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;

  // Investments
  investments: Investment[];
  setInvestments: (investments: Investment[]) => void;
  addInvestment: (investment: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;

  // User gift codes
  userGiftCodes: UserGiftCode[];
  setUserGiftCodes: (codes: UserGiftCode[]) => void;
  addUserGiftCode: (code: UserGiftCode) => void;
  updateUserGiftCode: (id: string, updates: Partial<UserGiftCode>) => void;

  // Card colors
  cardColors: CardColor;
  setCardColors: (colors: CardColor) => void;

  // Maintenance mode
  maintenance: MaintenanceMode | null;
  setMaintenance: (data: MaintenanceMode | null) => void;

  // Force update
  forceUpdate: ForceUpdate | null;
  setForceUpdate: (data: ForceUpdate | null) => void;

  // Money requests
  moneyRequests: MoneyRequest[];
  setMoneyRequests: (requests: MoneyRequest[]) => void;
  addMoneyRequest: (request: MoneyRequest) => void;
  updateMoneyRequest: (id: string, updates: Partial<MoneyRequest>) => void;

  // Investment plans (from admin)
  investmentPlans: InvestmentPlan[];
  setInvestmentPlans: (plans: InvestmentPlan[]) => void;

  // Biometric enabled
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;

  // Biometric transaction confirmation (optional)
  biometricTransactionConfirm: boolean;
  setBiometricTransactionConfirm: (enabled: boolean) => void;

  // Exchange rate API URL
  exchangeRateApiUrl: string;
  setExchangeRateApiUrl: (url: string) => void;

  // Feature flags (from admin)
  featureFlags: FeatureFlags;
  setFeatureFlags: (flags: Partial<FeatureFlags>) => void;

  // Transaction limits (from admin)
  transactionLimits: TransactionLimits;
  setTransactionLimits: (limits: Partial<TransactionLimits>) => void;

  // Auto lock timeout (minutes)
  autoLockTimeout: number;
  setAutoLockTimeout: (timeout: number) => void;

  // Escrow transactions
  escrowTransactions: any[];
  setEscrowTransactions: (data: any[]) => void;
}

// Default service categories - now loaded from Supabase sections table
// Empty array as default; actual data comes from use-supabase-sync
const defaultCategories: ServiceCategory[] = [];

// Default service providers for Yemen
const defaultProviders: ServiceProvider[] = [];

// Default packages — comprehensive product catalog with real YER market prices
// Exchange rate: 1 USD = 1550 YER, 1 SAR = 410 YER
const defaultPackages: ProductPackage[] = [];

// Default promo codes
const defaultPromoCodes: PromoCode[] = [
  { id: 'welcome', code: 'WELCOME50', discount: 50, type: 'fixed', currency: 'YER', maxUses: 100, usedCount: 0, expiresAt: '2027-01-01', isActive: true },
  { id: 'summer', code: 'SUMMER10', discount: 10, type: 'percentage', currency: 'YER', maxUses: 50, usedCount: 0, expiresAt: '2026-09-01', isActive: true },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      setUser: (user) => {
        // Restore pinCode from per-user localStorage if available
        if (user?.id && typeof window !== 'undefined') {
          const savedPin = localStorage.getItem(`pin_code_${user.id}`);
          if (savedPin && !get().pinCode) {
            set({ user, isAuthenticated: !!user, pinCode: savedPin });
            return;
          }
        }
        set({ user, isAuthenticated: !!user });
      },
      logout: () => {
        const currentUser = get().user;
        // Save pinCode per-user in localStorage before clearing
        if (currentUser?.id && get().pinCode) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(`pin_code_${currentUser.id}`, get().pinCode);
          }
        }
        signOut(auth).catch(() => {});
        // Keep biometricEnabled as-is so it persists per-user via localStorage
        // The actual per-user flag (biometric_enabled_<uid>) is never cleared on logout
        set({
          user: null,
          isAuthenticated: false,
          activeTab: 'home',
          pinCode: '',
          isPinLocked: false,
          // Reset biometricEnabled to false in store; it will be re-evaluated
          // from localStorage on next login based on the user's UID
          biometricEnabled: false,
        });
      },

      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      // Navigation
      activeTab: 'home',
      setActiveTab: (activeTab) => set({ activeTab }),
      activeScreen: 'main',
      setActiveScreen: (activeScreen) => set((state) => ({ previousScreen: state.activeScreen, activeScreen })),
      previousScreen: '',
      setPreviousScreen: (previousScreen) => set({ previousScreen }),

      // QR screen initial tab
      qrInitialTab: null,
      setQrInitialTab: (qrInitialTab) => set({ qrInitialTab }),

      // Balance
      balanceVisible: true,
      toggleBalance: () => set((state) => ({ balanceVisible: !state.balanceVisible })),

      // Card
      activeCard: 0,
      setActiveCard: (activeCard) => set({ activeCard }),

      // Transactions
      transactions: [],
      setTransactions: (transactions) => set({ transactions }),
      addTransaction: (tx) => set((state) => ({ transactions: [tx, ...state.transactions] })),

      // Notifications
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      addNotification: (notif) => set((state) => ({ notifications: [notif, ...state.notifications] })),
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
        // Delete from Supabase
        supabaseService.markNotificationRead(id).catch(() => {});
      },
      clearNotifications: () => {
        const user = get().user;
        set({ notifications: [] });
        // Mark all as read in Supabase
        if (user?.id) {
          const unreadIds = get().notifications.filter(n => !n.isRead).map(n => n.id);
          unreadIds.forEach(id => supabaseService.markNotificationRead(id).catch(() => {}));
        }
      },
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
        }));
        // Update in Supabase
        supabaseService.markNotificationRead(id).catch(() => {});
      },
      unreadCount: () => get().notifications.filter(n => !n.isRead).length,

      // Service system
      categories: defaultCategories,
      setCategories: (categories) => set({ categories }),
      providers: defaultProviders,
      setProviders: (providers) => set({ providers }),
      packages: defaultPackages,
      setPackages: (packages) => set({ packages }),
      addPackage: (pkg) => set((state) => ({ packages: [...state.packages, pkg] })),
      updatePackage: (id, pkg) => set((state) => ({
        packages: state.packages.map(p => p.id === id ? { ...p, ...pkg } : p)
      })),

      // Firebase realtime data (raw) for services
      fbSections: {},
      setFbSections: (fbSections) => set({ fbSections }),
      fbWalletServices: {},
      setFbWalletServices: (fbWalletServices) => set({ fbWalletServices }),
      fbApiProviders: {},
      setFbApiProviders: (fbApiProviders) => set({ fbApiProviders }),
      fbVisibility: { sections: {}, providers: {}, features: {} },
      setFbVisibility: (fbVisibility) => set({ fbVisibility }),

      // Wallet addresses
      fbWalletAddresses: {},
      setFbWalletAddresses: (fbWalletAddresses) => set({ fbWalletAddresses }),

      // Bottom navigation
      fbBottomNav: {},
      setFbBottomNav: (fbBottomNav) => set({ fbBottomNav }),

      // Kill switch
      killSwitch: null,
      setKillSwitch: (killSwitch) => set({ killSwitch }),

      // Orders
      orders: [],
      setOrders: (orders) => set({ orders }),
      addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
      updateOrderStatus: (id, status) => set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status, completedAt: status === 'completed' ? new Date().toISOString() : o.completedAt } : o)
      })),

      // Drawer
      isDrawerOpen: false,
      setDrawerOpen: (isDrawerOpen) => set({ isDrawerOpen }),

      // Transfer
      isTransferOpen: false,
      setTransferOpen: (isTransferOpen) => set({ isTransferOpen }),

      // Request money
      isRequestMoneyOpen: false,
      setRequestMoneyOpen: (isRequestMoneyOpen) => set({ isRequestMoneyOpen }),

      // Order modal
      isOrderOpen: false,
      setOrderOpen: (isOrderOpen) => set({ isOrderOpen }),
      selectedProvider: null,
      setSelectedProvider: (selectedProvider) => set({ selectedProvider }),

      // Selected category
      selectedCategory: null,
      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

      // Loading
      isLoading: false,
      setLoading: (isLoading) => set({ isLoading }),

      // PIN Lock
      pinCode: '',
      setPinCode: (pinCode) => set({ pinCode }),
      isPinLocked: true,
      setPinLocked: (isPinLocked) => set({ isPinLocked }),

      // Favorites
      favorites: [],
      toggleFavorite: (providerId) => set((state) => ({
        favorites: state.favorites.includes(providerId)
          ? state.favorites.filter(id => id !== providerId)
          : [...state.favorites, providerId]
      })),

      // Recent services
      recentServices: [],
      addRecentService: (providerId) => set((state) => {
        const filtered = state.recentServices.filter(id => id !== providerId);
        return { recentServices: [providerId, ...filtered].slice(0, 10) };
      }),

      // Deposit requests
      depositRequests: [],
      addDepositRequest: (req) => set((state) => ({ depositRequests: [req, ...state.depositRequests] })),
      updateDepositStatus: (id, status, reviewedAt) => set((state) => ({
        depositRequests: state.depositRequests.map(r =>
          r.id === id ? { ...r, status, reviewedAt: reviewedAt || new Date().toISOString() } : r
        )
      })),

      // Withdraw requests
      withdrawRequests: [],
      addWithdrawRequest: (req) => set((state) => ({ withdrawRequests: [req, ...state.withdrawRequests] })),
      updateWithdrawStatus: (id, status, reviewedAt) => set((state) => ({
        withdrawRequests: state.withdrawRequests.map(r =>
          r.id === id ? { ...r, status, reviewedAt: reviewedAt || new Date().toISOString() } : r
        )
      })),

      // Support tickets
      supportTickets: [],
      addTicket: (ticket) => set((state) => ({ supportTickets: [ticket, ...state.supportTickets] })),
      updateTicket: (id, updates) => set((state) => ({
        supportTickets: state.supportTickets.map(t =>
          t.id === id ? { ...t, ...updates } : t
        )
      })),

      // Exchange rates - synced from Supabase
      exchangeRates: { YER: 1, SAR: 3.75, USD: 1 },
      setExchangeRates: (exchangeRates) => set({ exchangeRates }),

      // Promo codes
      promoCodes: defaultPromoCodes,
      applyPromoCode: async (code) => {
        if (!code.trim()) return null;
        try {
          const { supabase } = await import('@/lib/supabase');
          const normalizedCode = code.trim().toUpperCase();

          // Query Supabase promo_codes by code
          const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .eq('code', normalizedCode)
            .eq('is_active', true)
            .limit(1);

          if (error || !data || data.length === 0) {
            return null;
          }

          const promo = data[0];
          if (promo.used_count >= promo.max_uses) return null;
          if (promo.expires_at && new Date(promo.expires_at) < new Date()) return null;

          // Increment used_count
          await supabase
            .from('promo_codes')
            .update({ used_count: promo.used_count + 1 })
            .eq('id', promo.id);

          return promo as unknown as PromoCode;
        } catch (error) {
          console.error('Apply promo code error:', error);
          return null;
        }
      },

      // Gift codes - FIXED: Uses Supabase RPC for atomic balance update (race condition fix)
      redeemGiftCode: async (code) => {
        const state = get();
        const currentUser = state.user;
        if (!currentUser) {
          return { success: false, message: 'يجب تسجيل الدخول أولاً' };
        }
        if (!code.trim()) {
          return { success: false, message: 'يرجى إدخال كود الهدية' };
        }
        try {
          const { supabase } = await import('@/lib/supabase');
          const normalizedCode = code.trim().toUpperCase();

          // Look up gift code in Supabase
          const { data: giftData, error: giftError } = await supabase
            .from('gift_codes')
            .select('*')
            .eq('code', normalizedCode)
            .eq('is_active', true)
            .limit(1);

          if (giftError || !giftData || giftData.length === 0) {
            return { success: false, message: 'كود الهدية غير صالح' };
          }

          const gift = giftData[0];

          // Validate
          if (gift.used_count >= gift.max_uses) {
            return { success: false, message: 'تم استخدام هذا الكود الحد الأقصى من المرات' };
          }
          if (gift.expires_at && new Date(gift.expires_at) < new Date()) {
            return { success: false, message: 'انتهت صلاحية هذا الكود' };
          }

          // Check if user already redeemed
          const { data: existingRedemption } = await supabase
            .from('gift_code_redemptions')
            .select('id')
            .eq('gift_code_id', gift.id)
            .eq('user_id', currentUser.userId || currentUser.id)
            .limit(1);

          if (existingRedemption && existingRedemption.length > 0) {
            return { success: false, message: 'لقد استخدمت هذا الكود من قبل' };
          }

          // Increment used_count atomically
          await supabase
            .from('gift_codes')
            .update({ used_count: gift.used_count + 1 })
            .eq('id', gift.id);

          // Record redemption
          await supabase.from('gift_code_redemptions').insert({
            gift_code_id: gift.id,
            user_id: currentUser.userId || currentUser.id,
            redeemed_at: new Date().toISOString(),
          });

          // CRITICAL FIX: Use atomic RPC for balance update (prevents race condition)
          const currencyMap: Record<string, string> = { YER: 'balance_yer', SAR: 'balance_sar', USD: 'balance_usd' };
          const dbCurrencyField = currencyMap[gift.currency] || 'balance_yer';
          
          await supabaseService.updateBalance(
            currentUser.userId || currentUser.id,
            dbCurrencyField.replace('balance_', '').toUpperCase(),
            gift.amount,
            'add'
          );

          // Update local store
          const currencyToField: Record<string, 'balanceYER' | 'balanceSAR' | 'balanceUSD'> = {
            YER: 'balanceYER',
            SAR: 'balanceSAR',
            USD: 'balanceUSD',
          };
          const balanceField = currencyToField[gift.currency] || 'balanceYER';
          const currentBalance = (currentUser[balanceField] as number) || 0;
          const newBalance = currentBalance + gift.amount;

          const updatedUser = { ...currentUser, [balanceField]: newBalance };

          const transaction = {
            id: `gift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fromUserId: 'GIFT',
            toUserId: currentUser.id,
            amount: gift.amount,
            currency: gift.currency as 'YER' | 'SAR' | 'USD',
            type: 'deposit' as const,
            status: 'completed' as const,
            description: `استرداد كود هدية: ${normalizedCode}`,
            createdAt: new Date().toISOString(),
          };

          set({ user: updatedUser, transactions: [transaction, ...state.transactions] });

          state.addNotification({
            id: `gift-${Date.now()}`,
            title: 'تم استرداد كود الهدية!',
            body: `تم إضافة ${gift.amount} ${gift.currency === 'YER' ? 'ر.ي' : gift.currency === 'SAR' ? 'ر.س' : '$'} إلى رصيدك`,
            type: 'promo',
            isRead: false,
            createdAt: new Date().toISOString(),
          });

          return { success: true, message: `تم إضافة ${gift.amount} ${gift.currency === 'YER' ? 'ر.ي' : gift.currency === 'SAR' ? 'ر.س' : '$'} إلى رصيدك`, amount: gift.amount, currency: gift.currency };
        } catch (error) {
          console.error('Gift code redemption error:', error);
          return { success: false, message: 'حدث خطأ، يرجى المحاولة لاحقاً' };
        }
      },

      // Savings goals
      savingsGoals: [],
      addSavingsGoal: (goal) => set((state) => ({ savingsGoals: [...state.savingsGoals, goal] })),
      updateSavingsGoal: (id, updates) => set((state) => ({
        savingsGoals: state.savingsGoals.map(g =>
          g.id === id ? { ...g, ...updates } : g
        )
      })),

      // Investments
      investments: [],
      setInvestments: (investments) => set({ investments }),
      addInvestment: (investment) => set((state) => ({ investments: [investment, ...state.investments] })),
      updateInvestment: (id, updates) => set((state) => ({
        investments: state.investments.map(inv =>
          inv.id === id ? { ...inv, ...updates } : inv
        )
      })),

      // User gift codes
      userGiftCodes: [],
      setUserGiftCodes: (userGiftCodes) => set({ userGiftCodes }),
      addUserGiftCode: (code) => set((state) => ({ userGiftCodes: [code, ...state.userGiftCodes] })),
      updateUserGiftCode: (id, updates) => set((state) => ({
        userGiftCodes: state.userGiftCodes.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      })),

      // Card colors
      cardColors: {
        YER: { primary: '#5C1A1B', gradient: '#3D0F10' },
        SAR: { primary: '#7D2D30', gradient: '#5C1A1B' },
        USD: { primary: '#8B3A3D', gradient: '#6B2A2D' },
      },
      setCardColors: (cardColors) => set({ cardColors }),

      // Biometric enabled — initialize from localStorage if a user is already logged in
      biometricEnabled: (() => {
        if (typeof window === 'undefined') return false;
        try {
          const storeStr = localStorage.getItem('fahed-net-store');
          if (storeStr) {
            const parsed = JSON.parse(storeStr);
            const uid = parsed?.state?.user?.id;
            if (uid && isBiometricEnabledForUser(uid)) return true;
          }
        } catch { /* ignore */ }
        return false;
      })(),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),

      // Biometric transaction confirmation
      biometricTransactionConfirm: (() => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem('biometricTransactionConfirm') !== 'false';
        }
        return true;
      })(),
      setBiometricTransactionConfirm: (biometricTransactionConfirm) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('biometricTransactionConfirm', String(biometricTransactionConfirm));
        }
        set({ biometricTransactionConfirm });
      },

      // Feature flags
      featureFlags: defaultFeatureFlags,
      setFeatureFlags: (flags) => set((state) => ({
        featureFlags: { ...state.featureFlags, ...flags },
      })),

      // Transaction limits
      transactionLimits: defaultTransactionLimits,
      setTransactionLimits: (limits) => set((state) => ({
        transactionLimits: { ...state.transactionLimits, ...limits },
      })),

      // Auto lock timeout
      autoLockTimeout: 5, // default 5 minutes
      setAutoLockTimeout: (autoLockTimeout) => set({ autoLockTimeout }),

      // Escrow transactions
      escrowTransactions: [],
      setEscrowTransactions: (escrowTransactions) => set({ escrowTransactions }),
    }),
    {
      name: 'fahed-net-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        theme: state.theme,
        balanceVisible: state.balanceVisible,
        pinCode: state.pinCode,
        biometricEnabled: state.biometricEnabled,
        favorites: state.favorites,
        recentServices: state.recentServices,
        savingsGoals: state.savingsGoals,
        exchangeRates: state.exchangeRates,
      }),
    }
  )
);
