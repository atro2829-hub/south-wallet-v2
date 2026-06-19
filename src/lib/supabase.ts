/**
 * Supabase Client for South Wallet - PRIMARY DATA SOURCE
 *
 * Supabase handles: ALL data (users, transactions, orders, sections, providers, etc.)
 * The service_role key (sbp_...) is used for admin/server-side operations.
 * The anon key is used for client-side operations with RLS policies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifmxseonkdsxuanznny.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk3NzAsImV4cCI6MjA5NzA0NTc3MH0.4KbBtMruP_xrPiHe_XtcoHG7NVQhlflhUUkJFWgQxkM';
// Service role key — required for admin operations (bypasses RLS).
// In a Next.js static-export Capacitor app, env vars are NOT available at runtime,
// so we hardcode the fallback. The key is already shipped inside the APK anyway.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ2OTc3MCwiZXhwIjoyMDk3MDQ1NzcwfQ.b1X7ydSkbOwS0LG39h22bvZg65qT0bCI7y5omrHw_rM';

// Standard client with anon key (respects RLS policies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Admin client with service_role key (bypasses RLS - use with caution)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface DbUser {
  id: string;
  firebase_uid: string | null;
  email: string | null;
  phone: string | null;
  first_name: string;
  second_name: string;
  third_name: string;
  family_name: string;
  display_name: string;
  display_id?: string; // 6-digit user-facing account number
  balance_yer: number;
  balance_sar: number;
  balance_usd: number;
  card_type: string;
  card_number: string;
  national_id: string;
  governorate: string;
  avatar_url: string;
  role: 'user' | 'admin' | 'owner' | 'agent';
  kyc_status: 'pending' | 'submitted' | 'verified' | 'rejected';
  is_blocked: boolean;
  is_active: boolean;
  id_front_url: string;
  id_back_url: string;
  id_selfie_url: string;
  id_verified_at: string | null;
  id_rejection_reason: string;
  fcm_token: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  pin_code: string;
  login_attempts: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  fee: number;
  fee_currency: string;
  type: 'transfer' | 'deposit' | 'withdraw' | 'order' | 'recharge' | 'exchange' | 'gift' | 'promo' | 'commission' | 'refund' | 'investment';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  description: string;
  reference_number: string;
  receipt_data: Record<string, unknown>;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_card_number: string;
  api_provider_id: string;
  api_order_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DbOrder {
  id: string;
  user_id: string;
  provider_id: string;
  provider_name: string;
  package_id: string;
  package_name: string;
  category_id: string;
  category_name: string;
  customer_input: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  cost_price: number;
  cost_currency: string;
  commission_amount: number;
  commission_type: string;
  execution_type: 'manual' | 'auto' | 'api';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  api_provider_id: string;
  api_product_id: string;
  api_order_id: string;
  api_response: Record<string, unknown>;
  result_code: string;
  result_message: string;
  result_pin_code: string;
  transaction_id: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDepositRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: 'bank_transfer' | 'crypto' | 'cash' | 'card' | 'agent';
  bank_name: string;
  bank_account: string;
  sender_name: string;
  transfer_receipt_url: string;
  crypto_network: string;
  crypto_wallet_address: string;
  crypto_tx_hash: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejection_reason: string;
  admin_notes: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbWithdrawRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: 'YER' | 'SAR' | 'USD';
  method: 'bank_transfer' | 'crypto' | 'cash' | 'agent';
  bank_name: string;
  bank_account: string;
  bank_iban: string;
  crypto_network: string;
  crypto_wallet_address: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  rejection_reason: string;
  admin_notes: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  processed_by: string | null;
  processed_at: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSection {
  id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
  type: 'manual' | 'api' | 'wallet' | 'exchange' | 'escrow' | 'telecom' | 'games' | 'investment' | 'link';
  screen_type: string;
  api_provider_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbSubSection {
  id: string;
  section_id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  is_visible: boolean;
  type: 'manual' | 'api' | 'wallet' | 'exchange' | 'escrow' | 'telecom' | 'games' | 'investment' | 'link';
  api_category_id: string;
  api_provider_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbServiceProvider {
  id: string;
  section_id: string;
  sub_section_id: string;
  name: string;
  name_en: string;
  description: string;
  icon: string;
  color: string;
  image_url: string;
  input_label: string;
  input_type: 'text' | 'tel' | 'number' | 'email';
  input_prefix: string;
  is_active: boolean;
  is_visible: boolean;
  sort_order: number;
  type: 'manual' | 'api' | 'wallet';
  api_provider_id: string;
  api_product_id: string;
  execution_type: 'manual' | 'auto' | 'api';
  created_at: string;
  updated_at: string;
}

export interface DbProductPackage {
  id: string;
  provider_id: string;
  name: string;
  name_en: string;
  description: string;
  price_usd: number;
  price_yer: number;
  price_sar: number;
  cost_price: number;
  cost_currency: string;
  commission_amount: number;
  commission_type: string;
  execution_type: 'manual' | 'auto' | 'api';
  api_product_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbApiProvider {
  id: string;
  name: string;
  description: string;
  website: string;
  api_url: string;
  api_key: string;
  auth_header: string;
  auth_type: 'header' | 'bearer' | 'basic' | 'query';
  is_active: boolean;
  balance: number;
  balance_currency: string;
  last_balance_check: string | null;
  default_commission: number;
  commission_type: 'percentage' | 'fixed';
  sync_categories: boolean;
  sync_products: boolean;
  last_sync_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbApiCategory {
  id: string;
  api_provider_id: string;
  api_category_id: string;
  title: string;
  title_en: string;
  description: string;
  image_url: string;
  product_count: number;
  is_active: boolean;
  is_synced: boolean;
  last_synced_at: string | null;
  section_id: string;
  created_at: string;
  updated_at: string;
}

export interface DbExchangeRate {
  id: string;
  usd_to_yer: number;
  usd_to_sar: number;
  sar_to_yer: number;
  source: string;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBanner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  position: 'login' | 'home' | 'services' | 'wallet' | 'all';
  link_type: 'none' | 'url' | 'screen' | 'provider' | 'promo';
  link_target: string;
  sort_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  navigation_target: string;
  navigation_params: Record<string, unknown>;
  data: Record<string, unknown>;
  created_at: string;
}

export interface DbWalletAddress {
  id: string;
  network: 'TRC20' | 'ERC20' | 'BEP20' | 'BTC' | 'ETH' | 'SOL' | 'OTHER';
  network_name: string;
  address: string;
  label: string;
  qr_code_url: string;
  is_active: boolean;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface DbFeatureFlag {
  flag_key: string;
  is_enabled: boolean;
  description: string;
  updated_at: string;
}

export interface DbBottomNav {
  tab_id: string;
  label: string;
  icon: string;
  is_visible: boolean;
  sort_order: number;
}

export interface DbMaintenance {
  id: string;
  is_active: boolean;
  message: string;
  estimated_time: string;
  activated_at: string | null;
}

export interface DbKillSwitch {
  id: string;
  is_active: boolean;
  message: string;
  activated_at: string | null;
  activated_by: string | null;
  deactivate_at: string | null;
  duration_minutes: number;
}

export interface DbBranding {
  id: string;
  app_name: string;
  app_name_en: string;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  splash_background: string;
  updated_at: string;
}

export interface DbAppConfig {
  key: string;
  value: Record<string, unknown>;
  description: string;
  updated_at: string;
}

export interface DbEscrowTransaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  reference_code: string;
  status: string;
  buyer_confirmed: boolean;
  seller_confirmed: boolean;
  funded_at: string | null;
  completed_at: string | null;
  dispute_reason: string;
  created_at: string;
  updated_at: string;
}

export interface DbBranch {
  id: string;
  name: string;
  name_en: string;
  address: string;
  governorate: string;
  phone: string;
  email: string;
  working_hours: string;
  weekend: string;
  latitude: number;
  longitude: number;
  services: string[];
  is_active: boolean;
  sort_order: number;
}

export interface DbUserReview {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  category: string;
  status: string;
  admin_reply: string;
  is_featured: boolean;
  created_at: string;
}

export interface DbPriceOverride {
  id: string;
  target_type: string;
  target_id: string;
  markup_type: string;
  markup_value: number;
  markup_currency: string;
  is_active: boolean;
}

export interface DbCommissionConfig {
  id: string;
  target_type: string;
  target_id: string;
  commission_type: string;
  commission_value: number;
  commission_currency: string;
  is_active: boolean;
}

// Helper: Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && supabaseUrl.includes('.supabase.co');
}

// =====================================================
// SUPABASE SERVICE FUNCTIONS
// =====================================================

export const supabaseService = {
  // --- Users ---
  async getUserById(id: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw error;
    return data as DbUser;
  },

  async getUserByFirebaseUid(firebaseUid: string) {
    const { data, error } = await supabase.from('users').select('*').eq('firebase_uid', firebaseUid).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbUser | null;
  },

  async createUser(user: Partial<DbUser> & { id: string }) {
    const { data, error } = await supabase.from('users').insert(user).select().single();
    if (error) throw error;
    return data as DbUser;
  },

  async updateUser(id: string, updates: Partial<DbUser>) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as DbUser;
  },

  /**
   * Ensure a user exists in Supabase. If they don't, create them.
   * If they do, update their info. This keeps Firebase and Supabase in sync.
   * Called on every auth state change so that chat/search features can find users.
   *
   * IMPORTANT:
   * - `userId` (the 6-digit account number from Firebase) is mapped to `card_number`.
   * - If no `userId` is provided AND the user doesn't yet exist, we generate a 6-digit
   *   one (rare path; the registration flow normally passes `userId`).
   * - `national_id` is left NULL when not provided, so the partial unique index
   *   `users_national_id_unique_idx` (WHERE national_id IS NOT NULL AND <> '') does
   *   not block the insert.
   * - All errors are logged with full detail (no silent swallowing).
   */
  async ensureUser(firebaseUid: string, data: {
    email?: string; phone?: string; displayName?: string;
    firstName?: string; secondName?: string; thirdName?: string; familyName?: string;
    avatar?: string; role?: string; userId?: string; nationalId?: string;
  }) {
    try {
      const existing = await supabaseService.getUserByFirebaseUid(firebaseUid);

      // Map the Firebase `userId` (6-digit account number) → Supabase `card_number`.
      // Use NULL when not provided so partial unique indexes don't collide.
      const cardNumber = data.userId && data.userId.trim() !== '' ? data.userId.trim() : null;
      const nationalId = data.nationalId && data.nationalId.trim() !== '' ? data.nationalId.trim() : null;

      const userData: Record<string, unknown> = {
        firebase_uid: firebaseUid,
        email: data.email && data.email.trim() !== '' ? data.email.trim() : null,
        phone: data.phone && data.phone.trim() !== '' ? data.phone.trim() : null,
        display_name: data.displayName || '',
        first_name: data.firstName || '',
        second_name: data.secondName || '',
        third_name: data.thirdName || '',
        family_name: data.familyName || '',
        avatar_url: data.avatar || '',
        role: data.role || 'user',
        national_id: nationalId,
        is_active: true,
        is_blocked: false,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing user. Only set card_number if a real value was provided
        // AND the existing row doesn't already have one (don't overwrite a real number).
        if (cardNumber && !existing.card_number) {
          userData.card_number = cardNumber;
        }
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', existing.id);
        if (error) {
          console.error('[ensureUser] update failed:', error.code, error.message, JSON.stringify(userData));
        }
      } else {
        // Create new user. Generate a 6-digit card_number if none was provided.
        let finalCardNumber = cardNumber;
        if (!finalCardNumber) {
          finalCardNumber = await supabaseService.generateUniqueCardNumber();
        }

        userData.id = crypto.randomUUID();
        userData.card_number = finalCardNumber;
        userData.card_issued_at = new Date().toISOString();
        userData.kyc_status = 'pending';
        userData.created_at = new Date().toISOString();

        const { error } = await supabase.from('users').insert(userData);
        if (error) {
          console.error('[ensureUser] insert failed:', error.code, error.message, JSON.stringify(userData));
        }
      }
    } catch (err) {
      console.error('[ensureUser] unexpected error:', err);
    }
  },

  /**
   * Generate a unique 6-digit card_number not yet present in the users table.
   * Tries prefixes 10..99 in order (same scheme as `generateUniqueUserId` in utils.ts).
   */
  async generateUniqueCardNumber(maxAttempts = 100): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const prefix = 10 + Math.floor(i / 5);
      if (prefix > 99) break;
      const random4 = Math.floor(1000 + Math.random() * 9000).toString();
      const candidate = String(prefix) + random4;
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('card_number', candidate)
        .maybeSingle();
      if (!error && !data) {
        return candidate;
      }
    }
    // Fallback: pure random 6-digit
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  // --- Transactions ---
  async getTransactions(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`user_id.eq.${userId},from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as DbTransaction[];
  },

  async createTransaction(tx: Omit<DbTransaction, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('transactions').insert(tx).select().single();
    if (error) throw error;
    return data as DbTransaction;
  },

  // --- Orders ---
  async getOrders(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as DbOrder[];
  },

  async createOrder(order: Omit<DbOrder, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('orders').insert(order).select().single();
    if (error) throw error;
    return data as DbOrder;
  },

  // --- Deposit Requests ---
  async getDepositRequests(userId: string) {
    const { data, error } = await supabase.from('deposit_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbDepositRequest[];
  },

  async createDepositRequest(req: Omit<DbDepositRequest, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('deposit_requests').insert(req).select().single();
    if (error) throw error;
    return data as DbDepositRequest;
  },

  // --- Withdraw Requests ---
  async getWithdrawRequests(userId: string) {
    const { data, error } = await supabase.from('withdraw_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbWithdrawRequest[];
  },

  async createWithdrawRequest(req: Omit<DbWithdrawRequest, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('withdraw_requests').insert(req).select().single();
    if (error) throw error;
    return data as DbWithdrawRequest;
  },

  // --- Sections ---
  async getSections() {
    const { data, error } = await supabase.from('sections').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbSection[];
  },

  async getAllSections() {
    const { data, error } = await supabase.from('sections').select('*').order('sort_order');
    if (error) throw error;
    return data as DbSection[];
  },

  async updateSection(id: string, updates: Partial<DbSection>) {
    const { data, error } = await supabase.from('sections').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data as DbSection;
  },

  async createSection(section: Omit<DbSection, 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('sections').insert(section).select().single();
    if (error) throw error;
    return data as DbSection;
  },

  async deleteSection(id: string) {
    const { error } = await supabase.from('sections').delete().eq('id', id);
    if (error) throw error;
  },

  // --- Sub Sections ---
  async getSubSections(sectionId: string) {
    const { data, error } = await supabase.from('sub_sections').select('*').eq('section_id', sectionId).eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbSubSection[];
  },

  async getAllSubSections(sectionId: string) {
    const { data, error } = await supabase.from('sub_sections').select('*').eq('section_id', sectionId).order('sort_order');
    if (error) throw error;
    return data as DbSubSection[];
  },

  async createSubSection(subSection: Omit<DbSubSection, 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('sub_sections').insert(subSection).select().single();
    if (error) throw error;
    return data as DbSubSection;
  },

  async updateSubSection(id: string, updates: Partial<DbSubSection>) {
    const { data, error } = await supabase.from('sub_sections').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data as DbSubSection;
  },

  async deleteSubSection(id: string) {
    const { error } = await supabase.from('sub_sections').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleSubSectionVisibility(id: string, isVisible: boolean) {
    const { data, error } = await supabase.from('sub_sections').update({ is_visible: isVisible, is_active: isVisible, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return data as DbSubSection;
  },

  // --- Service Providers ---
  async getServiceProviders(sectionId?: string) {
    let query = supabase.from('service_providers').select('*').eq('is_active', true).order('sort_order');
    if (sectionId) query = query.eq('section_id', sectionId);
    const { data, error } = await query;
    if (error) throw error;
    return data as DbServiceProvider[];
  },

  // --- Product Packages ---
  async getProductPackages(providerId: string) {
    const { data, error } = await supabase.from('product_packages').select('*').eq('provider_id', providerId).eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbProductPackage[];
  },

  // --- API Providers ---
  async getApiProviders() {
    const { data, error } = await supabase.from('api_providers').select('*').eq('is_active', true);
    if (error) throw error;
    return data as DbApiProvider[];
  },

  // --- API Categories ---
  async getApiCategories(providerId: string) {
    const { data, error } = await supabase.from('api_categories').select('*').eq('api_provider_id', providerId).eq('is_active', true);
    if (error) throw error;
    return data as DbApiCategory[];
  },

  // --- API Games (من الجدول المخصص للألعاب) ---
  async getApiGames(providerId?: string, featured?: boolean) {
    let query = supabase
      .from('api_games')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (providerId) query = query.eq('api_provider_id', providerId);
    if (featured) query = query.eq('is_featured', true);
    const { data, error } = await query;
    if (error) {
      // Fallback: جلب الألعاب من api_categories
      const { data: cats } = await supabase
        .from('api_categories')
        .select('*')
        .eq('is_active', true)
        .like('api_category_id', 'game_%');
      return (cats || []).map(c => ({
        id: c.id,
        api_provider_id: c.api_provider_id,
        game_code: c.api_category_id.replace('game_', ''),
        name: c.title,
        name_ar: c.title,
        image_url: c.image_url || '',
        is_active: true,
        is_featured: false,
      }));
    }
    return data || [];
  },

  // --- API Game Catalogues ---
  async getGameCatalogues(providerId: string, gameCode: string) {
    const { data, error } = await supabase
      .from('api_game_catalogues')
      .select('*')
      .eq('api_provider_id', providerId)
      .eq('game_code', gameCode)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  },

  // --- Sections Summary (مع الأقسام الفرعية وعدد المزودين) ---
  async getSectionsWithStats() {
    const { data, error } = await supabase.rpc('get_sections_with_data');
    if (error) {
      // Fallback: جلب الأقسام العادية
      return await supabaseService.getSections();
    }
    return data || [];
  },

  // --- Sub Sections With Counts ---
  async getSubSectionsWithCounts(sectionId: string) {
    const { data, error } = await supabase.rpc('get_sub_sections_with_counts', { p_section_id: sectionId });
    if (error) {
      return await supabaseService.getSubSections(sectionId);
    }
    return data || [];
  },

  // --- Exchange Rates ---
  async getExchangeRates() {
    const { data, error } = await supabase.from('exchange_rates').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    if (error) throw error;
    return data[0] as DbExchangeRate | null;
  },

  // --- Banners ---
  async getBanners(position?: string) {
    let query = supabase.from('banners').select('*').eq('is_active', true).order('sort_order');
    if (position) query = query.eq('position', position);
    const { data, error } = await query;
    if (error) throw error;
    return data as DbBanner[];
  },

  // --- Notifications ---
  async getNotifications(userId: string) {
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data as DbNotification[];
  },

  async markNotificationRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },

  // --- Wallet Addresses ---
  async getWalletAddresses() {
    const { data, error } = await supabase.from('wallet_addresses').select('*').eq('is_active', true);
    if (error) throw error;
    return data as DbWalletAddress[];
  },

  // --- Feature Flags ---
  async getFeatureFlags() {
    const { data, error } = await supabase.from('feature_flags').select('*');
    if (error) throw error;
    return data as DbFeatureFlag[];
  },

  // --- Bottom Nav ---
  async getBottomNav() {
    const { data, error } = await supabase.from('bottom_nav').select('*').eq('is_visible', true).order('sort_order');
    if (error) throw error;
    return data as DbBottomNav[];
  },

  // --- Maintenance ---
  async getMaintenance() {
    const { data, error } = await supabase.from('maintenance').select('*').eq('id', 'main').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbMaintenance | null;
  },

  // --- Kill Switch ---
  async getKillSwitch() {
    const { data, error } = await supabase.from('kill_switch').select('*').eq('id', 'main').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbKillSwitch | null;
  },

  // --- Branding ---
  async getBranding() {
    const { data, error } = await supabase.from('branding').select('*').eq('id', 'default').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbBranding | null;
  },

  // --- App Config ---
  async getAppConfig(key: string) {
    const { data, error } = await supabase.from('app_config').select('*').eq('key', key).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as DbAppConfig | null;
  },

  // --- Wallet Services ---
  async getWalletServices() {
    const { data, error } = await supabase.from('wallet_services').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data as DbWalletAddress[];
  },

  // --- Visibility ---
  async getVisibility(targetType: string) {
    const { data, error } = await supabase.from('visibility').select('*').eq('target_type', targetType);
    if (error) throw error;
    return data;
  },

  // --- Card Colors ---
  async getCardColors() {
    const { data, error } = await supabase.from('card_colors').select('*');
    if (error) throw error;
    return data;
  },

  // --- Legal Content ---
  async getLegalContent(id: string) {
    const { data, error } = await supabase.from('legal_content').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // --- Social Links ---
  async getSocialLinks() {
    const { data, error } = await supabase.from('social_links').select('*').eq('is_active', true).order('sort_order');
    if (error) throw error;
    return data;
  },

  // --- KYC Documents ---
  async submitKycDocument(doc: { user_id: string; document_type: string; document_url: string }) {
    const { data, error } = await supabase.from('kyc_documents').insert(doc).select().single();
    if (error) throw error;
    return data;
  },

  // --- Support Tickets ---
  async createSupportTicket(ticket: { user_id: string; subject: string; category?: string }) {
    const { data, error } = await supabase.from('support_tickets').insert(ticket).select().single();
    if (error) throw error;
    return data;
  },

  // --- Balance Update via RPC (safe, atomic) ---
  async updateBalance(userId: string, currency: string, amount: number, operation: 'add' | 'subtract' = 'add') {
    const { data, error } = await supabase.rpc('update_user_balance', {
      p_user_id: userId,
      p_currency: currency,
      p_amount: amount,
      p_operation: operation,
    });
    if (error) throw error;
    return data as number;
  },

  // --- Currency Conversion via RPC ---
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
    const { data, error } = await supabase.rpc('convert_currency', {
      p_amount: amount,
      p_from_currency: fromCurrency,
      p_to_currency: toCurrency,
    });
    if (error) throw error;
    return data as number;
  },

  // --- Dashboard Stats via RPC ---
  async getDashboardStats() {
    const { data, error } = await supabase.rpc('get_dashboard_stats');
    if (error) throw error;
    return data;
  },

  // --- Escrow Transactions ---
  getEscrowTransactions: async (userId: string) => {
    const { data } = await supabase.from('escrow_transactions').select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    return data || [];
  },

  createEscrowTransaction: async (escrow: any) => {
    const { data } = await supabase.from('escrow_transactions').insert(escrow).select().single();
    return data;
  },

  updateEscrowStatus: async (id: string, status: string, updates: any = {}) => {
    const { data } = await supabase.from('escrow_transactions').update({ status, ...updates })
      .eq('id', id).select().single();
    return data;
  },

  // --- User Reviews ---
  getUserReviews: async () => {
    const { data } = await supabase.from('user_reviews').select('*, users(name)').order('created_at', { ascending: false });
    return data || [];
  },

  // --- Branches ---
  getBranches: async () => {
    const { data } = await supabase.from('branches').select('*').eq('is_active', true).order('sort_order');
    return data || [];
  },

  // --- Marketing Content ---
  getMarketingContent: async () => {
    const { data } = await supabase.from('marketing_content').select('*').eq('is_active', true);
    return data || [];
  },

  // --- Price Overrides ---
  getPriceOverrides: async () => {
    const { data } = await supabase.from('price_overrides').select('*').eq('is_active', true);
    return data || [];
  },

  calculatePrice: async (basePriceUsd: number, providerId?: string, packageId?: string) => {
    // Check package-level override first, then provider-level, then global
    let markup = 0;
    let markupType = 'percentage';

    if (packageId) {
      const { data: pkgOverride } = await supabase.from('price_overrides')
        .select('*').eq('target_type', 'package').eq('target_id', packageId).eq('is_active', true).single();
      if (pkgOverride) {
        markup = pkgOverride.markup_value;
        markupType = pkgOverride.markup_type;
      }
    }

    if (!markup && providerId) {
      const { data: provOverride } = await supabase.from('price_overrides')
        .select('*').eq('target_type', 'provider').eq('target_id', providerId).eq('is_active', true).single();
      if (provOverride) {
        markup = provOverride.markup_value;
        markupType = provOverride.markup_type;
      }
    }

    if (!markup) {
      const { data: globalOverride } = await supabase.from('price_overrides')
        .select('*').eq('target_type', 'global').eq('is_active', true).limit(1).single();
      if (globalOverride) {
        markup = globalOverride.markup_value;
        markupType = globalOverride.markup_type;
      }
    }

    if (markupType === 'percentage') {
      return basePriceUsd * (1 + markup / 100);
    }
    return basePriceUsd + markup;
  },

  // --- Commission Config ---
  getCommissionConfig: async () => {
    const { data } = await supabase.from('commission_config').select('*').eq('is_active', true);
    return data || [];
  },

  calculateCommission: async (amountUsd: number, providerId?: string, packageId?: string) => {
    let commissionRate = 3; // default 3%
    let commissionType = 'percentage';

    if (packageId) {
      const { data: pkgConfig } = await supabase.from('commission_config')
        .select('*').eq('target_type', 'package').eq('target_id', packageId).eq('is_active', true).single();
      if (pkgConfig) {
        commissionRate = pkgConfig.commission_value;
        commissionType = pkgConfig.commission_type;
      }
    }

    if (commissionRate === 3 && providerId) {
      const { data: provConfig } = await supabase.from('commission_config')
        .select('*').eq('target_type', 'provider').eq('target_id', providerId).eq('is_active', true).single();
      if (provConfig) {
        commissionRate = provConfig.commission_value;
        commissionType = provConfig.commission_type;
      }
    }

    if (commissionType === 'percentage') {
      return amountUsd * (commissionRate / 100);
    }
    return commissionRate;
  },

  // --- Data Exports ---
  createDataExport: async (exportData: any) => {
    const { data } = await supabase.from('data_exports').insert(exportData).select().single();
    return data;
  },

  getDataExports: async () => {
    const { data } = await supabase.from('data_exports').select('*').order('created_at', { ascending: false }).limit(50);
    return data || [];
  },
};

// =====================================================
// SUPABASE STORAGE HELPERS
// =====================================================

/**
 * Storage bucket names used in South Wallet
 */
export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  banners: 'banners',
  providers: 'providers',
  products: 'products',
  general: 'general',
  kycDocuments: 'kyc-documents',
  wallet: 'Wallet',
} as const;

export type StorageBucketName = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * Storage helper object - uses supabaseAdmin (service role) to bypass RLS
 * All storage operations go through the admin client for reliability.
 */
export const storage = {
  /**
   * Upload a file to a storage bucket
   * @param bucket - The bucket name
   * @param path - The file path within the bucket (e.g., 'user-123/profile.png')
   * @param file - The file to upload (File, Blob, or ArrayBuffer)
   * @param contentType - MIME type of the file
   * @returns The public URL of the uploaded file (for public buckets) or the storage path
   */
  upload: async (
    bucket: StorageBucketName,
    path: string,
    file: File | Blob | ArrayBuffer,
    contentType?: string,
  ): Promise<{ path: string; publicUrl: string | null; error: string | null }> => {
    try {
      const options: any = {};
      if (contentType) {
        options.contentType = contentType;
      }

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, file, options);

      if (error) {
        return { path: '', publicUrl: null, error: error.message };
      }

      // Get public URL if the bucket is public
      let publicUrl: string | null = null;
      if (bucket !== STORAGE_BUCKETS.kycDocuments) {
        const { data: urlData } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(path);
        publicUrl = urlData?.publicUrl || null;
      }

      return { path: data?.path || path, publicUrl, error: null };
    } catch (err: any) {
      return { path: '', publicUrl: null, error: err.message || 'Upload failed' };
    }
  },

  /**
   * Download a file from a storage bucket
   * @param bucket - The bucket name
   * @param path - The file path within the bucket
   * @returns The file data as a Blob
   */
  download: async (
    bucket: StorageBucketName,
    path: string,
  ): Promise<{ data: Blob | null; error: string | null }> => {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .download(path);

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data || null, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Download failed' };
    }
  },

  /**
   * Delete a file from a storage bucket
   * @param bucket - The bucket name
   * @param paths - Array of file paths to delete
   */
  delete: async (
    bucket: StorageBucketName,
    paths: string[],
  ): Promise<{ success: boolean; error: string | null }> => {
    try {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Delete failed' };
    }
  },

  /**
   * Get the public URL for a file in a public bucket
   * @param bucket - The bucket name (must be a public bucket)
   * @param path - The file path within the bucket
   */
  getPublicUrl: (bucket: StorageBucketName, path: string): string => {
    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);
    return data?.publicUrl || '';
  },

  /**
   * Create a signed URL for a file in a private bucket
   * @param bucket - The bucket name
   * @param path - The file path within the bucket
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   */
  getSignedUrl: async (
    bucket: StorageBucketName,
    path: string,
    expiresIn: number = 3600,
  ): Promise<{ url: string | null; error: string | null }> => {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        return { url: null, error: error.message };
      }

      return { url: data?.signedUrl || null, error: null };
    } catch (err: any) {
      return { url: null, error: err.message || 'Failed to create signed URL' };
    }
  },

  /**
   * List files in a bucket folder
   * @param bucket - The bucket name
   * @param folder - The folder path to list (empty string for root)
   * @param limit - Maximum number of files to return
   */
  list: async (
    bucket: StorageBucketName,
    folder: string = '',
    limit: number = 100,
  ): Promise<{ files: any[]; error: string | null }> => {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(folder, { limit, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        return { files: [], error: error.message };
      }

      return { files: data || [], error: null };
    } catch (err: any) {
      return { files: [], error: err.message || 'List failed' };
    }
  },

  /**
   * Move/rename a file in a bucket
   * @param bucket - The bucket name
   * @param fromPath - Current file path
   * @param toPath - New file path
   */
  move: async (
    bucket: StorageBucketName,
    fromPath: string,
    toPath: string,
  ): Promise<{ success: boolean; error: string | null }> => {
    try {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .move(fromPath, toPath);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Move failed' };
    }
  },

  /**
   * Copy a file within a bucket
   * @param bucket - The bucket name
   * @param fromPath - Source file path
   * @param toPath - Destination file path
   */
  copy: async (
    bucket: StorageBucketName,
    fromPath: string,
    toPath: string,
  ): Promise<{ path: string | null; error: string | null }> => {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .copy(fromPath, toPath);

      if (error) {
        return { path: null, error: error.message };
      }

      return { path: data?.path || toPath, error: null };
    } catch (err: any) {
      return { path: null, error: err.message || 'Copy failed' };
    }
  },

  /**
   * Upload an avatar image for a user
   * @param userId - The user ID
   * @param file - The image file
   */
  uploadAvatar: async (userId: string, file: File | Blob): Promise<{ url: string | null; error: string | null }> => {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const path = `${userId}/avatar.${ext}`;
    const result = await storage.upload(STORAGE_BUCKETS.avatars, path, file, `image/${ext}`);
    return { url: result.publicUrl, error: result.error };
  },

  /**
   * Upload a KYC document
   * @param userId - The user ID
   * @param docType - Document type (id_front, id_back, selfie, etc.)
   * @param file - The document file
   */
  uploadKycDocument: async (
    userId: string,
    docType: string,
    file: File | Blob,
  ): Promise<{ path: string | null; signedUrl: string | null; error: string | null }> => {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const path = `${userId}/${docType}.${ext}`;
    const result = await storage.upload(STORAGE_BUCKETS.kycDocuments, path, file, `image/${ext}`);

    if (result.error) {
      return { path: null, signedUrl: null, error: result.error };
    }

    // Get a signed URL since kyc-documents is a private bucket
    const signedResult = await storage.getSignedUrl(STORAGE_BUCKETS.kycDocuments, path);

    return { path: result.path, signedUrl: signedResult.url, error: null };
  },

  /**
   * Upload a banner image
   * @param bannerId - The banner ID
   * @param file - The image file
   */
  uploadBanner: async (bannerId: string, file: File | Blob): Promise<{ url: string | null; error: string | null }> => {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const path = `${bannerId}/banner.${ext}`;
    const result = await storage.upload(STORAGE_BUCKETS.banners, path, file, `image/${ext}`);
    return { url: result.publicUrl, error: result.error };
  },

  /**
   * Upload a provider icon/logo
   * @param providerId - The provider ID
   * @param file - The image file
   */
  uploadProviderIcon: async (providerId: string, file: File | Blob): Promise<{ url: string | null; error: string | null }> => {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const path = `${providerId}/icon.${ext}`;
    const result = await storage.upload(STORAGE_BUCKETS.providers, path, file, `image/${ext}`);
    return { url: result.publicUrl, error: result.error };
  },

  /**
   * Upload a product image
   * @param productId - The product ID
   * @param file - The image file
   */
  uploadProductImage: async (productId: string, file: File | Blob): Promise<{ url: string | null; error: string | null }> => {
    const ext = file instanceof File ? file.name.split('.').pop() || 'png' : 'png';
    const path = `${productId}/product.${ext}`;
    const result = await storage.upload(STORAGE_BUCKETS.products, path, file, `image/${ext}`);
    return { url: result.publicUrl, error: result.error };
  },

  /**
   * Upload a general file
   * @param folder - The folder within the general bucket
   * @param fileName - The file name
   * @param file - The file
   * @param contentType - MIME type
   */
  uploadGeneral: async (
    folder: string,
    fileName: string,
    file: File | Blob | ArrayBuffer,
    contentType?: string,
  ): Promise<{ url: string | null; error: string | null }> => {
    const path = `${folder}/${fileName}`;
    const result = await storage.upload(STORAGE_BUCKETS.general, path, file, contentType);
    return { url: result.publicUrl, error: result.error };
  },
};

// =====================================================
// FIREBASE STORAGE COMPATIBLE WRAPPERS
// =====================================================
// These exist so code that previously imported { ref, uploadBytesResumable,
// getDownloadURL, deleteObject } from 'firebase/storage' can keep the same
// call sites, now routed to Supabase Storage under the hood.

/**
 * Create a storage reference. The returned object captures the bucket + path
 * so uploadBytesResumable / getDownloadURL / deleteObject can act on it.
 *
 * Usage (Firebase-style):
 *   const r = storageRef(storage, 'banners/banner1.png');
 *   await uploadBytesResumable(r, file);
 *   const url = await getDownloadURL(r);
 */
export function ref(storageInstance: unknown, path: string): { bucket: string; path: string; fullPath: string } {
  // Strip leading 'gs://bucket/' if present
  const cleanPath = path.replace(/^gs:\/\/[^/]+\//, '').replace(/^\/+/, '');
  const parts = cleanPath.split('/');
  // If the first segment matches a known bucket name, treat it as bucket; else default to 'general'
  const knownBuckets = Object.values(STORAGE_BUCKETS);
  const firstSeg = parts[0];
  let bucket = 'general';
  let filePath = cleanPath;
  if (knownBuckets.includes(firstSeg as StorageBucketName)) {
    bucket = firstSeg;
    filePath = parts.slice(1).join('/');
  }
  return { bucket, path: filePath, fullPath: `${bucket}/${filePath}` };
}

/** Alias for `ref` so `import { ref as storageRef }` from supabase.ts works. */
export { ref as storageRef };

/**
 * Upload bytes (resumable-style API). Returns a snapshot with a ref.
 */
export async function uploadBytesResumable(
  r: { bucket: string; path: string },
  data: Blob | Uint8Array | ArrayBuffer | File,
  metadata?: { contentType?: string }
): Promise<{ ref: typeof r; metadata: { contentType?: string; size: number } }> {
  const contentType = metadata?.contentType ||
    (data instanceof File ? data.type : 'application/octet-stream');
  const result = await storage.upload(
    r.bucket as StorageBucketName,
    r.path,
    data as Blob | ArrayBuffer,
    contentType
  );
  if (result.error) {
    throw new Error(result.error);
  }
  return { ref: r, metadata: { contentType, size: (data as Blob).size || 0 } };
}

/**
 * Get the public URL for a storage object.
 */
export async function getDownloadURL(r: { bucket: string; path: string }): Promise<string> {
  return storage.getPublicUrl(r.bucket as StorageBucketName, r.path);
}

/**
 * Delete a storage object.
 */
export async function deleteObject(r: { bucket: string; path: string }): Promise<void> {
  await storage.delete(r.bucket as StorageBucketName, r.path);
}
