/*
  # Fix Task INSERT Policy

  1. Changes
    - Drop and recreate INSERT policy for tasks
    - Ensure policy allows users to create tasks they own
    - Allow assigning tasks to any email
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;

-- Recreate with proper permissions
CREATE POLICY "Users can insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );