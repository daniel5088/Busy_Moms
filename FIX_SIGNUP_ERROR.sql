/*
  # Fix User Signup Error - REQUIRED TO ENABLE SIGNUP

  This SQL fixes the "Database error saving new user" error that occurs during signup.

  ## Problem
  The handle_new_user() trigger tries to update auth.users table directly,
  which requires superuser privileges that the function doesn't have.
  This causes ALL signups to fail with a 500 error.

  ## Solution
  Drop the problematic trigger and function to allow normal signup to work.
  Role assignment is already handled in the application code through metadata.

  ## CRITICAL: How to Apply (MUST BE DONE MANUALLY)
  1. Open your Supabase Dashboard at https://supabase.com/dashboard
  2. Select your project
  3. Click "SQL Editor" in the left sidebar
  4. Click "New Query"
  5. Copy ONLY lines 22-23 below (the DROP statements)
  6. Paste into the SQL Editor
  7. Click "Run" or press Ctrl+Enter

  ** SIGNUP WILL NOT WORK UNTIL THIS IS DONE **
*/

-- ==============================================================================
-- COPY THESE TWO LINES AND RUN THEM IN YOUR SUPABASE SQL EDITOR
-- ==============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ==============================================================================
-- THAT'S IT - SIGNUP WILL WORK IMMEDIATELY AFTER RUNNING THESE TWO LINES
-- ==============================================================================

-- Verify the trigger is gone
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- This should return no rows, confirming the trigger is removed
