/*
  # Create tools table

  1. New Tables
    - `tools`
      - `id` (uuid, primary key)
      - `location_marker_id` (uuid, foreign key)
      - `name` (text)
      - `description` (text, nullable)
      - `image_url` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `tools` table
    - Add policies for anonymous users to manage tools
*/

CREATE TABLE IF NOT EXISTS tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_marker_id uuid NOT NULL REFERENCES location_markers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tools"
  ON tools
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can insert tools"
  ON tools
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update tools"
  ON tools
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tools"
  ON tools
  FOR DELETE
  TO authenticated, anon
  USING (true);