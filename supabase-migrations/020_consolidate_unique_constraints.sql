-- =====================================================================
-- Migration 020: Consolidate api_categories unique constraints
-- =====================================================================
-- The table has multiple unique indexes/constraints on the same columns
-- which confuses PostgREST's On Conflict resolution. Consolidate to one.

-- Drop all existing unique indexes/constraints on (api_provider_id, api_category_id)
DROP INDEX IF EXISTS public.idx_api_categories_provider_cat;
ALTER TABLE public.api_categories DROP CONSTRAINT IF EXISTS api_categories_provider_cat_key;
ALTER TABLE public.api_categories DROP CONSTRAINT IF EXISTS api_categories_api_provider_id_api_category_id_key;

-- Create a single clean unique constraint
ALTER TABLE public.api_categories
  ADD CONSTRAINT api_categories_provider_cat_key
  UNIQUE (api_provider_id, api_category_id);

-- Same for api_products
DROP INDEX IF EXISTS public.idx_api_products_provider_prod;
ALTER TABLE public.api_products DROP CONSTRAINT IF EXISTS api_products_provider_product_key;
ALTER TABLE public.api_products DROP CONSTRAINT IF EXISTS api_products_api_provider_id_api_product_id_key;
ALTER TABLE public.api_products
  ADD CONSTRAINT api_products_provider_product_key
  UNIQUE (api_provider_id, api_product_id);

-- Same for api_game_catalogues
DROP INDEX IF EXISTS public.idx_api_game_catalogues_prov_game_cat;
ALTER TABLE public.api_game_catalogues DROP CONSTRAINT IF EXISTS api_game_catalogues_provider_game_cat_key;
ALTER TABLE public.api_game_catalogues DROP CONSTRAINT IF EXISTS api_game_catalogues_api_provider_id_game_code_catalogue_id_key;
ALTER TABLE public.api_game_catalogues
  ADD CONSTRAINT api_game_catalogues_provider_game_cat_key
  UNIQUE (api_provider_id, game_code, catalogue_id);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
