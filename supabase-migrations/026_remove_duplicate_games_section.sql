-- =====================================================================
-- Migration 026: Remove duplicate 'games' section + orphan sub_sections
-- South Wallet — تنظيف الازدواجية القديمة في الأقسام
-- =====================================================================
-- المشكلة:
--   كان هناك قسمان باسم 'الألعاب':
--     1. 'games'        (قديم، type='api', is_visible=false, sort=2)
--        - عليه 3 sub_sections يتيمة (shooting, strategy, platforms)
--          بدون أي service_providers أو product_packages
--     2. 'g2bulk-games' (جديد، type='games', is_visible=true, sort=900)
--        - يعمل بشكل صحيح مع api_games و games-screen.tsx
--
-- الحل:
--   - حذف القسم القديم 'games' وكل ما يتعلق به (sub_sections + providers + packages)
--   - الإبقاء على 'g2bulk-games' لأنه الصحيح
--   - تنظيف أي صفوف يتيمة في api_categories (game_*) لو وُجدت
-- =====================================================================

-- ---------- 1) نظف أي service_providers و product_packages مرتبطة ----
-- بالقسم القديم 'games' أو sub_sections التابعة له (احتياطاً)
DELETE FROM public.product_packages
  WHERE provider_id IN (
    SELECT id FROM public.service_providers WHERE section_id = 'games'
  );
DELETE FROM public.service_providers WHERE section_id = 'games';

-- ---------- 2) احذف sub_sections التابعة للقسم القديم ----------------
DELETE FROM public.sub_sections WHERE section_id = 'games';

-- ---------- 3) احذف القسم القديم نفسه --------------------------------
DELETE FROM public.sections WHERE id = 'games';

-- ---------- 4) تنظيف api_categories من نوع 'game' مكرر لو وُجدت -----
-- (هذه فئات من المزامنة القديمة بنمط api_category_id='game_{code}'
--  وهي مكررة بـ api_games التي تستخدم الآن مباشرة)
-- نحتفظ بالـ api_categories الحالية لأنها قد تكون مستخدمة في مكان آخر
-- لكن نحذف الصفوف الفارغة بلا title
DELETE FROM public.api_categories
  WHERE category_type = 'game' AND (title IS NULL OR title = '');

-- ---------- 5) إعادة فهرسة sort_order للأقسام المتبقية ---------------
-- حتى تكون متتابعة: 0,1,2,3,...
-- نترك الأقسام اليدوية بترتيبها الحالي، والأقسام الجديدة (g2bulk-*) بترتيبها
UPDATE public.sections SET sort_order = 2 WHERE id = 'digital';
UPDATE public.sections SET sort_order = 3 WHERE id = 'gift-cards';
UPDATE public.sections SET sort_order = 4 WHERE id = 'exchange';
UPDATE public.sections SET sort_order = 5 WHERE id = 'usdt';
UPDATE public.sections SET sort_order = 6 WHERE id = 'escrow';
UPDATE public.sections SET sort_order = 7 WHERE id = 'investment';
UPDATE public.sections SET sort_order = 8 WHERE id = 'electricity';
UPDATE public.sections SET sort_order = 9 WHERE id = 'government';
-- g2bulk-root تبقى 800، g2bulk-games تبقى 900

-- ---------- 6) سجل في activity_log ----------------------------------
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL,
  'migration_applied',
  'migration',
  '026_remove_duplicate_games_section',
  jsonb_build_object(
    'description', 'Removed duplicate "games" section (old, type=api, is_visible=false) and its 3 orphan sub_sections (shooting, strategy, platforms). Kept "g2bulk-games" (new, type=games, is_visible=true). Re-indexed sort_order.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
