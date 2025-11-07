/*
  # Optimize RLS Policies - Part 4: Calendar Sync Tables

  1. Purpose
    - Optimize RLS policies for calendar sync related tables
    - Covers: calendar_sync_mappings, calendar_sync_conflicts, calendar_sync_logs, user_sync_preferences
*/

-- calendar_sync_mappings table policies
DROP POLICY IF EXISTS "Users can view own sync mappings" ON calendar_sync_mappings;
DROP POLICY IF EXISTS "Users can insert own sync mappings" ON calendar_sync_mappings;
DROP POLICY IF EXISTS "Users can update own sync mappings" ON calendar_sync_mappings;
DROP POLICY IF EXISTS "Users can delete own sync mappings" ON calendar_sync_mappings;

CREATE POLICY "Users can view own sync mappings"
  ON calendar_sync_mappings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own sync mappings"
  ON calendar_sync_mappings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own sync mappings"
  ON calendar_sync_mappings
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own sync mappings"
  ON calendar_sync_mappings
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- calendar_sync_conflicts table policies
DROP POLICY IF EXISTS "Users can view own sync conflicts" ON calendar_sync_conflicts;
DROP POLICY IF EXISTS "Users can insert own sync conflicts" ON calendar_sync_conflicts;
DROP POLICY IF EXISTS "Users can update own sync conflicts" ON calendar_sync_conflicts;
DROP POLICY IF EXISTS "Users can delete own sync conflicts" ON calendar_sync_conflicts;

CREATE POLICY "Users can view own sync conflicts"
  ON calendar_sync_conflicts
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own sync conflicts"
  ON calendar_sync_conflicts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own sync conflicts"
  ON calendar_sync_conflicts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own sync conflicts"
  ON calendar_sync_conflicts
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- calendar_sync_logs table policies
DROP POLICY IF EXISTS "Users can view own sync logs" ON calendar_sync_logs;
DROP POLICY IF EXISTS "Users can insert own sync logs" ON calendar_sync_logs;

CREATE POLICY "Users can view own sync logs"
  ON calendar_sync_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own sync logs"
  ON calendar_sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- user_sync_preferences table policies
DROP POLICY IF EXISTS "Users can view own sync preferences" ON user_sync_preferences;
DROP POLICY IF EXISTS "Users can insert own sync preferences" ON user_sync_preferences;
DROP POLICY IF EXISTS "Users can update own sync preferences" ON user_sync_preferences;
DROP POLICY IF EXISTS "Users can delete own sync preferences" ON user_sync_preferences;

CREATE POLICY "Users can view own sync preferences"
  ON user_sync_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own sync preferences"
  ON user_sync_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own sync preferences"
  ON user_sync_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own sync preferences"
  ON user_sync_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));