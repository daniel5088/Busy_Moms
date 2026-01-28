/*
  # Add 'birthday' to events source constraint

  1. Changes
    - Drop existing events_source_check constraint
    - Recreate constraint with 'birthday' added to allowed values
    - Preserves all existing allowed values: manual, whatsapp, calendar_sync, ai, google
    - Adds new value: birthday

  2. Notes
    - Required for birthdayEventsService to create birthday events
    - Idempotent: safe to run multiple times
*/

-- Drop the existing constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;

-- Recreate with 'birthday' included
ALTER TABLE events ADD CONSTRAINT events_source_check 
  CHECK (source = ANY (ARRAY['manual'::text, 'whatsapp'::text, 'calendar_sync'::text, 'ai'::text, 'google'::text, 'birthday'::text]));