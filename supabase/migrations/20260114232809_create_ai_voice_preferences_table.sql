/*
  # Create AI Voice Preferences Table

  1. New Tables
    - `ai_voice_preferences`
      - `id` (uuid, primary key) - Unique identifier for the preference record
      - `user_id` (uuid, references auth.users) - The user who owns these preferences
      - `voice` (text) - Selected AI voice (alloy, echo, fable, onyx, nova, shimmer, etc.)
      - `personality` (text) - AI personality type (friendly, professional, humorous)
      - `created_at` (timestamptz) - When the preferences were created
      - `updated_at` (timestamptz) - When the preferences were last updated

  2. Security
    - Enable RLS on `ai_voice_preferences` table
    - Add policy for authenticated users to read their own preferences
    - Add policy for authenticated users to insert their own preferences
    - Add policy for authenticated users to update their own preferences

  3. Important Notes
    - Each user can have only one set of AI voice preferences (enforced by unique constraint on user_id)
    - Default values: voice='shimmer', personality='friendly'
    - The voice field supports OpenAI's voice options
*/

-- Create the ai_voice_preferences table
CREATE TABLE IF NOT EXISTS ai_voice_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voice text DEFAULT 'shimmer' NOT NULL,
  personality text DEFAULT 'friendly' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_voice_preferences_user_id ON ai_voice_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE ai_voice_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own AI voice preferences
CREATE POLICY "Users can read own AI voice preferences"
  ON ai_voice_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own AI voice preferences
CREATE POLICY "Users can insert own AI voice preferences"
  ON ai_voice_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own AI voice preferences
CREATE POLICY "Users can update own AI voice preferences"
  ON ai_voice_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_voice_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_voice_preferences_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_ai_voice_preferences_updated_at_trigger
      BEFORE UPDATE ON ai_voice_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_ai_voice_preferences_updated_at();
  END IF;
END $$;