/**
 * Firebase Services Layer for South Wallet Admin
 *
 * MIGRATED: All data reads now go through Supabase instead of Firebase RTDB.
 * Firebase is only used for Auth (authentication, FCM push notifications, Storage).
 *
 * This module provides Supabase-based data access for:
 *   - Sections (categories)
 *   - Providers (service providers)
 *   - Wallet services
 *   - API providers
 *   - Visibility settings
 *   - Feature flags
 */

import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────

export interface FirebaseSection {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  parentId?: string;
  type?: 'main' | 'sub';
  subSections?: Record<string, FirebaseSubSection>;
  providerIds?: string[];
  // For API provider sections
  apiProviderId?: string;
}

export interface FirebaseSubSection {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  parentId: string;
  providerIds?: string[];
  // For API categories within a sub-section
  apiCategoryIds?: string[];
}

export interface FirebaseProvider {
  id: string;
  name: string;
  color: string;
  icon: string;
  categoryId: string;
  sectionId?: string;
  subSectionId?: string;
  inputLabel: string;
  inputType: 'phone' | 'text' | 'number' | 'email';
  inputPrefix?: string;
  isActive: boolean;
  sortOrder?: number;
  // For API-connected providers
  apiProviderId?: string;
  apiProductId?: string;
  costPrice?: number;
  commission?: number;
  commissionType?: 'percentage' | 'fixed';
  executionType?: 'manual' | 'auto';
}

export interface FirebaseWalletService {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  categoryId: string;
  sectionId?: string;
  subSectionId?: string;
  inputLabel: string;
  inputType: string;
  inputPrefix?: string;
  isActive: boolean;
  sortOrder: number;
  packages?: Record<string, FirebasePackage>;
  createdAt: string;
  updatedAt?: string;
}

export interface FirebasePackage {
  id: string;
  name: string;
  price: number;
  currency: 'YER' | 'SAR' | 'USD';
  costPrice?: number;
  commission?: number;
  commissionType?: 'percentage' | 'fixed';
  executionType: 'manual' | 'auto';
  apiProviderId?: string;
  apiProductId?: string;
  isActive: boolean;
  sortOrder: number;
  description?: string;
}

export interface FirebaseApiProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  authHeader: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  bodyTemplate?: string;
  responseFormat: 'json' | 'xml';
  fieldMappings?: {
    statusField: string;
    successValue: string;
    balanceField?: string;
    messageField?: string;
    transactionIdField?: string;
    errorCodeField?: string;
  };
  isActive: boolean;
  syncEnabled: boolean;
  lastSync?: string;
  createdAt: string;
  // Section assignment
  sectionId?: string;
  sectionName?: string;
  sectionIcon?: string;
  // Commission
  commission?: number;
  commissionType?: 'percentage' | 'fixed';
  // Cached balance
  balance?: number;
  balanceCurrency?: string;
  lastBalanceCheck?: string;
  // Synced data
  categories?: Record<string, FirebaseApiCategory>;
}

export interface FirebaseApiCategory {
  id: number | string;
  title: string;
  icon?: string;
  slug?: string;
  sectionId?: string;
  products?: Record<string, FirebaseApiProduct>;
}

export interface FirebaseApiProduct {
  id: number | string;
  title: string;
  unit_price: number;
  stock?: number;
  icon?: string;
  description?: string;
  input_label?: string;
  input_type?: string;
  category_id?: number | string;
  isActive?: boolean;
  // Commission override
  commission?: number;
  commissionType?: 'percentage' | 'fixed';
}

// ─── Section Listeners (Supabase) ──────────────────────────────────────

/**
 * Listen to sections from Supabase with realtime updates
 */
export function listenToSections(
  callback: (sections: FirebaseSection[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Initial fetch
  fetchSectionsOnce().then(callback).catch(onError);

  // Subscribe to realtime changes
  const channel = supabase
    .channel('sections-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => {
      fetchSectionsOnce().then(callback).catch(onError);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Listen to providers from Supabase with realtime updates
 */
export function listenToProviders(
  callback: (providers: FirebaseProvider[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Initial fetch
  fetchProvidersOnce().then(callback).catch(onError);

  // Subscribe to realtime changes
  const channel = supabase
    .channel('providers-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'service_providers' }, () => {
      fetchProvidersOnce().then(callback).catch(onError);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Listen to wallet services from Supabase with realtime updates
 */
export function listenToWalletServices(
  callback: (services: FirebaseWalletService[]) => void,
  onError?: (error: Error) => void
): () => void {
  // Initial fetch from wallet_services table
  const fetchWalletServices = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []).map(mapDbWalletServiceToFirebase);
    } catch {
      return [];
    }
  };

  fetchWalletServices().then(callback).catch(onError);

  const channel = supabase
    .channel('wallet-services-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_services' }, () => {
      fetchWalletServices().then(callback).catch(onError);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Listen to API providers from Supabase with realtime updates
 */
export function listenToApiProviders(
  callback: (providers: FirebaseApiProvider[]) => void,
  onError?: (error: Error) => void
): () => void {
  const fetchApiProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('api_providers')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map(mapDbApiProviderToFirebase);
    } catch {
      return [];
    }
  };

  fetchApiProviders().then(callback).catch(onError);

  const channel = supabase
    .channel('api-providers-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'api_providers' }, () => {
      fetchApiProviders().then(callback).catch(onError);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Listen to visibility settings from Supabase
 */
export function listenToVisibility(
  callback: (sections: Record<string, boolean>, providers: Record<string, boolean>) => void,
  onError?: (error: Error) => void
): () => void {
  const fetchVisibility = async () => {
    try {
      // Build visibility from sections and providers is_active/is_visible flags
      const { data: sections } = await supabase
        .from('sections')
        .select('id, is_visible');
      
      const { data: providers } = await supabase
        .from('service_providers')
        .select('id, is_visible');

      const sectionVisibility: Record<string, boolean> = {};
      (sections || []).forEach((s: any) => {
        sectionVisibility[s.id] = s.is_visible ?? true;
      });

      const providerVisibility: Record<string, boolean> = {};
      (providers || []).forEach((p: any) => {
        providerVisibility[p.id] = p.is_visible ?? true;
      });

      callback(sectionVisibility, providerVisibility);
    } catch {
      callback({}, {});
    }
  };

  fetchVisibility().catch(onError);

  const channel = supabase
    .channel('visibility-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sections' }, () => {
      fetchVisibility().catch(onError);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'service_providers' }, () => {
      fetchVisibility().catch(onError);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * One-time fetch of sections from Supabase
 */
export async function fetchSectionsOnce(): Promise<FirebaseSection[]> {
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return (data || []).map(mapDbSectionToFirebase).filter(s => s.isActive);
  } catch {
    return [];
  }
}

/**
 * One-time fetch of providers from Supabase
 */
export async function fetchProvidersOnce(): Promise<FirebaseProvider[]> {
  try {
    const { data, error } = await supabase
      .from('service_providers')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;
    return (data || []).map(mapDbProviderToFirebase);
  } catch {
    return [];
  }
}

// ─── Mapping Functions ─────────────────────────────────────────────────

function mapDbSectionToFirebase(db: any): FirebaseSection {
  return {
    id: db.id,
    name: db.name || '',
    icon: db.icon || '',
    color: db.color || '#5C1A1B',
    sortOrder: db.sort_order || 0,
    isActive: db.is_active !== false,
    parentId: undefined,
    type: 'main',
    apiProviderId: db.api_provider_id || undefined,
  };
}

function mapDbProviderToFirebase(db: any): FirebaseProvider {
  return {
    id: db.id,
    name: db.name || '',
    color: db.color || '#5C1A1B',
    icon: db.icon || '',
    categoryId: db.section_id || '',
    sectionId: db.section_id || undefined,
    subSectionId: db.sub_section_id || undefined,
    inputLabel: db.input_label || 'معرف العميل',
    inputType: (db.input_type as any) || 'text',
    inputPrefix: db.input_prefix || undefined,
    isActive: db.is_active !== false,
    sortOrder: db.sort_order || 0,
    apiProviderId: db.api_provider_id || undefined,
    apiProductId: db.api_product_id || undefined,
    costPrice: db.cost_price || undefined,
    commission: db.commission_amount || undefined,
    commissionType: (db.commission_type as any) || undefined,
    executionType: (db.execution_type as any) || 'manual',
  };
}

function mapDbWalletServiceToFirebase(db: any): FirebaseWalletService {
  return {
    id: db.id,
    name: db.name || '',
    description: db.description || '',
    icon: db.icon || '',
    color: db.color || '#5C1A1B',
    categoryId: db.section_id || 'wallet-services',
    sectionId: db.section_id || undefined,
    subSectionId: db.sub_section_id || undefined,
    inputLabel: db.input_label || 'معرف العميل',
    inputType: db.input_type || 'text',
    inputPrefix: db.input_prefix || '',
    isActive: db.is_active !== false,
    sortOrder: db.sort_order || 0,
    createdAt: db.created_at || '',
    updatedAt: db.updated_at || '',
  };
}

function mapDbApiProviderToFirebase(db: any): FirebaseApiProvider {
  const config = db.config || {};
  return {
    id: db.id,
    name: db.name || '',
    baseUrl: db.api_url || '',
    apiKey: db.api_key || '',
    apiSecret: config.apiSecret || '',
    authHeader: db.auth_header || 'X-API-Key',
    method: config.method || 'GET',
    headers: config.headers || {},
    bodyTemplate: config.bodyTemplate || '',
    responseFormat: config.responseFormat || 'json',
    fieldMappings: config.fieldMappings || undefined,
    isActive: db.is_active !== false,
    syncEnabled: db.sync_categories !== false || db.sync_products !== false,
    lastSync: db.last_sync_at || '',
    createdAt: db.created_at || '',
    sectionId: config.sectionId || '',
    sectionName: config.sectionName || '',
    sectionIcon: config.sectionIcon || '',
    commission: db.default_commission || 0,
    commissionType: (db.commission_type as any) || 'percentage',
    balance: db.balance || 0,
    balanceCurrency: db.balance_currency || 'USD',
    lastBalanceCheck: db.last_balance_check || '',
  };
}
