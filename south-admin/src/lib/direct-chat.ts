// Direct Client-to-Client Chat Service (Admin copy)
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
 * Subscribe to real-time new messages in a direct chat.
 * Returns an unsubscribe function.
 */
export function subscribeToDirectChat(
  chatId: string,
  callback: (message: DirectChatMessage) => void
): () => void {
  const channel = supabase
    .channel(`direct-chat-${chatId}`)
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
    supabase.removeChannel(channel);
  };
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
