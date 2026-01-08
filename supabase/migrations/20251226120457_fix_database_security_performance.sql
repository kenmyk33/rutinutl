/*
  # Fix Database Security and Performance Issues

  This migration addresses multiple security and performance concerns identified in the database:

  1. **Foreign Key Indexes**
    - Add index on `location_markers.storage_image_id`
    - Add index on `tools.location_marker_id`

  2. **RLS Policy Optimization**
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()` for better performance
    - This prevents re-evaluation of the auth function for each row

  3. **Remove Duplicate Policies**
    - Drop overly permissive "Anyone can..." policies
    - Keep only the secure user-scoped policies

  4. **Function Security**
    - Fix search_path for functions to prevent security issues

  5. Notes
    - Unused indexes are kept as they may be utilized by future queries
    - Auth DB connection strategy requires project settings change (not in migration)
*/

-- =============================================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_location_markers_storage_image_id 
  ON location_markers(storage_image_id);

CREATE INDEX IF NOT EXISTS idx_tools_location_marker_id 
  ON tools(location_marker_id);

-- =============================================================================
-- 2. DROP DUPLICATE/OVERLY PERMISSIVE POLICIES
-- =============================================================================

-- Storage Images - Drop "Anyone can..." policies
DROP POLICY IF EXISTS "Anyone can read storage_images" ON storage_images;
DROP POLICY IF EXISTS "Anyone can insert storage_images" ON storage_images;
DROP POLICY IF EXISTS "Anyone can update storage_images" ON storage_images;
DROP POLICY IF EXISTS "Anyone can delete storage_images" ON storage_images;

-- Location Markers - Drop "Anyone can..." policies
DROP POLICY IF EXISTS "Anyone can read location_markers" ON location_markers;
DROP POLICY IF EXISTS "Anyone can insert location_markers" ON location_markers;
DROP POLICY IF EXISTS "Anyone can update location_markers" ON location_markers;
DROP POLICY IF EXISTS "Anyone can delete location_markers" ON location_markers;

-- Tools - Drop "Anyone can..." policies
DROP POLICY IF EXISTS "Anyone can read tools" ON tools;

-- Subscriptions - Drop duplicate policies
DROP POLICY IF EXISTS "Users can create own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;

-- =============================================================================
-- 3. RECREATE RLS POLICIES WITH OPTIMIZED AUTH CALLS
-- =============================================================================

-- Storage Images Policies
DROP POLICY IF EXISTS "Users can view own storage images" ON storage_images;
DROP POLICY IF EXISTS "Users can insert own storage images" ON storage_images;
DROP POLICY IF EXISTS "Users can update own storage images" ON storage_images;
DROP POLICY IF EXISTS "Users can delete own storage images" ON storage_images;

CREATE POLICY "Users can view own storage images"
  ON storage_images
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own storage images"
  ON storage_images
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own storage images"
  ON storage_images
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own storage images"
  ON storage_images
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Location Markers Policies
DROP POLICY IF EXISTS "Users can view own location markers" ON location_markers;
DROP POLICY IF EXISTS "Users can insert own location markers" ON location_markers;
DROP POLICY IF EXISTS "Users can update own location markers" ON location_markers;
DROP POLICY IF EXISTS "Users can delete own location markers" ON location_markers;

CREATE POLICY "Users can view own location markers"
  ON location_markers
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own location markers"
  ON location_markers
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own location markers"
  ON location_markers
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own location markers"
  ON location_markers
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Tools Policies
DROP POLICY IF EXISTS "Users can view own tools" ON tools;
DROP POLICY IF EXISTS "Users can insert own tools" ON tools;
DROP POLICY IF EXISTS "Users can update own tools" ON tools;
DROP POLICY IF EXISTS "Users can delete own tools" ON tools;

CREATE POLICY "Users can view own tools"
  ON tools
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tools"
  ON tools
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own tools"
  ON tools
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own tools"
  ON tools
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- User Preferences Policies
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can read own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- =============================================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =============================================================================

-- Recreate update_updated_at_column with secure search path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate update_subscriptions_updated_at with secure search path
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
