# MOBILE REBUILD MASTER PLAN

## Busy Moms Assistant -- Expo/React Native Mobile Application

**Version:** 1.0
**Date:** 2026-02-08
**Status:** Planning Complete

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Multi-Session Agent Strategy](#3-multi-session-agent-strategy)
4. [Phased Implementation Plan](#4-phased-implementation-plan)
5. [Feature Inventory and Priority Matrix](#5-feature-inventory-and-priority-matrix)
6. [Data Architecture](#6-data-architecture)
7. [Integration Architecture](#7-integration-architecture)
8. [Risk Assessment](#8-risk-assessment)
9. [Quality Standards](#9-quality-standards)
10. [Success Metrics](#10-success-metrics)

---

## 1. Executive Summary

This document provides the complete blueprint for rebuilding the Busy Moms Assistant web application (Vite + React + Tailwind + Supabase) as a production-ready Expo/React Native mobile application. The rebuild is structured across 12 phases, designed to be executed by AI agents across multiple sessions, each constrained to a 200k token context window.

### Key Facts

- **Web app components:** 77 TSX files, 65 TS service/hook/utility files
- **Existing mobile scaffold:** 15 files with basic auth, dashboard, and tab navigation
- **Supabase tables:** ~30 tables with RLS policies
- **Edge functions:** 22 serverless functions
- **Third-party integrations:** Google Calendar, Google Maps/Places, Google Contacts, Google Tasks, Instacart, OpenAI, TheMealDB, Weather API
- **Estimated rebuild effort:** 12 phases, ~120-160 hours of agent work

### Shared Backend

The mobile app shares the same Supabase backend (database, auth, edge functions) as the web app. No backend changes are required. The mobile app is a new client connecting to the existing infrastructure.

---

## 2. Current State Analysis

### 2.1 Web Application (Busy_Moms/src)

**Tech stack:** Vite + React 18 + TypeScript + Tailwind CSS + Supabase + OpenAI

**Screen/Navigation architecture:**

- 4 primary screens: Dashboard, Calendar, Family, More
- 9 sub-screens: Shopping, Tasks, Contacts, Family Folders, Settings, Quick Links, Life Receipts, Life Receipts View, Gift Finder
- Flat state-based navigation (no URL routing; useState drives screen switching)

**Feature areas (complete inventory):**

| Feature Area | Components | Services/Hooks | Complexity |
| --- | --- | --- | --- |
| Authentication | AuthForm, Onboarding | useAuth, auth-config | Medium |
| Dashboard | Dashboard, DashboardSkeleton, QuickActionsCustomizer, WeatherWidget, WeatherSkeleton | useDashboardData, useWeather, useQuickActions, weatherService | High |
| Calendar | Calendar, CalendarSkeleton, EventForm, EventWeatherIcon, CycleTracker, TravelTimeIndicator, DirectionsModal, DirectionsButton | useCalendarSync, useEventWeather, useDirections, calendarSync, syncOrchestrator, googleCalendar, birthdayEventsService, cycleTrackerService | Very High |
| Family Hub | FamilyHub, FamilyHubSkeleton, FamilyMemberForm, FamilyFolders, TaskAssignmentDisplay | useProfile, tutorialService | Medium |
| Shopping | Shopping, ShoppingForm, RecipeBrowser, RecipeDetailModal, InstacartButton, RetailerSearch, RetailerSelectionModal, SendToProviderModal, MeasurementInput | recipeService, instacartService, instacartShoppingService, instacartAgentService, measurementPreferencesService, useRetailerSelection | Very High |
| Tasks | Tasks, TaskForm, TaskSyncSettings, TaskConflictResolutionModal | taskSync, taskSyncOrchestrator, googleTasks | High |
| Contacts | Contacts, ContactForm | googleContacts | Medium |
| Settings | Settings, SyncSettings, SyncStatus, WeatherSettings, AddressForm, AddressManager, ConnectGoogleCalendarButton | userSettings, useDefaultAddress, calendarProvider | High |
| AI Voice | AIVoiceChat, VoiceChat | openai, openaiRealtimeService, aiAssistantService, aiVoicePreferences, webrtcService | Very High |
| Affirmations | DailyAffirmations, AffirmationNotification, AffirmationSettings | affirmationService, useAffirmationNotifier | Medium |
| Notifications | NotificationSettings | notificationService, useNotificationManager | Medium |
| Life Receipts | LifeReceipts, LifeReceiptsView, ReceiptTriageFlow | lifeReceiptsService, lifeReceiptsAI | High |
| Gift Finder | GiftFinder, GiftFinderForm, GiftFinderModal, AffiliateResults | affiliateMatrixService, useAffiliateMatrix | Medium |
| Quick Links | QuickLinks | quickActionsService | Low |
| Tutorials | TutorialOverlay | useTutorial, tutorialService | Medium |
| Error Handling | ErrorBoundary, ErrorDashboard, ErrorModal, ErrorToast, LoadingErrorState | ErrorService, useErrorHandler, errorLog | Medium |
| Location | LocationAutocomplete | geocoding, googleMapsKeyService, addressValidation, travelTimeCalculator, googleDirections | High |
| WhatsApp | WhatsAppIntegration | (inline OpenAI parsing) | Medium |
| More Menu | MoreMenu, MoreMenuSkeleton | -- | Low |
| Onboarding | Onboarding, ColorPicker, FamilyMemberCard | -- | Medium |
| Dark Mode | -- | useDarkMode | Low |
| Measurement | MeasurementInput | measurementConverter, ingredientParser, instacartUnitMapper | Medium |

### 2.2 Existing Mobile Scaffold (BusyMoms-mobile)

**Tech stack:** Expo SDK 54 + React Native 0.81 + TypeScript + Expo Router v6 + Supabase

**What exists:**

- Root layout with Stack navigator
- Auth flow: login screen with email/password (no Google OAuth)
- Tab navigation: 5 tabs (Home, Calendar, Shopping, Family, More)
- Dashboard screen with basic event/task/reminder display
- Supabase client configured with AsyncStorage
- Shared type definitions (partial, missing some newer types)
- Basic hooks: useAuth, useDashboardData
- Utility files: ageCalculator, timeFormatters
- Lucide icon wrapper component

**What is missing (everything else):**

- Google OAuth authentication
- Onboarding flow
- Calendar with event management, Google Calendar sync, cycle tracker
- Shopping with recipes, Instacart, measurement conversion
- Tasks with Google Tasks sync
- Contacts with Google Contacts sync
- Family Hub with folders, task assignment
- Settings (all sub-categories)
- AI Voice Chat
- Affirmations system
- Notification system
- Life Receipts
- Gift Finder
- Weather widget
- Location services (autocomplete, directions, travel time)
- Dark mode
- Tutorial system
- Error handling infrastructure
- Offline support

### 2.3 Supabase Backend (shared, no changes needed)

**Edge Functions (22):** birthday-sync, camera-image-agent, cycle-tracker, generate-affirmation, get-google-maps-key, google-calendar, google-contacts, google-diagnostics, google-places-autocomplete, google-tasks, instacart-agent, instacart-get-retailers, instacart-recipes, instacart-shopping-list, life-receipts-audio-agent, life-receipts-image-agent, life-receipts-text-agent, openai-chat, openai-token, store-google-tokens, weather-mcp, webrtc-token

**Key database tables:** profiles, family_members, events, reminders, tasks, contacts, shopping_lists, recipes, recipe_ingredients, user_saved_recipes, google_tokens, calendar_sync_mappings, calendar_sync_conflicts, calendar_sync_logs, user_sync_preferences, cycle_data, cycle_symptoms, cycle_history, affirmations, affirmation_settings, notification_settings, notification_queue, user_tutorials, quick_action_types, user_quick_actions, addresses, user_measurement_preferences, measurement_overrides, user_preferred_retailers, ai_voice_preferences, life_receipts, affiliate_matrix, error_logs, user_settings

---

## 3. Multi-Session Agent Strategy

### 3.1 Context Preservation System

Each phase creates standardized artifacts that allow subsequent agents to reconstruct context without reading the entire codebase.

**Progress tracking file:** `REBUILD_PROGRESS.md`
This file is the single source of truth. Every phase updates it.

```markdown
# REBUILD PROGRESS TRACKER

## Overall Status: Phase [N] of 12

## Phase Completion Log

### Phase 1: Foundation and Project Setup
- Status: COMPLETED / IN_PROGRESS / NOT_STARTED
- Date completed: YYYY-MM-DD
- Agent notes: [brief summary of decisions made]
- Files created: [list]
- Files modified: [list]
- Known issues: [list]

### Phase 2: ...
[repeat for all phases]

## Active Decisions Log
[Important architectural decisions that affect future phases]

## Known Issues / Technical Debt
[Issues discovered but not fixed, for later phases to address]
```

**Phase handoff file:** `PHASE_[N]_HANDOFF.md`
Created at the end of each phase with:

1. What was accomplished
2. What was deferred or descoped
3. Decisions that affect future phases
4. Files created/modified (full list with paths)
5. Dependencies installed
6. Known issues
7. Testing results
8. What the next agent needs to know

### 3.2 Recovery Mechanism

If a session fails mid-phase:

1. The next agent reads `REBUILD_PROGRESS.md` to understand overall state
2. Reads the most recent `PHASE_[N]_HANDOFF.md` (if exists for current phase, it means partial completion)
3. Runs `npx tsc --noEmit` to verify TypeScript compilation state
4. Runs `npx expo start --no-dev` to verify the app starts
5. Checks git log for recent commits to understand what was done
6. Resumes from the last successful checkpoint within the phase

### 3.3 Context Budget per Phase

Each agent session has a 200k token context limit. Budget allocation:

| Activity | Token Budget |
| --- | --- |
| System prompt + instructions | ~10k |
| Reading this master plan | ~15k |
| Reading phase-specific template | ~5k |
| Reading REBUILD_PROGRESS.md | ~3k |
| Reading previous handoff | ~5k |
| Reading existing code (reference) | ~40k |
| Writing new code | ~80k |
| Testing and debugging | ~30k |
| Creating handoff artifacts | ~12k |
| **Total** | **~200k** |

### 3.4 Agent Session Protocol

Every agent session MUST follow this protocol:

```text
1. READ: MOBILE_REBUILD_MASTER_PLAN.md (this file)
2. READ: REBUILD_PROGRESS.md
3. READ: Most recent PHASE_[N]_HANDOFF.md
4. READ: AGENT_SESSION_TEMPLATES/Phase_[N].md (for current phase)
5. VERIFY: Run TypeScript check and Expo start
6. EXECUTE: Follow phase template step by step
7. TEST: Verify completion criteria
8. WRITE: Update REBUILD_PROGRESS.md
9. WRITE: Create PHASE_[N]_HANDOFF.md
10. COMMIT: Stage and commit all changes
```

---

## 4. Phased Implementation Plan

### Phase 1: Foundation and Project Setup

**Complexity:** Medium | **Token Budget:** ~150k

**Objectives:**

- Initialize clean Expo project with correct SDK and dependencies
- Configure TypeScript strictly
- Set up directory structure following ARCHITECTURE.md
- Install and configure all required dependencies
- Set up Supabase client with proper types
- Create design system tokens (colors, spacing, typography)
- Create shared type definitions (complete, matching web app)
- Set up ESLint and Prettier
- Create the REBUILD_PROGRESS.md tracker

**Prerequisites:** None (first phase)

**Key files to create:**

- `app.config.ts` (upgraded from .js)
- `src/types/database.ts` (complete Supabase type definitions)
- `src/types/navigation.ts` (navigation type definitions)
- `src/lib/supabase.ts` (enhanced client)
- `src/theme/colors.ts`, `spacing.ts`, `typography.ts`, `shadows.ts`
- `src/theme/index.ts` (design system export)
- `.eslintrc.js`, `.prettierrc`
- `tsconfig.json` (strict mode)
- `REBUILD_PROGRESS.md`

**Completion criteria:**

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx expo start` launches without errors
- [ ] All shared types from web app are defined
- [ ] Design tokens match web app color palette
- [ ] ESLint passes on all files

**Handoff artifacts:** PHASE_1_HANDOFF.md documenting all dependency versions and architectural decisions

---

### Phase 2: Core UI Components and Design System

**Complexity:** Medium | **Token Budget:** ~160k

**Objectives:**

- Build reusable primitive components (Button, Card, Input, Modal, etc.)
- Build layout components (Screen, Header, Section)
- Build feedback components (Toast, Loading, EmptyState, ErrorBoundary)
- Build form components (TextInput, Select, DatePicker, TimePicker, Switch)
- Create icon system using lucide-react-native
- Implement dark mode support with React context

**Prerequisites:** Phase 1 complete

**Key files to create:**

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Avatar.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/Divider.tsx`
- `src/components/ui/Switch.tsx`
- `src/components/ui/Select.tsx`
- `src/components/layout/Screen.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Section.tsx`
- `src/components/forms/FormField.tsx`
- `src/components/forms/DateTimePicker.tsx`
- `src/components/errors/ErrorBoundary.tsx`
- `src/contexts/ThemeContext.tsx`
- `src/hooks/useTheme.ts`

**Completion criteria:**

- [ ] All primitive components render correctly on iOS and Android
- [ ] Dark mode toggles without flicker
- [ ] Components follow the design system tokens from Phase 1
- [ ] All components have TypeScript props interfaces

**Handoff artifacts:** PHASE_2_HANDOFF.md with component API reference and usage examples

---

### Phase 3: Authentication, Onboarding, and Navigation

**Complexity:** High | **Token Budget:** ~170k

**Objectives:**

- Implement complete authentication flow (email/password + Google OAuth)
- Build onboarding wizard (profile setup, family member creation, color picker)
- Finalize tab navigation with proper nesting
- Implement stack navigation for sub-screens
- Build auth state management with Supabase listener
- Configure deep linking scheme

**Prerequisites:** Phases 1-2 complete

**Key files to create/modify:**

- `src/contexts/AuthContext.tsx` (global auth provider)
- `src/hooks/useAuth.ts` (enhanced from scaffold)
- `app/(auth)/login.tsx` (redesigned with Google OAuth)
- `app/(auth)/signup.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(onboarding)/_layout.tsx`
- `app/(onboarding)/profile.tsx`
- `app/(onboarding)/family.tsx`
- `app/(onboarding)/preferences.tsx`
- `app/(onboarding)/complete.tsx`
- `app/(tabs)/_layout.tsx` (refined)
- `app/_layout.tsx` (auth guard logic)
- `src/services/profileService.ts`

**Completion criteria:**

- [ ] Email/password sign-in and sign-up work
- [ ] Google OAuth sign-in works (using expo-auth-session)
- [ ] Onboarding flow completes and sets profile.onboarding_completed
- [ ] Authenticated users go to tabs, unauthenticated to auth
- [ ] Sign-out works and redirects to auth
- [ ] Deep link scheme (busymoms://) resolves

**Handoff artifacts:** PHASE_3_HANDOFF.md with auth flow diagram and navigation map

---

### Phase 4: Dashboard and Quick Actions

**Complexity:** Medium | **Token Budget:** ~150k

**Objectives:**

- Build complete Dashboard screen with all widgets
- Implement Weather widget with location-based data
- Implement Quick Actions grid with customization
- Build Today's Schedule section
- Build Affirmation card/banner
- Implement pull-to-refresh and skeleton loading
- Build About dialog

**Prerequisites:** Phases 1-3 complete

**Key files to create/modify:**

- `app/(tabs)/dashboard.tsx` (complete rewrite)
- `src/components/dashboard/WeatherWidget.tsx`
- `src/components/dashboard/QuickActionsGrid.tsx`
- `src/components/dashboard/TodaysSchedule.tsx`
- `src/components/dashboard/AffirmationBanner.tsx`
- `src/components/dashboard/UpcomingEvents.tsx`
- `src/hooks/useDashboardData.ts` (enhanced)
- `src/hooks/useWeather.ts`
- `src/hooks/useQuickActions.ts`
- `src/services/weatherService.ts`
- `src/services/quickActionsService.ts`

**Completion criteria:**

- [ ] Dashboard loads and displays all sections
- [ ] Weather widget shows location-based weather
- [ ] Quick actions navigate to correct screens
- [ ] Quick actions customizer modal works
- [ ] Pull-to-refresh reloads data
- [ ] Skeleton loading shows during data fetch

**Handoff artifacts:** PHASE_4_HANDOFF.md

---

### Phase 5: Calendar and Event Management

**Complexity:** Very High | **Token Budget:** ~180k

**Objectives:**

- Build calendar view with month/week/day views
- Implement event creation, editing, and deletion
- Build event detail modal/screen
- Implement Google Calendar sync (bidirectional)
- Build conflict resolution UI
- Implement sync status indicator
- Implement location autocomplete for event locations
- Build travel time indicator
- Build directions integration (open native maps)
- Build event weather icon

**Prerequisites:** Phases 1-4 complete

**Key files to create:**

- `app/(tabs)/calendar.tsx` (complete rewrite)
- `app/event/[id].tsx` (event detail screen)
- `app/event/create.tsx` (event creation screen)
- `src/components/calendar/CalendarView.tsx`
- `src/components/calendar/EventCard.tsx`
- `src/components/calendar/EventForm.tsx`
- `src/components/calendar/SyncStatus.tsx`
- `src/components/calendar/ConflictResolution.tsx`
- `src/components/calendar/TravelTimeIndicator.tsx`
- `src/components/calendar/EventWeatherIcon.tsx`
- `src/services/googleCalendarService.ts`
- `src/services/calendarSyncService.ts`
- `src/services/syncOrchestrator.ts`
- `src/services/locationService.ts`
- `src/services/geocodingService.ts`
- `src/services/directionsService.ts`
- `src/services/travelTimeService.ts`
- `src/hooks/useCalendarSync.ts`
- `src/hooks/useEventWeather.ts`

**Completion criteria:**

- [ ] Calendar displays events by month
- [ ] CRUD operations on events work
- [ ] Google Calendar sync pulls and pushes events
- [ ] Conflict resolution modal works
- [ ] Location autocomplete suggests addresses
- [ ] Travel time displays for events with locations
- [ ] Directions open in native maps app

**Handoff artifacts:** PHASE_5_HANDOFF.md with sync architecture explanation

---

### Phase 6: Shopping, Recipes, and Instacart Integration

**Complexity:** Very High | **Token Budget:** ~180k

**Objectives:**

- Build shopping list with categories and CRUD
- Implement recipe browser with search and filters
- Build recipe detail view with servings adjuster
- Implement Instacart integration (recipe pages, shopping lists)
- Build retailer selection
- Implement measurement conversion system
- Build "Send to Instacart" flow

**Prerequisites:** Phases 1-4 complete

**Key files to create:**

- `app/(tabs)/shopping.tsx` (complete rewrite)
- `app/recipe/[id].tsx`
- `src/components/shopping/ShoppingList.tsx`
- `src/components/shopping/ShoppingForm.tsx`
- `src/components/shopping/CategorySection.tsx`
- `src/components/shopping/RecipeBrowser.tsx`
- `src/components/shopping/RecipeDetail.tsx`
- `src/components/shopping/InstacartButton.tsx`
- `src/components/shopping/RetailerSelector.tsx`
- `src/components/shopping/MeasurementInput.tsx`
- `src/services/shoppingService.ts`
- `src/services/recipeService.ts`
- `src/services/instacartService.ts`
- `src/services/measurementService.ts`
- `src/utils/measurementConverter.ts`
- `src/utils/ingredientParser.ts`
- `src/utils/instacartUnitMapper.ts`
- `src/hooks/useRetailerSelection.ts`

**Completion criteria:**

- [ ] Shopping list displays items by category
- [ ] CRUD operations on shopping items work
- [ ] Recipe browser loads and filters recipes
- [ ] Recipe detail shows ingredients with adjustable servings
- [ ] Instacart button opens shopping page
- [ ] Retailer selection persists
- [ ] Measurement conversion between metric/imperial works

**Handoff artifacts:** PHASE_6_HANDOFF.md

---

### Phase 7: Tasks, Contacts, and Family Hub

**Complexity:** High | **Token Budget:** ~170k

**Objectives:**

- Build Tasks screen with CRUD, assignment, and priority
- Implement Google Tasks sync
- Build Contacts screen with CRUD and categories
- Implement Google Contacts sync
- Build Family Hub screen with member management
- Build Family Folders
- Implement task/event assignment to family members
- Build family member form with birthday, allergies, medical notes

**Prerequisites:** Phases 1-4 complete

**Key files to create:**

- `app/(tabs)/family.tsx` (complete rewrite)
- `app/task/[id].tsx`
- `app/task/create.tsx`
- `app/contact/[id].tsx`
- `app/contact/create.tsx`
- `app/family-member/[id].tsx`
- `src/components/tasks/TaskList.tsx`
- `src/components/tasks/TaskForm.tsx`
- `src/components/tasks/TaskSyncStatus.tsx`
- `src/components/contacts/ContactList.tsx`
- `src/components/contacts/ContactForm.tsx`
- `src/components/family/FamilyHub.tsx`
- `src/components/family/FamilyMemberCard.tsx`
- `src/components/family/FamilyMemberForm.tsx`
- `src/components/family/FamilyFolders.tsx`
- `src/services/taskService.ts`
- `src/services/taskSyncService.ts`
- `src/services/contactService.ts`
- `src/services/googleContactsService.ts`
- `src/services/familyService.ts`
- `src/hooks/useProfile.ts`

**Completion criteria:**

- [ ] Tasks display with filtering and sorting
- [ ] Task CRUD operations work
- [ ] Google Tasks sync works
- [ ] Contacts display with categories
- [ ] Contact CRUD operations work
- [ ] Family Hub shows members with color coding
- [ ] Family member creation/editing works
- [ ] Task assignment to family members works

**Handoff artifacts:** PHASE_7_HANDOFF.md

---

### Phase 8: AI Voice Chat and Affirmations

**Complexity:** Very High | **Token Budget:** ~170k

**Objectives:**

- Build AI Voice Chat using OpenAI Realtime API
- Implement voice recording and playback
- Build text-based chat fallback
- Implement AI personality preferences
- Build Daily Affirmations system
- Build Affirmation Settings
- Build Affirmation notifications
- Implement context-aware affirmation generation

**Prerequisites:** Phases 1-4 complete

**Key files to create:**

- `app/voice-chat.tsx`
- `src/components/ai/VoiceChat.tsx`
- `src/components/ai/ChatBubble.tsx`
- `src/components/ai/VoiceRecorder.tsx`
- `src/components/affirmations/DailyAffirmation.tsx`
- `src/components/affirmations/AffirmationSettings.tsx`
- `src/components/affirmations/AffirmationNotification.tsx`
- `src/services/aiChatService.ts`
- `src/services/aiVoiceService.ts`
- `src/services/aiVoicePreferences.ts`
- `src/services/affirmationService.ts`
- `src/hooks/useAffirmationNotifier.ts`

**Completion criteria:**

- [ ] Text chat with OpenAI works
- [ ] Voice chat records and sends audio (or uses speech-to-text)
- [ ] AI personality preferences are respected
- [ ] Daily affirmations generate and display
- [ ] Affirmation scheduling works
- [ ] Affirmation settings persist

**Handoff artifacts:** PHASE_8_HANDOFF.md

---

### Phase 9: Settings, Notifications, and Cycle Tracker

**Complexity:** High | **Token Budget:** ~170k

**Objectives:**

- Build complete Settings screen
- Implement push notification system (Expo Notifications)
- Build notification settings UI
- Implement notification scheduling
- Build Cycle Tracker feature
- Build address management (home/work/other)
- Implement weather settings
- Build sync settings (calendar, tasks)
- Build dark mode toggle in settings

**Prerequisites:** Phases 1-5 complete (calendar needed for cycle tracker)

**Key files to create:**

- `app/(tabs)/more.tsx` (complete rewrite)
- `app/settings/index.tsx`
- `app/settings/notifications.tsx`
- `app/settings/sync.tsx`
- `app/settings/addresses.tsx`
- `app/settings/weather.tsx`
- `app/settings/measurement.tsx`
- `app/settings/voice-preferences.tsx`
- `app/cycle-tracker.tsx`
- `src/components/settings/SettingsList.tsx`
- `src/components/settings/SettingsRow.tsx`
- `src/components/settings/AddressManager.tsx`
- `src/components/settings/AddressForm.tsx`
- `src/components/cycle/CycleTracker.tsx`
- `src/components/cycle/CycleCalendar.tsx`
- `src/components/cycle/SymptomLogger.tsx`
- `src/services/notificationService.ts`
- `src/services/cycleTrackerService.ts`
- `src/services/addressService.ts`
- `src/services/userSettingsService.ts`
- `src/hooks/useNotificationManager.ts`

**Completion criteria:**

- [ ] Settings screen displays all categories
- [ ] Push notifications register and deliver
- [ ] Notification settings persist
- [ ] Cycle tracker records and predicts cycles
- [ ] Address management works with Google Places
- [ ] Dark mode toggle works from settings
- [ ] Sync settings configurable

**Handoff artifacts:** PHASE_9_HANDOFF.md

---

### Phase 10: Life Receipts, Gift Finder, and Remaining Features

**Complexity:** High | **Token Budget:** ~170k

**Objectives:**

- Build Life Receipts capture flow (text, voice, camera)
- Build Life Receipts triage and view
- Build Gift Finder with affiliate matrix
- Build Quick Links feature
- Build WhatsApp integration (share/import)
- Build Tutorial overlay system
- Implement birthday event automation

**Prerequisites:** Phases 1-4 complete

**Key files to create:**

- `app/life-receipts/index.tsx`
- `app/life-receipts/capture.tsx`
- `app/life-receipts/triage.tsx`
- `app/life-receipts/view.tsx`
- `app/gift-finder.tsx`
- `app/quick-links.tsx`
- `src/components/life-receipts/CaptureFlow.tsx`
- `src/components/life-receipts/TriageFlow.tsx`
- `src/components/life-receipts/ReceiptCard.tsx`
- `src/components/gift-finder/GiftFinderForm.tsx`
- `src/components/gift-finder/AffiliateResults.tsx`
- `src/components/tutorials/TutorialOverlay.tsx`
- `src/services/lifeReceiptsService.ts`
- `src/services/lifeReceiptsAIService.ts`
- `src/services/affiliateMatrixService.ts`
- `src/services/birthdayEventsService.ts`
- `src/services/tutorialService.ts`
- `src/hooks/useTutorial.ts`
- `src/hooks/useAffiliateMatrix.ts`
- `src/utils/tutorialSteps.ts`

**Completion criteria:**

- [ ] Life Receipts capture via text, voice, and camera
- [ ] Life Receipts triage flow categorizes items
- [ ] Gift Finder displays affiliate results
- [ ] Quick Links shows customizable links
- [ ] Tutorial overlay guides new users
- [ ] Birthday events auto-create from family members

**Handoff artifacts:** PHASE_10_HANDOFF.md

---

### Phase 11: Offline Support, Performance, and Polish

**Complexity:** High | **Token Budget:** ~170k

**Objectives:**

- Implement offline-first data layer with queue and sync
- Add optimistic updates for CRUD operations
- Implement data caching with AsyncStorage
- Performance optimization (FlatList virtualization, memo, lazy loading)
- Image caching and optimization
- Bundle size optimization
- Accessibility audit and fixes (VoiceOver, TalkBack)
- Animation polish (screen transitions, micro-interactions)
- Error boundary coverage for all screens
- Haptic feedback on key actions

**Prerequisites:** Phases 1-10 complete

**Key files to create:**

- `src/lib/offlineQueue.ts`
- `src/lib/cacheManager.ts`
- `src/lib/syncEngine.ts`
- `src/hooks/useOfflineSync.ts`
- `src/hooks/useNetworkStatus.ts`
- `src/components/ui/NetworkBanner.tsx`

**Completion criteria:**

- [ ] App works offline for reading cached data
- [ ] Write operations queue and sync when online
- [ ] Network status banner appears when offline
- [ ] FlatLists use virtualization correctly
- [ ] No unnecessary re-renders (verified with React DevTools)
- [ ] Accessibility labels on all interactive elements
- [ ] Haptic feedback on button presses
- [ ] Screen transitions are smooth (60fps)

**Handoff artifacts:** PHASE_11_HANDOFF.md with performance benchmarks

---

### Phase 12: Testing, Build Configuration, and Release Prep

**Complexity:** High | **Token Budget:** ~170k

**Objectives:**

- Write unit tests for services and utilities
- Write integration tests for hooks
- Write E2E tests for critical flows (auth, event creation, shopping)
- Configure EAS Build for iOS and Android
- Create app icons and splash screen
- Configure app store metadata
- Set up environment-based configuration (dev, staging, prod)
- Final QA pass and bug fixes
- Create release documentation

**Prerequisites:** Phases 1-11 complete

**Key files to create:**

- `src/__tests__/services/*.test.ts`
- `src/__tests__/hooks/*.test.ts`
- `src/__tests__/utils/*.test.ts`
- `e2e/*.test.ts`
- `eas.json`
- `app.config.ts` (environment handling)
- `assets/icon.png` (1024x1024)
- `assets/splash.png`
- `assets/adaptive-icon.png`
- `RELEASE_NOTES.md`

**Completion criteria:**

- [ ] Unit test coverage >70% for services and utils
- [ ] Integration tests pass for all hooks
- [ ] E2E tests pass for auth, event CRUD, shopping CRUD
- [ ] EAS Build succeeds for iOS and Android
- [ ] App icons and splash screen display correctly
- [ ] Environment switching works (dev/staging/prod)
- [ ] No TypeScript errors
- [ ] No ESLint warnings

**Handoff artifacts:** PHASE_12_HANDOFF.md (final release documentation)

---

## 5. Feature Inventory and Priority Matrix

### Priority Tiers

| Tier | Features | Phase |
| --- | --- | --- |
| **P0 - Must Have** | Auth, Dashboard, Calendar (basic), Shopping (basic), Navigation | 1-6 |
| **P1 - Should Have** | Google Calendar sync, Tasks, Contacts, Family Hub, Settings, Notifications | 5, 7, 9 |
| **P2 - Nice to Have** | AI Voice, Affirmations, Life Receipts, Gift Finder, Cycle Tracker | 8-10 |
| **P3 - Future** | Offline sync, Full E2E tests, App Store submission | 11-12 |

### Feature Dependency Graph

```text
Phase 1 (Foundation)
  |
Phase 2 (UI Components)
  |
Phase 3 (Auth + Navigation)
  |
Phase 4 (Dashboard)
  |
  +-- Phase 5 (Calendar) --> Phase 9 (Settings, Cycle Tracker)
  |
  +-- Phase 6 (Shopping) ----+
  |                           |
  +-- Phase 7 (Tasks/Family) -+
  |                           |
  +-- Phase 8 (AI/Affirm) ---+
  |                           |
  +-- Phase 10 (Life Receipts, Gift Finder, Tutorials)
                              |
                        Phase 11 (Offline + Polish)
                              |
                        Phase 12 (Testing + Release)
```

Phases 5-10 can be executed in parallel (they share dependencies on Phases 1-4 but not on each other, with the exception that Phase 9's Cycle Tracker depends on Phase 5's calendar infrastructure).

---

## 6. Data Architecture

### 6.1 Local Storage Strategy

| Data Type | Storage | Sync Strategy |
| --- | --- | --- |
| Auth session | SecureStore (expo-secure-store) | Managed by Supabase SDK |
| User preferences | AsyncStorage | Read from DB, cache locally |
| Dashboard data | In-memory (React Query cache) | Refetch on focus/pull-to-refresh |
| Events | React Query cache + AsyncStorage fallback | Real-time subscription + periodic sync |
| Shopping items | React Query cache | Real-time subscription |
| Tasks | React Query cache | Real-time subscription |
| Contacts | React Query cache | Periodic sync |
| Recipes | React Query cache | Cache on first load |
| Offline queue | AsyncStorage | Process on reconnect |

### 6.2 Offline Queue Design

```typescript
interface QueuedOperation {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, any>;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
}
```

Operations are stored in AsyncStorage under `@offline_queue` and processed FIFO when connectivity returns.

### 6.3 Cache Invalidation

- **Time-based:** Weather data (15 min), recipes (1 hour), affiliate matrix (24 hours)
- **Event-based:** User modifies data -> invalidate related queries
- **Manual:** Pull-to-refresh invalidates screen-level cache
- **Real-time:** Supabase real-time subscriptions push changes to cache

---

## 7. Integration Architecture

### 7.1 Google Calendar

**Mobile-specific considerations:**

- Use `expo-auth-session` for Google OAuth (not browser redirect)
- Store Google tokens via the existing `store-google-tokens` edge function
- Calendar API calls go through the existing `google-calendar` edge function
- Sync orchestrator runs on a timer (configurable, default 15 min)
- Background sync via `expo-background-fetch` (when app is backgrounded)

### 7.2 Google Maps / Places

**Mobile-specific considerations:**

- Use `react-native-maps` for map display (if needed)
- Location autocomplete calls the existing `google-places-autocomplete` edge function
- Directions: use `Linking.openURL` to open native Google Maps / Apple Maps
- Geocoding through the existing edge function
- Device location via `expo-location`

### 7.3 Instacart

**Mobile-specific considerations:**

- All API calls go through existing edge functions (no direct API calls from mobile)
- "Open in Instacart" uses `Linking.openURL` with the Instacart deep link
- Retailer selection uses device location for nearest stores

### 7.4 Push Notifications

**Mobile-specific (Expo Notifications):**

- Register for push notifications via `expo-notifications`
- Store push token in Supabase `notification_settings` table
- Schedule local notifications for events, tasks, reminders
- Handle notification permissions (request on first relevant action, not on app start)
- Background notification delivery via Expo push service

### 7.5 OpenAI / Voice

**Mobile-specific considerations:**

- Text chat: call the `openai-chat` edge function
- Voice: use `expo-av` for recording, send audio to edge function
- Real-time voice: evaluate `openai-realtime` via WebSocket (if supported in RN)
- Fallback: speech-to-text locally, then text chat
- AI personality preferences from `ai_voice_preferences` table

### 7.6 Weather

- Use `expo-location` for device coordinates
- Call the `weather-mcp` edge function with coordinates
- Cache results for 15 minutes
- Display in dashboard widget

---

## 8. Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Google OAuth in React Native is complex | Auth flow breaks | Use `expo-auth-session` with well-tested config; test on both platforms early |
| WebRTC for real-time voice may not work in RN | Voice chat feature broken | Implement speech-to-text fallback; use REST-based chat as backup |
| Expo SDK version conflicts | Build failures | Pin all dependency versions; test builds in every phase |
| Offline sync conflicts | Data loss/corruption | Implement optimistic locking with last-write-wins; queue with retry |
| Large codebase exceeds single agent context | Incomplete phases | Strict phase boundaries; each phase is self-contained |

### Medium Risk

| Risk | Impact | Mitigation |
| --- | --- | --- |
| iOS/Android behavior differences | Features work on one platform only | Test on both platforms in every phase; use Platform.select where needed |
| React Native maps performance | Calendar/location features slow | Use native maps sparingly; prefer list views |
| Expo Go limitations | Development workflow issues | Plan for dev builds early if native modules needed |
| Background sync reliability | Stale data | Implement foreground refresh triggers; show last-sync time |

### Low Risk

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Supabase SDK compatibility | Minor API differences | Use latest @supabase/supabase-js; test queries early |
| Icon/asset rendering | Visual glitches | Use SVG icons via react-native-svg; test on both platforms |
| Dark mode inconsistencies | Visual bugs | Use theme context consistently; test both themes |

---

## 9. Quality Standards

### 9.1 Code Style

**ESLint Configuration:**

- Extend: `@react-native-community`, `plugin:@typescript-eslint/recommended`
- Rules: no-any (warn), no-unused-vars (error), no-console (warn in prod)

**Prettier Configuration:**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### 9.2 TypeScript Strictness

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false
  }
}
```

### 9.3 Testing Coverage

| Layer | Minimum Coverage | Tool |
| --- | --- | --- |
| Services/Utils | 70% | Jest |
| Hooks | 50% | React Native Testing Library |
| Components | 30% (critical paths) | React Native Testing Library |
| E2E | 5 critical flows | Detox or Maestro |

### 9.4 Accessibility

- All touchable elements have `accessibilityLabel`
- All images have `accessibilityLabel` or `accessible={false}`
- Color contrast ratio >= 4.5:1 for text
- Touch targets >= 44x44 points
- Screen reader navigation order is logical
- Dynamic type support (respect system font size)

### 9.5 Performance Budgets

| Metric | Target |
| --- | --- |
| Cold start to interactive | < 3 seconds |
| Screen transition | < 300ms |
| List scroll (FPS) | >= 55 FPS |
| API response handling | < 500ms perceived |
| JS bundle size | < 5 MB |
| Memory usage | < 200 MB |

---

## 10. Success Metrics

### 10.1 Feature Completion Checklist

- [ ] Authentication (email + Google OAuth)
- [ ] Onboarding wizard
- [ ] Dashboard with weather, schedule, quick actions, affirmation
- [ ] Calendar with month view and event management
- [ ] Google Calendar bidirectional sync
- [ ] Shopping list with categories
- [ ] Recipe browser with Instacart integration
- [ ] Tasks with assignment and Google Tasks sync
- [ ] Contacts with categories and Google Contacts sync
- [ ] Family Hub with member management
- [ ] Family Folders
- [ ] AI Voice Chat
- [ ] Daily Affirmations with scheduling
- [ ] Push Notifications
- [ ] Cycle Tracker
- [ ] Life Receipts (text, voice, camera)
- [ ] Gift Finder
- [ ] Quick Links
- [ ] Settings (all categories)
- [ ] Dark mode
- [ ] Tutorial overlay
- [ ] Offline reading
- [ ] Error handling (boundaries, toasts)

### 10.2 Quality Gates (Must Pass Before Release)

1. **Build gate:** `npx tsc --noEmit` passes with zero errors
2. **Lint gate:** `npx eslint . --ext .ts,.tsx` passes with zero errors
3. **Test gate:** All unit and integration tests pass
4. **Build gate:** EAS Build succeeds for iOS and Android
5. **Functional gate:** All P0 and P1 features work on both platforms
6. **Performance gate:** Cold start < 3s, scroll >= 55 FPS
7. **Accessibility gate:** VoiceOver/TalkBack can navigate all screens

### 10.3 UX Validation Criteria

- Navigation: user can reach any feature in 3 taps or fewer
- Forms: all required fields are marked, validation is inline
- Loading: skeleton screens for all data-fetching views
- Empty states: helpful empty states with CTAs for all lists
- Error recovery: all errors have retry actions
- Haptic feedback: on destructive actions and successful saves

---

## Appendix A: Key File Paths Reference

### Web App (source of truth for features)

```text
Busy_Moms/src/
  components/         # 77 TSX component files
  hooks/              # 18 custom hooks
  services/           # 35 service modules
  utils/              # 14 utility modules
  lib/                # Supabase client, config, error types
```

### Mobile App (target)

```text
BusyMoms-mobile/
  app/                # Expo Router screens
  src/
    components/       # React Native components
    hooks/            # Custom hooks (mobile-adapted)
    services/         # Service layer (shared logic with web)
    utils/            # Utility functions (portable from web)
    lib/              # Supabase client, cache, offline
    contexts/         # React contexts (auth, theme)
    theme/            # Design tokens
    types/            # TypeScript type definitions
```

### Supabase (shared, read-only for mobile team)

```text
Busy_Moms/supabase/
  functions/          # 22 edge functions
  migrations/         # Database migrations
```

---

## Appendix B: Dependency List

### Required Expo/RN packages

```text
expo ~54.x
expo-router ~6.x
expo-auth-session
expo-secure-store
expo-notifications
expo-location
expo-av (audio recording)
expo-camera (life receipts)
expo-image-picker
expo-haptics
expo-linking
expo-constants
expo-status-bar
expo-background-fetch
expo-task-manager
react-native-safe-area-context
react-native-screens
react-native-svg
react-native-gesture-handler
react-native-reanimated
@react-native-async-storage/async-storage
@supabase/supabase-js ^2.89+
@tanstack/react-query ^5.x (data fetching/caching)
lucide-react-native
date-fns (date utilities)
zod (validation)
```

### Development dependencies

```text
typescript ~5.9
@types/react
jest
@testing-library/react-native
eslint
prettier
```
