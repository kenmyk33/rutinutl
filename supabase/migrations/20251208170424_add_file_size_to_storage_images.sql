/*
  # Add file_size column to storage_images table

  ## Purpose
  Track the actual file size of uploaded images to accurately calculate storage usage per user.

  ## Changes
  1. Add file_size column (bigint) to storage_images table
     - Stores file size in bytes
     - Defaults to 0 for backward compatibility
     - Not nullable to ensure data integrity

  ## Notes
  - Existing rows will have file_size = 0 (historical data)
  - New uploads will save the actual file size
  - Storage monitoring will use this field for accurate calculations
*/

-- Add file_size column to storage_images table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'storage_images' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE storage_images ADD COLUMN file_size bigint DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add index for faster storage calculations
CREATE INDEX IF NOT EXISTS idx_storage_images_user_file_size ON storage_images(user_id, file_size);