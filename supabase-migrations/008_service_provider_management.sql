-- =====================================================
-- South Wallet - Migration 008: Service Provider Management
-- إعادة تنظيم قاعدة البيانات لدعم مزودي الخدمات
-- =====================================================

-- 1. Provider Sections: ربط مزودي الخدمة بالأقسام
CREATE TABLE IF NOT EXISTS public.provider_sections (
  id TEXT PRIMARY KEY DEFAULT substr(encode(gen_random_bytes(16), 'hex'), 1, 20),
  provider_id TEXT NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  sub_section_id TEXT REFERENCES public.sub_sections(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'none')),
  max_discount NUMERIC(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_sections_unique 
  ON public.provider_sections(provider_id, section_id, COALESCE(sub_section_id, ''));
CREATE INDEX IF NOT EXISTS idx_provider_sections_provider ON public.provider_sections(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_sections_section ON public.provider_sections(section_id);

ALTER TABLE public.provider_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to provider_sections" ON public.provider_sections
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read provider_sections" ON public.provider_sections
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Employee Sections: تحكم الموظف في الأقسام
CREATE TABLE IF NOT EXISTS public.employee_sections (
  id TEXT PRIMARY KEY DEFAULT substr(encode(gen_random_bytes(16), 'hex'), 1, 20),
  employee_id TEXT NOT NULL,
  section_id TEXT NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  can_add BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT true,
  can_delete BOOLEAN DEFAULT false,
  can_manage_providers BOOLEAN DEFAULT false,
  can_manage_products BOOLEAN DEFAULT false,
  can_approve_orders BOOLEAN DEFAULT false,
  can_view_stats BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_sections_employee ON public.employee_sections(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_sections_section ON public.employee_sections(section_id);

ALTER TABLE public.employee_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to employee_sections" ON public.employee_sections
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read employee_sections" ON public.employee_sections
  FOR SELECT USING (auth.role() = 'authenticated');

-- 3. API Provider Endpoints: إدارة نقاط نهاية API
CREATE TABLE IF NOT EXISTS public.api_provider_endpoints (
  id TEXT PRIMARY KEY DEFAULT substr(encode(gen_random_bytes(16), 'hex'), 1, 20),
  api_provider_id TEXT NOT NULL REFERENCES public.api_providers(id) ON DELETE CASCADE,
  endpoint_path TEXT NOT NULL,
  method TEXT DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE')),
  description TEXT DEFAULT '',
  headers JSONB DEFAULT '{}',
  body_template JSONB DEFAULT '{}',
  response_mapping JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 100,
  timeout_ms INTEGER DEFAULT 30000,
  retry_count INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.api_provider_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access to api_provider_endpoints" ON public.api_provider_endpoints
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can read api_provider_endpoints" ON public.api_provider_endpoints
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Storage bucket for sections
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('sections', 'sections', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- 5. Updated_at triggers
DROP TRIGGER IF EXISTS tr_provider_sections_updated_at ON public.provider_sections;
CREATE TRIGGER tr_provider_sections_updated_at BEFORE UPDATE ON public.provider_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_employee_sections_updated_at ON public.employee_sections;
CREATE TRIGGER tr_employee_sections_updated_at BEFORE UPDATE ON public.employee_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_api_provider_endpoints_updated_at ON public.api_provider_endpoints;
CREATE TRIGGER tr_api_provider_endpoints_updated_at BEFORE UPDATE ON public.api_provider_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Utility functions
CREATE OR REPLACE FUNCTION public.process_order(
  p_user_id UUID,
  p_provider_id TEXT,
  p_package_id TEXT,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'YER'
) RETURNS TABLE(success BOOLEAN, message TEXT, order_id UUID) AS $$
DECLARE
  v_user_balance NUMERIC;
  v_package_cost NUMERIC;
  v_new_order_id UUID;
BEGIN
  EXECUTE format('SELECT balance_%s FROM public.users WHERE id = $1', lower(p_currency))
    INTO v_user_balance USING p_user_id;
  IF v_user_balance IS NULL THEN
    RETURN QUERY SELECT false, 'المستخدم غير موجود'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  SELECT cost_price INTO v_package_cost FROM public.product_packages WHERE id = p_package_id;
  IF v_package_cost IS NULL THEN
    RETURN QUERY SELECT false, 'الباقة غير موجودة'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_user_balance < v_package_cost THEN
    RETURN QUERY SELECT false, 'الرصيد غير كافي'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  INSERT INTO public.orders (user_id, provider_id, package_id, amount, cost_price, commission, status)
  VALUES (p_user_id, p_provider_id, p_package_id, p_amount, v_package_cost, 0, 'pending')
  RETURNING id INTO v_new_order_id;
  EXECUTE format('UPDATE public.users SET balance_%s = balance_%s - $1 WHERE id = $2',
    lower(p_currency), lower(p_currency))
  USING v_package_cost, p_user_id;
  RETURN QUERY SELECT true, 'تم إنشاء الطلب بنجاح'::TEXT, v_new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.transfer_money(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'YER',
  p_fee NUMERIC DEFAULT 0
) RETURNS TABLE(success BOOLEAN, message TEXT, transaction_id UUID) AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_new_txn_id UUID;
  v_total NUMERIC;
BEGIN
  v_total := p_amount + p_fee;
  EXECUTE format('SELECT balance_%s FROM public.users WHERE id = $1', lower(p_currency))
    INTO v_from_balance USING p_from_user_id;
  IF v_from_balance IS NULL THEN
    RETURN QUERY SELECT false, 'المرسل غير موجود'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  IF v_from_balance < v_total THEN
    RETURN QUERY SELECT false, 'الرصيد غير كافي'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  INSERT INTO public.transactions (from_user_id, to_user_id, amount, fee, currency, type, status)
  VALUES (p_from_user_id, p_to_user_id, p_amount, p_fee, p_currency, 'transfer', 'completed')
  RETURNING id INTO v_new_txn_id;
  EXECUTE format('UPDATE public.users SET balance_%s = balance_%s - $1 WHERE id = $2',
    lower(p_currency), lower(p_currency))
  USING v_total, p_from_user_id;
  EXECUTE format('UPDATE public.users SET balance_%s = balance_%s + $1 WHERE id = $2',
    lower(p_currency), lower(p_currency))
  USING p_amount, p_to_user_id;
  RETURN QUERY SELECT true, 'تم التحويل بنجاح'::TEXT, v_new_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
