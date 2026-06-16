'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ArrowLeftRight, ShieldCheck, Package, TrendingUp, Lock, Unlock,
  CheckCircle2, XCircle, Plus, Trash2, ToggleLeft, ToggleRight, DollarSign,
  ArrowLeft, Search, Bell, Mail, MapPin, Hash, BarChart3, Settings, Clock,
  CreditCard, Phone, ChevronDown, ChevronUp, Smartphone, Gamepad2, Gift,
  Wifi, ImagePlus, RotateCcw, AlertTriangle, ShoppingBag, Eye, EyeOff,
  Filter, Send, X, Copy, Tag, Percent, Calendar, UserCheck, UserX,
  FileText, Image as ImageIcon, MessageSquare, Globe, RefreshCw, ArrowRightLeft,
  Banknote, Wallet, BadgeCheck, Ban, Edit3, Save, ChevronLeft, Activity,
  Zap, Layers, PieChart, Radio, Building2, ArrowDownCircle, ArrowUpCircle,
  Server, Link, ExternalLink, BookOpen, Scale, HelpCircle
} from 'lucide-react';
import { useAppStore, type ServiceProvider, type ProductPackage, type Order } from '@/lib/store';
import { currencySymbols, currencyBadgeColors, currencyNames, generateReference, formatNumber, timeAgo, compressBase64Image, defaultExchangeRates } from '@/lib/utils';
import { ref, set, get, update, remove, push, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { LOGO_BASE64 } from '@/lib/logo';

type AdminTab = 'overview' | 'orders' | 'users' | 'deposit' | 'withdraw' | 'kyc' | 'banks' | 'exchangeRates' | 'instantRecharge' | 'entertainment' | 'providers' | 'codes' | 'giftCodes' | 'banners' | 'socialLinks' | 'legalContent' | 'settings';

interface FirebaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  userId: string;
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

interface DepositReq {
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

interface WithdrawReq {
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

interface PromoCodeData {
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

interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  color: string;
  isActive: boolean;
}

interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
  link?: string;
  createdAt: string;
}

interface AdminSubSection {
  id: string;
  providerId: string;
  parentId: string;
  name: string;
  icon: string;
  isActive: boolean;
  order: number;
}

interface GiftCodeData {
  id: string;
  code: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
  createdById: string;
}

interface AdminExchangeRates {
  YERtoSAR: number;
  YERtoUSD: number;
  SARtoYER: number;
  SARtoUSD: number;
  USDtoYER: number;
  USDtoSAR: number;
  commission: number;
}

const defaultAdminExchangeRates: AdminExchangeRates = {
  YERtoSAR: 1/410,
  YERtoUSD: 1/1550,
  SARtoYER: 410,
  SARtoUSD: 410/1550,
  USDtoYER: 1550,
  USDtoSAR: 1550/410,
  commission: 2,
};

export default function AdminScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    setActiveScreen, user, orders, updateOrderStatus, providers, setProviders,
    packages, setPackages, addPackage, updatePackage, setExchangeRates,
    addNotification
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, currency: 'YER' as 'YER' | 'SAR' | 'USD', providerId: '', executionType: 'manual' as 'manual' | 'auto' });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState({ name: '', price: 0 });

  // Provider form
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', color: '#5C1A1B', categoryId: 'telecom', inputLabel: '', inputType: 'phone' as 'phone' | 'text', inputPrefix: '+967', icon: '' });
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firebase data
  const [firebaseOrders, setFirebaseOrders] = useState<Order[]>([]);
  const [statsData, setStatsData] = useState({ totalOrders: 0, pendingOrders: 0, completedOrders: 0, totalRevenue: 0, revenueYER: 0, revenueSAR: 0, revenueUSD: 0 });

  // Users
  const [firebaseUsers, setFirebaseUsers] = useState<FirebaseUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [balanceAdjustUser, setBalanceAdjustUser] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceCurrency, setBalanceCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract'>('add');

  // Deposit
  const [depositRequests, setDepositRequests] = useState<DepositReq[]>([]);
  const [depositFilter, setDepositFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  // Withdraw
  const [withdrawRequests, setWithdrawRequests] = useState<WithdrawReq[]>([]);
  const [withdrawFilter, setWithdrawFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // KYC
  const [kycUsers, setKycUsers] = useState<FirebaseUser[]>([]);
  const [viewKycPhoto, setViewKycPhoto] = useState<{ type: 'id' | 'selfie'; url: string } | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState<string>('');

  // Promo Codes
  const [promoCodes, setPromoCodes] = useState<PromoCodeData[]>([]);
  const [showAddCode, setShowAddCode] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', discount: 0, type: 'percentage' as 'percentage' | 'fixed', currency: 'YER' as 'YER' | 'SAR' | 'USD', maxUses: 100, expiresAt: '' });

  // Settings
  const [exchangeRatesForm, setExchangeRatesForm] = useState({ YER: 1, SAR: 0.037, USD: 0.0099 });
  const [commissionRate, setCommissionRate] = useState('2');
  const [bulkNotif, setBulkNotif] = useState({ title: '', body: '' });
  const [auditLog, setAuditLog] = useState<{ action: string; time: string }[]>([]);

  // Revenue chart data (last 7 days)
  const [revenueChart, setRevenueChart] = useState<{ day: string; amount: number }[]>([]);

  // Banks
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [showAddBank, setShowAddBank] = useState(false);
  const [editingBank, setEditingBank] = useState<string | null>(null);
  const [newBank, setNewBank] = useState({ bankName: '', accountHolderName: '', accountNumber: '', color: '#5C1A1B' });

  // Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showAddBanner, setShowAddBanner] = useState(false);
  const [newBanner, setNewBanner] = useState({ title: '', description: '', imageUrl: '', link: '', order: 0 });
  const [editingBanner, setEditingBanner] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Exchange Rates (admin section)
  const [adminExchangeRates, setAdminExchangeRates] = useState<AdminExchangeRates>(defaultAdminExchangeRates);
  const [ratesSaved, setRatesSaved] = useState(false);

  // Instant Recharge Subsections
  const [instantSubsections, setInstantSubsections] = useState<AdminSubSection[]>([]);
  const [showAddInstantSub, setShowAddInstantSub] = useState<string | null>(null);
  const [newInstantSub, setNewInstantSub] = useState({ name: '', icon: '' });
  const instantSubFileRef = useRef<HTMLInputElement>(null);
  const [selectedInstantSub, setSelectedInstantSub] = useState<string | null>(null);

  // Entertainment Subsections
  const [entertainmentSubs, setEntertainmentSubs] = useState<AdminSubSection[]>([]);
  const [showAddEntertainSub, setShowAddEntertainSub] = useState<string | null>(null);
  const [newEntertainSub, setNewEntertainSub] = useState({ name: '', icon: '' });
  const entertainSubFileRef = useRef<HTMLInputElement>(null);
  const [selectedEntertainSub, setSelectedEntertainSub] = useState<string | null>(null);

  // Social Links
  const [socialLinks, setSocialLinks] = useState({
    whatsapp: '', facebook: '', twitter: '', instagram: '',
    telegram: '', youtube: '', supportEmail: '', contactAdmin: '',
    contactAdminMessage: '',
  });
  const [socialLinksSaved, setSocialLinksSaved] = useState(false);

  // Gift Codes
  const [giftCodes, setGiftCodes] = useState<GiftCodeData[]>([]);
  const [showAddGiftCode, setShowAddGiftCode] = useState(false);
  const [newGiftCode, setNewGiftCode] = useState({ amount: 0, currency: 'YER' as 'YER' | 'SAR' | 'USD', maxUses: 1, expiresAt: '' });

  // Legal Content
  const [legalContent, setLegalContent] = useState({
    faq: '', privacyPolicy: '', aboutApp: '',
  });
  const [legalContentSaved, setLegalContentSaved] = useState(false);

  const addAuditEntry = useCallback((action: string) => {
    setAuditLog(prev => [{ action, time: new Date().toISOString() }, ...prev].slice(0, 20));
  }, []);

  // Listen to Firebase orders
  useEffect(() => {
    const ordersRef = ref(database, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const ordersList = Object.values(data) as Order[];
        setFirebaseOrders(ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        const pending = ordersList.filter(o => o.status === 'pending').length;
        const completed = ordersList.filter(o => o.status === 'completed').length;
        const revYER = ordersList.filter(o => o.status === 'completed' && o.currency === 'YER').reduce((s, o) => s + o.amount, 0);
        const revSAR = ordersList.filter(o => o.status === 'completed' && o.currency === 'SAR').reduce((s, o) => s + o.amount, 0);
        const revUSD = ordersList.filter(o => o.status === 'completed' && o.currency === 'USD').reduce((s, o) => s + o.amount, 0);
        setStatsData({ totalOrders: ordersList.length, pendingOrders: pending, completedOrders: completed, totalRevenue: revYER, revenueYER: revYER, revenueSAR: revSAR, revenueUSD: revUSD });

        const days: { day: string; amount: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          const dayStr = d.toLocaleDateString('ar-SA', { weekday: 'short' });
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
          const dayEnd = dayStart + 86400000;
          const dayRev = ordersList.filter(o => o.status === 'completed' && new Date(o.createdAt).getTime() >= dayStart && new Date(o.createdAt).getTime() < dayEnd).reduce((s, o) => s + o.amount, 0);
          days.push({ day: dayStr, amount: dayRev });
        }
        setRevenueChart(days);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firebase users
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usersList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key, name: val.name || '', email: val.email || '', phone: val.phone || '',
          userId: val.userId || key, kycStatus: val.kycStatus || 'pending',
          isBlocked: val.isBlocked || false, balanceYER: val.balanceYER || 0,
          balanceSAR: val.balanceSAR || 0, balanceUSD: val.balanceUSD || 0,
          cardType: val.cardType, cardNumber: val.cardNumber, governorate: val.governorate,
          idPhotoUrl: val.idPhotoUrl, selfieUrl: val.selfieUrl, avatar: val.avatar,
          createdAt: val.createdAt
        }));
        setFirebaseUsers(usersList);
        setKycUsers(usersList.filter(u => u.kycStatus === 'submitted'));
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to deposit requests - FIXED: using depositRequests path
  useEffect(() => {
    const depRef = ref(database, 'depositRequests');
    const unsubscribe = onValue(depRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as DepositReq[];
        setDepositRequests(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else { setDepositRequests([]); }
    });
    return () => unsubscribe();
  }, []);

  // Listen to withdraw requests - FIXED: using withdrawRequests path
  useEffect(() => {
    const withRef = ref(database, 'withdrawRequests');
    const unsubscribe = onValue(withRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as WithdrawReq[];
        setWithdrawRequests(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else { setWithdrawRequests([]); }
    });
    return () => unsubscribe();
  }, []);

  // Listen to promo codes
  useEffect(() => {
    const codesRef = ref(database, 'promo-codes');
    const unsubscribe = onValue(codesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPromoCodes(Object.values(data) as PromoCodeData[]);
      } else { setPromoCodes([]); }
    });
    return () => unsubscribe();
  }, []);

  // Listen to banks from Firebase
  useEffect(() => {
    const banksRef = ref(database, 'adminSettings/banks');
    const unsubscribe = onValue(banksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const banksList = Object.values(data) as BankAccount[];
        setBanks(banksList);
      } else { setBanks([]); }
    });
    return () => unsubscribe();
  }, []);

  // Listen to exchange rates from Firebase
  useEffect(() => {
    const ratesRef = ref(database, 'adminSettings/exchangeRates');
    const unsubscribe = onValue(ratesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as AdminExchangeRates;
        setAdminExchangeRates({ ...defaultAdminExchangeRates, ...data });
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to banners from Firebase
  useEffect(() => {
    const bannersRef = ref(database, 'adminSettings/banners');
    const unsubscribe = onValue(bannersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const bannersList = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          title: val.title || '',
          description: val.description || '',
          imageUrl: val.imageUrl || '',
          isActive: val.isActive !== false,
          order: val.order || 0,
          link: val.link || '',
          createdAt: val.createdAt || new Date().toISOString(),
        }));
        setBanners(bannersList.sort((a, b) => a.order - b.order));
      } else {
        setBanners([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to instant recharge subsections from Firebase
  useEffect(() => {
    const subRef = ref(database, 'adminSettings/instantRechargeSubsections');
    const unsubscribe = onValue(subRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          providerId: val.providerId || '',
          parentId: val.providerId || '',
          name: val.name || '',
          icon: val.icon || '',
          isActive: val.isActive !== false,
          order: val.order || 0,
        }));
        setInstantSubsections(list.sort((a, b) => a.order - b.order));
      } else {
        setInstantSubsections([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to entertainment subsections from Firebase
  useEffect(() => {
    const subRef = ref(database, 'adminSettings/entertainmentSubsections');
    const unsubscribe = onValue(subRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          providerId: val.parentId || '',
          parentId: val.parentId || '',
          name: val.name || '',
          icon: val.icon || '',
          isActive: val.isActive !== false,
          order: val.order || 0,
        }));
        setEntertainmentSubs(list.sort((a, b) => a.order - b.order));
      } else {
        setEntertainmentSubs([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to social links from Firebase
  useEffect(() => {
    const linksRef = ref(database, 'adminSettings/socialLinks');
    const unsubscribe = onValue(linksRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSocialLinks(prev => ({
          ...prev,
          whatsapp: data.whatsapp || '',
          facebook: data.facebook || '',
          twitter: data.twitter || '',
          instagram: data.instagram || '',
          telegram: data.telegram || '',
          youtube: data.youtube || '',
          supportEmail: data.supportEmail || '',
          contactAdmin: data.contactAdmin || '',
          contactAdminMessage: data.contactAdminMessage || '',
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to legal content from Firebase
  useEffect(() => {
    const legalRef = ref(database, 'adminSettings/legalContent');
    const unsubscribe = onValue(legalRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLegalContent(prev => ({
          ...prev,
          faq: data.faq || '',
          privacyPolicy: data.privacyPolicy || '',
          aboutApp: data.aboutApp || '',
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen to gift codes from Firebase
  useEffect(() => {
    const giftRef = ref(database, 'giftCodes');
    const unsubscribe = onValue(giftRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const codesList = Object.values(data) as GiftCodeData[];
        setGiftCodes(codesList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setGiftCodes([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const allOrders = [...firebaseOrders, ...orders].filter(
    (order, index, self) => index === self.findIndex(o => o.id === order.id)
  );

  const filteredOrders = allOrders.filter(o => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return o.userName?.toLowerCase().includes(q) || o.customerInput?.includes(q) || o.providerName?.includes(q) || o.packageName?.includes(q) || o.id?.toLowerCase().includes(q) || o.userPhone?.includes(q);
    }
    return true;
  });

  const pendingOrders = allOrders.filter(o => o.status === 'pending');
  const filteredUsers = firebaseUsers.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.userId?.includes(q);
  });

  const handleCompleteOrder = async (order: Order) => {
    updateOrderStatus(order.id, 'completed');
    try {
      await update(ref(database, `orders/${order.id}`), { status: 'completed', completedAt: new Date().toISOString() });
      const notifId = generateReference();
      await set(ref(database, `notifications/${order.userId}/${notifId}`), {
        id: notifId, title: 'تم تنفيذ الطلب', body: `تم تنفيذ طلبك ${order.packageName} بنجاح`,
        type: 'transaction', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم تنفيذ طلب ${order.packageName} للمستخدم ${order.userName}`);
    } catch {}
  };

  const handleCancelOrder = async (order: Order) => {
    updateOrderStatus(order.id, 'cancelled');
    try {
      await update(ref(database, `orders/${order.id}`), { status: 'cancelled' });
      const userRef = ref(database, `users/${order.userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const balanceField = `balance${order.currency}`;
        const currentBalance = userData[balanceField] || 0;
        await update(userRef, { [balanceField]: currentBalance + order.amount });
      }
      const notifId = generateReference();
      await set(ref(database, `notifications/${order.userId}/${notifId}`), {
        id: notifId, title: 'تم إلغاء الطلب', body: `تم إلغاء طلبك ${order.packageName} وإعادة المبلغ لرصيدك`,
        type: 'info', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم إلغاء طلب ${order.packageName} وإعادة المبلغ`);
    } catch {}
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'provider' | 'editProvider') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (target === 'provider') {
        setNewProvider(prev => ({ ...prev, icon: base64 }));
      } else if (target === 'editProvider') {
        setProviders(providers.map(p => p.id === editingProvider ? { ...p, icon: base64 } : p));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddProvider = () => {
    if (!newProvider.name) return;
    const id = newProvider.name.replace(/\s/g, '-').toLowerCase();
    const provider: ServiceProvider = {
      id, categoryId: newProvider.categoryId, name: newProvider.name, color: newProvider.color,
      icon: newProvider.icon, isActive: true, inputLabel: newProvider.inputLabel,
      inputType: newProvider.inputType, inputPrefix: newProvider.inputPrefix,
    };
    setProviders([...providers, provider]);
    try { set(ref(database, `providers/${id}`), provider); } catch {}
    setNewProvider({ name: '', color: '#5C1A1B', categoryId: 'telecom', inputLabel: '', inputType: 'phone', inputPrefix: '+967', icon: '' });
    setShowAddProvider(false);
    addAuditEntry(`تم إضافة مزود ${provider.name}`);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.providerId || newProduct.price <= 0) return;
    const id = generateReference();
    const pkg: ProductPackage = {
      id, providerId: newProduct.providerId, name: newProduct.name, price: newProduct.price,
      currency: newProduct.currency, executionType: newProduct.executionType, isActive: true,
    };
    addPackage(pkg);
    try { set(ref(database, `packages/${id}`), pkg); } catch {}
    setNewProduct({ name: '', price: 0, currency: 'YER', providerId: '', executionType: 'manual' });
    setShowAddProduct(false);
    addAuditEntry(`تم إضافة منتج ${pkg.name}`);
  };

  const handleToggleProduct = (id: string) => {
    const pkg = packages.find(p => p.id === id);
    if (pkg) {
      updatePackage(id, { isActive: !pkg.isActive });
      try { update(ref(database, `packages/${id}`), { isActive: !pkg.isActive }); } catch {}
    }
  };

  const handleDeleteProduct = (id: string) => {
    const pkg = packages.find(p => p.id === id);
    setPackages(packages.filter(p => p.id !== id));
    try { remove(ref(database, `packages/${id}`)); } catch {}
    addAuditEntry(`تم حذف منتج ${pkg?.name || id}`);
  };

  const handleToggleProvider = (id: string) => {
    const provider = providers.find(p => p.id === id);
    if (provider) {
      setProviders(providers.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
      try { update(ref(database, `providers/${id}`), { isActive: !provider.isActive }); } catch {}
    }
  };

  const handleDeleteProvider = (id: string) => {
    const provider = providers.find(p => p.id === id);
    setProviders(providers.filter(p => p.id !== id));
    try { remove(ref(database, `providers/${id}`)); } catch {}
    addAuditEntry(`تم حذف مزود ${provider?.name || id}`);
  };

  // User management
  const handleToggleBlock = async (u: FirebaseUser) => {
    try {
      await update(ref(database, `users/${u.id}`), { isBlocked: !u.isBlocked });
      addAuditEntry(`${u.isBlocked ? 'تم إلغاء حظر' : 'تم حظر'} المستخدم ${u.name}`);
    } catch {}
  };

  const handleBalanceAdjust = async (u: FirebaseUser) => {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      const userRef = ref(database, `users/${u.id}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const field = `balance${balanceCurrency}`;
        const current = data[field] || 0;
        const newBalance = balanceAction === 'add' ? current + amount : Math.max(0, current - amount);
        await update(userRef, { [field]: newBalance });
        const notifId = generateReference();
        await set(ref(database, `notifications/${u.id}/${notifId}`), {
          id: notifId, title: 'تحديث الرصيد',
          body: `تم ${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${amount} ${currencySymbols[balanceCurrency]} ${balanceAction === 'add' ? 'إلى' : 'من'} رصيدك`,
          type: 'transaction', isRead: false, createdAt: new Date().toISOString(),
        });
        addAuditEntry(`تم ${balanceAction === 'add' ? 'إضافة' : 'خصم'} ${amount} ${currencySymbols[balanceCurrency]} ${balanceAction === 'add' ? 'للمستخدم' : 'من المستخدم'} ${u.name}`);
        setBalanceAdjustUser(null); setBalanceAmount('');
      }
    } catch {}
  };

  // Deposit handling - FIXED: using depositRequests path
  const handleApproveDeposit = async (dep: DepositReq) => {
    try {
      await update(ref(database, `depositRequests/${dep.id}`), { status: 'approved', reviewedAt: new Date().toISOString() });
      const userRef = ref(database, `users/${dep.userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const field = `balance${dep.currency}`;
        await update(userRef, { [field]: (data[field] || 0) + dep.amount });
      }
      const notifId = generateReference();
      await set(ref(database, `notifications/${dep.userId}/${notifId}`), {
        id: notifId, title: 'تم قبول الإيداع', body: `تم إضافة ${dep.amount} ${currencySymbols[dep.currency]} إلى رصيدك`,
        type: 'transaction', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم قبول إيداع ${dep.amount} ${currencySymbols[dep.currency]} للمستخدم ${dep.userName}`);
    } catch {}
  };

  const handleRejectDeposit = async (dep: DepositReq) => {
    try {
      await update(ref(database, `depositRequests/${dep.id}`), { status: 'rejected', reviewedAt: new Date().toISOString() });
      const notifId = generateReference();
      await set(ref(database, `notifications/${dep.userId}/${notifId}`), {
        id: notifId, title: 'تم رفض الإيداع', body: `تم رفض طلب إيداع ${dep.amount} ${currencySymbols[dep.currency]}`,
        type: 'info', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم رفض إيداع ${dep.amount} ${currencySymbols[dep.currency]} للمستخدم ${dep.userName}`);
    } catch {}
  };

  // Withdraw handling - FIXED: using withdrawRequests path
  const handleApproveWithdraw = async (w: WithdrawReq) => {
    try {
      await update(ref(database, `withdrawRequests/${w.id}`), { status: 'approved', reviewedAt: new Date().toISOString() });
      const userRef = ref(database, `users/${w.userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const field = `balance${w.currency}`;
        await update(userRef, { [field]: Math.max(0, (data[field] || 0) - w.amount) });
      }
      const notifId = generateReference();
      await set(ref(database, `notifications/${w.userId}/${notifId}`), {
        id: notifId, title: 'تم قبول السحب', body: `تم سحب ${w.amount} ${currencySymbols[w.currency]} من رصيدك`,
        type: 'transaction', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم قبول سحب ${w.amount} ${currencySymbols[w.currency]} للمستخدم ${w.userName}`);
    } catch {}
  };

  const handleRejectWithdraw = async (w: WithdrawReq) => {
    try {
      await update(ref(database, `withdrawRequests/${w.id}`), { status: 'rejected', reviewedAt: new Date().toISOString() });
      const notifId = generateReference();
      await set(ref(database, `notifications/${w.userId}/${notifId}`), {
        id: notifId, title: 'تم رفض السحب', body: `تم رفض طلب سحب ${w.amount} ${currencySymbols[w.currency]}`,
        type: 'info', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم رفض سحب ${w.amount} ${currencySymbols[w.currency]} للمستخدم ${w.userName}`);
    } catch {}
  };

  // KYC handling
  const handleApproveKyc = async (u: FirebaseUser) => {
    try {
      await update(ref(database, `users/${u.id}`), { kycStatus: 'verified' });
      const notifId = generateReference();
      await set(ref(database, `notifications/${u.id}/${notifId}`), {
        id: notifId, title: 'تم التحقق من هويتك', body: 'تم قبول وثائق التحقق الخاصة بك',
        type: 'security', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم التحقق من هوية المستخدم ${u.name}`);
    } catch {}
  };

  const handleRejectKyc = async (u: FirebaseUser) => {
    try {
      await update(ref(database, `users/${u.id}`), { kycStatus: 'rejected' });
      const notifId = generateReference();
      await set(ref(database, `notifications/${u.id}/${notifId}`), {
        id: notifId, title: 'تم رفض التحقق', body: kycRejectReason ? `السبب: ${kycRejectReason}` : 'تم رفض وثائق التحقق الخاصة بك',
        type: 'security', isRead: false, createdAt: new Date().toISOString(),
      });
      addAuditEntry(`تم رفض التحقق من هوية المستخدم ${u.name}`);
      setKycRejectReason('');
    } catch {}
  };

  // Promo code handling
  const handleAddPromoCode = () => {
    if (!newCode.code || newCode.discount <= 0) return;
    const id = generateReference();
    const code: PromoCodeData = { ...newCode, id, usedCount: 0, isActive: true };
    try { set(ref(database, `promo-codes/${id}`), code); } catch {}
    setNewCode({ code: '', discount: 0, type: 'percentage', currency: 'YER', maxUses: 100, expiresAt: '' });
    setShowAddCode(false);
    addAuditEntry(`تم إضافة كود خصم ${code.code}`);
  };

  const handleTogglePromoCode = async (c: PromoCodeData) => {
    try { await update(ref(database, `promo-codes/${c.id}`), { isActive: !c.isActive }); } catch {}
    addAuditEntry(`تم ${c.isActive ? 'تعطيل' : 'تفعيل'} كود ${c.code}`);
  };

  // Bank handling
  const handleAddBank = () => {
    if (!newBank.bankName || !newBank.accountHolderName || !newBank.accountNumber) return;
    const id = generateReference();
    const bank: BankAccount = { ...newBank, id, isActive: true };
    try { set(ref(database, `adminSettings/banks/${id}`), bank); } catch {}
    setNewBank({ bankName: '', accountHolderName: '', accountNumber: '', color: '#5C1A1B' });
    setShowAddBank(false);
    addAuditEntry(`تم إضافة بنك ${bank.bankName}`);
  };

  const handleUpdateBank = (bank: BankAccount) => {
    try { set(ref(database, `adminSettings/banks/${bank.id}`), bank); } catch {}
    setEditingBank(null);
    addAuditEntry(`تم تعديل بنك ${bank.bankName}`);
  };

  const handleDeleteBank = (bank: BankAccount) => {
    try { remove(ref(database, `adminSettings/banks/${bank.id}`)); } catch {}
    addAuditEntry(`تم حذف بنك ${bank.bankName}`);
  };

  const handleToggleBank = (bank: BankAccount) => {
    const updated = { ...bank, isActive: !bank.isActive };
    try { set(ref(database, `adminSettings/banks/${bank.id}`), updated); } catch {}
    addAuditEntry(`تم ${bank.isActive ? 'تعطيل' : 'تفعيل'} بنك ${bank.bankName}`);
  };

  // Banner handling
  const handleAddBanner = () => {
    if (!newBanner.title) return;
    const id = generateReference();
    const banner: Banner = {
      id,
      title: newBanner.title,
      description: newBanner.description,
      imageUrl: newBanner.imageUrl,
      isActive: true,
      order: newBanner.order || banners.length,
      link: newBanner.link,
      createdAt: new Date().toISOString(),
    };
    try {
      set(ref(database, `adminSettings/banners/${id}`), banner);
    } catch {}
    setNewBanner({ title: '', description: '', imageUrl: '', link: '', order: 0 });
    setShowAddBanner(false);
    addAuditEntry(`تم إضافة بانر ${banner.title}`);
  };

  const handleToggleBanner = async (banner: Banner) => {
    try {
      await update(ref(database, `adminSettings/banners/${banner.id}`), { isActive: !banner.isActive });
      addAuditEntry(`تم ${banner.isActive ? 'تعطيل' : 'تفعيل'} بانر ${banner.title}`);
    } catch {}
  };

  const handleDeleteBanner = async (banner: Banner) => {
    try {
      await remove(ref(database, `adminSettings/banners/${banner.id}`));
      addAuditEntry(`تم حذف بانر ${banner.title}`);
    } catch {}
  };

  const handleUpdateBanner = async (banner: Banner) => {
    try {
      await update(ref(database, `adminSettings/banners/${banner.id}`), {
        title: banner.title,
        description: banner.description,
        imageUrl: banner.imageUrl,
        order: banner.order,
        link: banner.link,
      });
      setEditingBanner(null);
      addAuditEntry(`تم تعديل بانر ${banner.title}`);
    } catch {}
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setNewBanner(prev => ({ ...prev, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // Exchange rates handling
  const handleSaveExchangeRates = () => {
    try {
      set(ref(database, 'adminSettings/exchangeRates'), adminExchangeRates);
      setRatesSaved(true);
      setTimeout(() => setRatesSaved(false), 3000);
      addAuditEntry('تم تحديث أسعار الصرف والعمولة');
    } catch {}
  };

  // Social links handler
  const handleSaveSocialLinks = () => {
    try {
      set(ref(database, 'adminSettings/socialLinks'), socialLinks);
      setSocialLinksSaved(true);
      setTimeout(() => setSocialLinksSaved(false), 3000);
      addAuditEntry('تم تحديث روابط التواصل الاجتماعي');
    } catch {}
  };

  // Gift code handler
  const generateGiftCodeString = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 8 + Math.floor(Math.random() * 5); // 8-12 characters
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleAddGiftCode = async () => {
    if (newGiftCode.amount <= 0) return;
    const id = 'gc-' + Date.now();
    const code = generateGiftCodeString();
    const giftCode: GiftCodeData = {
      id, code, amount: newGiftCode.amount, currency: newGiftCode.currency,
      maxUses: newGiftCode.maxUses, usedCount: 0,
      expiresAt: newGiftCode.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true, createdAt: new Date().toISOString(), createdById: user?.id || 'admin',
    };
    try {
      await set(ref(database, `giftCodes/${id}`), giftCode);
      setNewGiftCode({ amount: 0, currency: 'YER', maxUses: 1, expiresAt: '' });
      setShowAddGiftCode(false);
      addAuditEntry(`تم إنشاء كود هدية ${code} بقيمة ${giftCode.amount} ${currencySymbols[giftCode.currency]}`);
    } catch {}
  };

  const handleToggleGiftCode = async (gc: GiftCodeData) => {
    try {
      await update(ref(database, `giftCodes/${gc.id}`), { isActive: !gc.isActive });
      addAuditEntry(`تم ${gc.isActive ? 'تعطيل' : 'تفعيل'} كود الهدية ${gc.code}`);
    } catch {}
  };

  const handleDeleteGiftCode = async (gc: GiftCodeData) => {
    try {
      await remove(ref(database, `giftCodes/${gc.id}`));
      addAuditEntry(`تم حذف كود الهدية ${gc.code}`);
    } catch {}
  };

  // Legal content handler
  const handleSaveLegalContent = () => {
    try {
      set(ref(database, 'adminSettings/legalContent'), legalContent);
      setLegalContentSaved(true);
      setTimeout(() => setLegalContentSaved(false), 3000);
      addAuditEntry('تم تحديث محتوى التطبيق القانوني');
    } catch {}
  };

  // Settings handlers
  const handleSaveRates = () => {
    setExchangeRates(exchangeRatesForm);
    try { set(ref(database, 'settings/exchangeRates'), exchangeRatesForm); } catch {}
    addAuditEntry('تم تحديث أسعار الصرف');
  };

  const handleSendBulkNotif = async () => {
    if (!bulkNotif.title || !bulkNotif.body) return;
    try {
      for (const u of firebaseUsers) {
        const notifId = generateReference();
        await set(ref(database, `notifications/${u.id}/${notifId}`), {
          id: notifId, title: bulkNotif.title, body: bulkNotif.body,
          type: 'info', isRead: false, createdAt: new Date().toISOString(),
        });
      }
      setBulkNotif({ title: '', body: '' });
      addAuditEntry(`تم إرسال إشعار جماعي: ${bulkNotif.title}`);
    } catch {}
  };

  const maxRevenue = Math.max(...revenueChart.map(d => d.amount), 1);

  const tabs: { id: AdminTab; label: string; icon: typeof BarChart3; badge?: number }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'orders', label: 'طلبات الشحن', icon: ShoppingBag, badge: pendingOrders.length },
    { id: 'users', label: 'المستخدمون', icon: Users, badge: firebaseUsers.length },
    { id: 'deposit', label: 'الإيداع', icon: ArrowDownCircle, badge: depositRequests.filter(d => d.status === 'pending').length },
    { id: 'withdraw', label: 'السحب', icon: ArrowUpCircle, badge: withdrawRequests.filter(w => w.status === 'pending').length },
    { id: 'kyc', label: 'التحقق', icon: ShieldCheck, badge: kycUsers.length },
    { id: 'banks', label: 'البنوك', icon: Building2 },
    { id: 'exchangeRates', label: 'أسعار الصرف', icon: RefreshCw },
    { id: 'instantRecharge', label: 'الشحن الفوري', icon: Smartphone },
    { id: 'entertainment', label: 'المنتجات الترفيهية', icon: Gamepad2 },
    { id: 'providers', label: 'المزودون', icon: Server },
    { id: 'codes', label: 'أكواد الخصم', icon: Tag },
    { id: 'giftCodes', label: 'أكواد الهدايا', icon: Gift },
    { id: 'banners', label: 'البانرات', icon: ImagePlus },
    { id: 'socialLinks', label: 'روابط التواصل', icon: Link },
    { id: 'legalContent', label: 'المحتوى', icon: BookOpen },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'قيد الانتظار' },
    completed: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'مكتمل' },
    cancelled: { bg: 'rgba(92,26,27,0.15)', color: '#5C1A1B', label: 'ملغى' },
    approved: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'مقبول' },
    rejected: { bg: 'rgba(92,26,27,0.15)', color: '#5C1A1B', label: 'مرفوض' },
    open: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: 'مفتوح' },
  };

  const kycStatusStyle: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'معلق' },
    submitted: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: 'مُقدم' },
    verified: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'موثق' },
    rejected: { bg: 'rgba(92,26,27,0.15)', color: '#5C1A1B', label: 'مرفوض' },
  };

  const categoryData = [
    { name: 'اتصالات', count: allOrders.filter(o => providers.find(p => p.id === o.providerId)?.categoryId === 'telecom').length, color: '#5C1A1B' },
    { name: 'ألعاب', count: allOrders.filter(o => providers.find(p => p.id === o.providerId)?.categoryId === 'games').length, color: '#F59E0B' },
    { name: 'إنترنت', count: allOrders.filter(o => providers.find(p => p.id === o.providerId)?.categoryId === 'internet').length, color: '#3B82F6' },
  ];
  const maxCatCount = Math.max(...categoryData.map(c => c.count), 1);

  // Helper for card styles
  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)' as const,
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
  };

  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    color: isDark ? '#FFF' : '#1a1a1a',
  };

  // Active tab label for header
  const activeTabInfo = tabs.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5', direction: 'rtl' }}>
      {/* Header */}
      <div className="animated-gradient relative overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(145deg, #1A1A1A 0%, #2A0A0A 50%, #0F0F0F 100%)' }}>
        <div className="absolute inset-0 glass-dark opacity-30" />
        <div className="relative px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveScreen('account')} className="w-10 h-10 rounded-xl glass flex items-center justify-center">
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-lg font-bold">لوحة التحكم</h1>
              <p className="text-white/40 text-[10px]">إدارة الحبيلين اونلاين - {activeTabInfo?.label}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-red" style={{ background: 'rgba(92,26,27,0.2)' }}>
              <ShieldCheck size={20} strokeWidth={1.5} color="#5C1A1B" />
            </div>
          </div>
        </div>
      </div>

      {/* Main layout: content + right sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pb-8 px-4 pt-3" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <AnimatePresence mode="wait">

            {/* === OVERVIEW === */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'إجمالي الطلبات', value: statsData.totalOrders, icon: ShoppingBag, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
                    { label: 'قيد الانتظار', value: statsData.pendingOrders, icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', glow: true },
                    { label: 'مكتملة', value: statsData.completedOrders, icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
                    { label: 'الإيرادات (ر.ي)', value: statsData.revenueYER, icon: DollarSign, color: '#5C1A1B', bg: 'rgba(92,26,27,0.12)' },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        className={`rounded-2xl p-4 ${stat.glow ? 'glow-red' : ''}`}
                        style={cardStyle}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                            <Icon size={20} strokeWidth={1.5} color={stat.color} />
                          </div>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(stat.value)}</p>
                        <p className="text-xs mt-0.5" style={{ color: isDark ? '#777' : '#999' }}>{stat.label}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Revenue Chart */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإيرادات - آخر 7 أيام</h3>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {revenueChart.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div initial={{ height: 0 }} animate={{ height: `${Math.max((d.amount / maxRevenue) * 100, 4)}%` }} transition={{ delay: i * 0.05, duration: 0.5 }}
                          className="w-full rounded-t-lg min-h-[4px]" style={{ background: 'linear-gradient(to top, #5C1A1B, #FF4444)' }} />
                        <span className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Orders by Category */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <PieChart size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الطلبات حسب الفئة</h3>
                  </div>
                  <div className="space-y-2">
                    {categoryData.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-3">
                        <span className="text-xs w-14" style={{ color: isDark ? '#AAA' : '#666' }}>{cat.name}</span>
                        <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(cat.count / maxCatCount) * 100}%` }} transition={{ duration: 0.8 }}
                            className="h-full rounded-lg" style={{ background: cat.color, opacity: 0.7 }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-left" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Pending Orders */}
                {pendingOrders.length > 0 && (
                  <div className="rounded-2xl p-4" style={cardStyle}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock size={14} color="#F59E0B" />
                        <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>طلبات بانتظار التنفيذ</h3>
                      </div>
                      <button onClick={() => setActiveTab('orders')} className="text-xs font-medium" style={{ color: '#5C1A1B' }}>عرض الكل</button>
                    </div>
                    <div className="space-y-2">
                      {pendingOrders.slice(0, 5).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRight: '3px solid #F59E0B' }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.packageName}</p>
                            <p className="text-[10px] truncate" style={{ color: isDark ? '#666' : '#AAA' }}>{order.userName} - {order.customerInput}</p>
                          </div>
                          <div className="flex gap-1.5 mr-2">
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleCompleteOrder(order)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                              <CheckCircle2 size={14} color="#10B981" />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleCancelOrder(order)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.15)' }}>
                              <XCircle size={14} color="#5C1A1B" />
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* === CHARGING & PRODUCT REQUESTS === */}
            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex items-center gap-2 px-1 mb-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                    <ShoppingBag size={16} color="#5C1A1B" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>طلبات الشحن والمنتجات</h3>
                    <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{allOrders.length} طلب إجمالي • {pendingOrders.length} قيد الانتظار</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={cardStyle}>
                  <Search size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="ابحث بالاسم، الرقم، الخدمة، رقم الطلب..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(['all', 'pending', 'completed', 'cancelled'] as const).map((filter) => (
                    <motion.button key={filter} whileTap={{ scale: 0.95 }} onClick={() => setOrderFilter(filter)}
                      className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
                      style={{ background: orderFilter === filter ? 'rgba(92,26,27,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', color: orderFilter === filter ? '#FFF' : isDark ? '#BBB' : '#666', border: orderFilter === filter ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      {filter === 'all' ? 'الكل' : filter === 'pending' ? 'قيد الانتظار' : filter === 'completed' ? 'مكتمل' : 'ملغى'}
                    </motion.button>
                  ))}
                </div>
                {filteredOrders.map((order) => {
                  const statusStyle = statusStyles[order.status] || statusStyles.pending;
                  const provider = providers.find(p => p.id === order.providerId);
                  return (
                    <div key={order.id} className="rounded-2xl overflow-hidden" style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
                      border: order.status === 'pending' ? '1px solid rgba(245,158,11,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                      borderRight: order.status === 'pending' ? '3px solid #F59E0B' : undefined,
                      boxShadow: order.status === 'pending' ? '0 0 15px rgba(245,158,11,0.1)' : undefined,
                    }}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {provider?.icon && provider.icon.startsWith('data:') ? (
                              <img src={provider.icon} alt={provider.name} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider?.color || '#5C1A1B'}18` }}>
                                <span className="font-bold text-xs" style={{ color: provider?.color || '#5C1A1B' }}>{(provider?.name || order.providerName)?.charAt(0)}</span>
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.packageName}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                              </div>
                              <p className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>{order.providerName}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{order.amount.toLocaleString()} {currencySymbols[order.currency]}</p>
                            <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{timeAgo(order.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mb-3 p-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                          <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>العميل</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.userName}</p></div>
                          <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                          <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>الهاتف</p><p className="text-xs font-medium" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.userPhone || order.customerInput}</p></div>
                          <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                          <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>المبلغ</p><p className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{order.amount.toLocaleString()} {currencySymbols[order.currency]}</p></div>
                          <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                          <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>النوع</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: order.executionType === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: order.executionType === 'manual' ? '#F59E0B' : '#10B981' }}>
                              {order.executionType === 'manual' ? 'يدوي' : 'تلقائي'}
                            </span>
                          </div>
                        </div>
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCompleteOrder(order)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                              <CheckCircle2 size={14} /> تم الشحن
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleCancelOrder(order)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                              <RotateCcw size={14} /> إلغاء وإعادة
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <div className="flex flex-col items-center py-8"><ShoppingBag size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات</p></div>
                )}
              </motion.div>
            )}

            {/* === USERS === */}
            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>إجمالي المستخدمين: {firebaseUsers.length}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={cardStyle}>
                  <Search size={16} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="ابحث بالاسم، البريد، الهاتف..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                </div>
                {filteredUsers.map((u) => {
                  const kyc = kycStatusStyle[u.kycStatus] || kycStatusStyle.pending;
                  return (
                    <div key={u.id} className="rounded-2xl p-4" style={cardStyle}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                            <span className="font-bold text-sm" style={{ color: '#5C1A1B' }}>{u.name?.charAt(0) || '?'}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.name || 'بدون اسم'}</p>
                            <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }} dir="ltr">{u.email}</p>
                            <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{u.phone}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#AAA' : '#888' }} dir="ltr">{u.userId}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: kyc.bg, color: kyc.color }}>{kyc.label}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-3">
                        {(['YER', 'SAR', 'USD'] as const).map(cur => (
                          <div key={cur} className="flex-1 p-2 rounded-xl text-center" style={{ background: `${currencyBadgeColors[cur]}12` }}>
                            <p className="text-[10px]" style={{ color: currencyBadgeColors[cur] }}>{currencySymbols[cur]}</p>
                            <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(u[`balance${cur}`] || 0)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleToggleBlock(u)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
                          style={{ background: u.isBlocked ? 'rgba(16,185,129,0.15)' : 'rgba(92,26,27,0.1)', color: u.isBlocked ? '#10B981' : '#5C1A1B' }}>
                          {u.isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
                          <span>{u.isBlocked ? 'إلغاء الحظر' : 'حظر'}</span>
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setBalanceAdjustUser(balanceAdjustUser === u.id ? null : u.id)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
                          style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                          <DollarSign size={12} /><span>تعديل الرصيد</span>
                        </motion.button>
                      </div>
                      <AnimatePresence>
                        {balanceAdjustUser === u.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                              <select value={balanceAction} onChange={e => setBalanceAction(e.target.value as 'add' | 'subtract')} className="px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle}>
                                <option value="add">إضافة</option><option value="subtract">خصم</option>
                              </select>
                              <input type="number" placeholder="المبلغ" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} dir="ltr" />
                              <select value={balanceCurrency} onChange={e => setBalanceCurrency(e.target.value as 'YER' | 'SAR' | 'USD')} className="px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle}>
                                <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                              </select>
                              <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleBalanceAdjust(u)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#5C1A1B' }}>تطبيق</motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="flex flex-col items-center py-8"><Users size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا يوجد مستخدمون</p></div>
                )}
              </motion.div>
            )}

            {/* === DEPOSIT === */}
            {activeTab === 'deposit' && (
              <motion.div key="deposit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                    <button key={f} onClick={() => setDepositFilter(f)} className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
                      style={{ background: depositFilter === f ? 'rgba(92,26,27,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', color: depositFilter === f ? '#FFF' : isDark ? '#BBB' : '#666', border: depositFilter === f ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      {f === 'pending' ? 'قيد الانتظار' : f === 'approved' ? 'مقبول' : f === 'rejected' ? 'مرفوض' : 'الكل'}
                    </button>
                  ))}
                </div>
                {depositRequests.filter(d => depositFilter === 'all' || d.status === depositFilter).map((dep) => {
                  const s = statusStyles[dep.status] || statusStyles.pending;
                  return (
                    <div key={dep.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: dep.status === 'pending' ? '3px solid #F59E0B' : cardStyle.border as string }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{dep.userName}</p>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{dep.method === 'bank_transfer' ? 'تحويل بنكي' : dep.method === 'cash' ? 'نقدي' : 'بطاقة'} - {timeAgo(dep.createdAt)}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{dep.amount.toLocaleString()} {currencySymbols[dep.currency]}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                        </div>
                      </div>
                      {dep.receiptImage && (
                        <button onClick={() => setViewReceipt(dep.receiptImage)} className="flex items-center gap-1 mb-2 px-2 py-1 rounded-lg text-[10px]" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                          <ImageIcon size={10} /> عرض الإيصال
                        </button>
                      )}
                      {dep.status === 'pending' && (
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleApproveDeposit(dep)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                            <CheckCircle2 size={14} /> قبول
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleRejectDeposit(dep)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                            <XCircle size={14} /> رفض
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {depositRequests.filter(d => depositFilter === 'all' || d.status === depositFilter).length === 0 && (
                  <div className="flex flex-col items-center py-8"><ArrowDownCircle size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات إيداع</p></div>
                )}
              </motion.div>
            )}

            {/* === WITHDRAW === */}
            {activeTab === 'withdraw' && (
              <motion.div key="withdraw" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
                    <button key={f} onClick={() => setWithdrawFilter(f)} className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
                      style={{ background: withdrawFilter === f ? 'rgba(92,26,27,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', color: withdrawFilter === f ? '#FFF' : isDark ? '#BBB' : '#666', border: withdrawFilter === f ? '1px solid rgba(92,26,27,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      {f === 'pending' ? 'قيد الانتظار' : f === 'approved' ? 'مقبول' : f === 'rejected' ? 'مرفوض' : 'الكل'}
                    </button>
                  ))}
                </div>
                {withdrawRequests.filter(w => withdrawFilter === 'all' || w.status === withdrawFilter).map((w) => {
                  const s = statusStyles[w.status] || statusStyles.pending;
                  return (
                    <div key={w.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: w.status === 'pending' ? '3px solid #F59E0B' : cardStyle.border as string }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{w.userName}</p>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{w.method === 'bank_transfer' ? 'تحويل بنكي' : 'نقدي'} - {timeAgo(w.createdAt)}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold" style={{ color: '#5C1A1B' }}>{w.amount.toLocaleString()} {currencySymbols[w.currency]}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                        </div>
                      </div>
                      {w.bankDetails && (
                        <div className="p-2 rounded-lg mb-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>تفاصيل البنك</p>
                          <p className="text-xs" style={{ color: isDark ? '#CCC' : '#333' }}>{w.bankDetails}</p>
                        </div>
                      )}
                      {w.status === 'pending' && (
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleApproveWithdraw(w)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                            <CheckCircle2 size={14} /> قبول
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleRejectWithdraw(w)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                            <XCircle size={14} /> رفض
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {withdrawRequests.filter(w => withdrawFilter === 'all' || w.status === withdrawFilter).length === 0 && (
                  <div className="flex flex-col items-center py-8"><ArrowUpCircle size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات سحب</p></div>
                )}
              </motion.div>
            )}

            {/* === KYC === */}
            {activeTab === 'kyc' && (
              <motion.div key="kyc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck size={16} color="#3B82F6" />
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>طلبات التحقق: {kycUsers.length}</span>
                </div>
                {kycUsers.map((u) => (
                  <div key={u.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: '3px solid #3B82F6' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <UserCheck size={18} color="#3B82F6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.name}</p>
                        <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>معرف: {u.userId}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {u.cardType && <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>نوع الوثيقة</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.cardType}</p></div>}
                      {u.cardNumber && <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>رقم الوثيقة</p><p className="text-xs font-medium" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.cardNumber}</p></div>}
                      {u.governorate && <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>المحافظة</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.governorate}</p></div>}
                    </div>
                    <div className="flex gap-2 mb-3">
                      {u.idPhotoUrl && <button onClick={() => setViewKycPhoto({ type: 'id', url: u.idPhotoUrl! })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><ImageIcon size={12} /> صورة الوثيقة</button>}
                      {u.selfieUrl && <button onClick={() => setViewKycPhoto({ type: 'selfie', url: u.selfieUrl! })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}><ImageIcon size={12} /> الصورة الشخصية</button>}
                    </div>
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleApproveKyc(u)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                        <BadgeCheck size={14} /> توثيق
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleRejectKyc(u)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                        <UserX size={14} /> رفض
                      </motion.button>
                    </div>
                    <div className="mt-2">
                      <input type="text" placeholder="سبب الرفض (اختياري)" value={kycRejectReason} onChange={e => setKycRejectReason(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', color: isDark ? '#FFF' : '#1a1a1a' }} />
                    </div>
                  </div>
                ))}
                {kycUsers.length === 0 && (
                  <div className="flex flex-col items-center py-8"><ShieldCheck size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات تحقق</p></div>
                )}
              </motion.div>
            )}

            {/* === BANKS === */}
            {activeTab === 'banks' && (
              <motion.div key="banks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowAddBank(!showAddBank); setEditingBank(null); }}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>إضافة بنك جديد</span>
                </motion.button>

                <AnimatePresence>
                  {showAddBank && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <input type="text" placeholder="اسم البنك" value={newBank.bankName} onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <input type="text" placeholder="اسم صاحب الحساب" value={newBank.accountHolderName} onChange={(e) => setNewBank({ ...newBank, accountHolderName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <input type="text" placeholder="رقم الحساب" value={newBank.accountNumber} onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                      <div className="flex items-center gap-3">
                        <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
                        <input type="color" value={newBank.color} onChange={(e) => setNewBank({ ...newBank, color: e.target.value })} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddBank} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة البنك</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {banks.map((bank) => (
                  <div key={bank.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: `3px solid ${bank.color}` }}>
                    {editingBank === bank.id ? (
                      <div className="space-y-3">
                        <input type="text" value={bank.bankName} onChange={(e) => setBanks(banks.map(b => b.id === bank.id ? { ...b, bankName: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="اسم البنك" />
                        <input type="text" value={bank.accountHolderName} onChange={(e) => setBanks(banks.map(b => b.id === bank.id ? { ...b, accountHolderName: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="اسم صاحب الحساب" />
                        <input type="text" value={bank.accountNumber} onChange={(e) => setBanks(banks.map(b => b.id === bank.id ? { ...b, accountNumber: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="رقم الحساب" dir="ltr" />
                        <div className="flex items-center gap-3">
                          <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
                          <input type="color" value={bank.color} onChange={(e) => setBanks(banks.map(b => b.id === bank.id ? { ...b, color: e.target.value } : b))} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
                        </div>
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleUpdateBank(bank)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1" style={{ background: '#10B981' }}>
                            <Save size={14} /> حفظ
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingBank(null)} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                            <X size={14} /> إلغاء
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${bank.color}18` }}>
                              <Building2 size={20} color={bank.color} />
                            </div>
                            <div>
                              <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{bank.bankName}</p>
                              <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{bank.accountHolderName}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${bank.isActive ? '' : ''}`} style={{ background: bank.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(92,26,27,0.15)', color: bank.isActive ? '#10B981' : '#5C1A1B' }}>
                            {bank.isActive ? 'مفعّل' : 'معطّل'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>رقم الحساب</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-mono font-medium" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{bank.accountNumber}</p>
                            <button onClick={() => { navigator.clipboard.writeText(bank.accountNumber); }} className="text-[10px]" style={{ color: '#3B82F6' }}><Copy size={10} /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingBank(bank.id)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                            <Edit3 size={12} /> تعديل
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleToggleBank(bank)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: bank.isActive ? 'rgba(92,26,27,0.1)' : 'rgba(16,185,129,0.15)', color: bank.isActive ? '#5C1A1B' : '#10B981' }}>
                            {bank.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            <span>{bank.isActive ? 'تعطيل' : 'تفعيل'}</span>
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDeleteBank(bank)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                            <Trash2 size={12} /> حذف
                          </motion.button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {banks.length === 0 && !showAddBank && (
                  <div className="flex flex-col items-center py-8"><Building2 size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد بنوك مضافة</p><p className="text-xs mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>أضف بنوك لتظهر للمستخدمين في شاشة الإيداع</p></div>
                )}
              </motion.div>
            )}

            {/* === EXCHANGE RATES === */}
            {activeTab === 'exchangeRates' && (
              <motion.div key="exchangeRates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Rates form */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-4">
                    <RefreshCw size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أسعار الصرف</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { key: 'YERtoSAR' as const, label: 'ريال يمني إلى ريال سعودي', from: 'YER', to: 'SAR' },
                      { key: 'YERtoUSD' as const, label: 'ريال يمني إلى دولار', from: 'YER', to: 'USD' },
                      { key: 'SARtoYER' as const, label: 'ريال سعودي إلى ريال يمني', from: 'SAR', to: 'YER' },
                      { key: 'SARtoUSD' as const, label: 'ريال سعودي إلى دولار', from: 'SAR', to: 'USD' },
                      { key: 'USDtoYER' as const, label: 'دولار إلى ريال يمني', from: 'USD', to: 'YER' },
                      { key: 'USDtoSAR' as const, label: 'دولار إلى ريال سعودي', from: 'USD', to: 'SAR' },
                    ].map((rate) => (
                      <div key={rate.key} className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors[rate.from]}15`, color: currencyBadgeColors[rate.from] }}>{currencySymbols[rate.from]}</span>
                          <ArrowLeftRight size={10} color={isDark ? '#666' : '#AAA'} />
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors[rate.to]}15`, color: currencyBadgeColors[rate.to] }}>{currencySymbols[rate.to]}</span>
                        </div>
                        <input type="number" step="0.0001" value={adminExchangeRates[rate.key]} onChange={e => setAdminExchangeRates({ ...adminExchangeRates, [rate.key]: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commission */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Percent size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>نسبة العمولة على التحويلات</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.1" value={adminExchangeRates.commission} onChange={e => setAdminExchangeRates({ ...adminExchangeRates, commission: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                    <span className="text-sm font-bold" style={{ color: isDark ? '#AAA' : '#888' }}>%</span>
                  </div>
                </div>

                {/* Save button */}
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveExchangeRates}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                  style={{ background: '#5C1A1B' }}>
                  {ratesSaved ? <><CheckCircle2 size={18} /> تم الحفظ</> : <><Save size={18} /> حفظ أسعار الصرف والعمولة</>}
                </motion.button>

                {/* Live Preview */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معاينة مباشرة</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { amount: 1000, from: 'YER', to: 'SAR', rate: adminExchangeRates.YERtoSAR },
                      { amount: 1000, from: 'YER', to: 'USD', rate: adminExchangeRates.YERtoUSD },
                      { amount: 100, from: 'SAR', to: 'YER', rate: adminExchangeRates.SARtoYER },
                      { amount: 100, from: 'USD', to: 'YER', rate: adminExchangeRates.USDtoYER },
                    ].map((preview, i) => {
                      const result = preview.amount * preview.rate;
                      const commission = result * (adminExchangeRates.commission / 100);
                      const afterCommission = result - commission;
                      return (
                        <div key={i} className="p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(preview.amount)} {currencySymbols[preview.from as keyof typeof currencySymbols]}</span>
                            <ArrowLeftRight size={12} color={isDark ? '#666' : '#AAA'} />
                            <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{formatNumber(Math.round(afterCommission * 100) / 100)} {currencySymbols[preview.to as keyof typeof currencySymbols]}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px]" style={{ color: isDark ? '#555' : '#AAA' }}>السعر: {preview.rate}</span>
                            <span className="text-[9px]" style={{ color: isDark ? '#555' : '#AAA' }}>العمولة ({adminExchangeRates.commission}%): -{formatNumber(Math.round(commission * 100) / 100)} {currencySymbols[preview.to as keyof typeof currencySymbols]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* === INSTANT RECHARGE === */}
            {activeTab === 'instantRecharge' && (
              <motion.div key="instantRecharge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddProduct(!showAddProduct)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>إضافة منتج جديد</span>
                </motion.button>
                <AnimatePresence>
                  {showAddProduct && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <select value={newProduct.providerId} onChange={(e) => setNewProduct({ ...newProduct, providerId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="">اختر المزود</option>
                        {providers.filter(p => p.categoryId === 'telecom' || p.categoryId === 'internet').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <div className="flex gap-2">
                        <input type="number" placeholder="السعر" value={newProduct.price || ''} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <select value={newProduct.currency} onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                        </select>
                      </div>
                      <select value={newProduct.executionType} onChange={(e) => setNewProduct({ ...newProduct, executionType: e.target.value as 'manual' | 'auto' })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="manual">تنفيذ يدوي</option><option value="auto">تنفيذ تلقائي</option>
                      </select>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddProduct} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة المنتج</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={cardStyle}>
                  <Search size={16} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="بحث في المنتجات..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                </div>
                {providers.filter(p => p.categoryId === 'telecom' || p.categoryId === 'internet').map((provider) => {
                  const providerProducts = packages.filter(p => p.providerId === provider.id && (!productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())));
                  const providerSubs = instantSubsections.filter(s => s.providerId === provider.id);
                  return (
                    <div key={provider.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider.color}18` }}>
                          {provider.icon && provider.icon.startsWith('data:') ? (
                            <img src={provider.icon} alt={provider.name} className="w-6 h-6 rounded object-cover" />
                          ) : <span className="font-bold text-xs" style={{ color: provider.color }}>{provider.name.charAt(0)}</span>}
                        </div>
                        <span className="text-sm font-bold flex-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{provider.name}</span>
                        <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{providerProducts.length} منتج</span>
                        <button onClick={() => setShowAddInstantSub(showAddInstantSub === provider.id ? null : provider.id)} className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Add sub-section form */}
                      <AnimatePresence>
                        {showAddInstantSub === provider.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 py-3 space-y-2 overflow-hidden" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)' }}>
                            <div className="flex items-center gap-2">
                              <input type="text" placeholder="اسم القسم الفرعي" value={newInstantSub.name} onChange={(e) => setNewInstantSub({ ...newInstantSub, name: e.target.value })} className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" style={inputStyle} />
                              <input type="file" id={`instant-icon-${provider.id}`} accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => setNewInstantSub({ ...newInstantSub, icon: reader.result as string });
                                reader.readAsDataURL(file);
                              }} />
                              <button onClick={() => document.getElementById(`instant-icon-${provider.id}`)?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                                <ImagePlus size={12} color="#8B5CF6" />
                              </button>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                                if (!newInstantSub.name) return;
                                const subId = 'isub-' + Date.now();
                                const existingSubs = instantSubsections.filter(s => s.providerId === provider.id);
                                const sub: AdminSubSection = { id: subId, providerId: provider.id, parentId: provider.id, name: newInstantSub.name, icon: newInstantSub.icon, isActive: true, order: existingSubs.length };
                                try { await set(ref(database, `adminSettings/instantRechargeSubsections/${subId}`), sub); } catch {}
                                setNewInstantSub({ name: '', icon: '' });
                                setShowAddInstantSub(null);
                                addAuditEntry(`تم إضافة قسم فرعي ${sub.name} لمزود ${provider.name}`);
                              }} className="px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>إضافة</motion.button>
                            </div>
                            {newInstantSub.icon && <img src={newInstantSub.icon} alt="icon" className="w-6 h-6 rounded object-cover" />}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Sub-sections */}
                      {providerSubs.map((sub) => {
                        const subProducts = packages.filter(p => p.providerId === provider.id && (p as any).subSectionId === sub.id);
                        const isSubSelected = selectedInstantSub === sub.id;
                        return (
                          <div key={sub.id}>
                            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.03)', background: isSubSelected ? (isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.03)') : 'transparent' }}>
                              <button onClick={() => setSelectedInstantSub(isSubSelected ? null : sub.id)} className="flex items-center gap-2 flex-1">
                                {sub.icon && sub.icon.startsWith('data:') ? (
                                  <img src={sub.icon} alt={sub.name} className="w-5 h-5 rounded object-cover" />
                                ) : (
                                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                                    <Layers size={10} color="#8B5CF6" />
                                  </div>
                                )}
                                <span className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#555' }}>{sub.name}</span>
                                <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>({subProducts.length})</span>
                              </button>
                              <div className="flex items-center gap-1">
                                <button onClick={() => { try { update(ref(database, `adminSettings/instantRechargeSubsections/${sub.id}`), { isActive: !sub.isActive }); } catch {} }}>
                                  {sub.isActive ? <ToggleRight size={16} color="#10B981" /> : <ToggleLeft size={16} color={isDark ? '#444' : '#CCC'} />}
                                </button>
                                <button onClick={() => { try { remove(ref(database, `adminSettings/instantRechargeSubsections/${sub.id}`)); } catch {} }}>
                                  <Trash2 size={10} color="#5C1A1B" />
                                </button>
                              </div>
                            </div>

                            {/* Sub-section products */}
                            {isSubSelected && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 py-2" style={{ background: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-medium" style={{ color: isDark ? '#888' : '#AAA' }}>منتجات: {sub.name}</span>
                                  <button onClick={() => {
                                    setNewProduct({ ...newProduct, providerId: provider.id });
                                    setShowAddProduct(true);
                                  }} className="px-2 py-1 rounded text-[9px] font-medium" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                                    <Plus size={10} /> منتج
                                  </button>
                                </div>
                                {subProducts.map((product) => (
                                  <div key={product.id} className="flex items-center justify-between py-1.5" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.02)' : '1px solid rgba(0,0,0,0.02)' }}>
                                    <div>
                                      <p className="text-[11px] font-medium" style={{ color: isDark ? '#DDD' : '#444' }}>{product.name}</p>
                                      <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>{product.price.toLocaleString()} {currencySymbols[product.currency]}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => handleToggleProduct(product.id)}>
                                        {product.isActive ? <ToggleRight size={16} color="#10B981" /> : <ToggleLeft size={16} color={isDark ? '#444' : '#CCC'} />}
                                      </button>
                                      <button onClick={() => handleDeleteProduct(product.id)}><Trash2 size={10} color="#5C1A1B" /></button>
                                    </div>
                                  </div>
                                ))}
                                {subProducts.length === 0 && <p className="text-[10px] text-center py-2" style={{ color: isDark ? '#555' : '#BBB' }}>لا توجد منتجات</p>}
                              </motion.div>
                            )}
                          </div>
                        );
                      })}

                      {/* Direct provider products (no subsection) */}
                      {providerProducts.filter(p => !(p as any).subSectionId).map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: index < providerProducts.filter(p => !(p as any).subSectionId).length - 1 ? (isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)') : 'none' }}>
                          <div>
                            {editingProduct === product.id ? (
                              <div className="flex items-center gap-2">
                                <input type="text" value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} className="px-2 py-1 rounded text-xs outline-none w-28" style={inputStyle} />
                                <input type="number" value={editProductData.price} onChange={e => setEditProductData({ ...editProductData, price: parseFloat(e.target.value) || 0 })} className="px-2 py-1 rounded text-xs outline-none w-16" style={inputStyle} dir="ltr" />
                                <button onClick={() => { updatePackage(product.id, { name: editProductData.name, price: editProductData.price }); try { update(ref(database, `packages/${product.id}`), { name: editProductData.name, price: editProductData.price }); } catch {} setEditingProduct(null); }}><Save size={14} color="#10B981" /></button>
                                <button onClick={() => setEditingProduct(null)}><X size={14} color="#5C1A1B" /></button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{product.price.toLocaleString()} {currencySymbols[product.currency]}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: product.executionType === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: product.executionType === 'manual' ? '#F59E0B' : '#10B981' }}>
                                    {product.executionType === 'manual' ? 'يدوي' : 'تلقائي'}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          {editingProduct !== product.id && (
                            <div className="flex items-center gap-3">
                              <button onClick={() => { setEditingProduct(product.id); setEditProductData({ name: product.name, price: product.price }); }}><Edit3 size={12} color={isDark ? '#888' : '#AAA'} /></button>
                              <button onClick={() => handleToggleProduct(product.id)}>
                                {product.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                              </button>
                              <button onClick={() => handleDeleteProduct(product.id)}><Trash2 size={14} color="#5C1A1B" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {providers.filter(p => p.categoryId === 'telecom' || p.categoryId === 'internet').length === 0 && (
                  <div className="flex flex-col items-center py-8"><Smartphone size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد مزودات شحن فوري</p></div>
                )}
              </motion.div>
            )}

            {/* === ENTERTAINMENT SERVICES === */}
            {activeTab === 'entertainment' && (
              <motion.div key="entertainment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex items-center gap-2 px-1 mb-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                    <Gamepad2 size={16} color="#8B5CF6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>المنتجات الترفيهية</h3>
                    <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>إدارة الألعاب والبطاقات الرقمية والاشتراكات</p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddProduct(!showAddProduct)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>إضافة منتج جديد</span>
                </motion.button>
                <AnimatePresence>
                  {showAddProduct && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <select value={newProduct.providerId} onChange={(e) => setNewProduct({ ...newProduct, providerId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="">اختر المزود</option>
                        {providers.filter(p => p.categoryId === 'wallet-services' || p.categoryId === 'entertainment' || p.categoryId === 'cards').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <div className="flex gap-2">
                        <input type="number" placeholder="السعر" value={newProduct.price || ''} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <select value={newProduct.currency} onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                        </select>
                      </div>
                      <select value={newProduct.executionType} onChange={(e) => setNewProduct({ ...newProduct, executionType: e.target.value as 'manual' | 'auto' })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="manual">تنفيذ يدوي</option><option value="auto">تنفيذ تلقائي</option>
                      </select>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddProduct} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة المنتج</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={cardStyle}>
                  <Search size={16} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="بحث في المنتجات..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                </div>

                {/* Entertainment Sub-sections: ألعاب, بطاقات رقمية, اشتراكات */}
                {['games', 'cards', 'subscriptions'].map((subType) => {
                  const subTypeLabel = subType === 'games' ? 'ألعاب' : subType === 'cards' ? 'بطاقات رقمية' : 'اشتراكات';
                  const subProviders = providers.filter(p => {
                    if (subType === 'games') return p.categoryId === 'wallet-services' || p.categoryId === 'entertainment';
                    if (subType === 'cards') return p.categoryId === 'wallet-services' || p.categoryId === 'cards';
                    return false;
                  });
                  const subsForType = entertainmentSubs.filter(s => s.parentId === subType);
                  const subTypeProducts = packages.filter(p => subProviders.some(sp => sp.id === p.providerId) && (!productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())));

                  if (subProviders.length === 0 && subsForType.length === 0) return null;

                  return (
                    <div key={subType} className="rounded-2xl overflow-hidden" style={cardStyle}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: subType === 'games' ? 'rgba(245,158,11,0.12)' : subType === 'cards' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)' }}>
                          {subType === 'games' ? <Gamepad2 size={16} color="#F59E0B" /> : subType === 'cards' ? <CreditCard size={16} color="#3B82F6" /> : <Wifi size={16} color="#10B981" />}
                        </div>
                        <span className="text-sm font-bold flex-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{subTypeLabel}</span>
                        <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{subTypeProducts.length} منتج</span>
                        <button onClick={() => setShowAddEntertainSub(showAddEntertainSub === subType ? null : subType)} className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Add sub-section form */}
                      <AnimatePresence>
                        {showAddEntertainSub === subType && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 py-3 space-y-2 overflow-hidden" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)' }}>
                            <div className="flex items-center gap-2">
                              <input type="text" placeholder="اسم القسم الفرعي" value={newEntertainSub.name} onChange={(e) => setNewEntertainSub({ ...newEntertainSub, name: e.target.value })} className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" style={inputStyle} />
                              <input type="file" id={`entertain-icon-${subType}`} accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = () => setNewEntertainSub({ ...newEntertainSub, icon: reader.result as string });
                                reader.readAsDataURL(file);
                              }} />
                              <button onClick={() => document.getElementById(`entertain-icon-${subType}`)?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                                <ImagePlus size={12} color="#8B5CF6" />
                              </button>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                                if (!newEntertainSub.name) return;
                                const subId = 'esub-' + Date.now();
                                const existingSubs = entertainmentSubs.filter(s => s.parentId === subType);
                                const sub: AdminSubSection = { id: subId, providerId: subType, parentId: subType, name: newEntertainSub.name, icon: newEntertainSub.icon, isActive: true, order: existingSubs.length };
                                try { await set(ref(database, `adminSettings/entertainmentSubsections/${subId}`), sub); } catch {}
                                setNewEntertainSub({ name: '', icon: '' });
                                setShowAddEntertainSub(null);
                                addAuditEntry(`تم إضافة قسم فرعي ترفيهي ${sub.name}`);
                              }} className="px-3 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#8B5CF6' }}>إضافة</motion.button>
                            </div>
                            {newEntertainSub.icon && <img src={newEntertainSub.icon} alt="icon" className="w-6 h-6 rounded object-cover" />}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Sub-sections under this type */}
                      {subsForType.map((sub) => {
                        const isSubSelected = selectedEntertainSub === sub.id;
                        return (
                          <div key={sub.id}>
                            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.03)', background: isSubSelected ? (isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.03)') : 'transparent' }}>
                              <button onClick={() => setSelectedEntertainSub(isSubSelected ? null : sub.id)} className="flex items-center gap-2 flex-1">
                                {sub.icon && sub.icon.startsWith('data:') ? (
                                  <img src={sub.icon} alt={sub.name} className="w-5 h-5 rounded object-cover" />
                                ) : (
                                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                                    <Layers size={10} color="#8B5CF6" />
                                  </div>
                                )}
                                <span className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#555' }}>{sub.name}</span>
                              </button>
                              <div className="flex items-center gap-1">
                                <button onClick={() => { try { update(ref(database, `adminSettings/entertainmentSubsections/${sub.id}`), { isActive: !sub.isActive }); } catch {} }}>
                                  {sub.isActive ? <ToggleRight size={16} color="#10B981" /> : <ToggleLeft size={16} color={isDark ? '#444' : '#CCC'} />}
                                </button>
                                <button onClick={() => { try { remove(ref(database, `adminSettings/entertainmentSubsections/${sub.id}`)); } catch {} }}>
                                  <Trash2 size={10} color="#5C1A1B" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Providers and their products under this type */}
                      {subProviders.map((provider) => {
                        const providerProducts = packages.filter(p => p.providerId === provider.id && (!productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())));
                        if (providerProducts.length === 0) return null;
                        return (
                          <div key={provider.id}>
                            <div className="px-4 py-2 flex items-center gap-2" style={{ background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)' }}>
                              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${provider.color}18` }}>
                                {provider.icon && provider.icon.startsWith('data:') ? (
                                  <img src={provider.icon} alt={provider.name} className="w-4 h-4 rounded object-cover" />
                                ) : <span className="font-bold text-[9px]" style={{ color: provider.color }}>{provider.name.charAt(0)}</span>}
                              </div>
                              <span className="text-xs font-medium" style={{ color: isDark ? '#DDD' : '#444' }}>{provider.name}</span>
                              <span className="text-[9px] mr-auto" style={{ color: isDark ? '#555' : '#BBB' }}>{providerProducts.length}</span>
                            </div>
                            {providerProducts.map((product, index) => (
                              <div key={product.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: index < providerProducts.length - 1 ? (isDark ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.03)') : 'none' }}>
                                <div>
                                  {editingProduct === product.id ? (
                                    <div className="flex items-center gap-2">
                                      <input type="text" value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} className="px-2 py-1 rounded text-xs outline-none w-28" style={inputStyle} />
                                      <input type="number" value={editProductData.price} onChange={e => setEditProductData({ ...editProductData, price: parseFloat(e.target.value) || 0 })} className="px-2 py-1 rounded text-xs outline-none w-16" style={inputStyle} dir="ltr" />
                                      <button onClick={() => { updatePackage(product.id, { name: editProductData.name, price: editProductData.price }); try { update(ref(database, `packages/${product.id}`), { name: editProductData.name, price: editProductData.price }); } catch {} setEditingProduct(null); }}><Save size={14} color="#10B981" /></button>
                                      <button onClick={() => setEditingProduct(null)}><X size={14} color="#5C1A1B" /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{product.name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{product.price.toLocaleString()} {currencySymbols[product.currency]}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: product.executionType === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: product.executionType === 'manual' ? '#F59E0B' : '#10B981' }}>
                                          {product.executionType === 'manual' ? 'يدوي' : 'تلقائي'}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {editingProduct !== product.id && (
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => { setEditingProduct(product.id); setEditProductData({ name: product.name, price: product.price }); }}><Edit3 size={12} color={isDark ? '#888' : '#AAA'} /></button>
                                    <button onClick={() => handleToggleProduct(product.id)}>
                                      {product.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                                    </button>
                                    <button onClick={() => handleDeleteProduct(product.id)}><Trash2 size={14} color="#5C1A1B" /></button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {providers.filter(p => p.categoryId === 'wallet-services' || p.categoryId === 'entertainment' || p.categoryId === 'cards').length === 0 && (
                  <div className="flex flex-col items-center py-8"><Gamepad2 size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد خدمات ترفيهية</p></div>
                )}
              </motion.div>
            )}

            {/* === PROVIDERS === */}
            {activeTab === 'providers' && (
              <motion.div key="providers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddProvider(!showAddProvider)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>إضافة مزود خدمة</span>
                </motion.button>
                <AnimatePresence>
                  {showAddProvider && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <input type="text" placeholder="اسم المزود" value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <select value={newProvider.categoryId} onChange={(e) => setNewProvider({ ...newProvider, categoryId: e.target.value, inputLabel: e.target.value === 'telecom' ? 'رقم الهاتف' : 'Player ID', inputType: e.target.value === 'telecom' ? 'phone' : 'text', inputPrefix: e.target.value === 'telecom' ? '+967' : '' })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="telecom">الاتصالات والإنترنت</option><option value="games">الألعاب والبطاقات</option>
                      </select>
                      <div className="flex gap-2">
                        <input type="text" placeholder="تسمية الحقل" value={newProvider.inputLabel} onChange={(e) => setNewProvider({ ...newProvider, inputLabel: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                        <input type="text" placeholder="بادئة" value={newProvider.inputPrefix} onChange={(e) => setNewProvider({ ...newProvider, inputPrefix: e.target.value })} className="w-20 px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={inputStyle} dir="ltr" />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
                        <input type="color" value={newProvider.color} onChange={(e) => setNewProvider({ ...newProvider, color: e.target.value })} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
                      </div>
                      <div>
                        <input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => handleIconUpload(e, 'provider')} className="hidden" />
                        <div className="flex items-center gap-3">
                          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ ...inputStyle, color: isDark ? '#AAA' : '#888' }}>
                            <ImagePlus size={14} /><span>رفع أيقونة</span>
                          </button>
                          {newProvider.icon && <img src={newProvider.icon} alt="icon" className="w-8 h-8 rounded-lg object-cover" />}
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddProvider} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة المزود</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {providers.map((provider) => (
                  <div key={provider.id} className="rounded-2xl p-4" style={cardStyle}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {provider.icon && provider.icon.startsWith('data:') ? (
                          <img src={provider.icon} alt={provider.name} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${provider.color}18` }}>
                            <span className="font-bold" style={{ color: provider.color }}>{provider.name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{provider.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${provider.color}15`, color: provider.color }}>{provider.categoryId === 'telecom' ? 'اتصالات' : 'ألعاب'}</span>
                            <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{provider.inputLabel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="file" id={`icon-${provider.id}`} accept="image/*" className="hidden" onChange={(e) => { setEditingProvider(provider.id); handleIconUpload(e, 'editProvider'); }} />
                        <button onClick={() => document.getElementById(`icon-${provider.id}`)?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider.color}12` }}>
                          <ImagePlus size={12} color={provider.color} />
                        </button>
                        <button onClick={() => handleToggleProvider(provider.id)}>
                          {provider.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                        </button>
                        <button onClick={() => handleDeleteProvider(provider.id)}><Trash2 size={14} color="#5C1A1B" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* === PROMO CODES === */}
            {activeTab === 'codes' && (
              <motion.div key="codes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddCode(!showAddCode)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>إضافة كود خصم</span>
                </motion.button>
                <AnimatePresence>
                  {showAddCode && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <input type="text" placeholder="الكود" value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} dir="ltr" />
                      <div className="flex gap-2">
                        <input type="number" placeholder="الخصم" value={newCode.discount || ''} onChange={e => setNewCode({ ...newCode, discount: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <select value={newCode.type} onChange={e => setNewCode({ ...newCode, type: e.target.value as 'percentage' | 'fixed' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="percentage">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <select value={newCode.currency} onChange={e => setNewCode({ ...newCode, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                        </select>
                        <input type="number" placeholder="الحد الأقصى" value={newCode.maxUses || ''} onChange={e => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 100 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                      </div>
                      <input type="date" value={newCode.expiresAt} onChange={e => setNewCode({ ...newCode, expiresAt: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddPromoCode} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة الكود</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {promoCodes.map((c) => (
                  <div key={c.id} className="rounded-2xl p-4" style={cardStyle}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-mono font-bold" style={{ color: '#5C1A1B' }} dir="ltr">{c.code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>
                          {c.type === 'percentage' ? `${c.discount}%` : `${c.discount} ${currencySymbols[c.currency]}`}
                        </span>
                      </div>
                      <button onClick={() => handleTogglePromoCode(c)}>
                        {c.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{c.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</span>
                      <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>استخدام: {c.usedCount}/{c.maxUses}</span>
                      {c.expiresAt && <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>ينتهي: {new Date(c.expiresAt).toLocaleDateString('ar-SA')}</span>}
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%`, background: '#5C1A1B' }} />
                    </div>
                  </div>
                ))}
                {promoCodes.length === 0 && (
                  <div className="flex flex-col items-center py-8"><Tag size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد أكواد خصم</p></div>
                )}
              </motion.div>
            )}

            {/* === GIFT CODES === */}
            {activeTab === 'giftCodes' && (
              <motion.div key="giftCodes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddGiftCode(!showAddGiftCode)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>إنشاء كود هدية جديد</span>
                </motion.button>
                <AnimatePresence>
                  {showAddGiftCode && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <div className="flex items-center gap-2 mb-1">
                        <Gift size={16} color="#5C1A1B" />
                        <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إنشاء كود هدية</h3>
                      </div>
                      <div className="flex gap-2">
                        <input type="number" placeholder="قيمة الهدية" value={newGiftCode.amount || ''} onChange={(e) => setNewGiftCode({ ...newGiftCode, amount: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <select value={newGiftCode.currency} onChange={(e) => setNewGiftCode({ ...newGiftCode, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-medium block mb-1" style={{ color: isDark ? '#AAA' : '#888' }}>الحد الأقصى للاستخدام</label>
                          <input type="number" placeholder="الحد الأقصى" value={newGiftCode.maxUses || ''} onChange={(e) => setNewGiftCode({ ...newGiftCode, maxUses: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-medium block mb-1" style={{ color: isDark ? '#AAA' : '#888' }}>تاريخ الانتهاء</label>
                          <input type="date" value={newGiftCode.expiresAt} onChange={(e) => setNewGiftCode({ ...newGiftCode, expiresAt: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddGiftCode} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إنشاء الكود</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gift codes stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl p-3 text-center" style={cardStyle}>
                    <p className="text-lg font-bold" style={{ color: '#5C1A1B' }}>{giftCodes.length}</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>إجمالي الأكواد</p>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={cardStyle}>
                    <p className="text-lg font-bold" style={{ color: '#10B981' }}>{giftCodes.filter(gc => gc.isActive).length}</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>نشطة</p>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={cardStyle}>
                    <p className="text-lg font-bold" style={{ color: '#F59E0B' }}>{giftCodes.filter(gc => gc.usedCount > 0).length}</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>مستخدمة</p>
                  </div>
                </div>

                {giftCodes.map((gc) => {
                  const isExpired = gc.expiresAt && new Date(gc.expiresAt) < new Date();
                  const isFullyUsed = gc.usedCount >= gc.maxUses;
                  return (
                    <div key={gc.id} className="rounded-2xl overflow-hidden" style={{
                      ...cardStyle,
                      border: isExpired ? '1px solid rgba(245,158,11,0.3)' : isFullyUsed ? '1px solid rgba(92,26,27,0.2)' : cardStyle.border,
                    }}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                              <Gift size={18} color="#8B5CF6" />
                            </div>
                            <div>
                              <p className="text-sm font-mono font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{gc.code}</p>
                              <p className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{gc.amount.toLocaleString()} {currencySymbols[gc.currency]}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { navigator.clipboard?.writeText(gc.code); }}>
                              <Copy size={14} color={isDark ? '#888' : '#AAA'} />
                            </button>
                            <button onClick={() => handleToggleGiftCode(gc)}>
                              {gc.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                            </button>
                            <button onClick={() => handleDeleteGiftCode(gc)}>
                              <Trash2 size={14} color="#5C1A1B" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{
                            background: isExpired ? 'rgba(245,158,11,0.15)' : isFullyUsed ? 'rgba(92,26,27,0.15)' : gc.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(102,102,102,0.15)',
                            color: isExpired ? '#F59E0B' : isFullyUsed ? '#5C1A1B' : gc.isActive ? '#10B981' : '#666',
                          }}>
                            {isExpired ? 'منتهي الصلاحية' : isFullyUsed ? 'تم الاستخدام بالكامل' : gc.isActive ? 'نشط' : 'معطل'}
                          </span>
                          <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>استخدام: {gc.usedCount}/{gc.maxUses}</span>
                          {gc.expiresAt && <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>ينتهي: {new Date(gc.expiresAt).toLocaleDateString('ar-SA')}</span>}
                        </div>
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((gc.usedCount / gc.maxUses) * 100, 100)}%`, background: gc.usedCount >= gc.maxUses ? '#5C1A1B' : '#8B5CF6' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {giftCodes.length === 0 && (
                  <div className="flex flex-col items-center py-8"><Gift size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد أكواد هدايا</p><p className="text-xs mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>أنشئ كود هدية جديد ليستفيد المستخدمون</p></div>
                )}
              </motion.div>
            )}

            {/* === BANNERS === */}
            {activeTab === 'banners' && (
              <motion.div key="banners" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddBanner(!showAddBanner)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>إضافة بانر</span>
                </motion.button>

                <AnimatePresence>
                  {showAddBanner && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <input type="text" placeholder="عنوان البانر" value={newBanner.title} onChange={e => setNewBanner({ ...newBanner, title: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <textarea placeholder="وصف البانر" value={newBanner.description} onChange={e => setNewBanner({ ...newBanner, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                      <div className="space-y-2">
                        <input type="text" placeholder="رابط الصورة (URL)" value={newBanner.imageUrl.startsWith('data:') ? 'تم رفع صورة' : newBanner.imageUrl} onChange={e => setNewBanner({ ...newBanner, imageUrl: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => bannerFileInputRef.current?.click()}
                            className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#CCC' : '#666' }}>
                            <ImageIcon size={14} /><span>رفع صورة</span>
                          </motion.button>
                          <input ref={bannerFileInputRef} type="file" accept="image/*" onChange={handleBannerImageUpload} className="hidden" />
                        </div>
                        {newBanner.imageUrl && (
                          <div className="w-full h-32 rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                            <img src={newBanner.imageUrl} alt="preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <input type="text" placeholder="رابط عند الضغط (اختياري)" value={newBanner.link} onChange={e => setNewBanner({ ...newBanner, link: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>ترتيب العرض</span>
                        <input type="number" value={newBanner.order || ''} onChange={e => setNewBanner({ ...newBanner, order: parseInt(e.target.value) || 0 })} className="w-20 px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={inputStyle} dir="ltr" />
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddBanner} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة البانر</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {banners.map((banner) => (
                  <div key={banner.id} className="rounded-2xl p-4" style={cardStyle}>
                    {editingBanner === banner.id ? (
                      <div className="space-y-3">
                        <input type="text" value={banner.title} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, title: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                        <textarea value={banner.description} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, description: e.target.value } : b))} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                        <input type="text" placeholder="رابط الصورة" value={banner.imageUrl.startsWith('data:') ? 'تم رفع صورة' : banner.imageUrl} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, imageUrl: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <input type="text" placeholder="رابط عند الضغط" value={banner.link || ''} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, link: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>ترتيب</span>
                          <input type="number" value={banner.order} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, order: parseInt(e.target.value) || 0 } : b))} className="w-20 px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={inputStyle} dir="ltr" />
                        </div>
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleUpdateBanner(banner)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5" style={{ background: '#10B981' }}>
                            <Save size={14} /><span>حفظ</span>
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingBanner(null)} className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#CCC' : '#666' }}>
                            <X size={14} /><span>إلغاء</span>
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          {banner.imageUrl ? (
                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                              <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                              <ImageIcon size={24} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{banner.title}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>#{banner.order}</span>
                            </div>
                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: isDark ? '#888' : '#999' }}>{banner.description}</p>
                            {banner.link && (
                              <p className="text-[10px] mt-1 truncate" style={{ color: isDark ? '#555' : '#BBB' }} dir="ltr">{banner.link}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleBanner(banner)}>
                              {banner.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                            </button>
                            <span className="text-[10px]" style={{ color: banner.isActive ? '#10B981' : isDark ? '#555' : '#CCC' }}>
                              {banner.isActive ? 'مفعّل' : 'معطّل'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => setEditingBanner(banner.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                              <Edit3 size={14} color={isDark ? '#AAA' : '#888'} />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.85 }} onClick={() => handleDeleteBanner(banner)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                              <Trash2 size={14} color="#5C1A1B" />
                            </motion.button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {banners.length === 0 && (
                  <div className="flex flex-col items-center py-8"><ImagePlus size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد بانرات</p></div>
                )}
              </motion.div>
            )}

            {/* === SOCIAL LINKS === */}
            {activeTab === 'socialLinks' && (
              <motion.div key="socialLinks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-2">
                    <Link size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>روابط التواصل الاجتماعي</h3>
                  </div>
                  <p className="text-xs mb-2" style={{ color: isDark ? '#888' : '#AAA' }}>ادارة روابط التواصل التي تظهر للمستخدمين في التطبيق</p>

                  {[
                    { key: 'whatsapp' as const, label: 'واتساب', placeholder: 'رقم الواتساب (مثال: 967XXXXXXXX)', icon: Phone },
                    { key: 'facebook' as const, label: 'فيسبوك', placeholder: 'رابط صفحة فيسبوك', icon: Globe },
                    { key: 'twitter' as const, label: 'تويتر / X', placeholder: 'رابط حساب تويتر', icon: Globe },
                    { key: 'instagram' as const, label: 'انستغرام', placeholder: 'رابط حساب انستغرام', icon: Globe },
                    { key: 'telegram' as const, label: 'تيليغرام', placeholder: 'رابط قناة أو مجموعة تيليغرام', icon: Globe },
                    { key: 'youtube' as const, label: 'يوتيوب', placeholder: 'رابط قناة يوتيوب', icon: Globe },
                    { key: 'supportEmail' as const, label: 'البريد الإلكتروني للدعم', placeholder: 'بريد الدعم الفني (مثال: support@example.com)', icon: Mail },
                    { key: 'contactAdmin' as const, label: 'رابط تواصل مع الادمن', placeholder: 'رابط زر تواصل مع الادمن', icon: ExternalLink },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(92,26,27,0.08)' }}>
                          <Icon size={16} color="#5C1A1B" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-medium block mb-0.5" style={{ color: isDark ? '#AAA' : '#888' }}>{field.label}</label>
                          <input type="text" placeholder={field.placeholder} value={socialLinks[field.key]} onChange={(e) => setSocialLinks({ ...socialLinks, [field.key]: e.target.value })} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Contact Admin Message */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>رسالة تواصل مع الأدمن</h3>
                  </div>
                  <p className="text-xs mb-2" style={{ color: isDark ? '#888' : '#AAA' }}>رسالة تظهر للمستخدمين في صفحة الدعم عند الضغط على تواصل مع الأدمن</p>
                  <textarea
                    placeholder="اكتب رسالة تواصل مع الأدمن هنا..."
                    value={socialLinks.contactAdminMessage}
                    onChange={(e) => setSocialLinks({ ...socialLinks, contactAdminMessage: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={inputStyle}
                  />
                </div>

                {/* Preview */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معاينة الروابط</h3>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(socialLinks).map(([key, value]) => {
                      if (!value) return null;
                      const labels: Record<string, string> = {
                        whatsapp: 'واتساب', facebook: 'فيسبوك', twitter: 'تويتر',
                        instagram: 'انستغرام', telegram: 'تيليغرام', youtube: 'يوتيوب',
                        supportEmail: 'البريد الإلكتروني', contactAdmin: 'تواصل مع الادمن',
                        contactAdminMessage: 'رسالة الأدمن',
                      };
                      return (
                        <div key={key} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                          <span className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#555' }}>{labels[key] || key}</span>
                          <span className="text-[10px] truncate max-w-[180px]" style={{ color: '#5C1A1B' }} dir="ltr">{value}</span>
                        </div>
                      );
                    })}
                    {Object.values(socialLinks).every(v => !v) && (
                      <p className="text-xs text-center py-4" style={{ color: isDark ? '#555' : '#BBB' }}>لم يتم اضافة روابط بعد</p>
                    )}
                  </div>
                </div>

                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveSocialLinks}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                  style={{ background: socialLinksSaved ? '#10B981' : '#5C1A1B' }}>
                  {socialLinksSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  <span>{socialLinksSaved ? 'تم الحفظ' : 'حفظ روابط التواصل'}</span>
                </motion.button>
              </motion.div>
            )}

            {/* === LEGAL CONTENT === */}
            {activeTab === 'legalContent' && (
              <motion.div key="legalContent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* FAQ */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <HelpCircle size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الاسئلة الشائعة</h3>
                  </div>
                  <textarea placeholder="اكتب محتوى الاسئلة الشائعة هنا..." value={legalContent.faq} onChange={(e) => setLegalContent({ ...legalContent, faq: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>

                {/* Privacy Policy */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <Scale size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سياسة الخصوصية</h3>
                  </div>
                  <textarea placeholder="اكتب محتوى سياسة الخصوصية هنا..." value={legalContent.privacyPolicy} onChange={(e) => setLegalContent({ ...legalContent, privacyPolicy: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>

                {/* About App */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>حول التطبيق</h3>
                  </div>
                  <textarea placeholder="اكتب محتوى حول التطبيق هنا..." value={legalContent.aboutApp} onChange={(e) => setLegalContent({ ...legalContent, aboutApp: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>

                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveLegalContent}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                  style={{ background: legalContentSaved ? '#10B981' : '#5C1A1B' }}>
                  {legalContentSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  <span>{legalContentSaved ? 'تم الحفظ' : 'حفظ المحتوى'}</span>
                </motion.button>
              </motion.div>
            )}

            {/* === SETTINGS === */}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Admin info */}
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center glow-red" style={{ background: 'rgba(92,26,27,0.15)' }}>
                      <ShieldCheck size={24} strokeWidth={1.5} color="#5C1A1B" />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>مدير النظام</p>
                      <p className="text-xs" style={{ color: isDark ? '#666' : '#AAA' }} dir="ltr">{user?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
                      <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>الدور</span>
                      <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>مدير</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>رقم الحساب</span>
                      <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{user?.userId}</span>
                    </div>
                  </div>
                </div>

                {/* System info */}
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معلومات النظام</h3>
                  <div className="space-y-3">
                    {[
                      { icon: AlertTriangle, label: 'وضع التنفيذ', value: 'يدوي', color: '#F59E0B' },
                      { icon: Clock, label: 'متوسط وقت التنفيذ', value: '5-30 دقيقة', color: '#3B82F6' },
                      { icon: ShieldCheck, label: 'التحقق المطلوب', value: 'مفعّل', color: '#10B981' },
                      { icon: Bell, label: 'الإشعارات', value: 'مفعّلة', color: '#EC4899' },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <Icon size={14} strokeWidth={1.5} color={item.color} />
                            <span className="text-xs" style={{ color: isDark ? '#CCC' : '#666' }}>{item.label}</span>
                          </div>
                          <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{item.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Exchange rates */}
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Globe size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أسعار الصرف (قديم)</h3>
                  </div>
                  <div className="space-y-2">
                    {(['YER', 'SAR', 'USD'] as const).map(cur => (
                      <div key={cur} className="flex items-center gap-3">
                        <span className="text-xs w-16 font-bold" style={{ color: currencyBadgeColors[cur] }}>{currencyNames[cur]}</span>
                        <input type="number" step="0.0001" value={exchangeRatesForm[cur]} onChange={e => setExchangeRatesForm({ ...exchangeRatesForm, [cur]: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" style={inputStyle} dir="ltr" />
                      </div>
                    ))}
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveRates} className="w-full py-2.5 rounded-xl text-xs font-bold text-white mt-2" style={{ background: '#5C1A1B' }}>حفظ أسعار الصرف</motion.button>
                  </div>
                </div>

                {/* Commission rates */}
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Percent size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>نسبة العمولة</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                    <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>%</span>
                  </div>
                </div>

                {/* Bulk notification */}
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Send size={16} color="#5C1A1B" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إرسال إشعار جماعي</h3>
                  </div>
                  <div className="space-y-2">
                    <input type="text" placeholder="عنوان الإشعار" value={bulkNotif.title} onChange={e => setBulkNotif({ ...bulkNotif, title: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                    <textarea placeholder="نص الإشعار" value={bulkNotif.body} onChange={e => setBulkNotif({ ...bulkNotif, body: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSendBulkNotif} className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#5C1A1B' }}>إرسال لجميع المستخدمين ({firebaseUsers.length})</motion.button>
                  </div>
                </div>

                {/* Audit log */}
                {auditLog.length > 0 && (
                  <div className="rounded-2xl p-5" style={cardStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={16} color="#5C1A1B" />
                      <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سجل العمليات</h3>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                      {auditLog.map((entry, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#5C1A1B' }} />
                          <div className="flex-1">
                            <p className="text-xs" style={{ color: isDark ? '#CCC' : '#333' }}>{entry.action}</p>
                            <p className="text-[10px]" style={{ color: isDark ? '#555' : '#AAA' }}>{timeAgo(entry.time)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar Navigation */}
        <div className="flex-shrink-0 w-[70px] border-l flex flex-col" style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(20px)',
          borderLeft: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          maxHeight: 'calc(100vh - 80px)',
        }}>
          <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex flex-col items-center justify-center py-2.5 px-1 relative transition-all"
                  style={{
                    background: isActive ? 'rgba(92,26,27,0.15)' : 'transparent',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute right-0 top-1 bottom-1 w-[3px] rounded-l-full"
                      style={{ background: '#5C1A1B' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <Icon size={20} strokeWidth={1.5} color={isActive ? '#5C1A1B' : isDark ? '#666' : '#AAA'} />
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1.5 -left-1.5 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold px-0.5"
                        style={{ background: '#5C1A1B', color: '#FFF' }}>
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] mt-1 leading-tight text-center font-medium" style={{ color: isActive ? '#5C1A1B' : isDark ? '#666' : '#AAA' }}>
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {viewReceipt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="w-full max-w-sm">
              <div className="rounded-2xl overflow-hidden" style={{ background: isDark ? '#1A1A1A' : '#FFF' }}>
                <div className="flex items-center justify-between p-4" style={{ borderBottom: isDark ? '1px solid #333' : '1px solid #EEE' }}>
                  <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الإيصال</span>
                  <button onClick={() => setViewReceipt(null)}><X size={18} color={isDark ? '#FFF' : '#333'} /></button>
                </div>
                <div className="p-4">
                  {viewReceipt.startsWith('data:') ? (
                    <img src={viewReceipt} alt="receipt" className="w-full rounded-xl" />
                  ) : (
                    <img src={viewReceipt} alt="receipt" className="w-full rounded-xl" crossOrigin="anonymous" />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KYC Photo Modal */}
      <AnimatePresence>
        {viewKycPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="w-full max-w-sm">
              <div className="rounded-2xl overflow-hidden" style={{ background: isDark ? '#1A1A1A' : '#FFF' }}>
                <div className="flex items-center justify-between p-4" style={{ borderBottom: isDark ? '1px solid #333' : '1px solid #EEE' }}>
                  <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{viewKycPhoto.type === 'id' ? 'صورة الوثيقة' : 'الصورة الشخصية'}</span>
                  <button onClick={() => setViewKycPhoto(null)}><X size={18} color={isDark ? '#FFF' : '#333'} /></button>
                </div>
                <div className="p-4">
                  {viewKycPhoto.url.startsWith('data:') ? (
                    <img src={viewKycPhoto.url} alt="kyc" className="w-full rounded-xl" />
                  ) : (
                    <img src={viewKycPhoto.url} alt="kyc" className="w-full rounded-xl" crossOrigin="anonymous" />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
