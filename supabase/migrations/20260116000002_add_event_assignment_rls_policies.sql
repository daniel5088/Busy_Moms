/*
  # Add RLS policy for events with assignment support

  1. Updates
    - Drop existing RLS policies for events
    - Create new policies that allow reading:
      - Events the user created (user_id = auth.uid())
      - Events assigned to the user (assigned_to_email matches user's email)
*/

-- Drop existing event policies
DROP POLICY IF EXISTS "Users can read own events" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

-- Create new SELECT policy that includes assigned events
CREATE POLICY "Users can read own and assigned events"
  ON events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Create INSERT policy (users can only create events for themselves)
CREATE POLICY "Users can insert own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy (users can update their own events or events assigned to them)
CREATE POLICY "Users can update own and assigned events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR assigned_to_email IN (
      SELECT p.email 
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Create DELETE policy (users can only delete their own events)
CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
