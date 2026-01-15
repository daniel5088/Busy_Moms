/*
  # Fix Task Update RLS Policy

  1. Changes
    - Update the tasks UPDATE policy to use email-based access
    - Ensure users can update tasks they created or are assigned to them
*/

-- Drop and recreate the UPDATE policy for tasks
DROP POLICY IF EXISTS "Users can update accessible tasks" ON tasks;
CREATE POLICY "Users can update accessible tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR assigned_to_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Update INSERT policy for tasks
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
CREATE POLICY "Users can insert tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update DELETE policy for tasks
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());