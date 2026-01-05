/*
  # Task Sync System Database Schema

  1. New Tables
    - `task_sync_mappings`
      - Links local tasks to Google Tasks
      - Tracks sync status and change detection hashes
      - Stores last sync timestamp for each mapping
      - Includes google_task_list_id for Google Tasks organization

    - `task_sync_conflicts`
      - Stores detected conflicts between local and Google tasks
      - Contains both versions of conflicting data
      - Tracks conflict resolution status

    - `task_sync_logs`
      - Audit trail of all task sync operations
      - Records successes and failures with details
      - Enables debugging and monitoring

    - `user_task_sync_preferences`
      - Per-user task sync configuration
      - Stores last successful sync timestamp
      - Controls sync frequency and behavior
      - Separate from calendar sync preferences

  2. Security
    - Enable RLS on all tables
    - Users can only access their own sync data
    - Authenticated users only

  3. Indexes
    - Optimized for lookup by user_id, task_id, and google_task_id
    - Efficient querying of pending conflicts
*/

-- Task sync mappings table
CREATE TABLE IF NOT EXISTS task_sync_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  google_task_id text NOT NULL,
  google_task_list_id text NOT NULL DEFAULT '@default',
  sync_status text NOT NULL DEFAULT 'synced',
  last_synced_at timestamptz DEFAULT now(),
  local_hash text,
  google_hash text,
  sync_direction text DEFAULT 'bidirectional',
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, local_task_id),
  UNIQUE(user_id, google_task_id)
);

-- Task sync conflicts table
CREATE TABLE IF NOT EXISTS task_sync_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  google_task_id text NOT NULL,
  conflict_type text NOT NULL DEFAULT 'modification',
  local_task_data jsonb NOT NULL,
  google_task_data jsonb NOT NULL,
  local_modified_at timestamptz,
  google_modified_at timestamptz,
  detected_at timestamptz DEFAULT now(),
  resolution_status text DEFAULT 'pending',
  resolution_choice text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task sync logs table
CREATE TABLE IF NOT EXISTS task_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_operation text NOT NULL,
  sync_direction text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  tasks_processed integer DEFAULT 0,
  tasks_created integer DEFAULT 0,
  tasks_updated integer DEFAULT 0,
  tasks_deleted integer DEFAULT 0,
  conflicts_detected integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_details jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- User task sync preferences table
CREATE TABLE IF NOT EXISTS user_task_sync_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_enabled boolean DEFAULT true,
  sync_frequency_minutes integer DEFAULT 15,
  sync_direction text DEFAULT 'bidirectional',
  auto_resolve_conflicts boolean DEFAULT false,
  last_sync_at timestamptz,
  last_successful_sync_at timestamptz,
  google_task_list_id text DEFAULT '@default',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_sync_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_task_sync_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_sync_mappings
CREATE POLICY "Users can view own task sync mappings"
  ON task_sync_mappings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task sync mappings"
  ON task_sync_mappings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task sync mappings"
  ON task_sync_mappings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own task sync mappings"
  ON task_sync_mappings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for task_sync_conflicts
CREATE POLICY "Users can view own task sync conflicts"
  ON task_sync_conflicts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task sync conflicts"
  ON task_sync_conflicts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task sync conflicts"
  ON task_sync_conflicts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own task sync conflicts"
  ON task_sync_conflicts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for task_sync_logs
CREATE POLICY "Users can view own task sync logs"
  ON task_sync_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task sync logs"
  ON task_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_task_sync_preferences
CREATE POLICY "Users can view own task sync preferences"
  ON user_task_sync_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task sync preferences"
  ON user_task_sync_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own task sync preferences"
  ON user_task_sync_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own task sync preferences"
  ON user_task_sync_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_sync_mappings_user_id ON task_sync_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_task_sync_mappings_local_task_id ON task_sync_mappings(local_task_id);
CREATE INDEX IF NOT EXISTS idx_task_sync_mappings_google_task_id ON task_sync_mappings(google_task_id);
CREATE INDEX IF NOT EXISTS idx_task_sync_mappings_status ON task_sync_mappings(sync_status);

CREATE INDEX IF NOT EXISTS idx_task_sync_conflicts_user_id ON task_sync_conflicts(user_id);
CREATE INDEX IF NOT EXISTS idx_task_sync_conflicts_status ON task_sync_conflicts(resolution_status);
CREATE INDEX IF NOT EXISTS idx_task_sync_conflicts_detected_at ON task_sync_conflicts(detected_at);

CREATE INDEX IF NOT EXISTS idx_task_sync_logs_user_id ON task_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_sync_logs_created_at ON task_sync_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_task_sync_logs_status ON task_sync_logs(status);
