-- =====================================================================
-- Migration 021: Create missing api_game_catalogues table
-- =====================================================================
-- This table was supposed to be created in migration 009 but wasn't applied.
-- It caches game catalogue (top-up packages) from G2Bulk /v1/games/{game}/catalogue.

CREATE TABLE IF NOT EXISTS public.api_game_catalogues (
  id TEXT PRIMARY KEY,
  api_provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  game_code TEXT NOT NULL,
  catalogue_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  image_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (api_provider_id, game_code, catalogue_id)
);

-- RLS
ALTER TABLE public.api_game_catalogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read on api_game_catalogues"
  ON public.api_game_catalogues FOR SELECT USING (true);
CREATE POLICY "Admin full access on api_game_catalogues"
  ON public.api_game_catalogues FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_game_catalogues TO anon, authenticated;

-- Index for fast lookups by game
CREATE INDEX IF NOT EXISTS idx_api_game_catalogues_game
  ON public.api_game_catalogues(api_provider_id, game_code)
  WHERE is_active = TRUE;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
