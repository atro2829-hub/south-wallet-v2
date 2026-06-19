-- Migration: Fix users table unique constraints
-- Date: 2026-06-16
-- Issue: New user registrations were silently failing because `ensureUser` did not
--        set card_number or national_id, so they defaulted to '' (empty string).
--        The original UNIQUE constraints on (card_number), (national_id), (email),
--        (firebase_uid) then collided on the 2nd insert, blocking all new user
--        creation in Supabase.
-- Fix:   Drop the old UNIQUE constraints and recreate them as PARTIAL unique
--        indexes that only enforce uniqueness when the value is non-NULL and
--        non-empty. This allows multiple users to have NULL/empty card_number
--        until they are issued one, while still preventing real duplicates.

BEGIN;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_card_number_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_national_id_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_firebase_uid_key;

UPDATE public.users SET card_number = NULL WHERE card_number = '';
UPDATE public.users SET national_id = NULL WHERE national_id = '';

CREATE UNIQUE INDEX IF NOT EXISTS users_card_number_unique_idx
  ON public.users (card_number) WHERE card_number IS NOT NULL AND card_number <> '';

CREATE UNIQUE INDEX IF NOT EXISTS users_national_id_unique_idx
  ON public.users (national_id) WHERE national_id IS NOT NULL AND national_id <> '';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON public.users (email) WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS users_firebase_uid_unique_idx
  ON public.users (firebase_uid) WHERE firebase_uid IS NOT NULL AND firebase_uid <> '';

COMMIT;
