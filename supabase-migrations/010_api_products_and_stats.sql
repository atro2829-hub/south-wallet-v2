-- =====================================================
-- South Wallet - Migration 010: جدول api_products الموحّد
-- Unified API Products table for G2Bulk and other providers
-- =====================================================

-- جدول موحّد لمنتجات API (يدعم جميع المزودين)
CREATE TABLE IF NOT EXISTS public.api_products (
  id                  TEXT PRIMARY KEY,
  api_provider_id     TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  api_category_id     TEXT DEFAULT NULL,
  api_product_id      TEXT NOT NULL,
  name                TEXT NOT NULL DEFAULT '',
  name_en             TEXT DEFAULT '',
  description         TEXT DEFAULT '',
  price               NUMERIC(12,4) DEFAULT 0,
  currency            TEXT DEFAULT 'USD',
  image_url           TEXT DEFAULT '',
  is_active           BOOLEAN DEFAULT true,
  is_synced           BOOLEAN DEFAULT false,
  last_synced_at      TIMESTAMPTZ DEFAULT NULL,
  product_data        JSONB DEFAULT '{}',
  provider_id         TEXT DEFAULT NULL REFERENCES public.service_providers(id) ON DELETE SET NULL,
  package_id          TEXT DEFAULT NULL REFERENCES public.product_packages(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(api_provider_id, api_product_id)
);

CREATE INDEX IF NOT EXISTS idx_api_products_provider ON public.api_products(api_provider_id);
CREATE INDEX IF NOT EXISTS idx_api_products_category ON public.api_products(api_category_id);
CREATE INDEX IF NOT EXISTS idx_api_products_active ON public.api_products(is_active);
CREATE INDEX IF NOT EXISTS idx_api_products_synced ON public.api_products(is_synced, last_synced_at);

ALTER TABLE public.api_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_products' AND policyname = 'api_products_select') THEN
    CREATE POLICY "api_products_select" ON public.api_products FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_products' AND policyname = 'api_products_all_admin') THEN
    CREATE POLICY "api_products_all_admin" ON public.api_products FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Trigger
DROP TRIGGER IF EXISTS tr_api_products_updated_at ON public.api_products;
CREATE TRIGGER tr_api_products_updated_at BEFORE UPDATE ON public.api_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== تحسينات إضافية =====

-- إضافة عمود api_category_id لجدول api_categories إن لم يوجد
ALTER TABLE public.api_categories
  ADD COLUMN IF NOT EXISTS game_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'product' CHECK (category_type IN ('product', 'game', 'service', 'telecom'));

-- إصلاح دالة update_updated_at_column إن لم تكن موجودة
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة للحصول على ملخص إحصائيات المزودين
CREATE OR REPLACE FUNCTION public.get_provider_stats()
RETURNS TABLE (
  provider_id TEXT,
  provider_name TEXT,
  category_count BIGINT,
  product_count BIGINT,
  game_count BIGINT,
  last_sync TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.id AS provider_id,
    ap.name AS provider_name,
    COUNT(DISTINCT CASE WHEN ac.category_type = 'product' THEN ac.id END) AS category_count,
    COUNT(DISTINCT CASE WHEN ac.category_type = 'product' THEN aprod.id END) AS product_count,
    COUNT(DISTINCT CASE WHEN ac.category_type = 'game' OR ag.id IS NOT NULL THEN COALESCE(ag.id, ac.id) END) AS game_count,
    ap.last_sync_at AS last_sync,
    ap.is_active
  FROM public.api_providers ap
  LEFT JOIN public.api_categories ac ON ac.api_provider_id = ap.id
  LEFT JOIN public.api_products aprod ON aprod.api_provider_id = ap.id
  LEFT JOIN public.api_games ag ON ag.api_provider_id = ap.id
  GROUP BY ap.id, ap.name, ap.last_sync_at, ap.is_active
  ORDER BY ap.is_active DESC, ap.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحسين جدول الجلسات: إضافة عمود notifications_count_cache
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deposits NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL REFERENCES public.users(id) ON DELETE SET NULL;

-- فهرس لـ referral_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code) WHERE referral_code IS NOT NULL;

-- دالة لتحديث إحصائيات المستخدم
CREATE OR REPLACE FUNCTION public.update_user_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET
    total_orders = (SELECT COUNT(*) FROM public.orders WHERE user_id = p_user_id AND status = 'completed'),
    total_deposits = (SELECT COALESCE(SUM(amount), 0) FROM public.deposit_requests WHERE user_id = p_user_id AND status = 'approved'),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View لملخص الأقسام مع بياناتها
CREATE OR REPLACE VIEW public.sections_summary AS
SELECT
  s.id,
  s.name,
  s.name_en,
  s.icon,
  s.color,
  s.type,
  s.is_active,
  s.is_visible,
  s.sort_order,
  s.api_provider_id,
  COALESCE(ap.name, '') AS api_provider_name,
  COUNT(DISTINCT ss.id) AS sub_section_count,
  COUNT(DISTINCT sp.id) AS provider_count,
  COUNT(DISTINCT pp.id) AS package_count
FROM public.sections s
LEFT JOIN public.api_providers ap ON ap.id = s.api_provider_id
LEFT JOIN public.sub_sections ss ON ss.section_id = s.id AND ss.is_active = true
LEFT JOIN public.service_providers sp ON sp.section_id = s.id AND sp.is_active = true
LEFT JOIN public.product_packages pp ON pp.provider_id = sp.id AND pp.is_active = true
GROUP BY s.id, s.name, s.name_en, s.icon, s.color, s.type, s.is_active, s.is_visible, s.sort_order, s.api_provider_id, ap.name
ORDER BY s.sort_order;

COMMENT ON TABLE public.api_products IS 'منتجات API الموحّدة من جميع المزودين';
COMMENT ON VIEW public.sections_summary IS 'ملخص الأقسام مع إحصائياتها';
