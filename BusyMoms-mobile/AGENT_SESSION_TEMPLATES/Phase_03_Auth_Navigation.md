# Agent Session 3 -- Phase 3: Authentication, Onboarding, and Navigation

## Context from Previous Sessions
- Phase 1: Project foundation, types, theme tokens, Supabase client
- Phase 2: Reusable UI components (Button, Card, Input, Modal, etc.), ThemeContext

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 3 section
2. `ARCHITECTURE.md` -- Section 4 (navigation), Section 5 (Supabase client)
3. `MIGRATION_GUIDE.md` -- Section 3 (navigation conversion)
4. `REBUILD_PROGRESS.md` and `PHASE_2_HANDOFF.md`
5. `Busy_Moms/src/components/forms/AuthForm.tsx` -- web auth form (for feature parity)
6. `Busy_Moms/src/components/Onboarding.tsx` -- web onboarding flow
7. `Busy_Moms/src/hooks/useAuth.ts` -- web auth hook

## Your Mission
Build the complete authentication flow (email/password + Google OAuth), the onboarding wizard, and finalize the navigation architecture (auth guard, tab navigation, stack navigation for sub-screens).

## Prerequisites Check
- [ ] Phase 2 completed (UI components available)
- [ ] Screen, Header, Button, Input, Card, Modal, FormField components exist
- [ ] ThemeContext wraps the app

## Implementation Steps

### Step 1: Create AuthContext (src/contexts/AuthContext.tsx)
- Provides: user, session, loading, signIn, signUp, signOut, signInWithGoogle
- Wraps Supabase auth state listener
- Loads user profile from `profiles` table
- Exposes `profile` including `onboarding_completed` flag

### Step 2: Update useAuth hook
- Consume AuthContext instead of direct Supabase calls
- Add `signInWithGoogle` method using `expo-auth-session`

### Step 3: Implement Google OAuth
- Install `expo-auth-session` and `expo-web-browser`
- Configure Google OAuth with:
  - Web client ID from environment
  - iOS client ID from environment
  - Redirect URI using Expo scheme
- After Google auth, call `store-google-tokens` edge function to save tokens
- Handle the OAuth callback and session creation

### Step 4: Build auth screens

**app/(auth)/_layout.tsx**
- Stack navigator with no header

**app/(auth)/login.tsx** (rewrite from scaffold)
- Email and password inputs using FormField and Input components
- "Sign In" button
- "Sign In with Google" button with Google logo
- "Don't have an account? Sign Up" link
- "Forgot Password?" link
- Loading state during auth
- Error display via Toast

**app/(auth)/signup.tsx**
- Email, password, confirm password inputs
- "Sign Up" button
- "Sign Up with Google" button
- "Already have an account? Sign In" link
- Email verification notice after sign-up

**app/(auth)/forgot-password.tsx**
- Email input
- "Send Reset Link" button
- Success message after sending

### Step 5: Build onboarding screens

**app/(onboarding)/_layout.tsx**
- Stack navigator with progress indicator

**app/(onboarding)/profile.tsx**
- Name input
- User type selector (Mom, Dad, Guardian, Other)
- AI personality selector (Friendly, Professional, Humorous)

**app/(onboarding)/family.tsx**
- Add family members list
- "Add Family Member" button -> modal with:
  - Name, Email, relationship, birthday, gender, color
- Can skip this step

**app/(onboarding)/preferences.tsx**
- Dark mode toggle
- Measurement system (metric/imperial)
- Notification permission request

**app/(onboarding)/complete.tsx**
- Welcome message
- "Get Started" button -> navigates to dashboard
- Sets `profile.onboarding_completed = true` in Supabase

### Step 6: Implement auth guard in root layout

**app/_layout.tsx**
Update with the auth guard pattern from ARCHITECTURE.md Section 4.3:
- Wrap app in QueryClientProvider, AuthProvider, ThemeProvider
- AuthGuard component checks user state and redirects:
  - No user -> /(auth)/login
  - User without onboarding -> /(onboarding)/profile
  - User with onboarding -> /(tabs)/dashboard

### Step 7: Finalize tab layout

**app/(tabs)/_layout.tsx**
- 5 tabs: Home (Home icon), Calendar (Calendar icon), Shop (ShoppingBag icon), Family (Users icon), More (Menu icon)
- Active tint: primary blue
- Tab bar styling matching design system

### Step 8: Create profile service
**src/services/profileService.ts**
- getProfile(userId)
- updateProfile(userId, data)
- completeOnboarding(userId)

### Step 9: Create deep link configuration
- URL scheme: `busymoms://`
- Configure in app.config.ts

## Quality Checklist
- [ ] Email sign-in works (test with real Supabase account)
- [ ] Email sign-up works
- [ ] Google OAuth sign-in works on both iOS and Android
- [ ] Onboarding flow completes (all 4 steps)
- [ ] After onboarding, user lands on dashboard tab
- [ ] Sign-out returns to login screen
- [ ] Auth state persists across app restarts
- [ ] Unauthenticated users cannot access tab screens
- [ ] Deep link scheme resolves

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_3_HANDOFF.md` with:
   - Google OAuth configuration details (client IDs, redirect URIs)
   - Auth flow diagram
   - Navigation map (all routes and their relationships)
   - Any issues with Google OAuth on specific platforms
3. Git commit

## Next Agent Context
The next agent (Phase 4 - Dashboard) needs:
- AuthContext available to get user and profile
- Tab navigation working (they will rewrite dashboard.tsx)
- Understanding of how Quick Actions grid navigates to sub-screens
