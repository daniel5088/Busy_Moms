# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo containing two apps with a shared Supabase backend:

- **`Busy_Moms/`** — Original web app (Vite + React + Tailwind, deployed on Netlify)
- **`Busy_Moms/BusyMoms-mobile/`** — React Native mobile app (Expo SDK 54, the active development target)
- **`Busy_Moms/supabase/`** — Shared Supabase migrations and edge functions

The mobile app is the primary focus. It was rebuilt from the web app across 12 phases (all complete).

## Common Commands

All commands run from `Busy_Moms/BusyMoms-mobile/`:

```bash
npm start                    # Start Expo dev server
npm start -- --tunnel        # Start with tunnel (cross-network testing)
npm test                     # Run Jest tests
npx jest path/to/test.ts     # Run a single test file
npx jest --testPathPattern="measurementConverter"  # Run tests matching pattern
npx tsc --noEmit             # TypeScript type-check (critical — run before marking work complete)
npm run lint                 # ESLint check
npx expo doctor              # Expo compatibility check
```

**Install dependencies:** `npm install --legacy-peer-deps` (required due to peer dep conflicts)

**EAS builds:**
```bash
npx eas build --profile development --platform android
npx eas build --profile development --platform ios
npx eas build --profile production --platform all
```

## Architecture

### Mobile App Stack
- **Expo SDK 54** with **expo-router** (file-based routing with typed routes)
- **TypeScript** in strict mode (`noImplicitAny`, `noUncheckedIndexedAccess` enabled)
- **Supabase** for auth, database, real-time, and edge functions
- **React Query** (`@tanstack/react-query`) for server state
- **React Context** for client state (auth, theme, notifications, toasts)
- **react-native-reanimated** for animations (must be last Babel plugin)

### Layered Component Architecture

```
app/           → Screen routes (thin — compose feature components, handle navigation)
src/components/ui/       → Stateless primitives (Button, Card, Input, Modal, etc.)
src/components/[feature] → Feature components (business logic + UI composition)
src/hooks/               → Custom hooks (data fetching, state management)
src/services/            → Supabase CRUD operations and API calls
src/lib/                 → Core infra (supabase client, queryClient, cache, sync engine)
src/contexts/            → React context providers (Auth, Theme, Notification, Toast)
src/theme/               → Design tokens (colors, spacing, typography, shadows)
src/types/               → TypeScript type definitions
```

### Navigation Structure

Root Stack contains three route groups plus standalone screens:
- `(auth)/` — Login, signup, forgot-password (unauthenticated)
- `(onboarding)/` — Profile, family, preferences, complete (post-signup)
- `(tabs)/` — Dashboard, calendar, shopping, family, more (main app)
- Standalone: `event/[id]`, `task/[id]`, `contact/[id]`, `recipe/[id]`, `settings/*`, `voice-chat`, `life-receipts/*`, `gift-finder`, `cycle-tracker`, `quick-links`

Auth guard in `app/_layout.tsx` auto-redirects based on auth/onboarding state.

### Data Flow

Services → Hooks (React Query) → Feature Components → UI Components

Query keys follow the pattern: `[entity, scope, params]` (e.g., `['events', 'byDate', '2026-02-10']`).

### Supabase Edge Functions

Located in `Busy_Moms/supabase/functions/`. Called via `callEdgeFunction()` helper in `src/lib/supabase.ts`. Auth tokens stored in `expo-secure-store` (not AsyncStorage).

## Critical Gotchas

### Theme Colors Are Nested Objects
```typescript
// WRONG — passes an object, not a string
color={theme.colors.primary}

// CORRECT
color={theme.colors.primary.main}
```

Colors are structured as: `primary.{main,dark,light}`, `background.{primary,secondary,card,input}`, `text.{primary,secondary,tertiary,inverse}`, `status.{success,warning,error,info}`, etc. See `src/theme/colors.ts` for the full `ColorPalette` interface.

### Icon Declarations Must Be Manual
`types/lucide.d.ts` is a hand-maintained declaration file for `lucide-react-native`. When importing a new icon, you must add its export declaration to this file or TypeScript will error.

### ESLint Config Conflict
The parent `Busy_Moms/eslint.config.js` (flat config) interferes with the mobile project. The mobile app has its own `eslint.config.js` that overrides it. If ESLint behaves unexpectedly, verify the mobile config is being used.

### npm install Requires `--legacy-peer-deps`
Expo SDK 54 has peer dependency conflicts that require the `--legacy-peer-deps` flag.

### Asset Format
`app.config.ts` references `.png` assets. SVG versions exist alongside them but are not used by the config. Always verify asset format matches what the config expects.

### Phase Handoff Docs Are Unreliable
Previous phase handoffs claimed "0 errors" but a full `tsc --noEmit` audit found 46 errors. Always run the full type-check yourself rather than trusting handoff claims.

## Environment Variables

Required in `.env` (see `.env.example`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Optional (for Google integrations):
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
```

Config is read via `src/lib/config.ts` which checks both `expo-constants` extras and `process.env`.

## Testing

- Test runner: **Jest** with `jest-expo` preset
- Tests live in `src/__tests__/` (mirrors src structure) and `__tests__/` at project root
- Extensive mocks for Expo modules in `jest.setup.js` (AsyncStorage, SecureStore, Location, Notifications, Camera, etc.)
- Coverage thresholds: 50% global, 70% for `src/utils/` and `src/services/`

## Conventions

- Named exports for components (not default), except screen files which use default exports
- Props interfaces are always defined and exported
- Styles via `StyleSheet.create()`, never inline style objects
- Theme consumed via `useTheme()` hook, never hardcoded colors
- `FlatList`/`SectionList` for dynamic lists (never `ScrollView` + `.map()`)
- Screen files are thin orchestrators; business logic lives in feature components and hooks
