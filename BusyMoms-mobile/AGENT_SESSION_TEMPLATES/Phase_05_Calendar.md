# Agent Session 5 -- Phase 5: Calendar and Event Management

## Context from Previous Sessions
- Phases 1-4 complete: Foundation, UI, Auth, Dashboard all working
- React Query pattern established in dashboard data hook
- Weather service available for event weather

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 5 section
2. `REBUILD_PROGRESS.md` and `PHASE_4_HANDOFF.md`
3. `Busy_Moms/src/components/Calendar.tsx` -- web calendar (large file, focus on features)
4. `Busy_Moms/src/components/forms/EventForm.tsx` -- web event form
5. `Busy_Moms/src/services/googleCalendar.ts` -- Google Calendar service
6. `Busy_Moms/src/services/calendarSync.ts` -- calendar sync utilities
7. `Busy_Moms/src/services/syncOrchestrator.ts` -- sync orchestrator
8. `Busy_Moms/src/hooks/useCalendarSync.ts` -- calendar sync hook
9. `Busy_Moms/src/services/geocoding.ts` -- geocoding service
10. `Busy_Moms/src/services/travelTimeCalculator.ts` -- travel time
11. `Busy_Moms/SYNC_SYSTEM_GUIDE.md` -- sync architecture
12. `Busy_Moms/GOOGLE_CALENDAR_SETUP.md` -- Google Calendar integration

## Your Mission
Build the complete calendar screen with month view, event CRUD, Google Calendar bidirectional sync with conflict resolution, location autocomplete, travel time indicators, and directions integration.

This is the most complex phase. Prioritize core functionality first, then sync.

## Prerequisites Check
- [ ] Phases 1-4 completed
- [ ] Auth and Google OAuth working (Google tokens can be stored)
- [ ] UI components (Card, Modal, FormField, DateTimePicker, Button) available

## Implementation Steps

### Step 1: Build calendar view component
**src/components/calendar/CalendarView.tsx**
- Month view with day grid
- Day cells show event count indicators (colored dots)
- Selected day highlights
- Navigate between months (swipe or arrow buttons)
- Today button to jump to current date
- Use a React Native calendar library (e.g., `react-native-calendars`) OR build custom

### Step 2: Build event card and list
**src/components/calendar/EventCard.tsx**
- Displays: title, time, location, event type badge
- Travel time indicator (if available)
- Weather icon (if event is in next 7 days)
- Tap to navigate to event detail

### Step 3: Build event form
**src/components/calendar/EventForm.tsx**
Port from web EventForm with these fields:
- Title (required)
- Description
- Date (DateTimePicker)
- Start time, End time (DateTimePicker)
- Location (with autocomplete -- see Step 6)
- Event type selector
- Participants (text input, comma-separated)
- RSVP required toggle
- Assign to family member (email selector)
- Recurring options

### Step 4: Build event detail and creation screens
**app/event/[id].tsx** -- Event detail with edit/delete
**app/event/create.tsx** -- Event creation

### Step 5: Build the Calendar screen
**app/(tabs)/calendar.tsx** (complete rewrite)
- Calendar month view at top
- Event list below for selected day
- FAB (Floating Action Button) for creating new events
- Pull-to-refresh
- "Connect Google Calendar" banner (if not connected)
- Sync status indicator

### Step 6: Build location services
**src/services/locationService.ts**
- Call `google-places-autocomplete` edge function for autocomplete
- Debounce input (300ms)

**src/services/geocodingService.ts**
- Geocode addresses to lat/lng via edge function

**src/services/travelTimeService.ts**
- Calculate travel time between user's default address and event location
- Cache results

**src/services/directionsService.ts**
- Open native maps app with directions
- Use `Linking.openURL` with Google Maps or Apple Maps URL scheme

**src/components/calendar/TravelTimeIndicator.tsx**
- Shows "15 min drive" badge on events with locations

### Step 7: Build Google Calendar sync
**src/services/googleCalendarService.ts**
- Wrapper for the `google-calendar` edge function
- listEvents, createEvent, updateEvent, deleteEvent

**src/services/calendarSyncService.ts**
Port from web calendarSync.ts:
- generateEventHash, googleEventToLocal, localEventToGoogle
- CRUD for sync mappings, conflicts, logs, preferences

**src/services/syncOrchestrator.ts**
Port from web:
- performFullSync, syncGoogleToLocal, syncLocalToGoogle
- Conflict detection

**src/hooks/useCalendarSync.ts**
- Periodic sync timer (using setInterval, paused when app backgrounded)
- Sync state management
- Conflict management

### Step 8: Build sync UI components
**src/components/calendar/SyncStatus.tsx**
- Shows: last sync time, next sync, sync result, conflict count, manual sync button

**src/components/calendar/ConflictResolution.tsx**
- Modal showing side-by-side comparison
- "Keep Local", "Keep Google", "Skip" buttons
- Navigate between multiple conflicts

### Step 9: Build event weather icon
**src/components/calendar/EventWeatherIcon.tsx**
- For events within 7 days, show weather forecast icon
- Reuse weather service with event's date and location

## Quality Checklist
- [ ] Calendar month view renders correctly
- [ ] Day selection shows events for that day
- [ ] Event creation works (saves to Supabase)
- [ ] Event editing works
- [ ] Event deletion works (with confirmation)
- [ ] Google Calendar sync pulls events
- [ ] Google Calendar sync pushes events
- [ ] Conflict detection works when both sides modified
- [ ] Conflict resolution modal works
- [ ] Location autocomplete suggests addresses
- [ ] Travel time displays for events with locations
- [ ] Directions button opens native maps
- [ ] Works on both iOS and Android

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_5_HANDOFF.md` with:
   - Sync architecture explanation
   - Google Calendar edge function call patterns
   - Location service API details
   - Any sync edge cases discovered
3. Git commit

## Next Agent Context
Phase 6 (Shopping) is independent of calendar. Phase 9 (Cycle Tracker) will need the calendar view component from this phase.
