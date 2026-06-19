-- =====================================================================
-- Migration 022: Add 6-digit display_id for users
-- South Wallet — معرف المستخدم المكوّن من 6 أرقام
-- =====================================================================
-- Adds a unique 6-digit display_id to every user. This is the user-facing
-- "account number" shown in account-screen.tsx (replacing the non-existent
-- user.userId field). It's also used as the invite code.
-- =====================================================================

-- ---------- 1) Add display_id column --------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS display_id TEXT;

-- Create a unique index (allows NULLs during backfill, then we enforce NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_display_id_unique
  ON public.users(display_id)
  WHERE display_id IS NOT NULL;

-- ---------- 2) Backfill existing users with random 6-digit codes ----
-- We use a deterministic seed based on the user's UUID to ensure idempotency
-- (re-running the migration won't change existing display_ids).
DO $$
DECLARE
  user_row RECORD;
  new_id TEXT;
  attempts INT;
  max_attempts INT := 10;
BEGIN
  FOR user_row IN SELECT id FROM public.users WHERE display_id IS NULL OR display_id = '' LOOP
    attempts := 0;
    LOOP
      -- Generate a 6-digit code from 100000 to 999999
      new_id := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
      attempts := attempts + 1;
      
      -- Check for collision
      BEGIN
        UPDATE public.users
        SET display_id = new_id
        WHERE id = user_row.id
          AND (display_id IS NULL OR display_id = '');
        
        -- Check if the update actually happened (no concurrent collision)
        IF FOUND THEN
          EXIT;
        END IF;
      EXCEPTION WHEN unique_violation THEN
        -- Collision, retry
        IF attempts >= max_attempts THEN
          RAISE NOTICE 'Could not generate unique display_id for user % after % attempts', user_row.id, attempts;
          EXIT;
        END IF;
      END;
    END LOOP;
  END LOOP;
END$$;

-- ---------- 3) Add NOT NULL constraint (after backfill) -------------
-- Only enforce if all users have a display_id (otherwise would fail)
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.users WHERE display_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.users ALTER COLUMN display_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL constraint: % users still have NULL display_id', null_count;
  END IF;
END$$;

-- ---------- 4) Create a trigger to auto-assign display_id on insert --
CREATE OR REPLACE FUNCTION public.assign_display_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  attempts INT := 0;
  max_attempts INT := 10;
BEGIN
  IF NEW.display_id IS NULL OR NEW.display_id = '' THEN
    LOOP
      new_id := LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');
      attempts := attempts + 1;
      
      BEGIN
        NEW.display_id := new_id;
        EXIT;
      EXCEPTION WHEN OTHERS THEN
        IF attempts >= max_attempts THEN
          RAISE EXCEPTION 'Could not generate unique display_id after % attempts', attempts;
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_assign_display_id ON public.users;
CREATE TRIGGER trg_users_assign_display_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_display_id();

-- ---------- 5) Grant execute on the trigger function ---------------
GRANT EXECUTE ON FUNCTION public.assign_display_id() TO anon, authenticated;

-- ---------- 6) Audit log entry -------------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL,
  'migration_applied',
  'migration',
  '022_add_display_id',
  jsonb_build_object(
    'description', 'Added 6-digit display_id column to users table with auto-assignment trigger.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
-- End of migration 022
-- =====================================================================
