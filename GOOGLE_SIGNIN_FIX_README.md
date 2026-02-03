# Google Sign-In Database Error Fix

## Issue Summary

**Error Message:**
```
Google sign-in failed:
Database error saving new user
Please check your OAuth configuration.
```

**Root Cause:**
Multiple orphaned database triggers on the `auth.users` table are causing signup failures:

1. **`on_auth_user_created`** - Attempts to modify `auth.users` table without proper permissions
2. **`on_auth_user_created_notification_settings`** - References `notification_settings` table that doesn't exist yet
3. **`Add_Profile`** - Manually created trigger (not in migrations) causing unknown errors

These triggers fire when a new user signs up, but fail because either:
- They lack permissions to modify protected tables
- They reference tables that haven't been created yet
- They have unknown implementation errors

This causes ALL signups (including Google OAuth) to fail.

## What Was Fixed

1. **Created Comprehensive Fix Migration:** `supabase/migrations/20260203000000_fix_orphaned_triggers.sql`
   - Drops the `on_auth_user_created` trigger and `handle_new_user()` function
   - Drops the `on_auth_user_created_notification_settings` trigger and `create_default_notification_settings()` function
   - Cleans up all orphaned triggers on `auth.users` table

2. **Disabled Problematic Migration:** Renamed `20251111000200_assign_roles_on_signup.sql` to `.DISABLED`

3. **Application Already Has Fallback Logic:** The `useAuth.ts` hook already handles:
   - Manual profile creation if triggers fail
   - Role assignment through user metadata
   - Error recovery and retry logic

## How to Apply the Fix

### Option 1: Run Migration via Supabase CLI (Recommended)

If you have Supabase CLI set up:

```bash
supabase db push
```

This will apply the new migration file automatically.

### Option 2: Manual SQL Execution

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Drop notification settings trigger (orphaned - table doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.create_default_notification_settings() CASCADE;

-- Drop role assignment trigger (permission errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop Add_Profile trigger (manually created, causes signup failures)
DROP TRIGGER IF EXISTS "Add_Profile" ON auth.users CASCADE;
DROP TRIGGER IF EXISTS add_profile ON auth.users CASCADE;
```

6. Click **Run** or press Ctrl+Enter
7. Verify success - you should see "Success. No rows returned"

### Verification

Run this query to confirm all triggers are removed:

```sql
-- Check for any remaining triggers on auth.users
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_schema = 'auth';
```

**Expected Result:** No rows (empty result set) - all orphaned triggers should be gone

## What Happens After the Fix

1. Google sign-in will work immediately
2. Regular email/password signup will work
3. User profiles are created automatically by application code
4. Roles are assigned through user metadata during signup:
   - `@bmaapp.com` emails → `developer` role
   - All others → `user` role

## Technical Details

### Problem 1: Orphaned Notification Trigger

**Error from Postgres logs:**
```
ERROR: relation "notification_settings" does not exist
Context: PL/pgSQL function public.create_default_notification_settings() line 3
```

The trigger `on_auth_user_created_notification_settings` tries to insert into `notification_settings` table, but the table doesn't exist because the migration `20260128035241_create_notification_system.sql` hasn't been applied yet.

**Problematic code:**
```sql
INSERT INTO notification_settings (user_id)
VALUES (NEW.id)
ON CONFLICT (user_id) DO NOTHING;
```

### Problem 2: Permission-Based Trigger Failure

The trigger function `handle_new_user()` tried to update `auth.users` directly:

```sql
update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                            || jsonb_build_object('role', new_role)
 where id = new.id;
```

This requires superuser privileges that the `security definer` function doesn't have.

### The Solution

Role assignment is now handled in the application layer (`src/hooks/useAuth.ts`):

**For regular signup (lines 232-238):**
- Detects the database error
- Falls back to manual profile creation
- Sets role based on email domain

**For Google OAuth (lines 346-366):**
- Uses `signInWithOAuth` with Google provider
- Profile creation handled by `handleUserProfile()` function
- Google tokens captured and stored for calendar/tasks integration

### Files Involved

- `src/hooks/useAuth.ts` - Auth logic with fallback handling
- `src/components/forms/AuthForm.tsx` - UI error handling
- `src/lib/auth-config.ts` - Google OAuth configuration
- `src/services/googleTokenStorage.ts` - Token management
- `supabase/migrations/20260203000000_fix_orphaned_triggers.sql` - Comprehensive fix migration
- `supabase/migrations/20251111000300_fix_signup_error_remove_trigger.sql` - Partial fix (superseded)
- `supabase/migrations/20260128035241_create_notification_system.sql` - Notification system (to be applied after fix)

## Testing the Fix

After applying the fix, test:

1. **Google Sign-In:**
   - Click "Sign in with Google"
   - Authorize the app
   - Should redirect back and create account successfully

2. **Regular Signup:**
   - Enter email and password
   - Should create account without errors

3. **Developer Role:**
   - Sign up with `@bmaapp.com` email
   - Verify role is set to `developer` in user metadata

## Need Help?

If signup still doesn't work after applying the fix:

1. Check Supabase logs for detailed error messages
2. Verify the trigger was actually removed (run verification query)
3. Check that environment variables are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Ensure Google OAuth is configured in Supabase Dashboard:
   - Settings → Authentication → Providers → Google
   - Client ID and Client Secret are set
   - Authorized redirect URIs include your app URL

## Related Files

- `FIX_SIGNUP_ERROR.sql` - Manual fix script (can be deleted after fix is applied)
- `SIGNUP_BROKEN_FIX_NOW.txt` - Alert file (can be deleted after fix is applied)
