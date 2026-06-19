-- =====================================================================
-- Migration 017: Critical RLS & api_games schema fixes
-- South Wallet — fixes infinite recursion + adds missing api_games columns
-- =====================================================================

-- ---------- 1) Add missing columns to api_games (from migration 009) --
ALTER TABLE public.api_games
  ADD COLUMN IF NOT EXISTS game_code TEXT,
  ADD COLUMN IF NOT EXISTS name_ar TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS servers JSONB DEFAULT '{}'::jsonb;

-- Backfill game_code from code (if game_code is empty)
UPDATE public.api_games
SET game_code = code
WHERE (game_code IS NULL OR game_code = '') AND code IS NOT NULL AND code != '';

-- Backfill name_ar from name (if name_ar is empty)
UPDATE public.api_games
SET name_ar = name
WHERE (name_ar IS NULL OR name_ar = '') AND name IS NOT NULL;

-- Backfill banner_url from image_url
UPDATE public.api_games
SET banner_url = image_url
WHERE (banner_url IS NULL OR banner_url = '') AND image_url IS NOT NULL AND image_url != '';

-- Add unique constraint on (api_provider_id, game_code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'api_games_provider_code_key'
  ) THEN
    ALTER TABLE public.api_games
      ADD CONSTRAINT api_games_provider_code_key
      UNIQUE (api_provider_id, game_code);
  END IF;
END$$;

-- ---------- 2) Create a SECURITY DEFINER function to check admin role --
-- This avoids the infinite recursion in RLS policies that currently do:
--   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (...))
-- by reading the user's role in a SECURITY DEFINER context (bypasses RLS).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'super_admin')
  );
$$;

-- Also a helper to check the current user's role as text
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'anonymous'
  );
$$;

-- ---------- 3) Drop the recursive "Admin full access on users" policy --
DROP POLICY IF EXISTS "Admin full access on users" ON public.users;
DROP POLICY IF EXISTS "Users read own" ON public.users;
DROP POLICY IF EXISTS "Users update own" ON public.users;
DROP POLICY IF EXISTS "Users view own" ON public.users;

-- Recreate using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Admin full access on users"
  ON public.users FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users read own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------- 4) Fix the same recursion on other tables ---------------
-- sections, sub_sections, service_providers, product_packages, api_categories,
-- api_products, api_games, api_game_catalogues, api_providers, orders,
-- transactions, etc. — all had the recursive pattern.

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
      'admin_notifications','backup_log','app_config','limits','user_reviews'
    ])
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Admin full access on %I" ON public.%I;', tbl, tbl);
      EXECUTE format(
        'CREATE POLICY "Admin full access on %I" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());',
        tbl, tbl
      );
    EXCEPTION WHEN OTHERS THEN
      -- table doesn't exist or other error — skip
      NULL;
    END;
  END LOOP;
END$$;

-- ---------- 5) Ensure public read on catalog tables (already exists but idempotent) --
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'sections','sub_sections','service_providers','product_packages',
      'api_categories','api_products','api_games','api_game_catalogues',
      'api_providers','banners','promo_codes','exchange_rates',
      'wallet_addresses','wallet_services','offices','banks','card_colors',
      'branding','social_links','legal_content','bottom_nav'
    ])
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY IF NOT EXISTS "Public read on %I" ON public.%I FOR SELECT USING (true);',
        tbl, tbl
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;

-- ---------- 6) Grant execute on the helper functions -----------------
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;

-- =====================================================================
-- End of migration 017
-- =====================================================================
