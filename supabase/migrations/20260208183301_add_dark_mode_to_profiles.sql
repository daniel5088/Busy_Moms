/*
  # Add dark mode preference to profiles

  1. Changes
    - Add `dark_mode` column to `profiles` table
      - Type: boolean
      - Nullable: true (null = follow system preference)
      - Default: null
      - Meaning: 
        - null = follow system preference
        - true = force dark mode
        - false = force light mode
  
  2. Security
    - Inherits existing RLS policies from profiles table
    - Users can read and update their own dark_mode preference
*/

-- Add dark_mode column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'dark_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN dark_mode boolean DEFAULT null;
  END IF;
END $$;