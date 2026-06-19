-- =====================================================================
-- Migration 024: Image caching for games + seed investment plans
-- South Wallet
-- =====================================================================

-- ---------- 1) Add image_url_cached column to api_games -------------
ALTER TABLE public.api_games
  ADD COLUMN IF NOT EXISTS image_url_cached TEXT DEFAULT '';

ALTER TABLE public.api_products
  ADD COLUMN IF NOT EXISTS image_url_cached TEXT DEFAULT '';

ALTER TABLE public.api_categories
  ADD COLUMN IF NOT EXISTS image_url_cached TEXT DEFAULT '';

-- ---------- 2) Create the 'games' storage bucket if missing ---------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'games',
  'games',
  true,
  5242880,  -- 5 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: public read, authenticated write
DROP POLICY IF EXISTS "Public read on games bucket" ON storage.objects;
CREATE POLICY "Public read on games bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'games');

DROP POLICY IF EXISTS "Auth write on games bucket" ON storage.objects;
CREATE POLICY "Auth write on games bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'games');

DROP POLICY IF EXISTS "Auth update on games bucket" ON storage.objects;
CREATE POLICY "Auth update on games bucket"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'games');

-- ---------- 3) Seed default USDT investment plans -------------------
INSERT INTO public.investment_plans(
  name, name_en, description, min_amount, max_amount, duration_days, profit_rate, currency, is_active
) VALUES
  ('خطة المبتدئ', 'Starter Plan', 'خطة استثمار يومية بحد أدنى منخفض وعائد سريع', 10, 100, 7, 0.5, 'USDT', true),
  ('خطة النمو', 'Growth Plan', 'خطة استثمار أسبوعية بعائد مرتفع', 100, 1000, 14, 1.5, 'USDT', true),
  ('خطة المحترف', 'Pro Plan', 'خطة استثمار شهرية بأعلى عائد', 1000, 10000, 30, 3.0, 'USDT', true),
  ('خطة النخبة', 'Elite Plan', 'خطة استثمار ربع سنوية للمستثمرين الكبار', 10000, 100000, 90, 5.0, 'USDT', true),
  ('خطة VIP', 'VIP Plan', 'خطة استثمار حصرية بعائد مميز', 50000, 500000, 180, 8.0, 'USDT', true)
ON CONFLICT DO NOTHING;

-- ---------- 4) Add profit margin column to api_providers config -----
-- Already exists as default_commission; document it here.
COMMENT ON COLUMN public.api_providers.default_commission IS
  'Profit margin percentage applied to all synced products. E.g. 10 = +10% markup on cost price.';

-- ---------- 5) Audit log entry -------------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL,
  'migration_applied',
  'migration',
  '024_image_cache_and_investments',
  jsonb_build_object(
    'description', 'Added image_url_cached columns, created games storage bucket, seeded 5 default USDT investment plans.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
