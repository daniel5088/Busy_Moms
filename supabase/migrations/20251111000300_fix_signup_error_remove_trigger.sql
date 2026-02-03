/*
  Fix User Signup Error - Remove Problematic Trigger

  This migration removes the handle_new_user() trigger that was causing
  "Database error saving new user" errors during signup.

  ## Problem
  The previous migration (20251111000200_assign_roles_on_signup.sql) created
  a trigger that attempted to update the auth.users table directly. This
  requires superuser privileges that the function doesn't have, causing ALL
  signups (including Google OAuth) to fail with a 500 error.

  ## Solution
  Remove the problematic trigger and function. Role assignment is already
  handled in the application code through user metadata during signup.

  ## Impact
  - Signup will work immediately after this migration
  - Google OAuth sign-in will work
  - Role assignment will be handled by the application (useAuth.ts)
  - Developer roles for @bmaapp.com emails can be assigned in application code
*/

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop the function that the trigger was calling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verify the trigger is removed (this query should return no rows)
-- Uncomment to run verification:
-- SELECT trigger_name, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';
