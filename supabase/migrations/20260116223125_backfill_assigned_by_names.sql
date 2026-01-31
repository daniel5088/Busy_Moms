/*
  # Backfill assigned_by_name for existing reminders

  1. Changes
    - Updates all reminders that have assigned_by_name containing email format
    - Converts email addresses to actual names from family_members table

  2. Details
    - Looks up name from family_members table using assigned_by_name as email (if Email column exists)
    - Falls back to current assigned_by_name if name not found
    - Only runs if Email column exists in family_members table
*/

-- Backfill assigned_by_name by converting emails to names
DO $$
BEGIN
  -- Check if Email column exists in family_members table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'family_members'
    AND column_name IN ('Email', 'email')
  ) THEN
    UPDATE reminders r
    SET assigned_by_name = COALESCE(
      (
        SELECT fm.name
        FROM family_members fm
        WHERE fm."Email" = r.assigned_by_name
        LIMIT 1
      ),
      r.assigned_by_name
    )
    WHERE r.assigned_by_name IS NOT NULL
      AND r.assigned_by_name LIKE '%@%';
  END IF;
END $$;