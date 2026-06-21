-- Migration 034: Recreate sections and sub_sections tables
-- Run this in Supabase SQL Editor to restore the sections table
-- that was dropped in migration 033.

-- ════════════════════════════════════════════════════════════════
--  1. Create sections table
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sections (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL DEFAULT '',
  name_en      TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  icon         TEXT NOT NULL DEFAULT '',
  color        TEXT NOT NULL DEFAULT '#5C1A1B',
  image_url    TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible   BOOLEAN NOT NULL DEFAULT TRUE,
  type         TEXT NOT NULL DEFAULT 'manual'
               CHECK (type IN ('manual','api','wallet','exchange','escrow','telecom','games','investment','link')),
  screen_type  TEXT NOT NULL DEFAULT '',
  api_provider_id TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active sections
CREATE POLICY IF NOT EXISTS "sections_read_public"
  ON public.sections FOR SELECT USING (is_active = TRUE);

-- Allow service_role full access (admin operations)
CREATE POLICY IF NOT EXISTS "sections_admin_all"
  ON public.sections FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ════════════════════════════════════════════════════════════════
--  2. Seed initial sections (matching STATIC_SECTIONS in code)
-- ════════════════════════════════════════════════════════════════
INSERT INTO public.sections (id, name, name_en, icon, color, sort_order, type, screen_type)
VALUES
  ('transfer',    'تحويل الاموال',   'transfer',    'transfer',   '#5C1A1B', 0,  'manual',     'wallet-transfer'),
  ('deposit',     'إيداع',           'deposit',     'deposit',    '#5C1A1B', 1,  'manual',     'deposit'),
  ('support',     'الدعم',           'support',     'support',    '#5C1A1B', 2,  'manual',     'support'),
  ('recharge',    'شحن رصيد',        'recharge',    'recharge',   '#5C1A1B', 3,  'manual',     'recharge'),
  ('games',       'الألعاب',         'games',       'games',      '#5C1A1B', 4,  'games',      'games'),
  ('gift-cards',  'بطاقات وأكواد',   'gift-cards',  'gift-cards', '#5C1A1B', 5,  'manual',     'gift-cards'),
  ('favorites',   'المفضلة',         'favorites',   'favorites',  '#5C1A1B', 6,  'manual',     'favorites'),
  ('usdt',        'USDT',            'usdt',        'usdt',       '#5C1A1B', 7,  'manual',     'deposit'),
  ('escrow',      'وسيط وضمان',      'escrow',      'escrow',     '#5C1A1B', 8,  'escrow',     'escrow'),
  ('investment',  'استثمار',         'investment',  'investment', '#5C1A1B', 9,  'investment', 'investment'),
  ('exchange',    'صرافة',           'exchange',    'exchange',   '#5C1A1B', 10, 'exchange',   'exchange')
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
--  3. Create sub_sections table (also dropped in migration 033)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.sub_sections (
  id              TEXT NOT NULL,
  section_id      TEXT NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT '',
  name_en         TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  icon            TEXT NOT NULL DEFAULT '',
  color           TEXT NOT NULL DEFAULT '#5C1A1B',
  image_url       TEXT NOT NULL DEFAULT '',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  type            TEXT NOT NULL DEFAULT 'manual',
  api_category_id TEXT NOT NULL DEFAULT '',
  api_provider_id TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, section_id)
);

ALTER TABLE public.sub_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "sub_sections_read_public"
  ON public.sub_sections FOR SELECT USING (is_active = TRUE);

CREATE POLICY IF NOT EXISTS "sub_sections_admin_all"
  ON public.sub_sections FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Done
RAISE NOTICE 'Migration 034: sections and sub_sections tables recreated successfully.';
