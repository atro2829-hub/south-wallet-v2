-- Escrow Chat System - Tripartite chat between Seller, Buyer, and Admin
-- Note: escrow_id references Firebase escrow IDs (TEXT) since escrow_transactions live in Firebase

CREATE TABLE IF NOT EXISTS escrow_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_id TEXT NOT NULL, -- Firebase escrow ID (e.g., "escrow-1749xxx-abc")
  buyer_id TEXT,           -- Firebase UID of the buyer
  buyer_name TEXT,         -- Display name of the buyer
  seller_id TEXT,          -- Firebase UID of the seller
  seller_name TEXT,        -- Display name of the seller
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(escrow_id)
);

-- Chat messages - each message shows which role sent it
CREATE TABLE IF NOT EXISTS escrow_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES escrow_chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL, -- Firebase UID of the sender
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('seller', 'buyer', 'admin')),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_escrow_chats_escrow_id ON escrow_chats(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_chat_messages_chat_id ON escrow_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_escrow_chat_messages_created ON escrow_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_escrow_chat_messages_sender ON escrow_chat_messages(sender_id);

-- RLS Policies
ALTER TABLE escrow_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_chat_messages ENABLE ROW LEVEL SECURITY;

-- Participants can read escrow chats they're part of
CREATE POLICY "Participants can read escrow chats" ON escrow_chats
  FOR SELECT USING (
    buyer_id = auth.uid()::text OR seller_id = auth.uid()::text
  );

-- Participants can read messages in their chats
CREATE POLICY "Participants can read chat messages" ON escrow_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escrow_chats ec
      WHERE ec.id = escrow_chat_messages.chat_id
      AND (ec.buyer_id = auth.uid()::text OR ec.seller_id = auth.uid()::text)
    )
  );

-- Participants can insert messages in their chats
CREATE POLICY "Participants can send messages" ON escrow_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM escrow_chats ec
      WHERE ec.id = escrow_chat_messages.chat_id
      AND (ec.buyer_id = auth.uid()::text OR ec.seller_id = auth.uid()::text)
    )
  );

-- Participants can update their own messages (mark as read)
CREATE POLICY "Participants can update message read status" ON escrow_chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM escrow_chats ec
      WHERE ec.id = escrow_chat_messages.chat_id
      AND (ec.buyer_id = auth.uid()::text OR ec.seller_id = auth.uid()::text)
    )
  );

-- Admin can do everything on chats
CREATE POLICY "Admin can read all chats" ON escrow_chats FOR SELECT USING (true);
CREATE POLICY "Admin can insert chats" ON escrow_chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update chats" ON escrow_chats FOR UPDATE USING (true);
CREATE POLICY "Admin can read all messages" ON escrow_chat_messages FOR SELECT USING (true);
CREATE POLICY "Admin can send messages" ON escrow_chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can update all messages" ON escrow_chat_messages FOR UPDATE USING (true);

-- Function to automatically update updated_at on new message
CREATE OR REPLACE FUNCTION update_escrow_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE escrow_chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_escrow_chat_message_inserted
  AFTER INSERT ON escrow_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_escrow_chat_updated_at();
