-- =====================================================================
-- Migration 016: G2Bulk Complete Integration & Schema Fixes (v2)
-- محفظة الجنوب - South Wallet
-- =====================================================================
-- Compatible with the ACTUAL live schema (migration 009 was partially applied).
-- This migration is IDEMPOTENT — safe to run multiple times.
-- =====================================================================

-- ---------- 1) Add game-related columns to orders (already added in v1) --
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS game_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS player_id_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS player_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS g2bulk_order_status TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS callback_url TEXT DEFAULT '';

-- Indexes for fast polling lookups
CREATE INDEX IF NOT EXISTS idx_orders_api_order_id
  ON public.orders(api_order_id) WHERE api_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_api_provider
  ON public.orders(api_provider_id) WHERE api_provider_id IS NOT NULL;

-- ---------- 2) Add missing columns from migration 009 to sections -----
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS api_category_id TEXT DEFAULT '';
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS api_section_type TEXT DEFAULT '';
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS show_in_home BOOLEAN DEFAULT FALSE;
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS show_in_services BOOLEAN DEFAULT FALSE;
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS parent_section_id TEXT DEFAULT '';

-- ---------- 3) Add missing columns to sub_sections -------------------
ALTER TABLE public.sub_sections ADD COLUMN IF NOT EXISTS show_count BOOLEAN DEFAULT TRUE;
ALTER TABLE public.sub_sections ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT 'grid';

-- ---------- 4) Relax sections.type and sub_sections.type CHECK -------
ALTER TABLE public.sections
  DROP CONSTRAINT IF EXISTS sections_type_check;
ALTER TABLE public.sections
  ADD CONSTRAINT sections_type_check
  CHECK (type IN ('manual','api','wallet','games','exchange','telecom','investment','escrow'));

ALTER TABLE public.sub_sections
  DROP CONSTRAINT IF EXISTS sub_sections_type_check;
ALTER TABLE public.sub_sections
  ADD CONSTRAINT sub_sections_type_check
  CHECK (type IN ('manual','api','wallet','games','exchange','telecom','investment','escrow'));

-- ---------- 5) Update g2bulk provider with real API key --------------
UPDATE public.api_providers
SET
  api_key        = '4882984fe50f9038432b21e5fb37ecbf38a029c40a45c73f27da374ac933bd45',
  api_url        = 'https://api.g2bulk.com',
  auth_header    = 'X-API-Key',
  auth_type      = 'header',
  is_active      = TRUE,
  sync_categories = TRUE,
  sync_products   = TRUE,
  default_commission = 10,
  commission_type = 'percentage',
  description    = 'G2Bulk — مزود شحن الألعاب والمنتجات الرقمية',
  config         = COALESCE(config, '{}'::jsonb) || '{"markupPercent": 10, "supportsGames": true, "supportsProducts": true, "sync_target_section_id": "g2bulk-root", "sync_mode": "subsection"}'::jsonb,
  updated_at     = NOW()
WHERE id = 'g2bulk';

-- Idempotent insert (in case the row doesn't exist)
INSERT INTO public.api_providers(
  id, name, description, website, api_url, api_key, auth_header, auth_type,
  is_active, balance, balance_currency, default_commission, commission_type,
  sync_categories, sync_products, config, created_at, updated_at
) VALUES (
  'g2bulk', 'G2Bulk', 'G2Bulk — Game & Digital Products Top-up Provider',
  'https://g2bulk.com', 'https://api.g2bulk.com',
  '4882984fe50f9038432b21e5fb37ecbf38a029c40a45c73f27da374ac933bd45',
  'X-API-Key', 'header',
  TRUE, 0, 'USD', 10, 'percentage',
  TRUE, TRUE,
  '{"markupPercent": 10, "supportsGames": true, "supportsProducts": true, "sync_target_section_id": "g2bulk-root", "sync_mode": "subsection"}'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ---------- 6) Add instant_recharge.user_id (referenced by 015 RLS) --
ALTER TABLE public.instant_recharge
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- ---------- 7) Seed the parent G2Bulk section ------------------------
INSERT INTO public.sections(
  id, name, name_en, description, icon, color, image_url, type,
  api_provider_id, api_category_id, api_section_type,
  sort_order, is_active, is_visible,
  show_in_home, show_in_services, screen_type,
  created_at, updated_at
) VALUES (
  'g2bulk-root', 'G2Bulk', 'G2Bulk',
  'منتجات G2Bulk الرقمية وملحقات الألعاب',
  '🎮', '#8B5CF6', '', 'api',
  'g2bulk', '', 'products',
  800, TRUE, TRUE,
  TRUE, TRUE, 'api-products',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  api_provider_id = EXCLUDED.api_provider_id,
  api_section_type = EXCLUDED.api_section_type,
  show_in_home = EXCLUDED.show_in_home,
  show_in_services = EXCLUDED.show_in_services,
  updated_at = NOW();

-- Seed the games section
INSERT INTO public.sections(
  id, name, name_en, description, icon, color, image_url, type,
  api_provider_id, api_category_id, api_section_type,
  sort_order, is_active, is_visible,
  show_in_home, show_in_services, screen_type,
  created_at, updated_at
) VALUES (
  'g2bulk-games', 'الألعاب', 'Games',
  'شحن الألعاب الإلكترونية بـ ID اللاعب والتحقق التلقائي',
  '🕹️', '#10B981', '', 'api',
  'g2bulk', '', 'games',
  900, TRUE, TRUE,
  TRUE, TRUE, 'api-games',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  api_provider_id = EXCLUDED.api_provider_id,
  api_section_type = EXCLUDED.api_section_type,
  show_in_home = EXCLUDED.show_in_home,
  show_in_services = EXCLUDED.show_in_services,
  updated_at = NOW();

-- ---------- 8) Audit log entry ---------------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL,
  'migration_applied',
  'migration',
  '016_g2bulk_complete_integration',
  jsonb_build_object(
    'version', 2,
    'description', 'G2Bulk complete integration: game fields on orders, fixed section type constraints, added missing migration 009 columns, seeded G2Bulk root sections.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
-- End of migration 016 (v2)
-- =====================================================================
