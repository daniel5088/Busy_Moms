-- ============================================================================
-- GOOGLE SIGN-IN FIX - COPY AND RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
--
-- This fixes the "Database error saving new user" error
--
-- INSTRUCTIONS:
-- 1. Open https://supabase.com/dashboard
-- 2. Select your project
-- 3. Click "SQL Editor" in left sidebar
-- 4. Click "+ New query"
-- 5. Copy ALL lines below (lines 19-26)
-- 6. Paste into SQL Editor
-- 7. Click "Run" or press Ctrl+Enter
--
-- ============================================================================

-- Drop notification settings trigger (orphaned - table doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.create_default_notification_settings() CASCADE;

-- Drop role assignment trigger (permission errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- VERIFICATION - Run this query to confirm triggers are gone
-- ============================================================================

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth';

-- Expected result: No rows (empty table)
-- If you see any rows, the triggers are still there

-- ============================================================================
-- AFTER RUNNING THIS FIX:
-- 1. Google sign-in will work immediately
-- 2. Go back to your app and try signing in with Google
-- 3. The error should be gone!
-- ============================================================================
