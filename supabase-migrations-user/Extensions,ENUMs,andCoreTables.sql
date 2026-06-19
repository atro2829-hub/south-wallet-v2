-- ============================================================
-- WALLET APP — SUPABASE POSTGRESQL
-- الملف 01: الامتدادات، الأنواع، والجداول الأساسية
-- ============================================================

-- ─── الامتدادات ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- للبحث النصي السريع

-- ─── أنواع ENUM ──────────────────────────────────────────

-- أدوار المستخدمين
CREATE TYPE user_role AS ENUM ('user', 'admin', 'support');

-- حالة KYC
CREATE TYPE kyc_status_enum AS ENUM ('none', 'pending', 'verified', 'rejected');

-- العملات المدعومة
CREATE TYPE currency_enum AS ENUM ('YER', 'SAR', 'USD');

-- أنواع المعاملات المالية
CREATE TYPE transaction_type AS ENUM (
  'transfer',
  'deposit',
  'withdraw',
  'order',
  'exchange',
  'escrow',
  'investment',
  'gift_code',
  'refund',
  'adjustment'
);

-- اتجاه المعاملة
CREATE TYPE transaction_direction AS ENUM ('credit', 'debit');

-- حالات المعاملة
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

-- أنواع فئات المنتجات
CREATE TYPE category_type_enum AS ENUM ('game', 'gift', 'recharge', 'usdt', 'service', 'escrow');

-- حالات الطلبات
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- نوع تنفيذ الطلب
CREATE TYPE execution_type AS ENUM ('auto', 'manual');

-- حالات طلبات الإيداع/السحب
CREATE TYPE finance_request_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'completed');

-- طرق الإيداع
CREATE TYPE deposit_method AS ENUM ('bank', 'crypto', 'gift_code');

-- طرق السحب
CREATE TYPE withdraw_method AS ENUM ('bank', 'cash', 'crypto');

-- حالات الاستثمار
CREATE TYPE investment_status AS ENUM ('active', 'completed', 'cancelled');

-- حالات معاملات الوساطة
CREATE TYPE escrow_status AS ENUM ('waiting', 'active', 'hold', 'released', 'refunded', 'disputed', 'cancelled');

-- حالات تذاكر الدعم
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');

-- أولوية التذاكر
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- فئات التذاكر
CREATE TYPE ticket_category AS ENUM ('payment', 'order', 'account', 'general', 'complaint', 'technical');

-- أنواع الإشعارات
CREATE TYPE notification_type AS ENUM (
  'transfer', 'order', 'deposit', 'withdraw',
  'kyc', 'system', 'promo', 'escrow', 'investment', 'support'
);

-- أنواع الفاعلين في سجل التدقيق
CREATE TYPE actor_type AS ENUM ('user', 'admin', 'system');

-- حالات الأكواد الترويجية
CREATE TYPE gift_code_status AS ENUM ('active', 'used', 'expired', 'disabled');

-- أنواع قيم الإعدادات
CREATE TYPE setting_value_type AS ENUM ('string', 'number', 'boolean', 'json');

-- ─── دالة مساعدة: تحديث updated_at تلقائياً ─────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── دالة مساعدة: توليد رقم مرجعي فريد ──────────────────
CREATE OR REPLACE FUNCTION generate_reference_num(prefix TEXT DEFAULT 'TXN')
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  ref TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    ref := prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
           UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM transactions WHERE reference_num = ref) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN ref;
END;
$$;

-- ─── دالة مساعدة: توليد display_id للمستخدم ─────────────
CREATE OR REPLACE FUNCTION generate_display_id()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  new_id TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_id := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM users WHERE display_id = new_id) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_id;
END;
$$;

-- ─── دالة مساعدة: توليد كود وساطة 6 أحرف ───────────────
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  new_code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM escrow_transactions WHERE join_code = new_code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN new_code;
END;
$$;

-- ─── دالة مساعدة: توليد رقم طلب ─────────────────────────
CREATE OR REPLACE FUNCTION generate_order_num()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
         UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$;

-- ─── دالة مساعدة: توليد رقم تذكرة دعم ──────────────────
CREATE OR REPLACE FUNCTION generate_ticket_num()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
         LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 1. جدول المستخدمين
-- ═══════════════════════════════════════════════════════════
CREATE TABLE users (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone             TEXT          NOT NULL,
  display_id        TEXT          NOT NULL DEFAULT '',
  display_name      TEXT          NOT NULL DEFAULT '',
  email             TEXT,
  password_hash     TEXT          NOT NULL,
  pin_hash          TEXT,

  -- الأرصدة (NUMERIC لمنع أخطاء التقريب)
  balance_yer       NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance_yer >= 0),
  balance_sar       NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (balance_sar >= 0),
  balance_usd       NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (balance_usd >= 0),

  -- الأدوار والحالة
  role              user_role     NOT NULL DEFAULT 'user',
  kyc_status        kyc_status_enum NOT NULL DEFAULT 'none',
  kyc_verified_at   TIMESTAMPTZ,
  kyc_rejected_at   TIMESTAMPTZ,
  kyc_reject_reason TEXT,

  -- الإشعارات
  fcm_token         TEXT,
  avatar_url        TEXT,

  -- نظام الإحالة
  referral_code     TEXT          UNIQUE,
  referred_by       UUID          REFERENCES users(id) ON DELETE SET NULL,

  -- الحماية والأمان
  is_blocked        BOOLEAN       NOT NULL DEFAULT FALSE,
  block_reason      TEXT,
  blocked_at        TIMESTAMPTZ,
  blocked_by        UUID          REFERENCES users(id) ON DELETE SET NULL,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  last_login_ip     INET,
  login_attempts    INT           NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ,

  -- بيانات إضافية
  metadata          JSONB         NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- الفهارس
CREATE UNIQUE INDEX idx_users_phone ON users(phone);
CREATE UNIQUE INDEX idx_users_display_id ON users(display_id) WHERE display_id != '';
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_is_blocked ON users(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
-- فهرس البحث النصي
CREATE INDEX idx_users_search ON users USING gin(
  (display_name || ' ' || phone || ' ' || COALESCE(display_id, '')) gin_trgm_ops
);

-- Trigger لتحديث updated_at
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger لتوليد display_id تلقائياً عند الإنشاء
CREATE OR REPLACE FUNCTION trg_set_user_display_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.display_id = '' OR NEW.display_id IS NULL THEN
    NEW.display_id = generate_display_id();
  END IF;
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code = UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_set_defaults
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION trg_set_user_display_id();

COMMENT ON TABLE users IS 'المستخدمون الرئيسيون للمحفظة';
COMMENT ON COLUMN users.balance_yer IS 'الرصيد بالريال اليمني';
COMMENT ON COLUMN users.balance_sar IS 'الرصيد بالريال السعودي';
COMMENT ON COLUMN users.balance_usd IS 'الرصيد بالدولار الأمريكي';
COMMENT ON COLUMN users.pin_hash IS 'رمز PIN المشفر لتأكيد التحويلات';
COMMENT ON COLUMN users.display_id IS 'معرف قصير للمشاركة مع الآخرين (6 أحرف)';

-- ═══════════════════════════════════════════════════════════
-- 2. جدول المعاملات المالية (المحور المحاسبي)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE transactions (
  id               UUID                   PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_num    TEXT                   NOT NULL UNIQUE,
  user_id          UUID                   NOT NULL REFERENCES users(id),
  from_user_id     UUID                   REFERENCES users(id),
  to_user_id       UUID                   REFERENCES users(id),

  -- تفاصيل المبلغ
  type             transaction_type        NOT NULL,
  direction        transaction_direction   NOT NULL,
  amount           NUMERIC(18,4)          NOT NULL CHECK (amount > 0),
  currency         currency_enum          NOT NULL,
  fee_amount       NUMERIC(18,4)          NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),

  -- الحالة
  status           transaction_status      NOT NULL DEFAULT 'pending',

  -- سجل الرصيد (للتدقيق الكامل)
  balance_before   NUMERIC(18,4)          NOT NULL DEFAULT 0,
  balance_after    NUMERIC(18,4)          NOT NULL DEFAULT 0,

  -- المصدر المرتبط
  source_id        UUID,
  source_type      TEXT,  -- 'order' | 'deposit_request' | 'withdraw_request' | 'escrow' | 'investment' | 'gift_code'

  -- وصف وملاحظات
  description      TEXT,
  admin_note       TEXT,

  -- بيانات الأمان
  ip_address       INET,
  device_info      TEXT,

  -- بيانات إضافية
  metadata         JSONB         NOT NULL DEFAULT '{}',
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- فهارس الأداء
CREATE INDEX idx_txn_user_id       ON transactions(user_id, created_at DESC);
CREATE INDEX idx_txn_from_user     ON transactions(from_user_id) WHERE from_user_id IS NOT NULL;
CREATE INDEX idx_txn_to_user       ON transactions(to_user_id) WHERE to_user_id IS NOT NULL;
CREATE INDEX idx_txn_type          ON transactions(type);
CREATE INDEX idx_txn_status        ON transactions(status);
CREATE INDEX idx_txn_created_at    ON transactions(created_at DESC);
CREATE INDEX idx_txn_source        ON transactions(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_txn_reference     ON transactions(reference_num);

COMMENT ON TABLE transactions IS 'سجل محاسبي كامل لكل الحركات المالية — لا يُحذف أبداً';
COMMENT ON COLUMN transactions.balance_before IS 'رصيد المستخدم قبل العملية — للتدقيق';
COMMENT ON COLUMN transactions.balance_after  IS 'رصيد المستخدم بعد العملية — للتدقيق';
COMMENT ON COLUMN transactions.source_id      IS 'معرف المصدر (طلب، إيداع، وساطة..)';
COMMENT ON COLUMN transactions.source_type    IS 'نوع المصدر (order | deposit_request | escrow..)';

-- ═══════════════════════════════════════════════════════════
-- 3. جدول الأقسام والفئات (شجرة ذاتية المرجع)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE categories (
  id               TEXT          PRIMARY KEY,
  parent_id        TEXT          REFERENCES categories(id) ON DELETE SET NULL,
  name_ar          TEXT          NOT NULL,
  name_en          TEXT          NOT NULL DEFAULT '',
  slug             TEXT          NOT NULL UNIQUE,

  -- العرض
  icon_url         TEXT,
  icon_emoji       TEXT,
  color_hex        CHAR(7),
  banner_url       TEXT,

  -- التصنيف
  category_type    category_type_enum NOT NULL DEFAULT 'service',
  sort_order       INT           NOT NULL DEFAULT 0,
  depth            INT           NOT NULL DEFAULT 0,  -- 0=رئيسي، 1=فرعي
  path             TEXT          NOT NULL DEFAULT '',  -- 'games/games-pubg'

  -- الحالة
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  is_visible       BOOLEAN       NOT NULL DEFAULT TRUE,

  -- ربط مزود API
  api_provider_id  TEXT,
  api_category_id  TEXT,
  api_category_name TEXT,

  -- بيانات إضافية
  description      TEXT,
  metadata         JSONB         NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_parent_id    ON categories(parent_id);
CREATE INDEX idx_cat_sort_order   ON categories(sort_order);
CREATE INDEX idx_cat_is_active    ON categories(is_active);
CREATE INDEX idx_cat_type         ON categories(category_type);
CREATE INDEX idx_cat_provider     ON categories(api_provider_id) WHERE api_provider_id IS NOT NULL;

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- trigger لحساب depth وpath تلقائياً
CREATE OR REPLACE FUNCTION trg_set_category_path()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  parent_depth INT;
  parent_path  TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth = 0;
    NEW.path = NEW.id;
  ELSE
    SELECT depth, path INTO parent_depth, parent_path
    FROM categories WHERE id = NEW.parent_id;
    NEW.depth = COALESCE(parent_depth, 0) + 1;
    NEW.path = COALESCE(parent_path, NEW.parent_id) || '/' || NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_categories_path
  BEFORE INSERT OR UPDATE OF parent_id ON categories
  FOR EACH ROW EXECUTE FUNCTION trg_set_category_path();

COMMENT ON TABLE categories IS 'شجرة الأقسام والفئات — تدعم مستويين (رئيسي وفرعي)';

-- ═══════════════════════════════════════════════════════════
-- 4. جدول مزودي API
-- ═══════════════════════════════════════════════════════════
CREATE TABLE api_providers (
  id                TEXT          PRIMARY KEY,  -- 'g2bulk', 'qt-games'
  name              TEXT          NOT NULL,
  api_url           TEXT          NOT NULL,
  api_key           TEXT          NOT NULL,     -- مشفر، لا يُعرض في RLS
  api_key_secondary TEXT,
  webhook_secret    TEXT,

  -- هوامش الربح
  auto_margin_pct   NUMERIC(5,2)  NOT NULL DEFAULT 10.00,
  category_overrides JSONB        NOT NULL DEFAULT '{}',
  -- مثال: {"games-pubg": 8.5, "gift-itunes": 12.0}

  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  timeout_ms        INT           NOT NULL DEFAULT 30000,
  retry_attempts    INT           NOT NULL DEFAULT 3,
  metadata          JSONB         NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_api_providers_updated_at
  BEFORE UPDATE ON api_providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE api_providers IS 'مزودو الخدمات الخارجيون (G2Bulk وغيره)';
COMMENT ON COLUMN api_providers.api_key IS 'مُشفَّر — لا يظهر لأي مستخدم عبر RLS';
COMMENT ON COLUMN api_providers.category_overrides IS 'تجاوز هامش الربح الافتراضي لفئات محددة';