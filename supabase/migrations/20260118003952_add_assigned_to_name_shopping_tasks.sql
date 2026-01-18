/*
  # Add assigned_to_name to shopping_lists and tasks tables

  1. Changes
    - Add `assigned_to_name` column to `shopping_lists` table
    - Add `assigned_to_name` column to `tasks` table
    
  2. Details
    - Both columns store the display name of the assigned family member
    - Used for quick display without joins
    - Populated when items are created/assigned
*/

-- Add assigned_to_name to shopping_lists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shopping_lists' AND column_name = 'assigned_to_name'
  ) THEN
    ALTER TABLE shopping_lists ADD COLUMN assigned_to_name TEXT;
  END IF;
END $$;

-- Add assigned_to_name to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'assigned_to_name'
  ) THEN
    ALTER TABLE tasks ADD COLUMN assigned_to_name TEXT;
  END IF;
END $$;

-- Backfill shopping_lists assigned_to_name from family_members
UPDATE shopping_lists s
SET assigned_to_name = (
  SELECT fm.name 
  FROM family_members fm 
  WHERE fm.id = s.assigned_to
)
WHERE s.assigned_to IS NOT NULL 
  AND s.assigned_to_name IS NULL;

-- Backfill tasks assigned_to_name from family_members
UPDATE tasks t
SET assigned_to_name = (
  SELECT fm.name 
  FROM family_members fm 
  WHERE fm.id = t.assigned_to
)
WHERE t.assigned_to IS NOT NULL 
  AND t.assigned_to_name IS NULL;
