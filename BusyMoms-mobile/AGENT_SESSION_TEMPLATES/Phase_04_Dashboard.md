# Agent Session 4 -- Phase 4: Dashboard and Quick Actions

## Context from Previous Sessions
- Phase 1: Foundation (types, theme, Supabase client)
- Phase 2: UI components (Button, Card, Input, Skeleton, EmptyState, etc.)
- Phase 3: Auth flow, onboarding, tab navigation, AuthContext

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 4 section
2. `REBUILD_PROGRESS.md` and `PHASE_3_HANDOFF.md`
3. `Busy_Moms/src/components/Dashboard.tsx` -- web dashboard (for feature parity)
4. `Busy_Moms/src/hooks/useDashboardData.ts` -- web dashboard data hook
5. `Busy_Moms/src/services/weatherService.ts` -- web weather service
6. `Busy_Moms/src/hooks/useQuickActions.ts` -- web quick actions hook
7. `Busy_Moms/src/services/quickActionsService.ts` -- web quick actions service
8. `Busy_Moms/src/components/WeatherWidget.tsx` -- web weather widget

## Your Mission
Build the complete Dashboard screen with all widgets: weather, today's schedule, affirmation banner, quick actions grid, and upcoming events. Implement pull-to-refresh, skeleton loading, and quick actions customization.

## Prerequisites Check
- [ ] Auth flow works (user can sign in and reach dashboard)
- [ ] UI components available (Card, Skeleton, EmptyState, Button, etc.)
- [ ] AuthContext provides user and profile

## Implementation Steps

### Step 1: Create weather service
**src/services/weatherService.ts**
- Use `expo-location` to get device coordinates
- Call the `weather-mcp` edge function with coordinates
- Parse response and cache in React Query (15 min stale time)
- Handle location permission denial gracefully

**src/hooks/useWeather.ts**
- Request location permission on first use
- Return: temperature, condition, icon, location name, loading, error

### Step 2: Create quick actions service
**src/services/quickActionsService.ts**
- Port from web: getActionTypes, getUserQuickActions, initializeQuickActions, updateMultiplePositions, toggleQuickAction, addQuickAction, removeQuickAction, resetToDefaults
- Replace `import.meta.env` with `config`

**src/hooks/useQuickActions.ts**
- Port from web with React Query

### Step 3: Enhance dashboard data hook
**src/hooks/useDashboardData.ts**
- Convert to React Query `useQuery` calls
- Fetch: today's events, this week's events, shopping items, reminders, tasks
- Support pull-to-refresh via React Query's `refetch`

### Step 4: Build dashboard widget components

**src/components/dashboard/WeatherWidget.tsx**
- Displays: temperature, condition, location name
- Weather icon (use appropriate Lucide icon based on condition)
- Compact card layout
- Loading skeleton

**src/components/dashboard/AffirmationBanner.tsx**
- Shows today's affirmation text
- Tap to open full affirmation modal (placeholder for Phase 8)
- Gradient background
- Fallback text if no affirmation available

**src/components/dashboard/TodaysSchedule.tsx**
- List of today's events sorted by time
- Event cards with time, title, location
- "No events today" empty state
- Tap to navigate to event detail

**src/components/dashboard/UpcomingEvents.tsx**
- Events for the rest of the week
- Compact list format
- "See All" navigates to calendar tab

**src/components/dashboard/QuickActionsGrid.tsx**
- 3-column grid of quick action buttons
- Each button: icon, label, gradient background
- Tap navigates to the appropriate screen
- Long-press opens customizer
- Supports: Shopping, Tasks, Contacts, Family Folders, Settings, Quick Links, Life Receipts, Gift Finder, Recipes, Cycle Tracker, Voice Chat
- Customizer modal for reordering, showing/hiding

### Step 5: Build the Dashboard screen
**app/(tabs)/dashboard.tsx** (complete rewrite)
- ScrollView with RefreshControl
- Header: greeting ("Hello, [name]!"), date, weather widget
- Sections: Affirmation Banner, Today's Schedule, Quick Actions, Upcoming Events
- Pull-to-refresh reloads all data
- Skeleton loading states for each section

### Step 6: Implement quick actions navigation
Map each quick action to its route:
- Shopping -> `/(tabs)/shopping`
- Tasks -> `/task/create` or relevant screen
- Contacts -> contact list screen
- Family Folders -> family folders screen
- Settings -> `/settings`
- Quick Links -> `/quick-links`
- Life Receipts -> `/life-receipts`
- Gift Finder -> `/gift-finder`
- Recipes -> `/(tabs)/shopping` (with recipe tab active)
- Cycle Tracker -> `/cycle-tracker`
- Voice Chat -> `/voice-chat`

## Quality Checklist
- [ ] Dashboard loads and displays all sections
- [ ] Weather widget shows real weather data (or graceful error)
- [ ] Today's schedule shows today's events
- [ ] Quick actions grid navigates correctly
- [ ] Pull-to-refresh works
- [ ] Skeleton loading displays during initial load
- [ ] Empty states show when no data
- [ ] Works on both iOS and Android

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_4_HANDOFF.md`
3. Git commit

## Next Agent Context
Phase 5 (Calendar) will need:
- Weather service (may be reused for event weather)
- Dashboard data hook pattern (React Query) as a model for calendar queries
- Quick actions grid as a reference for navigation patterns
