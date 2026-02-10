# Phase 7.5 Agent Session Template: Stabilization & Error Resolution

**Priority:** CRITICAL - Must complete before Phase 8
**Estimated effort:** Medium (all fixes are mechanical, no new features)
**Prerequisite:** Phases 1-7 complete

---

## Objective

Fix ALL build errors, TypeScript failures, broken tooling, missing assets, and dependency mismatches accumulated across Phases 1-7. The app must compile cleanly (`tsc --noEmit` = 0 errors), pass `npx expo doctor` with no failures, and have functional ESLint + Jest infrastructure before Phase 8 begins.

---

## Pre-Flight Checks

Before starting, run these commands to confirm the current error state:

```bash
cd BusyMoms-mobile
npx tsc --noEmit          # Expect ~46 errors
npx expo doctor           # Expect 4 check failures
npx eslint . --ext .ts,.tsx  # Expect config crash
npx jest                  # Expect SyntaxError
```

---

## Task 1: Fix Dependency Version Mismatches (CRITICAL)

### Problem (Task 1 – dependencies)

17 packages are out of sync with Expo SDK 54. 8 are major version mismatches that will crash native builds.

### Fix (Task 1 – dependencies)

```bash
npx expo install --check    # Shows all mismatches
npx expo install --fix      # Auto-fixes to SDK-compatible versions
npx expo install react-native-worklets  # Missing peer dependency
```

### Verify (Task 1 – dependencies)

```bash
npx expo doctor  # "Check that packages match SDK version" should PASS
```

### Packages that need updating (for reference)

| Package | Installed | Expected (SDK 54) |
| --- | --- | --- |
| expo-auth-session | 6.2.1 | ~7.0.10 |
| expo-av | 15.1.7 | ~16.0.8 |
| expo-camera | 16.1.11 | ~17.0.10 |
| expo-haptics | 14.1.4 | ~15.0.8 |
| expo-image-picker | 16.1.4 | ~17.0.10 |
| expo-location | 18.1.6 | ~19.0.8 |
| expo-secure-store | 14.2.4 | ~15.0.8 |
| expo-task-manager | 12.0.6 | ~14.0.9 |
| @react-native-community/datetimepicker | needs update | SDK 54 compatible |
| expo-notifications | needs update | SDK 54 compatible |
| react-dom | needs update | SDK 54 compatible |
| react-native-gesture-handler | needs update | SDK 54 compatible |
| react-native-reanimated | needs update | SDK 54 compatible |
| react-native-screens | needs update | SDK 54 compatible |
| react-native-svg | needs update | SDK 54 compatible |
| expo (patch) | needs update | latest SDK 54 patch |
| expo-router (patch) | needs update | latest SDK 54 patch |

---

## Task 2: Fix Missing Asset Files (CRITICAL - blocks build)

### Problem (Task 2 – assets)

`app.config.ts` references 6 `.png` files that don't exist. Only `.svg` versions exist in `assets/`.

### Missing files

- `./assets/icon.png` (only `icon.svg` exists)
- `./assets/splash-icon.png` (only `splash-icon.svg` exists)
- `./assets/adaptive-icon.png` (only `adaptive-icon.svg` exists)
- `./assets/favicon.png` (only `favicon.svg` exists)
- `./assets/notification-icon.png` (does NOT exist at all)
- `./assets/notification-sound.wav` (does NOT exist at all)

### Fix Options (choose one)

**Option A: Convert SVGs to PNGs (Recommended)**
Create PNG versions from the existing SVGs at the required sizes:

- `icon.png` - 1024x1024
- `splash-icon.png` - 200x200
- `adaptive-icon.png` - 1024x1024
- `favicon.png` - 48x48
- `notification-icon.png` - 96x96 (create a simple notification bell icon)

For `notification-sound.wav`: either create/download a short notification sound or remove the `sounds` config from `app.config.ts`.

**Option B: Use placeholder PNGs**
Generate solid-color placeholder PNGs at the correct sizes so the build passes. Replace with real assets later.

**Option C: Remove notification assets**
If notification sound isn't needed yet, remove the `sounds` and `icon` entries from the expo-notifications plugin config in `app.config.ts`:

```typescript
// Change from:
['expo-notifications', { icon: './assets/notification-icon.png', color: '#3B82F6', sounds: ['./assets/notification-sound.wav'] }]
// To:
['expo-notifications', { color: '#3B82F6' }]
```

### Verify (Task 2 – assets)

```bash
npx expo doctor  # Asset check should PASS
```

---

## Task 3: Fix Lucide Icon Type Declarations (HIGH - 15 TS errors)

### Problem (Task 3 – Lucide icons)

`types/lucide.d.ts` only declares 17 icons but the codebase imports 14+ additional icons. This causes TypeScript errors in 8 files.

### Missing icon declarations

`AlertCircle`, `Award`, `Bell`, `BookOpen`, `CheckCircle`, `ChevronDown`, `ChevronLeft`, `Circle`, `Cloud`, `CloudOff`, `Edit`, `Edit2`, `Eye`, `EyeOff`, `Filter`, `Folder`, `FolderOpen`, `Info`, `Loader`, `Lock`, `Mail`, `MessageCircle`, `MoreVertical`, `Phone`, `RefreshCcw`, `RefreshCw`, `Search`, `Star`, `Sun`, `Sunrise`, `Sunset`, `Thermometer`, `Trash`, `Wind`, `X`, `XCircle`

### Fix (Task 3 – Lucide icons)

Replace the entire contents of `types/lucide.d.ts` with a comprehensive declaration that includes ALL icons used across the project. Search the entire codebase for lucide imports first:

```bash
grep -rh "import.*from 'lucide-react-native'" src/ app/ | sort -u
```

Then add every imported icon name to the declaration file. Also verify that import names match what's actually used (e.g., some files import `Edit` but should import `Edit2`, or import `Trash` but should import `Trash2`).

### Files to check for icon name mismatches

- `src/components/tasks/TaskCard.tsx` - uses `Edit` and `Trash` (should be `Edit2` and `Trash2`?)
- `src/components/family/FamilyMemberCard.tsx` - uses `Edit2` and `Trash` (should `Trash` be `Trash2`?)
- `src/components/family/FamilyHub.tsx` - uses `Folder` (should be `FolderOpen`?)

### Verify (Task 3 – Lucide icons)

```bash
npx tsc --noEmit 2>&1 | grep "lucide"  # Should return 0 results
```

---

## Task 4: Fix Theme Color Object Misuse (HIGH - 9 TS errors)

### Problem (Task 4 – theme colors)

The theme uses nested color objects (`colors.primary = { main, dark, light }`, `colors.background = { primary, secondary, card, input }`). Multiple components pass these objects directly where React Native expects a flat string (ColorValue).

### Files to fix

**`app/task/create.tsx`**

- Change `theme.colors.background` to `theme.colors.background.primary`

**`src/components/tasks/TaskForm.tsx`**

- Change `theme.colors.primary` to `theme.colors.primary.main` (wherever used as a color string)
- Change `theme.colors.background` to `theme.colors.background.primary` (wherever used as a background)

**`src/components/tasks/TaskSyncStatus.tsx`**

- Change `theme.colors.primary` to `theme.colors.primary.main` for ActivityIndicator color and Text color

**`src/components/tasks/TaskList.tsx`**

- Fix: LucideIcon component reference being passed as ReactNode. Render the icon component: `<Icon size={...} color={...} />` instead of passing `Icon` directly.

**`app/contact/[id].tsx`**

- Fix: LucideIcon component reference being passed as ReactNode. Same pattern as above.

### Pattern to search for

```bash
grep -rn "theme.colors.primary[^.]" src/components/tasks/ app/task/
grep -rn "theme.colors.background[^.]" src/components/tasks/ app/task/
```

### Verify (Task 4 – theme colors)

```bash
npx tsc --noEmit 2>&1 | grep "not assignable to type.*ColorValue"  # Should return 0
```

---

## Task 5: Fix EventForm `title` vs `label` Prop (HIGH - 6 TS errors)

### Problem (Task 5 – EventForm)

`src/components/calendar/EventForm.tsx` passes `title` prop to `<FormField>` in 6 places, but the `FormFieldProps` interface only has `label` (not `title`).

### Fix (Task 5 – EventForm)

In `src/components/calendar/EventForm.tsx`, find and replace all instances of:

```tsx
<FormField title="..." ...>
```

with:

```tsx
<FormField label="..." ...>
```

### Verify (Task 5 – EventForm)

```bash
npx tsc --noEmit 2>&1 | grep "title.*FormField"  # Should return 0
```

---

## Task 6: Fix Switch Component (MEDIUM - 1 TS error)

### Problem (Task 6 – Switch)

`src/components/ui/Switch.tsx` line 37 passes the `onValueChange` callback to React Native's `onChange` prop. The `onChange` prop expects `(event: SwitchChangeEvent) => void`, not `(value: boolean) => void`.

### Fix (Task 6 – Switch)

Change the prop from `onChange` to `onValueChange`:

```tsx
// Before:
<RNSwitch ... onChange={onValueChange} />
// After:
<RNSwitch ... onValueChange={onValueChange} />
```

### Verify (Task 6 – Switch)

```bash
npx tsc --noEmit 2>&1 | grep "Switch"  # Should return 0
```

---

## Task 7: Fix Service Layer Type Errors (MEDIUM - 3 TS errors)

### Problem (Task 7 – taskSyncService)

`src/services/taskSyncService.ts` has 3 type errors:

1. Line ~106: Accesses `.due` property which doesn't exist on the `Task` type
2. Line ~172: Passes `string | undefined` where `string` is required (2 instances)

### Fix (Task 7 – taskSyncService)

1. Check the `Task` type in `src/types/database.ts` for the correct property name for due date (likely `due_date` or `dueDate`)
2. Add null checks or default values for the undefined strings:

   ```typescript
   // Example fix for string | undefined:
   someFunction(value ?? '')
   // Or with a guard:
   if (value) { someFunction(value) }
   ```

### Verify (Task 7 – taskSyncService)

```bash
npx tsc --noEmit 2>&1 | grep "taskSyncService"  # Should return 0
```

---

## Task 8: Fix Test Infrastructure (MEDIUM)

### Problem (Task 8 – Jest)

Jest cannot run - no configuration file exists, and TypeScript/ESM imports fail with `SyntaxError: Cannot use import statement outside a module`.

### Fix (Task 8 – Jest)

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@tanstack/.*)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterSetup: [],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
```

Also verify that `jest-expo` is installed:

```bash
npm ls jest-expo || npx expo install jest-expo
```

### Verify (Task 8 – Jest)

```bash
npx jest --passWithNoTests  # Should exit 0
```

---

## Task 9: Fix ESLint Configuration (MEDIUM)

### Problem (Task 9 – ESLint)

ESLint crashes because it finds the parent `Busy_Moms/eslint.config.js` (flat config format requiring `@eslint/js`). The mobile project has no local ESLint config, and its `package.json` lint script uses `--ext .ts,.tsx` which is incompatible with flat config.

### Fix (Task 9 – ESLint)

Create a local `.eslintrc.js` in the mobile project root (this was supposedly created in Phase 1 but doesn't exist):

```javascript
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'babel.config.js', 'jest.config.js'],
};
```

Ensure required ESLint packages are installed:

```bash
npm ls @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks
```

### Verify (Task 9 – ESLint)

```bash
npx eslint . --ext .ts,.tsx  # Should run without config crash
```

---

## Task 10: Fix Test File Type Errors (LOW - 4 TS errors)

### Problem (Task 10 – phase6.test)

`src/tests/phase6.test.ts` has 4 type errors:

- Line 80: passes `string` where `number` expected
- Lines 257-259: object possibly `undefined` (3 instances)

### Fix (Task 10 – phase6.test)

1. Line 80: Convert the string to a number or pass the correct type
2. Lines 257-259: Add optional chaining or null checks

### Verify (Task 10 – phase6.test)

```bash
npx tsc --noEmit 2>&1 | grep "phase6.test"  # Should return 0
```

---

## Task 11: Add Missing Configuration Files (LOW)

### Problem (Task 11 – config files)

Missing `babel.config.js` and `metro.config.js` which may cause runtime issues.

### Fix (Task 11 – config files)

Create `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

Create `metro.config.js` (optional but recommended):

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

### Verify (Task 11 – config files)

```bash
npx expo start --clear  # Should start without Babel/Metro errors
```

---

## Task 12: Run Security Audit (LOW)

### Problem (Task 12 – audit)

2 high-severity vulnerabilities in dependencies.

### Fix (Task 12 – audit)

```bash
npm audit fix
```

If `npm audit fix` doesn't resolve them:

```bash
npm audit fix --force  # Use with caution, may change major versions
```

### Verify (Task 12 – audit)

```bash
npm audit  # Should show 0 high/critical vulnerabilities
```

---

## Task 13: Clean Up Duplicate Dependencies (LOW)

### Problem (Task 13 – duplicates)

5 packages have duplicate versions in node_modules (expo-constants, expo-linking, expo-task-manager, expo-application, unimodules-app-loader).

### Fix (Task 13 – duplicates)

After Task 1 (version updates), run:

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Verify (Task 13 – duplicates)

```bash
npx expo doctor  # Duplicate check should PASS
```

---

## Completion Criteria

ALL of these must pass before marking Phase 7.5 as complete:

```bash
# Zero TypeScript errors
npx tsc --noEmit
# Expected: 0 errors

# Expo doctor passes all checks
npx expo doctor
# Expected: All checks pass

# ESLint runs without crashing
npx eslint . --ext .ts,.tsx
# Expected: Runs (warnings OK, no crash)

# Jest runs without crashing
npx jest --passWithNoTests
# Expected: Exit code 0

# No high/critical vulnerabilities
npm audit
# Expected: 0 high, 0 critical

# App starts without immediate crash
npx expo start --clear
# Expected: QR code appears, no crash
```

---

## Post-Completion

1. Create `PHASE_7.5_HANDOFF.md` with:
   - List of all files modified
   - Summary of each fix applied
   - Final `tsc --noEmit` output showing 0 errors
   - Final `npx expo doctor` output showing all checks pass
2. Update `REBUILD_PROGRESS.md` to include Phase 7.5
3. Proceed to Phase 8 (AI Voice Chat and Affirmations)

---

## Notes for Agent

- **Do NOT add new features** - this is purely a fix/stabilization phase
- **Do NOT refactor working code** - only fix actual errors and broken tooling
- **Preserve all existing functionality** - every fix should be surgical
- **Run `npx tsc --noEmit` after every batch of fixes** to track progress
- **Order matters**: Do Task 1 (dependencies) first, as version updates may resolve some TS errors automatically
- The `.env` file with Supabase credentials should already exist from the user's setup - do NOT create dummy credentials. If it's missing, ask the user for their values.
