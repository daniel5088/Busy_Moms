/*
  # Optimize RLS Policies - Part 2: Supporting Tables

  1. Purpose
    - Continue optimizing RLS policies with SELECT-wrapped auth functions
    - Covers auto_reorders, event_actions, gift_suggestions, user_preferences, whatsapp_messages

  2. Performance
    - Prevents auth.uid() re-evaluation per row
    - Improves query performance at scale
*/

-- auto_reorders table policies
DROP POLICY IF EXISTS "Users can manage own auto reorders" ON auto_reorders;

CREATE POLICY "Users can manage own auto reorders"
  ON auto_reorders
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- event_actions table policies
DROP POLICY IF EXISTS "Users can manage own event actions" ON event_actions;

CREATE POLICY "Users can manage own event actions"
  ON event_actions
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- gift_suggestions table policies
DROP POLICY IF EXISTS "Users can manage own gift suggestions" ON gift_suggestions;

CREATE POLICY "Users can manage own gift suggestions"
  ON gift_suggestions
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- user_preferences table policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

CREATE POLICY "Users can manage own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- whatsapp_messages table policies
DROP POLICY IF EXISTS "Users can manage own whatsapp messages" ON whatsapp_messages;

CREATE POLICY "Users can manage own whatsapp messages"
  ON whatsapp_messages
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));