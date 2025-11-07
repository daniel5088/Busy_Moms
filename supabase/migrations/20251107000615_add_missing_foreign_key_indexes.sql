/*
  # Add Missing Foreign Key Indexes

  1. Purpose
    - Add indexes to all foreign key columns that don't have covering indexes
    - Improves query performance for joins and foreign key lookups
    - Prevents table scans when querying related data

  2. Tables Affected
    - calendar_sync_conflicts: local_event_id, resolved_by
    - family_members: user_id
    - gift_suggestions: event_id, user_id
    - measurement_overrides: recipe_ingredient_id, shopping_list_id, user_id
    - reminders: family_member_id
    - shopping_lists: assigned_to
    - whatsapp_messages: created_event_id

  3. Performance Impact
    - Significantly improves JOIN operations
    - Speeds up CASCADE DELETE operations
    - Reduces query execution time for related data lookups
*/

-- calendar_sync_conflicts indexes
CREATE INDEX IF NOT EXISTS idx_calendar_sync_conflicts_local_event_id 
  ON calendar_sync_conflicts(local_event_id);

CREATE INDEX IF NOT EXISTS idx_calendar_sync_conflicts_resolved_by 
  ON calendar_sync_conflicts(resolved_by);

-- family_members index
CREATE INDEX IF NOT EXISTS idx_family_members_user_id 
  ON family_members(user_id);

-- gift_suggestions indexes
CREATE INDEX IF NOT EXISTS idx_gift_suggestions_event_id 
  ON gift_suggestions(event_id);

CREATE INDEX IF NOT EXISTS idx_gift_suggestions_user_id 
  ON gift_suggestions(user_id);

-- measurement_overrides indexes
CREATE INDEX IF NOT EXISTS idx_measurement_overrides_recipe_ingredient_id 
  ON measurement_overrides(recipe_ingredient_id);

CREATE INDEX IF NOT EXISTS idx_measurement_overrides_shopping_list_id 
  ON measurement_overrides(shopping_list_id);

CREATE INDEX IF NOT EXISTS idx_measurement_overrides_user_id 
  ON measurement_overrides(user_id);

-- reminders index
CREATE INDEX IF NOT EXISTS idx_reminders_family_member_id 
  ON reminders(family_member_id);

-- shopping_lists index
CREATE INDEX IF NOT EXISTS idx_shopping_lists_assigned_to 
  ON shopping_lists(assigned_to);

-- whatsapp_messages index
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_event_id 
  ON whatsapp_messages(created_event_id);