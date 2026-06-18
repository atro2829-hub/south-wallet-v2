'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Search, ChevronLeft, ArrowLeft, Package, ShoppingCart, Wallet } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { productIcons, getProductIcon } from '@/lib/product-icons';
import { serviceIcons } from '@/lib/service-icons';
import { supabase, supabaseService } from '@/lib/supabase';
import type { DbSubSection, DbServiceProvider, DbProductPackage, DbWalletAddress } from '@/lib/supabase';
import { getSubSections, type DynamicSubSection, type DynamicCategory } from '@/lib/categories';
import type { ApiProviderCategory, ApiProviderProduct, ApiProviderConfig } from '@/lib/api-provider';
import { getApiProvider } from '@/lib/api-providers';

// ─── Product image URLs from real service providers ──
const PRODUCT_IMAGES: Record<string, string> = {
  'pubg': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/pubgm_tile_aug2024.jpg',
  'freefire': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/free_fire_new_tile.png',
  'call-of-duty': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/codm-wl_178x178.jpg',
  'fortnite': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/fortnite_usa_tile.png',
  'valorant': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/valorant_tile.jpg',
  'apex-legends': 'https://seagm-media.seagmcdn.com/game_480/3116.jpg',
  'clash-royale': 'https://img-cdn-sg.payermax.com/shoplay365/prod/upload/picture/20240412094815705_CLASH_ROYALE_icon.jpg',
  'clash-of-clans': 'https://img-cdn-sg.payermax.com/shoplay365/prod/upload/picture/20240418072604722_clashofclans_appicon.jpg',
  'league-legends': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/LOL_tile.jpg',
  'roblox': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Roblox-tiles-178x178-new.jpg',
  'minecraft': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Minecraft-Java-Bedrock-tile_update_178x178.jpg',
  'genshin-impact': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/genshinimpact_tile.jpg',
  'honkai-star': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/hsr_tile.jpg',
  'steam': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/steam_us_tile.jpg',
  'ea-fc': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/FCMNewUpdate/new-en.jpg',
  'netflix': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/Netflix_rebrand2_tile.png',
  'spotify': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/spotify_usa_tile.png',
  'youtube-premium': 'https://static.eneba.games/84fba7421ae9417ec36c.jpg',
  'google-play': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/gp_usa_tile.png',
  'apple-itunes': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/itunes_us_tile.jpg',
  'amazon-gift': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles-plain/GC_Amazon_ae_178x178.png',
  'psn-card': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/psn_store_tile.jpg',
  'xbox-card': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/xboxgiftcard_tile.jpg',
  'nintendo-card': 'https://cdn1.codashop.com/S/content/mobile/images/product-tiles/US_Nintendo-eShop.jpg',
  'visa-virtual': 'https://seagm-media.seagmcdn.com/icon_400/2211.jpg',
  'mastercard-virtual': 'https://seagm-media.seagmcdn.com/icon_400/2858.jpg',
  'paypal': 'https://seagm-media.seagmcdn.com/icon_400/1818.jpg',
};

const STARTING_PRICES: Record<string, number> = {
  'pubg': 1200, 'freefire': 800, 'call-of-duty': 1500, 'fortnite': 2000,
  'valorant': 1800, 'apex-legends': 1500, 'clash-royale': 1000, 'clash-of-clans': 1000,
  'league-legends': 2000, 'roblox': 900, 'minecraft': 2500, 'genshin-impact': 1500,
  'honkai-star': 1500, 'steam': 5000, 'ea-fc': 3000,
  'netflix': 3500, 'spotify': 2500, 'youtube-premium': 3000,
  'google-play': 3000, 'apple-itunes': 3500, 'amazon-gift': 3000,
  'psn-card': 6000, 'xbox-card': 6000, 'nintendo-card': 6000,
  'visa-virtual': 5000, 'mastercard-virtual': 5000, 'paypal': 5000,
  'yemen-mobile': 100, 'yo': 100, 'sabafon': 100, 'y': 100,
  'yemen-net': 150, 'y-net-internet': 250, 'sabafon-internet': 400,
  'elec-sanaa': 500, 'elec-aden': 500, 'water-sanaa': 300, 'water-aden': 300,
  'civil-registry': 1000, 'passport': 5000, 'traffic': 500, 'municipal': 500,
  'bitcoin': 1550, 'ethereum': 3500, 'usdt': 15500, 'bnb': 4000, 'solana': 2000, 'tron': 1500,
  'usdt-daily': 15500, 'usdt-weekly': 38750, 'usdt-monthly': 77500, 'usdt-quarterly': 155000,
};

const iconFallbackMap: Record<string, string> = {
  'elec-sanaa': 'electricity', 'elec-aden': 'electricity',
  'water-sanaa': 'water', 'water-aden': 'water',
  'y-net-internet': 'y-net-internet', 'sabafon-internet': 'sabafon-internet',
  'bitcoin': 'bitcoin', 'ethereum': 'ethereum', 'usdt': 'usdt',
  'bnb': 'bitcoin', 'solana': 'bitcoin', 'tron': 'bitcoin',
  'usdt-daily': 'usdt', 'usdt-weekly': 'usdt', 'usdt-monthly': 'usdt', 'usdt-quarterly': 'usdt',
};

const telecomProviderIds = ['yemen-mobile', 'yo', 'sabafon', 'y'];

function getIconForProvider(providerId: string): string {
  if (productIcons[providerId]) return productIcons[providerId];
  const fallbackKey = iconFallbackMap[providerId];
  if (fallbackKey && productIcons[fallbackKey]) return productIcons[fallbackKey];
  if (serviceIcons[providerId]) return serviceIcons[providerId];
  if (fallbackKey && serviceIcons[fallbackKey]) return serviceIcons[fallbackKey];
  return serviceIcons['instant-pay'] || '';
}

function getProductImage(providerId: string): { src: string; isExternal: boolean } {
  const externalUrl = PRODUCT_IMAGES[providerId];
  if (externalUrl) return { src: externalUrl, isExternal: true };
  return { src: getIconForProvider(providerId), isExternal: false };
}

function formatPrice(price: number): string {
  return price.toLocaleString('ar-SA');
}

function ProductImage({ providerId, providerName, size = 'sm', iconUrl }: { providerId: string; providerName: string; size?: 'sm' | 'md' | 'lg'; iconUrl?: string }) {
  const { src: defaultSrc, isExternal } = getProductImage(providerId);
  const src = iconUrl || defaultSrc;
  const [imgError, setImgError] = useState(false);
  const fallbackIcon = getIconForProvider(providerId);
  const sizeClass = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-12 h-12' : 'w-9 h-9';
  const imgSizeClass = size === 'lg' ? 'w-12 h-12' : size === 'md' ? 'w-9 h-9' : 'w-7 h-7';

  if ((!isExternal && !iconUrl) || imgError) {
    return <img src={fallbackIcon} alt={providerName} className={`${imgSizeClass} object-contain`} draggable={false} />;
  }
  return <img src={src} alt={providerName} className={`${imgSizeClass} object-contain`} draggable={false} onError={() => setImgError(true)} />;
}

function SubSectionImage({ icon, iconType, color }: { icon: string; iconType: 'lucide' | 'emoji' | 'image'; color: string }) {
  const [imgError, setImgError] = useState(false);

  // Image URL icon
  if (iconType === 'image' && icon && !imgError) {
    return <img src={icon} alt="" className="w-10 h-10 object-contain" draggable={false} onError={() => setImgError(true)} />;
  }

  // Emoji icon
  if (iconType === 'emoji' && icon) {
    return <span className="text-2xl">{icon}</span>;
  }

  // Lucide icon - try to look up in productIcons/serviceIcons maps
  const iconSrc = productIcons[icon] || serviceIcons[icon] || productIcons['pubg'];
  const externalUrl = PRODUCT_IMAGES[icon];

  if (externalUrl && !imgError) {
    return <img src={externalUrl} alt="" className="w-10 h-10 object-contain" draggable={false} onError={() => setImgError(true)} />;
  }
  return <img src={iconSrc} alt="" className="w-10 h-10 object-contain" draggable={false} />;
}

// ─── Wallet Service / Package types ──────────────────────────────────
interface WalletServicePackage {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  costPrice?: number;
  commission?: number;
  commissionType?: string;
  executionType?: string;
  isActive?: boolean;
  sortOrder?: number;
  description?: string;
}

interface WalletServiceItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  categoryId?: string;
  sectionId?: string;
  subSectionId?: string;
  inputLabel?: string;
  inputType?: string;
  inputPrefix?: string;
  isActive?: boolean;
  sortOrder?: number;
  packages?: Record<string, WalletServicePackage>;
}

// ─── Resolved sub-section type (sub-section with its providers) ──────
interface ResolvedSubSection extends DynamicSubSection {
  providers: ReturnType<typeof useAppStore.getState>['providers'];
}

// ─── Main Component ─────────────────────────────────────────────────
export default function CategoryDetailScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const {
    selectedCategory,
    setSelectedCategory,
    providers,
    setSelectedProvider,
    setOrderOpen,
    setActiveScreen,
    fbSections,
    fbWalletServices,
    fbApiProviders,
    fbVisibility,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'subsections' | 'products' | 'api-products' | 'api-subsections' | 'wallet-packages' | 'usdt-section' | 'usdt-purchase'>('subsections');
  const [selectedSubSection, setSelectedSubSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // API provider state
  const [apiCategoryData, setApiCategoryData] = useState<{ provider: ApiProviderConfig; category: ApiProviderCategory; products: ApiProviderProduct[] } | null>(null);
  const [selectedApiProduct, setSelectedApiProduct] = useState<ApiProviderProduct | null>(null);
  const [customerInput, setCustomerInput] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Wallet service state
  const [selectedWalletService, setSelectedWalletService] = useState<WalletServiceItem | null>(null);
  const [selectedWalletPackage, setSelectedWalletPackage] = useState<WalletServicePackage | null>(null);

  // API sub-section hierarchical state (Level 1 → Level 2 → Level 3)
  // When `sectionType === 'api-products'`, we first show sub_sections as a grid
  // (Level 1). When a sub_section is tapped, we fetch its api_categories (Level 2
  // filter tabs) and api_products (Level 3 grid) scoped by that sub_section via
  // `api_categories.section_id`.
  const [selectedApiSubSection, setSelectedApiSubSection] = useState<DynamicSubSection | null>(null);
  const [apiSubSectionCategories, setApiSubSectionCategories] = useState<any[]>([]);
  const [apiSubSectionProducts, setApiSubSectionProducts] = useState<any[]>([]);
  const [apiSubSectionLoading, setApiSubSectionLoading] = useState(false);
  const [apiSubCategoryFilter, setApiSubCategoryFilter] = useState<string | null>(null);

  // USDT-specific state. The USDT section (`section_id === 'usdt'`) is a wallet
  // section that needs special handling: sub_sections (buy-usdt / sell-usdt /
  // usdt-plans) are shown as filter tabs, service_providers for the selected
  // sub_section are shown as a grid, and the purchase dialog uses a custom
  // quantity input + wallet address input (instead of fixed packages).
  const [usdtSubSection, setUsdtSubSection] = useState<string>('buy-usdt');
  const [usdtProviders, setUsdtProviders] = useState<DbServiceProvider[]>([]);
  const [usdtProvidersLoading, setUsdtProvidersLoading] = useState(false);
  const [selectedUsdtProvider, setSelectedUsdtProvider] = useState<DbServiceProvider | null>(null);
  const [usdtPackages, setUsdtPackages] = useState<DbProductPackage[]>([]);
  const [usdtQuantity, setUsdtQuantity] = useState('');
  const [usdtWalletAddress, setUsdtWalletAddress] = useState('');
  const [usdtWalletAddresses, setUsdtWalletAddresses] = useState<DbWalletAddress[]>([]);

  // API category filter for Supabase products view
  const [apiCategoryFilter, setApiCategoryFilter] = useState<string | null>(null);

  // ─── Sub-sections fetched from Supabase ──────────────────────────
  const [subSections, setSubSections] = useState<DynamicSubSection[]>([]);

  // Fetch sub-sections when selectedCategory changes
  useEffect(() => {
    if (!selectedCategory) return;

    let cancelled = false;

    const fetchSubSections = async () => {
      try {
        const subs = await getSubSections(selectedCategory);
        if (!cancelled) {
          setSubSections(subs.filter(s => s.isVisible));
        }
      } catch (error) {
        console.error('Error fetching sub-sections:', error);
        if (!cancelled) {
          setSubSections([]);
        }
      }
    };

    fetchSubSections();

    return () => { cancelled = true; };
  }, [selectedCategory]);

  // Subscribe to sub_sections realtime changes
  useEffect(() => {
    if (!selectedCategory) return;

    const channelName = `cat-detail-subs-${selectedCategory}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_sections' }, async () => {
        try {
          const subs = await getSubSections(selectedCategory);
          setSubSections(subs.filter(s => s.isVisible));
        } catch {}
      })
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [selectedCategory]);

  // ─── Derive API providers list from store ──────────────────────────
  const apiProviders = useMemo<ApiProviderConfig[]>(() => {
    const data = fbApiProviders;
    if (!data || Object.keys(data).length === 0) return [];
    return Object.entries(data)
      .filter(([, p]: [string, any]) => p.isActive !== false)
      .map(([key, p]: [string, any]) => ({
        id: key || p.id || '',
        name: p.name || '',
        baseUrl: p.baseUrl || '',
        apiKey: p.apiKey || '',
        apiSecret: p.apiSecret || '',
        authHeader: p.authHeader || 'X-API-Key',
        method: p.method || 'POST',
        headers: p.headers || {},
        bodyTemplate: p.bodyTemplate || '',
        responseFormat: p.responseFormat || 'json',
        fieldMappings: p.fieldMappings || undefined,
        isActive: p.isActive !== false,
        syncEnabled: p.syncEnabled !== false,
        lastSync: p.lastSync || '',
        createdAt: p.createdAt || '',
        categories: p.categories || {},
      }));
  }, [fbApiProviders]);

  const visibilityProviders = fbVisibility.providers;

  // ─── Fetch the actual section data from Supabase to get the real screenType ──
  const [sectionData, setSectionData] = useState<DynamicCategory | null>(null);

  useEffect(() => {
    if (!selectedCategory || selectedCategory.startsWith('apicat-')) {
      setSectionData(null);
      return;
    }
    let cancelled = false;
    const fetchSection = async () => {
      try {
        const { data, error } = await supabase
          .from('sections')
          .select('*')
          .eq('id', selectedCategory)
          .single();
        if (!cancelled && data && !error) {
          // Map the DB section type to screenType
          const typeMapping: Record<string, string> = {
            'api': 'api-products',
            'manual': 'manual',
            'wallet': 'usdt',
            'exchange': 'exchange',
            'telecom': 'telecom',
            'games': 'api-games',
            'investment': 'investment',
            'escrow': 'escrow',
            'link': 'link',
          };
          const screenType = typeMapping[data.type] || 'manual';
          setSectionData({
            id: data.id,
            name: data.name || data.name_en || '',
            nameAr: data.name || '',
            nameEn: data.name_en || data.name || '',
            icon: data.icon || '📋',
            iconType: 'emoji' as const,
            color: data.color || '#5C1A1B',
            order: data.sort_order ?? 0,
            isVisible: data.is_visible ?? data.is_active ?? true,
            screenType: screenType as DynamicCategory['screenType'],
            apiProviderId: data.api_provider_id || '',
            description: data.description || '',
            descriptionAr: data.description || '',
            image: data.image_url || '',
            showInHome: data.is_visible ?? true,
            showInServices: data.is_active ?? true,
            createdAt: data.created_at || '',
            updatedAt: data.updated_at || '',
          });
        } else if (!cancelled) {
          setSectionData(null);
        }
      } catch {
        if (!cancelled) setSectionData(null);
      }
    };
    fetchSection();
    return () => { cancelled = true; };
  }, [selectedCategory]);

  // ─── Determine the current section from store (synced by useSupabaseSync) ──
  const currentSection = useMemo(() => {
    if (!selectedCategory || selectedCategory.startsWith('apicat-')) return null;
    const sections = fbSections as Record<string, any> | null;
    if (!sections) return null;
    return sections[selectedCategory] || null;
  }, [selectedCategory, fbSections]);

  // ─── Determine section type from Supabase section data ───────────────
  const sectionScreenType = sectionData?.screenType || null;
  const sectionApiProviderId = sectionData?.apiProviderId || currentSection?.apiProviderId || '';

  const sectionType = useMemo(() => {
    // Use the Supabase section screenType first
    if (sectionScreenType) {
      switch (sectionScreenType) {
        case 'api-products': return 'api-products';
        case 'api-games': return 'api-games';
        case 'telecom': return 'telecom';
        case 'manual': return 'manual';
        case 'usdt': return 'usdt';
        case 'exchange': return 'exchange';
        case 'investment': return 'investment';
        case 'escrow': return 'escrow';
        default: break;
      }
    }
    // Fallback to Firebase data
    if (!currentSection) return 'regular';
    if (currentSection.apiProviderId) return 'api';
    if (currentSection.type === 'wallet-services' || currentSection.id === 'wallet-services') return 'wallet-services';
    return 'regular';
  }, [sectionScreenType, currentSection]);

  // Check if selectedCategory is an API category (from services-screen navigation)
  const isApiCategory = selectedCategory?.startsWith('apicat-') || false;

  // ─── Parse API category info from selectedCategory ────────────────
  const parseApiCategoryInfo = (): { providerId: string; categoryId: string } | null => {
    if (!selectedCategory?.startsWith('apicat-')) return null;
    for (const ap of apiProviders) {
      const prefix = ap.id;
      const catStr = selectedCategory.replace(`apicat-${prefix}-`, '');
      if (catStr && catStr !== selectedCategory) {
        return { providerId: prefix, categoryId: catStr };
      }
    }
    return null;
  };

  const apiCategoryInfo = parseApiCategoryInfo();

  // Helper: safely convert data (array with nulls or object) to clean array
  const safeArray = <T,>(data: any): T[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter((item: any) => item !== null && item !== undefined) as T[];
    if (typeof data === 'object') return Object.values(data).filter((item: any) => item !== null && item !== undefined) as T[];
    return [];
  };

  // ─── API products from Supabase api_products table ────────────────
  const [supabaseApiProducts, setSupabaseApiProducts] = useState<any[]>([]);
  const [supabaseApiCategories, setSupabaseApiCategories] = useState<any[]>([]);
  const [apiProductsLoading, setApiProductsLoading] = useState(false);

  // Fetch API products from Supabase when screenType is api-products
  useEffect(() => {
    if (sectionType !== 'api-products' || !sectionApiProviderId) {
      setSupabaseApiProducts([]);
      setSupabaseApiCategories([]);
      return;
    }
    let cancelled = false;
    setApiProductsLoading(true);

    const fetchApiProducts = async () => {
      try {
        // Fetch categories for this provider
        const { data: catData, error: catError } = await supabase
          .from('api_categories')
          .select('*')
          .eq('api_provider_id', sectionApiProviderId)
          .eq('is_active', true);

        if (!cancelled && !catError) {
          setSupabaseApiCategories(catData || []);
        }

        // Fetch products for this provider. Join with product_packages to get
        // the markup-included price (price_usd). Without this join, the UI
        // would show the raw cost (no markup) and the user would be undercharged.
        const { data: prodData, error: prodError } = await supabase
          .from('api_products')
          .select(`
            *,
            package:package_id (
              id,
              price_usd,
              cost_price,
              commission_amount,
              is_active
            )
          `)
          .eq('api_provider_id', sectionApiProviderId)
          .eq('is_active', true);

        if (!cancelled && !prodError) {
          // Flatten the joined package price into final_price_usd for easy access
          const enriched = (prodData || []).map((p: any) => ({
            ...p,
            final_price_usd: p.package?.price_usd || p.price || 0,
            cost_price: p.package?.cost_price || p.price || 0,
            commission_amount: p.package?.commission_amount || 0,
            stock: p.product_data?.stock || 0,
          }));
          setSupabaseApiProducts(enriched);
        }
      } catch (error) {
        console.error('Error fetching API products from Supabase:', error);
        if (!cancelled) {
          setSupabaseApiProducts([]);
          setSupabaseApiCategories([]);
        }
      } finally {
        if (!cancelled) setApiProductsLoading(false);
      }
    };

    fetchApiProducts();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`api-products-${sectionApiProviderId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_products', filter: `api_provider_id=eq.${sectionApiProviderId}` }, () => {
        fetchApiProducts();
      })
      .subscribe();

    return () => {
      cancelled = true;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [sectionType, sectionApiProviderId]);

  // ─── Fetch api_categories + api_products scoped by selected sub_section ──
  // Level 2 + Level 3 of the hierarchical display for `api-products` sections.
  // When a sub_section is tapped we fetch the api_categories whose `section_id`
  // matches the sub_section id, then fetch api_products whose `api_category_id`
  // is in that set. If the sub_section has no api_categories linked (e.g.
  // `digital-streaming`), we fall back to showing nothing — the user can pick
  // another sub_section.
  useEffect(() => {
    if (sectionType !== 'api-products' || !selectedApiSubSection || !sectionApiProviderId) {
      setApiSubSectionCategories([]);
      setApiSubSectionProducts([]);
      return;
    }
    let cancelled = false;
    setApiSubSectionLoading(true);
    setApiSubCategoryFilter(null);

    const fetchScoped = async () => {
      try {
        // 1. Fetch api_categories linked to this sub_section (section_id).
        const { data: catData, error: catError } = await supabase
          .from('api_categories')
          .select('*')
          .eq('api_provider_id', sectionApiProviderId)
          .eq('section_id', selectedApiSubSection.id)
          .eq('is_active', true);

        if (cancelled) return;
        if (catError) throw catError;
        const cats = catData || [];
        setApiSubSectionCategories(cats);

        // 2. Fetch api_products for those categories. We also join
        //    product_packages to surface the markup-included price.
        const catIds = cats.map((c: any) => String(c.api_category_id));
        if (catIds.length === 0) {
          setApiSubSectionProducts([]);
          return;
        }

        // Build an `in.(...)` filter string (URL-encoded by supabase-js).
        const { data: prodData, error: prodError } = await supabase
          .from('api_products')
          .select(`
            *,
            package:package_id (
              id,
              price_usd,
              cost_price,
              commission_amount,
              is_active
            )
          `)
          .eq('api_provider_id', sectionApiProviderId)
          .eq('is_active', true)
          .in('api_category_id', catIds);

        if (cancelled) return;
        if (prodError) throw prodError;
        const enriched = (prodData || []).map((p: any) => ({
          ...p,
          final_price_usd: p.package?.price_usd || p.price || 0,
          cost_price: p.package?.cost_price || p.price || 0,
          commission_amount: p.package?.commission_amount || 0,
          stock: p.product_data?.stock || 0,
        }));
        setApiSubSectionProducts(enriched);
      } catch (error) {
        console.error('Error fetching scoped api_categories/products:', error);
        if (!cancelled) {
          setApiSubSectionCategories([]);
          setApiSubSectionProducts([]);
        }
      } finally {
        if (!cancelled) setApiSubSectionLoading(false);
      }
    };

    fetchScoped();

    return () => { cancelled = true; };
  }, [sectionType, selectedApiSubSection, sectionApiProviderId]);

  // ─── Fetch USDT service_providers + packages for the selected sub_section ──
  // The USDT section uses the wallet_addresses table for deposit addresses and
  // service_providers/product_packages for buy/sell/plans. We fetch both up
  // front whenever the user enters the USDT section.
  useEffect(() => {
    if (sectionType !== 'usdt' || selectedCategory !== 'usdt') {
      setUsdtProviders([]);
      setUsdtPackages([]);
      setUsdtWalletAddresses([]);
      return;
    }
    let cancelled = false;
    setUsdtProvidersLoading(true);

    const fetchUsdt = async () => {
      try {
        // service_providers for the section (will be filtered by sub_section
        // in the UI render).
        const { data: provData, error: provError } = await supabase
          .from('service_providers')
          .select('*')
          .eq('section_id', 'usdt')
          .eq('is_active', true)
          .order('sort_order');
        if (cancelled) return;
        if (provError) throw provError;
        const provs = (provData || []) as DbServiceProvider[];
        setUsdtProviders(provs);

        // product_packages for all USDT providers (single round-trip).
        const provIds = provs.map(p => p.id);
        if (provIds.length === 0) {
          setUsdtPackages([]);
        } else {
          const { data: pkgData, error: pkgError } = await supabase
            .from('product_packages')
            .select('*')
            .in('provider_id', provIds)
            .eq('is_active', true)
            .order('sort_order');
          if (cancelled) return;
          if (pkgError) throw pkgError;
          setUsdtPackages((pkgData || []) as DbProductPackage[]);
        }

        // USDT wallet addresses (used to show the user where to deposit when
        // buying USDT).
        const { data: waData, error: waError } = await supabase
          .from('wallet_addresses')
          .select('*')
          .eq('currency', 'USDT')
          .eq('is_active', true);
        if (cancelled) return;
        if (waError) throw waError;
        setUsdtWalletAddresses((waData || []) as DbWalletAddress[]);
      } catch (error) {
        console.error('Error fetching USDT providers/packages:', error);
        if (!cancelled) {
          setUsdtProviders([]);
          setUsdtPackages([]);
          setUsdtWalletAddresses([]);
        }
      } finally {
        if (!cancelled) setUsdtProvidersLoading(false);
      }
    };

    fetchUsdt();

    // Realtime: keep the providers/packages list in sync if admin edits them.
    const channel = supabase
      .channel(`usdt-providers-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_providers', filter: 'section_id=eq.usdt' }, () => {
        fetchUsdt();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_packages' }, () => {
        fetchUsdt();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_addresses', filter: 'currency=eq.USDT' }, () => {
        fetchUsdt();
      })
      .subscribe();

    return () => {
      cancelled = true;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [sectionType, selectedCategory]);


  // ─── Load API category data when it's an API category ─────────────
  useEffect(() => {
    if (isApiCategory && apiCategoryInfo && apiProviders.length > 0) {
      const provider = apiProviders.find(ap => ap.id === apiCategoryInfo.providerId);
      if (provider) {
        const cats = provider.categories || {};
        const catList = safeArray<ApiProviderCategory>(cats);
        const category = catList.find(c => String(c.id) === String(apiCategoryInfo.categoryId) || `cat_${c.id}` === apiCategoryInfo.categoryId || String(c.id) === apiCategoryInfo.categoryId.replace('cat_', ''));
        if (category) {
          const products = safeArray<ApiProviderCategory>(category.products).filter(p => p.isActive !== false) as unknown as ApiProviderProduct[];
          setApiCategoryData({ provider, category, products });
          setViewMode('api-products');
          return;
        }
      }
      setApiCategoryData(null);
      setViewMode('products');
    } else if (!isApiCategory) {
      if (sectionType === 'api-products' && sectionApiProviderId) {
        // For api-products screenType, show products from Supabase api_products table
        setApiCategoryData(null);
        setViewMode('api-products');
      } else if (sectionType === 'api' && currentSection?.apiProviderId) {
        const providerId = currentSection.apiProviderId;
        const provider = apiProviders.find(ap => ap.id === providerId);
        if (provider) {
          const cats = provider.categories || {};
          const catList = safeArray<ApiProviderCategory>(cats);
          if (catList.length > 0) {
            setApiCategoryData(null);
            setViewMode('api-products');
          }
        }
      } else {
        setApiCategoryData(null);
      }
    }
  }, [selectedCategory, apiProviders, isApiCategory, apiCategoryInfo, sectionType, currentSection, sectionApiProviderId]);

  // ─── Normal category logic (non-API) ──────────────────────────────
  const categoryId = !isApiCategory && sectionType !== 'api' && sectionType !== 'api-products' ? (selectedCategory || '') : '';
  const categoryProviders = !isApiCategory && sectionType !== 'api' && sectionType !== 'api-products' ? providers.filter(p => p.categoryId === categoryId && p.isActive && visibilityProviders[p.id] !== false) : [];

  // ─── Resolve sub-sections with their providers from Supabase ──────
  const resolvedSubSections = useMemo<ResolvedSubSection[]>(() => {
    if (isApiCategory || sectionType === 'api' || sectionType === 'api-products') return [];

    return subSections
      .map(sub => {
        const subProviders = categoryProviders.filter(p => p.subSectionId === sub.id);
        return { ...sub, providers: subProviders };
      })
      .filter(sub => sub.providers.length > 0);
  }, [subSections, categoryProviders, isApiCategory, sectionType]);

  // ─── Wallet services for this section from store (synced by useSupabaseSync) ──
  const walletServicesForSection = useMemo<WalletServiceItem[]>(() => {
    if (sectionType !== 'wallet-services') return [];
    const wsData = fbWalletServices as Record<string, any> | null;
    if (!wsData) return [];
    return Object.entries(wsData)
      .filter(([, ws]: [string, any]) => {
        if (ws.isActive === false) return false;
        if (visibilityProviders[ws.id] === false) return false;
        return ws.sectionId === categoryId || (!ws.sectionId && ws.categoryId === categoryId);
      })
      .map(([key, ws]: [string, any]) => ({
        id: key || ws.id || '',
        name: ws.name || '',
        description: ws.description || '',
        icon: ws.icon || '',
        color: ws.color || '',
        categoryId: ws.categoryId || '',
        sectionId: ws.sectionId || '',
        subSectionId: ws.subSectionId || '',
        inputLabel: ws.inputLabel || '',
        inputType: ws.inputType || 'text',
        inputPrefix: ws.inputPrefix || '',
        isActive: ws.isActive !== false,
        sortOrder: ws.sortOrder || 0,
        packages: ws.packages || {},
      }))
      .sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  }, [fbWalletServices, sectionType, categoryId, visibilityProviders]);

  // ─── API categories for this section from store (synced by useSupabaseSync) ──
  const apiCategoriesForSection = useMemo(() => {
    if (sectionType !== 'api' || !currentSection?.apiProviderId) return [];
    const providerId = currentSection.apiProviderId === '__all__' ? null : currentSection.apiProviderId;
    const result: { providerId: string; providerName: string; categoryId: string; category: ApiProviderCategory }[] = [];

    for (const ap of apiProviders) {
      if (providerId && ap.id !== providerId) continue;
      if (!ap.categories) continue;
      const catList = safeArray<ApiProviderCategory>(ap.categories);
      for (const cat of catList) {
        result.push({
          providerId: ap.id,
          providerName: ap.name,
          categoryId: String(cat.id),
          category: cat,
        });
      }
    }
    return result;
  }, [apiProviders, sectionType, currentSection]);

  // ─── Reset view when category changes ─────────────────────────────
  useEffect(() => {
    if (isApiCategory) {
      setViewMode('api-products');
    } else if (sectionType === 'api-products') {
      // Hierarchical display: show sub_sections grid first (Level 1).
      // Tapping a sub_section switches to 'api-products' view (Level 2 + 3).
      setViewMode('api-subsections');
      setSelectedApiSubSection(null);
      setApiSubCategoryFilter(null);
    } else if (sectionType === 'api') {
      setViewMode('api-products');
    } else if (sectionType === 'api-games') {
      // Navigate to games screen
      setActiveScreen('games');
      return;
    } else if (sectionType === 'telecom') {
      setViewMode('products');
    } else if (sectionType === 'usdt' && selectedCategory === 'usdt') {
      // USDT section: show sub_sections as tabs + provider grid in a single
      // view ('usdt-section'). The purchase dialog is 'usdt-purchase'.
      setViewMode('usdt-section');
      setUsdtSubSection('buy-usdt');
      setSelectedUsdtProvider(null);
      setUsdtQuantity('');
      setUsdtWalletAddress('');
    } else if (sectionType === 'wallet-services') {
      setViewMode('products');
    } else {
      // manual or regular
      if (subSections.length === 1) {
        setSelectedSubSection(subSections[0].id);
        setViewMode('products');
      } else {
        setViewMode('subsections');
        setSelectedSubSection(null);
      }
    }
    setSearchQuery('');
    setSearchOpen(false);
    setSelectedApiProduct(null);
    setSelectedWalletService(null);
    setSelectedWalletPackage(null);
    setCustomerInput('');
    setApiCategoryFilter(null);
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [selectedCategory, sectionType]);

  // Auto-skip single sub-section
  useEffect(() => {
    if (!isApiCategory && (sectionType === 'regular' || sectionType === 'manual' || sectionType === 'telecom') && resolvedSubSections.length === 1 && viewMode === 'subsections') {
      setSelectedSubSection(resolvedSubSections[0].id);
      setViewMode('products');
    }
  }, [resolvedSubSections.length, viewMode, isApiCategory, sectionType]);

  if (!selectedCategory) return null;

  // Get category name from Supabase-synced section data (fbSections)
  const getCategoryName = (): string => {
    if (isApiCategory && apiCategoryData) {
      return apiCategoryData.category.title || 'خدمة';
    }
    if (currentSection?.name) return currentSection.name;
    // Fallback: use section ID as name
    return categoryId;
  };

  const categoryName = getCategoryName();
  const currentSubSection = resolvedSubSections.find(s => s.id === selectedSubSection);
  const currentProviders = currentSubSection?.providers || [];
  const filteredProviders = searchQuery.trim()
    ? currentProviders.filter(p => p.name.includes(searchQuery.trim()))
    : currentProviders;
  const flatProviders = categoryProviders;
  const hasSubSections = !isApiCategory && (sectionType === 'regular' || sectionType === 'manual' || sectionType === 'telecom') && resolvedSubSections.length > 1;

  // Handle provider click
  const handleProviderClick = (providerId: string) => {
    if (telecomProviderIds.includes(providerId)) {
      setActiveScreen('recharge');
      return;
    }
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider);
      setOrderOpen(true);
    }
  };

  // Handle wallet service click
  const handleWalletServiceClick = (ws: WalletServiceItem) => {
    setSelectedWalletService(ws);
    setViewMode('wallet-packages');
    setSelectedWalletPackage(null);
    setCustomerInput('');
  };

  // Handle API product purchase - using Supabase
  const handleApiProductPurchase = async () => {
    if (!selectedApiProduct || !customerInput.trim()) return;

    setIsPurchasing(true);
    try {
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const user = useAppStore.getState().user;

      // Price calculation: use the price stored in product_packages (which
      // already includes the admin-configured markup — see syncG2BulkProducts
      // in api-providers.ts and the admin sync handler). DO NOT re-apply 16%
      // hardcoded here, that would double-charge the user.
      //
      // For backwards compat: if api_product_data has its own unit_price and no
      // stored package price, fall back to cost + 16% (only used for unsynced
      // direct-API products).
      const rawPrice = selectedApiProduct.unit_price || selectedApiProduct.price_usd || selectedApiProduct.price || 0;
      // If we have a stored package with price_usd, use it (already marked up).
      const storedPackage = selectedApiProduct.package || selectedApiProduct.pkg;
      const markedUpPrice = storedPackage?.price_usd
        ? Number(storedPackage.price_usd)
        : Number((rawPrice * 1.16).toFixed(2)); // fallback for unsynced products
      const costPrice = storedPackage?.cost_price
        ? Number(storedPackage.cost_price)
        : Number(rawPrice);
      const commissionAmount = Number((markedUpPrice - costPrice).toFixed(2));

      // Determine API provider ID
      const apiProviderId = sectionApiProviderId || (apiCategoryData?.provider?.id || '');

      const orderData = {
        user_id: user?.userId || '',
        provider_id: apiProviderId ? `api-${apiProviderId}` : 'api',
        provider_name: sectionData?.name || apiCategoryData?.provider?.name || 'API Provider',
        package_id: String(selectedApiProduct.id),
        package_name: selectedApiProduct.title,
        category_id: selectedApiProduct.category_id ? String(selectedApiProduct.category_id) : (apiCategoryData ? String(apiCategoryData.category.id) : ''),
        category_name: sectionData?.name || '',
        customer_input: customerInput.trim(),
        amount: markedUpPrice,
        currency: 'USD' as const,
        cost_price: costPrice,
        cost_currency: 'USD',
        commission_amount: commissionAmount,
        commission_type: 'percentage',
        execution_type: 'api' as const,
        status: 'pending' as const,
        api_provider_id: apiProviderId,
        api_product_id: String(selectedApiProduct.id),
        api_order_id: '',
        api_response: {},
        result_code: '',
        result_message: '',
        result_pin_code: '',
      };

      await supabaseService.createOrder(orderData);

      // Add to local store
      useAppStore.getState().addOrder({
        id: orderId,
        userId: user?.id || '',
        userName: user?.name || '',
        userPhone: user?.phone || '',
        providerId: apiProviderId ? `api-${apiProviderId}` : 'api',
        providerName: sectionData?.name || apiCategoryData?.provider?.name || 'API Provider',
        packageId: String(selectedApiProduct.id),
        packageName: selectedApiProduct.title,
        customerInput: customerInput.trim(),
        amount: markedUpPrice,
        currency: 'USD',
        status: 'pending',
        executionType: 'auto',
        createdAt: new Date().toISOString(),
        apiProviderId: apiProviderId,
        apiProductId: String(selectedApiProduct.id),
        apiCategoryId: selectedApiProduct.category_id ? String(selectedApiProduct.category_id) : '',
      });

      setSelectedApiProduct(null);
      setCustomerInput('');

    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle wallet package purchase - using Supabase
  const handleWalletPackagePurchase = async () => {
    if (!selectedWalletPackage || !selectedWalletService || !customerInput.trim()) return;

    setIsPurchasing(true);
    try {
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const user = useAppStore.getState().user;

      const orderData = {
        user_id: user?.userId || '',
        provider_id: selectedWalletService.id,
        provider_name: selectedWalletService.name,
        package_id: selectedWalletPackage.id,
        package_name: selectedWalletPackage.name,
        category_id: selectedWalletService.categoryId || '',
        category_name: '',
        customer_input: customerInput.trim(),
        amount: selectedWalletPackage.price || 0,
        currency: (selectedWalletPackage.currency || 'YER') as 'YER' | 'SAR' | 'USD',
        cost_price: selectedWalletPackage.costPrice || 0,
        cost_currency: selectedWalletPackage.currency || 'YER',
        commission_amount: selectedWalletPackage.commission || 0,
        commission_type: selectedWalletPackage.commissionType || 'percentage',
        execution_type: (selectedWalletPackage.executionType || 'manual') as 'manual' | 'auto' | 'api',
        status: 'pending' as const,
        api_provider_id: '',
        api_product_id: '',
        api_order_id: '',
        api_response: {},
        result_code: '',
        result_message: '',
        result_pin_code: '',
      };

      await supabaseService.createOrder(orderData);

      useAppStore.getState().addOrder({
        id: orderId,
        userId: user?.id || '',
        userName: user?.name || '',
        userPhone: user?.phone || '',
        providerId: selectedWalletService.id,
        providerName: selectedWalletService.name,
        packageId: selectedWalletPackage.id,
        packageName: selectedWalletPackage.name,
        customerInput: customerInput.trim(),
        amount: selectedWalletPackage.price || 0,
        currency: selectedWalletPackage.currency || 'YER',
        status: 'pending',
        executionType: (selectedWalletPackage.executionType || 'manual') as 'manual' | 'auto',
        createdAt: new Date().toISOString(),
      });

      setSelectedWalletPackage(null);
      setCustomerInput('');
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    if (selectedApiProduct) {
      setSelectedApiProduct(null);
      setCustomerInput('');
      return;
    }
    // USDT purchase dialog → back to USDT providers list
    if (sectionType === 'usdt' && viewMode === 'usdt-purchase') {
      setViewMode('usdt-section');
      setSelectedUsdtProvider(null);
      setUsdtQuantity('');
      setUsdtWalletAddress('');
      return;
    }
    if (selectedWalletPackage) {
      setSelectedWalletPackage(null);
      setCustomerInput('');
      return;
    }
    if (selectedWalletService && viewMode === 'wallet-packages') {
      setSelectedWalletService(null);
      setViewMode('products');
      return;
    }
    // api-products: from products view → back to sub_sections grid (Level 1)
    if (!isApiCategory && sectionType === 'api-products' && viewMode === 'api-products' && selectedApiSubSection) {
      setViewMode('api-subsections');
      setSelectedApiSubSection(null);
      setApiSubCategoryFilter(null);
      setSearchQuery('');
      if (contentRef.current) contentRef.current.scrollTop = 0;
      return;
    }
    if (!isApiCategory && sectionType === 'regular' && viewMode === 'products' && hasSubSections) {
      setViewMode('subsections');
      setSelectedSubSection(null);
      setSearchQuery('');
      if (contentRef.current) contentRef.current.scrollTop = 0;
    } else {
      setSelectedCategory(null);
      const prev = useAppStore.getState().previousScreen;
      useAppStore.getState().setActiveScreen(prev || '');
    }
  };

  const handleSubSectionClick = (subId: string) => {
    setSelectedSubSection(subId);
    setViewMode('products');
    setSearchQuery('');
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  // Tapping a sub_section in api-products mode (Level 1) → switch to the
  // scoped api-products view (Level 2 + 3).
  const handleApiSubSectionClick = (sub: DynamicSubSection) => {
    setSelectedApiSubSection(sub);
    setApiSubCategoryFilter(null);
    setViewMode('api-products');
    setSearchQuery('');
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  // Tapping a USDT service_provider → open the custom purchase dialog
  const handleUsdtProviderClick = (provider: DbServiceProvider) => {
    setSelectedUsdtProvider(provider);
    setUsdtQuantity('');
    setUsdtWalletAddress('');
    setViewMode('usdt-purchase');
    if (contentRef.current) contentRef.current.scrollTop = 0;
  };

  // Handle USDT purchase — uses a custom quantity input + wallet address
  // instead of fixed packages. The price is computed dynamically from the
  // provider's smallest package unit price (or 1 USDT = unit price).
  const handleUsdtPurchase = async () => {
    if (!selectedUsdtProvider) return;
    const qty = parseFloat(usdtQuantity);
    if (!qty || qty <= 0) return;
    if (!usdtWalletAddress.trim()) return;

    setIsPurchasing(true);
    try {
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const user = useAppStore.getState().user;

      // Price computation: USDT packages store `price_usd` for a given USDT
      // amount (e.g. USDT 10 → $11.60, USDT 100 → $116.00). The implied
      // per-USDT rate is therefore price_usd / usdt_amount. We extract the
      // amount from the package name ("USDT 10" → 10) and use the cheapest
      // package's implied rate as the unit price for the custom quantity.
      const providerPkgs = usdtPackages.filter(p => p.provider_id === selectedUsdtProvider.id);
      let unitPrice = 1.16; // fallback: cost + 16%
      let costUnit = 1;
      if (providerPkgs.length > 0) {
        const withRates = providerPkgs.map(p => {
          const amt = parseFloat(p.name.replace(/[^0-9.]/g, '')) || 0;
          const rate = amt > 0 ? Number(p.price_usd) / amt : 0;
          return { amt, rate, cost: Number(p.cost_price), costRate: amt > 0 ? Number(p.cost_price) / amt : 0 };
        }).filter(r => r.rate > 0);
        if (withRates.length > 0) {
          // Pick the rate that matches the requested quantity tier, otherwise
          // use the smallest package's rate (conservative).
          withRates.sort((a, b) => a.amt - b.amt);
          const matched = withRates.find(r => r.amt >= qty) || withRates[0];
          unitPrice = matched.rate;
          costUnit = matched.costRate || costUnit;
        }
      }

      const markedUpPrice = Number((qty * unitPrice).toFixed(2));
      const costPrice = Number((qty * costUnit).toFixed(2));
      const commissionAmount = Number((markedUpPrice - costPrice).toFixed(2));

      const isBuy = selectedUsdtProvider.sub_section_id === 'buy-usdt';
      const isSell = selectedUsdtProvider.sub_section_id === 'sell-usdt';
      const packageName = `${qty} USDT`;

      const orderData = {
        user_id: user?.userId || '',
        provider_id: selectedUsdtProvider.id,
        provider_name: selectedUsdtProvider.name,
        package_id: `usdt-custom-${qty}`,
        package_name: packageName,
        category_id: 'usdt',
        category_name: 'USDT',
        customer_input: usdtWalletAddress.trim(),
        amount: markedUpPrice,
        currency: 'USD' as const,
        cost_price: costPrice,
        cost_currency: 'USD',
        commission_amount: commissionAmount,
        commission_type: 'percentage',
        execution_type: 'manual' as const,
        status: 'pending' as const,
        api_provider_id: '',
        api_product_id: '',
        api_order_id: '',
        api_response: { quantity: qty, wallet_address: usdtWalletAddress.trim(), type: isBuy ? 'buy' : isSell ? 'sell' : 'plan' },
        result_code: '',
        result_message: '',
        result_pin_code: '',
      };

      await supabaseService.createOrder(orderData);

      useAppStore.getState().addOrder({
        id: orderId,
        userId: user?.id || '',
        userName: user?.name || '',
        userPhone: user?.phone || '',
        providerId: selectedUsdtProvider.id,
        providerName: selectedUsdtProvider.name,
        packageId: `usdt-custom-${qty}`,
        packageName,
        customerInput: usdtWalletAddress.trim(),
        amount: markedUpPrice,
        currency: 'USD',
        status: 'pending',
        executionType: 'manual',
        createdAt: new Date().toISOString(),
      });

      setViewMode('usdt-section');
      setSelectedUsdtProvider(null);
      setUsdtQuantity('');
      setUsdtWalletAddress('');
    } catch (error) {
      console.error('USDT purchase error:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleApiCategoryClick = (providerId: string, categoryId: string) => {
    setSelectedCategory(`apicat-${providerId}-${categoryId}`);
  };

  // Colors
  const cardBg = isDark ? '#1A1A1A' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#FFF' : '#1a1a1a';
  const secondaryTextColor = isDark ? '#AAA' : '#666';
  const subtleTextColor = isDark ? '#666' : '#999';
  const bgColor = isDark ? '#0A0A0A' : '#F5F5F5';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgColor }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-30"
        style={{ background: bgColor, borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronRight size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>

          <div className="text-center">
            <h1 className="text-lg font-bold" style={{ color: textColor }}>
              {selectedApiProduct ? selectedApiProduct.title : selectedWalletPackage ? selectedWalletPackage.name : selectedWalletService ? selectedWalletService.name : categoryName}
            </h1>
            {(selectedApiProduct || selectedWalletPackage || selectedWalletService) && (
              <p className="text-[10px]" style={{ color: subtleTextColor }}>{categoryName}</p>
            )}
          </div>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <Search size={20} strokeWidth={1.5} color={isDark ? '#CCC' : '#666'} />
          </button>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden px-4 pb-3"
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', border: `1px solid ${borderColor}` }}
              >
                <Search size={16} strokeWidth={1.5} color={subtleTextColor} />
                <input
                  type="text"
                  placeholder="ابحث عن خدمة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: textColor }}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-xs font-medium" style={{ color: '#5C1A1B' }}>
                    مسح
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto pb-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <AnimatePresence mode="wait">
          {/* API Product Purchase Dialog */}
          {selectedApiProduct ? (
            <motion.div
              key="api-purchase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 pt-4"
            >
              <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                {/* Product Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    {selectedApiProduct.icon ? (
                      <img src={selectedApiProduct.icon} alt="" className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Package size={24} color={isDark ? '#888' : '#666'} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold" style={{ color: textColor }}>{selectedApiProduct.title}</h3>
                    <p className="text-lg font-bold mt-1" style={{ color: '#5C1A1B' }}>
                      ${formatPrice(selectedApiProduct.unit_price)} $
                    </p>
                    {selectedApiProduct.stock !== undefined && (
                      <p className="text-[10px] mt-0.5" style={{ color: subtleTextColor }}>
                        المتوفر: {selectedApiProduct.stock}
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Input */}
                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: secondaryTextColor }}>
                    معرف العميل / رقم الحساب
                  </label>
                  <input
                    type="text"
                    value={customerInput}
                    onChange={(e) => setCustomerInput(e.target.value)}
                    placeholder="أدخل معرف العميل"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    dir="ltr"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  />
                </div>

                {/* Purchase Button */}
                <button
                  onClick={handleApiProductPurchase}
                  disabled={!customerInput.trim() || isPurchasing}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: (!customerInput.trim() || isPurchasing) ? '#666' : '#5C1A1B',
                    boxShadow: (!customerInput.trim() || isPurchasing) ? 'none' : '0 4px 12px rgba(92,26,27,0.3)',
                  }}
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري المعالجة...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShoppingCart size={16} />
                      تأكيد الشراء
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          ) : selectedWalletPackage ? (
            /* Wallet Package Purchase Dialog */
            <motion.div
              key="wallet-purchase"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 pt-4"
            >
              <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    {selectedWalletService?.icon ? (
                      <img src={selectedWalletService.icon} alt="" className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Wallet size={24} color={isDark ? '#888' : '#666'} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold" style={{ color: textColor }}>{selectedWalletPackage.name}</h3>
                    {selectedWalletPackage.price !== undefined && (
                      <p className="text-lg font-bold mt-1" style={{ color: '#5C1A1B' }}>
                        {formatPrice(selectedWalletPackage.price)} $
                      </p>
                    )}
                    {selectedWalletPackage.description && (
                      <p className="text-[10px] mt-0.5" style={{ color: subtleTextColor }}>
                        {selectedWalletPackage.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: secondaryTextColor }}>
                    {selectedWalletService?.inputLabel || 'معرف العميل / رقم الحساب'}
                  </label>
                  <input
                    type={selectedWalletService?.inputType === 'phone' ? 'tel' : 'text'}
                    value={customerInput}
                    onChange={(e) => setCustomerInput(e.target.value)}
                    placeholder={selectedWalletService?.inputLabel || 'أدخل معرف العميل'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    dir="ltr"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  />
                </div>

                <button
                  onClick={handleWalletPackagePurchase}
                  disabled={!customerInput.trim() || isPurchasing}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: (!customerInput.trim() || isPurchasing) ? '#666' : '#5C1A1B',
                    boxShadow: (!customerInput.trim() || isPurchasing) ? 'none' : '0 4px 12px rgba(92,26,27,0.3)',
                  }}
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري المعالجة...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShoppingCart size={16} />
                      تأكيد الشراء
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          ) : selectedUsdtProvider && viewMode === 'usdt-purchase' ? (
            /* USDT Purchase Dialog — custom quantity + wallet address */
            <motion.div
              key={`usdt-purchase-${selectedUsdtProvider.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 pt-4"
            >
              <div className="rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                {/* Provider Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    {selectedUsdtProvider.image_url ? (
                      <img src={selectedUsdtProvider.image_url} alt="" className="w-10 h-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Wallet size={24} color={isDark ? '#888' : '#666'} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold" style={{ color: textColor }}>{selectedUsdtProvider.name}</h3>
                    {selectedUsdtProvider.description && (
                      <p className="text-[10px] mt-0.5" style={{ color: subtleTextColor }}>
                        {selectedUsdtProvider.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live price preview */}
                {(() => {
                  const qty = parseFloat(usdtQuantity) || 0;
                  const providerPkgs = usdtPackages.filter(p => p.provider_id === selectedUsdtProvider.id);
                  let unitPrice = 1.16;
                  if (providerPkgs.length > 0) {
                    const withRates = providerPkgs.map(p => {
                      const amt = parseFloat(p.name.replace(/[^0-9.]/g, '')) || 0;
                      return { amt, rate: amt > 0 ? Number(p.price_usd) / amt : 0 };
                    }).filter(r => r.rate > 0).sort((a, b) => a.amt - b.amt);
                    if (withRates.length > 0) {
                      const matched = withRates.find(r => r.amt >= qty) || withRates[0];
                      unitPrice = matched.rate;
                    }
                  }
                  const total = qty > 0 ? (qty * unitPrice).toFixed(2) : '0.00';
                  return (
                    <div className="mb-4 rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="flex items-center justify-between text-xs">
                        <span style={{ color: secondaryTextColor }}>السعر الإجمالي</span>
                        <span className="font-bold" style={{ color: '#5C1A1B' }}>${total}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-1">
                        <span style={{ color: subtleTextColor }}>سعر الوحدة</span>
                        <span style={{ color: subtleTextColor }}>${unitPrice.toFixed(4)} / USDT</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Quantity input */}
                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: secondaryTextColor }}>
                    الكمية (USDT)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={usdtQuantity}
                    onChange={(e) => setUsdtQuantity(e.target.value)}
                    placeholder="أدخل كمية USDT"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    dir="ltr"
                    min="0"
                    step="any"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  />
                </div>

                {/* Wallet address input */}
                <div className="mb-4">
                  <label className="text-xs font-medium block mb-1.5" style={{ color: secondaryTextColor }}>
                    {selectedUsdtProvider.input_label || 'عنوان محفظة USDT'}
                  </label>
                  <input
                    type="text"
                    value={usdtWalletAddress}
                    onChange={(e) => setUsdtWalletAddress(e.target.value)}
                    placeholder={selectedUsdtProvider.input_label || 'أدخل عنوان محفظة USDT'}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    dir="ltr"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                    }}
                  />
                </div>

                {/* Show a deposit wallet address if buying (admin's USDT wallet) */}
                {selectedUsdtProvider.sub_section_id === 'buy-usdt' && usdtWalletAddresses.length > 0 && (
                  <div className="mb-4 rounded-xl p-3" style={{ background: isDark ? 'rgba(38,161,123,0.08)' : 'rgba(38,161,123,0.05)', border: `1px solid rgba(38,161,123,0.2)` }}>
                    <p className="text-[11px] font-bold mb-2" style={{ color: '#26A17B' }}>
                      عنوان الإيداع (لتحويل المبلغ):
                    </p>
                    {usdtWalletAddresses.map((wa) => (
                      <div key={wa.id} className="mb-2 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold" style={{ color: secondaryTextColor }}>
                            {wa.network_name || wa.network}
                          </span>
                          <button
                            onClick={() => {
                              try { navigator.clipboard.writeText(wa.address); } catch {}
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(38,161,123,0.15)', color: '#26A17B' }}
                          >
                            نسخ
                          </button>
                        </div>
                        <p className="text-[11px] font-mono break-all" dir="ltr" style={{ color: textColor }}>
                          {wa.address}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleUsdtPurchase}
                  disabled={!usdtQuantity.trim() || !usdtWalletAddress.trim() || parseFloat(usdtQuantity) <= 0 || isPurchasing}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: (!usdtQuantity.trim() || !usdtWalletAddress.trim() || parseFloat(usdtQuantity) <= 0 || isPurchasing) ? '#666' : '#5C1A1B',
                    boxShadow: (!usdtQuantity.trim() || !usdtWalletAddress.trim() || parseFloat(usdtQuantity) <= 0 || isPurchasing) ? 'none' : '0 4px 12px rgba(92,26,27,0.3)',
                  }}
                >
                  {isPurchasing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      جاري المعالجة...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ShoppingCart size={16} />
                      تأكيد الشراء
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          ) : isApiCategory && viewMode === 'api-products' && apiCategoryData ? (
            /* API Products View */
            <motion.div
              key="api-products"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4"
            >
              {/* Provider badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  {apiCategoryData.provider.name}
                </span>
              </div>

              {/* Products grid */}
              {apiCategoryData.products.length > 0 ? (
                <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="grid grid-cols-2 gap-2">
                    {apiCategoryData.products.map((product, pIndex) => {
                      const rawPrice = product.unit_price;
                      const priceUSD = rawPrice * 1.16; // Apply 16% markup
                      return (
                        <motion.button
                          key={String(product.id)}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                          onClick={() => {
                            setSelectedApiProduct({
                              ...product,
                              unit_price: priceUSD,
                            });
                            setCustomerInput('');
                          }}
                          whileTap={{ scale: 0.93 }}
                          className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            {product.icon ? (
                              <img src={product.icon} alt="" className="w-9 h-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <Package size={20} color={isDark ? '#888' : '#666'} />
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                            {product.title}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: '#5C1A1B' }}>
                            {formatPrice(priceUSD)} $
                          </span>
                          {product.stock !== undefined && product.stock > 0 && (
                            <span className="text-[8px]" style={{ color: subtleTextColor }}>
                              متوفر: {product.stock}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                    <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد منتجات</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم مزامنة المنتجات بعد</p>
                </div>
              )}
            </motion.div>
          ) : !isApiCategory && sectionType === 'api-products' && viewMode === 'api-subsections' ? (
            /* Level 1: Sub-sections Grid for api-products sections (digital) */
            <motion.div
              key="api-subsections"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 pt-4"
            >
              <div className="mb-4">
                <p className="text-sm" style={{ color: secondaryTextColor }}>
                  اختر القسم الفرعي لعرض المنتجات المتاحة
                </p>
              </div>

              {subSections.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {subSections.map((sub, index) => (
                    <motion.button
                      key={sub.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(0.03 * index, 0.4), duration: 0.25 }}
                      onClick={() => handleApiSubSectionClick(sub)}
                      whileTap={{ scale: 0.93 }}
                      className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors text-right"
                      style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        {sub.image ? (
                          <img src={sub.image} alt={sub.name} className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : sub.iconType === 'image' && sub.icon ? (
                          <img src={sub.icon} alt={sub.name} className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : sub.iconType === 'emoji' && sub.icon ? (
                          <span className="text-3xl">{sub.icon}</span>
                        ) : (
                          <Package size={22} color={isDark ? '#888' : '#666'} />
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {sub.nameAr || sub.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                    <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد أقسام فرعية</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم تتم إضافة أقسام فرعية لهذا القسم بعد</p>
                </div>
              )}
            </motion.div>
          ) : !isApiCategory && sectionType === 'api-products' && viewMode === 'api-products' && selectedApiSubSection ? (
            /* Level 2 + 3: Scoped api_categories filter tabs + api_products grid */
            <motion.div
              key={`api-products-${selectedApiSubSection.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4"
            >
              {/* Sub-section header */}
              <div className="flex items-center gap-2 mb-3">
                {selectedApiSubSection.image && (
                  <img src={selectedApiSubSection.image} alt="" className="w-5 h-5 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  {selectedApiSubSection.nameAr || selectedApiSubSection.name}
                </span>
              </div>

              {apiSubSectionLoading ? (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <span className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm mt-3" style={{ color: subtleTextColor }}>جاري تحميل المنتجات...</p>
                </div>
              ) : apiSubSectionProducts.length > 0 ? (
                <>
                  {/* Level 2: Category filter tabs */}
                  {apiSubSectionCategories.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <button
                        onClick={() => setApiSubCategoryFilter(null)}
                        className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                        style={{
                          background: !apiSubCategoryFilter ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: !apiSubCategoryFilter ? '#FFFFFF' : secondaryTextColor,
                        }}
                      >
                        الكل
                      </button>
                      {apiSubSectionCategories.map((cat) => (
                        <button
                          key={cat.api_category_id || cat.id}
                          onClick={() => setApiSubCategoryFilter(cat.api_category_id)}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                          style={{
                            background: apiSubCategoryFilter === cat.api_category_id ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            color: apiSubCategoryFilter === cat.api_category_id ? '#FFFFFF' : secondaryTextColor,
                          }}
                        >
                          {cat.image_url && (
                            <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          {cat.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Level 3: Products grid */}
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      {(apiSubCategoryFilter
                        ? apiSubSectionProducts.filter(p => String(p.api_category_id) === String(apiSubCategoryFilter))
                        : apiSubSectionProducts
                      ).map((product, pIndex) => {
                        const rawPrice = Number(product.price) || Number(product.unit_price) || 0;
                        const finalPrice = Number(product.final_price_usd) || rawPrice;
                        return (
                          <motion.button
                            key={product.id || product.api_product_id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.min(0.03 * pIndex, 0.4), duration: 0.25 }}
                            onClick={() => {
                              setSelectedApiProduct({
                                id: product.api_product_id || product.id,
                                title: product.name || product.title || '',
                                unit_price: finalPrice,
                                stock: product.stock || 0,
                                icon: product.image_url || '',
                                image_url: product.image_url || '',
                                description: product.description || '',
                                category_id: product.api_category_id,
                                isActive: true,
                              });
                              setCustomerInput('');
                            }}
                            whileTap={{ scale: 0.93 }}
                            className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          >
                            <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                              {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-11 h-11 object-contain" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }} />
                              ) : (
                                <Package size={22} color={isDark ? '#888' : '#666'} />
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                              {product.name || product.title}
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: '#5C1A1B' }}>
                              {formatPrice(finalPrice)} $
                            </span>
                            {product.stock > 0 && (
                              <span className="text-[8px]" style={{ color: subtleTextColor }}>
                                متوفر: {product.stock}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                    <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد منتجات</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم ربط منتجات بهذا القسم الفرعي بعد</p>
                </div>
              )}
            </motion.div>
          ) : !isApiCategory && sectionType === 'usdt' && viewMode === 'usdt-section' ? (
            /* USDT Section: sub_section tabs + providers grid */
            <motion.div
              key="usdt-section"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
            >
              {/* Sub-section tabs (buy-usdt / sell-usdt / usdt-plans) */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {subSections.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => { setUsdtSubSection(sub.id); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                      style={{
                        background: usdtSubSection === sub.id ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: usdtSubSection === sub.id ? '#FFFFFF' : secondaryTextColor,
                        boxShadow: usdtSubSection === sub.id ? '0 2px 8px rgba(92,26,27,0.3)' : 'none',
                      }}
                    >
                      {sub.image && (
                        <img src={sub.image} alt="" className="w-4 h-4 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                      {sub.nameAr || sub.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 mt-2">
                {usdtProvidersLoading ? (
                  <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <span className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm mt-3" style={{ color: subtleTextColor }}>جاري تحميل الخدمات...</p>
                  </div>
                ) : (() => {
                  const providers = usdtProviders.filter(p => p.sub_section_id === usdtSubSection);
                  return providers.length > 0 ? (
                    <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div className="grid grid-cols-3 gap-2">
                        {providers.map((provider, pIndex) => {
                          const providerPkgs = usdtPackages.filter(p => p.provider_id === provider.id);
                          const startingPrice = providerPkgs.length > 0
                            ? Math.min(...providerPkgs.map(p => Number(p.price_usd) || Infinity))
                            : 0;
                          return (
                            <motion.button
                              key={provider.id}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: Math.min(0.03 * pIndex, 0.4), duration: 0.25 }}
                              onClick={() => handleUsdtProviderClick(provider)}
                              whileTap={{ scale: 0.93 }}
                              className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors"
                              style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                            >
                              <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                                {provider.image_url ? (
                                  <img src={provider.image_url} alt={provider.name} className="w-12 h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                  <Wallet size={22} color={isDark ? '#888' : '#666'} />
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {provider.name}
                              </span>
                              {startingPrice > 0 && startingPrice !== Infinity && (
                                <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                                  من {formatPrice(startingPrice)} $
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                        <Wallet size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد خدمات</p>
                      <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم تتم إضافة خدمات لهذا القسم بعد</p>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          ) : !isApiCategory && sectionType === 'api-products' ? (
            /* API Products from Supabase api_products table (fallback flat list) */
            <motion.div
              key="supabase-api-products"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 pt-4"
            >
              {apiProductsLoading ? (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <span className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm mt-3" style={{ color: subtleTextColor }}>جاري تحميل المنتجات...</p>
                </div>
              ) : supabaseApiProducts.length > 0 ? (
                <>
                  {/* Category tabs if multiple categories exist.
                      Each category chip shows its image (from G2Bulk) if available. */}
                  {supabaseApiCategories.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <button
                        onClick={() => setApiCategoryFilter(null)}
                        className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                        style={{
                          background: !apiCategoryFilter ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: !apiCategoryFilter ? '#FFFFFF' : secondaryTextColor,
                        }}
                      >
                        الكل
                      </button>
                      {supabaseApiCategories
                        .filter(c => c.product_count > 0) // only show categories that have products
                        .map((cat) => (
                        <button
                          key={cat.api_category_id}
                          onClick={() => setApiCategoryFilter(cat.api_category_id)}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                          style={{
                            background: apiCategoryFilter === cat.api_category_id ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            color: apiCategoryFilter === cat.api_category_id ? '#FFFFFF' : secondaryTextColor,
                          }}
                        >
                          {cat.image_url && (
                            <img src={cat.image_url} alt="" className="w-4 h-4 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          {cat.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      {(apiCategoryFilter
                        ? supabaseApiProducts.filter(p => String(p.api_category_id) === String(apiCategoryFilter))
                        : supabaseApiProducts
                      ).map((product, pIndex) => {
                        // The sync already stored the markup-included price in
                        // product_packages.price_usd. api_products.price holds
                        // the raw cost (no markup). We use the package price if
                        // available, otherwise fall back to cost + 16%.
                        const rawPrice = Number(product.price) || Number(product.unit_price) || 0;
                        const finalPrice = Number(product.final_price_usd) || rawPrice;
                        return (
                          <motion.button
                            key={product.id || product.api_product_id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                            onClick={() => {
                              setSelectedApiProduct({
                                id: product.api_product_id || product.id,
                                title: product.name || product.title || '',
                                unit_price: finalPrice,
                                stock: product.stock || 0,
                                icon: product.image_url || '',
                                image_url: product.image_url || '',
                                description: product.description || '',
                                category_id: product.api_category_id,
                                isActive: true,
                              });
                              setCustomerInput('');
                            }}
                            whileTap={{ scale: 0.93 }}
                            className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          >
                            <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                              {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-11 h-11 object-contain" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; }} />
                              ) : (
                                <Package size={22} color={isDark ? '#888' : '#666'} />
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                              {product.name || product.title}
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: '#5C1A1B' }}>
                              {formatPrice(finalPrice)} $
                            </span>
                            {product.stock > 0 && (
                              <span className="text-[8px]" style={{ color: subtleTextColor }}>
                                متوفر: {product.stock}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                    <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد منتجات</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم مزامنة المنتجات بعد</p>
                </div>
              )}
            </motion.div>
          ) : !isApiCategory && sectionType === 'api' && apiCategoriesForSection.length > 0 ? (
            /* API Categories List for section with apiProviderId */
            <motion.div
              key="api-section-categories"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 pt-4"
            >
              <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="grid grid-cols-2 gap-2">
                  {apiCategoriesForSection.map((item, pIndex) => {
                    const productsCount = item.category.products ? Object.values(item.category.products).filter((p: any) => p && p.isActive !== false).length : 0;
                    return (
                      <motion.button
                        key={`${item.providerId}-${item.categoryId}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                        onClick={() => handleApiCategoryClick(item.providerId, item.categoryId)}
                        whileTap={{ scale: 0.93 }}
                        className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                        style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                      >
                        <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                          {item.category.icon ? (
                            <img src={item.category.icon} alt="" className="w-9 h-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <Package size={20} color={isDark ? '#888' : '#666'} />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                          {item.category.title}
                        </span>
                        {productsCount > 0 && (
                          <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                            {productsCount} منتج
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ) : !isApiCategory && sectionType === 'wallet-services' && viewMode === 'wallet-packages' && selectedWalletService ? (
            /* Wallet Service Packages */
            <motion.div
              key={`wallet-packages-${selectedWalletService.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4"
            >
              {/* Service badge */}
              <div className="flex items-center gap-2 mb-3">
                {selectedWalletService.icon ? (
                  <img src={selectedWalletService.icon} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Wallet size={14} color="#5C1A1B" />
                )}
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  {selectedWalletService.name}
                </span>
              </div>

              {/* Packages grid */}
              {(() => {
                const pkgs = safeArray<WalletServicePackage>(selectedWalletService.packages).filter(p => p.isActive !== false);
                return pkgs.length > 0 ? (
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-2 gap-2">
                      {pkgs.map((pkg, pIndex) => (
                        <motion.button
                          key={pkg.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                          onClick={() => { setSelectedWalletPackage(pkg); setCustomerInput(''); }}
                          whileTap={{ scale: 0.93 }}
                          className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl transition-colors text-right"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            {selectedWalletService.icon ? (
                              <img src={selectedWalletService.icon} alt="" className="w-9 h-9 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <Package size={20} color={isDark ? '#888' : '#666'} />
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-center leading-tight max-w-[130px]" style={{ color: textColor }}>
                            {pkg.name}
                          </span>
                          {pkg.price !== undefined && (
                            <span className="text-[11px] font-bold" style={{ color: '#5C1A1B' }}>
                              {formatPrice(pkg.price)} $
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                      <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد باقات</p>
                    <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم إضافة باقات لهذه الخدمة بعد</p>
                  </div>
                );
              })()}
            </motion.div>
          ) : !isApiCategory && sectionType === 'wallet-services' && viewMode === 'products' ? (
            /* Wallet Services List */
            <motion.div
              key="wallet-services-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 pt-4"
            >
              {walletServicesForSection.length > 0 ? (
                <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="grid grid-cols-3 gap-2">
                    {walletServicesForSection.map((ws, pIndex) => {
                      const startingPrice = ws.packages ? Math.min(...safeArray<WalletServicePackage>(ws.packages).filter(p => p.isActive !== false && p.price).map(p => p.price || Infinity)) : (STARTING_PRICES[ws.id] || 0);
                      return (
                        <motion.button
                          key={ws.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                          onClick={() => handleWalletServiceClick(ws)}
                          whileTap={{ scale: 0.93 }}
                          className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors"
                          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                            <ProductImage providerId={ws.id} providerName={ws.name} size="lg" iconUrl={ws.icon} />
                          </div>
                          <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ws.name}
                          </span>
                          {startingPrice > 0 && startingPrice !== Infinity && (
                            <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                              من {formatPrice(startingPrice)} $
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                    <Package size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد خدمات</p>
                  <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>لم يتم إضافة خدمات بعد</p>
                </div>
              )}
            </motion.div>
          ) : hasSubSections && viewMode === 'subsections' ? (
            /* Sub-sections Grid (normal categories) */
            <motion.div
              key="subsections"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="px-4 pt-4"
            >
              <div className="mb-4">
                <p className="text-sm" style={{ color: secondaryTextColor }}>
                  اختر القسم الفرعي لعرض الخدمات المتاحة
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {resolvedSubSections.map((sub, index) => (
                  <motion.button
                    key={sub.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.06 * index, duration: 0.35 }}
                    onClick={() => handleSubSectionClick(sub.id)}
                    whileTap={{ scale: 0.95 }}
                    className="relative overflow-hidden rounded-2xl text-right active:scale-[0.97] transition-transform"
                    style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}
                  >
                    <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl" style={{ background: sub.color }} />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-[0.06]" style={{ background: sub.color }} />
                    <div className="relative z-10 p-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        <SubSectionImage icon={sub.icon} iconType={sub.iconType} color={sub.color} />
                      </div>
                      <h3 className="text-sm font-bold mb-1" style={{ color: textColor }}>{sub.nameAr || sub.name}</h3>
                      <p className="text-[10px] leading-relaxed mb-2" style={{ color: subtleTextColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {sub.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sub.color}15`, color: sub.color }}>
                          {sub.providers.length} خدمة
                        </span>
                        <ChevronLeft size={14} strokeWidth={1.5} color={subtleTextColor} />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : hasSubSections && viewMode === 'products' ? (
            /* Products in selected sub-section */
            <motion.div
              key={`products-${selectedSubSection}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="px-4 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {resolvedSubSections.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => { setSelectedSubSection(sub.id); setSearchQuery(''); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                      className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95"
                      style={{
                        background: selectedSubSection === sub.id ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        color: selectedSubSection === sub.id ? '#FFFFFF' : secondaryTextColor,
                        boxShadow: selectedSubSection === sub.id ? '0 2px 8px rgba(92,26,27,0.3)' : 'none',
                      }}
                    >
                      {sub.nameAr || sub.name}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProviders.length > 0 ? (
                <div className="px-4 mt-2">
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredProviders.map((provider, pIndex) => {
                        const startingPrice = STARTING_PRICES[provider.id] || 0;
                        return (
                          <motion.button
                            key={provider.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                            onClick={() => handleProviderClick(provider.id)}
                            whileTap={{ scale: 0.93 }}
                            className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors"
                            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          >
                            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                              <ProductImage providerId={provider.id} providerName={provider.name} size="lg" />
                            </div>
                            <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {provider.name}
                            </span>
                            {startingPrice > 0 && (
                              <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                                من {formatPrice(startingPrice)} $
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 mt-8">
                  <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                      <Search size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد نتائج</p>
                    <p className="text-[11px] mt-1" style={{ color: isDark ? '#444' : '#CCC' }}>جرب البحث بكلمات مختلفة</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Flat grid for categories without sub-sections */
            <motion.div
              key="flat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.35 }}
              className="px-4 mt-4"
            >
              {(() => {
                const displayProviders = searchQuery.trim()
                  ? flatProviders.filter(p => p.name.includes(searchQuery.trim()))
                  : flatProviders;
                return displayProviders.length > 0 ? (
                  <div className="rounded-2xl p-3" style={{ background: cardBg, border: `1px solid ${borderColor}`, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div className="grid grid-cols-3 gap-2">
                      {displayProviders.map((provider, pIndex) => {
                        const startingPrice = STARTING_PRICES[provider.id] || 0;
                        return (
                          <motion.button
                            key={provider.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.03 * pIndex, duration: 0.25 }}
                            onClick={() => handleProviderClick(provider.id)}
                            whileTap={{ scale: 0.93 }}
                            className="flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl transition-colors"
                            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                          >
                            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                              <ProductImage providerId={provider.id} providerName={provider.name} size="lg" />
                            </div>
                            <span className="text-[11px] font-semibold text-center leading-tight max-w-[90px]" style={{ color: textColor, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {provider.name}
                            </span>
                            {startingPrice > 0 && (
                              <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>
                                من {formatPrice(startingPrice)} $
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-8 flex flex-col items-center" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: isDark ? '#222' : '#F5F5F5' }}>
                      <Search size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد نتائج</p>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
