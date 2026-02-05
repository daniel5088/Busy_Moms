/*
  # Add Color Gradients to Quick Actions

  Run this in your Supabase SQL Editor:
  https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

  1. Changes
    - Add gradient_from and gradient_to columns for color styling
    - Update existing action types with their original colors

  2. Color Scheme
    - Shopping: Orange to Pink
    - Quick Links: Purple to Violet
    - Tasks: Green to Emerald
    - Contacts: Blue to Cyan
    - Scan Events: Teal to Cyan
    - Cycle Tracker: Rose to Pink
    - Life Receipts: Slate to Gray
    - Gift Finder: Amber to Orange
    - Recipes: Yellow to Orange
*/

-- Add gradient color columns
ALTER TABLE quick_action_types
  ADD COLUMN IF NOT EXISTS gradient_from TEXT DEFAULT 'orange-500',
  ADD COLUMN IF NOT EXISTS gradient_to TEXT DEFAULT 'pink-500';

-- Update action types with their unique colors
UPDATE quick_action_types SET gradient_from = 'orange-500', gradient_to = 'pink-500' WHERE id = 'shopping';
UPDATE quick_action_types SET gradient_from = 'purple-500', gradient_to = 'violet-500' WHERE id = 'quick-links';
UPDATE quick_action_types SET gradient_from = 'green-500', gradient_to = 'emerald-500' WHERE id = 'tasks';
UPDATE quick_action_types SET gradient_from = 'blue-500', gradient_to = 'cyan-500' WHERE id = 'contacts';
UPDATE quick_action_types SET gradient_from = 'teal-500', gradient_to = 'cyan-500' WHERE id = 'scan-events';
UPDATE quick_action_types SET gradient_from = 'rose-500', gradient_to = 'pink-500' WHERE id = 'cycle-tracker';
UPDATE quick_action_types SET gradient_from = 'slate-500', gradient_to = 'gray-600' WHERE id = 'life-receipts';
UPDATE quick_action_types SET gradient_from = 'amber-500', gradient_to = 'orange-500' WHERE id = 'gift-finder';
UPDATE quick_action_types SET gradient_from = 'yellow-500', gradient_to = 'orange-500' WHERE id = 'recipes';
