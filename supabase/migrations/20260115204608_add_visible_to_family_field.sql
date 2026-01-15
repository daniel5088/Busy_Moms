/*
  # Add Family Visibility Field

  1. Changes to events table
    - Add `visible_to_family` boolean field to allow events to be shared with all family members
  
  2. Changes to tasks table
    - Add `visible_to_family` boolean field to allow tasks to be shared with all family members
  
  3. Changes to shopping_lists table
    - Add `visible_to_family` boolean field to allow shopping items to be shared with all family members
  
  4. Changes to reminders table
    - Add `visible_to_family` boolean field to allow reminders to be shared with all family members
  
  5. Logic
    - When `visible_to_family` is true: visible to all family members
    - When `assigned_to` has a value: visible to that specific member
    - When both are false/null: visible only to creator
*/

-- Add visible_to_family field to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'visible_to_family'
  ) THEN
    ALTER TABLE events ADD COLUMN visible_to_family boolean DEFAULT false;
  END IF;
END $$;

-- Add visible_to_family field to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'visible_to_family'
  ) THEN
    ALTER TABLE tasks ADD COLUMN visible_to_family boolean DEFAULT false;
  END IF;
END $$;

-- Add visible_to_family field to shopping_lists table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_lists' AND column_name = 'visible_to_family'
  ) THEN
    ALTER TABLE shopping_lists ADD COLUMN visible_to_family boolean DEFAULT false;
  END IF;
END $$;

-- Add visible_to_family field to reminders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'visible_to_family'
  ) THEN
    ALTER TABLE reminders ADD COLUMN visible_to_family boolean DEFAULT false;
  END IF;
END $$;