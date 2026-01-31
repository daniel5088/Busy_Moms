/*
  # Optimize RLS Policies for ai_voice_preferences Table

  1. Purpose
    - Optimize RLS policies by wrapping auth.uid() in SELECT subqueries
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Changes
    - Drop and recreate policies for: ai_voice_preferences
    - Replace auth.uid() with (select auth.uid())
    - Maintains same security rules with better performance

  3. Security
    - No changes to security rules
    - Same access control, just optimized execution
*/

-- ai_voice_preferences table policies
DROP POLICY IF EXISTS "Users can read own AI voice preferences" ON ai_voice_preferences;
DROP POLICY IF EXISTS "Users can insert own AI voice preferences" ON ai_voice_preferences;
DROP POLICY IF EXISTS "Users can update own AI voice preferences" ON ai_voice_preferences;

CREATE POLICY "Users can read own AI voice preferences"
  ON ai_voice_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own AI voice preferences"
  ON ai_voice_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own AI voice preferences"
  ON ai_voice_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
