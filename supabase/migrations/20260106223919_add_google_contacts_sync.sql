/*
  # Add Google Contacts Sync Support

  ## Changes
  - Add Google Contacts sync tracking fields to contacts table
    - `google_resource_name` (text) - Unique identifier from Google Contacts API
    - `google_etag` (text) - ETag for change detection and conflict resolution
    - `synced_at` (timestamptz) - Last successful sync timestamp
    - `sync_status` (text) - Current sync status (local_only, synced, sync_pending, sync_error)

  ## Notes
  - `google_resource_name` format: "people/{person_id}"
  - `sync_status` values:
    - `local_only` - Contact created locally, not yet synced to Google
    - `synced` - Contact is synced with Google Contacts
    - `sync_pending` - Changes pending sync to Google
    - `sync_error` - Last sync attempt failed
*/

-- Add Google Contacts sync fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'google_resource_name'
  ) THEN
    ALTER TABLE contacts ADD COLUMN google_resource_name text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'google_etag'
  ) THEN
    ALTER TABLE contacts ADD COLUMN google_etag text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'synced_at'
  ) THEN
    ALTER TABLE contacts ADD COLUMN synced_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'sync_status'
  ) THEN
    ALTER TABLE contacts ADD COLUMN sync_status text
      CHECK (sync_status IN ('local_only', 'synced', 'sync_pending', 'sync_error'))
      DEFAULT 'local_only';
  END IF;
END $$;

-- Create index for efficient Google sync queries
CREATE INDEX IF NOT EXISTS idx_contacts_google_resource_name
  ON contacts(user_id, google_resource_name)
  WHERE google_resource_name IS NOT NULL;

-- Create index for sync status queries
CREATE INDEX IF NOT EXISTS idx_contacts_sync_status
  ON contacts(user_id, sync_status);
