-- ============================================================
-- WALLET APP — SUPABASE POSTGRESQL
-- الملف 02: الطلبات، KYC، طلبات الإيداع والسحب
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 5. جدول الطلبات (ألعاب / شحن / USDT / خدمات)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE orders (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_num        TEXT          NOT NULL UNIQUE DEFAULT generate_order_num(),
  user_id          UUID          NOT NULL REFERENCES users(id),
  category_id      TEXT          REFERENCES categories(id),
  provider_id      TEXT          REFERENCES api_providers(id),

  -- تفاصيل المنتج
  product_code     TEXT          NOT NULL,
  product_name     TEXT          NOT NULL,

  -- المبالغ
  amount           NUMERIC(18,4) NOT NULL CHECK (amount > 0),
  currency         currency_enum NOT NULL,
  cost_price       NUMERIC(18,4) NOT NULL DEFAULT 0,
  sell_price       NUMERIC(18,4) NOT NULL DEFAULT 0,
  margin_percent   NUMERIC(5,2)  NOT NULL DEFAULT 0,

  -- الحالة والتنفيذ
  status           order_status  NOT NULL DEFAULT 'pending',
  execution_type   execution_type NOT NULL DEFAULT 'auto',

  -- بيانات اللاعب (للألعاب)
  game_player_id   TEXT,
  game_player_name TEXT,
  game_zone_id     TEXT,
  game_server      TEXT,

  -- بيانات USDT
  usdt_wallet_address TEXT,
  usdt_network     TEXT,

  -- بيانات شحن الهاتف
  phone_number     TEXT,

  -- استجابة API
  api_order_id     TEXT,
  api_response     JSONB,
  api_status       TEXT,

  -- محاولات وأخطاء
  retry_count      INT           NOT NULL DEFAULT 0,
  last_error       TEXT,

  -- ربط المعاملة المالية
  transaction_id   UUID          REFERENCES transactions(id),

  -- ملاحظات الأدمن
  admin_note       TEXT,
  reviewed_by      UUID          REFERENCES users(id),

  -- بيانات إضافية
  metadata         JSONB         NOT NULL DEFAULT '{}',
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id    ON orders(user_id, created_at DESC);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_category   ON orders(category_id);
CREATE INDEX idx_orders_provider   ON orders(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_api_order  ON orders(api_order_id) WHERE api_order_id IS NOT NULL;
CREATE INDEX idx_orders_admin      ON orders(status, created_at DESC) WHERE status IN ('pending', 'processing');

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE orders IS 'طلبات الشراء — ألعاب، شحن هاتف، USDT، خدمات';

-- ═══════════════════════════════════════════════════════════
-- 6. وثائق التحقق من الهوية KYC
-- ═══════════════════════════════════════════════════════════
CREATE TABLE kyc_documents (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  doc_type         TEXT          NOT NULL CHECK (doc_type IN ('id_front', 'id_back', 'selfie', 'passport', 'residence')),
  doc_url          TEXT          NOT NULL,
  file_size        INT,
  mime_type        TEXT,

  status           TEXT          NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by      UUID          REFERENCES users(id),
  reject_reason    TEXT,
  reviewed_at      TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kyc_user_id   ON kyc_documents(user_id);
CREATE INDEX idx_kyc_status    ON kyc_documents(status);
CREATE INDEX idx_kyc_pending   ON kyc_documents(status, submitted_at DESC) WHERE status = 'pending';

COMMENT ON TABLE kyc_documents IS 'وثائق التحقق من هوية المستخدم';

-- ═══════════════════════════════════════════════════════════
-- 7. طلبات الإيداع
-- ═══════════════════════════════════════════════════════════
CREATE TABLE deposit_requests (
  id               UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID                    NOT NULL REFERENCES users(id),

  -- المبلغ
  amount           NUMERIC(18,4)           NOT NULL CHECK (amount > 0),
  currency         currency_enum           NOT NULL,

  -- طريقة الإيداع
  method           deposit_method          NOT NULL,

  -- بيانات البنك (للحوالة البنكية)
  bank_id          UUID,  -- FK لجدول banks (يُنشأ لاحقاً)
  receipt_url      TEXT,
  sender_name      TEXT,
  sender_account   TEXT,

  -- بيانات الكريبتو
  crypto_network   TEXT,
  crypto_txhash    TEXT,
  crypto_from_address TEXT,

  -- المراجعة
  status           finance_request_status  NOT NULL DEFAULT 'pending',
  reviewed_by      UUID                    REFERENCES users(id),
  reject_reason    TEXT,
  reviewed_at      TIMESTAMPTZ,

  -- ربط المعاملة
  transaction_id   UUID                    REFERENCES transactions(id),

  -- بيانات إضافية
  notes            TEXT,
  metadata         JSONB                   NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deposit_user_id    ON deposit_requests(user_id, created_at DESC);
CREATE INDEX idx_deposit_status     ON deposit_requests(status);
CREATE INDEX idx_deposit_pending    ON deposit_requests(status, created_at DESC) WHERE status = 'pending';
CREATE INDEX idx_deposit_method     ON deposit_requests(method);

CREATE TRIGGER trg_deposit_updated_at
  BEFORE UPDATE ON deposit_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE deposit_requests IS 'طلبات إيداع الرصيد — تُراجع من الأدمن';

-- ═══════════════════════════════════════════════════════════
-- 8. طلبات السحب
-- ═══════════════════════════════════════════════════════════
CREATE TABLE withdraw_requests (
  id               UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID                    NOT NULL REFERENCES users(id),

  -- المبلغ
  amount           NUMERIC(18,4)           NOT NULL CHECK (amount > 0),
  currency         currency_enum           NOT NULL,
  fee_amount       NUMERIC(18,4)           NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  net_amount       NUMERIC(18,4)           GENERATED ALWAYS AS (amount - fee_amount) STORED,

  -- طريقة السحب
  method           withdraw_method         NOT NULL,

  -- بيانات البنك
  bank_id          UUID,
  account_name     TEXT,
  account_number   TEXT,
  iban             TEXT,

  -- بيانات الكريبتو
  crypto_network   TEXT,
  crypto_address   TEXT,

  -- بيانات الكاش
  cash_location    TEXT,
  cash_contact     TEXT,

  -- المراجعة
  status           finance_request_status  NOT NULL DEFAULT 'pending',
  processed_by     UUID                    REFERENCES users(id),
  reject_reason    TEXT,
  processed_at     TIMESTAMPTZ,

  -- ربط المعاملة (الخصم يحدث عند إنشاء الطلب)
  transaction_id   UUID                    REFERENCES transactions(id),
  payout_ref       TEXT,

  -- بيانات إضافية
  notes            TEXT,
  metadata         JSONB                   NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_withdraw_user_id  ON withdraw_requests(user_id, created_at DESC);
CREATE INDEX idx_withdraw_status   ON withdraw_requests(status);
CREATE INDEX idx_withdraw_pending  ON withdraw_requests(status, created_at DESC) WHERE status = 'pending';

CREATE TRIGGER trg_withdraw_updated_at
  BEFORE UPDATE ON withdraw_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE withdraw_requests IS 'طلبات سحب الرصيد — الرصيد يُخصم فوراً ثم يُعيد عند الرفض';

-- ═══════════════════════════════════════════════════════════
-- 9. البنوك
-- ═══════════════════════════════════════════════════════════
CREATE TABLE banks (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name        TEXT          NOT NULL,
  bank_name_en     TEXT,
  account_name     TEXT          NOT NULL,
  account_number   TEXT          NOT NULL,
  iban             TEXT,
  swift_code       TEXT,
  currency         currency_enum NOT NULL DEFAULT 'YER',
  country          TEXT          NOT NULL DEFAULT 'YE',
  logo_url         TEXT,
  instructions     TEXT,
  sort_order       INT           NOT NULL DEFAULT 0,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banks_currency  ON banks(currency);
CREATE INDEX idx_banks_active    ON banks(is_active, sort_order);

CREATE TRIGGER trg_banks_updated_at
  BEFORE UPDATE ON banks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- إضافة FK للبنوك في الجداول السابقة
ALTER TABLE deposit_requests ADD CONSTRAINT fk_deposit_bank
  FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE SET NULL;

ALTER TABLE withdraw_requests ADD CONSTRAINT fk_withdraw_bank
  FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE SET NULL;

COMMENT ON TABLE banks IS 'البنوك المتاحة للإيداع والسحب';

-- ═══════════════════════════════════════════════════════════
-- 10. عناوين المحافظ الرقمية
-- ═══════════════════════════════════════════════════════════
CREATE TABLE wallet_addresses (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency         TEXT          NOT NULL DEFAULT 'USDT',
  network          TEXT          NOT NULL,  -- 'TRC20', 'ERC20', 'BEP20'
  address          TEXT          NOT NULL,
  qr_code_url      TEXT,
  label            TEXT,
  min_deposit      NUMERIC(18,4) NOT NULL DEFAULT 10,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  sort_order       INT           NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wallet_addr_network ON wallet_addresses(network, address);
CREATE INDEX idx_wallet_addr_active ON wallet_addresses(is_active);

CREATE TRIGGER trg_wallet_addr_updated_at
  BEFORE UPDATE ON wallet_addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE wallet_addresses IS 'عناوين محافظ الكريبتو لاستقبال الإيداعات';

-- ═══════════════════════════════════════════════════════════
-- 11. أسعار الصرف
-- ═══════════════════════════════════════════════════════════
CREATE TABLE exchange_rates (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  usd_to_yer       NUMERIC(18,4) NOT NULL CHECK (usd_to_yer > 0),
  usd_to_sar       NUMERIC(18,4) NOT NULL CHECK (usd_to_sar > 0),
  yer_to_sar       NUMERIC(18,6) GENERATED ALWAYS AS (usd_to_sar / usd_to_yer) STORED,

  -- هوامش الصرف (%)
  exchange_fee_pct NUMERIC(5,2)  NOT NULL DEFAULT 1.50,

  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  updated_by       UUID          REFERENCES users(id),
  note             TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exchange_rates_active ON exchange_rates(is_active, created_at DESC);

COMMENT ON TABLE exchange_rates IS 'أسعار صرف العملات — يُفعَّل سعر واحد فقط في كل وقت';
COMMENT ON COLUMN exchange_rates.yer_to_sar IS 'يُحسب تلقائياً من USD_to_YER و USD_to_SAR';

-- دالة للحصول على السعر الحالي
CREATE OR REPLACE FUNCTION get_current_exchange_rate()
RETURNS TABLE(
  usd_to_yer NUMERIC,
  usd_to_sar NUMERIC,
  yer_to_sar NUMERIC,
  exchange_fee_pct NUMERIC
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT usd_to_yer, usd_to_sar, yer_to_sar, exchange_fee_pct
  FROM exchange_rates
  WHERE is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
$$;