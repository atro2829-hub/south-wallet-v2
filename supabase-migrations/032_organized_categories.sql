-- =====================================================================
-- Migration 032: Organized Categories Hierarchy
-- South Wallet — هيكل الأقسام الرئيسية والفرعية المنظّم
-- Uses actual schema: categories table with parent_section_id
-- =====================================================================

-- ── 1) Ensure categories table has needed columns ──
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS badge_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_mode text DEFAULT 'grid',
  ADD COLUMN IF NOT EXISTS section_group text DEFAULT 'main';

-- ── 2) Insert / Update main top-level categories ──
INSERT INTO public.categories (
  id, name_ar, name_en, name, slug, icon, color,
  category_type, sort_order, is_active, is_visible,
  screen_type, show_in_home, show_in_services, is_featured,
  section_group, description, depth
) VALUES
  -- الألعاب — Games
  ('cat-games',      'الألعاب',             'Games',              'الألعاب',             'games',       'gamepad-2',      '#7C3AED',
   'root', 1, true, true, 'api-games',     true,  true,  true, 'providers', 'ألعاب الفيديو والشحن الفوري', 0),
  -- بطاقات الهدايا — Gift Cards
  ('cat-giftcards',  'بطاقات الهدايا',      'Gift Cards',         'بطاقات الهدايا',      'gift-cards',  'gift',           '#DC2626',
   'root', 2, true, true, 'api-products',  true,  true,  true, 'providers', 'بطاقات هدايا لجميع المنصات', 0),
  -- تطبيقات الهاتف — App Products
  ('cat-apps',       'تطبيقات الهاتف',      'App Products',       'تطبيقات الهاتف',      'app-products','smartphone',     '#2563EB',
   'root', 3, true, true, 'api-products',  true,  true,  true, 'providers', 'اشتراكات وتطبيقات رقمية', 0),
  -- الاتصالات — Telecom
  ('cat-telecom',    'الاتصالات',           'Telecom',            'الاتصالات',           'telecom',     'signal',         '#059669',
   'root', 4, true, true, 'telecom',       true,  false, false, 'services', 'شحن الخطوط والباقات', 0),
  -- الخدمات المالية — Financial
  ('cat-financial',  'الخدمات المالية',     'Financial Services', 'الخدمات المالية',     'financial',   'banknote',       '#5C1A1B',
   'root', 5, true, true, 'exchange',      false, true,  false, 'services', 'تحويل وصرف العملات', 0),
  -- بطاقات البيانات — Data Cards
  ('cat-datacards',  'بطاقات البيانات',     'Data Cards',         'بطاقات البيانات',     'data-cards',  'wifi',           '#0891B2',
   'root', 6, true, true, 'api-products',  true,  true,  false, 'providers', 'بيانات الإنترنت وباقات الاتصال', 0),
  -- العروض — Deals
  ('cat-deals',      'العروض والتخفيضات',   'Deals & Offers',     'العروض والتخفيضات',   'deals',       'tag',            '#D97706',
   'root', 7, true, true, 'manual',        true,  false, false, 'promotional', 'أحدث العروض والخصومات', 0)
ON CONFLICT (slug) DO UPDATE SET
  name_ar   = EXCLUDED.name_ar,
  name_en   = EXCLUDED.name_en,
  name      = EXCLUDED.name_ar,
  icon      = EXCLUDED.icon,
  color     = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_active  = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  show_in_home = EXCLUDED.show_in_home,
  section_group = EXCLUDED.section_group,
  updated_at = NOW();

-- ── 3) Insert sub-categories for Games ──
INSERT INTO public.categories (
  id, parent_section_id, name_ar, name_en, name, slug, icon, color,
  category_type, sort_order, is_active, is_visible, screen_type,
  show_in_home, show_in_services, api_category_id, depth, section_group
) VALUES
  ('sub-games-pubg',    'cat-games', 'PUBG Mobile',       'PUBG Mobile',       'PUBG Mobile',       'games-pubg',     'target',      '#F59E0B', 'sub', 1,  true, true, 'api-games', false, true, 'pubg',      1, 'providers'),
  ('sub-games-ff',      'cat-games', 'Free Fire',         'Free Fire',         'Free Fire',         'games-freefire', 'flame',       '#EF4444', 'sub', 2,  true, true, 'api-games', false, true, 'freefire',  1, 'providers'),
  ('sub-games-val',     'cat-games', 'Valorant',          'Valorant',          'Valorant',          'games-valorant', 'crosshair',   '#FF4655', 'sub', 3,  true, true, 'api-games', false, true, 'valorant',  1, 'providers'),
  ('sub-games-lol',     'cat-games', 'League of Legends', 'League of Legends', 'League of Legends', 'games-lol',      'sword',       '#C89B3C', 'sub', 4,  true, true, 'api-games', false, true, 'lol',       1, 'providers'),
  ('sub-games-mlbb',    'cat-games', 'Mobile Legends',    'Mobile Legends',    'Mobile Legends',    'games-mlbb',     'shield',      '#1A56DB', 'sub', 5,  true, true, 'api-games', false, true, 'mlbb',      1, 'providers'),
  ('sub-games-coc',     'cat-games', 'Clash of Clans',    'Clash of Clans',    'Clash of Clans',    'games-coc',      'castle',      '#10B981', 'sub', 6,  true, true, 'api-games', false, true, 'coc',       1, 'providers'),
  ('sub-games-roblox',  'cat-games', 'Roblox',            'Roblox',            'Roblox',            'games-roblox',   'box',         '#EF4444', 'sub', 7,  true, true, 'api-games', false, true, 'roblox',    1, 'providers'),
  ('sub-games-genshin', 'cat-games', 'Genshin Impact',    'Genshin Impact',    'Genshin Impact',    'games-genshin',  'sparkles',    '#7C3AED', 'sub', 8,  true, true, 'api-games', false, true, 'genshin',   1, 'providers'),
  ('sub-games-cod',     'cat-games', 'Call of Duty',      'Call of Duty',      'Call of Duty',      'games-cod',      'crosshair',   '#4B5563', 'sub', 9,  true, true, 'api-games', false, true, 'cod',       1, 'providers'),
  ('sub-games-other',   'cat-games', 'ألعاب أخرى',        'Other Games',       'Other Games',       'games-other',    'gamepad-2',   '#6B7280', 'sub', 99, true, true, 'api-games', false, true, 'other',     1, 'providers')
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
  parent_section_id = EXCLUDED.parent_section_id, updated_at = NOW();

-- ── 4) Insert sub-categories for Gift Cards ──
INSERT INTO public.categories (
  id, parent_section_id, name_ar, name_en, name, slug, icon, color,
  category_type, sort_order, is_active, is_visible, screen_type,
  show_in_home, show_in_services, api_category_id, depth, section_group
) VALUES
  ('sub-gc-itunes',  'cat-giftcards', 'iTunes & App Store', 'iTunes & App Store', 'iTunes',       'gc-itunes',  'music',         '#FC3C44', 'sub', 1,  true, true, 'api-products', false, true, 'itunes',      1, 'providers'),
  ('sub-gc-google',  'cat-giftcards', 'Google Play',        'Google Play',        'Google Play',  'gc-google',  'play',          '#4285F4', 'sub', 2,  true, true, 'api-products', false, true, 'google-play', 1, 'providers'),
  ('sub-gc-amazon',  'cat-giftcards', 'Amazon',             'Amazon',             'Amazon',       'gc-amazon',  'shopping-cart', '#FF9900', 'sub', 3,  true, true, 'api-products', false, true, 'amazon',      1, 'providers'),
  ('sub-gc-netflix', 'cat-giftcards', 'Netflix',            'Netflix',            'Netflix',      'gc-netflix', 'tv',            '#E50914', 'sub', 4,  true, true, 'api-products', false, true, 'netflix',     1, 'providers'),
  ('sub-gc-psn',     'cat-giftcards', 'PlayStation Store',  'PlayStation Store',  'PlayStation',  'gc-psn',     'gamepad',       '#003087', 'sub', 5,  true, true, 'api-products', false, true, 'psn',         1, 'providers'),
  ('sub-gc-xbox',    'cat-giftcards', 'Xbox Game Pass',     'Xbox Game Pass',     'Xbox',         'gc-xbox',    'gamepad-2',     '#107C10', 'sub', 6,  true, true, 'api-products', false, true, 'xbox',        1, 'providers'),
  ('sub-gc-steam',   'cat-giftcards', 'Steam Wallet',       'Steam Wallet',       'Steam',        'gc-steam',   'flame',         '#1B2838', 'sub', 7,  true, true, 'api-products', false, true, 'steam',       1, 'providers'),
  ('sub-gc-spotify', 'cat-giftcards', 'Spotify Premium',    'Spotify Premium',    'Spotify',      'gc-spotify', 'music-2',       '#1DB954', 'sub', 8,  true, true, 'api-products', false, true, 'spotify',     1, 'providers'),
  ('sub-gc-razer',   'cat-giftcards', 'Razer Gold',         'Razer Gold',         'Razer Gold',   'gc-razer',   'zap',           '#00D332', 'sub', 9,  true, true, 'api-products', false, true, 'razer',       1, 'providers'),
  ('sub-gc-other',   'cat-giftcards', 'أخرى',               'Other Cards',        'Other',        'gc-other',   'gift',          '#6B7280', 'sub', 99, true, true, 'api-products', false, true, 'other-gc',    1, 'providers')
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
  parent_section_id = EXCLUDED.parent_section_id, updated_at = NOW();

-- ── 5) Insert sub-categories for App Products ──
INSERT INTO public.categories (
  id, parent_section_id, name_ar, name_en, name, slug, icon, color,
  category_type, sort_order, is_active, is_visible, screen_type,
  show_in_home, show_in_services, api_category_id, depth, section_group
) VALUES
  ('sub-app-stream',  'cat-apps', 'بث الفيديو',          'Streaming',      'Video Streaming', 'app-streaming',  'tv',             '#E50914', 'sub', 1,  true, true, 'api-products', false, true, 'streaming',   1, 'providers'),
  ('sub-app-social',  'cat-apps', 'التواصل الاجتماعي',   'Social Media',   'Social Media',    'app-social',     'users',          '#1877F2', 'sub', 2,  true, true, 'api-products', false, true, 'social',      1, 'providers'),
  ('sub-app-edu',     'cat-apps', 'التعليم والتطوير',    'Education',      'Education',       'app-education',  'graduation-cap', '#7C3AED', 'sub', 3,  true, true, 'api-products', false, true, 'education',   1, 'providers'),
  ('sub-app-prod',    'cat-apps', 'الإنتاجية',           'Productivity',   'Productivity',    'app-productivity','briefcase',     '#2563EB', 'sub', 4,  true, true, 'api-products', false, true, 'productivity',1, 'providers'),
  ('sub-app-vpn',     'cat-apps', 'الأمان والـ VPN',     'Security & VPN', 'VPN & Security',  'app-vpn',        'shield',         '#059669', 'sub', 5,  true, true, 'api-products', false, true, 'vpn',         1, 'providers'),
  ('sub-app-music',   'cat-apps', 'الموسيقى',            'Music',          'Music Apps',      'app-music',      'music',          '#1DB954', 'sub', 6,  true, true, 'api-products', false, true, 'music',       1, 'providers'),
  ('sub-app-other',   'cat-apps', 'تطبيقات أخرى',        'Other Apps',     'Other Apps',      'app-other',      'smartphone',     '#6B7280', 'sub', 99, true, true, 'api-products', false, true, 'other-apps',  1, 'providers')
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order,
  parent_section_id = EXCLUDED.parent_section_id, updated_at = NOW();

-- ── 6) Insert sub-categories for Telecom ──
INSERT INTO public.categories (
  id, parent_section_id, name_ar, name_en, name, slug, icon, color,
  category_type, sort_order, is_active, is_visible, screen_type,
  show_in_home, show_in_services, api_category_id, depth, section_group
) VALUES
  ('sub-tel-ymob',  'cat-telecom', 'Yemen Mobile',       'Yemen Mobile', 'Yemen Mobile',  'tel-ymobile', 'phone',    '#DC2626', 'sub', 1, true, true, 'telecom', false, true, 'yemen-mobile', 1, 'services'),
  ('sub-tel-mtn',   'cat-telecom', 'MTN Yemen',          'MTN Yemen',    'MTN Yemen',     'tel-mtn',     'signal',   '#FFCB00', 'sub', 2, true, true, 'telecom', false, true, 'mtn-yemen',    1, 'services'),
  ('sub-tel-stc',   'cat-telecom', 'STC',                'STC Saudi',    'STC',           'tel-stc',     'phone',    '#7A1FA2', 'sub', 3, true, true, 'telecom', false, true, 'stc',          1, 'services'),
  ('sub-tel-zain',  'cat-telecom', 'Zain',               'Zain',         'Zain',          'tel-zain',    'wifi',     '#E4002B', 'sub', 4, true, true, 'telecom', false, true, 'zain',         1, 'services'),
  ('sub-tel-other', 'cat-telecom', 'أخرى',               'Other',        'Other Telecom', 'tel-other',   'phone-call','#6B7280','sub', 99,true, true, 'telecom', false, true, 'other-tel',    1, 'services')
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar, icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_section_id = EXCLUDED.parent_section_id, updated_at = NOW();

-- ── 7) Add slug index if missing ──
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug
  ON public.categories(slug) WHERE slug IS NOT NULL AND slug != '';

-- ── 8) Grant access ──
GRANT ALL ON public.categories TO service_role;
GRANT SELECT ON public.categories TO authenticated, anon;
