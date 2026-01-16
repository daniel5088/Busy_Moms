/*
  # Backfill assigned_by_name for existing reminders

  1. Changes
    - Updates all reminders that have assigned_by_name containing email format
    - Converts email addresses to actual names from family_members table
    
  2. Details
    - Looks up name from family_members table using assigned_by_name as email
    - Falls back to email username if name not found
*/

-- Backfill assigned_by_name by converting emails to names
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