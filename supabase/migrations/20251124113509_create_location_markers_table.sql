/*
  # Create location_markers table

  1. New Tables
    - `location_markers`
      - `id` (uuid, primary key)
      - `storage_image_id` (uuid, foreign key)
      - `x_position` (numeric)
      - `y_position` (numeric)
      - `name` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `location_markers` table
    - Add policies for anonymous users to manage their markers
*/

CREATE TABLE IF NOT EXISTS location_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_image_id uuid NOT NULL REFERENCES storage_images(id) ON DELETE CASCADE,
  x_position numeric NOT NULL,
  y_position numeric NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE location_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read location_markers"
  ON location_markers
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert location_markers"
  ON location_markers
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update location_markers"
  ON location_markers
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete location_markers"
  ON location_markers
  FOR DELETE
  TO authenticated, anon
  USING (true);
