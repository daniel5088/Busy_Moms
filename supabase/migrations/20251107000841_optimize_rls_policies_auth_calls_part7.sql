/*
  # Optimize RLS Policies - Part 7: Shopping and Measurement Tables

  1. Purpose
    - Optimize RLS policies for user_preferred_retailers, addresses, 
      user_measurement_preferences, measurement_overrides, onboarding_state
*/

-- user_preferred_retailers table policies
DROP POLICY IF EXISTS "Users can view own preferred retailers" ON user_preferred_retailers;
DROP POLICY IF EXISTS "Users can insert own preferred retailers" ON user_preferred_retailers;
DROP POLICY IF EXISTS "Users can update own preferred retailers" ON user_preferred_retailers;
DROP POLICY IF EXISTS "Users can delete own preferred retailers" ON user_preferred_retailers;

CREATE POLICY "Users can view own preferred retailers"
  ON user_preferred_retailers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own preferred retailers"
  ON user_preferred_retailers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own preferred retailers"
  ON user_preferred_retailers
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own preferred retailers"
  ON user_preferred_retailers
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- addresses table policies
DROP POLICY IF EXISTS "Users can read own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;

CREATE POLICY "Users can read own addresses"
  ON addresses
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own addresses"
  ON addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own addresses"
  ON addresses
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own addresses"
  ON addresses
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- user_measurement_preferences table policies
DROP POLICY IF EXISTS "Users can view own measurement preferences" ON user_measurement_preferences;
DROP POLICY IF EXISTS "Users can insert own measurement preferences" ON user_measurement_preferences;
DROP POLICY IF EXISTS "Users can update own measurement preferences" ON user_measurement_preferences;
DROP POLICY IF EXISTS "Users can delete own measurement preferences" ON user_measurement_preferences;

CREATE POLICY "Users can view own measurement preferences"
  ON user_measurement_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own measurement preferences"
  ON user_measurement_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own measurement preferences"
  ON user_measurement_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own measurement preferences"
  ON user_measurement_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- measurement_overrides table policies
DROP POLICY IF EXISTS "Users can view own measurement overrides" ON measurement_overrides;
DROP POLICY IF EXISTS "Users can insert own measurement overrides" ON measurement_overrides;
DROP POLICY IF EXISTS "Users can update own measurement overrides" ON measurement_overrides;
DROP POLICY IF EXISTS "Users can delete own measurement overrides" ON measurement_overrides;

CREATE POLICY "Users can view own measurement overrides"
  ON measurement_overrides
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own measurement overrides"
  ON measurement_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own measurement overrides"
  ON measurement_overrides
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own measurement overrides"
  ON measurement_overrides
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- onboarding_state table policy
DROP POLICY IF EXISTS "Users can manage own onboarding_state" ON onboarding_state;

CREATE POLICY "Users can manage own onboarding_state"
  ON onboarding_state
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));