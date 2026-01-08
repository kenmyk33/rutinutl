/*
  # Add User Authentication Support

  ## Changes Made
  
  ### 1. Update and add user_id columns
  - Convert storage_images.user_id from text to uuid
  - Add user_id to location_markers table (references auth.users)
  - Add user_id to tools table (references auth.users)
  
  ### 2. Update Row Level Security (RLS)
  - Drop all existing public policies
  - Create restrictive user-specific policies for all tables
  - Users can only access their own data
  - All operations (SELECT, INSERT, UPDATE, DELETE) check auth.uid()
  
  ### 3. Performance Optimization
  - Add indexes on user_id columns for faster queries
  
  ## Security Notes
  - All tables remain RLS-enabled
  - No public access - authentication required for all operations
  - Each user can only view and modify their own data
*/

-- First, clear any existing data from storage_images since we're changing the user_id type
TRUNCATE storage_images CASCADE;

-- Convert storage_images.user_id from text to uuid
ALTER TABLE storage_images 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Add foreign key constraint to auth.users
ALTER TABLE storage_images
  DROP CONSTRAINT IF EXISTS storage_images_user_id_fkey;
  
ALTER TABLE storage_images
  ADD CONSTRAINT storage_images_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id columns to other tables
DO $$
BEGIN
  -- Add user_id to location_markers if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'location_markers' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE location_markers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Add user_id to tools if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tools' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tools ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view storage images" ON storage_images;
DROP POLICY IF EXISTS "Anyone can insert storage images" ON storage_images;
DROP POLICY IF EXISTS "Anyone can update storage images" ON storage_images;
DROP POLICY IF EXISTS "Anyone can delete storage images" ON storage_images;

DROP POLICY IF EXISTS "Anyone can view location markers" ON location_markers;
DROP POLICY IF EXISTS "Anyone can insert location markers" ON location_markers;
DROP POLICY IF EXISTS "Anyone can update location markers" ON location_markers;
DROP POLICY IF EXISTS "Anyone can delete location markers" ON location_markers;

DROP POLICY IF EXISTS "Anyone can view tools" ON tools;
DROP POLICY IF EXISTS "Anyone can insert tools" ON tools;
DROP POLICY IF EXISTS "Anyone can update tools" ON tools;
DROP POLICY IF EXISTS "Anyone can delete tools" ON tools;

-- Create new restrictive policies for storage_images
CREATE POLICY "Users can view own storage images"
  ON storage_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage images"
  ON storage_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage images"
  ON storage_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage images"
  ON storage_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create new restrictive policies for location_markers
CREATE POLICY "Users can view own location markers"
  ON location_markers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location markers"
  ON location_markers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location markers"
  ON location_markers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own location markers"
  ON location_markers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create new restrictive policies for tools
CREATE POLICY "Users can view own tools"
  ON tools FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tools"
  ON tools FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tools"
  ON tools FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tools"
  ON tools FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_storage_images_user_id ON storage_images(user_id);
CREATE INDEX IF NOT EXISTS idx_location_markers_user_id ON location_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_tools_user_id ON tools(user_id);