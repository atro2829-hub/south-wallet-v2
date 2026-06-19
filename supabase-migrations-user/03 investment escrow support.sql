-- ============================================================
-- WALLET APP — SUPABASE POSTGRESQL
-- الملف 03: الاستثمار، الوساطة، الأكواد، الدعم، الإشعارات
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 12. خطط الاستثمار
-- ═══════════════════════════════════════════════════════════
CREATE TABLE investment_plans (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar          TEXT          NOT NULL,
  name_en          TEXT          NOT NULL DEFAULT '',
  description      TEXT,
  badge_text       TEXT,         -- 'الأكثر شيوعاً' | 'جديد'
  badge_color      TEXT,

  -- شروط الاستثمار
  min_amount       NUMERIC(18,4) NOT NULL CHECK (min_amount > 0),
  max_amount       NUMERIC(18,4) NOT NULL CHECK (max_amount >= min_amount),
  duration_days    INT           NOT NULL CHECK (duration_days > 0),
  profit_rate      NUMERIC(5,2)  NOT NULL CHECK (profit_rate > 0),
  currency         currency_enum NOT NULL DEFAULT 'USD',

  -- القيود
  max_slots        INT,          -- عدد الاستثمارات المتاحة (NULL = غير محدود)
  used_slots       INT           NOT NULL DEFAULT 0,
  min_kyc_required BOOLEAN       NOT NULL DEFAULT FALSE,

  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order       INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inv_plans_active ON investment_plans(is_active, sort_order);

CREATE TRIGGER trg_inv_plans_updated_at
  BEFORE UPDATE ON investment_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE investment_plans IS 'خطط الاستثمار المتاحة — تُدار من لوحة الأدمن';

-- ═══════════════════════════════════════════════════════════
-- 13. استثمارات المستخدمين
-- ═══════════════════════════════════════════════════════════
CREATE TABLE investments (
  id                    UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID              NOT NULL REFERENCES users(id),
  plan_id               UUID              NOT NULL REFERENCES investment_plans(id),

  -- المبالغ
  amount                NUMERIC(18,4)     NOT NULL CHECK (amount > 0),
  currency              currency_enum     NOT NULL,
  profit_rate_snapshot  NUMERIC(5,2)      NOT NULL,  -- سعر وقت الاستثمار
  expected_return       NUMERIC(18,4)     NOT NULL,  -- المبلغ + الأرباح
  actual_return         NUMERIC(18,4),               -- عند الإكمال

  -- الحالة والتواريخ
  status                investment_status NOT NULL DEFAULT 'active',
  starts_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  ends_at               TIMESTAMPTZ       NOT NULL,
  completed_at          TIMESTAMPTZ,
  completed_by          UUID              REFERENCES users(id),
  cancel_reason         TEXT,

  -- ربط المعاملات
  transaction_id        UUID              REFERENCES transactions(id),  -- عند الخصم
  payout_tx_id          UUID              REFERENCES transactions(id),  -- عند العائد

  metadata              JSONB             NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investments_user_id    ON investments(user_id, created_at DESC);
CREATE INDEX idx_investments_status     ON investments(status);
CREATE INDEX idx_investments_ends_at    ON investments(ends_at) WHERE status = 'active';
CREATE INDEX idx_investments_plan_id    ON investments(plan_id);

COMMENT ON TABLE investments IS 'استثمارات المستخدمين النشطة والمنتهية';

-- ═══════════════════════════════════════════════════════════
-- 14. معاملات الوساطة (Escrow)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE escrow_transactions (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  join_code        CHAR(6)       NOT NULL UNIQUE DEFAULT generate_join_code(),

  -- الأطراف
  buyer_id         UUID          NOT NULL REFERENCES users(id),
  seller_id        UUID          REFERENCES users(id),
  admin_id         UUID          REFERENCES users(id),

  -- تفاصيل الصفقة
  category_id      TEXT          REFERENCES categories(id),
  category_name    TEXT          NOT NULL,
  amount           NUMERIC(18,4) NOT NULL CHECK (amount > 0),
  currency         currency_enum NOT NULL,
  fee              NUMERIC(18,4) NOT NULL DEFAULT 0,
  fee_percent      NUMERIC(5,2)  NOT NULL DEFAULT 2.50,
  description      TEXT,

  -- الحالة
  status           escrow_status NOT NULL DEFAULT 'waiting',

  -- التوقيتات
  expires_at       TIMESTAMPTZ   NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  joined_at        TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID          REFERENCES users(id),
  resolution       TEXT,         -- 'released' | 'refunded'
  resolution_note  TEXT,

  -- ربط المعاملات
  hold_tx_id       UUID          REFERENCES transactions(id),
  release_tx_id    UUID          REFERENCES transactions(id),

  metadata         JSONB         NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escrow_buyer    ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_seller   ON escrow_transactions(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX idx_escrow_status   ON escrow_transactions(status);
CREATE INDEX idx_escrow_code     ON escrow_transactions(join_code);
CREATE INDEX idx_escrow_active   ON escrow_transactions(status, created_at DESC)
  WHERE status IN ('waiting', 'active', 'hold');

CREATE TRIGGER trg_escrow_updated_at
  BEFORE UPDATE ON escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE escrow_transactions IS 'معاملات الوساطة الثلاثية — مشتري + بائع + أدمن';

-- ═══════════════════════════════════════════════════════════
-- 15. شات الوساطة
-- ═══════════════════════════════════════════════════════════
CREATE TABLE escrow_messages (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id        UUID          NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
  sender_id        UUID          NOT NULL REFERENCES users(id),
  sender_role      TEXT          NOT NULL CHECK (sender_role IN ('buyer', 'seller', 'admin', 'system')),
  message          TEXT          NOT NULL,
  message_type     TEXT          NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  attachment_url   TEXT,
  is_read_buyer    BOOLEAN       NOT NULL DEFAULT FALSE,
  is_read_seller   BOOLEAN       NOT NULL DEFAULT FALSE,
  is_read_admin    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escrow_msg_escrow  ON escrow_messages(escrow_id, created_at);
CREATE INDEX idx_escrow_msg_sender  ON escrow_messages(sender_id);

COMMENT ON TABLE escrow_messages IS 'رسائل شات الوساطة الثلاثي';

-- ═══════════════════════════════════════════════════════════
-- 16. أكواد الهدايا
-- ═══════════════════════════════════════════════════════════
CREATE TABLE gift_codes (
  id               UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             TEXT              NOT NULL UNIQUE,
  batch_id         UUID,             -- لتجميع الأكواد المولودة معاً

  -- القيمة
  amount           NUMERIC(18,4)     NOT NULL CHECK (amount > 0),
  currency         currency_enum     NOT NULL,

  -- القيود
  max_uses         INT               NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count       INT               NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  min_balance_required NUMERIC(18,4) DEFAULT 0,
  allowed_user_id  UUID              REFERENCES users(id),  -- NULL = للجميع

  -- الحالة
  status           gift_code_status  NOT NULL DEFAULT 'active',
  expires_at       TIMESTAMPTZ,
  created_by       UUID              NOT NULL REFERENCES users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gift_codes_code     ON gift_codes(code);
CREATE INDEX idx_gift_codes_batch    ON gift_codes(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_gift_codes_status   ON gift_codes(status);
CREATE INDEX idx_gift_codes_expires  ON gift_codes(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE gift_codes IS 'أكواد الهدايا والشحن — يدعم الاستخدام المتعدد';

-- ═══════════════════════════════════════════════════════════
-- 17. سجل استخدام الأكواد
-- ═══════════════════════════════════════════════════════════
CREATE TABLE gift_code_redemptions (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_id          UUID          NOT NULL REFERENCES gift_codes(id),
  user_id          UUID          NOT NULL REFERENCES users(id),
  transaction_id   UUID          REFERENCES transactions(id),
  ip_address       INET,
  device_info      TEXT,
  redeemed_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(code_id, user_id)       -- مستخدم لا يستخدم نفس الكود مرتين
);

CREATE INDEX idx_redemptions_code   ON gift_code_redemptions(code_id);
CREATE INDEX idx_redemptions_user   ON gift_code_redemptions(user_id);

COMMENT ON TABLE gift_code_redemptions IS 'سجل استخدامات الأكواد — يمنع الاستخدام المزدوج';

-- ═══════════════════════════════════════════════════════════
-- 18. تذاكر الدعم الفني
-- ═══════════════════════════════════════════════════════════
CREATE TABLE support_tickets (
  id               UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_num       TEXT            NOT NULL UNIQUE DEFAULT generate_ticket_num(),
  user_id          UUID            NOT NULL REFERENCES users(id),
  assigned_to      UUID            REFERENCES users(id),

  subject          TEXT            NOT NULL,
  body             TEXT            NOT NULL,
  category         ticket_category NOT NULL DEFAULT 'general',
  priority         ticket_priority NOT NULL DEFAULT 'normal',
  status           ticket_status   NOT NULL DEFAULT 'open',

  -- ربط بطلب أو معاملة
  related_order_id UUID            REFERENCES orders(id),
  related_tx_id    UUID            REFERENCES transactions(id),

  -- قياسات الأداء
  first_response_at TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  satisfaction_score INT           CHECK (satisfaction_score BETWEEN 1 AND 5),

  metadata         JSONB           NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_user_id    ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_tickets_status     ON support_tickets(status);
CREATE INDEX idx_tickets_assigned   ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_tickets_priority   ON support_tickets(priority, status);
CREATE INDEX idx_tickets_open       ON support_tickets(status, created_at DESC)
  WHERE status IN ('open', 'in_progress');

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE support_tickets IS 'تذاكر الدعم الفني — لكل مشكلة معقدة';

-- ═══════════════════════════════════════════════════════════
-- 19. رسائل التذاكر
-- ═══════════════════════════════════════════════════════════
CREATE TABLE support_messages (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id        UUID          NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id        UUID          NOT NULL REFERENCES users(id),
  sender_type      TEXT          NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  message          TEXT          NOT NULL,
  message_type     TEXT          NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachment_url   TEXT,
  attachment_name  TEXT,
  is_internal      BOOLEAN       NOT NULL DEFAULT FALSE,  -- ملاحظة داخلية للأدمن فقط
  is_read          BOOLEAN       NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_support_msg_ticket ON support_messages(ticket_id, created_at);
CREATE INDEX idx_support_msg_unread ON support_messages(ticket_id, is_read) WHERE is_read = FALSE;

COMMENT ON TABLE support_messages IS 'رسائل المحادثة داخل تذاكر الدعم';

-- ═══════════════════════════════════════════════════════════
-- 20. الشات المباشر (Live Chat)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE live_chats (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID          NOT NULL REFERENCES users(id),
  admin_id         UUID          REFERENCES users(id),

  status           TEXT          NOT NULL DEFAULT 'waiting'
                   CHECK (status IN ('waiting', 'active', 'closed')),

  last_message     TEXT,
  last_message_at  TIMESTAMPTZ,

  -- عدادات الرسائل غير المقروءة
  unread_user      INT           NOT NULL DEFAULT 0,
  unread_admin     INT           NOT NULL DEFAULT 0,

  -- تقييم المحادثة
  user_rating      INT           CHECK (user_rating BETWEEN 1 AND 5),
  user_feedback    TEXT,

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chats_user_id    ON live_chats(user_id, created_at DESC);
CREATE INDEX idx_chats_admin_id   ON live_chats(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX idx_chats_status     ON live_chats(status);
CREATE INDEX idx_chats_waiting    ON live_chats(status, created_at) WHERE status = 'waiting';

CREATE TRIGGER trg_chats_updated_at
  BEFORE UPDATE ON live_chats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE live_chats IS 'جلسات الشات المباشر بين المستخدم والدعم';

-- ═══════════════════════════════════════════════════════════
-- 21. رسائل الشات المباشر
-- ═══════════════════════════════════════════════════════════
CREATE TABLE live_chat_messages (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id          UUID          NOT NULL REFERENCES live_chats(id) ON DELETE CASCADE,
  sender_id        UUID          NOT NULL REFERENCES users(id),
  sender_type      TEXT          NOT NULL CHECK (sender_type IN ('user', 'admin', 'bot')),
  message          TEXT          NOT NULL,
  message_type     TEXT          NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  attachment_url   TEXT,
  is_read          BOOLEAN       NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_msg_chat_id  ON live_chat_messages(chat_id, created_at);
CREATE INDEX idx_chat_msg_unread   ON live_chat_messages(chat_id, is_read) WHERE is_read = FALSE;

COMMENT ON TABLE live_chat_messages IS 'رسائل الشات المباشر';

-- ═══════════════════════════════════════════════════════════
-- 22. الإشعارات
-- ═══════════════════════════════════════════════════════════
CREATE TABLE notifications (
  id               UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID                  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            TEXT                  NOT NULL,
  body             TEXT                  NOT NULL,
  type             notification_type     NOT NULL DEFAULT 'system',

  -- ربط بالكيان المعني
  entity_type      TEXT,
  entity_id        UUID,

  -- حالة القراءة
  is_read          BOOLEAN               NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ,

  -- FCM
  fcm_sent         BOOLEAN               NOT NULL DEFAULT FALSE,
  fcm_sent_at      TIMESTAMPTZ,
  fcm_error        TEXT,

  -- بيانات إضافية للنقر (deep link)
  action_url       TEXT,
  metadata         JSONB                 NOT NULL DEFAULT '{}',

  created_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_id    ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notif_unread     ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notif_type       ON notifications(type);

COMMENT ON TABLE notifications IS 'إشعارات التطبيق للمستخدمين';

-- ═══════════════════════════════════════════════════════════
-- 23. إشعارات الأدمن
-- ═══════════════════════════════════════════════════════════
CREATE TABLE admin_notifications (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT          NOT NULL,
  body             TEXT          NOT NULL,
  category         TEXT          NOT NULL DEFAULT 'general'
                   CHECK (category IN ('deposit', 'withdraw', 'kyc', 'order', 'escrow', 'support', 'general', 'alert')),
  priority         TEXT          NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  entity_type      TEXT,
  entity_id        UUID,

  is_read          BOOLEAN       NOT NULL DEFAULT FALSE,
  read_by          UUID          REFERENCES users(id),
  read_at          TIMESTAMPTZ,

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_notif_unread   ON admin_notifications(is_read, created_at DESC);
CREATE INDEX idx_admin_notif_category ON admin_notifications(category);

COMMENT ON TABLE admin_notifications IS 'إشعارات لوحة التحكم الإدارية';