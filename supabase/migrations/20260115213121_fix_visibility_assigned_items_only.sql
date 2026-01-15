/*
  # Fix Visibility Rules - Assigned Items Only

  1. Changes
    - Update RLS policies so items assigned to family members ONLY show to the assigned person
    - Items NOT assigned (null) show to the creator only
    - Prevents creators from seeing items they assigned to others

  2. Key Logic
    - If assigned_to_email is set, ONLY that email can see it
    - If assigned_to_email is null, only the creator can see it
*/

-- Update tasks SELECT policy
DROP POLICY IF EXISTS "Users can read accessible tasks" ON tasks;
CREATE POLICY "Users can read accessible tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND assigned_to_email IS NULL)
    OR assigned_to_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Update events SELECT policy
DROP POLICY IF EXISTS "Users can read accessible events" ON events;
CREATE POLICY "Users can read accessible events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND assigned_to_email IS NULL)
    OR assigned_to_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Update shopping_lists SELECT policy
DROP POLICY IF EXISTS "Users can read accessible shopping items" ON shopping_lists;
CREATE POLICY "Users can read accessible shopping items"
  ON shopping_lists
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND assigned_to_email IS NULL)
    OR assigned_to_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Update reminders SELECT policy
DROP POLICY IF EXISTS "Users can read accessible reminders" ON reminders;
CREATE POLICY "Users can read accessible reminders"
  ON reminders
  FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid() AND family_member_email IS NULL)
    OR family_member_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );