// G2Bulk API Service for Admin App
// Manages G2Bulk API settings, syncs categories/products
// Uses Firebase for settings (backward compatible) and Supabase for synced data

import { get, ref, update, set } from 'firebase/database';
import { database } from './firebase';
import { supabase } from './supabase';

const G2BULK_BASE_URL = 'https://api.g2bulk.com/v1';

// Types
export interface G2BulkCategory {
  id: number;
  title: string;
  mappedToSection?: string;
  enabled?: boolean;
}

export interface G2BulkProduct {
  id: number;
  title: string;
  unit_price: number;
  stock: number;
  category_id?: number;
  enabled?: boolean;
  markupPercent?: number;
  customPrice?: number;
}

export interface G2BulkPurchaseResult {
  status: 'COMPLETED' | 'PENDING';
  delivery_items?: string[];
  order_id?: number;
}

export interface G2BulkBalance {
  success: boolean;
  user_id: number;
  username: string;
  balance: number;
}

// Get API key from Firebase admin settings
async function getApiKey(): Promise<string> {
  const snapshot = await get(ref(database, 'adminSettings/g2bulk/apiKey'));
  if (!snapshot.exists()) {
    throw new Error('G2Bulk API key not configured');
  }
  return snapshot.val();
}

// Make authenticated request to G2Bulk API
async function g2bulkRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const apiKey = await getApiKey();

  const headers: Record<string, string> = {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${G2BULK_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`G2Bulk API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data as T;
}

// === Admin API Functions ===

// Test G2Bulk API connection with a specific key
export async function testG2BulkConnection(apiKey: string): Promise<{
  success: boolean;
  balance?: number;
  username?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${G2BULK_BASE_URL}/getMe`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        balance: data.balance,
        username: data.username,
      };
    }
    return { success: false, error: 'API returned unsuccessful response' };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// Save API key to Firebase
export async function saveG2BulkApiKey(apiKey: string): Promise<void> {
  await update(ref(database, 'adminSettings/g2bulk'), { apiKey });
}

// Get G2Bulk settings from Firebase
export async function getG2BulkSettings(): Promise<{
  apiKey: string;
  enabled: boolean;
  autoSync: boolean;
  lastSync: string;
  markupPercent: number;
  categories: G2BulkCategory[];
  products: G2BulkProduct[];
}> {
  const snapshot = await get(ref(database, 'adminSettings/g2bulk'));
  if (!snapshot.exists()) {
    return {
      apiKey: '',
      enabled: false,
      autoSync: false,
      lastSync: '',
      markupPercent: 0,
      categories: [],
      products: [],
    };
  }
  return snapshot.val();
}

// Update G2Bulk settings
export async function updateG2BulkSettings(settings: {
  enabled?: boolean;
  autoSync?: boolean;
  markupPercent?: number;
}): Promise<void> {
  await update(ref(database, 'adminSettings/g2bulk'), settings);
}

// Fetch and sync categories from G2Bulk API to Firebase
export async function syncG2BulkCategories(): Promise<G2BulkCategory[]> {
  const data = await g2bulkRequest<{ success: boolean; categories: G2BulkCategory[] }>('/category');
  const categories = data.categories || [];

  // Merge with existing mappings in Firebase
  const existingSnapshot = await get(ref(database, 'adminSettings/g2bulk/categories'));
  const existingCategories: Record<string, G2BulkCategory> = existingSnapshot.exists()
    ? existingSnapshot.val()
    : {};

  // Update categories, preserving mappings
  const updatedCategories: Record<string, G2BulkCategory> = {};
  for (const cat of categories) {
    const existing = existingCategories[cat.id]?.mappedToSection
      ? existingCategories[cat.id]
      : null;
    updatedCategories[cat.id] = {
      ...cat,
      mappedToSection: existing?.mappedToSection || '',
      enabled: existing?.enabled !== undefined ? existing.enabled : true,
    };
  }

  await set(ref(database, 'adminSettings/g2bulk/categories'), updatedCategories);
  return categories;
}

// Fetch and sync products from G2Bulk API to Firebase
export async function syncG2BulkProducts(): Promise<G2BulkProduct[]> {
  const categories = await getG2BulkCategoriesFromFirebase();
  const allProducts: G2BulkProduct[] = [];

  for (const catId of Object.keys(categories)) {
    const cat = categories[catId];
    try {
      const data = await g2bulkRequest<{ success: boolean; products: G2BulkProduct[] }>(
        `/category/${cat.id}`
      );
      const products = data.products || [];
      for (const product of products) {
        allProducts.push({ ...product, category_id: cat.id });
      }
    } catch (e) {
      console.error(`Failed to fetch products for category ${cat.id}:`, e);
    }
  }

  // Save to Firebase with existing settings preserved
  const existingSnapshot = await get(ref(database, 'adminSettings/g2bulk/products'));
  const existingProducts: Record<string, G2BulkProduct> = existingSnapshot.exists()
    ? existingSnapshot.val()
    : {};

  const updatedProducts: Record<string, G2BulkProduct> = {};
  for (const product of allProducts) {
    const existing = existingProducts[product.id];
    updatedProducts[product.id] = {
      ...product,
      enabled: existing?.enabled !== undefined ? existing.enabled : true,
      markupPercent: existing?.markupPercent || 0,
      customPrice: existing?.customPrice || 0,
    };
  }

  await set(ref(database, 'adminSettings/g2bulk/products'), updatedProducts);
  await update(ref(database, 'adminSettings/g2bulk'), {
    lastSync: new Date().toISOString(),
  });

  return allProducts;
}

// Full sync (categories + products)
export async function fullG2BulkSync(): Promise<void> {
  await syncG2BulkCategories();
  await syncG2BulkProducts();
}

// Get categories from Firebase cache
export async function getG2BulkCategoriesFromFirebase(): Promise<Record<string, G2BulkCategory>> {
  const snapshot = await get(ref(database, 'adminSettings/g2bulk/categories'));
  return snapshot.exists() ? snapshot.val() : {};
}

// Get products from Firebase cache
export async function getG2BulkProductsFromFirebase(): Promise<Record<string, G2BulkProduct>> {
  const snapshot = await get(ref(database, 'adminSettings/g2bulk/products'));
  return snapshot.exists() ? snapshot.val() : {};
}

// Update category mapping
export async function updateG2BulkCategory(
  categoryId: number,
  updates: { mappedToSection?: string; enabled?: boolean }
): Promise<void> {
  await update(ref(database, `adminSettings/g2bulk/categories/${categoryId}`), updates);
}

// Update product settings
export async function updateG2BulkProduct(
  productId: number,
  updates: { enabled?: boolean; markupPercent?: number; customPrice?: number }
): Promise<void> {
  await update(ref(database, `adminSettings/g2bulk/products/${productId}`), updates);
}

// Check G2Bulk account balance
export async function checkG2BulkBalance(): Promise<G2BulkBalance> {
  return g2bulkRequest<G2BulkBalance>('/getMe');
}

// Get all G2Bulk orders from Firebase
export async function getG2BulkOrders(): Promise<Record<string, any>> {
  const snapshot = await get(ref(database, 'g2bulkOrders'));
  return snapshot.exists() ? snapshot.val() : {};
}

// Check G2Bulk order delivery status
export async function checkG2BulkOrderStatus(orderId: number): Promise<G2BulkPurchaseResult> {
  return g2bulkRequest<G2BulkPurchaseResult>(`/orders/${orderId}/delivery`);
}
