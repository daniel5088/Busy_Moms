/*
  # Simplify Task INSERT Policy for Testing

  1. Changes
    - Drop existing INSERT policy
    - Create simpler policy without IS NOT NULL check
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;

-- Create simplified policy
CREATE POLICY "Users can insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());