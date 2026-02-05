# Customizable Quick Actions Setup Guide

Your custom Quick Actions system is now ready! Here's how to set it up:

## Step 1: Run the SQL Migration

1. Open your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `QUICK_ACTIONS_MIGRATION.sql`
4. Click "Run" to execute the migration

This will create:
- `quick_action_types` table - stores available action types
- `user_quick_actions` table - stores each user's customized actions
- RLS policies for secure access
- Default action types (Shopping, Tasks, Contacts, etc.)
- Auto-initialization function for new users

## Step 2: Files Created

The following files have been created for you:

### Services & Hooks
- `src/services/quickActionsService.ts` - Database operations
- `src/hooks/useQuickActions.ts` - React hook for managing actions

### Components
- `src/components/QuickActionsCustomizer.tsx` - Customization modal UI

## Step 3: Integration with Dashboard

To integrate with your Dashboard, you need to:

1. **Add the customizer button** - Add a settings button next to "Quick Actions" heading
2. **Load user's actions** - Replace the hardcoded array with data from the hook
3. **Render with modern styling** - Update the grid to use gradient backgrounds

## Features

- Drag & drop reordering
- Show/hide individual actions
- Add new actions from available types
- Remove actions
- Reset to defaults
- Up to 9 actions (3x3 grid)
- Persistent across sessions
- Per-user customization

## Database Schema

### quick_action_types
- Stores available action types (Shopping, Tasks, etc.)
- Read-only for all authenticated users
- Includes icon name, description, and default settings

### user_quick_actions
- Stores each user's personalized configuration
- Position (0-8 for grid placement)
- Enabled/disabled state
- Links to action type
- Unique constraints prevent duplicates

## Usage

```typescript
import { useQuickActions } from '../hooks/useQuickActions';
import { QuickActionsCustomizer } from '../components/QuickActionsCustomizer';

function Dashboard() {
  const { quickActions, loading } = useQuickActions();
  const [showCustomizer, setShowCustomizer] = useState(false);

  return (
    <>
      <button onClick={() => setShowCustomizer(true)}>
        Customize
      </button>

      {quickActions.map(action => (
        // Render your action
      ))}

      {showCustomizer && (
        <QuickActionsCustomizer
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </>
  );
}
```

## API

### quickActionsService

```typescript
// Get all available action types
await quickActionsService.getActionTypes()

// Get user's enabled actions (ordered by position)
await quickActionsService.getUserQuickActions()

// Initialize defaults for new user
await quickActionsService.initializeQuickActions()

// Reorder actions
await quickActionsService.updateMultiplePositions([
  { id: 'uuid1', position: 0 },
  { id: 'uuid2', position: 1 }
])

// Toggle visibility
await quickActionsService.toggleQuickAction('uuid', true)

// Add new action
await quickActionsService.addQuickAction('shopping', 0)

// Remove action
await quickActionsService.removeQuickAction('uuid')

// Reset to defaults
await quickActionsService.resetToDefaults()
```

### useQuickActions Hook

```typescript
const {
  quickActions,      // User's enabled actions
  availableTypes,    // All action types
  loading,          // Loading state
  error,            // Error state
  reload,           // Reload data
  updatePositions,  // Reorder multiple
  toggleAction,     // Show/hide
  addAction,        // Add new
  removeAction,     // Remove
  resetToDefaults   // Reset all
} = useQuickActions();
```

## Next Steps

1. Run the SQL migration in your Supabase dashboard
2. The system will auto-initialize when users first load the dashboard
3. Add the customize button to your Dashboard component
4. Test the drag & drop reordering
5. Customize your quick actions!

## Troubleshooting

**Actions not loading?**
- Check Supabase connection
- Verify RLS policies are enabled
- Check browser console for errors

**Can't reorder?**
- Ensure unique position constraints
- Check for duplicate positions in database

**Default actions not appearing?**
- Run `initialize_user_quick_actions` function manually
- Check `quick_action_types` table has data

## Future Enhancements

- Custom colors per action
- Custom icons
- Custom action names
- More than 9 actions with pagination
- Share configurations between users
- Import/export configurations
