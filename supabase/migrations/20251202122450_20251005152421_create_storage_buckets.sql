/*
  # Create Storage Buckets for Images

  ## Buckets Created
  
  1. `storage-images`
     - Stores main garage/storage space images
     - Public access for viewing
     - Anyone can upload (for demo purposes)
  
  2. `tool-images`
     - Stores individual tool photos
     - Public access for viewing
     - Anyone can upload (for demo purposes)
  
  ## Storage Policies
  - Public read access on all images
  - Public upload access (for demo/development)
  - In production, restrict uploads to authenticated users
  
  ## File Size Limits
  - Maximum file size: 10MB per image
  - Allowed MIME types: image/jpeg, image/png, image/webp
*/

-- Create storage bucket for main storage/garage images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'storage-images',
  'storage-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for tool images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tool-images',
  'tool-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Create policy to allow anyone to read storage images
CREATE POLICY "Anyone can view storage images"
ON storage.objects FOR SELECT
USING (bucket_id = 'storage-images');

-- Create policy to allow anyone to upload storage images
CREATE POLICY "Anyone can upload storage images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'storage-images');

-- Create policy to allow anyone to update storage images
CREATE POLICY "Anyone can update storage images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'storage-images')
WITH CHECK (bucket_id = 'storage-images');

-- Create policy to allow anyone to delete storage images
CREATE POLICY "Anyone can delete storage images"
ON storage.objects FOR DELETE
USING (bucket_id = 'storage-images');

-- Create policy to allow anyone to read tool images
CREATE POLICY "Anyone can view tool images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tool-images');

-- Create policy to allow anyone to upload tool images
CREATE POLICY "Anyone can upload tool images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tool-images');

-- Create policy to allow anyone to update tool images
CREATE POLICY "Anyone can update tool images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tool-images')
WITH CHECK (bucket_id = 'tool-images');

-- Create policy to allow anyone to delete tool images
CREATE POLICY "Anyone can delete tool images"
ON storage.objects FOR DELETE
USING (bucket_id = 'tool-images');