/*
  # Add location coordinates and travel time to events

  1. Changes
    - Add location_lat (latitude) column to events table
    - Add location_lng (longitude) column to events table
    - Add travel_time_minutes column to store cached travel time from user's default address
    - Add travel_time_updated_at to track when travel time was last calculated

  2. Purpose
    - Enable Google Maps Directions API integration
    - Store geocoded coordinates for event locations
    - Cache travel times to reduce API calls
    - Support departure time calculations and route planning

  3. Impact
    - Existing events will have NULL values for new columns (backward compatible)
    - New events can store coordinates when location is entered
    - Travel times can be calculated on-demand or during sync
*/

-- Add location coordinates columns
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10, 8),
  ADD COLUMN IF NOT EXISTS location_lng NUMERIC(11, 8);

-- Add travel time caching columns
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS travel_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS travel_time_updated_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN events.location_lat IS 'Latitude of event location (geocoded from location field)';
COMMENT ON COLUMN events.location_lng IS 'Longitude of event location (geocoded from location field)';
COMMENT ON COLUMN events.travel_time_minutes IS 'Cached travel time in minutes from user default address';
COMMENT ON COLUMN events.travel_time_updated_at IS 'Timestamp when travel time was last calculated';

-- Create index on location coordinates for spatial queries (if needed in future)
CREATE INDEX IF NOT EXISTS events_location_coords_idx
  ON events(location_lat, location_lng)
  WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Create index on events with travel times for quick queries
CREATE INDEX IF NOT EXISTS events_travel_time_idx
  ON events(travel_time_minutes)
  WHERE travel_time_minutes IS NOT NULL;
