# Agent Session 1 -- Phase 1: Foundation and Project Setup

## Context from Previous Sessions
This is the first session. No prior work exists beyond the initial scaffold.

## Required Reading (do this FIRST)
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Sections 1-4 (overview, phased plan)
2. `ARCHITECTURE.md` -- Section 1 (directory structure), Section 3 (state management)
3. `MIGRATION_GUIDE.md` -- Sections 1, 4.4 (environment variables)
4. `BusyMoms-mobile/package.json` -- current dependencies
5. `Busy_Moms/src/lib/supabase.ts` -- all type definitions (the source of truth)

## Your Mission
Set up the project foundation: directory structure, TypeScript configuration, Supabase client, design system tokens, complete type definitions, ESLint/Prettier, and the progress tracker.

## Prerequisites Check
- [ ] Node.js 18+ installed
- [ ] Expo CLI available (`npx expo --version`)
- [ ] BusyMoms-mobile directory exists with scaffold code

## Implementation Steps

### Step 1: Update package.json dependencies
Install all required dependencies as specified in MOBILE_REBUILD_MASTER_PLAN.md Appendix B. Use `--legacy-peer-deps` if needed.

Key packages to add:
- `@tanstack/react-query` (data fetching)
- `expo-secure-store` (secure token storage)
- `expo-notifications` (push notifications)
- `expo-location` (GPS)
- `expo-av` (audio)
- `expo-camera` (camera)
- `expo-image-picker`
- `expo-haptics`
- `expo-background-fetch`
- `expo-task-manager`
- `react-native-gesture-handler`
- `react-native-reanimated`
- `date-fns`
- `zod`

Dev dependencies:
- `jest`
- `@testing-library/react-native`
- `eslint` + `@react-native-community/eslint-config`
- `prettier`

### Step 2: Create directory structure
Create all directories specified in ARCHITECTURE.md Section 1. Create empty index files where needed.

### Step 3: Configure TypeScript (strict mode)
Update `tsconfig.json` with strict settings as specified in MOBILE_REBUILD_MASTER_PLAN.md Section 9.2.

### Step 4: Create src/lib/config.ts
Environment configuration module that reads from Expo constants and process.env.

### Step 5: Create src/lib/supabase.ts
Enhanced Supabase client using expo-secure-store for auth token storage. Include the `callEdgeFunction` helper from ARCHITECTURE.md Section 5.2.

### Step 6: Create src/types/database.ts
Port ALL type definitions from `Busy_Moms/src/lib/supabase.ts`. This is critical -- every interface must be ported:
- UUID, FamilyMember, Event, Reminder, Task, Contact, Profile
- ShoppingItem, Recipe, RecipeIngredient, UserSavedRecipe
- InstacartIngredient, InstacartRecipeRequest, InstacartRecipeResponse
- InstacartShoppingListItem, InstacartShoppingListRequest, InstacartShoppingListResponse
- Retailer, GetNearbyRetailersRequest, GetNearbyRetailersResponse
- UserPreferredRetailer, RecipeFilter
- Affirmation, AffirmationSettings
- Address, AddressType, AddressValidationResult
- UserMeasurementPreferences, MeasurementOverride
- AffiliateMatrixItem, AffiliateMatrixLookup, AffiliateSearchCriteria
- ProviderName, PurchaseStatus, ProviderMetadata

Also add any types from the web app that are missing (check recent additions).

### Step 7: Create src/types/navigation.ts
Define route param types for Expo Router typed routes.

### Step 8: Create src/theme/
Create the design system:
- `colors.ts` -- light and dark color palettes matching the web app (blue/green scheme)
- `spacing.ts` -- spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- `typography.ts` -- font sizes and weights
- `shadows.ts` -- platform-specific shadow definitions
- `index.ts` -- exports all tokens

### Step 9: Create ESLint and Prettier configs
Set up `.eslintrc.js` and `.prettierrc` as specified in the master plan.

### Step 10: Update app.config.ts
Upgrade from `app.config.js` to TypeScript. Add all required Expo plugins. Configure extra fields for environment variables.

### Step 11: Create src/lib/queryClient.ts
React Query client configuration as specified in ARCHITECTURE.md Section 3.3.

### Step 12: Create REBUILD_PROGRESS.md
Initialize the progress tracker with all 12 phases listed, Phase 1 marked as IN_PROGRESS.

## Quality Checklist
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx expo start` launches without errors
- [ ] All type definitions from web app are present in src/types/database.ts
- [ ] Theme tokens produce correct colors for both light and dark mode
- [ ] ESLint passes on all files
- [ ] Directory structure matches ARCHITECTURE.md

## Handoff Requirements
Create these artifacts before ending session:
1. `REBUILD_PROGRESS.md` -- updated with Phase 1 status
2. `PHASE_1_HANDOFF.md` -- summary of decisions, files created, dependency versions
3. Git commit all changes

## Next Agent Context
The next agent (Phase 2) will need to:
- Read PHASE_1_HANDOFF.md for dependency versions and any gotchas
- Start building reusable UI components using the theme tokens
- All types and theme tokens should be importable from the paths established in this phase
