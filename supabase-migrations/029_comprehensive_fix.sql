-- =====================================================================
-- Migration 029: Comprehensive fix for 12 issues
-- South Wallet — إصلاحات شاملة
-- =====================================================================

-- ---------- 1) Banks: add branch + icon_url columns -------------------
ALTER TABLE public.banks
  ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_label TEXT DEFAULT '';

-- ---------- 2) Gift codes: add is_active + visible_to_users -----------
ALTER TABLE public.gift_codes
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS visible_to_users BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add redemption tracking columns
ALTER TABLE public.gift_codes
  ADD COLUMN IF NOT EXISTS redeemed_by UUID,
  ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

-- ---------- 3) Service providers: ensure is_visible column exists -----
-- (already added in migration 009 but verify)
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- ---------- 4) api_categories + api_games + api_products: is_visible --
ALTER TABLE public.api_categories
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.api_games
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.api_products
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- ---------- 5) Update existing rows to is_visible=true ----------------
UPDATE public.service_providers SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE public.api_categories SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE public.api_games SET is_visible = TRUE WHERE is_visible IS NULL;
UPDATE public.api_products SET is_visible = TRUE WHERE is_visible IS NULL;

-- ---------- 6) Seed escrow + investment sections if missing -----------
-- الضمان والوسيط (escrow) section
INSERT INTO public.sections(id, name, name_en, description, icon, color, type, sort_order, is_active, is_visible, show_in_home, show_in_services, screen_type, created_at, updated_at)
VALUES (
  'escrow', 'الوسيط والضمان', 'Escrow & Mediator',
  'خدمة الوسيط المالي ثلاثي الأطراف بين البائع والمشتري والإدارة',
  'shield', '#5C1A1B', 'escrow', 7, TRUE, TRUE, TRUE, TRUE, 'escrow',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  is_visible = TRUE,
  show_in_home = TRUE,
  show_in_services = TRUE,
  screen_type = EXCLUDED.screen_type,
  updated_at = NOW();

-- Investment section
INSERT INTO public.sections(id, name, name_en, description, icon, color, type, sort_order, is_active, is_visible, show_in_home, show_in_services, screen_type, created_at, updated_at)
VALUES (
  'investment', 'الاستثمار', 'Investment',
  'خطط استثمارية في USDT بعوائد يومية وأسبوعية وشهرية',
  'trending-up', '#10B981', 'investment', 8, TRUE, TRUE, TRUE, TRUE, 'investment',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  is_visible = TRUE,
  show_in_home = TRUE,
  show_in_services = TRUE,
  screen_type = EXCLUDED.screen_type,
  updated_at = NOW();

-- Recharge section (شحن رصيد) — ensure it exists
INSERT INTO public.sections(id, name, name_en, description, icon, color, type, sort_order, is_active, is_visible, show_in_home, show_in_services, screen_type, created_at, updated_at)
VALUES (
  'recharge', 'شحن رصيد', 'Recharge',
  'شحن رصيد الهاتف والإنترنت والكهرباء',
  'smartphone', '#3B82F6', 'telecom', 1, TRUE, TRUE, TRUE, TRUE, 'recharge',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  is_visible = TRUE,
  show_in_home = TRUE,
  show_in_services = TRUE,
  screen_type = EXCLUDED.screen_type,
  updated_at = NOW();

-- ---------- 7) Seed telecom companies as service_providers ------------
INSERT INTO public.service_providers(id, section_id, name, name_en, icon, color, type, execution_type, is_active, is_visible, sort_order, created_at, updated_at) VALUES
  ('yemen-mobile', 'recharge', 'يمن موبايل', 'Yemen Mobile', 'phone', '#10B981', 'manual', 'manual', TRUE, TRUE, 1, NOW(), NOW()),
  ('yo', 'recharge', 'YO', 'YO', 'phone', '#3B82F6', 'manual', 'manual', TRUE, TRUE, 2, NOW(), NOW()),
  ('sabafon', 'recharge', 'سبأفون', 'Sabafon', 'phone', '#8B5CF6', 'manual', 'manual', TRUE, TRUE, 3, NOW(), NOW()),
  ('y', 'recharge', 'Y', 'Y', 'phone', '#EC4899', 'manual', 'manual', TRUE, TRUE, 4, NOW(), NOW()),
  ('yemen-net', 'recharge', 'يمن نت', 'Yemen Net', 'phone', '#F59E0B', 'manual', 'manual', TRUE, TRUE, 5, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  is_visible = TRUE,
  updated_at = NOW();

-- ---------- 8) Audit log ----------------------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL, 'migration_applied', 'migration',
  '029_comprehensive_fix_12_issues',
  jsonb_build_object(
    'description', 'Added branch/icon_url to banks; is_active/visible_to_users/max_uses to gift_codes; is_visible to api_categories/api_games/api_products/service_providers. Seeded escrow+investment+recharge sections. Seeded 5 telecom companies.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
