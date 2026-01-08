/*
  # Add Terms of Service Consent Tracking

  1. Changes to `user_preferences`
    - `tos_accepted_at` (timestamptz) - When user accepted ToS
    - `tos_version` (text) - Version of ToS accepted (e.g., '1.0')
    - `privacy_accepted_at` (timestamptz) - When user accepted Privacy Policy
    - `privacy_version` (text) - Version of Privacy Policy accepted

  2. Purpose
    - Track when users consent to Terms of Service and Privacy Policy
    - Store which version they agreed to for compliance
    - Enable re-consent prompts when policies are updated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'tos_accepted_at'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN tos_accepted_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'tos_version'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN tos_version text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'privacy_accepted_at'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN privacy_accepted_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'privacy_version'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN privacy_version text;
  END IF;
END $$;
