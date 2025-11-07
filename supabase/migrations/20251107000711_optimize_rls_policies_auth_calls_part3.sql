/*
  # Optimize RLS Policies - Part 3: Error Logs and Tasks

  1. Purpose
    - Optimize RLS policies for error_logs and tasks tables
    - Wrap auth functions in SELECT subqueries for better performance
*/

-- error_logs table policies
DROP POLICY IF EXISTS "Users can update own error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can insert own error logs" ON error_logs;
DROP POLICY IF EXISTS "Users can read own error logs" ON error_logs;

CREATE POLICY "Users can read own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own error logs"
  ON error_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- tasks table policies
DROP POLICY IF EXISTS "Users can read own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Users can read own tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));