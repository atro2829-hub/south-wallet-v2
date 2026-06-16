/**
 * Supabase Client for South Admin App
 *
 * Supabase handles: sections, providers, products, orders, tickets, chats
 * Firebase handles: Auth only (authentication, FCM push notifications, Storage)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifmxseonkdsxuanznny.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk3NzAsImV4cCI6MjA5NzA0NTc3MH0.4KbBtMruP_xrPiHe_XtcoHG7NVQhlflhUUkJFWgQxkM';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ2OTc3MCwiZXhwIjoyMDk3MDQ1NzcwfQ.b1X7ydSkbOwS0LG39h22bvZg65qT0bCI7y5omrHw_rM';

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

// Admin client with service_role key — bypasses RLS for all admin panel operations.
// Required because: admin app needs to read/write all users, banks, wallets, gift codes,
// maintenance, KYC, support tickets, etc. without per-user RLS restrictions.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =====================================================
// TYPE DEFINITIONS - Matching Supabase schema
// =====================================================

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
  type: 'manual' | 'api' | 'wallet';
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
  type: 'manual' | 'api' | 'wallet';
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
  input_type: string;
  input_prefix: string;
  input_validation: string;
  input_placeholder: string;
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
  last_balance_check: string;
  default_commission: number;
  commission_type: 'percentage' | 'fixed';
  sync_categories: boolean;
  sync_products: boolean;
  last_sync_at: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbSupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: 'general' | 'technical' | 'financial' | 'complaint' | 'suggestion';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface DbSupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: 'user' | 'admin' | 'system';
  message: string;
  attachments: unknown[];
  is_read: boolean;
  created_at: string;
}

export interface DbEscrowChat {
  id: string;
  escrow_id: string;
  buyer_id: string | null;
  buyer_name: string | null;
  seller_id: string | null;
  seller_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEscrowChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'seller' | 'buyer' | 'admin';
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachment_url: string | null;
  created_at: string;
  is_read: boolean;
}

export interface DbDirectChat {
  id: string;
  participant1_id: string;
  participant1_name: string;
  participant2_id: string;
  participant2_name: string;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface DbDirectChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DbSupportLivechat {
  id: string;
  user_id: string;
  admin_id: string | null;
  status: 'waiting' | 'active' | 'closed';
  last_message: string;
  last_message_at: string | null;
  unread_user: number;
  unread_admin: number;
  created_at: string;
  updated_at: string;
}

export interface DbLivechatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin' | 'system';
  message: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  attachments: unknown[];
  is_read: boolean;
  created_at: string;
}

// =====================================================
// ADMIN API FUNCTIONS
// =====================================================

// --- Sections ---

export async function getSections(): Promise<DbSection[]> {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('Error fetching sections:', error); return []; }
  return data || [];
}

export async function upsertSection(section: Partial<DbSection> & { id: string }): Promise<boolean> {
  const { error } = await supabase
    .from('sections')
    .upsert({ ...section, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) { console.error('Error upserting section:', error); return false; }
  return true;
}

export async function deleteSection(id: string): Promise<boolean> {
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) { console.error('Error deleting section:', error); return false; }
  return true;
}

export async function reorderSections(orderedIds: string[]): Promise<boolean> {
  const updates = orderedIds.map((id, index) =>
    supabase.from('sections').update({ sort_order: index, updated_at: new Date().toISOString() }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);
  if (hasError) { console.error('Error reordering sections'); return false; }
  return true;
}

export async function toggleSectionVisibility(id: string, isVisible: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('sections')
    .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('Error toggling section visibility:', error); return false; }
  return true;
}

// --- Support Tickets ---

export async function getSupportTickets(): Promise<(DbSupportTicket & { user_name?: string })[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*, users!support_tickets_user_id_fkey(display_name, firebase_uid)')
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching tickets:', error); return []; }
  return (data || []).map((t: any) => ({
    ...t,
    user_name: t.users?.display_name || 'مستخدم',
    user_firebase_uid: t.users?.firebase_uid || '',
  }));
}

export async function getSupportMessages(ticketId: string): Promise<DbSupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) { console.error('Error fetching messages:', error); return []; }
  return data || [];
}

export async function sendSupportMessage(
  ticketId: string,
  senderId: string | null,
  message: string,
  senderType: 'admin' | 'system' = 'admin'
): Promise<DbSupportMessage | null> {
  const { data, error } = await supabase
    .from('support_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: senderId,
      sender_type: senderType,
      message,
    })
    .select()
    .single();
  if (error) { console.error('Error sending message:', error); return null; }
  // Update ticket timestamp
  await supabase
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  return data;
}

export async function updateTicketStatus(
  ticketId: string,
  status: DbSupportTicket['status'],
  assignedTo?: string
): Promise<boolean> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (assignedTo !== undefined) updates.assigned_to = assignedTo;
  if (status === 'resolved' || status === 'closed') updates.resolved_at = new Date().toISOString();

  const { error } = await supabase.from('support_tickets').update(updates).eq('id', ticketId);
  if (error) { console.error('Error updating ticket status:', error); return false; }
  return true;
}

// --- Escrow Chats ---

export async function getEscrowChats(): Promise<DbEscrowChat[]> {
  const { data, error } = await supabase
    .from('escrow_chats')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) { console.error('Error fetching escrow chats:', error); return []; }
  return data || [];
}

export async function getEscrowChatMessages(chatId: string): Promise<DbEscrowChatMessage[]> {
  const { data, error } = await supabase
    .from('escrow_chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) { console.error('Error fetching escrow chat messages:', error); return []; }
  return data || [];
}

export async function sendEscrowChatMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  message: string,
  senderRole: 'admin' = 'admin'
): Promise<DbEscrowChatMessage | null> {
  const { data, error } = await supabase
    .from('escrow_chat_messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      message,
      message_type: 'text',
    })
    .select()
    .single();
  if (error) { console.error('Error sending escrow message:', error); return null; }
  return data;
}

// --- Direct Chats (Monitor) ---

export async function getDirectChats(): Promise<DbDirectChat[]> {
  const { data, error } = await supabase
    .from('direct_chats')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });
  if (error) { console.error('Error fetching direct chats:', error); return []; }
  return data || [];
}

export async function getDirectChatMessages(chatId: string): Promise<DbDirectChatMessage[]> {
  const { data, error } = await supabase
    .from('direct_chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) { console.error('Error fetching direct chat messages:', error); return []; }
  return data || [];
}

// --- API Providers ---

export async function getApiProviders(): Promise<DbApiProvider[]> {
  const { data, error } = await supabase
    .from('api_providers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching API providers:', error); return []; }
  return data || [];
}

// --- G2Bulk Settings (stored in admin_settings table or Firebase) ---
// G2Bulk still uses Firebase for settings since there's no dedicated Supabase table

export async function getG2BulkSettingsFromSupabase(): Promise<{
  apiKey: string;
  enabled: boolean;
  autoSync: boolean;
  lastSync: string;
  markupPercent: number;
} | null> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'g2bulk')
    .single();
  if (error || !data) return null;
  return data.value as any;
}

export async function saveG2BulkSettingsToSupabase(settings: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key: 'g2bulk', value: settings }, { onConflict: 'key' });
  if (error) { console.error('Error saving G2Bulk settings:', error); return false; }
  return true;
}

// =====================================================
// SUPABASE STORAGE HELPERS (Firebase-compat)
// =====================================================

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

export const storage = {
  upload: async (
    bucket: StorageBucketName,
    path: string,
    file: File | Blob | ArrayBuffer,
    contentType?: string,
  ): Promise<{ path: string; publicUrl: string | null; error: string | null }> => {
    try {
      const options: any = {};
      if (contentType) options.contentType = contentType;
      const { data, error } = await supabaseAdmin.storage.from(bucket).upload(path, file, options);
      if (error) return { path: '', publicUrl: null, error: error.message };
      let publicUrl: string | null = null;
      if (bucket !== STORAGE_BUCKETS.kycDocuments) {
        const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
        publicUrl = urlData?.publicUrl || null;
      }
      return { path: data?.path || path, publicUrl, error: null };
    } catch (err: any) {
      return { path: '', publicUrl: null, error: err.message || 'Upload failed' };
    }
  },

  delete: async (bucket: StorageBucketName, path: string): Promise<{ success: boolean; error: string | null }> => {
    try {
      const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
      if (error) return { success: false, error: error.message };
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Delete failed' };
    }
  },

  getPublicUrl: (bucket: StorageBucketName, path: string): string => {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || '';
  },

  list: async (bucket: StorageBucketName, folder: string = '', limit: number = 100) => {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(folder, { limit, sortBy: { column: 'created_at', order: 'desc' } });
      if (error) return { files: [], error: error.message };
      return { files: data || [], error: null };
    } catch (err: any) {
      return { files: [], error: err.message || 'List failed' };
    }
  },
};

// Firebase Storage-compatible wrappers
export function ref(_storageInstance: unknown, path: string): { bucket: string; path: string; fullPath: string } {
  const cleanPath = path.replace(/^gs:\/\/[^/]+\//, '').replace(/^\/+/, '');
  const parts = cleanPath.split('/');
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

export { ref as storageRef };

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
  if (result.error) throw new Error(result.error);
  return { ref: r, metadata: { contentType, size: (data as Blob).size || 0 } };
}

export async function getDownloadURL(r: { bucket: string; path: string }): Promise<string> {
  return storage.getPublicUrl(r.bucket as StorageBucketName, r.path);
}

export async function deleteObject(r: { bucket: string; path: string }): Promise<void> {
  await storage.delete(r.bucket as StorageBucketName, r.path);
}

// =====================================================
// SUPABASE SERVICE SHIM (used by supabase-auth.ts)
// =====================================================

export const supabaseService = {
  /** Generate a unique 6-digit card_number not yet present in the users table. */
  async generateUniqueCardNumber(maxAttempts = 100): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const prefix = 10 + Math.floor(i / 5);
      if (prefix > 99) break;
      const random4 = Math.floor(1000 + Math.random() * 9000).toString();
      const candidate = String(prefix) + random4;
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('card_number', candidate)
        .maybeSingle();
      if (!error && !data) {
        return candidate;
      }
    }
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async getUserById(id: string) {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getUserByFirebaseUid(firebaseUid: string) {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('firebase_uid', firebaseUid).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getUserByCardNumber(cardNumber: string) {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('card_number', cardNumber).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createUser(user: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from('users').insert(user).select().single();
    if (error) throw error;
    return data;
  },

  async updateUser(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabaseAdmin.from('users').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async ensureUser(firebaseUid: string, data: Record<string, unknown>) {
    try {
      const existing = await this.getUserByFirebaseUid(firebaseUid);
      const userData: Record<string, unknown> = {
        firebase_uid: firebaseUid,
        email: (data.email as string) || null,
        phone: (data.phone as string) || null,
        display_name: (data.displayName as string) || '',
        first_name: (data.firstName as string) || '',
        second_name: (data.secondName as string) || '',
        third_name: (data.thirdName as string) || '',
        family_name: (data.familyName as string) || '',
        avatar_url: (data.avatar as string) || '',
        role: (data.role as string) || 'user',
        is_active: true,
        is_blocked: false,
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        if (data.userId && !existing.card_number) {
          userData.card_number = data.userId;
        }
        const { error } = await supabaseAdmin.from('users').update(userData).eq('id', existing.id);
        if (error) console.error('[ensureUser] update failed:', error);
      } else {
        let cardNumber = (data.userId as string) || '';
        if (!cardNumber) cardNumber = await this.generateUniqueCardNumber();
        userData.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : undefined;
        userData.card_number = cardNumber;
        userData.card_issued_at = new Date().toISOString();
        userData.kyc_status = 'pending';
        userData.created_at = new Date().toISOString();
        const { error } = await supabaseAdmin.from('users').insert(userData);
        if (error) console.error('[ensureUser] insert failed:', error);
      }
    } catch (err) {
      console.error('[ensureUser] error:', err);
    }
  },
};
