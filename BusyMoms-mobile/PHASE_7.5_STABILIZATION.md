# Phase 7.5: Stabilization & Error Resolution

**Date:** 2026-02-09
**Status:** NOT STARTED
**Priority:** CRITICAL - Must complete before Phase 8
**Template:** `AGENT_SESSION_TEMPLATES/Phase_7.5_Stabilization.md`

---

## Why This Phase Exists

Phase 7 was marked complete, but a full audit reveals **46 TypeScript errors across 15 files**, **4 failed Expo doctor checks**, **broken ESLint**, **broken Jest**, **missing asset files**, and **17 outdated dependencies**. These issues compound - Phase 8 (AI Voice Chat) will add significant complexity, and building on a broken foundation will make debugging exponentially harder.

---

## Error Summary

| Category | Count | Severity |
|---|---|---|
| Missing asset files (.png) | 6 files | **CRITICAL** |
| Missing peer dependency (react-native-worklets) | 1 | **HIGH** |
| SDK version mismatches (8 major, 9 minor/patch) | 17 packages | **HIGH** |
| TypeScript errors | 46 errors in 15 files | **HIGH** |
| ESLint completely broken | config error | **MEDIUM** |
| Jest completely broken | missing config | **MEDIUM** |
| Security vulnerabilities | 2 high | **MEDIUM** |
| Duplicate native dependencies | 5 packages | **MEDIUM** |
| Missing babel.config.js | 1 | **LOW** |
| Missing metro.config.js | 1 | **LOW** |

---

## TypeScript Error Breakdown (46 errors)

### Lucide Icon Missing Declarations (15 errors)
`types/lucide.d.ts` only declares 17 icons but the codebase uses 30+. Missing: `AlertCircle`, `Award`, `Circle`, `Cloud`, `Edit`, `Edit2`, `Filter`, `Folder`, `Mail`, `RefreshCcw`, `Search`, `Star`, `Trash`, `X`, and more.

**Files affected:** `TaskCard.tsx`, `TaskList.tsx`, `TaskForm.tsx`, `TaskSyncStatus.tsx`, `ContactCard.tsx`, `ContactList.tsx`, `FamilyHub.tsx`, `FamilyMemberCard.tsx`, `app/task/[id].tsx`

### Theme Color Object Misuse (9 errors)
Components pass `theme.colors.primary` (an object `{main, dark, light}`) or `theme.colors.background` (an object `{primary, secondary, card, input}`) directly where React Native expects a flat color string.

**Files affected:** `app/task/create.tsx`, `TaskForm.tsx`, `TaskSyncStatus.tsx`, `TaskList.tsx`, `app/contact/[id].tsx`

### FormField `title` vs `label` Prop (6 errors)
`EventForm.tsx` passes `title` prop to `<FormField>` but the component only accepts `label`.

### Service Layer Type Errors (3 errors)
`taskSyncService.ts`: accessing nonexistent `.due` property, passing `string | undefined` as `string`.

### Test File Type Errors (4 errors)
`phase6.test.ts`: wrong types and missing null checks.

### Switch Component (1 error)
`Switch.tsx`: uses `onChange` instead of `onValueChange`.

### LucideIcon as ReactNode (2 errors)
Components pass icon component references as ReactNode children instead of rendering them.

---

## Dependency Issues

### Major Version Mismatches (will crash native builds)
- `expo-auth-session` 6.2.1 -> ~7.0.10
- `expo-av` 15.1.7 -> ~16.0.8
- `expo-camera` 16.1.11 -> ~17.0.10
- `expo-haptics` 14.1.4 -> ~15.0.8
- `expo-image-picker` 16.1.4 -> ~17.0.10
- `expo-location` 18.1.6 -> ~19.0.8
- `expo-secure-store` 14.2.4 -> ~15.0.8
- `expo-task-manager` 12.0.6 -> ~14.0.9

### Missing Peer Dependency
- `react-native-worklets` required by `react-native-reanimated`

### Duplicate Dependencies (5 packages with multiple versions)
- `expo-constants`, `expo-linking`, `expo-task-manager`, `expo-application`, `unimodules-app-loader`

---

## Missing/Broken Infrastructure

### Assets (blocks build)
- `icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png` - only SVG versions exist
- `notification-icon.png` - doesn't exist at all
- `notification-sound.wav` - doesn't exist at all

### Configuration
- `babel.config.js` - missing (needed for reanimated plugin)
- `metro.config.js` - missing (recommended for Expo SDK 54)
- `.eslintrc.js` - missing (was supposedly created in Phase 1 but not present)
- `jest.config.js` - missing (Jest crashes without it)

### Security
- 2 high-severity npm vulnerabilities (`@isaacs/brace-expansion`, `tar`)

---

## Fix Order (13 tasks)

| # | Task | Fixes | Priority |
|---|---|---|---|
| 1 | Update dependencies via `npx expo install --fix` | 17 version mismatches + missing peer dep | CRITICAL |
| 2 | Create/convert PNG assets | 6 missing files | CRITICAL |
| 3 | Expand lucide.d.ts declarations | 15 TS errors | HIGH |
| 4 | Fix theme color object usage (.main, .primary) | 9 TS errors | HIGH |
| 5 | Fix EventForm title->label prop | 6 TS errors | HIGH |
| 6 | Fix Switch onChange->onValueChange | 1 TS error | MEDIUM |
| 7 | Fix taskSyncService type errors | 3 TS errors | MEDIUM |
| 8 | Create jest.config.js | Broken test runner | MEDIUM |
| 9 | Create .eslintrc.js | Broken linter | MEDIUM |
| 10 | Fix phase6.test.ts type errors | 4 TS errors | LOW |
| 11 | Create babel.config.js + metro.config.js | Missing configs | LOW |
| 12 | Run npm audit fix | 2 vulnerabilities | LOW |
| 13 | Clean reinstall to remove duplicates | 5 duplicate packages | LOW |

---

## Completion Criteria

- [ ] `npx tsc --noEmit` = 0 errors
- [ ] `npx expo doctor` = all checks pass
- [ ] `npx eslint . --ext .ts,.tsx` = runs without crash
- [ ] `npx jest --passWithNoTests` = exit code 0
- [ ] `npm audit` = 0 high/critical vulnerabilities
- [ ] `npx expo start --clear` = starts without crash

---

## After Completion

Update REBUILD_PROGRESS.md, create handoff notes, then proceed to Phase 8.
