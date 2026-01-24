-- Wellness Feature Database Setup
-- Run this SQL script in your Supabase SQL Editor to create the necessary tables

-- Create cycle_data table
CREATE TABLE IF NOT EXISTS cycle_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start_date date NOT NULL,
  cycle_length integer DEFAULT 28 CHECK (cycle_length >= 20 AND cycle_length <= 40),
  period_length integer DEFAULT 5 CHECK (period_length >= 2 AND period_length <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cycle_symptoms table
CREATE TABLE IF NOT EXISTS cycle_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symptom_date date NOT NULL,
  symptoms text[] DEFAULT '{}',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cycle_history table
CREATE TABLE IF NOT EXISTS cycle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start_date date NOT NULL,
  cycle_length integer NOT NULL,
  period_length integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE cycle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own cycle data" ON cycle_data;
DROP POLICY IF EXISTS "Users can insert own cycle data" ON cycle_data;
DROP POLICY IF EXISTS "Users can update own cycle data" ON cycle_data;
DROP POLICY IF EXISTS "Users can delete own cycle data" ON cycle_data;
DROP POLICY IF EXISTS "Users can read own symptoms" ON cycle_symptoms;
DROP POLICY IF EXISTS "Users can insert own symptoms" ON cycle_symptoms;
DROP POLICY IF EXISTS "Users can update own symptoms" ON cycle_symptoms;
DROP POLICY IF EXISTS "Users can delete own symptoms" ON cycle_symptoms;
DROP POLICY IF EXISTS "Users can read own history" ON cycle_history;
DROP POLICY IF EXISTS "Users can insert own history" ON cycle_history;
DROP POLICY IF EXISTS "Users can delete own history" ON cycle_history;

-- RLS Policies for cycle_data
CREATE POLICY "Users can read own cycle data"
  ON cycle_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cycle data"
  ON cycle_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycle data"
  ON cycle_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cycle data"
  ON cycle_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for cycle_symptoms
CREATE POLICY "Users can read own symptoms"
  ON cycle_symptoms
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms"
  ON cycle_symptoms
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptoms"
  ON cycle_symptoms
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptoms"
  ON cycle_symptoms
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for cycle_history
CREATE POLICY "Users can read own history"
  ON cycle_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON cycle_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON cycle_history
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_cycle_data_updated_at ON cycle_data;
CREATE TRIGGER update_cycle_data_updated_at
  BEFORE UPDATE ON cycle_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cycle_symptoms_updated_at ON cycle_symptoms;
CREATE TRIGGER update_cycle_symptoms_updated_at
  BEFORE UPDATE ON cycle_symptoms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cycle_data_user_id ON cycle_data(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_symptoms_user_date ON cycle_symptoms(user_id, symptom_date);
CREATE INDEX IF NOT EXISTS idx_cycle_history_user_date ON cycle_history(user_id, period_start_date);
