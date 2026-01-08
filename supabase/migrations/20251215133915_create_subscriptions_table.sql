/*
  # Create Subscriptions Table

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique per user)
      - `plan_id` (text) - 'free', 'pro', 'premium'
      - `status` (text) - 'active', 'canceled', 'past_due', 'expired'
      - `stripe_customer_id` (text, nullable) - Stripe customer reference
      - `stripe_subscription_id` (text, nullable) - Stripe subscription reference
      - `current_period_start` (timestamptz, nullable) - Billing period start
      - `current_period_end` (timestamptz, nullable) - Billing period end
      - `canceled_at` (timestamptz, nullable) - When subscription was canceled
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `subscriptions` table
    - Add policy for authenticated users to read their own subscription
    - Add policy for authenticated users to insert their own subscription

  3. Notes
    - Each user can only have one subscription record (UNIQUE constraint)
    - Default plan is 'free' for new users
    - Stripe fields are nullable to support pre-Stripe setup
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_plan_id CHECK (plan_id IN ('free', 'pro', 'premium')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing'))
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();