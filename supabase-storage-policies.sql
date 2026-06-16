-- ============================================
-- SUPABASE STORAGE POLICIES FOR SOUTH WALLET
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- Drop existing policies first (if any) to avoid conflicts
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owner update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete avatars" ON storage.objects;

DROP POLICY IF EXISTS "Public read banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete banners" ON storage.objects;

DROP POLICY IF EXISTS "Public read providers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload providers" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete providers" ON storage.objects;

DROP POLICY IF EXISTS "Public read products" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload products" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete products" ON storage.objects;

DROP POLICY IF EXISTS "Public read general" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload general" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete general" ON storage.objects;

DROP POLICY IF EXISTS "Owner read kyc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner upload kyc-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner delete kyc-documents" ON storage.objects;

DROP POLICY IF EXISTS "Public read Wallet" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload Wallet" ON storage.objects;

-- ============================================
-- 1. AVATARS BUCKET (public read)
-- ============================================
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Owner update avatars" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner delete avatars" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 2. BANNERS BUCKET (public read)
-- ============================================
CREATE POLICY "Public read banners" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "Authenticated upload banners" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete banners" ON storage.objects
  FOR DELETE USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 3. PROVIDERS BUCKET (public read)
-- ============================================
CREATE POLICY "Public read providers" ON storage.objects
  FOR SELECT USING (bucket_id = 'providers');

CREATE POLICY "Authenticated upload providers" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'providers' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete providers" ON storage.objects
  FOR DELETE USING (bucket_id = 'providers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 4. PRODUCTS BUCKET (public read)
-- ============================================
CREATE POLICY "Public read products" ON storage.objects
  FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Authenticated upload products" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete products" ON storage.objects
  FOR DELETE USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 5. GENERAL BUCKET (public read)
-- ============================================
CREATE POLICY "Public read general" ON storage.objects
  FOR SELECT USING (bucket_id = 'general');

CREATE POLICY "Authenticated upload general" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'general' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete general" ON storage.objects
  FOR DELETE USING (bucket_id = 'general' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 6. KYC DOCUMENTS BUCKET (private - owner only)
-- ============================================
CREATE POLICY "Owner read kyc-documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner upload kyc-documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner delete kyc-documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- 7. WALLET BUCKET (public read)
-- ============================================
CREATE POLICY "Public read Wallet" ON storage.objects
  FOR SELECT USING (bucket_id = 'Wallet');

CREATE POLICY "Authenticated upload Wallet" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'Wallet' AND auth.role() = 'authenticated');
