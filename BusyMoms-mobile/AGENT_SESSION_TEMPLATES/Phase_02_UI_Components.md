# Agent Session 2 -- Phase 2: Core UI Components and Design System

## Context from Previous Sessions
Phase 1 established the project foundation: directory structure, TypeScript config, Supabase client, type definitions, theme tokens, and tooling.

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 2 section
2. `ARCHITECTURE.md` -- Section 2 (component architecture)
3. `MIGRATION_GUIDE.md` -- Sections 2, 7, 8 (component conversion, dark mode, platform differences)
4. `REBUILD_PROGRESS.md` -- verify Phase 1 is complete
5. `PHASE_1_HANDOFF.md` -- previous agent's decisions and notes
6. `src/theme/index.ts` -- understand available design tokens

## Your Mission
Build the complete library of reusable UI components that all feature screens will depend on. Every component must support dark mode via the theme context, be typed with TypeScript, and work on both iOS and Android.

## Prerequisites Check
- [ ] Phase 1 completed (check REBUILD_PROGRESS.md)
- [ ] `npx tsc --noEmit` passes
- [ ] Theme tokens exist at `src/theme/`
- [ ] Type definitions exist at `src/types/`

## Implementation Steps

### Step 1: Create ThemeContext and useTheme hook
- `src/contexts/ThemeContext.tsx` -- provides colors, spacing, typography, shadows, darkMode toggle
- `src/hooks/useTheme.ts` -- convenience hook that consumes ThemeContext
- Support system preference detection via `useColorScheme()`
- Support manual override stored in AsyncStorage

### Step 2: Build primitive UI components (src/components/ui/)

**Button.tsx**
- Variants: primary, secondary, outline, ghost, danger
- Sizes: sm, md, lg
- States: loading (with ActivityIndicator), disabled
- Props: title, onPress, icon, fullWidth

**Card.tsx**
- Background with border and optional shadow
- Props: children, style, onPress (optional, for pressable cards)

**Input.tsx**
- Text input with label, placeholder, error display
- Supports: secureTextEntry, keyboardType, autoCapitalize
- Theme-aware colors

**Modal.tsx**
- Full-screen overlay with centered content
- Props: visible, onClose, title, children
- animationType: fade
- Handles Android back button

**Toast.tsx**
- Non-blocking notification at top of screen
- Variants: success, warning, error, info
- Auto-dismiss after 3 seconds
- Global toast context/provider

**Badge.tsx**
- Small colored label
- Variants: primary, success, warning, danger, neutral
- Props: text, variant

**Avatar.tsx**
- Circular image with fallback initials
- Props: imageUrl, name, size

**Skeleton.tsx**
- Animated placeholder for loading states
- Configurable width, height, borderRadius

**EmptyState.tsx**
- Icon + title + description + CTA button
- Props: icon, title, description, actionLabel, onAction

**Divider.tsx**
- Horizontal line separator
- Optional label in the middle

**Switch.tsx**
- Toggle switch with label
- Props: value, onValueChange, label

**Select.tsx**
- Dropdown selector (opens as bottom sheet or modal on mobile)
- Props: options, value, onChange, label

**Chip.tsx**
- Small rounded tag, optionally pressable
- Props: label, onPress, selected, variant

**ProgressBar.tsx**
- Horizontal progress indicator
- Props: progress (0-1), color

**FloatingActionButton.tsx**
- Circular button positioned bottom-right
- Props: icon, onPress, color

**NetworkBanner.tsx**
- Shows "No internet connection" banner at top
- Uses NetInfo to detect connectivity

### Step 3: Build layout components (src/components/layout/)

**Screen.tsx**
- SafeAreaView wrapper with theme background
- Props: edges (which safe area edges to respect), style

**Header.tsx**
- Screen header with title, back button, right action
- Props: title, onBack, rightAction

**Section.tsx**
- Content section with title and optional "See All" button
- Props: title, onSeeAll, children

**KeyboardAvoid.tsx**
- KeyboardAvoidingView wrapper with platform-specific behavior
- Props: children

### Step 4: Build form components (src/components/forms/)

**FormField.tsx**
- Wraps any input with label, required indicator, error message
- Props: label, required, error, children

**DateTimePicker.tsx**
- Uses @react-native-community/datetimepicker (or expo equivalent)
- Props: mode (date/time/datetime), value, onChange

**SearchInput.tsx**
- Input with search icon and clear button
- Props: value, onChangeText, placeholder

### Step 5: Build error components (src/components/errors/)

**ErrorBoundary.tsx**
- Class component that catches render errors
- Displays ErrorFallback

**ErrorFallback.tsx**
- Error display with "Try Again" button
- Props: error, resetError

### Step 6: Wire up ThemeProvider in root layout
Update `app/_layout.tsx` to wrap the app in ThemeProvider.

### Step 7: Create a component showcase screen (temporary)
Create a temporary screen that renders every UI component for visual verification. This can be removed later.

## Quality Checklist
- [ ] All components render correctly on iOS simulator
- [ ] All components render correctly on Android emulator
- [ ] Dark mode toggle changes all component colors
- [ ] All components have TypeScript props interfaces exported
- [ ] No hardcoded colors (all from theme)
- [ ] StyleSheet.create used for all styles
- [ ] `npx tsc --noEmit` passes with zero errors

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md` -- mark Phase 2 as COMPLETED
2. Create `PHASE_2_HANDOFF.md` with:
   - List of all components created and their prop interfaces
   - Any platform-specific notes (iOS vs Android rendering differences found)
   - Toast context usage example
   - Theme context usage example
3. Git commit all changes

## Next Agent Context
The next agent (Phase 3) will:
- Use these UI components extensively in auth and onboarding screens
- Need to know how to import and use Button, Input, Modal, Card, Screen, Header
- Need the ThemeContext to already be wrapping the app
