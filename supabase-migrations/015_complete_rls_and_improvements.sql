-- =====================================================
-- South Wallet - Migration 015: Complete Database (FINAL)
-- تطبيق هذا الملف في Supabase Dashboard > SQL Editor
-- =====================================================

-- Support tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS body TEXT DEFAULT '';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS satisfaction INTEGER DEFAULT NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_own" ON public.support_tickets;
CREATE POLICY "tickets_select_own" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_insert_own" ON public.support_tickets;
CREATE POLICY "tickets_insert_own" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tickets_update_own" ON public.support_tickets;
CREATE POLICY "tickets_update_own" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role_all_tickets" ON public.support_tickets;
CREATE POLICY "service_role_all_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "msgs_select_own" ON public.support_messages;
CREATE POLICY "msgs_select_own" ON public.support_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
);
DROP POLICY IF EXISTS "service_role_all_msgs" ON public.support_messages;
CREATE POLICY "service_role_all_msgs" ON public.support_messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.support_livechat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_livechat" ON public.support_livechat;
CREATE POLICY "service_role_all_livechat" ON public.support_livechat FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.livechat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_lcm" ON public.livechat_messages;
CREATE POLICY "service_role_all_lcm" ON public.livechat_messages FOR ALL USING (true) WITH CHECK (true);

-- Direct chats
ALTER TABLE public.direct_chats ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.direct_chats ADD COLUMN IF NOT EXISTS unread_count1 INTEGER DEFAULT 0;
ALTER TABLE public.direct_chats ADD COLUMN IF NOT EXISTS unread_count2 INTEGER DEFAULT 0;
ALTER TABLE public.direct_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "direct_chats_select_own" ON public.direct_chats;
CREATE POLICY "direct_chats_select_own" ON public.direct_chats FOR SELECT TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
DROP POLICY IF EXISTS "service_role_all_direct_chats" ON public.direct_chats;
CREATE POLICY "service_role_all_direct_chats" ON public.direct_chats FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.direct_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_dcm" ON public.direct_chat_messages;
CREATE POLICY "service_role_all_dcm" ON public.direct_chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Escrow chats
ALTER TABLE public.escrow_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "escrow_chats_select" ON public.escrow_chats;
CREATE POLICY "escrow_chats_select" ON public.escrow_chats FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
DROP POLICY IF EXISTS "service_role_all_escrow_chats" ON public.escrow_chats;
CREATE POLICY "service_role_all_escrow_chats" ON public.escrow_chats FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.escrow_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_ecm" ON public.escrow_chat_messages;
CREATE POLICY "service_role_all_ecm" ON public.escrow_chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Escrow transactions
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.escrow_transactions ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "escrow_select_parties" ON public.escrow_transactions;
CREATE POLICY "escrow_select_parties" ON public.escrow_transactions FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
DROP POLICY IF EXISTS "service_role_all_escrow" ON public.escrow_transactions;
CREATE POLICY "service_role_all_escrow" ON public.escrow_transactions FOR ALL USING (true) WITH CHECK (true);

-- Savings goals
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'piggy-bank';
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#5C1A1B';
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS auto_save BOOLEAN DEFAULT false;
ALTER TABLE public.savings_goals ADD COLUMN IF NOT EXISTS auto_save_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "savings_own" ON public.savings_goals;
CREATE POLICY "savings_own" ON public.savings_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "savings_insert_own" ON public.savings_goals;
CREATE POLICY "savings_insert_own" ON public.savings_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "savings_update_own" ON public.savings_goals;
CREATE POLICY "savings_update_own" ON public.savings_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role_all_savings" ON public.savings_goals;
CREATE POLICY "service_role_all_savings" ON public.savings_goals FOR ALL USING (true) WITH CHECK (true);

-- Investment plans
ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS return_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS return_period TEXT DEFAULT 'monthly';
ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS max_investors INTEGER DEFAULT -1;
ALTER TABLE public.investment_plans ADD COLUMN IF NOT EXISTS current_investors INTEGER DEFAULT 0;
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inv_plans_select_all" ON public.investment_plans;
CREATE POLICY "inv_plans_select_all" ON public.investment_plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_inv_plans" ON public.investment_plans;
CREATE POLICY "service_role_all_inv_plans" ON public.investment_plans FOR ALL USING (true) WITH CHECK (true);

-- User investments
CREATE TABLE IF NOT EXISTS public.user_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.investment_plans(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'YER',
  expected_return NUMERIC(14,2) DEFAULT 0,
  actual_return NUMERIC(14,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "investments_own" ON public.user_investments;
CREATE POLICY "investments_own" ON public.user_investments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "investments_insert_own" ON public.user_investments;
CREATE POLICY "investments_insert_own" ON public.user_investments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role_all_investments" ON public.user_investments;
CREATE POLICY "service_role_all_investments" ON public.user_investments FOR ALL USING (true) WITH CHECK (true);

-- KYC documents
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS document_number TEXT DEFAULT NULL;
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS front_url TEXT DEFAULT NULL;
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS back_url TEXT DEFAULT NULL;
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS selfie_url TEXT DEFAULT NULL;
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT '';
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS kyc_level INTEGER DEFAULT 0;
ALTER TABLE public.kyc_documents ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN DEFAULT false;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kyc_docs_own" ON public.kyc_documents;
CREATE POLICY "kyc_docs_own" ON public.kyc_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "kyc_docs_insert_own" ON public.kyc_documents;
CREATE POLICY "kyc_docs_insert_own" ON public.kyc_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role_all_kyc" ON public.kyc_documents;
CREATE POLICY "service_role_all_kyc" ON public.kyc_documents FOR ALL USING (true) WITH CHECK (true);

-- User reviews
CREATE TABLE IF NOT EXISTS public.user_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT DEFAULT '',
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_select_all" ON public.user_reviews;
CREATE POLICY "reviews_select_all" ON public.user_reviews FOR SELECT TO anon, authenticated USING (is_visible = true);
DROP POLICY IF EXISTS "reviews_insert_own" ON public.user_reviews;
CREATE POLICY "reviews_insert_own" ON public.user_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
DROP POLICY IF EXISTS "service_role_all_reviews" ON public.user_reviews;
CREATE POLICY "service_role_all_reviews" ON public.user_reviews FOR ALL USING (true) WITH CHECK (true);

-- Activity log
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT NULL;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT NULL;
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_own" ON public.activity_log;
CREATE POLICY "activity_log_own" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role_all_activity" ON public.activity_log;
CREATE POLICY "service_role_all_activity" ON public.activity_log FOR ALL USING (true) WITH CHECK (true);

-- RLS for config tables
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banks_select_all" ON public.banks;
CREATE POLICY "banks_select_all" ON public.banks FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_banks" ON public.banks;
CREATE POLICY "service_role_all_banks" ON public.banks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_addrs_select" ON public.wallet_addresses;
CREATE POLICY "wallet_addrs_select" ON public.wallet_addresses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_wallet_addrs" ON public.wallet_addresses;
CREATE POLICY "service_role_all_wallet_addrs" ON public.wallet_addresses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exchange_rates_select" ON public.exchange_rates;
CREATE POLICY "exchange_rates_select" ON public.exchange_rates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_exchange_rates" ON public.exchange_rates;
CREATE POLICY "service_role_all_exchange_rates" ON public.exchange_rates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banners_select" ON public.banners;
CREATE POLICY "banners_select" ON public.banners FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_banners" ON public.banners;
CREATE POLICY "service_role_all_banners" ON public.banners FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branding_select" ON public.branding;
CREATE POLICY "branding_select" ON public.branding FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_branding" ON public.branding;
CREATE POLICY "service_role_all_branding" ON public.branding FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_flags_select" ON public.feature_flags;
CREATE POLICY "feature_flags_select" ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_feature_flags" ON public.feature_flags;
CREATE POLICY "service_role_all_feature_flags" ON public.feature_flags FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_config_select" ON public.app_config;
CREATE POLICY "app_config_select" ON public.app_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_app_config" ON public.app_config;
CREATE POLICY "service_role_all_app_config" ON public.app_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_select" ON public.maintenance;
CREATE POLICY "maintenance_select" ON public.maintenance FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_maintenance" ON public.maintenance;
CREATE POLICY "service_role_all_maintenance" ON public.maintenance FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.kill_switch ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kill_switch_select" ON public.kill_switch;
CREATE POLICY "kill_switch_select" ON public.kill_switch FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_kill_switch" ON public.kill_switch;
CREATE POLICY "service_role_all_kill_switch" ON public.kill_switch FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.card_colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "card_colors_select" ON public.card_colors;
CREATE POLICY "card_colors_select" ON public.card_colors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_card_colors" ON public.card_colors;
CREATE POLICY "service_role_all_card_colors" ON public.card_colors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.bottom_nav ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bottom_nav_select" ON public.bottom_nav;
CREATE POLICY "bottom_nav_select" ON public.bottom_nav FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_bottom_nav" ON public.bottom_nav;
CREATE POLICY "service_role_all_bottom_nav" ON public.bottom_nav FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.legal_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "legal_content_select" ON public.legal_content;
CREATE POLICY "legal_content_select" ON public.legal_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_legal" ON public.legal_content;
CREATE POLICY "service_role_all_legal" ON public.legal_content FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "social_links_select" ON public.social_links;
CREATE POLICY "social_links_select" ON public.social_links FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_social" ON public.social_links;
CREATE POLICY "service_role_all_social" ON public.social_links FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "offices_select" ON public.offices;
CREATE POLICY "offices_select" ON public.offices FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_offices" ON public.offices;
CREATE POLICY "service_role_all_offices" ON public.offices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_employees" ON public.employees;
CREATE POLICY "service_role_all_employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.employee_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_emp_secs" ON public.employee_sections;
CREATE POLICY "service_role_all_emp_secs" ON public.employee_sections FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.provider_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "provider_sections_select" ON public.provider_sections;
CREATE POLICY "provider_sections_select" ON public.provider_sections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_prov_secs" ON public.provider_sections;
CREATE POLICY "service_role_all_prov_secs" ON public.provider_sections FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.api_provider_endpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_endpoints_select" ON public.api_provider_endpoints;
CREATE POLICY "api_endpoints_select" ON public.api_provider_endpoints FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_endpoints" ON public.api_provider_endpoints;
CREATE POLICY "service_role_all_endpoints" ON public.api_provider_endpoints FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.wallet_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_services_select" ON public.wallet_services;
CREATE POLICY "wallet_services_select" ON public.wallet_services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_wallet_svcs" ON public.wallet_services;
CREATE POLICY "service_role_all_wallet_svcs" ON public.wallet_services FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.instant_recharge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "instant_recharge_own" ON public.instant_recharge;
CREATE POLICY "instant_recharge_own" ON public.instant_recharge FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role_all_instant" ON public.instant_recharge;
CREATE POLICY "service_role_all_instant" ON public.instant_recharge FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.user_gift_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_gift_codes_own" ON public.user_gift_codes;
CREATE POLICY "user_gift_codes_own" ON public.user_gift_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service_role_all_ugc" ON public.user_gift_codes;
CREATE POLICY "service_role_all_ugc" ON public.user_gift_codes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.bulk_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_bulk_codes" ON public.bulk_codes;
CREATE POLICY "service_role_all_bulk_codes" ON public.bulk_codes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.currency_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "currency_cards_select" ON public.currency_cards;
CREATE POLICY "currency_cards_select" ON public.currency_cards FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_currency_cards" ON public.currency_cards;
CREATE POLICY "service_role_all_currency_cards" ON public.currency_cards FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.visibility ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "visibility_select" ON public.visibility;
CREATE POLICY "visibility_select" ON public.visibility FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "service_role_all_visibility" ON public.visibility;
CREATE POLICY "service_role_all_visibility" ON public.visibility FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.api_balance_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_api_balance" ON public.api_balance_log;
CREATE POLICY "service_role_all_api_balance" ON public.api_balance_log FOR ALL USING (true) WITH CHECK (true);

-- Useful functions
CREATE OR REPLACE FUNCTION public.get_sections_with_data()
RETURNS TABLE (
  id TEXT, name TEXT, name_en TEXT, icon TEXT, color TEXT, image_url TEXT,
  sort_order INTEGER, is_active BOOLEAN, is_visible BOOLEAN, type TEXT,
  api_provider_id TEXT, api_provider_name TEXT,
  sub_section_count BIGINT, provider_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.name_en, s.icon, s.color, s.image_url,
    s.sort_order, s.is_active, s.is_visible, s.type, s.api_provider_id,
    COALESCE(ap.name, '') AS api_provider_name,
    COUNT(DISTINCT ss.id) AS sub_section_count,
    COUNT(DISTINCT sp.id) AS provider_count
  FROM public.sections s
  LEFT JOIN public.api_providers ap ON ap.id = s.api_provider_id
  LEFT JOIN public.sub_sections ss ON ss.section_id = s.id AND ss.is_active = true
  LEFT JOIN public.service_providers sp ON sp.section_id = s.id AND sp.is_active = true
  GROUP BY s.id, s.name, s.name_en, s.icon, s.color, s.image_url,
           s.sort_order, s.is_active, s.is_visible, s.type, s.api_provider_id, ap.name
  ORDER BY s.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe atomic transfer
CREATE OR REPLACE FUNCTION public.transfer_money(
  p_from_user_id UUID, p_to_user_id UUID, p_amount NUMERIC,
  p_currency TEXT DEFAULT 'YER', p_fee NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT 'تحويل'
) RETURNS TABLE(success BOOLEAN, message TEXT, transaction_id UUID) AS $$
DECLARE
  v_from_balance NUMERIC;
  v_total NUMERIC := p_amount + p_fee;
  v_new_txn_id UUID;
  v_ref TEXT := 'TXN-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::TEXT, 1, 8);
BEGIN
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT false, 'المبلغ يجب أن يكون أكبر من صفر'::TEXT, NULL::UUID; RETURN;
  END IF;

  EXECUTE format('SELECT balance_%s FROM public.users WHERE id = $1 FOR UPDATE', lower(p_currency))
    INTO v_from_balance USING p_from_user_id;

  IF v_from_balance IS NULL THEN
    RETURN QUERY SELECT false, 'المرسل غير موجود'::TEXT, NULL::UUID; RETURN;
  END IF;
  IF v_from_balance < v_total THEN
    RETURN QUERY SELECT false, 'الرصيد غير كافٍ'::TEXT, NULL::UUID; RETURN;
  END IF;

  EXECUTE format('UPDATE public.users SET balance_%s = balance_%s - $1, updated_at = now() WHERE id = $2',
    lower(p_currency), lower(p_currency)) USING v_total, p_from_user_id;
  EXECUTE format('UPDATE public.users SET balance_%s = balance_%s + $1, updated_at = now() WHERE id = $2',
    lower(p_currency), lower(p_currency)) USING p_amount, p_to_user_id;

  INSERT INTO public.transactions (user_id, from_user_id, to_user_id, amount, currency, fee, type, status, description)
  VALUES (p_from_user_id, p_from_user_id, p_to_user_id, p_amount, upper(p_currency), p_fee, 'transfer', 'completed', p_description)
  RETURNING id INTO v_new_txn_id;

  INSERT INTO public.transactions (user_id, from_user_id, to_user_id, amount, currency, fee, type, status, description)
  VALUES (p_to_user_id, p_from_user_id, p_to_user_id, p_amount, upper(p_currency), 0, 'transfer', 'completed', p_description);

  RETURN QUERY SELECT true, 'تم التحويل بنجاح'::TEXT, v_new_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user stats
CREATE OR REPLACE FUNCTION public.update_user_stats(p_user_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE public.users SET
    total_orders = (SELECT COUNT(*) FROM public.orders WHERE user_id = p_user_id AND status = 'completed'),
    total_deposits = (SELECT COALESCE(SUM(amount), 0) FROM public.deposit_requests WHERE user_id = p_user_id AND status = 'approved'),
    updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('games', 'games', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sections', 'sections', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 10485760, ARRAY['image/png','image/jpeg','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Final performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id       ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created       ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_user_id     ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status      ON public.deposit_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id  ON public.withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status   ON public.withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user         ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status       ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_savings_user         ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_buyer         ON public.escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status        ON public.escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed     ON public.user_reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread    ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created        ON public.notifications(created_at DESC);

COMMENT ON SCHEMA public IS 'South Wallet v2 - Complete Database Schema - Applied June 2026';
