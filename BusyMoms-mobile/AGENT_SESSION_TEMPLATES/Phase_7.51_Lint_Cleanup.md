# Phase 7.51 Agent Session Template: ESLint Warning Cleanup

**Priority:** HIGH - Clean codebase before Phase 8 feature work
**Estimated effort:** Medium (all fixes are mechanical/type-annotation work, no new features)
**Prerequisite:** Phase 7.5 complete (0 TypeScript errors, ESLint + Jest functional)
**Token budget:** Each agent batch MUST stay under 180,000 tokens

---

## Objective

Resolve ALL 186 ESLint warnings across the codebase. After Phase 7.5 achieved 0 TypeScript errors, this phase eliminates all lint warnings to establish a clean baseline before Phase 8 (AI Features). The warnings break down into three categories:

| Category | Count | Rule |
|---|---|---|
| Untyped `any` usage | 88 | `@typescript-eslint/no-explicit-any` |
| Unused variables/imports | 51 | `@typescript-eslint/no-unused-vars` |
| Console statements | 47 | `no-console` |
| **Total** | **186** | |

---

## Pre-Flight Check

Before starting any agent batch, confirm current state:

```bash
cd BusyMoms-mobile
npx tsc --noEmit                                    # Should be 0 errors
npx eslint "src/**/*.{ts,tsx}" "app/**/*.{ts,tsx}"  # Should show 186 warnings, 0 errors
```

---

## Agent Batch Strategy

The work is split into **4 independent agent batches** that can run sequentially. Each batch targets a specific warning category and/or file group to stay well under the 180k token limit.

---

## Batch A: Unused Variables & Imports Cleanup

**Target:** 51 `@typescript-eslint/no-unused-vars` warnings across ~30 files
**Estimated tokens:** ~60,000-80,000
**Difficulty:** Easy (mechanical removals)

### Strategy
- **Unused imports:** Remove the import entirely
- **Unused function parameters:** Prefix with `_` (e.g., `error` → `_error`)
- **Unused local variables:** Remove if dead code, or prefix with `_` if needed for destructuring
- **DO NOT** change any logic or behavior - only remove/rename unused bindings

### Files to Fix (sorted by warning count)

| File | Warnings | What's Unused |
|---|---|---|
| `src/services/googleCalendarService.ts` | 7 | `startDate`, `endDate`, `event`, `googleEventId` params (placeholder service) |
| `app/(tabs)/shopping.tsx` | 4 | `Retailer`, `setShowCompleted`, `bulkUpdateMutation`, `importRecipeMutation`, `saveRetailerMutation` |
| `app/_layout.tsx` | 2 | `Slot`, `inTabs` |
| `src/components/forms/DateTimePicker.tsx` | 3 | `minimumDate`, `maximumDate`, `handleChange` |
| `app/(auth)/login.tsx` | 2 | `router`, `error` |
| `app/(auth)/signup.tsx` | 2 | `error` |
| `app/(onboarding)/preferences.tsx` | 1 | `Platform` |
| `app/component-showcase.tsx` | 2 | `ScrollView`, `styles` |
| `app/event/[id].tsx` | 1 | `Button` |
| `src/components/calendar/EventForm.tsx` | 1 | `familyMembers` |
| `src/components/contacts/ContactCard.tsx` | 1 | `Mail` |
| `src/components/dashboard/QuickActionsGrid.tsx` | 1 | `LucideIcon` |
| `src/components/dashboard/TodaysSchedule.tsx` | 1 | `Pressable` |
| `src/components/family/FamilyHub.tsx` | 2 | `Folder`, `Card` |
| `src/components/recipes/IngredientList.tsx` | 1 | `Ionicons` |
| `src/components/recipes/RecipeBrowser.tsx` | 1 | `ScrollView` |
| `src/components/recipes/RecipeDetail.tsx` | 1 | `useMemo` |
| `src/components/shopping/CategorySection.tsx` | 1 | `useState` |
| `src/components/shopping/ShoppingItemCard.tsx` | 1 | `Animated` |
| `src/components/shopping/ShoppingList.tsx` | 1 | `SectionData` |
| `src/components/tasks/TaskCard.tsx` | 2 | `Clock`, `Badge` |
| `src/components/tasks/TaskForm.tsx` | 1 | `X` |
| `src/components/tasks/TaskList.tsx` | 1 | `Circle` |
| `src/components/ui/Modal.tsx` | 1 | `View` |
| `src/components/ui/NetworkBanner.tsx` | 1 | `React` |
| `src/components/ui/Toast.tsx` | 1 | `Animated` |
| `src/hooks/useQuickActions.ts` | 1 | `QuickActionType` |
| `src/hooks/useRecipes.ts` | 1 | `RecipeIngredient` |
| `src/hooks/useTasks.ts` | 1 | `Task` |
| `src/hooks/useWeather.ts` | 1 | `WeatherData` |
| `src/services/locationService.ts` | 1 | `supabase` |
| `src/services/travelTimeService.ts` | 1 | `mode` param |
| `src/utils/instacartUnitMapper.ts` | 1 | `error` |
| `src/utils/measurementConverter.ts` | 1 | `error` |
| `src/tests/phase6.test.ts` | 1 | `item` param |

### Verification
```bash
npx eslint "src/**/*.{ts,tsx}" "app/**/*.{ts,tsx}" 2>&1 | grep -c "no-unused-vars"
# Expected: 0
npx tsc --noEmit
# Expected: 0 errors (no regressions)
```

---

## Batch B: Console Statement Cleanup

**Target:** 47 `no-console` warnings across ~12 files
**Estimated tokens:** ~50,000-70,000
**Difficulty:** Easy-Medium (need consistent strategy)

### Strategy

1. **Create a lightweight logger utility** at `src/utils/logger.ts`:
   ```typescript
   // Only logs in development mode
   export const logger = {
     debug: (...args: unknown[]) => {
       if (__DEV__) console.log('[BMA]', ...args);
     },
     info: (...args: unknown[]) => {
       if (__DEV__) console.log('[BMA]', ...args);
     },
     warn: (...args: unknown[]) => {
       console.warn('[BMA]', ...args);   // warn is allowed by ESLint config
     },
     error: (...args: unknown[]) => {
       console.error('[BMA]', ...args);  // error is allowed by ESLint config
     },
   };
   ```

2. **Replace console.log statements** with the appropriate logger method:
   - Error-path logs → `logger.error()`
   - Warning-path logs → `logger.warn()`
   - Debug/info logs → `logger.debug()` (will be stripped in prod)

3. **The ESLint config already allows `console.warn` and `console.error`** via:
   ```js
   'no-console': ['warn', { allow: ['warn', 'error'] }]
   ```

### Files to Fix (sorted by warning count)

| File | Warnings | Context |
|---|---|---|
| `src/contexts/AuthContext.tsx` | 13 | Auth flow logging (login, logout, session events) |
| `src/services/recipeService.ts` | 9 | CRUD operation error logging |
| `src/services/shoppingService.ts` | 6 | Shopping list operation logging |
| `app/_layout.tsx` | 5 | Navigation/routing debug logs |
| `src/services/weatherService.ts` | 5 | Weather API call logging |
| `src/services/instacartShoppingService.ts` | 4 | Instacart integration logging |
| `src/services/profileService.ts` | 3 | Profile CRUD logging |
| `app/(tabs)/dashboard.tsx` | 2 | Dashboard data loading |
| `src/services/instacartService.ts` | 2 | Instacart API logging |

### Verification
```bash
npx eslint "src/**/*.{ts,tsx}" "app/**/*.{ts,tsx}" 2>&1 | grep -c "no-console"
# Expected: 0
npx tsc --noEmit
# Expected: 0 errors (no regressions)
```

---

## Batch C: Replace `any` Types — Services & Contexts

**Target:** ~50 `@typescript-eslint/no-explicit-any` warnings in services + contexts
**Estimated tokens:** ~120,000-160,000
**Difficulty:** Medium-Hard (must understand data shapes from Supabase/APIs)

### Strategy

- **Read `src/types/database.ts` first** to understand existing type definitions
- **Use Supabase-generated types** where available (table row types)
- **For API responses** (weather, TheMealDB), define interface types near the service
- **For error catches**, use `unknown` and narrow with type guards:
  ```typescript
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
  }
  ```
- **For callback params**, use the specific event/data type from the library

### Files to Fix (sorted by warning count)

| File | Warnings | What Needs Typing |
|---|---|---|
| `src/services/weatherService.ts` | 22 | Weather API response parsing - needs `WeatherAPIResponse` interfaces |
| `src/contexts/AuthContext.tsx` | 11 | Supabase auth callbacks, session data, error handling |
| `src/services/taskSyncService.ts` | 4 | Sync conflict resolution, Supabase query results |
| `src/types/database.ts` | 4 | Generic type params in utility types |
| `src/services/googleContactsService.ts` | 2 | Google People API response types |
| `src/services/instacartShoppingService.ts` | 1 | Cart data types |
| `src/services/instacartService.ts` | 1 | API response type |
| `src/services/recipeService.ts` | 1 | Recipe data type |
| `src/services/contactService.ts` | 1 | Contact data type |
| `src/services/taskService.ts` | 1 | Task query type |
| `src/services/themealdbService.ts` | 1 | MealDB API response type |
| `src/hooks/useRecipes.ts` | 1 | Mutation error type |
| `src/hooks/useShoppingItems.ts` | 1 | Mutation callback type |
| `src/services/googleCalendarService.ts` | 1 | Calendar event type |

### Key Type Definitions to Create

1. **Weather API types** (in `weatherService.ts` or a new `src/types/weather.ts`):
   - `OpenWeatherResponse`, `WeatherCondition`, `TemperatureData`, `ForecastEntry`

2. **Auth event types** (in `AuthContext.tsx`):
   - Use `AuthChangeEvent`, `Session` from `@supabase/supabase-js`
   - Error handlers: `unknown` with narrowing

3. **Supabase query result types** (use existing database.ts Row types)

### Verification
```bash
npx eslint "src/services/**/*.{ts,tsx}" "src/contexts/**/*.{ts,tsx}" "src/hooks/**/*.{ts,tsx}" "src/types/**/*.{ts,tsx}" 2>&1 | grep -c "no-explicit-any"
# Expected: 0
npx tsc --noEmit
# Expected: 0 errors
```

---

## Batch D: Replace `any` Types — Components & App Screens

**Target:** ~38 `@typescript-eslint/no-explicit-any` warnings in components + app screens
**Estimated tokens:** ~80,000-120,000
**Difficulty:** Medium (mostly error handlers and event callbacks)

### Strategy

- **Error catch blocks:** Use `unknown` and narrow
- **Event handlers:** Use the correct React Native event type
- **Component props:** Use the specific prop type from the parent component or navigation params
- **Route params:** Use the typed route params from Expo Router

### Files to Fix (sorted by warning count)

| File | Warnings | What Needs Typing |
|---|---|---|
| `app/(tabs)/shopping.tsx` | 10 | Mutation callbacks, error handlers, form data |
| `app/(onboarding)/profile.tsx` | 3 | Image picker result, form errors |
| `app/recipe/[id].tsx` | 3 | Recipe data, mutation callbacks |
| `app/(auth)/login.tsx` | 2 | Auth error handling |
| `app/(auth)/signup.tsx` | 2 | Auth error handling |
| `src/components/tasks/TaskForm.tsx` | 2 | Form data types |
| `src/components/dashboard/QuickActionsGrid.tsx` | 1 | Action handler type |
| `src/components/dashboard/TodaysSchedule.tsx` | 1 | Schedule item type |
| `src/components/dashboard/UpcomingEvents.tsx` | 1 | Event item type |
| `src/components/shopping/CategorySection.tsx` | 1 | Category item type |
| `src/components/shopping/ShoppingForm.tsx` | 1 | Form submit handler |
| `src/components/recipes/RecipeCard.tsx` | 1 | Recipe data type |
| `src/components/ui/Skeleton.tsx` | 1 | Animation value type |
| `src/components/contacts/ContactForm.tsx` | 1 | Form submit type |
| `src/components/family/FamilyMemberForm.tsx` | 1 | Form submit type |
| `app/(auth)/forgot-password.tsx` | 1 | Error handling |
| `app/(onboarding)/complete.tsx` | 1 | Navigation error |
| `app/(onboarding)/preferences.tsx` | 1 | Form error |
| `app/(tabs)/family.tsx` | 1 | Navigation params |
| `app/(tabs)/more.tsx` | 1 | Navigation params |
| `app/contact/[id].tsx` | 1 | Route params |
| `app/contact/create.tsx` | 1 | Form submit |
| `app/task/[id].tsx` | 1 | Route params |
| `app/task/create.tsx` | 1 | Form submit |

### Verification
```bash
npx eslint "src/components/**/*.{ts,tsx}" "app/**/*.{ts,tsx}" 2>&1 | grep -c "no-explicit-any"
# Expected: 0
npx tsc --noEmit
# Expected: 0 errors
```

---

## Final Verification (After All Batches)

Run the complete quality check to confirm zero warnings:

```bash
cd BusyMoms-mobile

# TypeScript - must be 0 errors
npx tsc --noEmit

# ESLint - must be 0 warnings, 0 errors
npx eslint "src/**/*.{ts,tsx}" "app/**/*.{ts,tsx}"

# Jest - must pass (no regressions)
npx jest --passWithNoTests

# Expo doctor - must pass
npx expo doctor
```

**Expected result:** `0 problems (0 errors, 0 warnings)` from ESLint

---

## Completion Criteria

- [ ] 0 ESLint warnings (down from 186)
- [ ] 0 TypeScript errors maintained (no regressions from Phase 7.5)
- [ ] All unused imports removed (not just commented out)
- [ ] All `any` types replaced with proper types
- [ ] All `console.log` replaced with logger utility or `console.warn`/`console.error`
- [ ] `src/utils/logger.ts` created and used consistently
- [ ] Jest tests still pass
- [ ] No behavioral changes to any feature

---

## Agent Execution Order

```
Batch A (unused vars)  ──→  Batch B (console)  ──→  Batch C (any: services)  ──→  Batch D (any: components)
     ~60-80k tokens          ~50-70k tokens          ~120-160k tokens              ~80-120k tokens
```

**Note:** Batches A and B are simpler and should run first to reduce noise. Batches C and D require more context (reading type definitions, understanding API shapes) and benefit from the cleaner codebase left by A and B.

Each agent should:
1. Run the pre-flight check for their category
2. Fix all warnings in their file list
3. Run `npx tsc --noEmit` after every 5-10 files to catch regressions early
4. Run the batch verification at the end
5. Report final warning count

---

## Post-Phase Handoff

After Phase 7.51 is complete, update `REBUILD_PROGRESS.md` to reflect:
- Phase 7.51 complete
- 0 ESLint warnings
- Ready for Phase 8: AI Features & Affirmations
