/*
  # Update RLS Policies for Family Member Access

  1. Helper Function
    - Create function to check if user can access item based on:
      - User created the item
      - Item is assigned to a family member with user's email
      - Item is visible to family and user is part of that family

  2. Update RLS Policies
    - Update SELECT policies for events, tasks, shopping_lists, and reminders
    - Allow access based on the helper function logic
*/

-- Create helper function to check if user has a family member record
CREATE OR REPLACE FUNCTION get_user_family_member_id(user_email text)
RETURNS uuid AS $$
  SELECT id FROM family_members WHERE "Email" = user_email LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create helper function to get parent user ID from family member
CREATE OR REPLACE FUNCTION get_family_parent_user_id(user_email text)
RETURNS uuid AS $$
  SELECT user_id FROM family_members WHERE "Email" = user_email LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update events SELECT policy
DROP POLICY IF EXISTS "Users can read own events" ON events;
CREATE POLICY "Users can read accessible events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to = get_user_family_member_id((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR (visible_to_family = true AND user_id = get_family_parent_user_id((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

-- Update tasks SELECT policy
DROP POLICY IF EXISTS "Users can read own tasks" ON tasks;
CREATE POLICY "Users can read accessible tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to = get_user_family_member_id((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR (visible_to_family = true AND user_id = get_family_parent_user_id((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

-- Update shopping_lists SELECT policy
DROP POLICY IF EXISTS "Users can read own shopping list" ON shopping_lists;
CREATE POLICY "Users can read accessible shopping items"
  ON shopping_lists
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to = get_user_family_member_id((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR (visible_to_family = true AND user_id = get_family_parent_user_id((SELECT email FROM auth.users WHERE id = auth.uid())))
  );

-- Update reminders SELECT policy (note: reminders use family_member_id instead of assigned_to)
DROP POLICY IF EXISTS "Users can read own reminders" ON reminders;
CREATE POLICY "Users can read accessible reminders"
  ON reminders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR family_member_id = get_user_family_member_id((SELECT email FROM auth.users WHERE id = auth.uid()))
    OR (visible_to_family = true AND user_id = get_family_parent_user_id((SELECT email FROM auth.users WHERE id = auth.uid())))
  );