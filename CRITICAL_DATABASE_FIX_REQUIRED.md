# CRITICAL: Database Fix Required for Signup

## Problem
**Signup is currently broken** due to a database trigger error. Users cannot create new accounts until this is fixed.

## Error Message
```
Database error saving new user
AuthApiError: Database error saving new user
```

## Fix (Takes 30 seconds)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run This SQL
Copy and paste these two lines into the SQL Editor:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
```

### Step 3: Click Run
Click the **Run** button (or press Ctrl+Enter)

## What This Does
- Removes a problematic database trigger that tries to modify the auth.users table
- The trigger doesn't have the necessary permissions, causing all signups to fail
- Role assignment is already handled properly in the application code

## Verification
After running the SQL:
1. Try signing up with a new account
2. You should be able to create an account successfully
3. The error will no longer appear

---

**This fix is also documented in `FIX_SIGNUP_ERROR.sql` in the project root.**
