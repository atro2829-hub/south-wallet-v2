'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BarChart3, Users, Layers, FolderTree, Settings, ShieldCheck,
  Clock, Database, Plus, Trash2, ToggleLeft, ToggleRight, Save, Search,
  Upload, Download, Eye, EyeOff, Edit3, X, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Crown, Server, Smartphone, Gamepad2, Wifi,
  CreditCard, DollarSign, Activity, FileText, Filter, Ban, UserCheck,
  UserX, ChevronLeft, ImagePlus, Package, Zap, Globe, Mail, Hash,
  Key, HardDrive, Cloud, Archive, Copy, Unlock, Link, ExternalLink,
  BookOpen, Scale, HelpCircle, Phone, ShoppingBag, BadgeCheck, Lock,
  Gift, Tag, GripVertical, ArrowUpDown, Percent
} from 'lucide-react';
import { useAppStore, type Order, type ServiceProvider, type ProductPackage } from '@/lib/store';
import { currencySymbols, currencyBadgeColors, formatNumber, generateReference, compressBase64Image, timeAgo } from '@/lib/utils';
import { ref, set, get, update, remove, push, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { supabaseService } from '@/lib/supabase';
import { getAllCategories, deleteCategory, toggleCategory, saveCategory, getAllSubSections, deleteSubSection, toggleSubSection, saveSubSection, type DynamicCategory, type DynamicSubSection } from '@/lib/categories';
import { LOGO_BASE64 } from '@/lib/logo';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type OwnerTab = 'overview' | 'sections' | 'subsections' | 'sectionVisibility' | 'entertainment' | 'giftCodes' | 'orders' | 'kyc' | 'socialLinks' | 'legalContent' | 'projectConfig' | 'adminMgmt' | 'activityLog' | 'backup' | 'appIcon';

interface OwnerSection {
  id: string;
  name: string;
  icon: string;
  isVisible: boolean;
  order: number;
  type: string;
}

interface OwnerSubSection {
  id: string;
  parentId: string;
  name: string;
  icon: string;
  isVisible: boolean;
  order: number;
}

interface ProjectConfig {
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseDatabaseUrl: string;
  firebaseStorageBucket: string;
  firebaseAppId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  packageName: string;
  appName: string;
}

interface ActivityLogEntry {
  id: string;
  type: 'user' | 'admin' | 'system';
  action: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isBlocked: boolean;
  createdAt?: string;
}

interface BackupEntry {
  id: string;
  timestamp: string;
  size: string;
  type: 'auto' | 'manual';
}

const defaultProjectConfig: ProjectConfig = {
  firebaseApiKey: '',
  firebaseProjectId: '',
  firebaseDatabaseUrl: '',
  firebaseStorageBucket: '',
  firebaseAppId: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  packageName: 'com.example.wallet',
  appName: '\u0645\u062D\u0641\u0638\u0629 \u0627\u0644\u062C\u0646\u0648\u0628',
};

// Sortable section item component
function SortableSectionItem({ section, isDark, onToggle, onDelete, onIconChange, onEditName }: {
  section: OwnerSection;
  isDark: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onIconChange: (id: string, icon: string) => void;
  onEditName: (id: string, name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const textColor = isDark ? '#FFF' : '#1a1a1a';
  const subTextColor = isDark ? '#888' : '#AAA';

  const handleSaveName = () => {
    onEditName(section.id, editName);
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="rounded-2xl p-4" style={{ background: cardBg, border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1" style={{ color: subTextColor }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="4" cy="4" r="1.5" /><circle cx="12" cy="4" r="1.5" />
              <circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="8" r="1.5" />
              <circle cx="4" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" />
            </svg>
          </div>

          {/* Icon */}
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => onIconChange(section.id, reader.result as string);
            reader.readAsDataURL(file);
          }} />
          <button onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
            {section.icon && section.icon.startsWith('data:') ? (
              <img src={section.icon} alt={section.name} className="w-7 h-7 rounded object-cover" />
            ) : (
              <Layers size={18} color="#8B5CF6" />
            )}
          </button>

          {/* Name + Order */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 px-2 py-1 rounded text-sm outline-none" style={{ background: inputBg, color: textColor }} />
                <button onClick={handleSaveName}><Save size={14} color="#8B5CF6" /></button>
                <button onClick={() => setEditing(false)}><X size={14} color="#5C1A1B" /></button>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold truncate" style={{ color: textColor }}>{section.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>#{section.order}</span>
                  <span className="text-[10px]" style={{ color: section.isVisible ? '#10B981' : '#5C1A1B' }}>{section.isVisible ? '\u0638\u0627\u0647\u0631' : '\u0645\u062E\u0641\u064A'}</span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)}><Edit3 size={14} color={subTextColor} /></button>
            <button onClick={() => onToggle(section.id)}>
              {section.isVisible ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
            </button>
            <button onClick={() => onDelete(section.id)}><Trash2 size={14} color="#5C1A1B" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

// SubSection item component (extracted to avoid hooks-in-callback issues)
function SubSectionItem({ sub, isDark, onToggle, onDelete, onIconChange, onEditName, inputStyle, cardStyle }: {
  sub: OwnerSubSection;
  isDark: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onIconChange: (id: string, icon: string) => void;
  onEditName: (id: string, name: string) => void;
  inputStyle: React.CSSProperties;
  cardStyle: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sub.name);
  const subIconRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <div className="flex items-center gap-3">
        <input type="file" ref={subIconRef} accept="image/*" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onloadend = () => onIconChange(sub.id, reader.result as string);
          reader.readAsDataURL(file);
        }} />
        <button onClick={() => subIconRef.current?.click()} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
          {sub.icon && sub.icon.startsWith('data:') ? (
            <img src={sub.icon} alt={sub.name} className="w-7 h-7 rounded object-cover" />
          ) : (
            <FolderTree size={18} color="#8B5CF6" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 px-2 py-1 rounded text-sm outline-none" style={inputStyle} />
              <button onClick={() => { onEditName(sub.id, editName); setEditing(false); }}><Save size={14} color="#8B5CF6" /></button>
              <button onClick={() => setEditing(false)}><X size={14} color="#5C1A1B" /></button>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{sub.name}</p>
              <span className="text-[10px]" style={{ color: sub.isVisible ? '#10B981' : '#5C1A1B' }}>{sub.isVisible ? '\u0638\u0627\u0647\u0631' : '\u0645\u062E\u0641\u064A'}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)}><Edit3 size={14} color={isDark ? '#888' : '#AAA'} /></button>
          <button onClick={() => onToggle(sub.id)}>
            {sub.isVisible ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
          </button>
          <button onClick={() => onDelete(sub.id)}><Trash2 size={14} color="#5C1A1B" /></button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerScreen() {
  // Helper: map section type to screenType for categories.ts
  const mapTypeToScreenType = (type: string): string => {
    const mapping: Record<string, string> = {
      'telecom': 'telecom', 'games': 'api-games', 'api': 'api-products',
      'exchange': 'exchange', 'wallet': 'usdt', 'escrow': 'escrow',
      'investment': 'investment', 'manual': 'manual', 'link': 'link',
    };
    return mapping[type] || 'manual';
  };

  // Helper: map screenType back to section type
  const mapScreenTypeToType = (screenType?: string): string => {
    const mapping: Record<string, string> = {
      'telecom': 'telecom', 'api-games': 'games', 'api-products': 'api',
      'exchange': 'exchange', 'usdt': 'wallet', 'escrow': 'escrow',
      'investment': 'investment', 'manual': 'manual', 'link': 'link',
    };
    return mapping[screenType || 'manual'] || 'manual';
  };

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, user } = useAppStore();

  const [activeTab, setActiveTab] = useState<OwnerTab>('overview');

  // Sections state
  const [sections, setSections] = useState<OwnerSection[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionType, setNewSectionType] = useState('telecom');
  const [newSectionIcon, setNewSectionIcon] = useState('');
  const sectionFileRef = useRef<HTMLInputElement>(null);

  // Subsections state
  const [subsections, setSubsections] = useState<OwnerSubSection[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [showAddSubsection, setShowAddSubsection] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('');
  const subFileRef = useRef<HTMLInputElement>(null);

  // Project config state
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>(defaultProjectConfig);
  const [configSaved, setConfigSaved] = useState(false);

  // Admin management state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  // Activity log state
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'user' | 'admin' | 'system'>('all');

  // Backup state
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // App Icon state
  const [appIcon, setAppIcon] = useState<string>('');
  const [splashIcon, setSplashIcon] = useState<string>('');
  const [iconSaving, setIconSaving] = useState(false);
  const appIconFileRef = useRef<HTMLInputElement>(null);
  const splashIconFileRef = useRef<HTMLInputElement>(null);

  // Visibility Management state (enhanced)
  const [visibilitySections, setVisibilitySections] = useState<Record<string, boolean>>({
    telecom: true, entertainment: true, cards: true, transfer: true,
    recharge: true, electricity: true, government: true, internet: true,
    crypto: true, 'crypto-invest': true, 'currency-exchange': true,
    'digital-wallet': true,
  });
  const [visibilityProviders, setVisibilityProviders] = useState<Record<string, boolean>>({});
  const [visibilityFeatures, setVisibilityFeatures] = useState<Record<string, boolean>>({
    transfer: true, exchange: true, investment: true, savings: true,
    qrPayment: true, requestMoney: true, splitBill: true,
  });
  const [visibilitySaved, setVisibilitySaved] = useState(false);
  const [visibilityTab, setVisibilityTab] = useState<'sections' | 'providers' | 'features'>('sections');

  // Gift Codes state
  const [giftCodes, setGiftCodes] = useState<any[]>([]);
  const [showAddGiftCode, setShowAddGiftCode] = useState(false);
  const [newGiftCode, setNewGiftCode] = useState({ code: '', discount: 0, type: 'percentage' as 'percentage' | 'fixed', currency: 'YER' as 'YER' | 'SAR' | 'USD', maxUses: 100, expiresAt: '' });
  const [bulkCodeCount, setBulkCodeCount] = useState(1);
  const [showBulkCodes, setShowBulkCodes] = useState(false);
  const [giftCodeSearch, setGiftCodeSearch] = useState('');

  // Entertainment management (enhanced)
  const [showAddOwnerProvider, setShowAddOwnerProvider] = useState(false);
  const [newOwnerProvider, setNewOwnerProvider] = useState({ name: '', color: '#5C1A1B', categoryId: 'wallet-services', inputLabel: '', inputType: 'text' as 'phone' | 'text', inputPrefix: '', icon: '' });
  const [showAddOwnerPackage, setShowAddOwnerPackage] = useState(false);
  const [newOwnerPackage, setNewOwnerPackage] = useState({ name: '', price: 0, currency: 'YER' as 'YER' | 'SAR' | 'USD', providerId: '', executionType: 'manual' as 'manual' | 'auto' });
  const [editingOwnerProduct, setEditingOwnerProduct] = useState<string | null>(null);
  const [editOwnerProductData, setEditOwnerProductData] = useState({ name: '', price: 0 });
  const [ownerEntertainmentTab, setOwnerEntertainmentTab] = useState<'providers' | 'products' | 'add'>('providers');
  const [ownerProvFileRef, setOwnerProvFileRef] = useState<HTMLInputElement | null>(null);

  // Social Links state (owner can also manage)
  const [socialLinks, setSocialLinks] = useState({
    whatsapp: '', facebook: '', twitter: '', instagram: '',
    telegram: '', youtube: '', contactAdmin: '',
  });
  const [socialLinksSaved, setSocialLinksSaved] = useState(false);

  // Legal Content state (owner can also manage)
  const [legalContent, setLegalContent] = useState({
    faq: '', privacyPolicy: '', aboutApp: '',
  });
  const [legalContentSaved, setLegalContentSaved] = useState(false);

  // Orders state (owner can view/manage orders)
  const [firebaseOrders, setFirebaseOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // KYC state (owner can verify users)
  const [kycUsers, setKycUsers] = useState<{
    id: string; name: string; email: string; phone: string; userId: string;
    kycStatus: string; cardType?: string; cardNumber?: string; governorate?: string;
    idPhotoUrl?: string; selfieUrl?: string;
  }[]>([]);

  // Entertainment products state
  const [ownerProviders, setOwnerProviders] = useState<ServiceProvider[]>([]);
  const [ownerPackages, setOwnerPackages] = useState<ProductPackage[]>([]);
  const [ownerProductSearch, setOwnerProductSearch] = useState('');

  // Overview stats
  const [overviewStats, setOverviewStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    activeProviders: 0,
    systemHealth: 98,
    revenueYER: 0,
    revenueSAR: 0,
    revenueUSD: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Card/input styles
  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)' as const,
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
  };

  const inputStyle = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    color: isDark ? '#FFF' : '#1a1a1a',
  };

  // ===== Firebase Listeners =====

  // Load sections from Supabase
  useEffect(() => {
    const loadSections = async () => {
      try {
        const cats = await getAllCategories();
        const list = cats.map((c: DynamicCategory) => ({
          id: c.id,
          name: c.nameAr || c.name,
          icon: c.icon || '',
          isVisible: c.isVisible,
          order: c.order,
          type: mapScreenTypeToType(c.screenType),
        }));
        setSections(list.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Error loading sections:', error);
        setSections([]);
      }
    };
    loadSections();
  }, []);

  // Load subsections from Supabase
  useEffect(() => {
    const loadSubsections = async () => {
      try {
        const allSections = await supabaseService.getAllSections();
        const allSubs: OwnerSubSection[] = [];
        for (const sec of allSections) {
          const subs = await supabaseService.getAllSubSections(sec.id);
          for (const sub of subs) {
            allSubs.push({
              id: sub.id,
              parentId: sub.section_id,
              name: sub.name || '',
              icon: sub.icon || '',
              isVisible: sub.is_visible ?? true,
              order: sub.sort_order ?? 0,
            });
          }
        }
        setSubsections(allSubs.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error('Error loading subsections:', error);
        setSubsections([]);
      }
    };
    loadSubsections();
  }, []);

  // Listen to project config
  useEffect(() => {
    const configRef = ref(database, 'ownerSettings/projectConfig');
    const unsub = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProjectConfig({ ...defaultProjectConfig, ...data });
      }
    });
    return () => unsub();
  }, []);

  // Listen to users for admin management
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          name: val.name || '',
          email: val.email || '',
          phone: val.phone || '',
          role: val.role || 'user',
          isBlocked: val.isBlocked || false,
          createdAt: val.createdAt,
        }));
        setAllUsers(list);
        setAdminUsers(list.filter(u => u.role === 'admin' || u.role === 'owner'));
      }
    });
    return () => unsub();
  }, []);

  // Listen to activity log
  useEffect(() => {
    const logRef = ref(database, 'ownerSettings/activityLog');
    const unsub = onValue(logRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          type: val.type || 'system',
          action: val.action || '',
          userId: val.userId,
          userName: val.userName,
          timestamp: val.timestamp || new Date().toISOString(),
        }));
        setActivityLog(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100));
      } else {
        setActivityLog([]);
      }
    });
    return () => unsub();
  }, []);

  // Listen to backup history
  useEffect(() => {
    const backupRef = ref(database, 'ownerSettings/backups');
    const unsub = onValue(backupRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          timestamp: val.timestamp || '',
          size: val.size || '0 KB',
          type: val.type || 'manual',
        }));
        setBackups(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } else {
        setBackups([]);
      }
    });
    return () => unsub();
  }, []);

  // Listen to app icon settings
  useEffect(() => {
    const iconRef = ref(database, 'ownerSettings/appIcon');
    const unsub = onValue(iconRef, (snapshot) => {
      if (snapshot.exists()) {
        setAppIcon(snapshot.val());
      } else {
        setAppIcon('');
      }
    });
    return () => unsub();
  }, []);

  // Listen to splash icon settings
  useEffect(() => {
    const splashRef = ref(database, 'ownerSettings/splashIcon');
    const unsub = onValue(splashRef, (snapshot) => {
      if (snapshot.exists()) {
        setSplashIcon(snapshot.val());
      } else {
        setSplashIcon('');
      }
    });
    return () => unsub();
  }, []);

  // Listen to visibility settings from Firebase (enhanced)
  useEffect(() => {
    const visRef = ref(database, 'adminSettings/visibility');
    const unsub = onValue(visRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.sections) {
          setVisibilitySections(prev => ({ ...prev, ...data.sections }));
        }
        if (data.providers) {
          setVisibilityProviders(prev => ({ ...prev, ...data.providers }));
        }
        if (data.features) {
          setVisibilityFeatures(prev => ({ ...prev, ...data.features }));
        }
      }
    });
    return () => unsub();
  }, []);

  // Also listen to legacy sectionVisibility for backward compatibility
  useEffect(() => {
    const visRef = ref(database, 'adminSettings/sectionVisibility');
    const unsub = onValue(visRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setVisibilitySections(prev => ({ ...prev, ...data }));
      }
    });
    return () => unsub();
  }, []);

  // Listen to gift codes from Firebase
  useEffect(() => {
    const codesRef = ref(database, 'promo-codes');
    const unsub = onValue(codesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          code: val.code || '',
          discount: val.discount || 0,
          type: val.type || 'percentage',
          currency: val.currency || 'YER',
          maxUses: val.maxUses || 100,
          usedCount: val.usedCount || 0,
          expiresAt: val.expiresAt || '',
          isActive: val.isActive !== false,
          createdAt: val.createdAt || '',
        }));
        setGiftCodes(list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      } else {
        setGiftCodes([]);
      }
    });
    return () => unsub();
  }, []);

  // Listen to social links from Firebase
  useEffect(() => {
    const linksRef = ref(database, 'adminSettings/socialLinks');
    const unsub = onValue(linksRef, (snapshot) => {
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
          contactAdmin: data.contactAdmin || '',
        }));
      }
    });
    return () => unsub();
  }, []);

  // Listen to legal content from Firebase
  useEffect(() => {
    const legalRef = ref(database, 'adminSettings/legalContent');
    const unsub = onValue(legalRef, (snapshot) => {
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
    return () => unsub();
  }, []);

  // Listen to orders from Firebase
  useEffect(() => {
    const ordersRef = ref(database, 'orders');
    const unsub = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as Order[];
        setFirebaseOrders(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setFirebaseOrders([]);
      }
    });
    return () => unsub();
  }, []);

  // Listen to KYC users from Firebase
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsub = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          name: val.name || '',
          email: val.email || '',
          phone: val.phone || '',
          userId: val.userId || key,
          kycStatus: val.kycStatus || 'pending',
          cardType: val.cardType,
          cardNumber: val.cardNumber,
          governorate: val.governorate,
          idPhotoUrl: val.idPhotoUrl,
          selfieUrl: val.selfieUrl,
        }));
        setKycUsers(list.filter(u => u.kycStatus === 'submitted'));
      }
    });
    return () => unsub();
  }, []);

  // Listen to providers and packages for entertainment tab
  useEffect(() => {
    const provRef = ref(database, 'providers');
    const unsub1 = onValue(provRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          categoryId: val.categoryId || '',
          name: val.name || '',
          color: val.color || '#5C1A1B',
          icon: val.icon || '',
          isActive: val.isActive !== false,
          inputLabel: val.inputLabel || '',
          inputType: val.inputType || 'text',
          inputPrefix: val.inputPrefix || '',
        }));
        setOwnerProviders(list);
      }
    });
    const pkgRef = ref(database, 'packages');
    const unsub2 = onValue(pkgRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          providerId: val.providerId || '',
          name: val.name || '',
          price: val.price || 0,
          currency: val.currency || 'YER',
          executionType: val.executionType || 'manual',
          isActive: val.isActive !== false,
        }));
        setOwnerPackages(list);
      }
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  // Listen to overview stats
  useEffect(() => {
    const ordersRef = ref(database, 'orders');
    const unsub1 = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const ordersList = Object.values(data) as any[];
        const completed = ordersList.filter((o: any) => o.status === 'completed');
        const revYER = completed.filter((o: any) => o.currency === 'YER').reduce((s: number, o: any) => s + (o.amount || 0), 0);
        const revSAR = completed.filter((o: any) => o.currency === 'SAR').reduce((s: number, o: any) => s + (o.amount || 0), 0);
        const revUSD = completed.filter((o: any) => o.currency === 'USD').reduce((s: number, o: any) => s + (o.amount || 0), 0);
        setOverviewStats(prev => ({
          ...prev,
          totalOrders: ordersList.length,
          pendingOrders: ordersList.filter((o: any) => o.status === 'pending').length,
          revenueYER: revYER,
          revenueSAR: revSAR,
          revenueUSD: revUSD,
          totalRevenue: revYER,
        }));
      }
    });

    const usersRef = ref(database, 'users');
    const unsub2 = onValue(usersRef, (snapshot) => {
      setOverviewStats(prev => ({ ...prev, totalUsers: snapshot.exists() ? Object.keys(snapshot.val()).length : 0 }));
    });

    const providersRef = ref(database, 'providers');
    const unsub3 = onValue(providersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const active = Object.values(data).filter((p: any) => p.isActive).length;
        setOverviewStats(prev => ({ ...prev, activeProviders: active }));
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // ===== Section Handlers =====

  const handleAddSection = async () => {
    if (!newSectionName) return;
    try {
      await saveCategory({
        name: newSectionName,
        nameAr: newSectionName,
        nameEn: newSectionName,
        icon: newSectionIcon || '📋',
        order: sections.length,
        isVisible: true,
        screenType: mapTypeToScreenType(newSectionType),
      });
      setNewSectionName('');
      setNewSectionIcon('');
      setNewSectionType('telecom');
      setShowAddSection(false);
      // Reload sections
      const cats = await getAllCategories();
      const list = cats.map((c: DynamicCategory) => ({
        id: c.id, name: c.nameAr || c.name, icon: c.icon || '',
        isVisible: c.isVisible, order: c.order, type: mapScreenTypeToType(c.screenType),
      }));
      setSections(list.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error adding section:', error);
    }
  };

  const handleToggleSection = async (id: string) => {
    const section = sections.find(s => s.id === id);
    if (section) {
      try {
        await toggleCategory(id, !section.isVisible);
        setSections(prev => prev.map(s => s.id === id ? { ...s, isVisible: !s.isVisible } : s));
      } catch (error) {
        console.error('Error toggling section:', error);
      }
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      await deleteCategory(id);
      setSections(prev => prev.filter(s => s.id !== id));
      setSubsections(prev => prev.filter(s => s.parentId !== id));
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  const handleSectionIconChange = async (id: string, icon: string) => {
    try {
      const compressed = await compressBase64Image(icon);
      await supabaseService.updateSection(id, { icon: compressed });
      setSections(prev => prev.map(s => s.id === id ? { ...s, icon: compressed } : s));
    } catch (error) {
      console.error('Error updating section icon:', error);
    }
  };

  const handleSectionNameChange = async (id: string, name: string) => {
    try {
      await supabaseService.updateSection(id, { name, name_en: name });
      setSections(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    } catch (error) {
      console.error('Error updating section name:', error);
    }
  };

  const handleDragEndSections = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabaseService.updateSection(reordered[i].id, { sort_order: i });
      }
    } catch (error) {
      console.error('Error reordering sections:', error);
    }
  };

  // ===== Subsection Handlers =====

  const handleAddSubsection = async () => {
    if (!newSubName || !selectedParentId) return;
    const parentSubs = subsections.filter(s => s.parentId === selectedParentId);
    try {
      await saveSubSection({
        name: newSubName,
        nameAr: newSubName,
        nameEn: newSubName,
        sectionId: selectedParentId,
        icon: newSubIcon || '📋',
        order: parentSubs.length,
        isVisible: true,
        type: 'manual',
      });
      setNewSubName('');
      setNewSubIcon('');
      setShowAddSubsection(false);
      // Reload subsections
      const subs = await supabaseService.getAllSubSections(selectedParentId);
      const mapped = subs.map(sub => ({
        id: sub.id, parentId: sub.section_id, name: sub.name || '',
        icon: sub.icon || '', isVisible: sub.is_visible ?? true, order: sub.sort_order ?? 0,
      }));
      setSubsections(prev => {
        const filtered = prev.filter(s => s.parentId !== selectedParentId);
        return [...filtered, ...mapped].sort((a, b) => a.order - b.order);
      });
    } catch (error) {
      console.error('Error adding subsection:', error);
    }
  };

  const handleToggleSubsection = async (id: string) => {
    const sub = subsections.find(s => s.id === id);
    if (sub) {
      try {
        await toggleSubSection(id, !sub.isVisible);
        setSubsections(prev => prev.map(s => s.id === id ? { ...s, isVisible: !s.isVisible } : s));
      } catch (error) {
        console.error('Error toggling subsection:', error);
      }
    }
  };

  const handleDeleteSubsection = async (id: string) => {
    try {
      await deleteSubSection(id);
      setSubsections(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting subsection:', error);
    }
  };

  const handleSubIconChange = async (id: string, icon: string) => {
    try {
      const compressed = await compressBase64Image(icon);
      await supabaseService.updateSubSection(id, { icon: compressed });
      setSubsections(prev => prev.map(s => s.id === id ? { ...s, icon: compressed } : s));
    } catch (error) {
      console.error('Error updating sub icon:', error);
    }
  };

  const handleSubNameChange = async (id: string, name: string) => {
    try {
      await supabaseService.updateSubSection(id, { name, name_en: name });
      setSubsections(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    } catch (error) {
      console.error('Error updating sub name:', error);
    }
  };

  // ===== Project Config Handlers =====

  const handleSaveConfig = async () => {
    try {
      await set(ref(database, 'ownerSettings/projectConfig'), projectConfig);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 3000);
      // Log activity
      const logId = generateReference();
      await set(ref(database, `ownerSettings/activityLog/${logId}`), {
        id: logId, type: 'admin', action: '\u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639',
        userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
      });
    } catch {}
  };

  // ===== Admin Management Handlers =====

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      await update(ref(database, `users/${userId}`), { role: 'admin' });
      const logId = generateReference();
      await set(ref(database, `ownerSettings/activityLog/${logId}`), {
        id: logId, type: 'admin', action: `\u062A\u0645 \u062A\u0631\u0642\u064A\u0629 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0625\u0644\u0649 \u0623\u062F\u0645\u0646`,
        userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
      });
    } catch {}
  };

  const handleDemoteAdmin = async (userId: string) => {
    try {
      await update(ref(database, `users/${userId}`), { role: 'user' });
      const logId = generateReference();
      await set(ref(database, `ownerSettings/activityLog/${logId}`), {
        id: logId, type: 'admin', action: `\u062A\u0645 \u062A\u062E\u0641\u064A\u0636 \u0627\u0644\u0623\u062F\u0645\u0646 \u0625\u0644\u0649 \u0645\u0633\u062A\u062E\u062F\u0645`,
        userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
      });
    } catch {}
  };

  const handleToggleBlockAdmin = async (adminUser: AdminUser) => {
    try {
      await update(ref(database, `users/${adminUser.id}`), { isBlocked: !adminUser.isBlocked });
      const logId = generateReference();
      await set(ref(database, `ownerSettings/activityLog/${logId}`), {
        id: logId, type: 'admin', action: `${adminUser.isBlocked ? '\u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062D\u0638\u0631' : '\u062A\u0645 \u0627\u0644\u062D\u0638\u0631'} \u0639\u0644\u0649 \u0627\u0644\u0623\u062F\u0645\u0646 ${adminUser.name}`,
        userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
      });
    } catch {}
  };

  const handleAddAdminByEmail = async () => {
    if (!newAdminEmail) return;
    const matchedUser = allUsers.find(u => u.email?.toLowerCase() === newAdminEmail.toLowerCase());
    if (matchedUser) {
      await handlePromoteToAdmin(matchedUser.id);
      setNewAdminEmail('');
    }
  };

  // ===== Backup Handlers =====

  const handleExportBackup = async () => {
    setExportLoading(true);
    try {
      const snapshot = await get(ref(database, '/'));
      const data = snapshot.exists() ? snapshot.val() : {};
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log backup
      const backupId = generateReference();
      await set(ref(database, `ownerSettings/backups/${backupId}`), {
        id: backupId, timestamp: new Date().toISOString(),
        size: `${(jsonStr.length / 1024).toFixed(1)} KB`, type: 'manual',
      });
      const logId = generateReference();
      await set(ref(database, `ownerSettings/activityLog/${logId}`), {
        id: logId, type: 'system', action: '\u062A\u0645 \u062A\u0635\u062F\u064A\u0631 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629',
        userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
      });
    } catch {}
    setExportLoading(false);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Write each top-level key to Firebase
      for (const key of Object.keys(data)) {
        await set(ref(database, `/${key}`), data[key]);
      }

      const logId = generateReference();
      await set(ref(database, `ownerSettings/activityLog/${logId}`), {
        id: logId, type: 'system', action: '\u062A\u0645 \u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629',
        userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
      });

      const backupId = generateReference();
      await set(ref(database, `ownerSettings/backups/${backupId}`), {
        id: backupId, timestamp: new Date().toISOString(),
        size: `${(file.size / 1024).toFixed(1)} KB`, type: 'manual',
      });
    } catch {}
    setImportLoading(false);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  // ===== Tabs Definition =====

  const tabs: { id: OwnerTab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
    { id: 'sections', label: 'الأقسام', icon: Layers },
    { id: 'subsections', label: 'فرعية', icon: FolderTree },
    { id: 'sectionVisibility', label: 'الظهور', icon: Eye },
    { id: 'entertainment', label: 'الترفيهية', icon: Gamepad2 },
    { id: 'giftCodes', label: 'الأكواد', icon: Gift },
    { id: 'orders', label: 'الطلبات', icon: ShoppingBag },
    { id: 'kyc', label: 'التحقق', icon: ShieldCheck },
    { id: 'socialLinks', label: 'التواصل', icon: Link },
    { id: 'legalContent', label: 'المحتوى', icon: BookOpen },
    { id: 'projectConfig', label: 'المشروع', icon: Settings },
    { id: 'adminMgmt', label: 'الأدمن', icon: ShieldCheck },
    { id: 'activityLog', label: 'النشاط', icon: Clock },
    { id: 'backup', label: 'النسخ', icon: Database },
    { id: 'appIcon', label: 'أيقونة', icon: ImagePlus },
  ];

  const activeTabInfo = tabs.find(t => t.id === activeTab);

  const filteredActivity = activityLog.filter(entry => {
    if (activityFilter !== 'all' && entry.type !== activityFilter) return false;
    return true;
  });

  const filteredAdminUsers = allUsers.filter(u => {
    if (!adminSearch) return u.role === 'admin' || u.role === 'owner';
    const q = adminSearch.toLowerCase();
    return (u.role === 'admin' || u.role === 'owner') && (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5', direction: 'rtl' }}>
      {/* Header */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(145deg, #1A0A2E 0%, #2D1B4E 50%, #0F0F0F 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(139,92,246,0.3) 0%, transparent 60%)' }} />
        <div className="relative px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setActiveScreen('account')} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <ArrowLeft size={18} strokeWidth={1.5} color="#FFF" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-lg font-bold">{'\u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0627\u0644\u0643'}</h1>
              <p className="text-white/40 text-[10px]">{'\u0627\u0644\u062A\u062D\u0643\u0645 \u0627\u0644\u0643\u0627\u0645\u0644'} - {activeTabInfo?.label}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
              <Crown size={20} strokeWidth={1.5} color="#8B5CF6" />
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
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u064A\u0646', value: overviewStats.totalUsers, icon: Users, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
                    { label: '\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A (\u0631.\u064A)', value: overviewStats.revenueYER, icon: DollarSign, color: '#5C1A1B', bg: 'rgba(92,26,27,0.12)' },
                    { label: '\u0627\u0644\u0645\u0632\u0648\u062F\u0648\u0646 \u0627\u0644\u0646\u0634\u0637\u0648\u0646', value: overviewStats.activeProviders, icon: Server, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
                    { label: '\u0635\u062D\u0629 \u0627\u0644\u0646\u0638\u0627\u0645', value: overviewStats.systemHealth, icon: Activity, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
                  ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        className="rounded-2xl p-4" style={cardStyle}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                            <Icon size={20} strokeWidth={1.5} color={stat.color} />
                          </div>
                        </div>
                        <p className="text-2xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{stat.label.includes('\u0635\u062D\u0629') ? `${stat.value}%` : formatNumber(stat.value)}</p>
                        <p className="text-xs mt-0.5" style={{ color: isDark ? '#777' : '#999' }}>{stat.label}</p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Revenue Breakdown */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A'}</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: '\u0631\u064A\u0627\u0644 \u064A\u0645\u0646\u064A', value: overviewStats.revenueYER, color: '#5C1A1B' },
                      { label: '\u0631\u064A\u0627\u0644 \u0633\u0639\u0648\u062F\u064A', value: overviewStats.revenueSAR, color: '#10B981' },
                      { label: '\u062F\u0648\u0644\u0627\u0631 \u0623\u0645\u0631\u064A\u0643\u064A', value: overviewStats.revenueUSD, color: '#3B82F6' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                          <span className="text-xs" style={{ color: isDark ? '#AAA' : '#666' }}>{item.label}</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Health */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645'}</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Firebase', status: true },
                      { label: '\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A', status: true },
                      { label: '\u0627\u0644\u062A\u062E\u0632\u064A\u0646', status: true },
                      { label: '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A', status: true },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <span className="text-xs" style={{ color: isDark ? '#AAA' : '#666' }}>{item.label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: item.status ? '#10B981' : '#5C1A1B' }} />
                          <span className="text-[10px] font-medium" style={{ color: item.status ? '#10B981' : '#5C1A1B' }}>{item.status ? '\u0639\u0645\u0644' : '\u0645\u0639\u0637\u0644'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0645\u0644\u062E\u0635 \u0627\u0644\u0637\u0644\u0628\u0627\u062A'}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <p className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{overviewStats.totalOrders}</p>
                      <p className="text-[10px]" style={{ color: isDark ? '#777' : '#999' }}>{'\u0625\u062C\u0645\u0627\u0644\u064A'}</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(245,158,11,0.08)' }}>
                      <p className="text-xl font-bold" style={{ color: '#F59E0B' }}>{overviewStats.pendingOrders}</p>
                      <p className="text-[10px]" style={{ color: '#F59E0B' }}>{'\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* === SECTIONS MANAGEMENT === */}
            {activeTab === 'sections' && (
              <motion.div key="sections" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddSection(!showAddSection)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)', backdropFilter: 'blur(20px)' }}>
                  <Plus size={18} strokeWidth={1.5} /><span>{'\u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645 \u062C\u062F\u064A\u062F'}</span>
                </motion.button>

                <AnimatePresence>
                  {showAddSection && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <input type="text" placeholder={'\u0627\u0633\u0645 \u0627\u0644\u0642\u0633\u0645'} value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <select value={newSectionType} onChange={(e) => setNewSectionType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="telecom">{'\u0627\u062A\u0635\u0627\u0644\u0627\u062A'}</option>
                        <option value="internet">{'\u0625\u0646\u062A\u0631\u0646\u062A'}</option>
                        <option value="entertainment">{'\u062A\u0631\u0641\u064A\u0647'}</option>
                        <option value="cards">{'\u0628\u0637\u0627\u0642\u0627\u062A'}</option>
                        <option value="electricity">{'\u0643\u0647\u0631\u0628\u0627\u0621'}</option>
                        <option value="government">{'\u062D\u0643\u0648\u0645\u064A\u0629'}</option>
                      </select>
                      <div>
                        <input type="file" ref={sectionFileRef} accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => setNewSectionIcon(reader.result as string);
                          reader.readAsDataURL(file);
                        }} className="hidden" />
                        <div className="flex items-center gap-3">
                          <button onClick={() => sectionFileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ ...inputStyle, color: isDark ? '#AAA' : '#888' }}>
                            <ImagePlus size={14} /><span>{'\u0631\u0641\u0639 \u0623\u064A\u0642\u0648\u0646\u0629'}</span>
                          </button>
                          {newSectionIcon && <img src={newSectionIcon} alt="icon" className="w-8 h-8 rounded-lg object-cover" />}
                        </div>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddSection} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#8B5CF6' }}>{'\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0642\u0633\u0645'}</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndSections}>
                  <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {sections.map((section) => (
                        <SortableSectionItem
                          key={section.id}
                          section={section}
                          isDark={isDark}
                          onToggle={handleToggleSection}
                          onDelete={handleDeleteSection}
                          onIconChange={handleSectionIconChange}
                          onEditName={handleSectionNameChange}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {sections.length === 0 && (
                  <div className="flex flex-col items-center py-8">
                    <Layers size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    <p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>{'\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0642\u0633\u0627\u0645'}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* === SUBSECTIONS MANAGEMENT === */}
            {activeTab === 'subsections' && (
              <motion.div key="subsections" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Parent selector */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <label className="text-xs font-medium mb-2 block" style={{ color: isDark ? '#AAA' : '#666' }}>{'\u0627\u062E\u062A\u0631 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0623\u0628'}</label>
                  <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                    <option value="">{'-- \u0627\u062E\u062A\u0631 --'}</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {selectedParentId && (
                  <>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddSubsection(!showAddSubsection)}
                      className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                      style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)', backdropFilter: 'blur(20px)' }}>
                      <Plus size={18} strokeWidth={1.5} /><span>{'\u0625\u0636\u0627\u0641\u0629 \u0642\u0633\u0645 \u0641\u0631\u0639\u064A'}</span>
                    </motion.button>

                    <AnimatePresence>
                      {showAddSubsection && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                          <input type="text" placeholder={'\u0627\u0633\u0645 \u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0641\u0631\u0639\u064A'} value={newSubName} onChange={(e) => setNewSubName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                          <div>
                            <input type="file" ref={subFileRef} accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => setNewSubIcon(reader.result as string);
                              reader.readAsDataURL(file);
                            }} className="hidden" />
                            <div className="flex items-center gap-3">
                              <button onClick={() => subFileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ ...inputStyle, color: isDark ? '#AAA' : '#888' }}>
                                <ImagePlus size={14} /><span>{'\u0631\u0641\u0639 \u0623\u064A\u0642\u0648\u0646\u0629'}</span>
                              </button>
                              {newSubIcon && <img src={newSubIcon} alt="icon" className="w-8 h-8 rounded-lg object-cover" />}
                            </div>
                          </div>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddSubsection} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#8B5CF6' }}>{'\u0625\u0636\u0627\u0641\u0629'}</motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* List subsections for selected parent */}
                    {subsections.filter(s => s.parentId === selectedParentId).map((sub) => (
                      <SubSectionItem
                        key={sub.id}
                        sub={sub}
                        isDark={isDark}
                        onToggle={handleToggleSubsection}
                        onDelete={handleDeleteSubsection}
                        onIconChange={handleSubIconChange}
                        onEditName={handleSubNameChange}
                        inputStyle={inputStyle}
                        cardStyle={cardStyle}
                      />
                    ))}

                    {subsections.filter(s => s.parentId === selectedParentId).length === 0 && (
                      <div className="flex flex-col items-center py-8">
                        <FolderTree size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                        <p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>{'\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0642\u0633\u0627\u0645 \u0641\u0631\u0639\u064A\u0629'}</p>
                      </div>
                    )}
                  </>
                )}

                {!selectedParentId && (
                  <div className="flex flex-col items-center py-8">
                    <FolderTree size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    <p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>{'\u0627\u062E\u062A\u0631 \u0642\u0633\u0645 \u0623\u0628 \u0644\u0639\u0631\u0636 \u0627\u0644\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0641\u0631\u0639\u064A\u0629'}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* === VISIBILITY MANAGEMENT (إدارة الظهور) === */}
            {activeTab === 'sectionVisibility' && (
              <motion.div key="sectionVisibility" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={18} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إدارة الظهور</h3>
                  </div>
                  <p className="text-xs mb-4" style={{ color: isDark ? '#888' : '#AAA' }}>تحكم كامل بظهور الأقسام والمزودين والميزات</p>

                  {/* Sub-tabs for visibility */}
                  <div className="flex gap-2 mb-4">
                    {[
                      { id: 'sections' as const, label: 'الأقسام', icon: Layers },
                      { id: 'providers' as const, label: 'المزودين', icon: Package },
                      { id: 'features' as const, label: 'الميزات', icon: Zap },
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = visibilityTab === tab.id;
                      return (
                        <button key={tab.id} onClick={() => setVisibilityTab(tab.id)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                          style={{
                            background: isActive ? 'rgba(139,92,246,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            color: isActive ? '#8B5CF6' : isDark ? '#888' : '#AAA',
                            border: isActive ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                          }}>
                          <TabIcon size={14} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sections Visibility */}
                  {visibilityTab === 'sections' && (
                    <div className="space-y-2">
                      {[
                        { key: 'telecom', label: 'الاتصالات', icon: Smartphone, color: '#5C1A1B' },
                        { key: 'internet', label: 'الإنترنت', icon: Wifi, color: '#3B82F6' },
                        { key: 'entertainment', label: 'الخدمات الترفيهية', icon: Gamepad2, color: '#F59E0B' },
                        { key: 'cards', label: 'البطاقات الرقمية', icon: CreditCard, color: '#8B5CF6' },
                        { key: 'transfer', label: 'التحويل', icon: ArrowLeft, color: '#10B981' },
                        { key: 'recharge', label: 'الشحن', icon: Zap, color: '#EC4899' },
                        { key: 'electricity', label: 'الكهرباء والماء', icon: Zap, color: '#F59E0B' },
                        { key: 'government', label: 'خدمات حكومية', icon: ShieldCheck, color: '#6B7280' },
                        { key: 'digital-wallet', label: 'المحفظة الرقمية', icon: CreditCard, color: '#6366F1' },
                        { key: 'crypto', label: 'الكريبتو', icon: DollarSign, color: '#F7931A' },
                        { key: 'crypto-invest', label: 'استثمار الكريبتو', icon: Activity, color: '#10B981' },
                        { key: 'currency-exchange', label: 'تبادل العملات', icon: RefreshCw, color: '#3B82F6' },
                      ].map((section) => {
                        const Icon = section.icon;
                        const isVisible = visibilitySections[section.key] !== false;
                        return (
                          <div key={section.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRight: isVisible ? `3px solid ${section.color}` : '3px solid transparent' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${section.color}18` }}>
                                <Icon size={18} color={section.color} />
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{section.label}</p>
                                <p className="text-[10px]" style={{ color: isVisible ? '#10B981' : '#5C1A1B' }}>{isVisible ? 'ظاهر' : 'مخفي'}</p>
                              </div>
                            </div>
                            <button onClick={() => {
                              setVisibilitySections({ ...visibilitySections, [section.key]: !isVisible });
                            }}>
                              {isVisible ? <ToggleRight size={24} color="#10B981" /> : <ToggleLeft size={24} color={isDark ? '#444' : '#CCC'} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Providers Visibility */}
                  {visibilityTab === 'providers' && (
                    <div className="space-y-2 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {ownerProviders.length === 0 && (
                        <div className="flex flex-col items-center py-6">
                          <Package size={32} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                          <p className="text-xs mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا يوجد مزودين</p>
                        </div>
                      )}
                      {ownerProviders.map((provider) => {
                        const isVisible = visibilityProviders[provider.id] !== false;
                        return (
                          <div key={provider.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRight: isVisible ? `3px solid ${provider.color}` : '3px solid transparent' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider.color}18` }}>
                                {provider.icon && provider.icon.startsWith('data:') ? (
                                  <img src={provider.icon} alt={provider.name} className="w-5 h-5 rounded object-cover" />
                                ) : <span className="font-bold text-[10px]" style={{ color: provider.color }}>{provider.name.charAt(0)}</span>}
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{provider.name}</p>
                                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{provider.categoryId} • {isVisible ? 'ظاهر' : 'مخفي'}</p>
                              </div>
                            </div>
                            <button onClick={() => {
                              setVisibilityProviders({ ...visibilityProviders, [provider.id]: !isVisible });
                            }}>
                              {isVisible ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Features Visibility */}
                  {visibilityTab === 'features' && (
                    <div className="space-y-2">
                      {[
                        { key: 'transfer', label: 'تحويل الأموال', icon: ArrowLeft, color: '#10B981' },
                        { key: 'exchange', label: 'تبديل العملات', icon: RefreshCw, color: '#3B82F6' },
                        { key: 'investment', label: 'استثمار', icon: Activity, color: '#F7931A' },
                        { key: 'savings', label: 'التوفير', icon: DollarSign, color: '#8B5CF6' },
                        { key: 'qrPayment', label: 'دفع QR', icon: CreditCard, color: '#EC4899' },
                        { key: 'requestMoney', label: 'طلب أموال', icon: DollarSign, color: '#F59E0B' },
                        { key: 'splitBill', label: 'تقسيم الفاتورة', icon: Package, color: '#6366F1' },
                      ].map((feature) => {
                        const Icon = feature.icon;
                        const isVisible = visibilityFeatures[feature.key] !== false;
                        return (
                          <div key={feature.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRight: isVisible ? `3px solid ${feature.color}` : '3px solid transparent' }}>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${feature.color}18` }}>
                                <Icon size={18} color={feature.color} />
                              </div>
                              <div>
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{feature.label}</p>
                                <p className="text-[10px]" style={{ color: isVisible ? '#10B981' : '#5C1A1B' }}>{isVisible ? 'مفعّل' : 'معطّل'}</p>
                              </div>
                            </div>
                            <button onClick={() => {
                              setVisibilityFeatures({ ...visibilityFeatures, [feature.key]: !isVisible });
                            }}>
                              {isVisible ? <ToggleRight size={24} color="#10B981" /> : <ToggleLeft size={24} color={isDark ? '#444' : '#CCC'} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
                  try {
                    const visibilityData = {
                      sections: visibilitySections,
                      providers: visibilityProviders,
                      features: visibilityFeatures,
                    };
                    set(ref(database, 'adminSettings/visibility'), visibilityData);
                    // Also save legacy for backward compatibility
                    set(ref(database, 'adminSettings/sectionVisibility'), visibilitySections);
                    setVisibilitySaved(true);
                    setTimeout(() => setVisibilitySaved(false), 3000);
                    const logId = generateReference();
                    set(ref(database, `ownerSettings/activityLog/${logId}`), {
                      id: logId, type: 'admin', action: 'تم تحديث اعدادات الظهور الكاملة',
                      userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
                    });
                  } catch (err) {
                    console.error('Error saving visibility:', err);
                  }
                }} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                  style={{ background: visibilitySaved ? '#10B981' : '#8B5CF6' }}>
                  {visibilitySaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  <span>{visibilitySaved ? 'تم الحفظ' : 'حفظ اعدادات الظهور'}</span>
                </motion.button>
              </motion.div>
            )}

            {/* === ENTERTAINMENT PRODUCTS (Enhanced) === */}
            {activeTab === 'entertainment' && (
              <motion.div key="entertainment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Entertainment sub-tabs */}
                <div className="flex gap-2">
                  {[
                    { id: 'providers' as const, label: 'المزودين', icon: Package },
                    { id: 'products' as const, label: 'المنتجات', icon: ShoppingBag },
                    { id: 'add' as const, label: 'إضافة', icon: Plus },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = ownerEntertainmentTab === tab.id;
                    return (
                      <button key={tab.id} onClick={() => setOwnerEntertainmentTab(tab.id)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        style={{
                          background: isActive ? 'rgba(139,92,246,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          color: isActive ? '#8B5CF6' : isDark ? '#888' : '#AAA',
                          border: isActive ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                        }}>
                        <TabIcon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={cardStyle}>
                  <Search size={16} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="بحث في المنتجات..." value={ownerProductSearch} onChange={(e) => setOwnerProductSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                </div>

                {/* Providers Tab */}
                {ownerEntertainmentTab === 'providers' && (
                  <>
                    {ownerProviders.filter(p => p.categoryId === 'wallet-services' || p.categoryId === 'entertainment' || p.categoryId === 'cards').map((provider) => {
                      const providerProducts = ownerPackages.filter(p => p.providerId === provider.id);
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
                            <button onClick={async () => {
                              try { await update(ref(database, `providers/${provider.id}`), { isActive: !provider.isActive }); } catch {}
                            }}>
                              {provider.isActive ? <ToggleRight size={20} color="#10B981" /> : <ToggleLeft size={20} color={isDark ? '#444' : '#CCC'} />}
                            </button>
                            <button onClick={async () => {
                              try { await remove(ref(database, `providers/${provider.id}`)); } catch {}
                            }} className="mr-1">
                              <Trash2 size={16} color="#5C1A1B" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {ownerProviders.filter(p => p.categoryId === 'wallet-services' || p.categoryId === 'entertainment' || p.categoryId === 'cards').length === 0 && (
                      <div className="flex flex-col items-center py-8"><Gamepad2 size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد خدمات ترفيهية</p></div>
                    )}
                  </>
                )}

                {/* Products Tab */}
                {ownerEntertainmentTab === 'products' && (
                  <>
                    {ownerProviders.filter(p => p.categoryId === 'wallet-services' || p.categoryId === 'entertainment' || p.categoryId === 'cards').map((provider) => {
                      const providerProducts = ownerPackages.filter(p => p.providerId === provider.id && (!ownerProductSearch || p.name.toLowerCase().includes(ownerProductSearch.toLowerCase())));
                      if (providerProducts.length === 0 && !ownerProductSearch) return null;
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
                            <button onClick={async () => {
                              try { await update(ref(database, `providers/${provider.id}`), { isActive: !provider.isActive }); } catch {}
                            }}>
                              {provider.isActive ? <ToggleRight size={20} color="#10B981" /> : <ToggleLeft size={20} color={isDark ? '#444' : '#CCC'} />}
                            </button>
                          </div>
                          <div className="max-h-60 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                            {providerProducts.map((product, index) => (
                              <div key={product.id} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: index < providerProducts.length - 1 ? (isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)') : 'none' }}>
                                <div className="flex-1">
                                  {editingOwnerProduct === product.id ? (
                                    <div className="flex items-center gap-2">
                                      <input type="text" value={editOwnerProductData.name} onChange={(e) => setEditOwnerProductData({ ...editOwnerProductData, name: e.target.value })} className="flex-1 px-2 py-1 rounded text-xs outline-none" style={inputStyle} />
                                      <input type="number" value={editOwnerProductData.price || ''} onChange={(e) => setEditOwnerProductData({ ...editOwnerProductData, price: parseFloat(e.target.value) || 0 })} className="w-20 px-2 py-1 rounded text-xs outline-none" style={inputStyle} dir="ltr" />
                                      <button onClick={async () => {
                                        try {
                                          await update(ref(database, `packages/${product.id}`), { name: editOwnerProductData.name, price: editOwnerProductData.price });
                                          setEditingOwnerProduct(null);
                                        } catch {}
                                      }}><CheckCircle2 size={16} color="#10B981" /></button>
                                      <button onClick={() => setEditingOwnerProduct(null)}><X size={16} color="#5C1A1B" /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{product.name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-bold" style={{ color: '#8B5CF6' }}>{product.price.toLocaleString()} {currencySymbols[product.currency]}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: product.executionType === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: product.executionType === 'manual' ? '#F59E0B' : '#10B981' }}>
                                          {product.executionType === 'manual' ? 'يدوي' : 'تلقائي'}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                {editingOwnerProduct !== product.id && (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => {
                                      setEditingOwnerProduct(product.id);
                                      setEditOwnerProductData({ name: product.name, price: product.price });
                                    }}><Edit3 size={14} color={isDark ? '#888' : '#AAA'} /></button>
                                    <button onClick={async () => {
                                      try { await remove(ref(database, `packages/${product.id}`)); } catch {}
                                    }}><Trash2 size={14} color="#5C1A1B" /></button>
                                    <button onClick={async () => {
                                      try { await update(ref(database, `packages/${product.id}`), { isActive: !product.isActive }); } catch {}
                                    }}>
                                      {product.isActive ? <ToggleRight size={20} color="#10B981" /> : <ToggleLeft size={20} color={isDark ? '#444' : '#CCC'} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {providerProducts.length === 0 && ownerProductSearch && (
                              <p className="text-xs text-center py-3" style={{ color: isDark ? '#555' : '#BBB' }}>لا توجد نتائج</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Add Tab */}
                {ownerEntertainmentTab === 'add' && (
                  <div className="space-y-3">
                    {/* Add New Provider */}
                    <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                      <div className="flex items-center gap-2 mb-1">
                        <Plus size={16} color="#8B5CF6" />
                        <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إضافة مزود جديد</h3>
                      </div>
                      <input type="text" placeholder="اسم المزود" value={newOwnerProvider.name} onChange={(e) => setNewOwnerProvider({ ...newOwnerProvider, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <div className="flex gap-2">
                        <input type="color" value={newOwnerProvider.color} onChange={(e) => setNewOwnerProvider({ ...newOwnerProvider, color: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer" />
                        <select value={newOwnerProvider.categoryId} onChange={(e) => setNewOwnerProvider({ ...newOwnerProvider, categoryId: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="entertainment">ترفيهية</option>
                          <option value="cards">بطاقات رقمية</option>
                        </select>
                      </div>
                      <input type="text" placeholder="حقل الإدخال (مثل: Player ID)" value={newOwnerProvider.inputLabel} onChange={(e) => setNewOwnerProvider({ ...newOwnerProvider, inputLabel: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <select value={newOwnerProvider.inputType} onChange={(e) => setNewOwnerProvider({ ...newOwnerProvider, inputType: e.target.value as 'phone' | 'text' })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="text">نص</option>
                        <option value="phone">رقم هاتف</option>
                      </select>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                        if (!newOwnerProvider.name) return;
                        try {
                          const id = generateReference();
                          await set(ref(database, `providers/${id}`), {
                            ...newOwnerProvider,
                            isActive: true,
                          });
                          setNewOwnerProvider({ name: '', color: '#5C1A1B', categoryId: 'wallet-services', inputLabel: '', inputType: 'text', inputPrefix: '', icon: '' });
                          const logId = generateReference();
                          set(ref(database, `ownerSettings/activityLog/${logId}`), {
                            id: logId, type: 'admin', action: `تم إضافة مزود جديد: ${newOwnerProvider.name}`,
                            userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
                          });
                        } catch {}
                      }} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#8B5CF6' }}>إضافة المزود</motion.button>
                    </div>

                    {/* Add New Product */}
                    <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                      <div className="flex items-center gap-2 mb-1">
                        <Package size={16} color="#8B5CF6" />
                        <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إضافة منتج جديد</h3>
                      </div>
                      <select value={newOwnerPackage.providerId} onChange={(e) => setNewOwnerPackage({ ...newOwnerPackage, providerId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="">اختر المزود</option>
                        {ownerProviders.filter(p => p.categoryId === 'wallet-services' || p.categoryId === 'entertainment' || p.categoryId === 'cards').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="text" placeholder="اسم المنتج" value={newOwnerPackage.name} onChange={(e) => setNewOwnerPackage({ ...newOwnerPackage, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <div className="flex gap-2">
                        <input type="number" placeholder="السعر" value={newOwnerPackage.price || ''} onChange={(e) => setNewOwnerPackage({ ...newOwnerPackage, price: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <select value={newOwnerPackage.currency} onChange={(e) => setNewOwnerPackage({ ...newOwnerPackage, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                        </select>
                      </div>
                      <select value={newOwnerPackage.executionType} onChange={(e) => setNewOwnerPackage({ ...newOwnerPackage, executionType: e.target.value as 'manual' | 'auto' })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                        <option value="manual">تنفيذ يدوي</option><option value="auto">تنفيذ تلقائي</option>
                      </select>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                        if (!newOwnerPackage.name || !newOwnerPackage.providerId) return;
                        try {
                          const id = generateReference();
                          await set(ref(database, `packages/${id}`), {
                            ...newOwnerPackage,
                            isActive: true,
                          });
                          setNewOwnerPackage({ name: '', price: 0, currency: 'YER', providerId: '', executionType: 'manual' });
                          const logId = generateReference();
                          set(ref(database, `ownerSettings/activityLog/${logId}`), {
                            id: logId, type: 'admin', action: `تم إضافة منتج جديد: ${newOwnerPackage.name}`,
                            userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
                          });
                        } catch {}
                      }} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#8B5CF6' }}>إضافة المنتج</motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* === GIFT CODES === */}
            {activeTab === 'giftCodes' && (
              <motion.div key="giftCodes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Gift Code Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl p-3 text-center" style={cardStyle}>
                    <p className="text-lg font-bold" style={{ color: '#8B5CF6' }}>{giftCodes.length}</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>إجمالي الأكواد</p>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={cardStyle}>
                    <p className="text-lg font-bold" style={{ color: '#10B981' }}>{giftCodes.filter(c => c.isActive).length}</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>نشط</p>
                  </div>
                  <div className="rounded-2xl p-3 text-center" style={cardStyle}>
                    <p className="text-lg font-bold" style={{ color: '#F59E0B' }}>{giftCodes.reduce((sum, c) => sum + (c.usedCount || 0), 0)}</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>استخدامات</p>
                  </div>
                </div>

                {/* Add single code */}
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddGiftCode(!showAddGiftCode)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Plus size={18} /><span>إضافة كود هدية</span>
                </motion.button>
                <AnimatePresence>
                  {showAddGiftCode && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <input type="text" placeholder="الكود (اتركه فارغاً للتوليد التلقائي)" value={newGiftCode.code} onChange={e => setNewGiftCode({ ...newGiftCode, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} dir="ltr" />
                      <div className="flex gap-2">
                        <input type="number" placeholder="الخصم" value={newGiftCode.discount || ''} onChange={e => setNewGiftCode({ ...newGiftCode, discount: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <select value={newGiftCode.type} onChange={e => setNewGiftCode({ ...newGiftCode, type: e.target.value as 'percentage' | 'fixed' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="percentage">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <select value={newGiftCode.currency} onChange={e => setNewGiftCode({ ...newGiftCode, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                        </select>
                        <input type="number" placeholder="الحد الأقصى" value={newGiftCode.maxUses || ''} onChange={e => setNewGiftCode({ ...newGiftCode, maxUses: parseInt(e.target.value) || 100 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                      </div>
                      <input type="date" value={newGiftCode.expiresAt} onChange={e => setNewGiftCode({ ...newGiftCode, expiresAt: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                        if (newGiftCode.discount <= 0) return;
                        try {
                          const id = generateReference();
                          const code = newGiftCode.code || `GIFT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                          await set(ref(database, `promo-codes/${id}`), {
                            ...newGiftCode,
                            code,
                            id,
                            usedCount: 0,
                            isActive: true,
                            createdAt: new Date().toISOString(),
                          });
                          setNewGiftCode({ code: '', discount: 0, type: 'percentage', currency: 'YER', maxUses: 100, expiresAt: '' });
                          setShowAddGiftCode(false);
                          const logId = generateReference();
                          set(ref(database, `ownerSettings/activityLog/${logId}`), {
                            id: logId, type: 'admin', action: `تم إضافة كود هدية: ${code}`,
                            userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
                          });
                        } catch {}
                      }} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#8B5CF6' }}>إضافة الكود</motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Bulk code generation */}
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowBulkCodes(!showBulkCodes)}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Hash size={18} /><span>توليد أكواد بالجملة</span>
                </motion.button>
                <AnimatePresence>
                  {showBulkCodes && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>عدد الأكواد:</span>
                        <select value={bulkCodeCount} onChange={(e) => setBulkCodeCount(parseInt(e.target.value))} className="px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle}>
                          {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n} كود</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <input type="number" placeholder="الخصم" value={newGiftCode.discount || ''} onChange={e => setNewGiftCode({ ...newGiftCode, discount: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        <select value={newGiftCode.type} onChange={e => setNewGiftCode({ ...newGiftCode, type: e.target.value as 'percentage' | 'fixed' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                          <option value="percentage">نسبة</option><option value="fixed">مبلغ</option>
                        </select>
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                        if (newGiftCode.discount <= 0) return;
                        try {
                          for (let i = 0; i < bulkCodeCount; i++) {
                            const id = generateReference();
                            const code = `GIFT${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                            await set(ref(database, `promo-codes/${id}`), {
                              code,
                              discount: newGiftCode.discount,
                              type: newGiftCode.type,
                              currency: newGiftCode.currency,
                              maxUses: newGiftCode.maxUses,
                              usedCount: 0,
                              isActive: true,
                              expiresAt: newGiftCode.expiresAt,
                              createdAt: new Date().toISOString(),
                            });
                          }
                          setShowBulkCodes(false);
                          const logId = generateReference();
                          set(ref(database, `ownerSettings/activityLog/${logId}`), {
                            id: logId, type: 'admin', action: `تم توليد ${bulkCodeCount} كود هدية`,
                            userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
                          });
                        } catch {}
                      }} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#F59E0B' }}>
                        توليد {bulkCodeCount} كود
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={cardStyle}>
                  <Search size={16} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="بحث بالكود..." value={giftCodeSearch} onChange={(e) => setGiftCodeSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm font-mono" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr" />
                </div>

                {/* Gift codes list */}
                {giftCodes.filter(c => !giftCodeSearch || c.code.toLowerCase().includes(giftCodeSearch.toLowerCase())).map((c) => (
                  <div key={c.id} className="rounded-2xl p-4" style={cardStyle}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Gift size={16} color="#8B5CF6" />
                        <span className="text-sm font-mono font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{c.code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                          {c.type === 'percentage' ? `${c.discount}%` : `${c.discount} ${currencySymbols[c.currency as keyof typeof currencySymbols] || c.currency}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={async () => {
                          try { await update(ref(database, `promo-codes/${c.id}`), { isActive: !c.isActive }); } catch {}
                        }}>
                          {c.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                        </button>
                        <button onClick={async () => {
                          try { await remove(ref(database, `promo-codes/${c.id}`)); } catch {}
                        }}><Trash2 size={16} color="#5C1A1B" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{c.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</span>
                      <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>استخدام: {c.usedCount}/{c.maxUses}</span>
                      {c.expiresAt && <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>ينتهي: {new Date(c.expiresAt).toLocaleDateString('ar-SA')}</span>}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%`, background: '#8B5CF6' }} />
                    </div>
                  </div>
                ))}
                {giftCodes.length === 0 && (
                  <div className="flex flex-col items-center py-8"><Gift size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد أكواد هدية</p></div>
                )}
              </motion.div>
            )}

            {/* === ORDERS === */}
            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={cardStyle}>
                  <Search size={18} strokeWidth={1.5} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder="ابحث بالاسم، الرقم، الخدمة..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(['all', 'pending', 'completed', 'cancelled'] as const).map((filter) => (
                    <button key={filter} onClick={() => setOrderFilter(filter)}
                      className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap"
                      style={{ background: orderFilter === filter ? 'rgba(139,92,246,0.2)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)', color: orderFilter === filter ? '#FFF' : isDark ? '#BBB' : '#666', border: orderFilter === filter ? '1px solid rgba(139,92,246,0.3)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                      {filter === 'all' ? 'الكل' : filter === 'pending' ? 'قيد الانتظار' : filter === 'completed' ? 'مكتمل' : 'ملغى'}
                    </button>
                  ))}
                </div>
                {firebaseOrders.filter(o => {
                  if (orderFilter !== 'all' && o.status !== orderFilter) return false;
                  if (orderSearch) {
                    const q = orderSearch.toLowerCase();
                    return o.userName?.toLowerCase().includes(q) || o.customerInput?.includes(q) || o.providerName?.includes(q) || o.packageName?.includes(q);
                  }
                  return true;
                }).map((order) => {
                  const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
                    pending: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B', label: 'قيد الانتظار' },
                    completed: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'مكتمل' },
                    cancelled: { bg: 'rgba(92,26,27,0.15)', color: '#5C1A1B', label: 'ملغى' },
                  };
                  const ss = statusStyles[order.status] || statusStyles.pending;
                  return (
                    <div key={order.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: order.status === 'pending' ? '3px solid #F59E0B' : undefined }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.packageName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
                          </div>
                          <p className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>{order.providerName}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold" style={{ color: '#8B5CF6' }}>{order.amount.toLocaleString()} {currencySymbols[order.currency]}</p>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{timeAgo(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>العميل</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.userName}</p></div>
                        <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />
                        <div><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>الرقم/المعرف</p><p className="text-xs font-medium" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{order.customerInput}</p></div>
                      </div>
                      {order.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                            try {
                              await update(ref(database, `orders/${order.id}`), { status: 'completed', completedAt: new Date().toISOString() });
                            } catch {}
                          }} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                            <CheckCircle2 size={14} /> تم التنفيذ
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
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
                            } catch {}
                          }} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                            <XCircle size={14} /> إلغاء
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {firebaseOrders.length === 0 && (
                  <div className="flex flex-col items-center py-8"><ShoppingBag size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات</p></div>
                )}
              </motion.div>
            )}

            {/* === KYC VERIFICATION === */}
            {activeTab === 'kyc' && (
              <motion.div key="kyc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <ShieldCheck size={16} color="#8B5CF6" />
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>طلبات التحقق: {kycUsers.length}</span>
                </div>
                {kycUsers.map((u) => (
                  <div key={u.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: '3px solid #8B5CF6' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                        <UserCheck size={18} color="#8B5CF6" />
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
                      <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>الهاتف</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.phone}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                        try {
                          await update(ref(database, `users/${u.id}`), { kycStatus: 'verified' });
                          const notifId = generateReference();
                          await set(ref(database, `notifications/${u.id}/${notifId}`), {
                            id: notifId, title: 'تم التحقق من هويتك', body: 'تم قبول وثائق التحقق الخاصة بك',
                            type: 'security', isRead: false, createdAt: new Date().toISOString(),
                          });
                        } catch {}
                      }} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
                        <BadgeCheck size={14} /> توثيق
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={async () => {
                        try {
                          await update(ref(database, `users/${u.id}`), { kycStatus: 'rejected' });
                        } catch {}
                      }} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                        <UserX size={14} /> رفض
                      </motion.button>
                    </div>
                  </div>
                ))}
                {kycUsers.length === 0 && (
                  <div className="flex flex-col items-center py-8"><ShieldCheck size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات تحقق</p></div>
                )}
              </motion.div>
            )}

            {/* === SOCIAL LINKS === */}
            {activeTab === 'socialLinks' && (
              <motion.div key="socialLinks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-2">
                    <Link size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>روابط التواصل الاجتماعي</h3>
                  </div>
                  {[
                    { key: 'whatsapp' as const, label: 'واتساب', placeholder: 'رقم الواتساب', icon: Phone },
                    { key: 'facebook' as const, label: 'فيسبوك', placeholder: 'رابط صفحة فيسبوك', icon: Globe },
                    { key: 'twitter' as const, label: 'تويتر / X', placeholder: 'رابط حساب تويتر', icon: Globe },
                    { key: 'instagram' as const, label: 'انستغرام', placeholder: 'رابط حساب انستغرام', icon: Globe },
                    { key: 'telegram' as const, label: 'تيليغرام', placeholder: 'رابط قناة تيليغرام', icon: Globe },
                    { key: 'youtube' as const, label: 'يوتيوب', placeholder: 'رابط قناة يوتيوب', icon: Globe },
                    { key: 'contactAdmin' as const, label: 'تواصل مع الادمن', placeholder: 'رابط زر تواصل مع الادمن', icon: ExternalLink },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.08)' }}>
                          <Icon size={16} color="#8B5CF6" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-medium block mb-0.5" style={{ color: isDark ? '#AAA' : '#888' }}>{field.label}</label>
                          <input type="text" placeholder={field.placeholder} value={socialLinks[field.key]} onChange={(e) => setSocialLinks({ ...socialLinks, [field.key]: e.target.value })} className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
                  try {
                    set(ref(database, 'adminSettings/socialLinks'), socialLinks);
                    setSocialLinksSaved(true);
                    setTimeout(() => setSocialLinksSaved(false), 3000);
                  } catch {}
                }} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                  style={{ background: socialLinksSaved ? '#10B981' : '#8B5CF6' }}>
                  {socialLinksSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  <span>{socialLinksSaved ? 'تم الحفظ' : 'حفظ روابط التواصل'}</span>
                </motion.button>
              </motion.div>
            )}

            {/* === LEGAL CONTENT === */}
            {activeTab === 'legalContent' && (
              <motion.div key="legalContent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <HelpCircle size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الاسئلة الشائعة</h3>
                  </div>
                  <textarea placeholder="اكتب محتوى الاسئلة الشائعة هنا..." value={legalContent.faq} onChange={(e) => setLegalContent({ ...legalContent, faq: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <Scale size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سياسة الخصوصية</h3>
                  </div>
                  <textarea placeholder="اكتب محتوى سياسة الخصوصية هنا..." value={legalContent.privacyPolicy} onChange={(e) => setLegalContent({ ...legalContent, privacyPolicy: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>حول التطبيق</h3>
                  </div>
                  <textarea placeholder="اكتب محتوى حول التطبيق هنا..." value={legalContent.aboutApp} onChange={(e) => setLegalContent({ ...legalContent, aboutApp: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
                  try {
                    set(ref(database, 'adminSettings/legalContent'), legalContent);
                    setLegalContentSaved(true);
                    setTimeout(() => setLegalContentSaved(false), 3000);
                  } catch {}
                }} className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                  style={{ background: legalContentSaved ? '#10B981' : '#8B5CF6' }}>
                  {legalContentSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  <span>{legalContentSaved ? 'تم الحفظ' : 'حفظ المحتوى'}</span>
                </motion.button>
              </motion.div>
            )}

            {/* === PROJECT CONFIG === */}
            {activeTab === 'projectConfig' && (
              <motion.div key="projectConfig" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Firebase Config */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0625\u0639\u062F\u0627\u062F\u0627\u062A Firebase'}</h3>
                  </div>
                  {[
                    { key: 'firebaseApiKey' as const, label: 'API Key', icon: Key },
                    { key: 'firebaseProjectId' as const, label: 'Project ID', icon: Hash },
                    { key: 'firebaseDatabaseUrl' as const, label: 'Database URL', icon: Globe },
                    { key: 'firebaseStorageBucket' as const, label: 'Storage Bucket', icon: HardDrive },
                    { key: 'firebaseAppId' as const, label: 'App ID', icon: Smartphone },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)' }}>
                          <Icon size={14} color="#8B5CF6" />
                        </div>
                        <input type="text" placeholder={field.label} value={projectConfig[field.key]} onChange={(e) => setProjectConfig({ ...projectConfig, [field.key]: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                      </div>
                    );
                  })}
                </div>

                {/* Supabase Config */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <Database size={16} color="#10B981" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0625\u0639\u062F\u0627\u062F\u0627\u062A Supabase (\u0627\u062E\u062A\u064A\u0627\u0631\u064A)'}</h3>
                  </div>
                  {[
                    { key: 'supabaseUrl' as const, label: 'Supabase URL', icon: Globe },
                    { key: 'supabaseAnonKey' as const, label: 'Anon Key', icon: Key },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                          <Icon size={14} color="#10B981" />
                        </div>
                        <input type="text" placeholder={field.label} value={projectConfig[field.key]} onChange={(e) => setProjectConfig({ ...projectConfig, [field.key]: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                      </div>
                    );
                  })}
                </div>

                {/* App Config */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <Package size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u062A\u0637\u0628\u064A\u0642'}</h3>
                  </div>
                  {[
                    { key: 'packageName' as const, label: '\u0627\u0633\u0645 \u0627\u0644\u062D\u0632\u0645\u0629 (Package Name)', icon: Archive },
                    { key: 'appName' as const, label: '\u0627\u0633\u0645 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 (App Name)', icon: CreditCard },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)' }}>
                          <Icon size={14} color="#8B5CF6" />
                        </div>
                        <input type="text" placeholder={field.label} value={projectConfig[field.key]} onChange={(e) => setProjectConfig({ ...projectConfig, [field.key]: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
                      </div>
                    );
                  })}
                </div>

                {/* Save Button */}
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveConfig}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
                  style={{ background: configSaved ? '#10B981' : '#8B5CF6' }}>
                  {configSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  <span>{configSaved ? '\u062A\u0645 \u0627\u0644\u062D\u0641\u0638' : '\u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A'}</span>
                </motion.button>
              </motion.div>
            )}

            {/* === ADMIN MANAGEMENT === */}
            {activeTab === 'adminMgmt' && (
              <motion.div key="adminMgmt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Add admin by email */}
                <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-1">
                    <UserCheck size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0625\u0636\u0627\u0641\u0629 \u0623\u062F\u0645\u0646 \u0628\u0627\u0644\u0628\u0631\u064A\u062F'}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="email" placeholder={'\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A'} value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddAdminByEmail} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#8B5CF6' }}>
                      <Plus size={16} />
                    </motion.button>
                  </div>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={cardStyle}>
                  <Search size={16} color={isDark ? '#555' : '#AAA'} />
                  <input type="text" placeholder={'\u0628\u062D\u062B \u0641\u064A \u0627\u0644\u0623\u062F\u0645\u0646...'} value={adminSearch} onChange={(e) => setAdminSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
                </div>

                {/* Admin List */}
                {filteredAdminUsers.map((adminUser) => (
                  <div key={adminUser.id} className="rounded-2xl p-4" style={cardStyle}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: adminUser.role === 'owner' ? 'rgba(139,92,246,0.15)' : 'rgba(92,26,27,0.1)' }}>
                        {adminUser.role === 'owner' ? <Crown size={18} color="#8B5CF6" /> : <ShieldCheck size={18} color="#5C1A1B" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{adminUser.name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: adminUser.role === 'owner' ? 'rgba(139,92,246,0.15)' : 'rgba(92,26,27,0.1)', color: adminUser.role === 'owner' ? '#8B5CF6' : '#5C1A1B' }}>
                            {adminUser.role === 'owner' ? '\u0645\u0627\u0644\u0643' : '\u0623\u062F\u0645\u0646'}
                          </span>
                          {adminUser.isBlocked && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>{'\u0645\u062D\u0638\u0648\u0631'}</span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: isDark ? '#666' : '#AAA' }} dir="ltr">{adminUser.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {adminUser.role === 'admin' && (
                          <button onClick={() => handleDemoteAdmin(adminUser.id)} title={'\u062A\u062E\u0641\u064A\u0636 \u0625\u0644\u0649 \u0645\u0633\u062A\u062E\u062F\u0645'}>
                            <UserX size={16} color="#F59E0B" />
                          </button>
                        )}
                        {adminUser.role !== 'owner' && (
                          <button onClick={() => handleToggleBlockAdmin(adminUser)}>
                            {adminUser.isBlocked ? <Unlock size={16} color="#10B981" /> : <Ban size={16} color="#5C1A1B" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Promote regular users */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <UserCheck size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u062A\u0631\u0642\u064A\u0629 \u0645\u0633\u062A\u062E\u062F\u0645'}</h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1" style={{ scrollbarWidth: 'thin' }}>
                    {allUsers.filter(u => u.role === 'user').slice(0, 20).map((u) => (
                      <div key={u.id} className="flex items-center justify-between py-2 px-2 rounded-xl hover:opacity-80" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                        <div>
                          <p className="text-xs font-medium" style={{ color: isDark ? '#DDD' : '#444' }}>{u.name}</p>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }} dir="ltr">{u.email}</p>
                        </div>
                        <button onClick={() => handlePromoteToAdmin(u.id)} className="px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
                          {'\u062A\u0631\u0642\u064A\u0629'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* === ACTIVITY LOG === */}
            {activeTab === 'activityLog' && (
              <motion.div key="activityLog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Filter */}
                <div className="flex gap-2">
                  {[
                    { id: 'all' as const, label: '\u0627\u0644\u0643\u0644' },
                    { id: 'user' as const, label: '\u0645\u0633\u062A\u062E\u062F\u0645' },
                    { id: 'admin' as const, label: '\u0623\u062F\u0645\u0646' },
                    { id: 'system' as const, label: '\u0646\u0638\u0627\u0645' },
                  ].map((filter) => (
                    <button key={filter.id} onClick={() => setActivityFilter(filter.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium"
                      style={{
                        background: activityFilter === filter.id ? 'rgba(139,92,246,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                        color: activityFilter === filter.id ? '#8B5CF6' : (isDark ? '#888' : '#AAA'),
                        border: activityFilter === filter.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                      }}>
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Log entries */}
                {filteredActivity.map((entry) => (
                  <div key={entry.id} className="rounded-2xl p-4" style={cardStyle}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{
                        background: entry.type === 'user' ? 'rgba(59,130,246,0.12)' : entry.type === 'admin' ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)'
                      }}>
                        {entry.type === 'user' ? <Users size={14} color="#3B82F6" /> : entry.type === 'admin' ? <ShieldCheck size={14} color="#8B5CF6" /> : <Server size={14} color="#10B981" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: isDark ? '#DDD' : '#444' }}>{entry.action}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                            background: entry.type === 'user' ? 'rgba(59,130,246,0.12)' : entry.type === 'admin' ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)',
                            color: entry.type === 'user' ? '#3B82F6' : entry.type === 'admin' ? '#8B5CF6' : '#10B981'
                          }}>
                            {entry.type === 'user' ? '\u0645\u0633\u062A\u062E\u062F\u0645' : entry.type === 'admin' ? '\u0623\u062F\u0645\u0646' : '\u0646\u0638\u0627\u0645'}
                          </span>
                          {entry.userName && <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{entry.userName}</span>}
                          <span className="text-[10px]" style={{ color: isDark ? '#555' : '#BBB' }}>{new Date(entry.timestamp).toLocaleString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredActivity.length === 0 && (
                  <div className="flex flex-col items-center py-8">
                    <Clock size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    <p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>{'\u0644\u0627 \u062A\u0648\u062C\u062F \u0633\u062C\u0644\u0627\u062A'}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* === BACKUP === */}
            {activeTab === 'appIcon' && (
              <motion.div key="appIcon" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {/* App Icon */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-4">
                    <Smartphone size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0623\u064A\u0642\u0648\u0646\u0629 \u0627\u0644\u062A\u0637\u0628\u064A\u0642'}</h3>
                  </div>
                  <p className="text-xs mb-4" style={{ color: isDark ? '#888' : '#AAA' }}>{'\u062A\u063A\u064A\u064A\u0631 \u0623\u064A\u0642\u0648\u0646\u0629 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0638\u0647\u0631 \u0639\u0644\u0649 \u0634\u0627\u0634\u0629 \u0627\u0644\u0647\u0627\u062A\u0641'}</p>
                  
                  {/* Current Icon Preview */}
                  <div className="flex flex-col items-center mb-4">
                    <div 
                      className="w-24 h-24 rounded-3xl overflow-hidden flex items-center justify-center" 
                      style={{ 
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      {appIcon ? (
                        <img src={appIcon} alt="App Icon" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: '#5C1A1B' }}>
                          <span className="text-white text-2xl font-bold">{'\u0627\u0644\u062C\u0646\u0648\u0628'}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>{'\u0627\u0644\u0623\u064A\u0642\u0648\u0646\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629'}</span>
                  </div>

                  {/* Upload Button */}
                  <input 
                    type="file" 
                    ref={appIconFileRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64 = reader.result as string;
                        setAppIcon(base64);
                      };
                      reader.readAsDataURL(file);
                    }} 
                  />
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => appIconFileRef.current?.click()}
                    className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    <Upload size={16} />
                    <span>{'\u0627\u062E\u062A\u0631 \u0623\u064A\u0642\u0648\u0646\u0629 \u062C\u062F\u064A\u062F\u0629'}</span>
                  </motion.button>
                </div>

                {/* Splash Icon */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-4">
                    <ImagePlus size={16} color="#10B981" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0634\u0627\u0634\u0629 \u0627\u0644\u0628\u062F\u0627\u064A\u0629'}</h3>
                  </div>
                  <p className="text-xs mb-4" style={{ color: isDark ? '#888' : '#AAA' }}>{'\u062A\u063A\u064A\u064A\u0631 \u0623\u064A\u0642\u0648\u0646\u0629 \u0634\u0627\u0634\u0629 \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u062A\u064A \u062A\u0638\u0647\u0631 \u0639\u0646\u062F \u0641\u062A\u062D \u0627\u0644\u062A\u0637\u0628\u064A\u0642'}</p>
                  
                  {/* Current Splash Preview */}
                  <div className="flex flex-col items-center mb-4">
                    <div 
                      className="w-full h-48 rounded-2xl overflow-hidden flex items-center justify-center" 
                      style={{ 
                        background: '#5C1A1B',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      {splashIcon ? (
                        <img src={splashIcon} alt="Splash Icon" className="w-24 h-24 object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center mb-2">
                            <img src={LOGO_BASE64} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-white text-sm font-bold">{'\u0645\u062D\u0641\u0638\u0629 \u0627\u0644\u062C\u0646\u0648\u0628'}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>{'\u0634\u0627\u0634\u0629 \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629'}</span>
                  </div>

                  {/* Upload Button */}
                  <input 
                    type="file" 
                    ref={splashIconFileRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const base64 = reader.result as string;
                        setSplashIcon(base64);
                      };
                      reader.readAsDataURL(file);
                    }} 
                  />
                  <motion.button 
                    whileTap={{ scale: 0.95 }} 
                    onClick={() => splashIconFileRef.current?.click()}
                    className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <Upload size={16} />
                    <span>{'\u0627\u062E\u062A\u0631 \u0623\u064A\u0642\u0648\u0646\u0629 \u0634\u0627\u0634\u0629 \u0628\u062F\u0627\u064A\u0629 \u062C\u062F\u064A\u062F\u0629'}</span>
                  </motion.button>
                </div>

                {/* Save Button */}
                <motion.button 
                  whileTap={{ scale: 0.95 }} 
                  onClick={async () => {
                    setIconSaving(true);
                    try {
                      if (appIcon) {
                        const compressed = await compressBase64Image(appIcon);
                        await set(ref(database, 'ownerSettings/appIcon'), compressed);
                      } else {
                        await remove(ref(database, 'ownerSettings/appIcon'));
                      }
                      if (splashIcon) {
                        const compressed = await compressBase64Image(splashIcon);
                        await set(ref(database, 'ownerSettings/splashIcon'), compressed);
                      } else {
                        await remove(ref(database, 'ownerSettings/splashIcon'));
                      }
                      // Log activity
                      const logId = generateReference();
                      await set(ref(database, `ownerSettings/activityLog/${logId}`), {
                        id: logId, type: 'admin', action: '\u062A\u0645 \u062A\u062D\u062F\u064A\u062B \u0623\u064A\u0642\u0648\u0646\u0629 \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0648\u0634\u0627\u0634\u0629 \u0627\u0644\u0628\u062F\u0627\u064A\u0629',
                        userId: user?.id, userName: user?.name, timestamp: new Date().toISOString(),
                      });
                    } catch {}
                    setIconSaving(false);
                  }}
                  disabled={iconSaving}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: iconSaving ? '#666' : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
                >
                  {iconSaving ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>{iconSaving ? '\u062C\u0627\u0631\u064A \u0627\u0644\u062D\u0641\u0638...' : '\u062D\u0641\u0638 \u0627\u0644\u062A\u063A\u064A\u064A\u0631\u0627\u062A'}</span>
                </motion.button>
              </motion.div>
            )}

            {activeTab === 'backup' && (
              <motion.div key="backup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                {/* Export */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Download size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A'}</h3>
                  </div>
                  <p className="text-xs mb-3" style={{ color: isDark ? '#888' : '#AAA' }}>{'\u062A\u0635\u062F\u064A\u0631 \u062C\u0645\u064A\u0639 \u0628\u064A\u0627\u0646\u0627\u062A Firebase \u0643\u0645\u0644\u0641 JSON'}</p>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleExportBackup} disabled={exportLoading}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: exportLoading ? '#666' : '#8B5CF6' }}>
                    {exportLoading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                    <span>{exportLoading ? '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0635\u062F\u064A\u0631...' : '\u062A\u0635\u062F\u064A\u0631 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629'}</span>
                  </motion.button>
                </div>

                {/* Import */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Upload size={16} color="#10B981" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A'}</h3>
                  </div>
                  <p className="text-xs mb-3" style={{ color: isDark ? '#888' : '#AAA' }}>{'\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0645\u0646 \u0645\u0644\u0641 JSON'}</p>
                  <input type="file" ref={importFileRef} accept=".json" onChange={handleImportBackup} className="hidden" />
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => importFileRef.current?.click()} disabled={importLoading}
                    className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    {importLoading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                    <span>{importLoading ? '\u062C\u0627\u0631\u064A \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F...' : '\u0627\u062E\u062A\u0631 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629'}</span>
                  </motion.button>
                </div>

                {/* Warning */}
                <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} color="#F59E0B" className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#F59E0B' }}>{'\u062A\u062D\u0630\u064A\u0631'}</p>
                      <p className="text-[10px] mt-1" style={{ color: isDark ? '#AAA' : '#888' }}>{'\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0633\u064A\u0633\u062A\u0628\u062F\u0644 \u062C\u0645\u064A\u0639 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u064A\u0629. \u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0642\u0628\u0644 \u0627\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F.'}</p>
                    </div>
                  </div>
                </div>

                {/* Previous Backups */}
                <div className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Archive size={16} color="#8B5CF6" />
                    <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{'\u0633\u062C\u0644 \u0627\u0644\u0646\u0633\u062E \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A'}</h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'thin' }}>
                    {backups.map((backup) => (
                      <div key={backup.id} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                        <div className="flex items-center gap-2">
                          <Database size={12} color="#8B5CF6" />
                          <div>
                            <p className="text-xs font-medium" style={{ color: isDark ? '#DDD' : '#444' }}>{new Date(backup.timestamp).toLocaleString('ar-SA')}</p>
                            <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{backup.size}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                          background: backup.type === 'auto' ? 'rgba(59,130,246,0.12)' : 'rgba(139,92,246,0.12)',
                          color: backup.type === 'auto' ? '#3B82F6' : '#8B5CF6'
                        }}>
                          {backup.type === 'auto' ? '\u062A\u0644\u0642\u0627\u0626\u064A' : '\u064A\u062F\u0648\u064A'}
                        </span>
                      </div>
                    ))}
                    {backups.length === 0 && (
                      <p className="text-xs text-center py-4" style={{ color: isDark ? '#666' : '#AAA' }}>{'\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u0633\u062E \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629'}</p>
                    )}
                  </div>
                </div>
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
                    background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="owner-sidebar-active"
                      className="absolute right-0 top-1 bottom-1 w-[3px] rounded-l-full"
                      style={{ background: '#8B5CF6' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon size={20} strokeWidth={1.5} color={isActive ? '#8B5CF6' : isDark ? '#666' : '#AAA'} />
                  <span className="text-[8px] mt-1 leading-tight text-center font-medium" style={{ color: isActive ? '#8B5CF6' : isDark ? '#666' : '#AAA' }}>
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
