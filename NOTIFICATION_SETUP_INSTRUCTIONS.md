# 🔔 Notification System Setup Instructions

## ⚠️ ACTION REQUIRED - One-Time Database Setup

The notification system code is ready, but you need to create the database tables in Supabase.

**This is a one-time setup that takes about 2 minutes.**

---

## Quick Setup (2 minutes)

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rtvwcyrksplhsgycyfzo
2. Click on the **SQL Editor** in the left sidebar (icon looks like a database with a play button)

### Step 2: Execute the Migration

1. Click **New Query** button
2. Open the file: `scripts/setup-notification-tables.sql` from your project
3. Copy all the SQL content
4. Paste it into the SQL Editor
5. Click the **Run** button (or press Ctrl/Cmd + Enter)

### Step 3: Verify Tables Created

After running the SQL, you should see:
- ✓ Tables created: `notification_settings` and `notification_queue`
- ✓ Indexes created
- ✓ RLS policies enabled
- ✓ Triggers configured

You can verify by going to **Table Editor** in the Supabase dashboard and checking that both tables exist.

### Step 4: Test the System

1. Refresh your app
2. Go to Settings → Notifications → "Notification Settings"
3. Grant browser permission when prompted
4. Configure your notification preferences
5. Create a test event with a future date/time
6. You should receive a notification before the event!

## What Was Created

**Tables:**
- `notification_settings` - Stores user notification preferences
- `notification_queue` - Stores scheduled and sent notifications

**Security:**
- Row Level Security (RLS) enabled on both tables
- Users can only access their own data

**Automation:**
- New users automatically get default notification settings
- Timestamps auto-update when settings change

## Troubleshooting

**If you get permission errors:**
- Make sure you're logged into the correct Supabase project
- Verify you have admin access to the project

**If tables already exist:**
- The SQL uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times
- If you see errors about existing objects, that's okay - it means they're already created

**Still having issues?**
- Check the Supabase logs for detailed error messages
- Verify your database connection is working
- Try running each section of the SQL separately to identify which part is failing

## Alternative: Manual Table Creation

If the SQL file doesn't work, you can create the tables manually through the Supabase Table Editor, but using the SQL Editor is much faster and ensures all relationships and policies are set up correctly.
