/*
  # Add Birthday Fields to Family Members

  1. Changes
    - Add `birthday` column (date, nullable) - stores date of birth
    - Add `birthday_estimated` column (boolean, default false) - marks migrated/estimated birthdays
    - Migrate existing records: convert age to estimated birthday (January 1st of birth year)
    - Add check constraint: birthday cannot be in the future
    - Keep `age` column for backward compatibility during transition

  2. Migration Strategy
    - For records with age but no birthday: calculate birth year = current year - age
    - Set birthday to January 1st of calculated birth year
    - Mark as birthday_estimated = true
    - Idempotent: only updates records that don't already have a birthday

  3. Notes
    - Age will be computed from birthday going forward in application code
    - Users can update estimated birthdays to accurate dates
    - Existing age values remain in database but won't be updated
*/

-- Add birthday column (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE family_members ADD COLUMN birthday date;
  END IF;
END $$;

-- Add birthday_estimated column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'birthday_estimated'
  ) THEN
    ALTER TABLE family_members ADD COLUMN birthday_estimated boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add check constraint: birthday cannot be in the future
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'family_members_birthday_not_future'
  ) THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_birthday_not_future 
      CHECK (birthday IS NULL OR birthday <= CURRENT_DATE);
  END IF;
END $$;

-- Migrate existing records: convert age to estimated birthday
-- Only update records that have age but no birthday
DO $$
DECLARE
  current_year int := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  UPDATE family_members
  SET 
    birthday = make_date(current_year - age, 1, 1),
    birthday_estimated = true
  WHERE age IS NOT NULL 
    AND birthday IS NULL;
END $$;
