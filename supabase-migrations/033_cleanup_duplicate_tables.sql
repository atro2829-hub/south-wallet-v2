-- =====================================================================
-- Migration 033: Clean Up Duplicate & Obsolete Data
-- South Wallet — تنظيف قواعد البيانات المكررة
-- Safe version — uses actual schema
-- =====================================================================

-- ── 1) Drop obsolete tables (no longer referenced in app code) ──
DROP TABLE IF EXISTS public.firebase_sync_queue CASCADE;
DROP TABLE IF EXISTS public.api_game_sync_log CASCADE;
DROP TABLE IF EXISTS public.legacy_products CASCADE;
DROP TABLE IF EXISTS public._temp_migration CASCADE;
DROP TABLE IF EXISTS public.migration_temp CASCADE;

-- ── 2) Drop duplicate indexes that were superseded ──
DROP INDEX IF EXISTS public.idx_users_display_id_unique;
DROP INDEX IF EXISTS public.idx_orders_created;
DROP INDEX IF EXISTS public.idx_transactions_old;

-- ── 3) Remove deprecated firebase columns from users ──
ALTER TABLE public.users
  DROP COLUMN IF EXISTS firebase_uid CASCADE,
  DROP COLUMN IF EXISTS fcm_token_legacy CASCADE,
  DROP COLUMN IF EXISTS firebase_sync_at CASCADE;

-- ── 4) Remove deprecated firebase columns from orders ──
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS firebase_ref CASCADE;

-- ── 5) Remove deprecated firebase columns from transactions ──
ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS firebase_ref CASCADE;

-- ── 6) Clean up duplicate api_providers entries by name (keep latest) ──
DELETE FROM public.api_providers a
USING public.api_providers b
WHERE a.created_at < b.created_at
  AND a.name = b.name;

-- ── 7) Clean up duplicate categories by slug (keep latest) ──
DELETE FROM public.categories a
USING public.categories b
WHERE a.updated_at < b.updated_at
  AND a.slug = b.slug
  AND a.slug IS NOT NULL
  AND a.slug != '';

-- ── 8) Clean up expired promo codes (> 90 days ago) ──
DELETE FROM public.gift_codes
WHERE expires_at IS NOT NULL
  AND expires_at < NOW() - INTERVAL '90 days'
  AND status = 'expired';

-- ── 9) Clean up old audit logs (keep 6 months) ──
DELETE FROM public.audit_logs
WHERE created_at < NOW() - INTERVAL '180 days';

-- ── 10) Add updated_at auto-triggers for new tables ──
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN VALUES ('departments'),('admin_users'),('admin_permissions'),('categories')
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
         CREATE TRIGGER trg_%1$s_updated_at
           BEFORE UPDATE ON public.%1$s
           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
        tbl
      );
    END IF;
  END LOOP;
END$$;

-- ── 11) Analyze key tables ──
ANALYZE public.users;
ANALYZE public.orders;
ANALYZE public.transactions;
ANALYZE public.categories;
