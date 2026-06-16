// Categories Service - محفظة الجنوب
// Dynamic sections/categories loaded from Supabase - NO Firebase, NO hardcoded data

import { supabase } from './supabase';

export interface DynamicCategory {
  id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  icon: string; // lucide icon name or emoji
  iconType: 'lucide' | 'emoji' | 'image';
  color: string; // tailwind color class
  order: number;
  isVisible: boolean;
  screenType: 'api-products' | 'api-games' | 'manual' | 'link' | 'exchange' | 'usdt' | 'telecom' | 'investment' | 'escrow';
  apiProviderId: string; // reference to api_providers
  description: string;
  descriptionAr: string;
  image: string; // optional image URL
  showInHome: boolean; // show in home screen grid
  showInServices: boolean; // show in services tab
  createdAt: string;
  updatedAt: string;
}

// ===== CRUD =====

export async function getCategories(): Promise<DynamicCategory[]> {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return (data || []).map(mapSectionToCategory).filter(c => c.isVisible);
}

export async function getAllCategories(): Promise<DynamicCategory[]> {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching all categories:', error);
    return [];
  }

  return (data || []).map(mapSectionToCategory);
}

export async function saveCategory(cat: Partial<DynamicCategory> & { name: string }): Promise<string> {
  const now = new Date().toISOString();
  const sectionData = mapCategoryToSection(cat, now);

  if (cat.id) {
    // Update existing
    const { data, error } = await supabase
      .from('sections')
      .update(sectionData)
      .eq('id', cat.id)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('sections')
      .insert(sectionData)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleCategory(id: string, isVisible: boolean): Promise<void> {
  const { error } = await supabase
    .from('sections')
    .update({ is_visible: isVisible, is_active: isVisible, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function reorderCategories(categories: DynamicCategory[]): Promise<void> {
  const updates = categories.map((cat, index) =>
    supabase.from('sections').update({ sort_order: index }).eq('id', cat.id)
  );
  await Promise.all(updates);
}

// ===== Realtime Subscription =====

export function subscribeToCategories(
  callback: (categories: DynamicCategory[]) => void
): () => void {
  // Initial fetch
  getCategories().then(callback);

  // Subscribe to realtime changes
  const channel = supabase
    .channel('categories-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => {
      getCategories().then(callback);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ===== Initialize Default Categories =====

export async function initializeDefaultCategories(): Promise<void> {
  const existing = await getAllCategories();
  if (existing.length > 0) return;

  const defaults: Omit<DynamicCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'الألعاب',
      nameAr: 'الألعاب',
      nameEn: 'Games',
      icon: 'Gamepad2',
      iconType: 'lucide',
      color: 'bg-red-500',
      order: 0,
      isVisible: true,
      screenType: 'api-games',
      apiProviderId: '',
      description: 'شحن الألعاب وشراء UC و diamonds',
      descriptionAr: 'شحن الألعاب وشراء UC و diamonds',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'بطاقات الهدايا',
      nameAr: 'بطاقات الهدايا',
      nameEn: 'Gift Cards',
      icon: 'Gift',
      iconType: 'lucide',
      color: 'bg-amber-500',
      order: 1,
      isVisible: true,
      screenType: 'api-products',
      apiProviderId: '',
      description: 'بطاقات رقمية متنوعة',
      descriptionAr: 'بطاقات رقمية متنوعة',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'المحافظ الرقمية',
      nameAr: 'المحافظ الرقمية',
      nameEn: 'Digital Wallets',
      icon: 'Wallet',
      iconType: 'lucide',
      color: 'bg-teal-500',
      order: 2,
      isVisible: true,
      screenType: 'api-products',
      apiProviderId: '',
      description: 'شحن المحافظ الرقمية',
      descriptionAr: 'شحن المحافظ الرقمية',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'شراء USDT',
      nameAr: 'شراء USDT',
      nameEn: 'Buy USDT',
      icon: 'Coins',
      iconType: 'lucide',
      color: 'bg-green-500',
      order: 3,
      isVisible: true,
      screenType: 'usdt',
      apiProviderId: '',
      description: 'شراء وبيع USDT',
      descriptionAr: 'شراء وبيع USDT',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'صرف العملات',
      nameAr: 'صرف العملات',
      nameEn: 'Exchange',
      icon: 'ArrowLeftRight',
      iconType: 'lucide',
      color: 'bg-cyan-500',
      order: 4,
      isVisible: true,
      screenType: 'exchange',
      apiProviderId: '',
      description: 'تحويل العملات',
      descriptionAr: 'تحويل العملات',
      image: '',
      showInHome: true,
      showInServices: true,
    },
    {
      name: 'الاتصالات',
      nameAr: 'الاتصالات',
      nameEn: 'Telecom',
      icon: 'Phone',
      iconType: 'lucide',
      color: 'bg-blue-500',
      order: 5,
      isVisible: true,
      screenType: 'telecom',
      apiProviderId: '',
      description: 'شحن الرصيد وباقات الإنترنت',
      descriptionAr: 'شحن الرصيد وباقات الإنترنت',
      image: '',
      showInHome: true,
      showInServices: true,
    },
  ];

  for (const def of defaults) {
    await saveCategory(def);
  }
}

// ===== Mapping Functions =====

function mapSectionToCategory(section: any): DynamicCategory {
  return {
    id: section.id,
    name: section.name || section.name_en || '',
    nameAr: section.name || '',
    nameEn: section.name_en || section.name || '',
    icon: section.icon || '📋',
    iconType: getIconType(section.icon),
    color: section.color || 'bg-primary',
    order: section.sort_order ?? 0,
    isVisible: section.is_visible ?? section.is_active ?? true,
    screenType: mapTypeToScreenType(section.type),
    apiProviderId: section.api_provider_id || '',
    description: section.description || '',
    descriptionAr: section.description || '',
    image: section.image_url || '',
    showInHome: section.is_visible ?? true,
    showInServices: section.is_active ?? true,
    createdAt: section.created_at || '',
    updatedAt: section.updated_at || '',
  };
}

function mapCategoryToSection(cat: Partial<DynamicCategory> & { name: string }, now: string): any {
  return {
    name: cat.nameAr || cat.name,
    name_en: cat.nameEn || cat.name,
    description: cat.description || cat.descriptionAr || '',
    icon: cat.icon || '📋',
    color: cat.color || 'bg-primary',
    image_url: cat.image || '',
    sort_order: cat.order ?? 0,
    is_active: cat.isVisible ?? true,
    is_visible: cat.isVisible ?? true,
    type: mapScreenTypeToType(cat.screenType),
    api_provider_id: cat.apiProviderId || '',
    updated_at: now,
  };
}

function getIconType(icon: string): 'lucide' | 'emoji' | 'image' {
  if (!icon) return 'emoji';
  // Common lucide icon names
  const lucideIcons = ['Gamepad2', 'Gift', 'Wallet', 'Coins', 'ArrowLeftRight', 'Phone', 'ShoppingBag', 'Zap', 'Globe', 'CreditCard', 'Smartphone', 'Shield', 'Star'];
  if (lucideIcons.includes(icon)) return 'lucide';
  if (icon.startsWith('http') || icon.startsWith('/')) return 'image';
  return 'emoji';
}

function mapTypeToScreenType(type: string): DynamicCategory['screenType'] {
  const mapping: Record<string, DynamicCategory['screenType']> = {
    'api': 'api-products',
    'manual': 'manual',
    'wallet': 'usdt',
    'exchange': 'exchange',
    'telecom': 'telecom',
    'games': 'api-games',
    'investment': 'investment',
    'escrow': 'escrow',
  };
  return mapping[type] || 'manual';
}

function mapScreenTypeToType(screenType?: string): string {
  const mapping: Record<string, string> = {
    'api-products': 'api',
    'api-games': 'games',
    'manual': 'manual',
    'link': 'manual',
    'exchange': 'exchange',
    'usdt': 'wallet',
    'telecom': 'telecom',
    'investment': 'investment',
    'escrow': 'escrow',
  };
  return mapping[screenType || 'manual'] || 'manual';
}
