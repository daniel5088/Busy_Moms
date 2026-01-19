/*
  # Add Email-Based Assignments

  1. Changes
    - Add `assigned_to_email` column to tasks, events, shopping_lists, reminders
    - Migrate existing data from family_member IDs to emails (if Email column exists)
    - Update RLS policies to use email directly
    - Drop old assigned_to columns after migration

  2. Benefits
    - Simpler assignment system using email addresses
    - No need to look up family member IDs
    - Direct email-based filtering

  3. Notes
    - Only migrates data if Email column exists in family_members table
    - Creates simplified policies if Email column doesn't exist
*/

-- Add email columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_email text;

-- Add email columns to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS assigned_to_email text;

-- Add email columns to shopping_lists
ALTER TABLE shopping_lists ADD COLUMN IF NOT EXISTS assigned_to_email text;

-- Add email columns to reminders
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS family_member_email text;

-- Migrate data and create policies based on whether Email column exists
DO $$
BEGIN
  -- Check if Email column exists in family_members table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'family_members'
    AND column_name IN ('Email', 'email')
  ) THEN
    -- Migrate existing task assignments
    UPDATE tasks
    SET assigned_to_email = fm."Email"
    FROM family_members fm
    WHERE tasks.assigned_to = fm.id
      AND tasks.assigned_to_email IS NULL;

    -- Migrate existing event assignments
    UPDATE events
    SET assigned_to_email = fm."Email"
    FROM family_members fm
    WHERE events.assigned_to = fm.id
      AND events.assigned_to_email IS NULL;

    -- Migrate existing shopping list assignments
    UPDATE shopping_lists
    SET assigned_to_email = fm."Email"
    FROM family_members fm
    WHERE shopping_lists.assigned_to = fm.id
      AND shopping_lists.assigned_to_email IS NULL;

    -- Migrate existing reminder assignments
    UPDATE reminders
    SET family_member_email = fm."Email"
    FROM family_members fm
    WHERE reminders.family_member_id = fm.id
      AND reminders.family_member_email IS NULL;

    -- Update RLS policies for tasks with email-based access
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

    -- Update RLS policies for events with email-based access
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

    -- Update RLS policies for shopping_lists with email-based access
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

    -- Update RLS policies for reminders with email-based access
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
  ELSE
    -- Create simplified policies without family member email-based access
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
  END IF;
END $$;
