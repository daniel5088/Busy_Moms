/*
  # Allow Creators to See Items They Assigned to Others

  1. Changes
    - Update RLS policies for tasks, events, shopping_lists, and reminders
    - Creators can now see ALL items they created, including those assigned to others
    - Assigned users can still see items assigned to them
    - This allows senders to track assignments they've made

  2. Updated Tables
    - tasks: Updated SELECT policy to show all creator's tasks
    - events: Updated SELECT policy to show all creator's events
    - shopping_lists: Updated SELECT policy to show all creator's shopping items
    - reminders: Updated SELECT policy to show all creator's reminders

  3. New Logic
    - If user created the item (user_id = auth.uid()), they can always see it
    - If item is assigned to user's email, they can see it
    - This allows both assignment tracking and collaborative workflows
*/

-- Update tasks SELECT policy
DROP POLICY IF EXISTS "Users can read accessible tasks" ON tasks;
CREATE POLICY "Users can read accessible tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
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
    user_id = auth.uid()
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
    user_id = auth.uid()
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
    user_id = auth.uid()
    OR family_member_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );