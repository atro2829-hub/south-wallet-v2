-- ============================================================
-- WALLET APP — SUPABASE POSTGRESQL
-- الملف 04: الإعدادات، البانرات، سجل التدقيق، المزودون
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 24. إعدادات التطبيق الموحّدة
-- ═══════════════════════════════════════════════════════════
CREATE TABLE app_settings (
  key              TEXT                  PRIMARY KEY,
  value            JSONB                 NOT NULL,
  value_type       setting_value_type    NOT NULL DEFAULT 'string',
  description      TEXT,
  is_public        BOOLEAN               NOT NULL DEFAULT FALSE,
  is_sensitive     BOOLEAN               NOT NULL DEFAULT FALSE,
  updated_by       UUID                  REFERENCES users(id),
  updated_at       TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

-- البيانات الافتراضية
INSERT INTO app_settings (key, value, value_type, description, is_public) VALUES
  ('maintenance.is_active',    'false',                          'boolean', 'وضع الصيانة', TRUE),
  ('maintenance.message',      '"التطبيق في حالة صيانة"',       'string',  'رسالة الصيانة', TRUE),
  ('maintenance.start_time',   'null',                           'string',  'وقت بدء الصيانة', TRUE),
  ('maintenance.end_time',     'null',                           'string',  'وقت انتهاء الصيانة', TRUE),

  ('transfer.min_amount_yer',  '100',                            'number',  'الحد الأدنى للتحويل بالريال اليمني', FALSE),
  ('transfer.min_amount_sar',  '1',                              'number',  'الحد الأدنى للتحويل بالريال السعودي', FALSE),
  ('transfer.min_amount_usd',  '0.5',                            'number',  'الحد الأدنى للتحويل بالدولار', FALSE),
  ('transfer.max_amount_daily','50000',                          'number',  'الحد اليومي للتحويل', FALSE),

  ('withdraw.min_amount_yer',  '500',                            'number',  'الحد الأدنى للسحب YER', FALSE),
  ('withdraw.min_amount_sar',  '5',                              'number',  'الحد الأدنى للسحب SAR', FALSE),
  ('withdraw.min_amount_usd',  '2',                              'number',  'الحد الأدنى للسحب USD', FALSE),
  ('withdraw.fee_percent',     '2',                              'number',  'رسوم السحب %', FALSE),

  ('escrow.fee_percent',       '2.5',                            'number',  'رسوم الوساطة %', FALSE),
  ('escrow.expire_hours',      '24',                             'number',  'صلاحية كود الوساطة بالساعة', FALSE),

  ('app.name',                 '"محفظتي"',                       'string',  'اسم التطبيق', TRUE),
  ('app.support_phone',        '"+967700000000"',                'string',  'رقم الدعم', TRUE),
  ('app.support_whatsapp',     '"+967700000000"',                'string',  'واتساب الدعم', TRUE),
  ('app.min_app_version',      '"1.0.0"',                        'string',  'أدنى إصدار مدعوم', TRUE),
  ('app.force_update',         'false',                          'boolean', 'إجبار التحديث', TRUE),

  ('features.investment_enabled', 'true',                        'boolean', 'تفعيل الاستثمار', TRUE),
  ('features.escrow_enabled',     'true',                        'boolean', 'تفعيل الوساطة', TRUE),
  ('features.referral_enabled',   'true',                        'boolean', 'تفعيل الإحالة', TRUE),
  ('features.live_chat_enabled',  'true',                        'boolean', 'تفعيل الشات المباشر', TRUE);

CREATE INDEX idx_settings_public ON app_settings(is_public) WHERE is_public = TRUE;

COMMENT ON TABLE app_settings IS 'إعدادات التطبيق الموحّدة — بديل عن جداول منفصلة';

-- دالة للحصول على إعداد محدد
CREATE OR REPLACE FUNCTION get_setting(setting_key TEXT)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT value FROM app_settings WHERE key = setting_key;
$$;

-- ═══════════════════════════════════════════════════════════
-- 25. البانرات الإعلانية
-- ═══════════════════════════════════════════════════════════
CREATE TABLE banners (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT          NOT NULL,
  title_en         TEXT,
  image_url        TEXT          NOT NULL,
  image_url_en     TEXT,
  thumbnail_url    TEXT,

  -- الموضع
  position         TEXT          NOT NULL DEFAULT 'home'
                   CHECK (position IN ('home', 'services', 'wallet', 'games', 'usdt')),

  -- الرابط
  link_type        TEXT          NOT NULL DEFAULT 'none'
                   CHECK (link_type IN ('none', 'url', 'category', 'screen')),
  link_value       TEXT,
  link_screen      TEXT,

  -- الترتيب والحالة
  sort_order       INT           NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,

  -- الجدولة
  start_at         TIMESTAMPTZ,
  end_at           TIMESTAMPTZ,

  -- إحصائيات
  views_count      INT           NOT NULL DEFAULT 0,
  clicks_count     INT           NOT NULL DEFAULT 0,

  created_by       UUID          REFERENCES users(id),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banners_position   ON banners(position, sort_order);
CREATE INDEX idx_banners_active     ON banners(is_active, position);
CREATE INDEX idx_banners_scheduled  ON banners(start_at, end_at) WHERE start_at IS NOT NULL;

CREATE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- دالة للحصول على بانرات نشطة لموضع محدد
CREATE OR REPLACE FUNCTION get_active_banners(p_position TEXT DEFAULT 'home')
RETURNS SETOF banners LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT * FROM banners
  WHERE is_active = TRUE
    AND position = p_position
    AND (start_at IS NULL OR start_at <= NOW())
    AND (end_at IS NULL OR end_at >= NOW())
  ORDER BY sort_order ASC;
$$;

COMMENT ON TABLE banners IS 'البانرات الإعلانية مع دعم الجدولة الزمنية';

-- ═══════════════════════════════════════════════════════════
-- 26. ربط مزودي API بالأقسام المحلية
-- ═══════════════════════════════════════════════════════════
CREATE TABLE provider_category_mapping (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id       TEXT          NOT NULL REFERENCES api_providers(id),
  provider_cat_id   TEXT          NOT NULL,
  provider_cat_name TEXT          NOT NULL,
  local_cat_id      TEXT          REFERENCES categories(id),

  -- حالة الربط
  is_mapped         BOOLEAN       NOT NULL DEFAULT FALSE,
  needs_attention   BOOLEAN       NOT NULL DEFAULT FALSE,
  mapping_note      TEXT,

  -- تجاوز هامش الربح لهذا القسم تحديداً
  margin_override   NUMERIC(5,2),

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE(provider_id, provider_cat_id)
);

CREATE INDEX idx_prov_map_provider  ON provider_category_mapping(provider_id);
CREATE INDEX idx_prov_map_local     ON provider_category_mapping(local_cat_id);
CREATE INDEX idx_prov_map_unmapped  ON provider_category_mapping(is_mapped)
  WHERE is_mapped = FALSE;

CREATE TRIGGER trg_prov_map_updated_at
  BEFORE UPDATE ON provider_category_mapping
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE provider_category_mapping IS 'ربط أقسام G2Bulk والمزودين بالأقسام المحلية';

-- ═══════════════════════════════════════════════════════════
-- 27. سجل التدقيق الشامل (Audit Log)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE audit_logs (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id         UUID          REFERENCES users(id) ON DELETE SET NULL,
  actor_type       actor_type    NOT NULL DEFAULT 'user',
  actor_ip         INET,
  actor_agent      TEXT,

  -- الفعل
  action           TEXT          NOT NULL,
  entity_type      TEXT          NOT NULL,
  entity_id        UUID,

  -- البيانات قبل وبعد التغيير
  old_data         JSONB,
  new_data         JSONB,

  -- معلومات إضافية
  description      TEXT,
  metadata         JSONB         NOT NULL DEFAULT '{}',

  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- فهارس التدقيق
CREATE INDEX idx_audit_actor      ON audit_logs(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_entity     ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action     ON audit_logs(action);
CREATE INDEX idx_audit_created    ON audit_logs(created_at DESC);

-- Partitioning شهري لجدول التدقيق (إذا توقعنا كميات ضخمة)
-- يمكن تفعيله لاحقاً عبر pg_partman

COMMENT ON TABLE audit_logs IS 'سجل التدقيق الكامل — لا يُحذف أبداً، يسجل كل تغيير حساس';

-- Trigger للتدقيق التلقائي على جدول users عند تعديل الرصيد أو الدور
CREATE OR REPLACE FUNCTION trg_audit_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- سجّل فقط عند تغيير الحقول الحساسة
  IF (OLD.balance_yer != NEW.balance_yer OR
      OLD.balance_sar != NEW.balance_sar OR
      OLD.balance_usd != NEW.balance_usd OR
      OLD.role != NEW.role OR
      OLD.is_blocked != NEW.is_blocked OR
      OLD.kyc_status != NEW.kyc_status) THEN

    INSERT INTO audit_logs (actor_id, actor_type, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      auth.uid(),
      CASE WHEN EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
           THEN 'admin'::actor_type ELSE 'user'::actor_type END,
      'user_updated',
      'users',
      NEW.id,
      jsonb_build_object(
        'balance_yer', OLD.balance_yer, 'balance_sar', OLD.balance_sar,
        'balance_usd', OLD.balance_usd, 'role', OLD.role,
        'is_blocked', OLD.is_blocked, 'kyc_status', OLD.kyc_status
      ),
      jsonb_build_object(
        'balance_yer', NEW.balance_yer, 'balance_sar', NEW.balance_sar,
        'balance_usd', NEW.balance_usd, 'role', NEW.role,
        'is_blocked', NEW.is_blocked, 'kyc_status', NEW.kyc_status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_audit
  AFTER UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trg_audit_users();

-- ═══════════════════════════════════════════════════════════
-- 28. دفعات الأكواد (لتتبع الأكواد المولودة معاً)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE gift_code_batches (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT          NOT NULL,
  description      TEXT,
  total_codes      INT           NOT NULL DEFAULT 0,
  used_codes       INT           NOT NULL DEFAULT 0,
  amount           NUMERIC(18,4) NOT NULL,
  currency         currency_enum NOT NULL,
  created_by       UUID          NOT NULL REFERENCES users(id),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- إضافة FK لجدول الأكواد
ALTER TABLE gift_codes ADD CONSTRAINT fk_gift_codes_batch
  FOREIGN KEY (batch_id) REFERENCES gift_code_batches(id) ON DELETE SET NULL;

COMMENT ON TABLE gift_code_batches IS 'دفعات أكواد الهدايا المولودة معاً';

-- ═══════════════════════════════════════════════════════════
-- 29. سجل مزامنة المنتجات من G2Bulk
-- ═══════════════════════════════════════════════════════════
CREATE TABLE sync_logs (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id      TEXT          NOT NULL REFERENCES api_providers(id),
  sync_type        TEXT          NOT NULL CHECK (sync_type IN ('categories', 'products', 'prices', 'full')),
  status           TEXT          NOT NULL DEFAULT 'running'
                   CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  total_items      INT           NOT NULL DEFAULT 0,
  processed_items  INT           NOT NULL DEFAULT 0,
  new_items        INT           NOT NULL DEFAULT 0,
  updated_items    INT           NOT NULL DEFAULT 0,
  error_items      INT           NOT NULL DEFAULT 0,
  error_log        TEXT,
  started_by       UUID          REFERENCES users(id),
  started_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

CREATE INDEX idx_sync_logs_provider ON sync_logs(provider_id, started_at DESC);
CREATE INDEX idx_sync_logs_status   ON sync_logs(status);

COMMENT ON TABLE sync_logs IS 'سجل عمليات مزامنة المنتجات والأسعار من مزودي API';

-- ═══════════════════════════════════════════════════════════
-- 30. إعدادات الرسوم والعمولات
-- ═══════════════════════════════════════════════════════════
-- هذه البيانات مدمجة في app_settings بشكل JSONB
-- لكن نُضيف VIEW لتسهيل القراءة

CREATE OR REPLACE VIEW fee_settings AS
SELECT
  (get_setting('withdraw.fee_percent'))::NUMERIC  AS withdraw_fee_pct,
  (get_setting('escrow.fee_percent'))::NUMERIC    AS escrow_fee_pct,
  (get_setting('transfer.min_amount_yer'))::NUMERIC AS transfer_min_yer,
  (get_setting('transfer.min_amount_sar'))::NUMERIC AS transfer_min_sar,
  (get_setting('transfer.min_amount_usd'))::NUMERIC AS transfer_min_usd;

COMMENT ON VIEW fee_settings IS 'عرض سريع للرسوم والحدود من app_settings';