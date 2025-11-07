/*
  # Optimize RLS Policies - Part 5: Affirmations and Google Tokens

  1. Purpose
    - Optimize RLS policies for affirmations, affirmation_settings, and google_tokens tables
*/

-- affirmations table policies
DROP POLICY IF EXISTS "Users can read own affirmations" ON affirmations;
DROP POLICY IF EXISTS "Users can insert own affirmations" ON affirmations;
DROP POLICY IF EXISTS "Users can update own affirmations" ON affirmations;
DROP POLICY IF EXISTS "Users can delete own affirmations" ON affirmations;

CREATE POLICY "Users can read own affirmations"
  ON affirmations
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own affirmations"
  ON affirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own affirmations"
  ON affirmations
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own affirmations"
  ON affirmations
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- affirmation_settings table policies
DROP POLICY IF EXISTS "Users can read own settings" ON affirmation_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON affirmation_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON affirmation_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON affirmation_settings;

CREATE POLICY "Users can read own settings"
  ON affirmation_settings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own settings"
  ON affirmation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own settings"
  ON affirmation_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own settings"
  ON affirmation_settings
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- google_tokens table policy
DROP POLICY IF EXISTS "service-only" ON google_tokens;

CREATE POLICY "service-only"
  ON google_tokens
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));