/*
  # Weather System Setup

  This migration creates the weather_settings and weather_cache tables
  with proper Row Level Security policies.

  ## How to Apply
  1. Go to your Supabase Dashboard
  2. Navigate to SQL Editor
  3. Create a new query
  4. Copy and paste this entire file
  5. Click "Run" to execute
*/

-- Create weather_settings table
CREATE TABLE IF NOT EXISTS weather_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_location text,
  latitude numeric(10, 6),
  longitude numeric(10, 6),
  temperature_unit text DEFAULT 'fahrenheit' CHECK (temperature_unit IN ('celsius', 'fahrenheit')),
  wind_speed_unit text DEFAULT 'mph' CHECK (wind_speed_unit IN ('kmh', 'mph', 'ms', 'kn')),
  precipitation_unit text DEFAULT 'inch' CHECK (precipitation_unit IN ('mm', 'inch')),
  timezone text DEFAULT 'UTC',
  include_current boolean DEFAULT true,
  include_hourly boolean DEFAULT true,
  include_daily boolean DEFAULT true,
  hourly_hours integer DEFAULT 24 CHECK (hourly_hours >= 1 AND hourly_hours <= 168),
  daily_days integer DEFAULT 7 CHECK (daily_days >= 1 AND daily_days <= 16),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create weather_cache table
CREATE TABLE IF NOT EXISTS weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_key text NOT NULL,
  weather_data jsonb NOT NULL,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weather_settings_user_id ON weather_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_user_id ON weather_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_weather_cache_location_key ON weather_cache(location_key);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires_at ON weather_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE weather_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Users can view own weather settings" ON weather_settings;
DROP POLICY IF EXISTS "Users can insert own weather settings" ON weather_settings;
DROP POLICY IF EXISTS "Users can update own weather settings" ON weather_settings;
DROP POLICY IF EXISTS "Users can delete own weather settings" ON weather_settings;
DROP POLICY IF EXISTS "Users can view own weather cache" ON weather_cache;
DROP POLICY IF EXISTS "Users can insert own weather cache" ON weather_cache;
DROP POLICY IF EXISTS "Users can update own weather cache" ON weather_cache;
DROP POLICY IF EXISTS "Users can delete own weather cache" ON weather_cache;

-- RLS Policies for weather_settings
CREATE POLICY "Users can view own weather settings"
  ON weather_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather settings"
  ON weather_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather settings"
  ON weather_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weather settings"
  ON weather_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for weather_cache
CREATE POLICY "Users can view own weather cache"
  ON weather_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather cache"
  ON weather_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather cache"
  ON weather_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weather cache"
  ON weather_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_weather_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM weather_cache
  WHERE expires_at < now();
END;
$$;

-- Trigger to update updated_at timestamp on weather_settings
CREATE OR REPLACE FUNCTION update_weather_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS weather_settings_updated_at ON weather_settings;

CREATE TRIGGER weather_settings_updated_at
  BEFORE UPDATE ON weather_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_weather_settings_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Weather system migration completed successfully!';
END $$;
