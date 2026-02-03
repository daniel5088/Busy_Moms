# Google Sign-In Database Error Fix

## Issue Summary

**Error Message:**
```
Google sign-in failed:
Database error saving new user
Please check your OAuth configuration.
```

**Root Cause:**
A database trigger (`on_auth_user_created`) was attempting to modify Supabase's protected `auth.users` table without proper permissions, causing all signups (including Google OAuth) to fail.

## What Was Fixed

1. **Created Fix Migration:** `supabase/migrations/20251111000300_fix_signup_error_remove_trigger.sql`
   - Drops the problematic `on_auth_user_created` trigger
   - Drops the `handle_new_user()` function

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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

6. Click **Run** or press Ctrl+Enter
7. Verify success - you should see "Success. No rows returned"

### Verification

Run this query to confirm the trigger is removed:

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected Result:** No rows (empty result set)

## What Happens After the Fix

1. Google sign-in will work immediately
2. Regular email/password signup will work
3. User profiles are created automatically by application code
4. Roles are assigned through user metadata during signup:
   - `@bmaapp.com` emails → `developer` role
   - All others → `user` role

## Technical Details

### The Problematic Code

The trigger function tried to update `auth.users` directly:

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
- `supabase/migrations/20251111000300_fix_signup_error_remove_trigger.sql` - Fix migration

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
