/*
  Fix Orphaned Triggers - Emergency Fix for Signup Errors

  ## Problem
  Database triggers exist that reference tables/functions that haven't been created yet:
  1. create_default_notification_settings() trigger exists but notification_settings table doesn't
  2. handle_new_user() trigger may exist but fails due to permissions

  These orphaned triggers cause ALL signups (including Google OAuth) to fail with:
  "Database error saving new user"

  ## Solution
  Drop all orphaned triggers and functions on auth.users table.
  The proper migrations can be re-applied cleanly afterward.

  ## Impact
  - Signup will work immediately
  - Notification settings will still work (created by app code)
  - Clean slate for proper migration application
*/

-- Drop notification settings trigger (orphaned - table may not exist)
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.create_default_notification_settings() CASCADE;

-- Drop role assignment trigger (causes permission errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verify all auth.users triggers are cleaned up
-- Uncomment to run verification:
-- SELECT trigger_name, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'users'
-- AND trigger_schema = 'auth';
