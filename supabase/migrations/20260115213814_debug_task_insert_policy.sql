/*
  # Debug and Fix Task INSERT Policy

  1. Changes
    - Drop existing INSERT policy
    - Create simpler policy to test auth
    - Ensure user_id matches authenticated user
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;

-- Create new policy with explicit checks
CREATE POLICY "Users can insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  );