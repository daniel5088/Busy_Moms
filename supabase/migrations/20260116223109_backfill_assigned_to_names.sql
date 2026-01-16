/*
  # Backfill assigned_to_name for existing reminders

  1. Changes
    - Updates all reminders that have a family_member_email but no assigned_to_name
    - Populates assigned_to_name by looking up the name from family_members table
    
  2. Details
    - Uses family_member_email to find matching family member
    - Sets assigned_to_name to the family member's name
    - Falls back to email username if name not found
*/

-- Backfill assigned_to_name for reminders that have family_member_email
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