/*
  # Add Adapty Fields to Subscriptions Table

  1. Changes
    - Add `adapty_profile_id` column - Adapty's user profile identifier
    - Add `adapty_access_level` column - The access level granted by Adapty (e.g., 'premium')
    - Add `is_trial` column - Whether the user is currently on a free trial
    - Add `original_transaction_id` column - Store transaction reference for purchase verification

  2. Notes
    - Existing Stripe columns are preserved for backward compatibility
    - is_trial defaults to false for existing subscriptions
    - These fields will be populated by Adapty webhooks and SDK calls
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'adapty_profile_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN adapty_profile_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'adapty_access_level'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN adapty_access_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'is_trial'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN is_trial boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'original_transaction_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN original_transaction_id text;
  END IF;
END $$;