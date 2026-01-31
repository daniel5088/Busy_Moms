/*
  # Notification System Setup

  1. New Tables
    - `notification_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `events_enabled` (boolean) - Enable notifications for events
      - `reminders_enabled` (boolean) - Enable notifications for reminders
      - `tasks_enabled` (boolean) - Enable notifications for tasks
      - `shopping_enabled` (boolean) - Enable notifications for shopping
      - `wellness_enabled` (boolean) - Enable notifications for wellness/cycle tracker
      - `birthdays_enabled` (boolean) - Enable notifications for birthdays
      - `default_event_reminder_minutes` (integer) - Default minutes before event to notify
      - `quiet_hours_start` (time) - Start of quiet hours (no notifications)
      - `quiet_hours_end` (time) - End of quiet hours
      - `notification_sound_enabled` (boolean) - Enable notification sounds
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `notification_queue`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `notification_type` (text) - Type: event, reminder, task, shopping, wellness, birthday
      - `title` (text) - Notification title
      - `body` (text) - Notification body
      - `related_id` (uuid) - ID of related item (event_id, reminder_id, etc)
      - `related_table` (text) - Table name of related item
      - `scheduled_for` (timestamptz) - When to send notification
      - `sent_at` (timestamptz) - When notification was sent (null if not sent)
      - `status` (text) - pending, sent, failed, cancelled
      - `data` (jsonb) - Additional data for notification action
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own settings and notifications
*/

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  events_enabled boolean DEFAULT true,
  reminders_enabled boolean DEFAULT true,
  tasks_enabled boolean DEFAULT true,
  shopping_enabled boolean DEFAULT true,
  wellness_enabled boolean DEFAULT true,
  birthdays_enabled boolean DEFAULT true,
  default_event_reminder_minutes integer DEFAULT 15,
  quiet_hours_start time DEFAULT NULL,
  quiet_hours_end time DEFAULT NULL,
  notification_sound_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notification_queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('event', 'reminder', 'task', 'shopping', 'wellness', 'birthday')),
  title text NOT NULL,
  body text NOT NULL,
  related_id uuid,
  related_table text,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz DEFAULT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_status ON notification_queue(user_id, status);

-- Enable Row Level Security
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Policies for notification_settings
CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for notification_queue
CREATE POLICY "Users can view own notifications"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notification_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notification_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notification_queue FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_settings updated_at
DROP TRIGGER IF EXISTS update_notification_settings_updated_at_trigger ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at_trigger
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- Function to create default notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification settings on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_settings();
