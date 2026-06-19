-- =====================================================================
-- Migration 018: Fix GRANTs + add missing api_categories columns
-- =====================================================================

-- ---------- 1) Add missing columns to api_categories (from migration 009) --
ALTER TABLE public.api_categories
  ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS game_code TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_name_ar TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS section_id TEXT DEFAULT '';

-- ---------- 2) Add missing columns to api_products (from migration 010) --
ALTER TABLE public.api_products
  ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS is_synced BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_id TEXT,
  ADD COLUMN IF NOT EXISTS package_id TEXT;

-- Unique constraint on api_products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_products_provider_product_key'
  ) THEN
    ALTER TABLE public.api_products
      ADD CONSTRAINT api_products_provider_product_key
      UNIQUE (api_provider_id, api_product_id);
  END IF;
END$$;

-- ---------- 3) Add missing columns to service_providers (from migration 009) --
ALTER TABLE public.service_providers
  ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS min_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_time TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sub_section_id TEXT;

-- ---------- 4) Add missing columns to product_packages (from migration 009) --
ALTER TABLE public.product_packages
  ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS validity_days INTEGER,
  ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS api_category_id TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_amount TEXT,
  ADD COLUMN IF NOT EXISTS pin_code_required BOOLEAN DEFAULT FALSE;

-- ---------- 5) GRANT privileges to anon and authenticated roles -------
-- The RLS policies allow public read/write, but Postgres also requires
-- table-level GRANTs to the connecting role.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'sections','sub_sections','service_providers','product_packages',
      'api_categories','api_products','api_games','api_game_catalogues',
      'api_providers','api_balance_log','api_provider_endpoints',
      'orders','transactions','deposit_requests','withdraw_requests',
      'banners','promo_codes','gift_codes','bulk_codes','user_gift_codes',
      'kyc_documents','notifications','employees','employee_sections',
      'provider_sections','exchange_rates','wallet_addresses','wallet_services',
      'offices','banks','card_colors','branding','social_links','legal_content',
      'feature_flags','kill_switch','maintenance','visibility','bottom_nav',
      'support_tickets','support_messages','support_livechat','livechat_messages',
      'direct_chats','direct_chat_messages','escrow_chats','escrow_chat_messages',
      'escrow_transactions','investment_plans','investments','savings_goals',
      'instant_recharge','currency_cards','commission_log','activity_log',
      'admin_notifications','backup_log','app_config','limits','user_reviews',
      'users'
    ])
  LOOP
    BEGIN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon;', tbl);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;

-- Also grant USAGE on sequences (for SERIAL/IDENTITY columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ---------- 6) Refresh PostgREST schema cache ------------------------
-- PostgREST caches the schema; new columns won't be visible until reload.
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- End of migration 018
-- =====================================================================
