-- Direct client-to-client chat system
CREATE TABLE IF NOT EXISTS direct_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant1_id TEXT NOT NULL, -- Firebase UID of user 1
  participant1_name TEXT NOT NULL,
  participant2_id TEXT NOT NULL, -- Firebase UID of user 2
  participant2_name TEXT NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

CREATE TABLE IF NOT EXISTS direct_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES direct_chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_direct_chat_messages_chat_id ON direct_chat_messages(chat_id);
CREATE INDEX idx_direct_chat_messages_created ON direct_chat_messages(created_at);
CREATE INDEX idx_direct_chats_participants ON direct_chats(participant1_id, participant2_id);

-- RLS: Users can only see chats they're part of
ALTER TABLE direct_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own chats" ON direct_chats
  FOR SELECT USING (participant1_id = auth.uid()::text OR participant2_id = auth.uid()::text);

CREATE POLICY "Users read their chat messages" ON direct_chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM direct_chats WHERE id = direct_chat_messages.chat_id AND (participant1_id = auth.uid()::text OR participant2_id = auth.uid()::text))
  );

CREATE POLICY "Users insert messages" ON direct_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM direct_chats WHERE id = direct_chat_messages.chat_id AND (participant1_id = auth.uid()::text OR participant2_id = auth.uid()::text))
  );

CREATE POLICY "Users update read status" ON direct_chat_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM direct_chats WHERE id = direct_chat_messages.chat_id AND (participant1_id = auth.uid()::text OR participant2_id = auth.uid()::text))
  );

-- Admin can see all
CREATE POLICY "Admin all access direct_chats" ON direct_chats FOR SELECT USING (true);
CREATE POLICY "Admin all access direct_chat_messages" ON direct_chat_messages FOR SELECT USING (true);
