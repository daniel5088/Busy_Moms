/*
  # Create Cycle Tracker Tables

  ## Overview
  This migration creates the necessary tables for the wellness/cycle tracking feature,
  allowing users to track menstrual cycles, symptoms, and get AI-powered insights.

  ## Instructions
  1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/rtvwcyrksplhsgycyfzo/sql/new
  2. Copy and paste this entire SQL script
  3. Click "Run" to execute it

  ## New Tables

  ### `cycle_data`
  Main cycle tracking information for each user
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `period_start_date` (date) - When the current period started
  - `cycle_length` (integer) - Average cycle length in days
  - `period_length` (integer) - Average period duration in days
  - `created_at` (timestamptz) - When record was created
  - `updated_at` (timestamptz) - When record was last updated

  ### `cycle_symptoms`
  Daily symptom tracking for users
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `symptom_date` (date) - Date symptoms were experienced
  - `symptoms` (text[]) - Array of symptom names
  - `notes` (text) - Optional notes about symptoms
  - `created_at` (timestamptz) - When record was created
  - `updated_at` (timestamptz) - When record was last updated

  ### `cycle_history`
  Historical cycle data for tracking patterns over time
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `period_start_date` (date) - Historical period start date
  - `cycle_length` (integer) - Cycle length for that period
  - `period_length` (integer) - Period duration
  - `created_at` (timestamptz) - When record was created

  ## Security
  - Enable RLS on all tables
  - Users can only read/write their own data
  - Authenticated users only
*/

-- Create cycle_data table
CREATE TABLE IF NOT EXISTS cycle_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start_date date NOT NULL,
  cycle_length integer NOT NULL DEFAULT 28,
  period_length integer NOT NULL DEFAULT 5,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create cycle_symptoms table
CREATE TABLE IF NOT EXISTS cycle_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symptom_date date NOT NULL,
  symptoms text[] DEFAULT ARRAY[]::text[] NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create cycle_history table
CREATE TABLE IF NOT EXISTS cycle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_start_date date NOT NULL,
  cycle_length integer NOT NULL,
  period_length integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cycle_data_user_id ON cycle_data(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_symptoms_user_id ON cycle_symptoms(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_symptoms_date ON cycle_symptoms(symptom_date);
CREATE INDEX IF NOT EXISTS idx_cycle_history_user_id ON cycle_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cycle_history_date ON cycle_history(period_start_date);

-- Add unique constraint to prevent duplicate cycle data per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_cycle_data_unique_user'
  ) THEN
    CREATE UNIQUE INDEX idx_cycle_data_unique_user ON cycle_data(user_id, created_at DESC);
  END IF;
END $$;

-- Add unique constraint to prevent duplicate symptoms for same date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_cycle_symptoms_unique_user_date'
  ) THEN
    CREATE UNIQUE INDEX idx_cycle_symptoms_unique_user_date ON cycle_symptoms(user_id, symptom_date);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE cycle_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own cycle data" ON cycle_data;
DROP POLICY IF EXISTS "Users can insert own cycle data" ON cycle_data;
DROP POLICY IF EXISTS "Users can update own cycle data" ON cycle_data;
DROP POLICY IF EXISTS "Users can delete own cycle data" ON cycle_data;

DROP POLICY IF EXISTS "Users can view own symptoms" ON cycle_symptoms;
DROP POLICY IF EXISTS "Users can insert own symptoms" ON cycle_symptoms;
DROP POLICY IF EXISTS "Users can update own symptoms" ON cycle_symptoms;
DROP POLICY IF EXISTS "Users can delete own symptoms" ON cycle_symptoms;

DROP POLICY IF EXISTS "Users can view own cycle history" ON cycle_history;
DROP POLICY IF EXISTS "Users can insert own cycle history" ON cycle_history;
DROP POLICY IF EXISTS "Users can update own cycle history" ON cycle_history;
DROP POLICY IF EXISTS "Users can delete own cycle history" ON cycle_history;

-- RLS Policies for cycle_data
CREATE POLICY "Users can view own cycle data"
  ON cycle_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cycle data"
  ON cycle_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycle data"
  ON cycle_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cycle data"
  ON cycle_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for cycle_symptoms
CREATE POLICY "Users can view own symptoms"
  ON cycle_symptoms FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms"
  ON cycle_symptoms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptoms"
  ON cycle_symptoms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptoms"
  ON cycle_symptoms FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for cycle_history
CREATE POLICY "Users can view own cycle history"
  ON cycle_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cycle history"
  ON cycle_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cycle history"
  ON cycle_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cycle history"
  ON cycle_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create or replace trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
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
