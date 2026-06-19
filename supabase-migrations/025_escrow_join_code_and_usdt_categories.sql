-- =====================================================================
-- Migration 025: New escrow flow with join_code + 3-party chat
-- South Wallet — قسم الوسيط الجديد
-- =====================================================================
-- New flow:
--   1. User creates escrow ticket → gets a 6-char join code
--   2. User shares code with the other party (buyer or seller)
--   3. Other party enters code in the app → joins the escrow
--   4. Both parties + admin enter a 3-party group chat
--   5. Admin can close the deal (release funds to seller OR refund buyer)
-- =====================================================================

-- ---------- 1) Add join_code + new columns to escrow_transactions ----
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS join_code_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS item_description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS fee NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS buyer_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS seller_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS buyer_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_funded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_id UUID,
  ADD COLUMN IF NOT EXISTS admin_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Make seller_id nullable (creator may start an escrow without knowing
-- the other party — they'll join via the code)
ALTER TABLE public.escrow_transactions ALTER COLUMN seller_id DROP NOT NULL;

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_escrow_join_code ON public.escrow_transactions(join_code) WHERE join_code IS NOT NULL;

-- ---------- 2) Add escrow_categories table for admin-managed categories --
CREATE TABLE IF NOT EXISTS public.escrow_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  fee_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for escrow_categories
ALTER TABLE public.escrow_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on escrow_categories"
  ON public.escrow_categories FOR SELECT USING (true);
CREATE POLICY "Admin full access on escrow_categories"
  ON public.escrow_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escrow_categories TO anon, authenticated;

-- Seed default escrow categories
INSERT INTO public.escrow_categories(id, name, name_en, description, icon, fee_percent, is_active, sort_order) VALUES
  ('digital-products', 'منتجات رقمية', 'Digital Products', 'حسابات، أكواد، بطاقات رقمية', '🎮', 2.0, true, 1),
  ('game-accounts', 'حسابات ألعاب', 'Game Accounts', 'بيع وشراء حسابات الألعاب', '🕹️', 3.0, true, 2),
  ('crypto', 'عملات رقمية', 'Cryptocurrency', 'بيع وشراء USDT، BTC، إلخ', '₿', 1.0, true, 3),
  ('physical-goods', 'منتجات مادية', 'Physical Goods', 'بيع وشراء المنتجات المادية', '📦', 2.5, true, 4),
  ('services', 'خدمات', 'Services', 'خدمات رقمية أو مادية', '🛠️', 5.0, true, 5),
  ('gift-cards', 'بطاقات هدايا', 'Gift Cards', 'بطاقات iTunes, Google Play, Amazon', '🎁', 2.0, true, 6),
  ('other', 'أخرى', 'Other', 'معاملات أخرى', '📋', 3.0, true, 99)
ON CONFLICT (id) DO NOTHING;

-- ---------- 3) Add tx_hash column to orders (for USDT) ----------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tx_hash TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS network TEXT DEFAULT '';

-- ---------- 4) Add usdt_categories table (manual order categories) ----
CREATE TABLE IF NOT EXISTS public.usdt_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT DEFAULT '',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  type TEXT DEFAULT 'buy',  -- 'buy' | 'sell' | 'exchange'
  min_amount NUMERIC(15,2) DEFAULT 0,
  max_amount NUMERIC(15,2) DEFAULT 0,
  fee_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for usdt_categories
ALTER TABLE public.usdt_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on usdt_categories"
  ON public.usdt_categories FOR SELECT USING (true);
CREATE POLICY "Admin full access on usdt_categories"
  ON public.usdt_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usdt_categories TO anon, authenticated;

-- Seed default USDT categories
INSERT INTO public.usdt_categories(id, name, name_en, description, icon, type, min_amount, max_amount, fee_percent, is_active, sort_order) VALUES
  ('buy-usdt-trc20', 'شراء USDT - TRC20', 'Buy USDT - TRC20', 'شراء USDT على شبكة TRON (رسوم منخفضة)', '💵', 'buy', 10, 100000, 1.0, true, 1),
  ('buy-usdt-erc20', 'شراء USDT - ERC20', 'Buy USDT - ERC20', 'شراء USDT على شبكة Ethereum', '💵', 'buy', 10, 100000, 1.5, true, 2),
  ('sell-usdt-trc20', 'بيع USDT - TRC20', 'Sell USDT - TRC20', 'بيع USDT على شبكة TRON', '💸', 'sell', 10, 100000, 0.5, true, 3),
  ('sell-usdt-erc20', 'بيع USDT - ERC20', 'Sell USDT - ERC20', 'بيع USDT على شبكة Ethereum', '💸', 'sell', 10, 100000, 1.0, true, 4),
  ('exchange-usdt-yer', 'تحويل USDT ↔ ر.ي', 'USDT ↔ YER Exchange', 'تحويل بين USDT والريال اليمني', '💱', 'exchange', 10, 10000, 2.0, true, 5),
  ('exchange-usdt-sar', 'تحويل USDT ↔ ر.س', 'USDT ↔ SAR Exchange', 'تحويل بين USDT والريال السعودي', '💱', 'exchange', 10, 50000, 1.5, true, 6)
ON CONFLICT (id) DO NOTHING;

-- ---------- 5) Audit log entry -------------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL,
  'migration_applied',
  'migration',
  '025_escrow_join_code_and_usdt_categories',
  jsonb_build_object(
    'description', 'New escrow flow with join_code, escrow_categories table, usdt_categories table, tx_hash column on orders.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
