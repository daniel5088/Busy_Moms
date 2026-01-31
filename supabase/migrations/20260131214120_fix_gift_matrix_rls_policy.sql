/*
  # Fix Gift Matrix RLS Policy Security Issue

  ## Problem
  The table `public.gift_matrix` has an RLS policy "Authenticated users can update click counts"
  with USING (true) and WITH CHECK (true), which allows unrestricted access for UPDATE operations.
  This effectively bypasses row-level security and allows any authenticated user to:
  - Modify prices, descriptions, affiliate URLs
  - Update any field on any row
  - Potentially corrupt or manipulate gift data

  ## Solution
  1. Drop the overly permissive UPDATE policy
  2. Create a secure function `increment_gift_click_count(uuid)` with SECURITY DEFINER
  3. Grant EXECUTE permission to authenticated users
  4. Users can only increment click counts through the function, not modify other fields

  ## Security Benefits
  - Follows principle of least privilege
  - Users can track clicks without ability to modify gift data
  - All sensitive fields (prices, URLs, descriptions) are protected
  - Audit trail maintained through function-based access
*/

-- Drop the insecure UPDATE policy if it exists
DROP POLICY IF EXISTS "Authenticated users can update click counts" ON gift_matrix;

-- Create or replace the secure function to increment click counts
CREATE OR REPLACE FUNCTION increment_gift_click_count(gift_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment click_count and update last_clicked_at
  -- This function runs with elevated privileges (SECURITY DEFINER)
  -- allowing it to update the table even though users don't have direct UPDATE permission
  UPDATE gift_matrix
  SET
    click_count = COALESCE(click_count, 0) + 1,
    last_clicked_at = now()
  WHERE id = gift_id AND active = true;

  -- If no rows were updated, it means the gift doesn't exist or is inactive
  -- We silently succeed (no error) to avoid leaking information about inactive gifts
END;
$$;

-- Grant EXECUTE permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_gift_click_count(uuid) TO authenticated;

-- Revoke UPDATE permission on the table from authenticated users
-- This ensures click tracking can ONLY happen through the secure function
-- Note: We're being explicit here even though RLS would block it anyway
REVOKE UPDATE ON gift_matrix FROM authenticated;

-- Add documentation comment
COMMENT ON FUNCTION increment_gift_click_count IS 'Securely increments the click count for a gift item. Only increments if the gift is active. This is the only way authenticated users can modify gift_matrix data.';

-- Verify no other permissive policies exist
-- This is a safety check to ensure we haven't missed anything
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'gift_matrix'
    AND cmd = 'UPDATE'
    AND (qual = 'true' OR with_check = 'true');

  IF policy_count > 0 THEN
    RAISE WARNING 'Found % UPDATE policies with unrestricted access on gift_matrix. Please review.', policy_count;
  END IF;
END;
$$;
