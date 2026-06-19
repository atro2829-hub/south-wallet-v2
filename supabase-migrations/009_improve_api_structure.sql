-- =====================================================
-- South Wallet - Migration 009: تحسين هيكل API والأقسام
-- Improve API structure, games support, indexes, RLS
-- =====================================================

-- 1. إضافة أعمدة للألعاب في api_categories
ALTER TABLE public.api_categories
  ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'product' CHECK (category_type IN ('product', 'game', 'service', 'telecom')),
  ADD COLUMN IF NOT EXISTS game_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS display_name_ar TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS icon_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2. إنشاء جدول api_games إذا لم يكن موجوداً لتخزين بيانات الألعاب
CREATE TABLE IF NOT EXISTS public.api_games (
  id          TEXT PRIMARY KEY,
  api_provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  game_code   TEXT NOT NULL,
  name        TEXT NOT NULL,
  name_ar     TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  banner_url  TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active   BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  tags        TEXT[] DEFAULT '{}',
  fields      JSONB DEFAULT '[]',
  servers     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(api_provider_id, game_code)
);

CREATE INDEX IF NOT EXISTS idx_api_games_provider ON public.api_games(api_provider_id);
CREATE INDEX IF NOT EXISTS idx_api_games_code     ON public.api_games(game_code);
CREATE INDEX IF NOT EXISTS idx_api_games_active   ON public.api_games(is_active);

ALTER TABLE public.api_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "api_games_select" ON public.api_games FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "api_games_all_admin" ON public.api_games FOR ALL USING (true) WITH CHECK (true);

-- 3. إنشاء جدول api_game_catalogues لباقات الألعاب
CREATE TABLE IF NOT EXISTS public.api_game_catalogues (
  id              TEXT PRIMARY KEY,
  api_provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  game_code       TEXT NOT NULL,
  catalogue_id    TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT DEFAULT '',
  amount          NUMERIC(12,4) DEFAULT 0,
  currency        TEXT DEFAULT 'USD',
  image_url       TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(api_provider_id, game_code, catalogue_id)
);

CREATE INDEX IF NOT EXISTS idx_game_catalogues_provider ON public.api_game_catalogues(api_provider_id);
CREATE INDEX IF NOT EXISTS idx_game_catalogues_game     ON public.api_game_catalogues(game_code);
CREATE INDEX IF NOT EXISTS idx_game_catalogues_active   ON public.api_game_catalogues(is_active);

ALTER TABLE public.api_game_catalogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "api_game_catalogues_select" ON public.api_game_catalogues FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "api_game_catalogues_all"    ON public.api_game_catalogues FOR ALL USING (true) WITH CHECK (true);

-- 4. تحسين أعمدة sections لدعم الربط بالـ API
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS api_category_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS api_section_type TEXT DEFAULT NULL CHECK (api_section_type IN ('categories', 'games', 'products', NULL)),
  ADD COLUMN IF NOT EXISTS show_in_home BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_services BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_section_id TEXT DEFAULT NULL REFERENCES public.sections(id) ON DELETE SET NULL;

-- 5. تحسين أعمدة sub_sections
ALTER TABLE public.sub_sections
  ADD COLUMN IF NOT EXISTS api_category_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS show_count BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT 'grid' CHECK (layout IN ('grid', 'list', 'carousel'));

-- 6. تحسين service_providers - إضافة أعمدة ناقصة
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_time TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- 7. تحسين product_packages - إضافة أعمدة ناقصة
ALTER TABLE public.product_packages
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT -1,
  ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS api_category_id TEXT DEFAULT NULL;

-- 8. فهرسة محسّنة للاستعلامات السريعة
CREATE INDEX IF NOT EXISTS idx_sections_type_active ON public.sections(type, is_active);
CREATE INDEX IF NOT EXISTS idx_sections_api_provider ON public.sections(api_provider_id) WHERE api_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_sections_section_active ON public.sub_sections(section_id, is_active);
CREATE INDEX IF NOT EXISTS idx_service_providers_section ON public.service_providers(section_id, is_active);
CREATE INDEX IF NOT EXISTS idx_service_providers_api ON public.service_providers(api_provider_id) WHERE api_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_packages_provider ON public.product_packages(provider_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_packages_api_product ON public.product_packages(api_product_id) WHERE api_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_card_number ON public.users(card_number) WHERE card_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON public.users(kyc_status);

-- 9. تحسين RLS لـ api_categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_categories' AND policyname = 'api_categories_select'
  ) THEN
    CREATE POLICY "api_categories_select" ON public.api_categories FOR SELECT USING (true);
  END IF;
END $$;

-- 10. دالة لجلب الأقسام مع بياناتها الكاملة (API + Manual)
CREATE OR REPLACE FUNCTION public.get_sections_with_data()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  name_en TEXT,
  description TEXT,
  icon TEXT,
  color TEXT,
  image_url TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  type TEXT,
  api_provider_id TEXT,
  api_provider_name TEXT,
  sub_section_count BIGINT,
  provider_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.name_en,
    s.description,
    s.icon,
    s.color,
    s.image_url,
    s.sort_order,
    s.is_active,
    s.type,
    s.api_provider_id,
    COALESCE(ap.name, '') AS api_provider_name,
    COUNT(DISTINCT ss.id) AS sub_section_count,
    COUNT(DISTINCT sp.id) AS provider_count
  FROM public.sections s
  LEFT JOIN public.api_providers ap ON ap.id = s.api_provider_id
  LEFT JOIN public.sub_sections ss ON ss.section_id = s.id AND ss.is_active = true
  LEFT JOIN public.service_providers sp ON sp.section_id = s.id AND sp.is_active = true
  GROUP BY s.id, s.name, s.name_en, s.description, s.icon, s.color, s.image_url,
           s.sort_order, s.is_active, s.type, s.api_provider_id, ap.name
  ORDER BY s.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. دالة لجلب الأقسام الفرعية مع عدد المنتجات
CREATE OR REPLACE FUNCTION public.get_sub_sections_with_counts(p_section_id TEXT)
RETURNS TABLE (
  id TEXT,
  section_id TEXT,
  name TEXT,
  name_en TEXT,
  icon TEXT,
  color TEXT,
  image_url TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  type TEXT,
  api_category_id TEXT,
  api_provider_id TEXT,
  product_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.section_id,
    ss.name,
    ss.name_en,
    ss.icon,
    ss.color,
    ss.image_url,
    ss.sort_order,
    ss.is_active,
    ss.type,
    ss.api_category_id,
    ss.api_provider_id,
    COUNT(DISTINCT sp.id) AS product_count
  FROM public.sub_sections ss
  LEFT JOIN public.service_providers sp ON sp.sub_section_id = ss.id AND sp.is_active = true
  WHERE ss.section_id = p_section_id
  GROUP BY ss.id, ss.section_id, ss.name, ss.name_en, ss.icon, ss.color,
           ss.image_url, ss.sort_order, ss.is_active, ss.type,
           ss.api_category_id, ss.api_provider_id
  ORDER BY ss.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. triggers للتحديث التلقائي
DROP TRIGGER IF EXISTS tr_api_games_updated_at ON public.api_games;
CREATE TRIGGER tr_api_games_updated_at BEFORE UPDATE ON public.api_games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_api_game_catalogues_updated_at ON public.api_game_catalogues;
CREATE TRIGGER tr_api_game_catalogues_updated_at BEFORE UPDATE ON public.api_game_catalogues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Storage bucket للألعاب
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('games', 'games', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- 14. تحسين دالة transfer_money لتسجيل العمليات بشكل أفضل
CREATE OR REPLACE FUNCTION public.transfer_money(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'YER',
  p_fee NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT 'تحويل'
) RETURNS TABLE(success BOOLEAN, message TEXT, transaction_id UUID) AS $$
DECLARE
  v_from_balance NUMERIC;
  v_total NUMERIC;
  v_new_txn_id UUID;
  v_ref TEXT;
BEGIN
  v_total := p_amount + p_fee;
  v_ref := 'TXN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::TEXT, 1, 8);

  EXECUTE format('SELECT balance_%s FROM public.users WHERE id = $1 FOR UPDATE', lower(p_currency))
    INTO v_from_balance USING p_from_user_id;

  IF v_from_balance IS NULL THEN
    RETURN QUERY SELECT false, 'المرسل غير موجود'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_from_balance < v_total THEN
    RETURN QUERY SELECT false, 'الرصيد غير كافي'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- خصم من المرسل
  EXECUTE format('UPDATE public.users SET balance_%s = balance_%s - $1, updated_at = now() WHERE id = $2',
    lower(p_currency), lower(p_currency))
  USING v_total, p_from_user_id;

  -- إضافة للمستقبل
  EXECUTE format('UPDATE public.users SET balance_%s = balance_%s + $1, updated_at = now() WHERE id = $2',
    lower(p_currency), lower(p_currency))
  USING p_amount, p_to_user_id;

  -- تسجيل المعاملة
  INSERT INTO public.transactions (
    user_id, from_user_id, to_user_id, amount, currency, fee, type, status, description, reference_number
  ) VALUES (
    p_from_user_id, p_from_user_id, p_to_user_id, p_amount, upper(p_currency), p_fee, 'transfer', 'completed', p_description, v_ref
  ) RETURNING id INTO v_new_txn_id;

  -- تسجيل معاملة الاستقبال
  INSERT INTO public.transactions (
    user_id, from_user_id, to_user_id, amount, currency, fee, type, status, description, reference_number
  ) VALUES (
    p_to_user_id, p_from_user_id, p_to_user_id, p_amount, upper(p_currency), 0, 'transfer', 'completed', p_description, v_ref
  );

  RETURN QUERY SELECT true, 'تم التحويل بنجاح'::TEXT, v_new_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. إضافة عمود notification_count للمستخدمين لتسريع الاستعلامات
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS unread_notifications_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Aden';

-- 16. تحديث updated_at تلقائياً لجدول users
DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.api_games IS 'الألعاب من مزودي API مع صورها ومعلوماتها';
COMMENT ON TABLE public.api_game_catalogues IS 'باقات وخيارات الشحن لكل لعبة';
COMMENT ON COLUMN public.sections.api_section_type IS 'نوع العرض: categories=أقسام, games=ألعاب, products=منتجات';
