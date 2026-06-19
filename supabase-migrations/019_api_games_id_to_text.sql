-- =====================================================================
-- Migration 019: Change api_games.id from UUID to TEXT
-- =====================================================================
-- The id column needs to accept deterministic text IDs like
-- "g2bulk-pubgm" for idempotent upserts. UUID was the wrong type.

-- Drop the UUID default first
ALTER TABLE public.api_games ALTER COLUMN id DROP DEFAULT;

-- Change the column type from UUID to TEXT
ALTER TABLE public.api_games ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Confirm the unique constraint is still valid (api_games_provider_code_key)
-- It was added in migration 017 on (api_provider_id, game_code) — that's fine.

-- =====================================================================
