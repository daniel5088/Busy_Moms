/*
  # Add RLS Policies for Affiliate Matrix Table

  1. Security Changes
    - Enable RLS on `affiliate_matrix` table if not already enabled
    - Add policy to allow all authenticated users to read affiliate matrix data
    - Add policy to allow anonymous users to read affiliate matrix data (for public gift browsing)
  
  2. Purpose
    - The affiliate_matrix table contains curated gift suggestions with affiliate links
    - This data should be publicly readable as it's used for gift discovery
    - No user-specific data is stored in this table, so public read access is safe
  
  3. Notes
    - Uses IF NOT EXISTS to prevent errors if policies already exist
    - Both authenticated and anonymous users can read the data
    - No write permissions are granted (only admins should modify this table)
*/

-- Enable RLS on affiliate_matrix table
ALTER TABLE affiliate_matrix ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read affiliate matrix
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'affiliate_matrix' 
    AND policyname = 'affiliate_matrix_select_authenticated'
  ) THEN
    CREATE POLICY "affiliate_matrix_select_authenticated"
    ON affiliate_matrix
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Policy for anonymous users to read affiliate matrix
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'affiliate_matrix' 
    AND policyname = 'affiliate_matrix_select_anon'
  ) THEN
    CREATE POLICY "affiliate_matrix_select_anon"
    ON affiliate_matrix
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;