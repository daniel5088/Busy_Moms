/*
  # Fix Gift Matrix RLS Policy Security Issue

  1. Problem
    - The "Authenticated users can update click counts" policy uses USING (true) and WITH CHECK (true)
    - This allows ANY authenticated user to update ANY field in ANY row
    - Major security vulnerability: users could modify prices, affiliate URLs, descriptions, etc.

  2. Solution
    - Drop the overly permissive UPDATE policy
    - Create a secure function to increment click counts
    - Grant EXECUTE permission on the function to authenticated users
    - Only the click_count and last_clicked_at fields can be modified via the function

  3. Security Benefits
    - Follows principle of least privilege
    - Users can only track clicks, not modify gift data
    - All other fields are protected from unauthorized modification
*/

-- Drop the insecure UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update click counts" ON gift_matrix;

-- Create a secure function to increment click counts
CREATE OR REPLACE FUNCTION increment_gift_click_count(gift_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only increment click_count and update last_clicked_at
  -- This function is SECURITY DEFINER, so it runs with the privileges of the function owner
  -- This allows updating the table even though users don't have UPDATE permission via RLS
  UPDATE gift_matrix
  SET
    click_count = COALESCE(click_count, 0) + 1,
    last_clicked_at = now()
  WHERE id = gift_id AND active = true;
END;
$$;

-- Grant EXECUTE permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_gift_click_count(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_gift_click_count IS 'Securely increments the click count for a gift item. Only increments if the gift is active. This is the only way authenticated users can modify gift_matrix data.';
