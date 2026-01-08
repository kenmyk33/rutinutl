/*
  # Add Age Verification Support

  This migration adds date of birth and age verification tracking to comply with
  COPPA requirements and App Store guidelines.

  1. Changes to `user_preferences` table
    - `date_of_birth` (date) - User's full date of birth for age verification
    - `age_verified_at` (timestamptz) - Timestamp when age was verified during signup
    - `age_verification_version` (text) - Version of age verification policy accepted

  2. Security
    - Existing RLS policies apply (users can only access their own preferences)
    - Date of birth is protected by row-level security

  3. Notes
    - Age verification is required for new signups only
    - Users must be 13 years or older to create an account
    - Date of birth is stored securely and used only for compliance purposes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN date_of_birth date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'age_verified_at'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN age_verified_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'age_verification_version'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN age_verification_version text;
  END IF;
END $$;
