// Escrow Chat Service - Tripartite chat (Seller/Buyer/Admin)
// Uses Supabase for data storage and real-time subscriptions

import { supabase } from './supabase';

export interface EscrowChat {
  id: string;
  escrowId: string;
  buyerId: string | null;
  buyerName: string | null;
  sellerId: string | null;
  sellerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: 'seller' | 'buyer' | 'admin';
  message: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  attachmentUrl?: string | null;
  createdAt: string;
  isRead: boolean;
}

/**
 * Get or create an escrow chat room for a given escrow transaction.
 * The escrowId comes from Firebase (e.g., "escrow-1749xxx-abc").
 */
export async function getOrCreateEscrowChat(
  escrowId: string,
  buyerId?: string,
  buyerName?: string,
  sellerId?: string,
  sellerName?: string
): Promise<string | null> {
  // Try to get existing chat
  const { data: existing } = await supabase
    .from('escrow_chats')
    .select('id')
    .eq('escrow_id', escrowId)
    .single();

  if (existing) return existing.id;

  // Create new chat room
  const insertData: Record<string, unknown> = {
    escrow_id: escrowId,
  };
  if (buyerId) insertData.buyer_id = buyerId;
  if (buyerName) insertData.buyer_name = buyerName;
  if (sellerId) insertData.seller_id = sellerId;
  if (sellerName) insertData.seller_name = sellerName;

  const { data, error } = await supabase
    .from('escrow_chats')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Error creating escrow chat:', error);
    // It might have been created concurrently, try to fetch again
    const { data: retry } = await supabase
      .from('escrow_chats')
      .select('id')
      .eq('escrow_id', escrowId)
      .single();
    return retry?.id || null;
  }
  return data.id;
}

/**
 * Get the chat ID for an escrow without creating one.
 */
export async function getEscrowChatId(escrowId: string): Promise<string | null> {
  const { data } = await supabase
    .from('escrow_chats')
    .select('id')
    .eq('escrow_id', escrowId)
    .single();
  return data?.id || null;
}

/**
 * Fetch all messages for a chat room.
 */
export async function getEscrowChatMessages(chatId: string): Promise<EscrowChatMessage[]> {
  const { data, error } = await supabase
    .from('escrow_chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching escrow chat messages:', error);
    return [];
  }

  return (data || []).map(mapDbMessage);
}

/**
 * Send a message in an escrow chat.
 */
export async function sendEscrowChatMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  senderRole: 'seller' | 'buyer' | 'admin',
  message: string,
  messageType: 'text' | 'image' | 'file' | 'system' = 'text',
  attachmentUrl?: string
): Promise<EscrowChatMessage | null> {
  const { data, error } = await supabase
    .from('escrow_chat_messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      message,
      message_type: messageType,
      attachment_url: attachmentUrl || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending escrow chat message:', error);
    return null;
  }

  return mapDbMessage(data);
}

/**
 * Mark messages as read for a specific user in a chat.
 */
export async function markMessagesAsRead(chatId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('escrow_chat_messages')
    .update({ is_read: true })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Get unread message count for a user in a chat.
 */
export async function getUnreadCount(chatId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('escrow_chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Subscribe to real-time new messages in an escrow chat.
 * Returns an unsubscribe function.
 */
export function subscribeToEscrowChat(
  chatId: string,
  callback: (message: EscrowChatMessage) => void
): () => void {
  const channel = supabase
    .channel(`escrow-chat-${chatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'escrow_chat_messages',
      filter: `chat_id=eq.${chatId}`,
    }, (payload) => {
      const newMsg = mapDbMessage(payload.new);
      callback(newMsg);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to real-time updates for all escrow chats (for admin dashboard).
 * Returns an unsubscribe function.
 */
export function subscribeToAllEscrowChats(
  callback: (message: EscrowChatMessage) => void
): () => void {
  const channel = supabase
    .channel('escrow-chat-all')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'escrow_chat_messages',
    }, (payload) => {
      const newMsg = mapDbMessage(payload.new);
      callback(newMsg);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get all escrow chats (for admin).
 */
export async function getAllEscrowChats(): Promise<EscrowChat[]> {
  const { data, error } = await supabase
    .from('escrow_chats')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching all escrow chats:', error);
    return [];
  }

  return (data || []).map(mapDbChat);
}

/**
 * Get recent messages for a chat (limited).
 */
export async function getRecentEscrowChatMessages(chatId: string, limit: number = 50): Promise<EscrowChatMessage[]> {
  const { data, error } = await supabase
    .from('escrow_chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent escrow chat messages:', error);
    return [];
  }

  // Reverse to show oldest first
  return (data || []).map(mapDbMessage).reverse();
}

// ──────────────────────────────────────────────
// DB row → application model mappers
// ──────────────────────────────────────────────

function mapDbMessage(db: Record<string, unknown>): EscrowChatMessage {
  return {
    id: db.id as string,
    chatId: db.chat_id as string,
    senderId: db.sender_id as string,
    senderName: db.sender_name as string,
    senderRole: db.sender_role as 'seller' | 'buyer' | 'admin',
    message: db.message as string,
    messageType: (db.message_type as 'text' | 'image' | 'file' | 'system') || 'text',
    attachmentUrl: db.attachment_url as string | null | undefined,
    createdAt: db.created_at as string,
    isRead: (db.is_read as boolean) ?? false,
  };
}

function mapDbChat(db: Record<string, unknown>): EscrowChat {
  return {
    id: db.id as string,
    escrowId: db.escrow_id as string,
    buyerId: (db.buyer_id as string) || null,
    buyerName: (db.buyer_name as string) || null,
    sellerId: (db.seller_id as string) || null,
    sellerName: (db.seller_name as string) || null,
    createdAt: db.created_at as string,
    updatedAt: db.updated_at as string,
  };
}
