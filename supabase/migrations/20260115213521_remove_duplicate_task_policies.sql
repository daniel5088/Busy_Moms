/*
  # Remove Duplicate Task Policies

  1. Changes
    - Drop old duplicate policies
    - Keep only the new email-based policies
*/

-- Drop old duplicate INSERT policy
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;

-- Drop old duplicate UPDATE policy
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;

-- Drop old duplicate DELETE policy
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;