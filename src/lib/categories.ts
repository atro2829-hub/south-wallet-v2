// Categories Service - محفظة الجنوب
// Dynamic sections/categories loaded from Supabase - NO Firebase, NO hardcoded data

import { supabase, supabaseService } from './supabase';
import type { DbSubSection } from './supabase';

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

export interface DynamicSubSection {
  id: string;
  sectionId: string;
  name: string;
  nameAr: string;
  nameEn: string;
  description: string;
  icon: string;
  iconType: 'lucide' | 'emoji' | 'image';
  color: string;
  image: string;
  order: number;
  isVisible: boolean;
  isActive: boolean;
  type: string;
  apiCategoryId: string;
  apiProviderId: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Sections CRUD =====

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

// ===== Sub-Sections CRUD =====

export async function getSubSections(sectionId: string): Promise<DynamicSubSection[]> {
  try {
    const subs = await supabaseService.getSubSections(sectionId);
    return subs.map(mapDbSubSectionToDynamic);
  } catch (error) {
    console.error('Error fetching sub-sections:', error);
    return [];
  }
}

export async function getAllSubSections(sectionId: string): Promise<DynamicSubSection[]> {
  try {
    const subs = await supabaseService.getAllSubSections(sectionId);
    return subs.map(mapDbSubSectionToDynamic);
  } catch (error) {
    console.error('Error fetching all sub-sections:', error);
    return [];
  }
}

export async function saveSubSection(sub: Partial<DynamicSubSection> & { name: string; sectionId: string }): Promise<string> {
  const now = new Date().toISOString();
  const subData: any = {
    section_id: sub.sectionId,
    name: sub.nameAr || sub.name,
    name_en: sub.nameEn || sub.name,
    description: sub.description || '',
    icon: sub.icon || '📋',
    color: sub.color || '#5C1A1B',
    image_url: sub.image || '',
    sort_order: sub.order ?? 0,
    is_active: sub.isVisible ?? true,
    is_visible: sub.isVisible ?? true,
    type: mapScreenTypeToSubType(sub.type),
    api_category_id: sub.apiCategoryId || '',
    api_provider_id: sub.apiProviderId || '',
    updated_at: now,
  };

  if (sub.id) {
    const { data, error } = await supabase
      .from('sub_sections')
      .update(subData)
      .eq('id', sub.id)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } else {
    subData.id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    subData.created_at = now;
    const { data, error } = await supabase
      .from('sub_sections')
      .insert(subData)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }
}

export async function deleteSubSection(id: string): Promise<void> {
  const { error } = await supabase.from('sub_sections').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleSubSection(id: string, isVisible: boolean): Promise<void> {
  try {
    await supabaseService.toggleSubSectionVisibility(id, isVisible);
  } catch (error) {
    console.error('Error toggling sub-section:', error);
    throw error;
  }
}

export async function reorderSubSections(sectionId: string, subs: DynamicSubSection[]): Promise<void> {
  const updates = subs.map((sub, index) =>
    supabase.from('sub_sections').update({ sort_order: index }).eq('id', sub.id)
  );
  await Promise.all(updates);
}

// ===== Realtime Subscription =====

export function subscribeToCategories(
  callback: (categories: DynamicCategory[]) => void
): () => void {
  // Initial fetch
  getCategories().then(callback);

  // Subscribe to realtime changes with unique channel name
  const channelName = `categories-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => {
      getCategories().then(callback);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_sections' }, () => {
      getCategories().then(callback);
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
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
    color: section.color || '#5C1A1B',
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

function mapDbSubSectionToDynamic(sub: DbSubSection): DynamicSubSection {
  return {
    id: sub.id,
    sectionId: sub.section_id,
    name: sub.name || sub.name_en || '',
    nameAr: sub.name || '',
    nameEn: sub.name_en || sub.name || '',
    description: sub.description || '',
    icon: sub.icon || '📋',
    iconType: getIconType(sub.icon),
    color: sub.color || '#5C1A1B',
    image: sub.image_url || '',
    order: sub.sort_order ?? 0,
    isVisible: sub.is_visible ?? true,
    isActive: sub.is_active ?? true,
    type: sub.type || 'manual',
    apiCategoryId: sub.api_category_id || '',
    apiProviderId: sub.api_provider_id || '',
    createdAt: sub.created_at || '',
    updatedAt: sub.updated_at || '',
  };
}

function mapCategoryToSection(cat: Partial<DynamicCategory> & { name: string }, now: string): any {
  return {
    id: cat.id || undefined,
    name: cat.nameAr || cat.name,
    name_en: cat.nameEn || cat.name,
    description: cat.description || cat.descriptionAr || '',
    icon: cat.icon || '📋',
    color: cat.color || '#5C1A1B',
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
  if (!icon) return 'lucide';
  // Common lucide icon names
  const lucideIcons = [
    'Gamepad2', 'Gift', 'Wallet', 'Coins', 'ArrowLeftRight', 'Phone', 'ShoppingBag',
    'Zap', 'Globe', 'CreditCard', 'Smartphone', 'Shield', 'Star', 'ShieldAlert',
    'Heart', 'RefreshCw', 'Sparkles', 'Clock', 'Receipt', 'FileText', 'Send',
    'Download', 'ArrowRightLeft', 'Bell', 'Eye', 'EyeOff', 'Plus', 'ChevronLeft',
    'ChevronRight', 'QrCode', 'ScanLine', 'X', 'Wifi', 'Headphones', 'HandCoins',
    'ArrowUpRight', 'ArrowDownLeft', 'LayoutGrid', 'ShieldCheck', 'TrendingUp',
    'Landmark', 'CircleDollarSign', 'Link2',
  ];
  if (lucideIcons.includes(icon)) return 'lucide';
  if (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:')) return 'image';
  // Check if it's an emoji (unicode characters)
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;
  if (emojiRegex.test(icon)) return 'emoji';
  // Default to lucide for any other string (will show fallback icon via LucideIconRenderer)
  return 'lucide';
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
    'link': 'link',
    'exchange': 'exchange',
    'usdt': 'wallet',
    'telecom': 'telecom',
    'investment': 'investment',
    'escrow': 'escrow',
  };
  return mapping[screenType || 'manual'] || 'manual';
}

function mapScreenTypeToSubType(type?: string): string {
  const validTypes = ['manual', 'api', 'wallet', 'exchange', 'escrow', 'telecom', 'games', 'investment', 'link'];
  if (type && validTypes.includes(type)) return type;
  return 'manual';
}
