-- =====================================================================
-- Migration 028: Fix global_games codes + add provider_game_code mapping
-- South Wallet — تصحيح أكواد الألعاب + إضافة mapping للمزود
-- =====================================================================

-- 1) إضافة عمود provider_game_code_mapping لـ global_games
--    (يحدد أكواد G2Bulk البديلة للعبة — مفيد للألعاب بمناطق متعددة)
ALTER TABLE public.global_games
  ADD COLUMN IF NOT EXISTS provider_game_code_mapping JSONB DEFAULT '{}'::jsonb;

-- 2) تحديث أكواد الألعاب لتطابق G2Bulk
-- freefire → نستخدم freefire_eu (الأكثر شيوعاً في أوروبا/الشرق الأوسط)
UPDATE public.global_games
SET game_code = 'freefire_eu',
    provider_game_code_mapping = jsonb_build_object('g2bulk', 'freefire_eu')
WHERE id = 'free-fire';

-- codm → codm_sgmy
UPDATE public.global_games
SET game_code = 'codm_sgmy',
    provider_game_code_mapping = jsonb_build_object('g2bulk', 'codm_sgmy')
WHERE id = 'codm';

-- clash royale / clash of clans — غير متوفرة في G2Bulk، اعتبرها قريباً
UPDATE public.global_games SET is_active = false WHERE id IN ('clash-royale', 'clash-of-clans');

-- 3) بطاقات الهدايا — غير متوفرة في G2Bulk API
--    اعتبرها منتجات يدوية (سيتم إدارتها مباشرة من الأدمن دون مزامنة G2Bulk)
UPDATE public.global_games
SET is_active = true,
    description = description || ' (منتج يدوي - غير مرتبط بـ G2Bulk API)'
WHERE id IN ('itunes-sa', 'itunes-uae', 'itunes-eg',
             'google-play-sa', 'google-play-uae',
             'psn-sa', 'psn-uae', 'netflix', 'spotify');

-- 4) الألعاب الموجودة في G2Bulk — فعّل المزود mapping
UPDATE public.global_games
SET provider_game_code_mapping = jsonb_build_object('g2bulk', game_code)
WHERE id IN ('pubg-mobile', 'mlbb', 'genshin', 'valorant')
  AND game_code IN ('pubgm', 'mlbb', 'genshin', 'valorant');

-- 5) Audit log
INSERT INTO public.activity_log(
  user_id, action, resource_type, resource_id, details, created_at
) VALUES (
  NULL, 'migration_applied', 'migration',
  '028_fix_game_codes_mapping',
  jsonb_build_object(
    'description', 'Fixed global_games codes to match G2Bulk (freefire_eu, codm_sgmy). Marked clash-royale/clash-of-clans as inactive (not in G2Bulk). Gift cards remain active as manual products.',
    'applied_at', NOW()
  ),
  NOW()
);

-- =====================================================================
