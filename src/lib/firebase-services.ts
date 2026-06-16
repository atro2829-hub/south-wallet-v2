/**
 * Firebase Services Layer for South Wallet
 *
 * Centralized service for reading ALL dynamic data from Firebase RTDB.
 * The user app reads: sections, providers, wallet services, API providers,
 * packages, and visibility settings from Firebase.
 * 
 * Firebase structure:
 *   sections/{sectionId} - Main sections with sub-sections
 *   providers/{providerId} - Service providers (synced from admin)
 *   walletServices/{serviceId} - Wallet services with packages
 *   adminSettings/apiProviders/{id} - API providers with categories/products
 *   adminSettings/visibility/ - Visibility settings
 *   adminSettings/featureFlags/ - Feature toggles
 */

import { database } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';

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

// ─── Section Listeners ─────────────────────────────────────────────────

/**
 * Listen to sections from Firebase in real-time
 */
export function listenToSections(
  callback: (sections: FirebaseSection[]) => void,
  onError?: (error: Error) => void
): () => void {
  const sectionsRef = ref(database, 'sections');
  const unsub = onValue(sectionsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const sections: FirebaseSection[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          name: val.name || '',
          icon: val.icon || '',
          color: val.color || '#5C1A1B',
          sortOrder: val.sortOrder || 0,
          isActive: val.isActive !== false,
          parentId: val.parentId || undefined,
          type: val.type || 'main',
          subSections: val.subSections || undefined,
          providerIds: val.providerIds || undefined,
          apiProviderId: val.apiProviderId || undefined,
        }))
        .filter(s => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      callback(sections);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Firebase sections error:', error);
    onError?.(error);
  });
  return unsub;
}

/**
 * Listen to providers from Firebase in real-time
 */
export function listenToProviders(
  callback: (providers: FirebaseProvider[]) => void,
  onError?: (error: Error) => void
): () => void {
  const providersRef = ref(database, 'providers');
  const unsub = onValue(providersRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const providers: FirebaseProvider[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          name: val.name || '',
          color: val.color || '#5C1A1B',
          icon: val.icon || '',
          categoryId: val.categoryId || '',
          sectionId: val.sectionId || undefined,
          subSectionId: val.subSectionId || undefined,
          inputLabel: val.inputLabel || 'معرف العميل',
          inputType: val.inputType || 'text',
          inputPrefix: val.inputPrefix || undefined,
          isActive: val.isActive !== false,
          sortOrder: val.sortOrder || 0,
          apiProviderId: val.apiProviderId || undefined,
          apiProductId: val.apiProductId || undefined,
          costPrice: val.costPrice || undefined,
          commission: val.commission || undefined,
          commissionType: val.commissionType || undefined,
          executionType: val.executionType || 'manual',
        }))
        .filter(p => p.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      callback(providers);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Firebase providers error:', error);
    onError?.(error);
  });
  return unsub;
}

/**
 * Listen to wallet services from Firebase in real-time
 */
export function listenToWalletServices(
  callback: (services: FirebaseWalletService[]) => void,
  onError?: (error: Error) => void
): () => void {
  const servicesRef = ref(database, 'walletServices');
  const unsub = onValue(servicesRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const services: FirebaseWalletService[] = Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          name: val.name || '',
          description: val.description || '',
          icon: val.icon || '',
          color: val.color || '#5C1A1B',
          categoryId: val.categoryId || 'wallet-services',
          sectionId: val.sectionId || undefined,
          subSectionId: val.subSectionId || undefined,
          inputLabel: val.inputLabel || 'معرف العميل',
          inputType: val.inputType || 'text',
          inputPrefix: val.inputPrefix || '',
          isActive: val.isActive !== false,
          sortOrder: val.sortOrder || 0,
          packages: val.packages || undefined,
          createdAt: val.createdAt || '',
          updatedAt: val.updatedAt || '',
        }))
        .filter(s => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      callback(services);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Firebase wallet services error:', error);
    onError?.(error);
  });
  return unsub;
}

/**
 * Listen to API providers from Firebase in real-time
 */
export function listenToApiProviders(
  callback: (providers: FirebaseApiProvider[]) => void,
  onError?: (error: Error) => void
): () => void {
  const apiProvidersRef = ref(database, 'adminSettings/apiProviders');
  const unsub = onValue(apiProvidersRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const providers: FirebaseApiProvider[] = Object.entries(data)
        .filter(([, p]: [string, any]) => p.isActive !== false)
        .map(([key, p]: [string, any]) => ({
          id: key || p.id || '',
          name: p.name || '',
          baseUrl: p.baseUrl || '',
          apiKey: p.apiKey || '',
          apiSecret: p.apiSecret || '',
          authHeader: p.authHeader || 'X-API-Key',
          method: p.method || 'GET',
          headers: p.headers || {},
          bodyTemplate: p.bodyTemplate || '',
          responseFormat: p.responseFormat || 'json',
          fieldMappings: p.fieldMappings || undefined,
          isActive: p.isActive !== false,
          syncEnabled: p.syncEnabled !== false,
          lastSync: p.lastSync || '',
          createdAt: p.createdAt || '',
          sectionId: p.sectionId || '',
          sectionName: p.sectionName || '',
          sectionIcon: p.sectionIcon || '',
          commission: p.commission || 0,
          commissionType: p.commissionType || 'percentage',
          balance: p.balance || 0,
          balanceCurrency: p.balanceCurrency || 'USD',
          lastBalanceCheck: p.lastBalanceCheck || '',
          categories: p.categories || {},
        }));
      callback(providers);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Firebase API providers error:', error);
    onError?.(error);
  });
  return unsub;
}

/**
 * Listen to visibility settings
 */
export function listenToVisibility(
  callback: (sections: Record<string, boolean>, providers: Record<string, boolean>) => void,
  onError?: (error: Error) => void
): () => void {
  const visRef = ref(database, 'adminSettings/visibility');
  const unsub = onValue(visRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback(data.sections || {}, data.providers || {});
    } else {
      callback({}, {});
    }
  }, (error) => {
    console.error('Firebase visibility error:', error);
    onError?.(error);
  });
  return unsub;
}

/**
 * One-time fetch of sections (for initial load)
 */
export async function fetchSectionsOnce(): Promise<FirebaseSection[]> {
  try {
    const snapshot = await get(ref(database, 'sections'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          name: val.name || '',
          icon: val.icon || '',
          color: val.color || '#5C1A1B',
          sortOrder: val.sortOrder || 0,
          isActive: val.isActive !== false,
          parentId: val.parentId || undefined,
          type: val.type || 'main',
          subSections: val.subSections || undefined,
          providerIds: val.providerIds || undefined,
          apiProviderId: val.apiProviderId || undefined,
        }))
        .filter(s => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * One-time fetch of providers
 */
export async function fetchProvidersOnce(): Promise<FirebaseProvider[]> {
  try {
    const snapshot = await get(ref(database, 'providers'));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.entries(data)
        .map(([key, val]: [string, any]) => ({
          id: key,
          name: val.name || '',
          color: val.color || '#5C1A1B',
          icon: val.icon || '',
          categoryId: val.categoryId || '',
          sectionId: val.sectionId || undefined,
          subSectionId: val.subSectionId || undefined,
          inputLabel: val.inputLabel || 'معرف العميل',
          inputType: val.inputType || 'text',
          inputPrefix: val.inputPrefix || undefined,
          isActive: val.isActive !== false,
          sortOrder: val.sortOrder || 0,
          apiProviderId: val.apiProviderId || undefined,
          apiProductId: val.apiProductId || undefined,
          costPrice: val.costPrice || undefined,
          commission: val.commission || undefined,
          commissionType: val.commissionType || undefined,
          executionType: val.executionType || 'manual',
        }))
        .filter(p => p.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return [];
  } catch {
    return [];
  }
}
