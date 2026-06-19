-- Telecom sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('recharge', 'telecom', 'شحن رصيد', 'Recharge', 'يمن موبايل، يو، سبأفون، واي', '📱', '#C41E3A', 1, true, true, 'telecom', now(), now()),
('internet-packages', 'telecom', 'باقات الإنترنت', 'Internet Packages', 'يمن نت، واي نت، سبأفون نت', '🌐', '#8B5CF6', 2, true, true, 'telecom', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Exchange sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('currency-exchange', 'exchange', 'صرف العملات', 'Currency Exchange', 'تحويل بين الريال اليمني والريال السعودي والدولار', '💱', '#10B981', 1, true, true, 'exchange', now(), now())
ON CONFLICT (id) DO NOTHING;

-- USDT sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('buy-usdt', 'usdt', 'شراء USDT', 'Buy USDT', 'شراء تتر بالريال اليمني أو السعودي', '💰', '#26A17B', 1, true, true, 'wallet', now(), now()),
('sell-usdt', 'usdt', 'بيع USDT', 'Sell USDT', 'بيع تتر واستلام الريال اليمني أو السعودي', '💵', '#F59E0B', 2, true, true, 'wallet', now(), now()),
('usdt-plans', 'usdt', 'خطط USDT', 'USDT Plans', 'خطط استثمارية يومية وأسبوعية وشهرية', '📈', '#3B82F6', 3, true, true, 'investment', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Escrow sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('create-escrow', 'escrow', 'إنشاء ضمان', 'Create Escrow', 'إنشاء عملية ضمان جديدة بين البائع والمشتري', '🛡️', '#5C1A1B', 1, true, true, 'escrow', now(), now()),
('my-escrows', 'escrow', 'ضماناتي', 'My Escrows', 'عرض جميع عمليات الضمان الخاصة بي', '📋', '#6B7280', 2, true, true, 'escrow', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Investment sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('crypto-buy-sell', 'investment', 'شراء وبيع', 'Buy and Sell', 'بيتكوين، إيثريوم، USDT والمزيد', '₿', '#F7931A', 1, true, true, 'investment', now(), now()),
('crypto-invest', 'investment', 'استثمار الكريبتو', 'Crypto Investment', 'خطط استثمارية متنوعة', '📊', '#8B5CF6', 2, true, true, 'investment', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Gift Cards sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('gift-store', 'gift-cards', 'متجر البطاقات', 'Card Store', 'بطاقات جوجل بلاي، آيتونز، امازون', '🎁', '#34A853', 1, true, true, 'api', now(), now()),
('gift-gaming', 'gift-cards', 'بطاقات الألعاب', 'Gaming Cards', 'بلايستيشن، اكسبوكس، نينتندو', '🎯', '#00439C', 2, true, true, 'api', now(), now()),
('gift-payment', 'gift-cards', 'بطاقات الدفع', 'Payment Cards', 'فيزا، ماستركارد، بايبال', '💳', '#1A1F71', 3, true, true, 'api', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Digital Services sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('digital-streaming', 'digital', 'خدمات البث', 'Streaming', 'نتفلكس، سبوتيفاي، يوتيوب بريميوم', '📺', '#E50914', 1, true, true, 'api', now(), now()),
('digital-software', 'digital', 'برامج واشتراكات', 'Software and Subscriptions', 'اشتراكات برامج وخدمات رقمية', '💻', '#6366F1', 2, true, true, 'api', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Add electricity and government sections if they don't exist
INSERT INTO sections (id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('electricity', 'الكهرباء والماء', 'Electricity and Water', 'دفع فواتير الكهرباء والمياه', '⚡', '#F59E0B', 9, true, true, 'manual', now(), now()),
('government', 'خدمات حكومية', 'Government Services', 'خدمات حكومية متنوعة', '🏛️', '#6B7280', 10, true, true, 'manual', now(), now()),
('internet', 'الإنترنت', 'Internet', 'مزودي خدمة الإنترنت', '🌐', '#8B5CF6', 11, true, true, 'telecom', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Electricity sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('elec', 'electricity', 'الكهرباء', 'Electricity', 'دفع فواتير الكهرباء', '⚡', '#F59E0B', 1, true, true, 'manual', now(), now()),
('water', 'electricity', 'المياه', 'Water', 'دفع فواتير المياه', '💧', '#06B6D4', 2, true, true, 'manual', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Government sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('identity', 'government', 'الأوراق الثبوتية', 'Identity Documents', 'السجل المدني، جواز السفر', '🪪', '#6B7280', 1, true, true, 'manual', now(), now()),
('traffic-municipal', 'government', 'المرور والبلدية', 'Traffic and Municipal', 'خدمات المرور والبلدية', '🚗', '#DC2626', 2, true, true, 'manual', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Internet sub-sections
INSERT INTO sub_sections (id, section_id, name, name_en, description, icon, color, sort_order, is_active, is_visible, type, created_at, updated_at) VALUES
('providers', 'internet', 'مزودي الإنترنت', 'Internet Providers', 'يمن نت، واي نت، سبأفون نت', '🌐', '#8B5CF6', 1, true, true, 'telecom', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime for all critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE sections;
ALTER PUBLICATION supabase_realtime ADD TABLE sub_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE service_providers;
ALTER PUBLICATION supabase_realtime ADD TABLE product_packages;
ALTER PUBLICATION supabase_realtime ADD TABLE exchange_rates;
ALTER PUBLICATION supabase_realtime ADD TABLE banners;
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE kill_switch;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE app_config;
ALTER PUBLICATION supabase_realtime ADD TABLE visibility;
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_addresses;
