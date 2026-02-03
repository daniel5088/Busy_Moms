/*
  # Weather Widget New Fields - Database Migration

  This migration adds new weather-related fields to the user_settings table
  to support the enhanced weather display features.

  ## New Fields Added:
  - show_feels_like: Display "feels like" temperature
  - show_heat_index: Display heat index
  - show_cloud_cover: Display cloud cover percentage
  - show_thunderstorm_probability: Display thunderstorm probability
  - show_sun_events: Display sunrise/sunset times
  - show_moon_events: Display moon phase and moonrise/moonset times

  ## How to Apply:
  1. Go to your Supabase Dashboard
  2. Navigate to SQL Editor
  3. Copy and paste the SQL below
  4. Click "Run"
*/

-- Add new weather display settings columns to user_settings table
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS show_feels_like BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_heat_index BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_cloud_cover BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_thunderstorm_probability BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_sun_events BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_moon_events BOOLEAN DEFAULT false;

-- Update any existing records to have defaults
UPDATE user_settings
SET
  show_feels_like = COALESCE(show_feels_like, false),
  show_heat_index = COALESCE(show_heat_index, false),
  show_cloud_cover = COALESCE(show_cloud_cover, false),
  show_thunderstorm_probability = COALESCE(show_thunderstorm_probability, false),
  show_sun_events = COALESCE(show_sun_events, false),
  show_moon_events = COALESCE(show_moon_events, false)
WHERE
  show_feels_like IS NULL
  OR show_heat_index IS NULL
  OR show_cloud_cover IS NULL
  OR show_thunderstorm_probability IS NULL
  OR show_sun_events IS NULL
  OR show_moon_events IS NULL;
