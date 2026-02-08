# Agent Session 12 -- Phase 12: Testing, Build Configuration, and Release Prep

## Context from Previous Sessions
- Phases 1-11 complete: All features built, polished, and optimized
- This is the final phase: testing, build config, and release preparation

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 12 section, Quality Standards, Success Metrics
2. `ARCHITECTURE.md` -- Section 6 (testing strategy)
3. `REBUILD_PROGRESS.md` and `PHASE_11_HANDOFF.md`
4. Performance benchmarks from Phase 11

## Your Mission
Write comprehensive tests, configure EAS Build for iOS and Android, create app assets (icons, splash), set up environment-based configuration, and perform a final QA pass.

## Prerequisites Check
- [ ] All 11 previous phases completed
- [ ] App runs without errors on both platforms
- [ ] Jest and @testing-library/react-native installed (Phase 1)

## Implementation Steps

### Step 1: Configure Jest
**jest.config.js** or in **package.json**
- Transform: babel-jest for TypeScript
- Setup file for mocking React Native modules
- Module name mapper for path aliases
- Coverage thresholds: 70% for services/utils

**jest.setup.js**
- Mock AsyncStorage
- Mock expo-secure-store
- Mock expo-location
- Mock expo-notifications
- Mock expo-haptics
- Mock react-native-reanimated
- Mock Supabase client

### Step 2: Write unit tests for utilities
Target: All files in `src/utils/`

**src/__tests__/utils/measurementConverter.test.ts**
- Test all unit conversions (cup->ml, lb->kg, etc.)
- Test edge cases (0, negative, very large numbers)
- Test unknown units

**src/__tests__/utils/ingredientParser.test.ts**
- Test fraction parsing ("1/2 cup", "2 1/4 lb")
- Test range parsing ("2-3 cups")
- Test various formats

**src/__tests__/utils/instacartUnitMapper.test.ts**
- Test category-specific unit mapping
- Test Instacart compatibility validation

**src/__tests__/utils/timeFormatters.test.ts**
- Test date formatting
- Test time formatting
- Test relative time

**src/__tests__/utils/ageCalculator.test.ts**
- Test age calculation from birthday
- Test edge cases (today's birthday, Feb 29)

**src/__tests__/utils/dateDetection.test.ts**
- Test date extraction from text

### Step 3: Write unit tests for services
Test pure logic in services (mock Supabase calls):

**src/__tests__/services/weatherService.test.ts**
**src/__tests__/services/measurementService.test.ts**
**src/__tests__/services/shoppingService.test.ts**
**src/__tests__/services/taskService.test.ts**
**src/__tests__/services/profileService.test.ts**

### Step 4: Write integration tests for hooks
Using @testing-library/react-native renderHook:

**src/__tests__/hooks/useAuth.test.ts**
- Test sign-in flow
- Test sign-out flow
- Test auth state persistence

**src/__tests__/hooks/useDashboardData.test.ts**
- Test data loading
- Test empty state
- Test error handling

**src/__tests__/hooks/useTheme.test.ts**
- Test dark mode toggle
- Test theme color values

**src/__tests__/hooks/useNetworkStatus.test.ts**
- Test connectivity detection

### Step 5: Write E2E tests (if time permits)
Using Maestro or Detox:

**e2e/auth.test.ts**
1. Launch app -> see login screen
2. Enter credentials -> sign in -> see dashboard
3. Sign out -> see login screen

**e2e/createEvent.test.ts**
1. Navigate to calendar
2. Tap create event
3. Fill form
4. Save
5. Verify event appears in calendar

**e2e/shopping.test.ts**
1. Navigate to shopping
2. Add item
3. Check off item
4. Verify item moved to completed

**e2e/familyMember.test.ts**
1. Navigate to family hub
2. Add family member
3. Verify member appears

**e2e/settings.test.ts**
1. Navigate to settings
2. Toggle dark mode
3. Verify theme changes

### Step 6: Configure EAS Build
**eas.json**
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "buildConfiguration": "Release" },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "staging"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": { "buildConfiguration": "Release" },
      "android": { "buildType": "app-bundle" },
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "APPLE_ID",
        "ascAppId": "ASC_APP_ID",
        "appleTeamId": "TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "production"
      }
    }
  }
}
```

### Step 7: Update app.config.ts for production
- Version bumping strategy
- iOS build number auto-increment
- Android version code auto-increment
- Environment-specific Supabase URLs (if using separate projects)
- Production Google OAuth client IDs
- Privacy manifest (iOS requirement)

### Step 8: Create app assets
- **assets/icon.png** -- 1024x1024 app icon
- **assets/adaptive-icon.png** -- Android adaptive icon (foreground)
- **assets/splash-icon.png** -- Splash screen icon
- **assets/favicon.png** -- Web favicon
- Ensure all assets are properly referenced in app.config.ts

### Step 9: Environment configuration
**src/lib/config.ts** -- update to support three environments:
- development: dev Supabase project (if separate)
- staging: staging Supabase project (if separate)
- production: production Supabase project

Feature flags per environment:
- enableVoiceChat: true in dev/staging, controlled in production
- enableDevTools: true in dev only
- logLevel: 'debug' in dev, 'warn' in staging, 'error' in production

### Step 10: Final QA pass
Run through every screen on both platforms:

**Auth flow:**
- [ ] Sign up with email
- [ ] Sign in with email
- [ ] Sign in with Google
- [ ] Forgot password
- [ ] Sign out

**Onboarding:**
- [ ] Profile setup
- [ ] Family member addition
- [ ] Preferences
- [ ] Complete

**Dashboard:**
- [ ] Weather loads
- [ ] Today's schedule shows
- [ ] Quick actions navigate
- [ ] Affirmation displays
- [ ] Pull-to-refresh works

**Calendar:**
- [ ] Month view renders
- [ ] Create event
- [ ] Edit event
- [ ] Delete event
- [ ] Google Calendar sync (if connected)
- [ ] Location autocomplete

**Shopping:**
- [ ] Add item
- [ ] Complete item
- [ ] Delete item
- [ ] Recipe browser
- [ ] Recipe detail with servings
- [ ] Instacart integration

**Tasks:**
- [ ] Create task
- [ ] Complete task
- [ ] Assign task
- [ ] Google Tasks sync

**Family:**
- [ ] View members
- [ ] Add member
- [ ] Edit member
- [ ] Family folders

**Contacts:**
- [ ] View contacts
- [ ] Add contact
- [ ] Call/email from contact

**AI Chat:**
- [ ] Text chat works
- [ ] Voice recording works

**Affirmations:**
- [ ] Daily affirmation shows
- [ ] Settings work
- [ ] Notifications fire

**Settings:**
- [ ] Dark mode
- [ ] Notifications
- [ ] Sync settings
- [ ] Addresses
- [ ] Measurement

**Life Receipts:**
- [ ] Text capture
- [ ] Triage
- [ ] View list

**Gift Finder:**
- [ ] Form completes
- [ ] Results show
- [ ] Links open

**Tutorials:**
- [ ] Show on first visit
- [ ] Can skip
- [ ] Can reset

**Offline:**
- [ ] Reads cached data
- [ ] Queues writes
- [ ] Banner shows

### Step 11: Create release documentation
**RELEASE_NOTES.md**
- Feature list
- Known issues
- Platform requirements
- Build instructions

## Quality Checklist
- [ ] Unit test coverage >70% for services and utils
- [ ] Integration tests pass for all hooks
- [ ] `npx tsc --noEmit` passes
- [ ] ESLint passes with zero errors
- [ ] EAS Build succeeds for iOS (simulator)
- [ ] EAS Build succeeds for Android (APK)
- [ ] All QA checklist items pass on iOS
- [ ] All QA checklist items pass on Android
- [ ] No console errors in production mode
- [ ] App icon displays correctly
- [ ] Splash screen displays correctly

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md` -- mark ALL phases complete
2. Create `PHASE_12_HANDOFF.md` (final handoff) with:
   - Test coverage report
   - Build instructions
   - Known issues
   - Release checklist
3. Create `RELEASE_NOTES.md`
4. Git commit and tag release

## Completion
This is the final phase. After this phase:
- The app is feature-complete with web parity
- All critical flows are tested
- Builds succeed for both platforms
- Ready for internal testing / beta distribution
