'use client';

import { createContext, useContext } from 'react';
import type { AdminTab, FirebaseUser, DepositReq, WithdrawReq, PromoCodeData, BankAccount, Banner, AdminExchangeRates, AppSettings } from './admin-types';
import type { ServiceProvider, ProductPackage, Order } from '@/lib/store';

export interface AdminContextType {
  isDark: boolean;
  cardStyle: { background: string; backdropFilter: 'blur(20px)'; border: string };
  inputStyle: { background: string; color: string };
  statusStyles: Record<string, { bg: string; color: string; label: string }>;
  kycStatusStyle: Record<string, { bg: string; color: string; label: string }>;
  addAuditEntry: (action: string) => void;
  setActiveTab: (tab: AdminTab) => void;

  // Data
  allOrders: Order[];
  filteredOrders: Order[];
  pendingOrders: Order[];
  firebaseUsers: FirebaseUser[];
  filteredUsers: FirebaseUser[];
  depositRequests: DepositReq[];
  withdrawRequests: WithdrawReq[];
  kycUsers: FirebaseUser[];
  banks: BankAccount[];
  setBanks: (banks: BankAccount[]) => void;
  banners: Banner[];
  setBanners: (banners: Banner[]) => void;
  promoCodes: PromoCodeData[];
  adminExchangeRates: AdminExchangeRates;
  setAdminExchangeRates: (rates: AdminExchangeRates) => void;
  ratesSaved: boolean;
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  providers: ServiceProvider[];
  packages: ProductPackage[];
  statsData: { totalOrders: number; pendingOrders: number; completedOrders: number; totalRevenue: number; revenueYER: number; revenueSAR: number; revenueUSD: number };
  revenueChart: { day: string; amount: number }[];
  auditLog: { action: string; time: string }[];
  firebaseOrders: Order[];

  // Store
  user: any;
  orders: Order[];
  updateOrderStatus: (id: string, status: 'pending' | 'completed' | 'refunded' | 'cancelled') => void;
  setProviders: (providers: ServiceProvider[]) => void;
  setPackages: (packages: ProductPackage[]) => void;
  addPackage: (pkg: ProductPackage) => void;
  updatePackage: (id: string, data: Partial<ProductPackage>) => void;
  setExchangeRates: (rates: any) => void;

  // Order handlers
  handleCompleteOrder: (order: Order) => Promise<void>;
  handleCancelOrder: (order: Order) => Promise<void>;

  // Product handlers - accept params
  handleAddProduct: (product: { name: string; price: number; currency: 'YER' | 'SAR' | 'USD'; providerId: string; executionType: 'manual' | 'auto' }) => void;
  handleToggleProduct: (id: string) => void;
  handleDeleteProduct: (id: string) => void;

  // Provider handlers - accept params
  handleAddProvider: (provider: { name: string; color: string; categoryId: string; inputLabel: string; inputType: 'phone' | 'text'; inputPrefix: string; icon: string }) => void;
  handleToggleProvider: (id: string) => void;
  handleDeleteProvider: (id: string) => void;
  handleUpdateProvider: (provider: ServiceProvider) => void;
  handleIconUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'provider' | 'editProvider') => void;

  // User handlers - balance adjust accepts params
  handleToggleBlock: (u: FirebaseUser) => Promise<void>;
  handleBalanceAdjust: (u: FirebaseUser, action: 'add' | 'subtract', amount: number, currency: 'YER' | 'SAR' | 'USD') => Promise<void>;

  // Deposit handlers
  handleApproveDeposit: (dep: DepositReq) => Promise<void>;
  handleRejectDeposit: (dep: DepositReq) => Promise<void>;

  // Withdraw handlers
  handleApproveWithdraw: (w: WithdrawReq) => Promise<void>;
  handleRejectWithdraw: (w: WithdrawReq) => Promise<void>;

  // KYC handlers
  handleApproveKyc: (u: FirebaseUser) => Promise<void>;
  handleRejectKyc: (u: FirebaseUser) => Promise<void>;

  // Promo code handlers
  handleAddPromoCode: () => void;
  handleTogglePromoCode: (c: PromoCodeData) => Promise<void>;

  // Bank handlers - accept params
  handleAddBank: (bank: { bankName: string; accountHolderName: string; accountNumber: string; color: string }) => void;
  handleUpdateBank: (bank: BankAccount) => void;
  handleDeleteBank: (bank: BankAccount) => void;
  handleToggleBank: (bank: BankAccount) => void;

  // Banner handlers - accept params
  handleAddBanner: (banner: { title: string; description: string; imageUrl: string; link: string; order: number }) => void;
  handleToggleBanner: (banner: Banner) => Promise<void>;
  handleDeleteBanner: (banner: Banner) => Promise<void>;
  handleUpdateBanner: (banner: Banner) => Promise<void>;
  handleReorderBanners: (bannerId: string, direction: 'up' | 'down') => void;

  // Exchange rates
  handleSaveExchangeRates: () => void;
  handleSaveRates: () => void;
  handleSendBulkNotif: (title: string, body: string) => Promise<void>;

  // App settings
  handleSaveAppSettings: () => void;
  settingsSaved: boolean;

  // Modal state setters
  setViewReceipt: (v: string | null) => void;
  setViewKycPhoto: (v: { type: 'id' | 'selfie'; url: string } | null) => void;
}

export const AdminContext = createContext<AdminContextType | null>(null);

export function useAdminContext() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdminContext must be used within AdminContext.Provider');
  return ctx;
}
