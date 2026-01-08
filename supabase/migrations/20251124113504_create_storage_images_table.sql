/*
  # Create storage_images table

  1. New Tables
    - `storage_images`
      - `id` (uuid, primary key)
      - `user_id` (text)
      - `image_uri` (text)
      - `name` (text, nullable)
      - `order_index` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `storage_images` table
    - Add policy for anonymous users to read and write their own data
*/

CREATE TABLE IF NOT EXISTS storage_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  image_uri text NOT NULL,
  name text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE storage_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read storage_images"
  ON storage_images
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert storage_images"
  ON storage_images
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update storage_images"
  ON storage_images
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete storage_images"
  ON storage_images
  FOR DELETE
  TO authenticated, anon
  USING (true);
