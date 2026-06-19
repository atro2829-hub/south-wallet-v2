-- =====================================================================
-- Migration 027: Unified Catalog + Smart Routing + Auto Margin
-- South Wallet — كتالوج موحد + توجيه ذكي للأرخص + هامش ربح تلقائي
-- =====================================================================
-- الهيكلية الجديدة:
--   global_games (الألعاب العالمية المرئية للمستخدم — مثل PUBG, Free Fire, MLBB)
--     ↓
--   global_packages (الباقات العالمية الموحدة — مثل "60 UC", "120 UC")
--     ↓
--   provider_products (ربط الباقات الموحدة بعروض المزودين)
--     - cost_price من كل مزود
--     - stock_status من كل مزود
--     - is_active_offer (المزود النشط حالياً = الأرخص + متوفر)
-- =====================================================================

-- ---------- 1) global_games — الألعاب العالمية المرئية للمستخدم -------
CREATE TABLE IF NOT EXISTS public.global_games (
  id TEXT PRIMARY KEY,
  -- game_code يطابق G2Bulk (pubgm, freefire, mlbb, ...)
  game_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  image_url_cached TEXT DEFAULT '',
  banner_url TEXT DEFAULT '',
  -- الأيقونة + اللون للعرض في الكتالوج
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#8B5CF6',
  -- الفئة الرئيسية (games, gift-cards, entertainment, shopping)
  category TEXT DEFAULT 'games',
  -- الترتيب: الأقل يظهر أولاً (PUBG=1, FreeFire=2, MLBB=3, ...)
  sort_order INTEGER DEFAULT 100,
  -- تثبيت في الأعلى (للألعاب الضخمة)
  is_pinned BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  -- الحقول الديناميكية المطلوبة لكل لعبة (يتم تحديثها تلقائياً من G2Bulk)
  required_fields JSONB DEFAULT '[]'::jsonb,
  -- السيرفرات (للألعاب التي تتطلب server_id مثل MLBB)
  servers JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.global_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on global_games" ON public.global_games FOR SELECT USING (true);
CREATE POLICY "Admin full access on global_games" ON public.global_games FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_games TO anon, authenticated;

-- ---------- 2) global_packages — الباقات العالمية الموحدة -------------
CREATE TABLE IF NOT EXISTS public.global_packages (
  id TEXT PRIMARY KEY,
  -- المرجع للعبة العالمية
  global_game_id TEXT NOT NULL REFERENCES public.global_games(id) ON DELETE CASCADE,
  -- الاسم الموحد للباقة (مثلاً "60 UC", "120 UC", "Netflix 1 Month")
  name TEXT NOT NULL,
  name_ar TEXT DEFAULT '',
  description TEXT DEFAULT '',
  -- القيمة الرقمية + العملة (للترتيب التصاعدي)
  unit_amount NUMERIC(15,2) DEFAULT 0,
  unit_label TEXT DEFAULT '',
  -- سعر البيع النهائي للمستخدم (محسوب تلقائياً من أرخص مزود + margin)
  sell_price_usd NUMERIC(15,2) DEFAULT 0,
  sell_price_yer NUMERIC(15,2) DEFAULT 0,
  sell_price_sar NUMERIC(15,2) DEFAULT 0,
  -- الصورة
  image_url TEXT DEFAULT '',
  -- الترتيب (تصاعدي حسب unit_amount)
  sort_order INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  -- الـ catalogue_name الذي يُمرَّر لـ G2Bulk عند الشراء (مثلاً "60 UC")
  catalogue_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_packages_game
  ON public.global_packages(global_game_id) WHERE is_active = TRUE;

ALTER TABLE public.global_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on global_packages" ON public.global_packages FOR SELECT USING (true);
CREATE POLICY "Admin full access on global_packages" ON public.global_packages FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_packages TO anon, authenticated;

-- ---------- 3) provider_products — ربط الباقات بعروض المزودين ---------
CREATE TABLE IF NOT EXISTS public.provider_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- الباقة العالمية التي يعرضها هذا العرض
  global_package_id TEXT NOT NULL REFERENCES public.global_packages(id) ON DELETE CASCADE,
  -- المزود (g2bulk أو أي مزود آخر)
  provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  -- معرّف المنتج عند المزود (لتمريره عند الشراء)
  provider_product_id TEXT NOT NULL,
  provider_game_code TEXT DEFAULT '',
  provider_catalogue_name TEXT DEFAULT '',
  -- سعر التكلفة من هذا المزود تحديداً
  cost_price NUMERIC(15,2) DEFAULT 0,
  cost_currency TEXT DEFAULT 'USD',
  -- حالة المخزون
  stock_status TEXT DEFAULT 'in_stock',  -- in_stock | out_of_stock | unknown
  stock_quantity INTEGER DEFAULT 0,
  -- هل هذا هو العرض النشط حالياً (المزود الأرخص المتوفر)
  is_active_offer BOOLEAN DEFAULT FALSE,
  -- آخر تحديث من المزامنة
  last_synced_at TIMESTAMPTZ,
  -- بيانات خام من API
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, provider_product_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_products_package
  ON public.provider_products(global_package_id);
CREATE INDEX IF NOT EXISTS idx_provider_products_active_offer
  ON public.provider_products(global_package_id) WHERE is_active_offer = TRUE;

ALTER TABLE public.provider_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on provider_products" ON public.provider_products FOR SELECT USING (true);
CREATE POLICY "Admin full access on provider_products" ON public.provider_products FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_products TO anon, authenticated;

-- ---------- 4) إضافة أعمدة هامش الربح لـ api_providers ----------------
-- auto_margin_percent: النسبة المضافة تلقائياً لكل منتج من هذا المزود
-- category_overrides: JSONB لتخصيص هامش مختلف لكل فئة
--   مثال: {"games": 15, "gift-cards": 10, "entertainment": 20}
ALTER TABLE public.api_providers
  ADD COLUMN IF NOT EXISTS auto_margin_percent NUMERIC(5,2) DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS category_overrides JSONB DEFAULT '{}'::jsonb;

-- ---------- 5) Seed الألعاب المرشحة (PUBG, Free Fire, MLBB) -----------
-- لاحظ: سنضيف فقط الألعاب الشائعة في الوطن العربي — لا كل ألعاب G2Bulk
INSERT INTO public.global_games(id, game_code, name, name_ar, description, category, sort_order, is_pinned, color, icon, tags) VALUES
  ('pubg-mobile', 'pubgm', 'PUBG Mobile', 'ببجي موبايل', 'شحن UC لحساب ببجي موبايل', 'games', 1, true, '#F59E0B', '🎮', ARRAY['shooter','battle-royale','arabic']),
  ('free-fire', 'freefire', 'Free Fire', 'فري فاير', 'شحن جواهر فري فاير', 'games', 2, true, '#EF4444', '🎮', ARRAY['shooter','battle-royale','arabic']),
  ('mlbb', 'mlbb', 'Mobile Legends Bang Bang', 'موبايل ليجندز', 'شحن ماس موبايل ليجندز', 'games', 3, true, '#3B82F6', '🎮', ARRAY['moba','arabic']),
  ('codm', 'codm', 'Call of Duty Mobile', 'كول أوف ديوتي موبايل', 'شحن نقاط COD', 'games', 4, false, '#10B981', '🎮', ARRAY['shooter','arabic']),
  ('genshin', 'genshin', 'Genshin Impact', 'جينشن إمباكت', 'شحن كريستالات جينشن', 'games', 5, false, '#8B5CF6', '🎮', ARRAY['rpg','arabic']),
  ('valorant', 'valorant', 'Valorant', 'فالورانت', 'شحن نقاط فالورانت', 'games', 6, false, '#EC4899', '🎮', ARRAY['shooter','arabic']),
  ('clash-royale', 'clashroyale', 'Clash Royale', 'كلاش رويال', 'شحن جواهر كلاش رويال', 'games', 7, false, '#F97316', '🎮', ARRAY['strategy','arabic']),
  ('clash-of-clans', 'clashofclans', 'Clash of Clans', 'كلاش أوف كلانز', 'شحن جواهر كلاش أوف كلانز', 'games', 8, false, '#EAB308', '🎮', ARRAY['strategy','arabic'])
ON CONFLICT (id) DO NOTHING;

-- ---------- 6) Seed بطاقات الهدايا الشائعة في الوطن العربي ------------
INSERT INTO public.global_games(id, game_code, name, name_ar, description, category, sort_order, is_pinned, color, icon, tags) VALUES
  ('itunes-sa', 'itunes_sa', 'Apple iTunes Saudi Arabia', 'آبل آيتونز السعودية', 'بطاقة آبل السعودية', 'gift-cards', 101, false, '#06B6D4', '🎁', ARRAY['gift-card','saudi','arabic']),
  ('itunes-uae', 'itunes_ae', 'Apple iTunes UAE', 'آبل آيتونز الإمارات', 'بطاقة آبل الإمارات', 'gift-cards', 102, false, '#06B6D4', '🎁', ARRAY['gift-card','uae','arabic']),
  ('itunes-eg', 'itunes_eg', 'Apple iTunes Egypt', 'آبل آيتونز مصر', 'بطاقة آبل مصر', 'gift-cards', 103, false, '#06B6D4', '🎁', ARRAY['gift-card','egypt','arabic']),
  ('google-play-sa', 'googleplay_sa', 'Google Play Saudi Arabia', 'جوجل بلاي السعودية', 'بطاقة جوجل بلاي السعودية', 'gift-cards', 104, false, '#10B981', '🎁', ARRAY['gift-card','saudi','arabic']),
  ('google-play-uae', 'googleplay_ae', 'Google Play UAE', 'جوجل بلاي الإمارات', 'بطاقة جوجل بلاي الإمارات', 'gift-cards', 105, false, '#10B981', '🎁', ARRAY['gift-card','uae','arabic']),
  ('psn-sa', 'psn_sa', 'PlayStation Network Saudi', 'بطاقة بلايستيشن السعودية', 'بطاقة PSN السعودية', 'gift-cards', 106, false, '#3B82F6', '🎁', ARRAY['gift-card','saudi','arabic']),
  ('psn-uae', 'psn_ae', 'PlayStation Network UAE', 'بطاقة بلايستيشن الإمارات', 'بطاقة PSN الإمارات', 'gift-cards', 107, false, '#3B82F6', '🎁', ARRAY['gift-card','uae','arabic']),
  ('netflix', 'netflix', 'Netflix', 'نتفلكس', 'اشتراك نتفلكس', 'entertainment', 201, false, '#EF4444', '🎬', ARRAY['streaming','arabic']),
  ('spotify', 'spotify', 'Spotify', 'سبوتيفاي', 'اشتراك سبوتيفاي', 'entertainment', 202, false, '#10B981', '🎵', ARRAY['streaming','arabic'])
ON CONFLICT (id) DO NOTHING;

-- ---------- 7) تحديث api_providers auto_margin_percent ----------------
UPDATE public.api_providers
SET auto_margin_percent = 15.0,
    category_overrides = '{"games": 15, "gift-cards": 12, "entertainment": 18}'::jsonb
WHERE id = 'g2bulk';

-- ---------- 8) Audit log ---------------------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL, 'migration_applied', 'migration',
  '027_unified_catalog_smart_routing',
  jsonb_build_object(
    'description', 'Created global_games, global_packages, provider_products tables. Seeded 8 popular Arab games (PUBG, Free Fire, MLBB, ...) and 9 gift cards (iTunes SA/UAE/EG, Google Play SA/UAE, PSN SA/UAE, Netflix, Spotify). Added auto_margin_percent + category_overrides columns to api_providers.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
