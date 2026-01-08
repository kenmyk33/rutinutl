/*
  # Add Billing Cycle to Subscriptions

  1. Changes
    - Add `billing_cycle` column to `subscriptions` table
    - Valid values: 'monthly' or 'yearly'
    - Nullable to support free plan users who have no billing cycle

  2. Notes
    - Existing subscriptions will have NULL billing_cycle
    - Free plan users should have NULL billing_cycle
    - Paid plan users will have their billing_cycle set by the webhook
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'billing_cycle'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN billing_cycle text;
    
    ALTER TABLE subscriptions ADD CONSTRAINT valid_billing_cycle 
      CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));
  END IF;
END $$;