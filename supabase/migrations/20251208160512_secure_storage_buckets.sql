-- Secure Storage Buckets with Private Access
--
-- Changes Made:
-- 1. Update both storage-images and tool-images buckets to private
-- 2. Drop all "Anyone can" public policies
-- 3. Create user-specific authenticated policies
-- 4. Enforce path-based access control using auth.uid()
--
-- Security: Users can only access files in their own folder (user_id/*)
-- File structure: user_id/filename.jpg

-- Update storage-images bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'storage-images';

-- Update tool-images bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'tool-images';

-- Drop all existing public policies for storage-images
DROP POLICY IF EXISTS "Anyone can view storage images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload storage images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update storage images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete storage images" ON storage.objects;

-- Drop all existing public policies for tool-images
DROP POLICY IF EXISTS "Anyone can view tool images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload tool images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update tool images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete tool images" ON storage.objects;

-- Create authenticated policies for storage-images bucket
CREATE POLICY "Users can view own storage images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'storage-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own storage images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'storage-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own storage images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'storage-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'storage-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own storage images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'storage-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create authenticated policies for tool-images bucket
CREATE POLICY "Users can view own tool images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tool-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own tool images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tool-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own tool images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tool-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'tool-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own tool images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tool-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );