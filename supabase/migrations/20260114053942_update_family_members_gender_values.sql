/*
  # Update Family Members Gender Values

  1. Changes
    - Update gender column constraint from ('Boy', 'Girl', 'Other') to ('Male', 'Female', 'Other')
    - Migrate existing records to use new values
  
  2. Notes
    - This migration updates the constraint to use more appropriate gender values
    - Existing data is migrated automatically: Boy -> Male, Girl -> Female
*/

-- Drop the old constraint first
ALTER TABLE family_members 
DROP CONSTRAINT IF EXISTS family_members_gender_check;

-- Update existing data
UPDATE family_members 
SET gender = 'Male' 
WHERE gender = 'Boy';

UPDATE family_members 
SET gender = 'Female' 
WHERE gender = 'Girl';

-- Add the new constraint with updated values
ALTER TABLE family_members
ADD CONSTRAINT family_members_gender_check 
CHECK (gender IN ('Male', 'Female', 'Other'));