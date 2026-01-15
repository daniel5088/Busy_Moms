/*
  # Fix RLS Policies to Use Profiles Table

  1. Updates
    - Drop existing policies first
    - Drop helper functions
    - Create new RLS policies that use profiles table instead of auth.users
*/

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can read accessible events" ON events;
DROP POLICY IF EXISTS "Users can read own events" ON events;
DROP POLICY IF EXISTS "Users can read accessible tasks" ON tasks;
DROP POLICY IF EXISTS "Users can read own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can read accessible shopping items" ON shopping_lists;
DROP POLICY IF EXISTS "Users can read own shopping list" ON shopping_lists;
DROP POLICY IF EXISTS "Users can read accessible reminders" ON reminders;
DROP POLICY IF EXISTS "Users can read own reminders" ON reminders;

-- Now drop the functions
DROP FUNCTION IF EXISTS get_user_family_member_id(text);
DROP FUNCTION IF EXISTS get_family_parent_user_id(text);

-- Create new events SELECT policy
CREATE POLICY "Users can read accessible events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to IN (
      SELECT fm.id 
      FROM family_members fm
      JOIN profiles p ON p.email = fm."Email"
      WHERE p.id = auth.uid()
    )
    OR (
      visible_to_family = true 
      AND user_id IN (
        SELECT fm.user_id 
        FROM family_members fm
        JOIN profiles p ON p.email = fm."Email"
        WHERE p.id = auth.uid()
      )
    )
  );

-- Create new tasks SELECT policy
CREATE POLICY "Users can read accessible tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to IN (
      SELECT fm.id 
      FROM family_members fm
      JOIN profiles p ON p.email = fm."Email"
      WHERE p.id = auth.uid()
    )
    OR (
      visible_to_family = true 
      AND user_id IN (
        SELECT fm.user_id 
        FROM family_members fm
        JOIN profiles p ON p.email = fm."Email"
        WHERE p.id = auth.uid()
      )
    )
  );

-- Create new shopping_lists SELECT policy
CREATE POLICY "Users can read accessible shopping items"
  ON shopping_lists
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to IN (
      SELECT fm.id 
      FROM family_members fm
      JOIN profiles p ON p.email = fm."Email"
      WHERE p.id = auth.uid()
    )
    OR (
      visible_to_family = true 
      AND user_id IN (
        SELECT fm.user_id 
        FROM family_members fm
        JOIN profiles p ON p.email = fm."Email"
        WHERE p.id = auth.uid()
      )
    )
  );

-- Create new reminders SELECT policy
CREATE POLICY "Users can read accessible reminders"
  ON reminders
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR family_member_id IN (
      SELECT fm.id 
      FROM family_members fm
      JOIN profiles p ON p.email = fm."Email"
      WHERE p.id = auth.uid()
    )
    OR (
      visible_to_family = true 
      AND user_id IN (
        SELECT fm.user_id 
        FROM family_members fm
        JOIN profiles p ON p.email = fm."Email"
        WHERE p.id = auth.uid()
      )
    )
  );