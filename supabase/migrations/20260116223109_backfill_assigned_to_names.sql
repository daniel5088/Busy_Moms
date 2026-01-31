/*
  # Backfill assigned_to_name for existing reminders

  1. Changes
    - Updates all reminders that have a family_member_email but no assigned_to_name
    - Populates assigned_to_name by looking up the name from family_members table

  2. Details
    - Uses family_member_email to find matching family member (if Email column exists)
    - Sets assigned_to_name to the family member's name
    - Falls back to email username if name not found
    - Only runs if Email column exists in family_members table
*/

-- Backfill assigned_to_name for reminders that have family_member_email
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
    SET assigned_to_name = COALESCE(
      (
        SELECT fm.name
        FROM family_members fm
        WHERE fm."Email" = r.family_member_email
        LIMIT 1
      ),
      split_part(r.family_member_email, '@', 1)
    )
    WHERE r.family_member_email IS NOT NULL
      AND r.assigned_to_name IS NULL;
  END IF;
END $$;