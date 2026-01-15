/*
  # Add CRUD Policies for Shopping Lists and Reminders

  1. Changes
    - Add INSERT, UPDATE, DELETE policies for shopping_lists
    - Add INSERT, UPDATE, DELETE policies for reminders
    - Users can modify items they created
    - Assigned users can update status/completion of items
*/

-- Shopping Lists INSERT policy
DROP POLICY IF EXISTS "Users can insert shopping items" ON shopping_lists;
CREATE POLICY "Users can insert shopping items"
  ON shopping_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Shopping Lists UPDATE policy
DROP POLICY IF EXISTS "Users can update shopping items" ON shopping_lists;
CREATE POLICY "Users can update shopping items"
  ON shopping_lists
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

-- Shopping Lists DELETE policy
DROP POLICY IF EXISTS "Users can delete shopping items" ON shopping_lists;
CREATE POLICY "Users can delete shopping items"
  ON shopping_lists
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Reminders INSERT policy
DROP POLICY IF EXISTS "Users can insert reminders" ON reminders;
CREATE POLICY "Users can insert reminders"
  ON reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Reminders UPDATE policy
DROP POLICY IF EXISTS "Users can update reminders" ON reminders;
CREATE POLICY "Users can update reminders"
  ON reminders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR family_member_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR family_member_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Reminders DELETE policy
DROP POLICY IF EXISTS "Users can delete reminders" ON reminders;
CREATE POLICY "Users can delete reminders"
  ON reminders
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Events INSERT policy
DROP POLICY IF EXISTS "Users can insert events" ON events;
CREATE POLICY "Users can insert events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Events UPDATE policy
DROP POLICY IF EXISTS "Users can update events" ON events;
CREATE POLICY "Users can update events"
  ON events
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

-- Events DELETE policy
DROP POLICY IF EXISTS "Users can delete events" ON events;
CREATE POLICY "Users can delete events"
  ON events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());