/*
  # Update Life Receipts to Mental Notes UI Text

  1. Updates
    - Update quick_action_types table to change display text from "Life Receipts" to "Mental Notes"
    - Update description from "Important documents" to "Capture your thoughts"
  
  2. Notes
    - This only changes user-facing display text
    - Internal identifiers (id: 'life-receipts') remain unchanged
    - No functionality changes
*/

UPDATE quick_action_types
SET 
  name = 'Mental Notes',
  description = 'Capture your thoughts'
WHERE id = 'life-receipts';
