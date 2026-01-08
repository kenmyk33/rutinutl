/*
  # Add file_size column to tools table

  ## Purpose
  Track the file size of tool images to include them in storage usage calculations.

  ## Changes
  1. Add file_size column (bigint) to tools table
     - Stores file size in bytes for tool images
     - Defaults to 0 for tools without images or historical data
     - Not nullable to ensure data integrity

  ## Notes
  - Existing rows will have file_size = 0 (historical data or tools without images)
  - New tool image uploads will save the actual file size
  - Storage monitoring will include tool images in total calculations
*/

-- Add file_size column to tools table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tools' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE tools ADD COLUMN file_size bigint DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add index for faster storage calculations
CREATE INDEX IF NOT EXISTS idx_tools_user_file_size ON tools(user_id, file_size);