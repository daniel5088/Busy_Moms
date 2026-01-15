/*
  # Add Assignment Field to Events Table

  1. Changes to events table
    - Add `assigned_to` field (uuid, foreign key to family_members) to assign events to specific family members
    - Add index for performance
*/

-- Add assigned_to field to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE events ADD COLUMN assigned_to uuid REFERENCES family_members(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS events_assigned_to_idx ON events(assigned_to);
  END IF;
END $$;