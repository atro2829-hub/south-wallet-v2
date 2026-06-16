-- =====================================================
-- South Wallet - Supabase Database Schema
-- محفظة الجنوب - هيكل قاعدة البيانات الكامل
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- 1. USERS - المستخدمين
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT,
  
  -- الاسم الرباعي
  first_name TEXT DEFAULT '',
  second_name TEXT DEFAULT '',
  third_name TEXT DEFAULT '',
  family_name TEXT DEFAULT '',
  display_name TEXT GENERATED ALWAYS AS (
    CONCAT_WS(' ', NULLIF(first_name, ''), NULLIF(second_name, ''), NULLIF(third_name, ''), NULLIF(family_name, ''))
  ) STORED,
  
  -- الرصيد
  balance_yer NUMERIC(15,2) DEFAULT 0 CHECK (balance_yer >= 0),
  balance_sar NUMERIC(15,2) DEFAULT 0 CHECK (balance_sar >= 0),
  balance_usd NUMERIC(15,2) DEFAULT 0 CHECK (balance_usd >= 0),
  
  -- بطاقة المحفظة
  card_type TEXT DEFAULT '',
  card_number TEXT UNIQUE DEFAULT '',
  card_issued_at TIMESTAMPTZ,
  
  -- الهوية
  national_id TEXT UNIQUE DEFAULT '',
  governorate TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  
  -- الحالة
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'owner', 'agent')),
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
  is_blocked BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- التحقق من الهوية
  id_front_url TEXT DEFAULT '',
  id_back_url TEXT DEFAULT '',
  id_selfie_url TEXT DEFAULT '',
  id_verified_at TIMESTAMPTZ,
  id_verified_by UUID,
  id_rejection_reason TEXT DEFAULT '',
  
  -- FCM
  fcm_token TEXT DEFAULT '',
  
  -- إعدادات
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'ar' CHECK (language IN ('ar', 'en')),
  pin_code TEXT DEFAULT '',
  
  -- الأمان
  login_attempts INTEGER DEFAULT 0,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT DEFAULT '',
  
  -- التواريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_card_number ON public.users(card_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON public.users(kyc_status);

-- =====================================================
-- 2. TRANSACTIONS - المعاملات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.users(id),
  to_user_id UUID REFERENCES public.users(id),
  
  -- المبلغ
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  fee NUMERIC(15,2) DEFAULT 0,
  fee_currency TEXT DEFAULT 'YER',
  
  -- النوع والحالة
  type TEXT NOT NULL CHECK (type IN (
    'transfer', 'deposit', 'withdraw', 'order', 'recharge',
    'exchange', 'gift', 'promo', 'commission', 'refund', 'investment'
  )),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  
  -- التفاصيل
  description TEXT DEFAULT '',
  reference_number TEXT DEFAULT '',
  receipt_data JSONB DEFAULT '{}',
  
  -- معلومات السند
  sender_name TEXT DEFAULT '',
  sender_phone TEXT DEFAULT '',
  receiver_name TEXT DEFAULT '',
  receiver_phone TEXT DEFAULT '',
  receiver_card_number TEXT DEFAULT '',
  
  -- API
  api_provider_id TEXT DEFAULT '',
  api_order_id TEXT DEFAULT '',
  
  -- التواريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON public.transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON public.transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON public.transactions(currency);

-- =====================================================
-- 3. ORDERS - الطلبات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- المنتج
  provider_id TEXT NOT NULL,
  provider_name TEXT DEFAULT '',
  package_id TEXT NOT NULL,
  package_name TEXT DEFAULT '',
  category_id TEXT DEFAULT '',
  category_name TEXT DEFAULT '',
  
  -- المدخلات
  customer_input TEXT DEFAULT '',
  customer_input_label TEXT DEFAULT '',
  
  -- الأسعار
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  cost_price NUMERIC(15,2) DEFAULT 0,
  cost_currency TEXT DEFAULT 'USD',
  commission_amount NUMERIC(15,2) DEFAULT 0,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  
  -- التنفيذ
  execution_type TEXT DEFAULT 'manual' CHECK (execution_type IN ('manual', 'auto', 'api')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  
  -- API
  api_provider_id TEXT DEFAULT '',
  api_product_id TEXT DEFAULT '',
  api_order_id TEXT DEFAULT '',
  api_response JSONB DEFAULT '{}',
  
  -- نتيجة التنفيذ
  result_code TEXT DEFAULT '',
  result_message TEXT DEFAULT '',
  result_pin_code TEXT DEFAULT '',
  result_serial TEXT DEFAULT '',
  
  -- المعاملة المرتبطة
  transaction_id UUID REFERENCES public.transactions(id),
  
  -- من نفذ
  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ,
  
  -- التواريخ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_provider_id ON public.orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_api_provider ON public.orders(api_provider_id);

-- =====================================================
-- 4. DEPOSIT_REQUESTS - طلبات الإيداع
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'crypto', 'cash', 'card', 'agent')),
  
  -- تفاصيل الطريقة
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  sender_name TEXT DEFAULT '',
  transfer_receipt_url TEXT DEFAULT '',
  
  -- كريبتو
  crypto_network TEXT DEFAULT '',
  crypto_wallet_address TEXT DEFAULT '',
  crypto_tx_hash TEXT DEFAULT '',
  
  -- الحالة
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason TEXT DEFAULT '',
  admin_notes TEXT DEFAULT '',
  
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  
  transaction_id UUID REFERENCES public.transactions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_user_id ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_status ON public.deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_deposit_created_at ON public.deposit_requests(created_at DESC);

-- =====================================================
-- 5. WITHDRAW_REQUESTS - طلبات السحب
-- =====================================================
CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  method TEXT NOT NULL CHECK (method IN ('bank_transfer', 'crypto', 'cash', 'agent')),
  
  bank_name TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_iban TEXT DEFAULT '',
  
  crypto_network TEXT DEFAULT '',
  crypto_wallet_address TEXT DEFAULT '',
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  rejection_reason TEXT DEFAULT '',
  admin_notes TEXT DEFAULT '',
  
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ,
  
  transaction_id UUID REFERENCES public.transactions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdraw_user_id ON public.withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON public.withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_created_at ON public.withdraw_requests(created_at DESC);

-- =====================================================
-- 6. SECTIONS - الأقسام الرئيسية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#5C1A1B',
  image_url TEXT DEFAULT '',
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  
  type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'api', 'wallet')),
  api_provider_id TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. SUB_SECTIONS - الأقسام الفرعية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sub_sections (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  
  type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'api', 'wallet')),
  api_category_id TEXT DEFAULT '',
  api_provider_id TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subsections_section_id ON public.sub_sections(section_id);

-- =====================================================
-- 8. SERVICE_PROVIDERS - مزودي الخدمات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.service_providers (
  id TEXT PRIMARY KEY,
  section_id TEXT DEFAULT '' REFERENCES public.sections(id),
  sub_section_id TEXT DEFAULT '' REFERENCES public.sub_sections(id),
  
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#5C1A1B',
  image_url TEXT DEFAULT '',
  
  input_label TEXT DEFAULT 'رقم الهاتف',
  input_type TEXT DEFAULT 'text' CHECK (input_type IN ('text', 'tel', 'number', 'email')),
  input_prefix TEXT DEFAULT '',
  input_validation TEXT DEFAULT '',
  input_placeholder TEXT DEFAULT '',
  
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'api', 'wallet')),
  api_provider_id TEXT DEFAULT '',
  api_product_id TEXT DEFAULT '',
  
  execution_type TEXT DEFAULT 'manual' CHECK (execution_type IN ('manual', 'auto', 'api')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_section ON public.service_providers(section_id);
CREATE INDEX IF NOT EXISTS idx_providers_subsection ON public.service_providers(sub_section_id);
CREATE INDEX IF NOT EXISTS idx_providers_active ON public.service_providers(is_active);

-- =====================================================
-- 9. PRODUCT_PACKAGES - باقات المنتجات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_packages (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  
  -- الأسعار - الأساس بالدولار
  price_usd NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_yer NUMERIC(15,2) DEFAULT 0,
  price_sar NUMERIC(15,2) DEFAULT 0,
  
  -- التكلفة
  cost_price NUMERIC(15,2) DEFAULT 0,
  cost_currency TEXT DEFAULT 'USD',
  
  -- العمولة
  commission_amount NUMERIC(15,2) DEFAULT 0,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  commission_currency TEXT DEFAULT 'USD',
  
  -- التنفيذ
  execution_type TEXT DEFAULT 'manual' CHECK (execution_type IN ('manual', 'auto', 'api')),
  api_product_id TEXT DEFAULT '',
  
  -- معلومات إضافية
  validity_days INTEGER DEFAULT 0,
  data_amount TEXT DEFAULT '',
  pin_code_required BOOLEAN DEFAULT FALSE,
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_provider ON public.product_packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_packages_active ON public.product_packages(is_active);

-- =====================================================
-- 10. API_PROVIDERS - مزودي API
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  website TEXT DEFAULT '',
  
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  auth_header TEXT DEFAULT 'X-API-Key',
  auth_type TEXT DEFAULT 'header' CHECK (auth_type IN ('header', 'bearer', 'basic', 'query')),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  balance NUMERIC(15,2) DEFAULT 0,
  balance_currency TEXT DEFAULT 'USD',
  last_balance_check TIMESTAMPTZ,
  
  default_commission NUMERIC(5,2) DEFAULT 5,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  
  sync_categories BOOLEAN DEFAULT TRUE,
  sync_products BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  
  config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11. API_CATEGORIES - فئات API المزامنة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_categories (
  id TEXT PRIMARY KEY,
  api_provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  api_category_id TEXT NOT NULL,
  
  title TEXT NOT NULL,
  title_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  
  product_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_synced BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  
  section_id TEXT DEFAULT '' REFERENCES public.sections(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apicat_provider ON public.api_categories(api_provider_id);
CREATE INDEX IF NOT EXISTS idx_apicat_section ON public.api_categories(section_id);

-- =====================================================
-- 12. API_PRODUCTS - منتجات API المزامنة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_products (
  id TEXT PRIMARY KEY,
  api_provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  api_category_id TEXT NOT NULL,
  api_product_id TEXT NOT NULL,
  
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  
  price NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  is_active BOOLEAN DEFAULT TRUE,
  is_synced BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  
  product_data JSONB DEFAULT '{}',
  
  provider_id TEXT DEFAULT '' REFERENCES public.service_providers(id),
  package_id TEXT DEFAULT '' REFERENCES public.product_packages(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apiprod_provider ON public.api_products(api_provider_id);
CREATE INDEX IF NOT EXISTS idx_apiprod_category ON public.api_products(api_category_id);
CREATE INDEX IF NOT EXISTS idx_apiprod_linked ON public.api_products(provider_id);

-- =====================================================
-- 13. API_BALANCE_LOG - سجل أرصدة API
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_balance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  
  balance NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  previous_balance NUMERIC(15,2) DEFAULT 0,
  change_amount NUMERIC(15,2) DEFAULT 0,
  
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apibal_provider ON public.api_balance_log(api_provider_id);
CREATE INDEX IF NOT EXISTS idx_apibal_checked ON public.api_balance_log(checked_at DESC);

-- =====================================================
-- 14. EXCHANGE_RATES - أسعار الصرف
-- =====================================================
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  usd_to_yer NUMERIC(10,4) NOT NULL DEFAULT 530,
  usd_to_sar NUMERIC(10,4) NOT NULL DEFAULT 3.75,
  sar_to_yer NUMERIC(10,4) NOT NULL DEFAULT 141.33,
  
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto', 'api')),
  is_active BOOLEAN DEFAULT TRUE,
  
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 15. NOTIFICATIONS - الإشعارات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'security', 'transaction', 'order', 'deposit', 'withdraw', 'promo', 'kyc')),
  
  is_read BOOLEAN DEFAULT FALSE,
  
  -- رابط التنقل عند الضغط
  navigation_target TEXT DEFAULT '',
  navigation_params JSONB DEFAULT '{}',
  
  data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_type ON public.notifications(type);

-- =====================================================
-- 16. ADMIN_NOTIFICATIONS - إشعارات الإدارة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'deposit', 'withdraw', 'order', 'kyc', 'support', 'security', 'system')),
  
  target_role TEXT DEFAULT 'admin' CHECK (target_role IN ('admin', 'owner', 'all')),
  is_read BOOLEAN DEFAULT FALSE,
  
  navigation_target TEXT DEFAULT '',
  navigation_params JSONB DEFAULT '{}',
  
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adminnotif_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_adminnotif_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_adminnotif_sent ON public.admin_notifications(sent_at DESC);

-- =====================================================
-- 17. BANNERS - البانرات الإعلانية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  
  -- مكان العرض
  position TEXT DEFAULT 'home' CHECK (position IN ('login', 'home', 'services', 'wallet', 'all')),
  
  link_type TEXT DEFAULT 'none' CHECK (link_type IN ('none', 'url', 'screen', 'provider', 'promo')),
  link_target TEXT DEFAULT '',
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_position ON public.banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(is_active);

-- =====================================================
-- 18. GIFT_CODES - أكواد الهدايا
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gift_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  code TEXT UNIQUE NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  created_by UUID NOT NULL REFERENCES public.users(id),
  redeemed_by UUID REFERENCES public.users(id),
  redeemed_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  
  transaction_id UUID REFERENCES public.transactions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giftcode_code ON public.gift_codes(code);
CREATE INDEX IF NOT EXISTS idx_giftcode_status ON public.gift_codes(status);

-- =====================================================
-- 19. PROMO_CODES - أكواد الخصم
-- =====================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'YER' CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  min_purchase NUMERIC(15,2) DEFAULT 0,
  max_discount NUMERIC(15,2) DEFAULT 0,
  
  max_uses INTEGER DEFAULT 100,
  used_count INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  applicable_providers TEXT[] DEFAULT '{}',
  applicable_categories TEXT[] DEFAULT '{}',
  
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 20. WALLET_ADDRESSES - عناوين المحافظ (كريبتو)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wallet_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  network TEXT NOT NULL CHECK (network IN ('TRC20', 'ERC20', 'BEP20', 'BTC', 'ETH', 'SOL', 'MATIC', 'OTHER')),
  network_name TEXT DEFAULT '',
  address TEXT NOT NULL,
  label TEXT DEFAULT '',
  
  qr_code_url TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  
  currency TEXT DEFAULT 'USDT',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 21. SUPPORT_TICKETS - تذاكر الدعم
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'financial', 'complaint', 'suggestion')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
  
  assigned_to UUID REFERENCES public.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON public.support_tickets(assigned_to);

-- =====================================================
-- 22. SUPPORT_MESSAGES - رسائل الدعم
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  
  sender_id UUID REFERENCES public.users(id),
  sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'system')),
  message TEXT NOT NULL,
  
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_ticket ON public.support_messages(ticket_id);

-- =====================================================
-- 23. SUPPORT_LIVECHAT - المحادثات المباشرة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.support_livechat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  admin_id UUID REFERENCES public.users(id),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
  
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ,
  unread_user INTEGER DEFAULT 0,
  unread_admin INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livechat_user ON public.support_livechat(user_id);
CREATE INDEX IF NOT EXISTS idx_livechat_admin ON public.support_livechat(admin_id);
CREATE INDEX IF NOT EXISTS idx_livechat_status ON public.support_livechat(status);

-- =====================================================
-- 24. LIVECHAT_MESSAGES - رسائل المحادثة المباشرة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.livechat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES public.support_livechat(id) ON DELETE CASCADE,
  
  sender_id UUID NOT NULL REFERENCES public.users(id),
  sender_type TEXT DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'system')),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livemsg_chat ON public.livechat_messages(chat_id);

-- =====================================================
-- 25. ACTIVITY_LOG - سجل النشاط
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  
  action TEXT NOT NULL,
  resource_type TEXT DEFAULT '',
  resource_id TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON public.activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_log(created_at DESC);

-- =====================================================
-- 26. APP_CONFIG - إعدادات التطبيق
-- =====================================================
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT DEFAULT '',
  
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 27. EMPLOYEES - الموظفين
-- =====================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'support', 'finance', 'viewer')),
  permissions JSONB DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT TRUE,
  added_by UUID REFERENCES public.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 28. COMMISSION_LOG - سجل العمولات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commission_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id),
  transaction_id UUID REFERENCES public.transactions(id),
  
  provider_id TEXT DEFAULT '',
  package_id TEXT DEFAULT '',
  
  commission_amount NUMERIC(15,2) NOT NULL,
  commission_currency TEXT DEFAULT 'USD',
  commission_type TEXT DEFAULT 'percentage',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_order ON public.commission_log(order_id);
CREATE INDEX IF NOT EXISTS idx_commission_created ON public.commission_log(created_at DESC);

-- =====================================================
-- 29. BANKS - الحسابات البنكية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  bank_name TEXT NOT NULL,
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  swift_code TEXT DEFAULT '',
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 30. OFFICES - المكاتب والوكلاء
-- =====================================================
CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  governorate TEXT DEFAULT '',
  
  commission_rate NUMERIC(5,2) DEFAULT 0,
  balance_yer NUMERIC(15,2) DEFAULT 0,
  balance_sar NUMERIC(15,2) DEFAULT 0,
  balance_usd NUMERIC(15,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 31. KYC_DOCUMENTS - وثائق التحقق
-- =====================================================
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL CHECK (document_type IN ('national_id_front', 'national_id_back', 'selfie', 'passport', 'utility_bill')),
  document_url TEXT NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT DEFAULT '',
  
  ai_verification_result JSONB DEFAULT '{}',
  ai_confidence_score NUMERIC(5,2) DEFAULT 0,
  ai_verified_at TIMESTAMPTZ,
  
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_documents(status);

-- =====================================================
-- 32. SOCIAL_LINKS - روابط التواصل
-- =====================================================
CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram', 'facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'website', 'other')),
  url TEXT NOT NULL,
  label TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 33. LEGAL_CONTENT - المحتوى القانوني
-- =====================================================
CREATE TABLE IF NOT EXISTS public.legal_content (
  id TEXT PRIMARY KEY,
  
  title TEXT NOT NULL,
  title_en TEXT DEFAULT '',
  content TEXT DEFAULT '',
  content_en TEXT DEFAULT '',
  
  is_active BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 34. BRANDING - العلامة التجارية
-- =====================================================
CREATE TABLE IF NOT EXISTS public.branding (
  id TEXT PRIMARY KEY DEFAULT 'default',
  
  app_name TEXT DEFAULT 'محفظة الجنوب',
  app_name_en TEXT DEFAULT 'South Wallet',
  logo_url TEXT DEFAULT '',
  logo_dark_url TEXT DEFAULT '',
  favicon_url TEXT DEFAULT '',
  primary_color TEXT DEFAULT '#5C1A1B',
  secondary_color TEXT DEFAULT '#8B2252',
  accent_color TEXT DEFAULT '#D4547A',
  
  splash_background TEXT DEFAULT '#3D0F10',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 35. CURRENCY_CARDS - بطاقات العملات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.currency_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  card_name TEXT DEFAULT '',
  
  gradient_start TEXT DEFAULT '',
  gradient_end TEXT DEFAULT '',
  text_color TEXT DEFAULT '#FFFFFF',
  icon TEXT DEFAULT '',
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 36. CARD_COLORS - ألوان البطاقات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.card_colors (
  currency TEXT PRIMARY KEY CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  primary_color TEXT NOT NULL DEFAULT '#5C1A1B',
  secondary_color TEXT NOT NULL DEFAULT '#8B2252',
  text_color TEXT NOT NULL DEFAULT '#FFFFFF',
  gradient_direction TEXT DEFAULT 'to bottom right',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدخال ألوان افتراضية
INSERT INTO public.card_colors (currency, primary_color, secondary_color, text_color) VALUES
  ('YER', '#5C1A1B', '#3D0F10', '#FFFFFF'),
  ('SAR', '#1A5C2B', '#0F3D1A', '#FFFFFF'),
  ('USD', '#1A3A5C', '#0F2540', '#FFFFFF')
ON CONFLICT (currency) DO NOTHING;

-- =====================================================
-- 37. LIMITS - الحدود والسقوف
-- =====================================================
CREATE TABLE IF NOT EXISTS public.limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  limit_type TEXT NOT NULL CHECK (limit_type IN ('daily_deposit', 'daily_withdraw', 'daily_transfer', 'monthly_deposit', 'monthly_withdraw', 'single_transaction', 'min_deposit', 'min_withdraw')),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  min_amount NUMERIC(15,2) DEFAULT 0,
  max_amount NUMERIC(15,2) DEFAULT 0,
  
  user_tier TEXT DEFAULT 'basic' CHECK (user_tier IN ('basic', 'verified', 'premium')),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 38. USER_GIFT_CODES - قسائم الهدايا بين المستخدمين
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_gift_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  sender_id UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID REFERENCES public.users(id),
  receiver_phone TEXT DEFAULT '',
  
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  code TEXT UNIQUE NOT NULL,
  message TEXT DEFAULT '',
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ,
  
  redeemed_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES public.transactions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 39. BULK_CODES - أكواد الجملة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bulk_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  provider_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  product_name TEXT DEFAULT '',
  
  codes JSONB NOT NULL DEFAULT '[]',
  total_count INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  remaining_count INTEGER DEFAULT 0,
  
  cost_price NUMERIC(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  added_by UUID REFERENCES public.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 40. INVESTMENTS - الاستثمارات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  plan_name TEXT DEFAULT '',
  daily_return NUMERIC(5,2) DEFAULT 0,
  total_return NUMERIC(15,2) DEFAULT 0,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matured', 'cancelled')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  
  transaction_id UUID REFERENCES public.transactions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_user ON public.investments(user_id);

-- =====================================================
-- 41. MAINTENANCE - وضع الصيانة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.maintenance (
  id TEXT PRIMARY KEY DEFAULT 'main',
  is_active BOOLEAN DEFAULT FALSE,
  message TEXT DEFAULT 'التطبيق حالياً في وضع الصيانة، سنكون بالعودة قريباً...',
  estimated_time TEXT DEFAULT '30 دقيقة',
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES public.users(id)
);

-- =====================================================
-- 42. KILL_SWITCH - مفتاح التوقف الطارئ
-- =====================================================
CREATE TABLE IF NOT EXISTS public.kill_switch (
  id TEXT PRIMARY KEY DEFAULT 'main',
  is_active BOOLEAN DEFAULT FALSE,
  message TEXT DEFAULT 'التطبيق مغلق مؤقتاً',
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES public.users(id),
  deactivate_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 60
);

-- =====================================================
-- 43. BOTTOM_NAV - شريط التنقل السفلي
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bottom_nav (
  tab_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT DEFAULT '',
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0
);

INSERT INTO public.bottom_nav (tab_id, label, icon, is_visible, sort_order) VALUES
  ('home', 'الرئيسية', 'home', TRUE, 1),
  ('services', 'الخدمات', 'layout-grid', TRUE, 2),
  ('wallet', 'المحفظة', 'wallet', TRUE, 3),
  ('account', 'حسابي', 'user', TRUE, 4)
ON CONFLICT (tab_id) DO NOTHING;

-- =====================================================
-- 44. FEATURE_FLAGS - مميزات التطبيق
-- =====================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_key TEXT PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT TRUE,
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.feature_flags (flag_key, is_enabled, description) VALUES
  ('servicesEnabled', TRUE, 'تفعيل الخدمات'),
  ('depositEnabled', TRUE, 'تفعيل الإيداع'),
  ('withdrawEnabled', TRUE, 'تفعيل السحب'),
  ('transferEnabled', TRUE, 'تفعيل التحويل'),
  ('exchangeEnabled', TRUE, 'تفعيل الصرف'),
  ('investmentEnabled', FALSE, 'تفعيل الاستثمار'),
  ('giftCodesEnabled', TRUE, 'تفعيل أكواد الهدايا'),
  ('promoEnabled', TRUE, 'تفعيل العروض'),
  ('qrPaymentEnabled', FALSE, 'تفعيل الدفع QR')
ON CONFLICT (flag_key) DO NOTHING;

-- =====================================================
-- 45. WALLET_SERVICES - خدمات المحفظة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wallet_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#5C1A1B',
  
  type TEXT DEFAULT 'wallet' CHECK (type IN ('wallet', 'transfer', 'exchange', 'payment', 'savings')),
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  config JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 46. VISIBILITY - إعدادات الإخفاء
-- =====================================================
CREATE TABLE IF NOT EXISTS public.visibility (
  target_type TEXT NOT NULL CHECK (target_type IN ('section', 'provider', 'feature', 'service')),
  target_id TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT TRUE,
  
  PRIMARY KEY (target_type, target_id)
);

-- =====================================================
-- 47. INSTANT_RECHARGE - الشحن الفوري
-- =====================================================
CREATE TABLE IF NOT EXISTS public.instant_recharge (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  
  price_usd NUMERIC(15,2) DEFAULT 0,
  price_yer NUMERIC(15,2) DEFAULT 0,
  price_sar NUMERIC(15,2) DEFAULT 0,
  
  data_amount TEXT DEFAULT '',
  validity TEXT DEFAULT '',
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 48. BACKUP_LOG - سجل النسخ الاحتياطي
-- =====================================================
CREATE TABLE IF NOT EXISTS public.backup_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  backup_type TEXT DEFAULT 'manual' CHECK (backup_type IN ('manual', 'auto', 'scheduled')),
  size_mb NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('started', 'completed', 'failed')),
  
  storage_path TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- إدخال بيانات أساسية
-- =====================================================

-- سعر الصرف الافتراضي
INSERT INTO public.exchange_rates (usd_to_yer, usd_to_sar, sar_to_yer, source) 
VALUES (530, 3.75, 141.33, 'manual')
ON CONFLICT DO NOTHING;

-- بيانات العلامة التجارية
INSERT INTO public.branding (id, app_name, app_name_en, primary_color, secondary_color, accent_color, splash_background)
VALUES ('default', 'محفظة الجنوب', 'South Wallet', '#5C1A1B', '#8B2252', '#D4547A', '#3D0F10')
ON CONFLICT (id) DO NOTHING;

-- المحتوى القانوني
INSERT INTO public.legal_content (id, title, title_en) VALUES
  ('terms', 'شروط الاستخدام', 'Terms of Service'),
  ('privacy', 'سياسة الخصوصية', 'Privacy Policy'),
  ('refund', 'سياسة الاسترداد', 'Refund Policy')
ON CONFLICT (id) DO NOTHING;

-- إعدادات التطبيق الافتراضية
INSERT INTO public.app_config (key, value, description) VALUES
  ('forceUpdate', '{"active": false, "minVersion": "1.0.0"}', 'تحديث إجباري'),
  ('githubToken', '""', 'توكن GitHub'),
  ('projectConfig', '{"appName": "محفظة الجنوب", "packageName": "com.qtbm.south", "latestVersion": "1.0.0", "minVersion": "1.0.0"}', 'إعدادات المشروع')
ON CONFLICT (key) DO NOTHING;

-- مزود API الافتراضي (G2Bulk)
INSERT INTO public.api_providers (id, name, description, website, api_url, api_key, auth_header, is_active, balance, balance_currency, default_commission, commission_type)
VALUES (
  'g2bulk', 'G2Bulk', 'G2Bulk Digital Products & Gift Cards API', 'https://g2bulk.com',
  'https://api.g2bulk.com/v1/', 'API_KEY_PLACEHOLDER',
  'X-API-Key', TRUE, 0, 'USD', 5, 'percentage'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FUNCTIONS - الدوال
-- =====================================================

-- دالة تحديث التاريخ تلقائياً
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي على كل الجداول
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name = 'updated_at' 
    GROUP BY table_name
  LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    ', t);
  END LOOP;
END;
$$;

-- دالة تحديث الأرصدة بشكل آمن
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_currency TEXT,
  p_amount NUMERIC,
  p_operation TEXT DEFAULT 'add'
)
RETURNS NUMERIC AS $$
DECLARE
  new_balance NUMERIC;
  col_name TEXT;
BEGIN
  col_name := CASE p_currency
    WHEN 'YER' THEN 'balance_yer'
    WHEN 'SAR' THEN 'balance_sar'
    WHEN 'USD' THEN 'balance_usd'
    ELSE NULL
  END;
  
  IF col_name IS NULL THEN
    RAISE EXCEPTION 'Invalid currency: %', p_currency;
  END IF;
  
  EXECUTE format('
    UPDATE public.users SET %I = %s WHERE id = $1 RETURNING %I
  ', col_name,
    CASE p_operation WHEN 'add' THEN format('%I + $2', col_name) ELSE format('%I - $2', col_name) END,
    col_name
  ) INTO new_balance USING p_user_id, ABS(p_amount);
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة إنشاء معاملة
CREATE OR REPLACE FUNCTION public.create_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_from_user_id UUID DEFAULT NULL,
  p_to_user_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_reference TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
  tx_id UUID;
BEGIN
  INSERT INTO public.transactions (
    user_id, type, amount, currency, 
    from_user_id, to_user_id,
    description, reference_number, status
  ) VALUES (
    p_user_id, p_type, p_amount, p_currency,
    p_from_user_id, p_to_user_id,
    p_description, p_reference, 'completed'
  ) RETURNING id INTO tx_id;
  
  RETURN tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة الحصول على إحصائيات لوحة التحكم
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.users WHERE role = 'user'),
    'total_balance_yer', (SELECT COALESCE(SUM(balance_yer), 0) FROM public.users),
    'total_balance_sar', (SELECT COALESCE(SUM(balance_sar), 0) FROM public.users),
    'total_balance_usd', (SELECT COALESCE(SUM(balance_usd), 0) FROM public.users),
    'pending_deposits', (SELECT COUNT(*) FROM public.deposit_requests WHERE status = 'pending'),
    'pending_withdraws', (SELECT COUNT(*) FROM public.withdraw_requests WHERE status = 'pending'),
    'pending_orders', (SELECT COUNT(*) FROM public.orders WHERE status = 'pending'),
    'pending_kyc', (SELECT COUNT(*) FROM public.users WHERE kyc_status = 'submitted'),
    'today_transactions', (SELECT COUNT(*) FROM public.transactions WHERE created_at >= CURRENT_DATE),
    'today_revenue_usd', (SELECT COALESCE(SUM(commission_amount), 0) FROM public.commission_log WHERE created_at >= CURRENT_DATE)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة تحويل العملات
CREATE OR REPLACE FUNCTION public.convert_currency(
  p_amount NUMERIC,
  p_from_currency TEXT,
  p_to_currency TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  rate_usd_yer NUMERIC;
  rate_usd_sar NUMERIC;
  amount_usd NUMERIC;
  result NUMERIC;
BEGIN
  SELECT usd_to_yer, usd_to_sar INTO rate_usd_yer, rate_usd_sar
  FROM public.exchange_rates WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1;
  
  -- تحويل إلى دولار أولاً
  amount_usd := CASE p_from_currency
    WHEN 'USD' THEN p_amount
    WHEN 'YER' THEN p_amount / rate_usd_yer
    WHEN 'SAR' THEN p_amount / rate_usd_sar
  END;
  
  -- تحويل من دولار إلى العملة المطلوبة
  result := CASE p_to_currency
    WHEN 'USD' THEN amount_usd
    WHEN 'YER' THEN amount_usd * rate_usd_yer
    WHEN 'SAR' THEN amount_usd * rate_usd_sar
  END;
  
  RETURN ROUND(result, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENABLE REALTIME FOR ALL TABLES
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdraw_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_livechat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.livechat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_balance_log;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kill_switch;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exchange_rates;

-- =====================================================
-- RLS POLICIES - سياسات الأمان
-- =====================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_livechat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livechat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gift_codes ENABLE ROW LEVEL SECURITY;

-- المستخدم يرى بياناته فقط
CREATE POLICY "Users can view own data" ON public.users FOR SELECT USING (auth.uid() = id OR firebase_uid = auth.uid()::text);
CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid() = id OR firebase_uid = auth.uid()::text);

-- المعاملات
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (user_id::text = auth.uid()::text OR from_user_id::text = auth.uid()::text OR to_user_id::text = auth.uid()::text);
CREATE POLICY "Users create own transactions" ON public.transactions FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- الطلبات
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users create own orders" ON public.orders FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- الإيداع
CREATE POLICY "Users view own deposits" ON public.deposit_requests FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users create deposits" ON public.deposit_requests FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- السحب
CREATE POLICY "Users view own withdraws" ON public.withdraw_requests FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users create withdraws" ON public.withdraw_requests FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- الإشعارات
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id::text = auth.uid()::text);

-- الدعم
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users create tickets" ON public.support_tickets FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- KYC
CREATE POLICY "Users view own kyc" ON public.kyc_documents FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users create kyc" ON public.kyc_documents FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- الجداول العامة - الجميع يقرأ
CREATE POLICY "Public read sections" ON public.sections FOR SELECT USING (TRUE);
CREATE POLICY "Public read subsections" ON public.sub_sections FOR SELECT USING (TRUE);
CREATE POLICY "Public read providers" ON public.service_providers FOR SELECT USING (TRUE);
CREATE POLICY "Public read packages" ON public.product_packages FOR SELECT USING (TRUE);
CREATE POLICY "Public read api_providers" ON public.api_providers FOR SELECT USING (TRUE);
CREATE POLICY "Public read api_categories" ON public.api_categories FOR SELECT USING (TRUE);
CREATE POLICY "Public read api_products" ON public.api_products FOR SELECT USING (TRUE);
CREATE POLICY "Public read exchange_rates" ON public.exchange_rates FOR SELECT USING (TRUE);
CREATE POLICY "Public read banners" ON public.banners FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read wallet_addresses" ON public.wallet_addresses FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read branding" ON public.branding FOR SELECT USING (TRUE);
CREATE POLICY "Public read card_colors" ON public.card_colors FOR SELECT USING (TRUE);
CREATE POLICY "Public read bottom_nav" ON public.bottom_nav FOR SELECT USING (TRUE);
CREATE POLICY "Public read feature_flags" ON public.feature_flags FOR SELECT USING (TRUE);
CREATE POLICY "Public read wallet_services" ON public.wallet_services FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read visibility" ON public.visibility FOR SELECT USING (TRUE);
CREATE POLICY "Public read legal_content" ON public.legal_content FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read social_links" ON public.social_links FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read limits" ON public.limits FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read currency_cards" ON public.currency_cards FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read instant_recharge" ON public.instant_recharge FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read maintenance" ON public.maintenance FOR SELECT USING (TRUE);
CREATE POLICY "Public read kill_switch" ON public.kill_switch FOR SELECT USING (TRUE);
CREATE POLICY "Public read app_config" ON public.app_config FOR SELECT USING (TRUE);

-- =====================================================
-- 49. ESCROW_TRANSACTIONS - معاملات الضمان/الوسيط
-- =====================================================
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  buyer_id UUID NOT NULL REFERENCES public.users(id),
  seller_id UUID NOT NULL REFERENCES public.users(id),
  
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('YER', 'SAR', 'USD')),
  
  reference_code TEXT UNIQUE NOT NULL,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'funded', 'buyer_confirmed', 'seller_confirmed', 'completed', 'disputed', 'cancelled', 'refunded')),
  
  buyer_confirmed BOOLEAN DEFAULT FALSE,
  seller_confirmed BOOLEAN DEFAULT FALSE,
  buyer_confirmed_at TIMESTAMPTZ,
  seller_confirmed_at TIMESTAMPTZ,
  
  funded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  dispute_reason TEXT DEFAULT '',
  dispute_opened_at TIMESTAMPTZ,
  dispute_resolved_by UUID REFERENCES public.users(id),
  dispute_resolution TEXT DEFAULT '',
  dispute_resolved_at TIMESTAMPTZ,
  
  transaction_id UUID REFERENCES public.transactions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON public.escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON public.escrow_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON public.escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_ref ON public.escrow_transactions(reference_code);
CREATE INDEX IF NOT EXISTS idx_escrow_created ON public.escrow_transactions(created_at DESC);

-- =====================================================
-- 50. BRANCHES - الفروع
-- =====================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  address TEXT DEFAULT '',
  governorate TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  
  manager_name TEXT DEFAULT '',
  manager_phone TEXT DEFAULT '',
  
  working_hours TEXT DEFAULT 'السبت-الخميس: 8 ص - 8 م',
  weekend TEXT DEFAULT 'الجمعة',
  
  latitude NUMERIC(10,7) DEFAULT 0,
  longitude NUMERIC(10,7) DEFAULT 0,
  
  services TEXT[] DEFAULT '{}',
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 51. USER_REVIEWS - تقييمات المستخدمين
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'service', 'app', 'support', 'transaction')),
  
  service_id TEXT DEFAULT '',
  order_id UUID REFERENCES public.orders(id),
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged')),
  admin_reply TEXT DEFAULT '',
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES public.users(id),
  
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.user_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.user_reviews(status);

-- =====================================================
-- 52. MARKETING_CONTENT - المحتوى التسويقي
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marketing_content (
  id TEXT PRIMARY KEY,
  
  title TEXT NOT NULL,
  title_en TEXT DEFAULT '',
  content TEXT DEFAULT '',
  content_en TEXT DEFAULT '',
  
  type TEXT DEFAULT 'general' CHECK (type IN ('welcome', 'promo', 'notification_template', 'email_template', 'referral', 'app_description', 'general')),
  
  is_active BOOLEAN DEFAULT TRUE,
  
  updated_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 53. PRICE_OVERRIDES - تخصيص الأسعار
-- =====================================================
CREATE TABLE IF NOT EXISTS public.price_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  target_type TEXT NOT NULL CHECK (target_type IN ('global', 'provider', 'package')),
  target_id TEXT NOT NULL DEFAULT 'global',
  
  markup_type TEXT NOT NULL CHECK (markup_type IN ('percentage', 'fixed')),
  markup_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  markup_currency TEXT DEFAULT 'USD',
  
  min_price NUMERIC(15,2) DEFAULT 0,
  max_price NUMERIC(15,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_priceoverride_target ON public.price_overrides(target_type, target_id);

-- =====================================================
-- 54. COMMISSION_CONFIG - إعدادات العمولة
-- =====================================================
CREATE TABLE IF NOT EXISTS public.commission_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  target_type TEXT NOT NULL CHECK (target_type IN ('global', 'provider', 'package')),
  target_id TEXT NOT NULL DEFAULT 'global',
  
  commission_type TEXT NOT NULL CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value NUMERIC(15,2) NOT NULL DEFAULT 3,
  commission_currency TEXT DEFAULT 'USD',
  
  min_commission NUMERIC(15,2) DEFAULT 0,
  max_commission NUMERIC(15,2) DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissionconfig_target ON public.commission_config(target_type, target_id);

-- =====================================================
-- 55. DATA_EXPORTS - سجل التصديرات
-- =====================================================
CREATE TABLE IF NOT EXISTS public.data_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  export_type TEXT NOT NULL CHECK (export_type IN ('users', 'transactions', 'orders', 'deposits', 'withdrawals', 'commissions', 'custom')),
  format TEXT DEFAULT 'csv' CHECK (format IN ('csv', 'xlsx', 'json')),
  
  date_from TIMESTAMPTZ,
  date_to TIMESTAMPTZ,
  filters JSONB DEFAULT '{}',
  
  file_path TEXT DEFAULT '',
  file_size_mb NUMERIC(10,2) DEFAULT 0,
  row_count INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  
  requested_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS for new tables
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_exports ENABLE ROW LEVEL SECURITY;

-- Escrow policies
CREATE POLICY "Users view own escrows" ON public.escrow_transactions FOR SELECT USING (buyer_id::text = auth.uid()::text OR seller_id::text = auth.uid()::text);
CREATE POLICY "Users create escrows" ON public.escrow_transactions FOR INSERT WITH CHECK (buyer_id::text = auth.uid()::text OR seller_id::text = auth.uid()::text);
CREATE POLICY "Users update own escrows" ON public.escrow_transactions FOR UPDATE USING (buyer_id::text = auth.uid()::text OR seller_id::text = auth.uid()::text);

-- Reviews
CREATE POLICY "Users view reviews" ON public.user_reviews FOR SELECT USING (TRUE);
CREATE POLICY "Users create reviews" ON public.user_reviews FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- Public read for branches, marketing, price overrides
CREATE POLICY "Public read branches" ON public.branches FOR SELECT USING (TRUE);
CREATE POLICY "Public read marketing" ON public.marketing_content FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read price_overrides" ON public.price_overrides FOR SELECT USING (TRUE);
CREATE POLICY "Public read commission_config" ON public.commission_config FOR SELECT USING (TRUE);

-- Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_exports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_providers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_packages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_addresses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_providers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;
