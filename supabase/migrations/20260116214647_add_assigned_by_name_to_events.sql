/*
  # Add assigned_by_name column to events table

  1. Changes
    - Add `assigned_by_name` column to `events` table to store the name of the user who assigned the event
    
  2. Details
    - Column type: TEXT (nullable)
    - This brings the events table in line with the reminders and tasks tables which already have this column
    - Allows tracking who assigned an event when using the assignment/visibility feature
*/

-- Add the assigned_by_name column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'assigned_by_name'
  ) THEN
    ALTER TABLE events ADD COLUMN assigned_by_name TEXT;
  END IF;
END $$;