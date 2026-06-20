-- =====================================================================
-- Migration 030: Unified self-referencing categories + provider mapping
-- South Wallet — هيكل احترافي للأقسام مع نظام مطابقة المزودين
-- =====================================================================
-- الهيكل:
--   categories (جدول واحد موحد، self-referencing عبر parent_id)
--     ├── الأقسام الرئيسية: parent_id = NULL
--     └── الأقسام الفرعية: parent_id = id القسم الرئيسي
--
--   provider_categories (جدول المطابقة)
--     يربط بين فئات G2Bulk وأقسامنا المحلية
-- =====================================================================

-- ---------- 1) جدول الأقسام الموحد (self-referencing) ----------------
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#5C1A1B',
  image_url TEXT DEFAULT '',
  -- السر: parent_id — NULL = قسم رئيسي، غير NULL = قسم فرعي
  parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  slug TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  -- نوع القسم: catalog (منتجات/ألعاب), service (خدمات), wallet (محفظة)
  category_type TEXT DEFAULT 'catalog',
  -- ربط اختياري بمزود API
  api_provider_id TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories(sort_order);

-- RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin full access on categories" ON public.categories FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;

-- ---------- 2) جدول مطابقة المزودين (provider_categories) -----------
CREATE TABLE IF NOT EXISTS public.provider_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- المزود (g2bulk, أو أي مزود آخر)
  provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  -- معرّف/اسم الفئة عند المزود (مثل "PUBG Mobile Global UC")
  provider_category_id TEXT NOT NULL,
  provider_category_name TEXT DEFAULT '',
  -- القسم المحلي المرتبط (من جدول categories)
  local_category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  -- حالة المطابقة
  is_mapped BOOLEAN DEFAULT FALSE,
  needs_attention BOOLEAN DEFAULT FALSE,
  -- بيانات إضافية
  product_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, provider_category_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_categories_provider ON public.provider_categories(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_categories_mapped ON public.provider_categories(is_mapped);
CREATE INDEX IF NOT EXISTS idx_provider_categories_needs_attention ON public.provider_categories(needs_attention);

-- RLS
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on provider_categories" ON public.provider_categories FOR SELECT USING (true);
CREATE POLICY "Admin full access on provider_categories" ON public.provider_categories FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_categories TO anon, authenticated;

-- ---------- 3) Seed الأقسام الرئيسية الافتراضية --------------------
INSERT INTO public.categories(id, name, name_en, icon, color, parent_id, slug, sort_order, category_type) VALUES
  ('games', 'الألعاب', 'Games', 'gamepad-2', '#5C1A1B', NULL, 'games', 1, 'catalog'),
  ('gift-cards', 'بطاقات الهدايا', 'Gift Cards', 'gift', '#5C1A1B', NULL, 'gift-cards', 2, 'catalog'),
  ('streaming', 'اشتراكات وترفيه', 'Streaming & Entertainment', 'play', '#5C1A1B', NULL, 'streaming', 3, 'catalog'),
  ('shopping', 'بطاقات التسوق', 'Shopping Cards', 'shopping-bag', '#5C1A1B', NULL, 'shopping', 4, 'catalog'),
  ('recharge', 'شحن رصيد', 'Recharge', 'smartphone', '#5C1A1B', NULL, 'recharge', 5, 'service')
ON CONFLICT (id) DO NOTHING;

-- ---------- 4) Seed أقسام فرعية شائعة ------------------------------
INSERT INTO public.categories(id, name, name_en, icon, color, parent_id, slug, sort_order, category_type) VALUES
  -- ألعاب فرعية
  ('games-pubg', 'ببجي موبايل', 'PUBG Mobile', 'gamepad-2', '#5C1A1B', 'games', 'pubg-mobile', 1, 'catalog'),
  ('games-freefire', 'فري فاير', 'Free Fire', 'gamepad-2', '#5C1A1B', 'games', 'free-fire', 2, 'catalog'),
  ('games-mlbb', 'موبايل ليجندز', 'Mobile Legends', 'gamepad-2', '#5C1A1B', 'games', 'mobile-legends', 3, 'catalog'),
  ('games-codm', 'كول أوف ديوتي', 'Call of Duty Mobile', 'gamepad-2', '#5C1A1B', 'games', 'cod-mobile', 4, 'catalog'),
  ('games-genshin', 'جينشن إمباكت', 'Genshin Impact', 'gamepad-2', '#5C1A1B', 'games', 'genshin-impact', 5, 'catalog'),
  ('games-valorant', 'فالورانت', 'Valorant', 'gamepad-2', '#5C1A1B', 'games', 'valorant', 6, 'catalog'),
  -- بطاقات هدايا فرعية
  ('gift-itunes', 'آبل آيتونز', 'Apple iTunes', 'gift', '#5C1A1B', 'gift-cards', 'itunes', 1, 'catalog'),
  ('gift-googleplay', 'جوجل بلاي', 'Google Play', 'gift', '#5C1A1B', 'gift-cards', 'google-play', 2, 'catalog'),
  ('gift-psn', 'بلايستيشن', 'PlayStation Network', 'gift', '#5C1A1B', 'gift-cards', 'psn', 3, 'catalog'),
  ('gift-steam', 'ستيم', 'Steam', 'gift', '#5C1A1B', 'gift-cards', 'steam', 4, 'catalog'),
  -- اشتراكات فرعية
  ('streaming-netflix', 'نتفلكس', 'Netflix', 'play', '#5C1A1B', 'streaming', 'netflix', 1, 'catalog'),
  ('streaming-spotify', 'سبوتيفاي', 'Spotify', 'play', '#5C1A1B', 'streaming', 'spotify', 2, 'catalog'),
  -- بطاقات تسوق فرعية
  ('shopping-amazon', 'أمازون', 'Amazon', 'shopping-bag', '#5C1A1B', 'shopping', 'amazon', 1, 'catalog'),
  ('shopping-ebay', 'إيباي', 'eBay', 'shopping-bag', '#5C1A1B', 'shopping', 'ebay', 2, 'catalog')
ON CONFLICT (id) DO NOTHING;

-- ---------- 5) Audit log ---------------------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL, 'migration_applied', 'migration',
  '030_unified_categories_provider_mapping',
  jsonb_build_object(
    'description', 'Created self-referencing categories table + provider_categories mapping table. Seeded 5 main categories + 14 sub-categories.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
