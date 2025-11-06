/*
  # Add color and relationship fields to family_members table

  1. Changes
    - Add `color` column (text, required) - stores hex color code for visual identification
    - Add `relationship` column (text, required) - stores relationship type (Mom, Dad, Child, Other)
    - Add constraints to validate color format (hex color) and relationship values
    - Add default values for existing rows if any exist

  2. Constraints
    - Color must be a valid hex color code starting with #
    - Relationship must be one of: Mom, Dad, Child, Other

  3. Notes
    - Existing rows will get default values: color='#A5D8FF' (light blue), relationship='Other'
    - These fields are required for the onboarding flow and family member management
*/

-- Add color column with default for existing rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'color'
  ) THEN
    ALTER TABLE family_members ADD COLUMN color text DEFAULT '#A5D8FF' NOT NULL;
  END IF;
END $$;

-- Add relationship column with default for existing rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'family_members' AND column_name = 'relationship'
  ) THEN
    ALTER TABLE family_members ADD COLUMN relationship text DEFAULT 'Other' NOT NULL;
  END IF;
END $$;

-- Add constraint for color format (hex color code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'family_members' AND constraint_name = 'family_members_color_check'
  ) THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_color_check 
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

-- Add constraint for relationship values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'family_members' AND constraint_name = 'family_members_relationship_check'
  ) THEN
    ALTER TABLE family_members ADD CONSTRAINT family_members_relationship_check 
    CHECK (relationship = ANY (ARRAY['Mom'::text, 'Dad'::text, 'Child'::text, 'Other'::text]));
  END IF;
END $$;