// G2Bulk API Service for Admin App
// ONLY handles: API key settings, connection test, balance check.
// Product/category syncing is handled by g2bulk-panel.tsx directly
// (which writes to Supabase tables: service_providers, product_packages,
// api_products, api_categories, sub_sections, api_games).
// This file must NOT contain any sync functions — they caused conflicts
// with the Supabase-direct sync in the panel.

import { supabaseAdmin } from './supabase';

const G2BULK_BASE_URL = 'https://api.g2bulk.com/v1';

// Types (kept for compatibility with g2bulk-panel.tsx imports)
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
  order_id?: number;
  message?: string;
}

export interface G2BulkBalance {
  balance: number;
  username?: string;
  success: boolean;
}

// ─── Settings stored in Supabase api_providers table ───

export async function getG2BulkSettings(): Promise<{
  apiKey: string;
  enabled: boolean;
  autoSync: boolean;
  markupPercent: number;
  lastSync: string;
  balance: number | null;
}> {
  try {
    const { data, error } = await supabaseAdmin.from('api_providers')
      .select('*').eq('id', 'g2bulk').maybeSingle();
    if (error || !data) {
      return { apiKey: '', enabled: false, autoSync: false, markupPercent: 16, lastSync: '', balance: null };
    }
    return {
      apiKey: data.api_key || '',
      enabled: data.is_active ?? false,
      autoSync: data.sync_products ?? false,
      markupPercent: data.default_commission ?? 16,
      lastSync: data.last_sync_at || '',
      balance: data.balance ?? null,
    };
  } catch {
    return { apiKey: '', enabled: false, autoSync: false, markupPercent: 16, lastSync: '', balance: null };
  }
}

export async function saveG2BulkApiKey(apiKey: string): Promise<void> {
  await supabaseAdmin.from('api_providers').upsert({
    id: 'g2bulk',
    name: 'G2Bulk',
    api_url: G2BULK_BASE_URL + '/',
    api_key: apiKey,
    auth_header: 'X-API-Key',
    auth_type: 'header',
    is_active: true,
    balance_currency: 'USD',
    default_commission: 16,
    commission_type: 'percentage',
    sync_categories: true,
    sync_products: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function updateG2BulkSettings(settings: {
  enabled?: boolean;
  autoSync?: boolean;
  markupPercent?: number;
}): Promise<void> {
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (settings.enabled !== undefined) update.is_active = settings.enabled;
  if (settings.autoSync !== undefined) {
    update.sync_categories = settings.autoSync;
    update.sync_products = settings.autoSync;
  }
  if (settings.markupPercent !== undefined) {
    update.default_commission = settings.markupPercent;
    update.commission_type = 'percentage';
  }
  await supabaseAdmin.from('api_providers').update(update).eq('id', 'g2bulk');
}

export async function testG2BulkConnection(apiKey: string): Promise<{
  success: boolean;
  balance?: number;
  username?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${G2BULK_BASE_URL}/getMe`, {
      headers: { 'X-API-Key': apiKey },
    });
    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (data.success === false) {
      return { success: false, error: data.message || 'API key invalid' };
    }
    // Update balance in DB
    await supabaseAdmin.from('api_providers').update({
      balance: data.balance || 0,
      balance_currency: 'USD',
      last_balance_check: new Date().toISOString(),
    }).eq('id', 'g2bulk');
    return {
      success: true,
      balance: data.balance || 0,
      username: data.username || data.first_name || '',
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Connection failed' };
  }
}

export async function checkG2BulkBalance(): Promise<G2BulkBalance> {
  const settings = await getG2BulkSettings();
  if (!settings.apiKey) {
    return { balance: 0, success: false };
  }
  try {
    const res = await fetch(`${G2BULK_BASE_URL}/getMe`, {
      headers: { 'X-API-Key': settings.apiKey },
    });
    const data = await res.json();
    await supabaseAdmin.from('api_providers').update({
      balance: data.balance || 0,
      balance_currency: 'USD',
      last_balance_check: new Date().toISOString(),
    }).eq('id', 'g2bulk');
    return { balance: data.balance || 0, username: data.username, success: true };
  } catch {
    return { balance: 0, success: false };
  }
}

export async function checkG2BulkOrderStatus(orderId: number): Promise<G2BulkPurchaseResult> {
  const settings = await getG2BulkSettings();
  if (!settings.apiKey) return { status: 'PENDING', message: 'No API key' };
  try {
    const res = await fetch(`${G2BULK_BASE_URL}/order/${orderId}`, {
      headers: { 'X-API-Key': settings.apiKey },
    });
    const data = await res.json();
    return {
      status: data.order?.status || 'PENDING',
      order_id: orderId,
      message: data.order?.message || data.message,
    };
  } catch {
    return { status: 'PENDING', order_id: orderId };
  }
}
