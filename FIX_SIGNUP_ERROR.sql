/*
  # Fix User Signup Error

  This SQL fixes the "Database error saving new user" error that occurs during signup.

  ## Problem
  The handle_new_user() trigger tries to update auth.users table directly,
  which requires superuser privileges that the function doesn't have.

  ## Solution
  Drop the problematic trigger and function to allow normal signup to work.

  ## How to Apply
  1. Go to your Supabase Dashboard
  2. Navigate to SQL Editor
  3. Copy and paste this entire file
  4. Click "Run" to execute
*/

-- Drop the trigger and function that's causing signup failures
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verify the trigger is gone
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- This should return no rows, confirming the trigger is removed
