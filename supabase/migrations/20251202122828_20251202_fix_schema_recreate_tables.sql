/*
  # Fix Schema - Recreate Tables with Correct Structure

  ## Problem
  Old tables (garages, storage_dots, tools) exist with outdated schema.
  New tables need to be created with the correct structure.

  ## Changes
  1. Drop old tables: tools, storage_dots, garages
  2. Ensure new tables exist with correct schema:
     - storage_images (already exists)
     - location_markers (already exists)
     - tools (needs recreation)

  ## Security
  All tables maintain RLS with public access policies
*/

-- Drop old tables (cascade to remove dependencies)
DROP TABLE IF EXISTS tools CASCADE;
DROP TABLE IF EXISTS storage_dots CASCADE;
DROP TABLE IF EXISTS garages CASCADE;

-- Recreate tools table with correct schema
CREATE TABLE IF NOT EXISTS tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_marker_id uuid NOT NULL REFERENCES location_markers(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on tools table
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read tools" ON tools;
DROP POLICY IF EXISTS "Anyone can insert tools" ON tools;
DROP POLICY IF EXISTS "Anyone can update tools" ON tools;
DROP POLICY IF EXISTS "Anyone can delete tools" ON tools;

-- Create policies for tools
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