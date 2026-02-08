# Agent Session 9 -- Phase 9: Settings, Notifications, and Cycle Tracker

## Context from Previous Sessions
- Phases 1-8 should be substantially complete
- Calendar (Phase 5) provides calendar view component needed for cycle tracker
- Sync services (Phase 5 calendar, Phase 7 tasks) provide patterns for sync settings

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 9 section
2. `REBUILD_PROGRESS.md` and most recent handoff
3. `Busy_Moms/src/components/Settings.tsx` -- web settings
4. `Busy_Moms/src/components/NotificationSettings.tsx` -- web notification settings
5. `Busy_Moms/src/services/notificationService.ts` -- web notification service
6. `Busy_Moms/src/components/CycleTracker.tsx` -- web cycle tracker
7. `Busy_Moms/src/services/cycleTrackerService.ts` -- cycle tracker service
8. `Busy_Moms/src/components/AddressManager.tsx` -- address management
9. `Busy_Moms/src/components/AddressForm.tsx` -- address form
10. `Busy_Moms/src/components/WeatherSettings.tsx` -- weather settings
11. `Busy_Moms/src/components/SyncSettings.tsx` -- sync settings
12. `Busy_Moms/NOTIFICATION_SYSTEM_COMPLETE.md`

## Your Mission
Build the complete settings system, push notifications with Expo, cycle tracker, address management, and sync settings.

## Prerequisites Check
- [ ] Phases 1-5 completed (calendar view needed for cycle tracker)
- [ ] Auth, profile service available
- [ ] All previous features provide settings that need to be configurable

## Implementation Steps

### Step 1: Build notification service (Expo Notifications)
**src/services/notificationService.ts**
This is a COMPLETE REWRITE from the web version (web push vs Expo notifications):
- registerForPushNotifications() -- request permission, get Expo push token
- savePushToken(userId, token) -- save to notification_settings table
- scheduleLocalNotification(title, body, trigger) -- schedule for events/tasks
- cancelNotification(id)
- getNotificationSettings(userId) -- from Supabase
- updateNotificationSettings(userId, settings)
- checkAndShowDueNotifications()

**src/hooks/useNotificationManager.ts**
- Initialize on app start
- Register push token
- Schedule notifications for upcoming events/tasks
- Handle notification taps (navigate to relevant screen)
- Background notification handler

**src/contexts/NotificationContext.tsx**
- Provides notification state to the app
- Manages notification listener

### Step 2: Build notification settings screen
**app/settings/notifications.tsx**
**src/components/settings/NotificationSettings.tsx** (if reusable)
- Enable/disable notifications toggle
- Notification types: events, reminders, tasks, shopping, wellness, birthdays
- Default reminder time (5 min, 15 min, 30 min, 1 hour, 1 day before)
- Quiet hours (start time, end time)
- Sound toggle

### Step 3: Build settings screen
**app/(tabs)/more.tsx** (complete rewrite)
- User profile section (name, email, avatar)
- Settings categories:
  - App Settings (dark mode, measurement system)
  - Notifications
  - Google Calendar Sync
  - Google Tasks Sync
  - Addresses
  - Weather
  - Voice & AI Preferences
  - Affirmations
- Help & Support section:
  - Reset Tutorials
  - About
  - Sign Out

**app/settings/index.tsx**
- Full settings list

**src/components/settings/SettingsList.tsx**
- Grouped list of setting rows

**src/components/settings/SettingsRow.tsx**
- Label, description, right accessory (chevron, switch, value)

### Step 4: Build settings sub-screens

**app/settings/sync.tsx**
- Calendar sync: enable/disable, frequency, direction
- Tasks sync: enable/disable

**app/settings/addresses.tsx**
**src/components/settings/AddressManager.tsx**
- List of saved addresses (home, work, other)
- Add/edit/delete addresses
- Set default address

**src/components/settings/AddressForm.tsx**
- Address type selector
- Display name
- Street address (with location autocomplete)
- City, state, postal code, country
- "Set as Default" toggle

**src/services/addressService.ts**
- getAddresses(userId), createAddress, updateAddress, deleteAddress
- setDefaultAddress(id)
- validateAddress(address) -- via edge function

**app/settings/weather.tsx**
- Temperature unit (Fahrenheit/Celsius)
- Location source (device GPS, default address, custom)

**app/settings/measurement.tsx**
- Measurement system toggle (metric/imperial)
- Auto-convert always enabled

**app/settings/voice-preferences.tsx**
- Voice selector (Ash, Echo, Coral, Sage, Marin, Shimmer)
- Personality selector (Friendly, Professional, Humorous)

**app/settings/about.tsx**
- App version, credits, links

### Step 5: Build cycle tracker
**src/services/cycleTrackerService.ts**
Port from web (replace `import.meta.env`, `crypto.randomUUID`):
- getCycleData, saveCycleData
- getSymptoms, saveSymptom
- getCycleHistory, addCycleHistory
- callEdgeFunction for AI insights

**src/components/cycle/CycleTracker.tsx**
- Calendar view with cycle day coloring (period, follicular, ovulation, luteal)
- Current phase indicator
- Cycle length and period length display
- "Log Period" button
- "Log Symptoms" button

**src/components/cycle/CycleCalendar.tsx**
- Reuse calendar view component from Phase 5
- Color-code days based on cycle phase
- Prediction for next period

**src/components/cycle/SymptomLogger.tsx**
- Date selector
- Symptom checkboxes (cramps, headache, bloating, mood changes, etc.)
- Notes text input
- Save button

**app/cycle-tracker.tsx**
- Full-screen cycle tracker

### Step 6: Build user settings service
**src/services/userSettingsService.ts**
- getUserSettings(userId) -- fetch all user preferences
- updateUserSettings(userId, settings)
- Reset tutorials

### Step 7: Wire up notification scheduling
- When events are created (Phase 5), schedule reminder notifications
- When tasks with due dates are created (Phase 7), schedule notifications
- When reminders are created, schedule notifications
- Respect quiet hours
- Respect notification type preferences

## Quality Checklist
- [ ] Settings screen shows all categories
- [ ] Dark mode toggle works from settings
- [ ] Push notification permission request works
- [ ] Local notifications fire at scheduled times
- [ ] Notification settings persist
- [ ] Quiet hours are respected
- [ ] Cycle tracker records period start dates
- [ ] Cycle tracker shows phase predictions
- [ ] Symptom logging works
- [ ] Address management works
- [ ] Sync settings save and affect sync behavior
- [ ] Measurement system preference applies globally
- [ ] Works on both iOS and Android

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_9_HANDOFF.md` with:
   - Notification scheduling patterns
   - Cycle tracker data model
   - Settings hierarchy
3. Git commit

## Next Agent Context
Phase 10 will build Life Receipts, Gift Finder, and tutorials. Phase 11 will do performance/offline. The notification system built here will be used across the app.
