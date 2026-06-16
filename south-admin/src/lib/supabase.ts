/**
 * Supabase Client for South Admin App
 *
 * Supabase handles: sections, providers, products, orders, tickets, chats
 * Firebase handles: Auth only (authentication, FCM push notifications, Storage)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifmxseonkdsxuanznny.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk3NzAsImV4cCI6MjA5NzA0NTc3MH0.4KbBtMruP_xrPiHe_XtcoHG7NVQhlflhUUkJFWgQxkM';

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
