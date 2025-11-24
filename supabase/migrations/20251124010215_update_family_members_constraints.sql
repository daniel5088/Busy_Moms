/*
  # Update Family Members Constraints
  
  1. Changes
    - Remove age upper limit constraint (allow ages beyond 25)
    - Update relationship constraint to include new relationship types
    
  2. Details
    - Drop existing age check constraint that limited ages to 0-25
    - Add new age check constraint that only requires age >= 0
    - Drop existing relationship constraint
    - Add new relationship constraint with values: Child, Spouse, Parent, Grandparent, Extended Family, Other
    
  3. Notes
    - Uses IF EXISTS to prevent errors if constraints don't exist
    - Maintains minimum age of 0 for data validity
    - Includes 'Other' for backwards compatibility
*/

-- Drop old age constraint (limited to 0-25)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_age_check'
  ) THEN
    ALTER TABLE family_members DROP CONSTRAINT family_members_age_check;
  END IF;
END $$;

-- Add new age constraint (only minimum of 0)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_age_min_check'
  ) THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_age_min_check CHECK (age >= 0);
  END IF;
END $$;

-- Drop old relationship constraint (limited to Mom, Dad, Child, Other)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_relationship_check'
  ) THEN
    ALTER TABLE family_members DROP CONSTRAINT family_members_relationship_check;
  END IF;
END $$;

-- Add new relationship constraint with expanded values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_relationship_values_check'
  ) THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_relationship_values_check 
      CHECK (relationship IN ('Child', 'Spouse', 'Parent', 'Grandparent', 'Extended Family', 'Other'));
  END IF;
END $$;
