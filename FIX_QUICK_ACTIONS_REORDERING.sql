/*
  # Fix Quick Actions Position Constraint

  Run this in your Supabase SQL Editor to fix drag-and-drop reordering:
  https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

  1. Changes
    - Remove the restrictive position check constraint (0-8 only)
    - Allow temporary positions for reordering (positions can be > 8 temporarily)
    - This fixes drag-and-drop reordering issues

  2. Notes
    - The application logic ensures final positions are 0-8
    - Temporary higher positions (1000+) are used during reordering to avoid UNIQUE constraint violations
*/

-- Drop the old constraint that limits position to 0-8
ALTER TABLE user_quick_actions
  DROP CONSTRAINT IF EXISTS user_quick_actions_position_check;

-- Add a new constraint that allows any non-negative position
-- This permits temporary positions during reordering
ALTER TABLE user_quick_actions
  ADD CONSTRAINT user_quick_actions_position_check
  CHECK (position >= 0);
