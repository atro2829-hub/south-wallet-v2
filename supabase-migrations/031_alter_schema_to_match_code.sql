-- =====================================================================
-- Migration 031: ALTER schema to match existing source code
-- South Wallet — تعديل المخطط ليتطابق مع الكود المصدري
-- =====================================================================
-- Instead of modifying 100+ code files, we ALTER the database to add
-- all missing columns and relax ENUM constraints so the code works.
-- =====================================================================

-- ─── 1. USERS — add missing columns + relax ENUMs ───────────────────

-- Change role from ENUM to TEXT (code uses 'owner' which isn't in ENUM)
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role TYPE TEXT USING role::text;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';

-- Change kyc_status from ENUM to TEXT (code uses 'submitted' and 'pending')
ALTER TABLE users ALTER COLUMN kyc_status DROP DEFAULT;
ALTER TABLE users ALTER COLUMN kyc_status TYPE TEXT USING kyc_status::text;
ALTER TABLE users ALTER COLUMN kyc_status SET DEFAULT 'pending';

-- Add columns the code references
ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS second_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS third_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS card_number TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS card_issued_at TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS governorate TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ar';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_front_url TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_back_url TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_selfie_url TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_verified_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_rejection_reason TEXT DEFAULT '';

-- ─── 2. TRANSACTIONS — add missing columns + relax ENUMs ────────────

-- Change type from ENUM to TEXT
ALTER TABLE transactions ALTER COLUMN type DROP DEFAULT;
ALTER TABLE transactions ALTER COLUMN type TYPE TEXT USING type::text;
ALTER TABLE transactions ALTER COLUMN type SET DEFAULT 'order';

-- Change direction from ENUM to TEXT
ALTER TABLE transactions ALTER COLUMN direction DROP DEFAULT;
ALTER TABLE transactions ALTER COLUMN direction TYPE TEXT USING direction::text;
ALTER TABLE transactions ALTER COLUMN direction SET DEFAULT 'credit';

-- Change status from ENUM to TEXT (code uses 'processing','cancelled','refunded')
ALTER TABLE transactions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE transactions ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE transactions ALTER COLUMN status SET DEFAULT 'pending';

-- Change currency from ENUM to TEXT
ALTER TABLE transactions ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE transactions ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'YER';

-- Add columns the code references
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee NUMERIC(18,4) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fee_currency TEXT DEFAULT 'YER';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_phone TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_name TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_phone TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receiver_card_number TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS api_provider_id TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS api_order_id TEXT DEFAULT '';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make reference_num nullable (code uses reference_number instead)
ALTER TABLE transactions ALTER COLUMN reference_num DROP NOT NULL;

-- ─── 3. ORDERS — add missing columns + relax ENUMs ──────────────────

-- Change status from ENUM to TEXT
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

-- Change execution_type from ENUM to TEXT (code uses 'api')
ALTER TABLE orders ALTER COLUMN execution_type DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN execution_type TYPE TEXT USING execution_type::text;
ALTER TABLE orders ALTER COLUMN execution_type SET DEFAULT 'manual';

-- Change currency from ENUM to TEXT
ALTER TABLE orders ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE orders ALTER COLUMN currency SET DEFAULT 'USD';

-- Add columns the code references
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_id TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS category_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_input TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_currency TEXT DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(18,4) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_provider_id TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS api_product_id TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS result_code TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS result_message TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS result_pin_code TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS result_serial TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_by UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS game_code TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS player_id_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS player_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS g2bulk_order_status TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS callback_url TEXT DEFAULT '';

-- Make product_code nullable (code uses package_id)
ALTER TABLE orders ALTER COLUMN product_code DROP NOT NULL;

-- ─── 4. DEPOSIT_REQUESTS — add missing columns + relax ENUMs ────────

-- Change method from ENUM to TEXT
ALTER TABLE deposit_requests ALTER COLUMN method DROP DEFAULT;
ALTER TABLE deposit_requests ALTER COLUMN method TYPE TEXT USING method::text;
ALTER TABLE deposit_requests ALTER COLUMN method SET DEFAULT 'bank_transfer';

-- Change currency from ENUM to TEXT
ALTER TABLE deposit_requests ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE deposit_requests ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE deposit_requests ALTER COLUMN currency SET DEFAULT 'YER';

-- Change status from ENUM to TEXT
ALTER TABLE deposit_requests ALTER COLUMN status DROP DEFAULT;
ALTER TABLE deposit_requests ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE deposit_requests ALTER COLUMN status SET DEFAULT 'pending';

-- Add columns the code references
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS bank_account TEXT DEFAULT '';
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS transfer_receipt_url TEXT DEFAULT '';
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS crypto_wallet_address TEXT DEFAULT '';
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS crypto_tx_hash TEXT DEFAULT '';
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';

-- ─── 5. WITHDRAW_REQUESTS — add missing columns + relax ENUMs ───────

-- Change method from ENUM to TEXT
ALTER TABLE withdraw_requests ALTER COLUMN method DROP DEFAULT;
ALTER TABLE withdraw_requests ALTER COLUMN method TYPE TEXT USING method::text;
ALTER TABLE withdraw_requests ALTER COLUMN method SET DEFAULT 'bank_transfer';

-- Change currency from ENUM to TEXT
ALTER TABLE withdraw_requests ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE withdraw_requests ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE withdraw_requests ALTER COLUMN currency SET DEFAULT 'YER';

-- Change status from ENUM to TEXT
ALTER TABLE withdraw_requests ALTER COLUMN status DROP DEFAULT;
ALTER TABLE withdraw_requests ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE withdraw_requests ALTER COLUMN status SET DEFAULT 'pending';

-- Add columns the code references
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS bank_account TEXT DEFAULT '';
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS bank_iban TEXT DEFAULT '';
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS crypto_wallet_address TEXT DEFAULT '';
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT '';
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT '';
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ─── 6. KYC_DOCUMENTS — add alias columns ───────────────────────────

ALTER TABLE kyc_documents ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT '';
ALTER TABLE kyc_documents ADD COLUMN IF NOT EXISTS document_url TEXT DEFAULT '';

-- ─── 7. CATEGORIES — add columns the code references ────────────────

-- Change category_type from ENUM to TEXT
ALTER TABLE categories ALTER COLUMN category_type DROP DEFAULT;
ALTER TABLE categories ALTER COLUMN category_type TYPE TEXT USING category_type::text;
ALTER TABLE categories ALTER COLUMN category_type SET DEFAULT 'service';

ALTER TABLE categories ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#5C1A1B';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'manual';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS screen_type TEXT DEFAULT 'manual';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS api_section_type TEXT DEFAULT '';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_in_home BOOLEAN DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS show_in_services BOOLEAN DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_section_id TEXT DEFAULT '';

-- Update name column = name_ar for existing rows
UPDATE categories SET name = name_ar WHERE name = '' AND name_ar IS NOT NULL;
UPDATE categories SET icon = icon_emoji WHERE icon = '' AND icon_emoji IS NOT NULL;
UPDATE categories SET color = color_hex WHERE color = '#5C1A1B' AND color_hex IS NOT NULL;
UPDATE categories SET type = category_type WHERE type = 'manual';

-- ─── 8. SUPPORT_TICKETS — relax ENUMs ───────────────────────────────

ALTER TABLE support_tickets ALTER COLUMN category DROP DEFAULT;
ALTER TABLE support_tickets ALTER COLUMN category TYPE TEXT USING category::text;
ALTER TABLE support_tickets ALTER COLUMN category SET DEFAULT 'general';

ALTER TABLE support_tickets ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE support_tickets ALTER COLUMN priority TYPE TEXT USING priority::text;
ALTER TABLE support_tickets ALTER COLUMN priority SET DEFAULT 'normal';

ALTER TABLE support_tickets ALTER COLUMN status DROP DEFAULT;
ALTER TABLE support_tickets ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE support_tickets ALTER COLUMN status SET DEFAULT 'open';

-- ─── 9. SUPPORT_MESSAGES — add missing columns ──────────────────────

ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT '';
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS sender_role TEXT DEFAULT '';
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- ─── 10. LIVE_CHATS — relax status ─────────────────────────────────

ALTER TABLE live_chats ALTER COLUMN status DROP DEFAULT;
ALTER TABLE live_chats ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE live_chats ALTER COLUMN status SET DEFAULT 'waiting';

-- ─── 11. LIVE_CHAT_MESSAGES — relax sender_type ─────────────────────

ALTER TABLE live_chat_messages ALTER COLUMN sender_type DROP DEFAULT;
ALTER TABLE live_chat_messages ALTER COLUMN sender_type TYPE TEXT USING sender_type::text;
ALTER TABLE live_chat_messages ALTER COLUMN sender_type SET DEFAULT 'user';

ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- ─── 12. ESCROW_TRANSACTIONS — relax ENUM + add columns ─────────────

ALTER TABLE escrow_transactions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE escrow_transactions ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE escrow_transactions ALTER COLUMN status SET DEFAULT 'waiting';

ALTER TABLE escrow_transactions ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE escrow_transactions ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE escrow_transactions ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS buyer_name TEXT DEFAULT '';
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS seller_name TEXT DEFAULT '';
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS buyer_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS seller_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS reference_code TEXT DEFAULT '';
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS funded_at TIMESTAMPTZ;
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS item_description TEXT DEFAULT '';
ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS join_code_expires_at TIMESTAMPTZ;

-- ─── 13. INVESTMENTS — relax ENUM + add columns ─────────────────────

ALTER TABLE investments ALTER COLUMN status DROP DEFAULT;
ALTER TABLE investments ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE investments ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE investments ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE investments ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE investments ALTER COLUMN currency SET DEFAULT 'USD';

ALTER TABLE investments ADD COLUMN IF NOT EXISTS plan_name TEXT DEFAULT '';
ALTER TABLE investments ADD COLUMN IF NOT EXISTS daily_return NUMERIC(18,4) DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS total_return NUMERIC(18,4) DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS earned_return NUMERIC(18,4) DEFAULT 0;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS cancel_reason TEXT DEFAULT '';

-- ─── 14. INVESTMENT_PLANS — relax ENUM ──────────────────────────────

ALTER TABLE investment_plans ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE investment_plans ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE investment_plans ALTER COLUMN currency SET DEFAULT 'USD';

-- ─── 15. GIFT_CODES — relax ENUM ────────────────────────────────────

ALTER TABLE gift_codes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE gift_codes ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE gift_codes ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE gift_codes ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE gift_codes ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE gift_codes ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS visible_to_users BOOLEAN DEFAULT TRUE;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS redeemed_by UUID;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

-- ─── 16. NOTIFICATIONS — relax ENUM + add columns ───────────────────

ALTER TABLE notifications ALTER COLUMN type DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN type TYPE TEXT USING type::text;
ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'system';

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS navigation_target TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS navigation_params JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;

-- ─── 17. BANKS — add columns ────────────────────────────────────────

ALTER TABLE banks ALTER COLUMN currency DROP DEFAULT;
ALTER TABLE banks ALTER COLUMN currency TYPE TEXT USING currency::text;
ALTER TABLE banks ALTER COLUMN currency SET DEFAULT 'YER';

ALTER TABLE banks ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT '';
ALTER TABLE banks ADD COLUMN IF NOT EXISTS icon_url TEXT DEFAULT '';
ALTER TABLE banks ADD COLUMN IF NOT EXISTS bank_label TEXT DEFAULT '';
ALTER TABLE banks ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#5C1A1B';
ALTER TABLE banks ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- ─── 18. API_PROVIDERS — add columns ────────────────────────────────

ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS auth_header TEXT DEFAULT 'X-API-Key';
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'header';
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS balance NUMERIC(18,4) DEFAULT 0;
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS balance_currency TEXT DEFAULT 'USD';
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS last_balance_check TIMESTAMPTZ;
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS sync_categories BOOLEAN DEFAULT TRUE;
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS sync_products BOOLEAN DEFAULT TRUE;
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE api_providers ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';

-- ─── 19. BANNERS — relax constraints ────────────────────────────────

ALTER TABLE banners ALTER COLUMN position DROP DEFAULT;
ALTER TABLE banners ALTER COLUMN position TYPE TEXT USING position::text;
ALTER TABLE banners ALTER COLUMN position SET DEFAULT 'home';

ALTER TABLE banners ALTER COLUMN link_type DROP DEFAULT;
ALTER TABLE banners ALTER COLUMN link_type TYPE TEXT USING link_type::text;
ALTER TABLE banners ALTER COLUMN link_type SET DEFAULT 'none';

-- ─── 20. WALLET_ADDRESSES — relax ───────────────────────────────────

ALTER TABLE wallet_addresses ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE wallet_addresses ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE wallet_addresses ADD COLUMN IF NOT EXISTS min_deposit NUMERIC(18,4) DEFAULT 10;

-- ─── 21. EXCHANGE_RATES — add columns ───────────────────────────────

ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS sar_to_yer NUMERIC(18,4) DEFAULT 141;
ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS yer_to_sar NUMERIC(18,6) DEFAULT 0.007;

-- ─── 22. ESCROW_MESSAGES — add columns ──────────────────────────────

-- Create escrow_chat_messages as alias if escrow_messages exists
-- (code may reference either name)

-- ─── 23. Re-grant ALL privileges (idempotent) ───────────────────────

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;

-- ─── 24. Refresh PostgREST schema cache ─────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ─── 25. Audit log ──────────────────────────────────────────────────

INSERT INTO audit_logs (actor_type, action, entity_type, description)
VALUES ('system', 'schema_altered', 'database', 'Migration 031: ALTERed all tables to match source code. Added missing columns, relaxed ENUMs to TEXT.');

-- =====================================================================
