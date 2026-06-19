// Direct Client-to-Client Chat Service
// Uses Supabase for data storage and real-time subscriptions

import { supabase } from './supabase';

export interface DirectChat {
  id: string;
  participant1Id: string;
  participant1Name: string;
  participant2Id: string;
  participant2Name: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface DirectChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachmentUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * Get or create a direct chat between two users.
 * Participant IDs are sorted to ensure consistent ordering and prevent duplicates.
 */
export async function getOrCreateDirectChat(
  user1Id: string, user1Name: string,
  user2Id: string, user2Name: string
): Promise<string | null> {
  // Sort IDs to ensure consistent ordering
  const [p1Id, p1Name, p2Id, p2Name] = user1Id < user2Id
    ? [user1Id, user1Name, user2Id, user2Name]
    : [user2Id, user2Name, user1Id, user1Name];

  // Try to find existing
  const { data: existing } = await supabase
    .from('direct_chats')
    .select('id')
    .eq('participant1_id', p1Id)
    .eq('participant2_id', p2Id)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data, error } = await supabase
    .from('direct_chats')
    .insert({
      participant1_id: p1Id,
      participant1_name: p1Name,
      participant2_id: p2Id,
      participant2_name: p2Name,
    })
    .select('id')
    .single();

  if (error) {
    // Might have been created concurrently
    const { data: retry } = await supabase
      .from('direct_chats')
      .select('id')
      .eq('participant1_id', p1Id)
      .eq('participant2_id', p2Id)
      .single();
    return retry?.id || null;
  }
  return data.id;
}

/**
 * Get all direct chats for a user, ordered by most recent message.
 */
export async function getUserDirectChats(userId: string): Promise<DirectChat[]> {
  const { data, error } = await supabase
    .from('direct_chats')
    .select('*')
    .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching direct chats:', error);
    return [];
  }
  return (data || []).map(mapDbChat);
}

/**
 * Get messages for a specific direct chat.
 */
export async function getDirectChatMessages(chatId: string): Promise<DirectChatMessage[]> {
  const { data, error } = await supabase
    .from('direct_chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching direct chat messages:', error);
    return [];
  }
  return (data || []).map(mapDbMessage);
}

/**
 * Send a message in a direct chat.
 */
export async function sendDirectChatMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  message: string,
  messageType: 'text' | 'image' | 'file' | 'system' = 'text',
  attachmentUrl?: string
): Promise<DirectChatMessage | null> {
  const { data, error } = await supabase
    .from('direct_chat_messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      sender_name: senderName,
      message,
      message_type: messageType,
      attachment_url: attachmentUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending direct chat message:', error);
    return null;
  }

  // Update last message on the chat row
  await supabase
    .from('direct_chats')
    .update({
      last_message: message.substring(0, 100),
      last_message_at: new Date().toISOString(),
    })
    .eq('id', chatId);

  return mapDbMessage(data);
}

/**
 * Mark all unread messages in a chat as read for a given user.
 */
export async function markDirectMessagesAsRead(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('direct_chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking direct messages as read:', error);
  }
}

/**
 * Get the unread message count for a user in a specific chat.
 */
export async function getDirectUnreadCount(chatId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('direct_chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting direct unread count:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Subscribe to real-time new messages in a direct chat.
 * Returns an unsubscribe function.
 */
export function subscribeToDirectChat(
  chatId: string,
  callback: (message: DirectChatMessage) => void
): () => void {
  const channel = supabase
    .channel(`direct-chat-${chatId}-${Date.now()}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_chat_messages',
      filter: `chat_id=eq.${chatId}`,
    }, (payload) => {
      callback(mapDbMessage(payload.new));
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

/**
 * Subscribe to real-time updates for the chat list of a user.
 * Fires callback when any chat or message changes.
 * Returns an unsubscribe function.
 */
export function subscribeToDirectChatList(
  userId: string,
  callback: () => void
): () => void {
  const channel = supabase
    .channel(`direct-chat-list-${userId}-${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'direct_chats',
    }, () => {
      callback();
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_chat_messages',
    }, () => {
      callback();
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

/**
 * Search for users by name or phone to start a new chat.
 * Searches the Supabase users table.
 */
export async function searchUsersForChat(
  query: string,
  currentUserId: string
): Promise<Array<{ id: string; name: string; phone: string; avatar: string }>> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from('users')
    .select('firebase_uid, display_name, phone, avatar_url')
    .neq('firebase_uid', currentUserId)
    .or(`display_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .eq('is_active', true)
    .eq('is_blocked', false)
    .limit(20);

  if (error) {
    console.error('Error searching users for chat:', error);
    return [];
  }

  return (data || []).map((u: any) => ({
    id: u.firebase_uid || '',
    name: u.display_name || '',
    phone: u.phone || '',
    avatar: u.avatar_url || '',
  })).filter((u: any) => u.id);
}

/**
 * Get all direct chats (for admin monitoring).
 */
export async function getAllDirectChats(): Promise<DirectChat[]> {
  const { data, error } = await supabase
    .from('direct_chats')
    .select('*')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching all direct chats:', error);
    return [];
  }
  return (data || []).map(mapDbChat);
}

// ──────────────────────────────────────────────
// DB row → application model mappers
// ──────────────────────────────────────────────

function mapDbMessage(db: Record<string, unknown>): DirectChatMessage {
  return {
    id: db.id as string,
    chatId: db.chat_id as string,
    senderId: db.sender_id as string,
    senderName: db.sender_name as string,
    message: db.message as string,
    messageType: (db.message_type as 'text' | 'image' | 'file' | 'system') || 'text',
    attachmentUrl: db.attachment_url as string | null | undefined,
    isRead: (db.is_read as boolean) ?? false,
    createdAt: db.created_at as string,
  };
}

function mapDbChat(db: Record<string, unknown>): DirectChat {
  return {
    id: db.id as string,
    participant1Id: db.participant1_id as string,
    participant1Name: db.participant1_name as string,
    participant2Id: db.participant2_id as string,
    participant2Name: db.participant2_name as string,
    lastMessage: (db.last_message as string) || null,
    lastMessageAt: (db.last_message_at as string) || null,
    createdAt: db.created_at as string,
  };
}
