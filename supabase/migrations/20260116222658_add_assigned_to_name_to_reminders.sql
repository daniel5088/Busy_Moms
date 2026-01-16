/*
  # Add assigned_to_name column to reminders table

  1. Changes
    - Add `assigned_to_name` column to `reminders` table to store the name of the person the reminder is assigned to
    
  2. Details
    - Column type: TEXT (nullable)
    - This allows showing the assignee's name instead of email in the UI
    - Complements the existing `assigned_by_name` field for complete assignment tracking
*/

-- Add the assigned_to_name column to reminders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reminders' AND column_name = 'assigned_to_name'
  ) THEN
    ALTER TABLE reminders ADD COLUMN assigned_to_name TEXT;
  END IF;
END $$;