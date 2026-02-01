# Tutorial System Setup Instructions

The tutorial system has been implemented in the application. To complete the setup, you need to create the database table manually.

## Database Setup

Run the following SQL in your Supabase SQL Editor:

```sql
/*
  # Create Tutorial Tracking Table

  1. New Tables
    - `user_tutorials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tutorial_name` (text) - Name of the tutorial (dashboard, calendar, family_hub)
      - `completed` (boolean) - Whether the tutorial has been completed
      - `completed_at` (timestamptz) - When the tutorial was completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_tutorials` table
    - Add policies for authenticated users to manage their own tutorial progress
*/

CREATE TABLE IF NOT EXISTS user_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tutorial_name text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tutorial_name)
);

ALTER TABLE user_tutorials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tutorial progress" ON user_tutorials;
CREATE POLICY "Users can view own tutorial progress"
  ON user_tutorials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tutorial progress" ON user_tutorials;
CREATE POLICY "Users can insert own tutorial progress"
  ON user_tutorials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tutorial progress" ON user_tutorials;
CREATE POLICY "Users can update own tutorial progress"
  ON user_tutorials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_tutorials_user_id ON user_tutorials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorials_tutorial_name ON user_tutorials(user_id, tutorial_name);
```

## Features Implemented

### Tutorial Overlay Component
- Beautiful animated tutorial walkthrough system
- Highlights specific UI elements with pulsing border effects
- Adaptive positioning (top, bottom, left, right, center)
- Progress indicators showing current step
- Back/Next/Skip navigation
- Responsive design for mobile and desktop

### Tutorial Pages
1. **Dashboard Tutorial** - 6 steps covering:
   - Weather widget
   - Daily affirmations
   - Today's schedule
   - Quick actions
   - Navigation bar

2. **Calendar Tutorial** - 5 steps covering:
   - Calendar view
   - Add event button
   - Google Calendar sync
   - Event list
   - Event details

3. **Family Hub Tutorial** - 6 steps covering:
   - Family folders
   - Contacts management
   - Tasks and reminders
   - Shopping lists
   - Wellness tracking

### Settings Integration
A "Reset Tutorials" button has been added to Settings under "Help & Tutorials" section that allows users to:
- Restart all tutorials at any time
- See the walkthrough again if they need a refresher

### Automatic Behavior
- Tutorials show automatically only once for new users
- After completion or skipping, tutorials won't show again
- Each page has its own independent tutorial progress
- Tutorial state is saved to the database per user

## How It Works

1. When a user first visits Dashboard, Calendar, or Family Hub, the tutorial automatically starts
2. The tutorial highlights specific elements on the page and explains their purpose
3. Users can navigate through steps, go back, or skip the tutorial entirely
4. Once completed or skipped, the tutorial won't show again for that page
5. Users can reset all tutorials from Settings if they want to see them again

## Target IDs Used

The following element IDs have been added to the components for tutorial targeting:

**Dashboard:**
- `weather-widget` - Weather button in header
- `daily-affirmations` - Affirmations button in header
- `todays-schedule` - Today's events section
- `quick-links` - Quick actions grid
- `main-navigation` - Bottom navigation bar (to be added to App.tsx)

**Calendar:**
- `calendar-view` - Main calendar grid
- `add-event-button` - Add event button
- `google-calendar-sync` - Google Calendar connection banner
- `calendar-events` - Events list on the right side

**Family Hub:**
- `family-members-section` - Main grid container
- `family-folders-section` - Family Folders button
- `contacts-section` - Contacts button
- `tasks-section` - Tasks button
- `shopping-section` - Shopping button
- `wellness-section` - Wellness button
