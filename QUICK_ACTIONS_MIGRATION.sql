/*
  # Create Customizable Quick Actions System

  Run this SQL in your Supabase SQL Editor:
  https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

  1. New Tables
    - `quick_action_types` - Available action types
    - `user_quick_actions` - User's customized actions

  2. Security
    - Enable RLS on both tables
    - Policies for secure access

  3. Initialization
    - Default action types
    - Auto-initialize for new users
*/

-- Create quick_action_types table
CREATE TABLE IF NOT EXISTS quick_action_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  default_enabled BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_quick_actions table
CREATE TABLE IF NOT EXISTS user_quick_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type_id TEXT NOT NULL REFERENCES quick_action_types(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0 AND position <= 8),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, action_type_id),
  UNIQUE(user_id, position)
);

-- Enable Row Level Security
ALTER TABLE quick_action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quick_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quick_action_types (read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can view quick action types" ON quick_action_types;
CREATE POLICY "Anyone can view quick action types"
  ON quick_action_types
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_quick_actions
DROP POLICY IF EXISTS "Users can view their own quick actions" ON user_quick_actions;
CREATE POLICY "Users can view their own quick actions"
  ON user_quick_actions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quick actions" ON user_quick_actions;
CREATE POLICY "Users can insert their own quick actions"
  ON user_quick_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quick actions" ON user_quick_actions;
CREATE POLICY "Users can update their own quick actions"
  ON user_quick_actions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quick actions" ON user_quick_actions;
CREATE POLICY "Users can delete their own quick actions"
  ON user_quick_actions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_quick_actions_user_id ON user_quick_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quick_actions_position ON user_quick_actions(user_id, position);
CREATE INDEX IF NOT EXISTS idx_user_quick_actions_enabled ON user_quick_actions(user_id, enabled) WHERE enabled = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_quick_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_quick_actions_updated_at_trigger ON user_quick_actions;
CREATE TRIGGER update_user_quick_actions_updated_at_trigger
  BEFORE UPDATE ON user_quick_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_quick_actions_updated_at();

-- Insert default quick action types
INSERT INTO quick_action_types (id, name, description, icon, default_enabled, sort_order) VALUES
  ('shopping', 'Shopping', 'Quick grocery shopping', 'ShoppingBag', true, 0),
  ('quick-links', 'Quick Links', 'Your favorite shortcuts', 'Link', true, 1),
  ('tasks', 'Tasks', 'Manage your to-do list', 'ListTodo', true, 2),
  ('contacts', 'Contacts', 'Your trusted network', 'UserCircle', true, 3),
  ('scan-events', 'Scan Events', 'Add events from photos', 'Camera', true, 4),
  ('cycle-tracker', 'Cycle Tracker', 'Track your wellness', 'Heart', true, 5),
  ('life-receipts', 'Life Receipts', 'Important documents', 'Receipt', true, 6),
  ('gift-finder', 'Gift Finder', 'Find perfect gifts', 'Gift', true, 7),
  ('recipes', 'Recipes', 'Browse recipes', 'BookOpen', false, 8)
ON CONFLICT (id) DO NOTHING;

-- Function to initialize user's quick actions with defaults
CREATE OR REPLACE FUNCTION initialize_user_quick_actions(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_quick_actions (user_id, action_type_id, position, enabled)
  SELECT
    p_user_id,
    id,
    sort_order,
    default_enabled
  FROM quick_action_types
  WHERE default_enabled = true
  ON CONFLICT (user_id, action_type_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
