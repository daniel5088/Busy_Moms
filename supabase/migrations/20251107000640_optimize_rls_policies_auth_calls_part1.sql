/*
  # Optimize RLS Policies - Part 1: Core Tables

  1. Purpose
    - Optimize RLS policies by wrapping auth.uid() in SELECT subqueries
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Changes
    - Drop and recreate policies for: events, contacts, profiles, shopping_lists, reminders
    - Replace auth.uid() with (select auth.uid())
    - Maintains same security rules with better performance

  3. Security
    - No changes to security rules
    - Same access control, just optimized execution
*/

-- events table policies
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

CREATE POLICY "Users can insert own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- contacts table policies
DROP POLICY IF EXISTS "Users can read own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

CREATE POLICY "Users can read own contacts"
  ON contacts
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own contacts"
  ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own contacts"
  ON contacts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own contacts"
  ON contacts
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- profiles table policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- shopping_lists table policies
DROP POLICY IF EXISTS "Users can insert own shopping items" ON shopping_lists;
DROP POLICY IF EXISTS "Users can delete own shopping items" ON shopping_lists;

CREATE POLICY "Users can insert own shopping items"
  ON shopping_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own shopping items"
  ON shopping_lists
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- reminders table policies
DROP POLICY IF EXISTS "Users can insert own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON reminders;

CREATE POLICY "Users can insert own reminders"
  ON reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own reminders"
  ON reminders
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own reminders"
  ON reminders
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));