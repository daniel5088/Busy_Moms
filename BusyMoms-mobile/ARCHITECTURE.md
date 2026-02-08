# ARCHITECTURE
# Busy Moms Mobile -- Technical Architecture

**Version:** 1.0
**Date:** 2026-02-08

---

## 1. Directory Structure

```
BusyMoms-mobile/
|
|-- app/                           # Expo Router file-based routing
|   |-- _layout.tsx                # Root layout (auth guard, providers)
|   |-- index.tsx                  # Entry redirect (auth check)
|   |
|   |-- (auth)/                    # Auth group (no tabs shown)
|   |   |-- _layout.tsx            # Stack layout for auth screens
|   |   |-- login.tsx              # Sign in screen
|   |   |-- signup.tsx             # Sign up screen
|   |   |-- forgot-password.tsx    # Password reset
|   |
|   |-- (onboarding)/             # Onboarding group (no tabs)
|   |   |-- _layout.tsx           # Stack layout for onboarding
|   |   |-- profile.tsx           # Profile setup (name, type)
|   |   |-- family.tsx            # Add family members
|   |   |-- preferences.tsx       # App preferences (dark mode, etc.)
|   |   |-- complete.tsx          # Onboarding complete screen
|   |
|   |-- (tabs)/                   # Main app with bottom tabs
|   |   |-- _layout.tsx           # Tab navigator configuration
|   |   |-- dashboard.tsx         # Home / Dashboard tab
|   |   |-- calendar.tsx          # Calendar tab
|   |   |-- shopping.tsx          # Shopping tab
|   |   |-- family.tsx            # Family Hub tab
|   |   |-- more.tsx              # More / Settings tab
|   |
|   |-- event/                    # Event screens (stack)
|   |   |-- [id].tsx              # Event detail
|   |   |-- create.tsx            # Create event
|   |
|   |-- task/                     # Task screens
|   |   |-- [id].tsx
|   |   |-- create.tsx
|   |
|   |-- contact/                  # Contact screens
|   |   |-- [id].tsx
|   |   |-- create.tsx
|   |
|   |-- recipe/                   # Recipe screens
|   |   |-- [id].tsx              # Recipe detail
|   |
|   |-- family-member/            # Family member screens
|   |   |-- [id].tsx              # Edit family member
|   |
|   |-- life-receipts/            # Life Receipts screens
|   |   |-- index.tsx
|   |   |-- capture.tsx
|   |   |-- triage.tsx
|   |   |-- view.tsx
|   |
|   |-- settings/                 # Settings sub-screens
|   |   |-- index.tsx
|   |   |-- notifications.tsx
|   |   |-- sync.tsx
|   |   |-- addresses.tsx
|   |   |-- weather.tsx
|   |   |-- measurement.tsx
|   |   |-- voice-preferences.tsx
|   |   |-- about.tsx
|   |
|   |-- voice-chat.tsx            # AI Voice Chat (modal)
|   |-- cycle-tracker.tsx         # Cycle Tracker
|   |-- gift-finder.tsx           # Gift Finder
|   |-- quick-links.tsx           # Quick Links
|
|-- src/
|   |-- components/               # Reusable React Native components
|   |   |-- ui/                   # Primitive UI components
|   |   |   |-- Button.tsx
|   |   |   |-- Card.tsx
|   |   |   |-- Input.tsx
|   |   |   |-- Modal.tsx
|   |   |   |-- Toast.tsx
|   |   |   |-- Badge.tsx
|   |   |   |-- Avatar.tsx
|   |   |   |-- Skeleton.tsx
|   |   |   |-- EmptyState.tsx
|   |   |   |-- Divider.tsx
|   |   |   |-- Switch.tsx
|   |   |   |-- Select.tsx
|   |   |   |-- Chip.tsx
|   |   |   |-- ProgressBar.tsx
|   |   |   |-- FloatingActionButton.tsx
|   |   |   |-- NetworkBanner.tsx
|   |   |
|   |   |-- layout/              # Layout components
|   |   |   |-- Screen.tsx       # SafeAreaView wrapper with theme
|   |   |   |-- Header.tsx       # Screen header with back button
|   |   |   |-- Section.tsx      # Content section with title
|   |   |   |-- KeyboardAvoid.tsx # Keyboard-avoiding wrapper
|   |   |
|   |   |-- forms/               # Form components
|   |   |   |-- FormField.tsx    # Label + input + error wrapper
|   |   |   |-- DateTimePicker.tsx
|   |   |   |-- SearchInput.tsx
|   |   |   |-- MeasurementInput.tsx
|   |   |
|   |   |-- errors/              # Error handling components
|   |   |   |-- ErrorBoundary.tsx
|   |   |   |-- ErrorFallback.tsx
|   |   |
|   |   |-- dashboard/           # Dashboard-specific
|   |   |   |-- WeatherWidget.tsx
|   |   |   |-- QuickActionsGrid.tsx
|   |   |   |-- TodaysSchedule.tsx
|   |   |   |-- AffirmationBanner.tsx
|   |   |   |-- UpcomingEvents.tsx
|   |   |
|   |   |-- calendar/            # Calendar-specific
|   |   |   |-- CalendarView.tsx
|   |   |   |-- EventCard.tsx
|   |   |   |-- EventForm.tsx
|   |   |   |-- SyncStatus.tsx
|   |   |   |-- ConflictResolution.tsx
|   |   |   |-- TravelTimeIndicator.tsx
|   |   |   |-- EventWeatherIcon.tsx
|   |   |
|   |   |-- shopping/            # Shopping-specific
|   |   |   |-- ShoppingList.tsx
|   |   |   |-- ShoppingForm.tsx
|   |   |   |-- CategorySection.tsx
|   |   |   |-- RecipeBrowser.tsx
|   |   |   |-- RecipeDetail.tsx
|   |   |   |-- InstacartButton.tsx
|   |   |   |-- RetailerSelector.tsx
|   |   |
|   |   |-- tasks/               # Tasks-specific
|   |   |   |-- TaskList.tsx
|   |   |   |-- TaskForm.tsx
|   |   |   |-- TaskCard.tsx
|   |   |   |-- TaskSyncStatus.tsx
|   |   |
|   |   |-- contacts/            # Contacts-specific
|   |   |   |-- ContactList.tsx
|   |   |   |-- ContactForm.tsx
|   |   |   |-- ContactCard.tsx
|   |   |
|   |   |-- family/              # Family-specific
|   |   |   |-- FamilyHub.tsx
|   |   |   |-- FamilyMemberCard.tsx
|   |   |   |-- FamilyMemberForm.tsx
|   |   |   |-- FamilyFolders.tsx
|   |   |
|   |   |-- ai/                  # AI-specific
|   |   |   |-- VoiceChat.tsx
|   |   |   |-- ChatBubble.tsx
|   |   |   |-- VoiceRecorder.tsx
|   |   |
|   |   |-- affirmations/        # Affirmation-specific
|   |   |   |-- DailyAffirmation.tsx
|   |   |   |-- AffirmationSettings.tsx
|   |   |   |-- AffirmationNotification.tsx
|   |   |
|   |   |-- settings/            # Settings-specific
|   |   |   |-- SettingsList.tsx
|   |   |   |-- SettingsRow.tsx
|   |   |   |-- AddressManager.tsx
|   |   |   |-- AddressForm.tsx
|   |   |
|   |   |-- cycle/               # Cycle Tracker-specific
|   |   |   |-- CycleTracker.tsx
|   |   |   |-- CycleCalendar.tsx
|   |   |   |-- SymptomLogger.tsx
|   |   |
|   |   |-- life-receipts/       # Life Receipts-specific
|   |   |   |-- CaptureFlow.tsx
|   |   |   |-- TriageFlow.tsx
|   |   |   |-- ReceiptCard.tsx
|   |   |
|   |   |-- gift-finder/         # Gift Finder-specific
|   |   |   |-- GiftFinderForm.tsx
|   |   |   |-- AffiliateResults.tsx
|   |   |
|   |   |-- tutorials/           # Tutorial-specific
|   |       |-- TutorialOverlay.tsx
|   |
|   |-- hooks/                   # Custom React hooks
|   |   |-- useAuth.ts
|   |   |-- useTheme.ts
|   |   |-- useDashboardData.ts
|   |   |-- useWeather.ts
|   |   |-- useQuickActions.ts
|   |   |-- useCalendarSync.ts
|   |   |-- useEventWeather.ts
|   |   |-- useRetailerSelection.ts
|   |   |-- useProfile.ts
|   |   |-- useAffirmationNotifier.ts
|   |   |-- useNotificationManager.ts
|   |   |-- useTutorial.ts
|   |   |-- useAffiliateMatrix.ts
|   |   |-- useNetworkStatus.ts
|   |   |-- useOfflineSync.ts
|   |   |-- useFormValidation.ts
|   |   |-- useDefaultAddress.ts
|   |   |-- useDarkMode.ts
|   |
|   |-- services/                # Backend service layer
|   |   |-- profileService.ts
|   |   |-- weatherService.ts
|   |   |-- quickActionsService.ts
|   |   |-- googleCalendarService.ts
|   |   |-- calendarSyncService.ts
|   |   |-- syncOrchestrator.ts
|   |   |-- locationService.ts
|   |   |-- geocodingService.ts
|   |   |-- directionsService.ts
|   |   |-- travelTimeService.ts
|   |   |-- shoppingService.ts
|   |   |-- recipeService.ts
|   |   |-- instacartService.ts
|   |   |-- measurementService.ts
|   |   |-- taskService.ts
|   |   |-- taskSyncService.ts
|   |   |-- contactService.ts
|   |   |-- googleContactsService.ts
|   |   |-- familyService.ts
|   |   |-- aiChatService.ts
|   |   |-- aiVoiceService.ts
|   |   |-- aiVoicePreferences.ts
|   |   |-- affirmationService.ts
|   |   |-- notificationService.ts
|   |   |-- cycleTrackerService.ts
|   |   |-- addressService.ts
|   |   |-- userSettingsService.ts
|   |   |-- lifeReceiptsService.ts
|   |   |-- lifeReceiptsAIService.ts
|   |   |-- affiliateMatrixService.ts
|   |   |-- birthdayEventsService.ts
|   |   |-- tutorialService.ts
|   |   |-- errorLogService.ts
|   |
|   |-- utils/                   # Pure utility functions
|   |   |-- timeFormatters.ts
|   |   |-- ageCalculator.ts
|   |   |-- measurementConverter.ts
|   |   |-- ingredientParser.ts
|   |   |-- instacartUnitMapper.ts
|   |   |-- contactCategorizer.ts
|   |   |-- dateDetection.ts
|   |   |-- gradientMapper.ts
|   |   |-- lifeReceiptsFormatters.ts
|   |   |-- errorMessages.ts
|   |   |-- sampleRecipes.ts
|   |   |-- tutorialSteps.ts
|   |   |-- weatherCacheKey.ts
|   |   |-- affirmationScheduler.ts
|   |   |-- networkClient.ts
|   |
|   |-- lib/                     # Core library modules
|   |   |-- supabase.ts          # Supabase client with AsyncStorage
|   |   |-- config.ts            # Environment configuration
|   |   |-- offlineQueue.ts      # Offline operation queue
|   |   |-- cacheManager.ts      # AsyncStorage cache layer
|   |   |-- syncEngine.ts        # Generic sync engine
|   |   |-- queryClient.ts       # React Query client setup
|   |
|   |-- contexts/                # React context providers
|   |   |-- AuthContext.tsx       # Authentication state
|   |   |-- ThemeContext.tsx      # Dark mode / theme
|   |   |-- NotificationContext.tsx # Notification state
|   |
|   |-- theme/                   # Design system tokens
|   |   |-- colors.ts
|   |   |-- spacing.ts
|   |   |-- typography.ts
|   |   |-- shadows.ts
|   |   |-- index.ts
|   |
|   |-- types/                   # TypeScript type definitions
|       |-- database.ts          # All Supabase table types
|       |-- navigation.ts        # Navigation/route types
|       |-- api.ts               # API request/response types
|       |-- common.ts            # Shared utility types
|
|-- assets/                      # Static assets
|   |-- icon.png                 # App icon (1024x1024)
|   |-- adaptive-icon.png        # Android adaptive icon
|   |-- splash-icon.png          # Splash screen icon
|   |-- favicon.png              # Web favicon
|   |-- images/                  # App images
|
|-- __tests__/                   # Test files (mirrors src/ structure)
|-- e2e/                         # End-to-end tests
|
|-- app.config.ts                # Expo configuration
|-- eas.json                     # EAS Build configuration
|-- tsconfig.json
|-- .eslintrc.js
|-- .prettierrc
|-- babel.config.js
|-- metro.config.js
|-- package.json
|-- MOBILE_REBUILD_MASTER_PLAN.md
|-- ARCHITECTURE.md
|-- MIGRATION_GUIDE.md
|-- REBUILD_PROGRESS.md
```

---

## 2. Component Architecture

### 2.1 Component Layers

```
+----------------------------------------------+
|  Screen (app/ route files)                    |
|  - Route definition, data fetching, layout    |
+----------------------------------------------+
|  Feature Components (src/components/[feature])|
|  - Business logic, state management           |
+----------------------------------------------+
|  UI Components (src/components/ui/)           |
|  - Pure presentational, theme-aware           |
+----------------------------------------------+
|  Design Tokens (src/theme/)                   |
|  - Colors, spacing, typography, shadows       |
+----------------------------------------------+
```

**Screens** are thin. They compose feature components and handle navigation. They are the only layer that imports `useLocalSearchParams`, `useRouter`, etc.

**Feature components** own the business logic for a specific feature area. They call services/hooks and render UI components.

**UI components** are stateless (or minimally stateful for UI-only state like open/closed). They accept all data and callbacks via props. They use the theme system for styling.

### 2.2 Component Patterns

**Consistent component structure:**
```typescript
// src/components/ui/Button.tsx

import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const { colors, spacing } = useTheme();

  // ... implementation
}
```

**Key principles:**
1. Every component exports a named function (not default export except for screens)
2. Props interface is always defined and exported
3. Theme tokens are consumed via `useTheme()` hook, never hardcoded
4. Styles are defined with `StyleSheet.create` (not inline objects) for performance
5. Platform-specific code uses `Platform.select` or separate files (`*.ios.tsx`, `*.android.tsx`)
6. Loading and error states are always handled

### 2.3 Screen Pattern

```typescript
// app/event/create.tsx

import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { EventForm } from '../../src/components/calendar/EventForm';
import { useAuth } from '../../src/hooks/useAuth';

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = async (eventData: EventFormData) => {
    setSaving(true);
    try {
      await eventService.createEvent({ ...eventData, user_id: user.id });
      router.back();
    } catch (error) {
      // error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title="New Event" onBack={() => router.back()} />
      <EventForm onSubmit={handleSave} loading={saving} />
    </Screen>
  );
}
```

---

## 3. State Management

### 3.1 Approach: React Query + React Context

**Decision: Use `@tanstack/react-query` for server state and React Context for client state.**

**Rationale:**
- The app is primarily a CRUD client for Supabase; most state is server state
- React Query provides caching, background refetching, optimistic updates, and offline support
- React Context is sufficient for the small amount of client-only state (theme, auth session)
- Zustand or Redux would add unnecessary complexity for this app's needs

**Alternatives considered:**
- **Redux Toolkit:** Rejected. Overkill for a CRUD app. Too much boilerplate.
- **Zustand:** Viable alternative. Could be used if Context becomes unwieldy. Currently unnecessary.
- **MobX:** Rejected. Too different from existing patterns. Team unfamiliarity.

### 3.2 State Categories

| Category | Tool | Examples |
|---|---|---|
| Server state | React Query | Events, tasks, shopping, contacts, recipes |
| Auth state | React Context (AuthContext) | User session, profile |
| Theme state | React Context (ThemeContext) | Dark mode, color scheme |
| Notification state | React Context | Push token, pending notifications |
| Form state | Local useState / react-hook-form | Form inputs, validation |
| UI state | Local useState | Modal open/closed, selected tab |
| Navigation state | Expo Router (automatic) | Current route, params |

### 3.3 React Query Configuration

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 30,         // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 3.4 Query Key Convention

```typescript
// Consistent key structure: [entity, scope, params]
const queryKeys = {
  events: {
    all: ['events'] as const,
    byDate: (date: string) => ['events', 'byDate', date] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    byStatus: (status: string) => ['tasks', 'byStatus', status] as const,
  },
  shopping: {
    all: ['shopping'] as const,
    byCategory: (category: string) => ['shopping', 'byCategory', category] as const,
  },
  // ... etc
};
```

---

## 4. Navigation Structure

### 4.1 Navigator Hierarchy

```
RootStack (Stack)
|
|-- index (redirect based on auth state)
|
|-- (auth) (Stack Group)
|   |-- login
|   |-- signup
|   |-- forgot-password
|
|-- (onboarding) (Stack Group)
|   |-- profile
|   |-- family
|   |-- preferences
|   |-- complete
|
|-- (tabs) (Tab Navigator)
|   |-- dashboard (Home)
|   |-- calendar
|   |-- shopping
|   |-- family (Family Hub)
|   |-- more (More Menu)
|
|-- event/[id] (Stack, presented modally or pushed)
|-- event/create
|-- task/[id]
|-- task/create
|-- contact/[id]
|-- contact/create
|-- recipe/[id]
|-- family-member/[id]
|-- life-receipts/index
|-- life-receipts/capture
|-- life-receipts/triage
|-- life-receipts/view
|-- settings/index
|-- settings/notifications
|-- settings/sync
|-- settings/addresses
|-- settings/weather
|-- settings/measurement
|-- settings/voice-preferences
|-- settings/about
|-- voice-chat (modal presentation)
|-- cycle-tracker
|-- gift-finder
|-- quick-links
```

### 4.2 Tab Configuration

| Tab | Icon | Label | Screen |
|---|---|---|---|
| 1 | Home | Home | dashboard.tsx |
| 2 | Calendar | Calendar | calendar.tsx |
| 3 | ShoppingBag | Shop | shopping.tsx |
| 4 | Users | Family | family.tsx |
| 5 | Menu | More | more.tsx |

### 4.3 Auth Guard

The root `_layout.tsx` wraps the entire app in providers and implements an auth guard:

```typescript
// app/_layout.tsx (simplified)
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <AuthGuard />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && !user.profile?.onboarding_completed && !inOnboarding) {
      router.replace('/(onboarding)/profile');
    } else if (user && user.profile?.onboarding_completed && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, loading, segments]);

  return <Slot />;
}
```

---

## 5. API / Backend Integration

### 5.1 Supabase Client Setup

```typescript
// src/lib/supabase.ts

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Custom storage adapter that uses SecureStore for auth tokens
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important: disable for React Native
  },
  db: { schema: 'public' },
});
```

### 5.2 Edge Function Calls

All edge function calls follow a consistent pattern:

```typescript
// src/lib/supabase.ts (helper)

export async function callEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${config.supabaseUrl}/functions/v1/${functionName}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': config.supabaseAnonKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Edge function error: ${response.status}`);
  }

  return response.json();
}
```

### 5.3 Real-time Subscriptions

For real-time data (events, shopping, tasks), use Supabase real-time channels:

```typescript
// Example: Real-time shopping list
useEffect(() => {
  const channel = supabase
    .channel('shopping_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shopping_lists',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        // Invalidate React Query cache to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['shopping'] });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user.id]);
```

---

## 6. Testing Strategy

### 6.1 Testing Pyramid

```
       /\
      /  \       E2E Tests (Detox/Maestro)
     /    \      5 critical user flows
    /------\
   /        \    Integration Tests
  /          \   Hooks + services with mocked Supabase
 /------------\
/              \  Unit Tests
/                \ Utils, formatters, parsers, converters
------------------
```

### 6.2 Unit Tests

Target: All files in `src/utils/` and pure functions in `src/services/`.

```typescript
// __tests__/utils/measurementConverter.test.ts
import { MeasurementConverter } from '../../src/utils/measurementConverter';

describe('MeasurementConverter', () => {
  it('converts cups to milliliters', () => {
    const result = MeasurementConverter.convert(2, 'cup', 'milliliter');
    expect(result.quantity).toBeCloseTo(473.18, 0);
  });
});
```

### 6.3 Integration Tests

Target: Hooks that interact with Supabase (mocked).

```typescript
// __tests__/hooks/useDashboardData.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useDashboardData } from '../../src/hooks/useDashboardData';

// Mock supabase
jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));
```

### 6.4 E2E Tests

Target: 5 critical flows.

1. **Authentication:** Sign in -> see dashboard -> sign out
2. **Create Event:** Navigate to calendar -> create event -> verify event appears
3. **Shopping:** Add item to list -> mark as complete
4. **Family:** Add family member -> verify in family hub
5. **Settings:** Change dark mode -> verify theme changes

---

## 7. Performance Considerations

### 7.1 List Virtualization

All lists MUST use `FlatList` (or `SectionList` for grouped data). Never use `ScrollView` with `.map()` for lists that can grow beyond 20 items.

```typescript
// Good
<FlatList
  data={events}
  renderItem={({ item }) => <EventCard event={item} />}
  keyExtractor={(item) => item.id}
  getItemLayout={(_, index) => ({
    length: EVENT_CARD_HEIGHT,
    offset: EVENT_CARD_HEIGHT * index,
    index,
  })}
/>

// Bad
<ScrollView>
  {events.map(event => <EventCard key={event.id} event={event} />)}
</ScrollView>
```

### 7.2 Memoization

- Use `React.memo` for list item components
- Use `useCallback` for event handlers passed to child components
- Use `useMemo` for expensive computations (filtering, sorting)
- Do NOT over-memoize; only memoize where profiling shows benefit

### 7.3 Image Optimization

- Use `expo-image` (or `react-native-fast-image`) for network images
- Set explicit dimensions on all images to avoid layout shifts
- Use appropriate image sizes (no loading 2000px images for 100px thumbnails)
- Implement placeholder/skeleton for loading images

### 7.4 Bundle Optimization

- Dynamic imports for large screens (`React.lazy` equivalent not available in RN; use route-based splitting from Expo Router)
- Tree-shake imports (import specific functions, not entire libraries)
- Avoid importing entire icon sets; import individual icons

### 7.5 Animation Performance

- Use `react-native-reanimated` for animations (runs on UI thread)
- Avoid animating layout properties (width, height, padding)
- Prefer transform and opacity animations
- Use `useNativeDriver: true` for Animated API (or just use Reanimated)

---

## 8. Security Considerations

### 8.1 Token Storage

- Auth tokens stored in `expo-secure-store` (encrypted, not plain AsyncStorage)
- Google OAuth tokens stored in Supabase `google_tokens` table (server-side)
- API keys never stored in app code; all sensitive calls go through edge functions

### 8.2 Network Security

- All API calls over HTTPS
- Supabase anon key is safe for client-side (RLS protects data)
- Edge functions validate JWT tokens on every request
- No sensitive data logged to console in production

### 8.3 Data Privacy

- RLS policies on all Supabase tables ensure user isolation
- Offline cache stored in AsyncStorage (device-local, cleared on sign-out)
- No PII sent to third-party analytics

---

## 9. Error Handling Architecture

### 9.1 Error Layers

```
UI Layer:    ErrorBoundary (catches render errors)
             Toast notifications (user-facing errors)
             Inline error states (form validation)

Hook Layer:  try/catch in async operations
             Error state returned to components
             React Query error handling

Service Layer: Typed error responses
               Retry logic for transient failures
               Error logging to Supabase error_logs table
```

### 9.2 Error Boundary

Every tab screen is wrapped in an ErrorBoundary that catches render-time errors and displays a fallback UI with a "Try Again" button.

### 9.3 Toast System

A global toast context provides `showToast(message, type)` that displays non-blocking notifications for success, warning, and error states. Toasts auto-dismiss after 3 seconds.

### 9.4 Error Logging

Critical errors are logged to the Supabase `error_logs` table via the `errorLogService` for monitoring.

---

## 10. Environment Configuration

### 10.1 Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_ENVIRONMENT=development|staging|production
```

### 10.2 EAS Build Configuration

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_ENVIRONMENT": "production"
      }
    }
  }
}
```

### 10.3 Feature Flags

Use a simple feature flag system based on environment:

```typescript
// src/lib/config.ts
export const featureFlags = {
  enableVoiceChat: config.environment !== 'production', // until stable
  enableLifeReceipts: true,
  enableCycleTracker: true,
  enableOfflineMode: config.environment === 'production',
};
```
