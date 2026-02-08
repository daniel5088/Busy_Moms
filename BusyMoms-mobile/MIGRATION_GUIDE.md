# MIGRATION GUIDE
# Web (React + Tailwind) to Mobile (React Native + Expo)

**Version:** 1.0
**Date:** 2026-02-08

---

## 1. Fundamental Differences

### 1.1 No DOM, No CSS

React Native does not render HTML elements. Every `<div>`, `<span>`, `<p>`, `<button>`, `<input>`, `<img>` must be replaced with React Native equivalents. There is no CSS; styling uses JavaScript objects via `StyleSheet.create`.

### 1.2 Quick Reference: Element Mapping

| Web (React/HTML) | React Native | Notes |
|---|---|---|
| `<div>` | `<View>` | Block container |
| `<span>`, `<p>`, `<h1>`...`<h6>` | `<Text>` | All text must be inside `<Text>` |
| `<button>` | `<Pressable>` or `<TouchableOpacity>` | Pressable is preferred |
| `<input type="text">` | `<TextInput>` | |
| `<img>` | `<Image>` from react-native | Requires `source={{ uri }}` |
| `<a href>` | `<Pressable>` + `Linking.openURL` | No native anchor element |
| `<select>` | Custom `<Select>` component or `@react-native-picker/picker` | |
| `<textarea>` | `<TextInput multiline>` | |
| `<form>` | `<View>` | No form element; handle submission manually |
| `<table>` | `<FlatList>` or custom `<View>` layout | |
| `<ul>`, `<ol>` | `<FlatList>` or `<SectionList>` | |
| `<li>` | `<View>` inside FlatList renderItem | |
| `<svg>` | `react-native-svg` components | |
| `<canvas>` | Not available (use `react-native-skia` if needed) | |
| `<video>` | `expo-av` `<Video>` component | |
| `<audio>` | `expo-av` `Audio` API | |
| `<iframe>` | `react-native-webview` | |

### 1.3 Quick Reference: Style Mapping

| Tailwind / CSS | React Native StyleSheet | Notes |
|---|---|---|
| `className="flex"` | `style={{ display: 'flex' }}` | Flex is default in RN |
| `flex-row` | `flexDirection: 'row'` | Default is 'column' in RN |
| `flex-col` | `flexDirection: 'column'` | Default |
| `items-center` | `alignItems: 'center'` | |
| `justify-center` | `justifyContent: 'center'` | |
| `gap-4` | `gap: 16` | Supported in RN 0.71+ |
| `p-4` | `padding: 16` | |
| `px-4` | `paddingHorizontal: 16` | |
| `py-4` | `paddingVertical: 16` | |
| `m-4` | `margin: 16` | |
| `mx-auto` | Not directly available | Use `alignSelf: 'center'` |
| `w-full` | `width: '100%'` | |
| `h-screen` | `flex: 1` on parent | |
| `rounded-lg` | `borderRadius: 8` | |
| `rounded-full` | `borderRadius: 9999` | |
| `bg-white` | `backgroundColor: '#FFFFFF'` | |
| `bg-blue-500` | `backgroundColor: '#3B82F6'` | Use theme tokens |
| `text-white` | `color: '#FFFFFF'` | Applied to `<Text>` |
| `text-lg` | `fontSize: 18` | |
| `text-sm` | `fontSize: 14` | |
| `font-bold` | `fontWeight: 'bold'` or `fontWeight: '700'` | |
| `font-semibold` | `fontWeight: '600'` | |
| `text-center` | `textAlign: 'center'` | Applied to `<Text>` |
| `border` | `borderWidth: 1` | |
| `border-gray-200` | `borderColor: '#E5E7EB'` | |
| `shadow-md` | Use `shadows.md` from theme | Platform-specific |
| `overflow-hidden` | `overflow: 'hidden'` | |
| `opacity-50` | `opacity: 0.5` | |
| `hidden` | `display: 'none'` | Or conditional rendering |
| `absolute` | `position: 'absolute'` | |
| `relative` | `position: 'relative'` | |
| `z-10` | `zIndex: 10` | |
| `transition` | `react-native-reanimated` | No CSS transitions |
| `hover:bg-gray-100` | No hover in mobile | Use Pressable pressed state |
| `dark:bg-gray-900` | Use ThemeContext | `colors.background` |
| `animate-spin` | `Animated.loop(rotation)` | Use Reanimated |
| `grid grid-cols-3` | Manual flexbox layout | No CSS Grid in RN |
| `min-h-screen` | `flex: 1` on root container | |

### 1.4 Tailwind Spacing Scale to Pixels

| Tailwind | Pixels |
|---|---|
| 1 | 4 |
| 2 | 8 |
| 3 | 12 |
| 4 | 16 |
| 5 | 20 |
| 6 | 24 |
| 8 | 32 |
| 10 | 40 |
| 12 | 48 |
| 16 | 64 |
| 20 | 80 |
| 24 | 96 |

---

## 2. Component Conversion Patterns

### 2.1 Converting a Web Component to React Native

**Step-by-step process for every component:**

1. **Read the web component** and understand its props, state, and behavior
2. **Identify HTML elements** and map them to RN equivalents (see table above)
3. **Convert Tailwind classes** to StyleSheet objects (see table above)
4. **Replace browser APIs:**
   - `window.location` -> `useRouter()` from expo-router
   - `window.addEventListener` -> React Native `AppState`, `Keyboard`, etc.
   - `localStorage` -> `AsyncStorage`
   - `navigator.geolocation` -> `expo-location`
   - `Notification API` -> `expo-notifications`
   - `fetch` -> same (fetch works in RN)
   - `import.meta.env.VITE_*` -> `process.env.EXPO_PUBLIC_*` or `Constants.expoConfig.extra.*`
   - `alert()` -> `Alert.alert()` from react-native
   - `confirm()` -> `Alert.alert()` with buttons
   - `prompt()` -> Custom modal with TextInput
5. **Replace web-only libraries:**
   - `lucide-react` -> `lucide-react-native`
   - `@supabase/auth-helpers-react` -> direct `@supabase/supabase-js`
   - No `react-router-dom`; use `expo-router`
6. **Handle navigation:**
   - `onScreenChange(screen)` -> `router.push('/screen')`
   - `setCurrentSubScreen('shopping')` -> `router.push('/(tabs)/shopping')`
7. **Add platform-specific code** where needed (keyboard avoiding, safe area)
8. **Test on both iOS and Android**

### 2.2 Example: Converting a Card Component

**Web (Tailwind):**
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200
  dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{description}</p>
</div>
```

**React Native:**
```tsx
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface CardProps {
  title: string;
  description: string;
}

export function Card({ title, description }: CardProps) {
  const { colors, shadows } = useTheme();

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
        ...shadows.sm,
      },
    ]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginTop: 4,
  },
});
```

### 2.3 Example: Converting a Modal

**Web (Tailwind):**
```tsx
{isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    onClick={onClose}>
    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
      onClick={e => e.stopPropagation()}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  </div>
)}
```

**React Native:**
```tsx
import { Modal as RNModal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  const { colors } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.content, { backgroundColor: colors.card }]}
          onPress={() => {}} // Prevent close on content press
        >
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
```

### 2.4 Example: Converting a Form

**Web (Tailwind):**
```tsx
<form onSubmit={handleSubmit}>
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700">Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mt-1 w-full rounded-md border-gray-300 shadow-sm"
        placeholder="Enter title"
      />
    </div>
    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md">
      Save
    </button>
  </div>
</form>
```

**React Native:**
```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>
  <View style={styles.form}>
    <FormField label="Title" error={errors.title}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Enter title"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
      />
    </FormField>

    <Button title="Save" onPress={handleSubmit} fullWidth />
  </View>
</KeyboardAvoidingView>
```

**Key form differences:**
- No `<form>` element or `onSubmit`; use a button's `onPress`
- No `onChange` event object; `onChangeText` passes the string directly
- No `type="email"` or `type="password"`; use `keyboardType="email-address"` and `secureTextEntry`
- No `type="number"`; use `keyboardType="numeric"`
- No `type="date"`; use a date picker component
- Wrap forms in `KeyboardAvoidingView` for iOS

---

## 3. Navigation Conversion

### 3.1 Web Navigation Pattern (current)

The web app uses flat state-based navigation:
```typescript
const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard-v4');
const [currentSubScreen, setCurrentSubScreen] = useState<SubScreen | null>(null);

// Navigation callback
onNavigate={(screen) => setCurrentScreen(screen)}
onNavigateToSubScreen={setCurrentSubScreen}
```

### 3.2 Mobile Navigation Pattern (target)

The mobile app uses Expo Router (file-based routing):
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to tab
router.push('/(tabs)/calendar');

// Navigate to detail screen
router.push(`/event/${eventId}`);

// Navigate to settings sub-screen
router.push('/settings/notifications');

// Go back
router.back();

// Replace current screen (no back button)
router.replace('/(tabs)/dashboard');
```

### 3.3 Migration Rules

| Web Pattern | Mobile Equivalent |
|---|---|
| `setCurrentScreen('calendar')` | `router.push('/(tabs)/calendar')` |
| `setCurrentSubScreen('shopping')` | `router.push('/(tabs)/shopping')` |
| `setCurrentSubScreen('settings')` | `router.push('/settings')` |
| `setCurrentSubScreen(null)` (go back) | `router.back()` |
| `onNavigateToScreen={setCurrentScreen}` | `onNavigate={(route) => router.push(route)}` |
| Conditional rendering based on screen state | File-based routes (automatic) |
| `<NavigationHeader onBack={...}>` | `<Header onBack={() => router.back()}>` |

---

## 4. Service Layer Conversion

### 4.1 Services that Port Directly

These services use only Supabase SDK and can be copied with minimal changes:

| Service | Changes Needed |
|---|---|
| `recipeService.ts` | Replace `import.meta.env` with `config` |
| `quickActionsService.ts` | Replace `import.meta.env` with `config` |
| `affiliateMatrixService.ts` | Replace `import.meta.env` with `config` |
| `lifeReceiptsService.ts` | Replace `import.meta.env` with `config` |
| `cycleTrackerService.ts` | Replace `import.meta.env` with `config`, replace `crypto.randomUUID` with `uuid` library |
| `affirmationService.ts` | Replace `import.meta.env` with `config` |
| `tutorialService.ts` | Replace `import.meta.env` with `config` |
| `birthdayEventsService.ts` | Replace `import.meta.env` with `config` |
| `errorLog.ts` | Replace `import.meta.env` with `config` |
| `userSettings.ts` | Replace `import.meta.env` with `config` |

### 4.2 Services that Need Significant Rewrite

| Service | Reason |
|---|---|
| `googleCalendar.ts` | OAuth flow is completely different in mobile |
| `googleContacts.ts` | Same (OAuth) |
| `googleTasks.ts` | Same (OAuth) |
| `googleTokenStorage.ts` | Uses `window.location`, browser session |
| `openaiRealtimeService.ts` | WebRTC-based; may not work in RN |
| `webrtcService.ts` | Browser WebRTC API; RN has different APIs |
| `notificationService.ts` | Web push -> Expo notifications (completely different) |
| `calendarProvider.ts` | Browser-specific OAuth |
| `weatherService.ts` | May use browser geolocation; replace with expo-location |
| `googleMapsKeyService.ts` | Uses browser fetch patterns |
| `geocoding.ts` | May use Google Maps JS SDK |

### 4.3 Services that Can Be Deleted (not needed in mobile)

| Service | Reason |
|---|---|
| `sessionHelper.ts` | Browser session handling |
| `calendarContext.ts` | Browser-specific context |

### 4.4 Environment Variable Translation

All services that reference `import.meta.env.VITE_*` must be updated:

```typescript
// Web
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mobile
import { config } from '../lib/config';
const url = config.supabaseUrl;
const key = config.supabaseAnonKey;
```

Where `config.ts` reads from Expo constants:
```typescript
// src/lib/config.ts
import Constants from 'expo-constants';

export const config = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl
    || process.env.EXPO_PUBLIC_SUPABASE_URL
    || '',
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    || '',
  environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
};
```

---

## 5. Utility Conversion

### 5.1 Utilities that Port Directly (no changes)

These are pure TypeScript with no browser or DOM dependencies:

- `ageCalculator.ts`
- `measurementConverter.ts`
- `ingredientParser.ts`
- `instacartUnitMapper.ts`
- `contactCategorizer.ts`
- `dateDetection.ts`
- `gradientMapper.ts`
- `lifeReceiptsFormatters.ts`
- `errorMessages.ts`
- `sampleRecipes.ts`
- `weatherCacheKey.ts`
- `affirmationScheduler.ts`

### 5.2 Utilities that Need Minor Changes

| Utility | Change Needed |
|---|---|
| `timeFormatters.ts` | Already ported in mobile scaffold; verify completeness |
| `tutorialSteps.ts` | Element IDs reference web DOM; change to component refs or testIDs |
| `networkClient.ts` | Replace any browser-specific fetch options |

---

## 6. Hook Conversion

### 6.1 Hooks that Need Mobile Adaptation

| Hook | Key Changes |
|---|---|
| `useAuth.ts` | Already ported; add Google OAuth via expo-auth-session |
| `useDashboardData.ts` | Already ported; convert to React Query |
| `useCalendarSync.ts` | Replace browser timer with RN timer/AppState |
| `useDarkMode.ts` | Replace CSS variables with ThemeContext |
| `useGoogleMaps.ts` | Replace Google Maps JS SDK with native maps or edge function calls |
| `useDirections.ts` | Replace Google Maps embed with Linking to native maps |
| `useDefaultAddress.ts` | Replace browser geolocation with expo-location |
| `useNotificationManager.ts` | Replace Web Push with Expo Notifications |
| `useAffirmationNotifier.ts` | Replace browser notifications with local notifications |
| `useFormValidation.ts` | Mostly portable; remove any DOM-specific logic |
| `useWeather.ts` | Replace browser geolocation with expo-location |
| `useErrorHandler.ts` | Replace browser toasts with RN toast system |

### 6.2 General Hook Conversion Pattern

**Web pattern:**
```typescript
useEffect(() => {
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, []);
```

**Mobile equivalent:**
```typescript
import { useRef, useEffect } from 'react';
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') handleFocus();
  });
  return () => subscription.remove();
}, []);
```

---

## 7. Dark Mode Conversion

### 7.1 Web Pattern (CSS/Tailwind)

The web app uses Tailwind's `dark:` prefix:
```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

### 7.2 Mobile Pattern (Theme Context)

Create a theme context that provides colors:

```typescript
// src/theme/colors.ts
export const lightColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#3B82F6',
  primaryText: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  // ... all colors
};

export const darkColors = {
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  border: '#374151',
  primary: '#3B82F6',
  primaryText: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  // ... all colors
};
```

All components use `colors.background`, `colors.text`, etc. instead of hardcoded values. The `ThemeContext` determines which set is active.

---

## 8. Platform-Specific Considerations

### 8.1 iOS vs Android Differences

| Area | iOS | Android |
|---|---|---|
| Safe area insets | Notch, Dynamic Island | Status bar, navigation bar |
| Shadows | `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` | `elevation` |
| Date picker | Native wheel picker | Material date picker |
| Keyboard behavior | `behavior="padding"` | `behavior="height"` |
| Status bar | Light/dark content | Translucent by default |
| Back navigation | Swipe from left edge | Hardware back button |
| Haptic feedback | Full haptic engine | Basic vibration |
| Font rendering | SF Pro (system) | Roboto (system) |

### 8.2 Platform-Specific Code Pattern

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
});
```

### 8.3 Android Back Button

Handle the Android hardware back button in modals and detail screens:

```typescript
import { BackHandler } from 'react-native';

useEffect(() => {
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (modalVisible) {
      setModalVisible(false);
      return true; // Prevent default back behavior
    }
    return false; // Allow default back behavior
  });

  return () => backHandler.remove();
}, [modalVisible]);
```

---

## 9. Icons Conversion

### 9.1 Web: lucide-react

```typescript
import { Calendar, Home, ShoppingBag } from 'lucide-react';
<Calendar className="w-5 h-5 text-blue-500" />
```

### 9.2 Mobile: lucide-react-native

```typescript
import { Calendar, Home, ShoppingBag } from 'lucide-react-native';
<Calendar size={20} color="#3B82F6" strokeWidth={2} />
```

**Key differences:**
- No `className`; use `size`, `color`, `strokeWidth` props
- Size is a number (not CSS `w-5 h-5`)
- Color is a string (not Tailwind class)
- Requires `react-native-svg` as a peer dependency

---

## 10. Common Pitfalls

### 10.1 Text Outside Text

Every piece of visible text MUST be wrapped in `<Text>`. This fails silently or crashes:

```tsx
// WRONG - crashes on Android
<View>Hello World</View>

// CORRECT
<View><Text>Hello World</Text></View>
```

### 10.2 Scroll Views with Flex

`ScrollView` must NOT be given `flex: 1` on its children if those children need to scroll. The common pattern is:

```tsx
<View style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
    {/* content */}
  </ScrollView>
</View>
```

### 10.3 Percentage Widths in Flexbox

React Native flexbox does not support all CSS flexbox features. Notably:
- `gap` works in RN 0.71+
- No `grid` layout; use flexbox with wrapping
- Percentage widths sometimes behave differently

### 10.4 Async Storage Size Limits

AsyncStorage has a ~6MB limit on Android by default. Do not store large datasets. Use it for:
- User preferences
- Cache keys and small metadata
- Offline queue (operations, not full data)

### 10.5 KeyboardAvoidingView

Always wrap form screens in `KeyboardAvoidingView` with platform-specific behavior:

```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
>
```

### 10.6 Image Source Format

```tsx
// Web
<img src="https://example.com/image.png" alt="..." />

// React Native
<Image source={{ uri: 'https://example.com/image.png' }} style={{ width: 100, height: 100 }} />
```

Images in React Native MUST have explicit dimensions (width and height). They do not auto-size.

### 10.7 No window or document

Never reference `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, or any other browser global. These do not exist in React Native.

### 10.8 No CSS Animations or Transitions

Use `react-native-reanimated` or the built-in `Animated` API for all animations. There are no CSS transitions.

### 10.9 Console Warnings in Production

Remove all `console.log` statements in production builds. They cause performance degradation in React Native. Use a logging utility that can be disabled.

### 10.10 Hermes Engine

React Native 0.81 uses the Hermes JavaScript engine by default, which does not support:
- `Intl` API (partially supported; use polyfills if needed for date formatting)
- Some ES2020+ features may need polyfills

Always test date formatting and number formatting on both platforms.
