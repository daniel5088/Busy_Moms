# Agent Session 11 -- Phase 11: Offline Support, Performance, and Polish

## Context from Previous Sessions
- Phases 1-10 complete: All features are functionally built
- This phase is about hardening, optimizing, and polishing

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 11 section, Performance Budgets
2. `REBUILD_PROGRESS.md` and `PHASE_10_HANDOFF.md`
3. `ARCHITECTURE.md` -- Section 7 (performance), Section 6 (data architecture, offline)
4. Browse all screens and components for optimization opportunities

## Your Mission
Implement offline-first data layer, optimize performance (FlatList, memoization, bundle), add accessibility, polish animations and transitions, add haptic feedback, and ensure comprehensive error handling.

## Prerequisites Check
- [ ] All 10 previous phases completed
- [ ] App runs on both iOS and Android
- [ ] All features functional (even if not polished)

## Implementation Steps

### Step 1: Build offline infrastructure
**src/lib/offlineQueue.ts**
- Store queued operations in AsyncStorage
- Operation format: { id, table, operation, data, createdAt, retryCount, status }
- Enqueue operations when offline
- Process queue FIFO when connectivity returns
- Handle failures with retry (max 3 attempts)
- Conflict resolution: last-write-wins for simple cases

**src/lib/cacheManager.ts**
- Wrapper around AsyncStorage for typed cache operations
- set(key, data, ttlMs), get(key), invalidate(key), invalidatePrefix(prefix)
- Size management: track total cache size, evict LRU when over limit

**src/lib/syncEngine.ts**
- Generic sync engine for any table
- Detect connectivity changes via `@react-native-community/netinfo`
- Process offline queue on reconnect
- Emit events for UI updates

**src/hooks/useNetworkStatus.ts**
- Returns: isConnected, connectionType
- Updates in real-time

**src/hooks/useOfflineSync.ts**
- Returns: pendingOperations count, processQueue function
- Auto-processes on reconnect

**src/components/ui/NetworkBanner.tsx**
- Shows "No internet connection" banner at top of screen
- Shows "Syncing..." when processing offline queue
- Auto-hides when connected

### Step 2: Add offline support to services
For each service that writes data:
- Wrap mutations in offline-aware wrapper
- If online: execute normally
- If offline: enqueue operation, return optimistic result
- When online resumes: process queue

Priority services for offline:
1. Shopping list (add/complete items)
2. Events (create/update)
3. Tasks (create/update/complete)
4. Life Receipts (create)

### Step 3: Configure React Query for offline
```typescript
queryClient.setDefaultOptions({
  queries: {
    networkMode: 'offlineFirst',  // Use cache first, then fetch
    staleTime: 1000 * 60 * 5,     // 5 minutes
    gcTime: 1000 * 60 * 60 * 24,  // 24 hours for offline access
  },
  mutations: {
    networkMode: 'offlineFirst',
  },
});
```

### Step 4: Performance optimization
**FlatList audit:**
- Ensure ALL lists with >20 items use FlatList (not ScrollView + map)
- Add `getItemLayout` for fixed-height items
- Add `keyExtractor` to all lists
- Add `removeClippedSubviews` for long lists
- Add `maxToRenderPerBatch` and `windowSize` tuning

**Memoization audit:**
- Add `React.memo` to all list item components (EventCard, TaskCard, ShoppingItemCard, ContactCard, etc.)
- Add `useCallback` for event handlers passed to child components
- Add `useMemo` for expensive filter/sort operations
- Remove over-memoization where profiling shows no benefit

**Image optimization:**
- Ensure all network images have explicit width/height
- Add placeholder/skeleton for loading images
- Consider `expo-image` for better caching

**Bundle optimization:**
- Audit imports: no `import * as` for large libraries
- Verify tree-shaking for lucide-react-native (import individual icons)
- Check for large unused dependencies

### Step 5: Accessibility
**For every interactive element:**
- Add `accessibilityLabel` describing the action
- Add `accessibilityRole` (button, link, checkbox, etc.)
- Add `accessibilityState` where applicable (disabled, checked, selected)
- Add `accessibilityHint` for non-obvious actions

**For every screen:**
- Ensure logical focus order for screen readers
- Group related elements with `accessibilityGrouped`
- Test with VoiceOver (iOS) and TalkBack (Android)

**Dynamic type:**
- Respect system font size with `allowFontScaling` (default true)
- Test with large text sizes
- Ensure layouts don't break with 200% text size

**Color contrast:**
- Verify all text meets 4.5:1 contrast ratio (WCAG AA)
- Verify interactive elements are distinguishable

### Step 6: Animation and transitions
- Add screen transition animations via Expo Router
- Add subtle entrance animations for cards and lists (fade + slide)
- Add press animations on buttons (scale down on press)
- Add skeleton shimmer animation (using Reanimated)
- Add pull-to-refresh animation
- Ensure all animations run at 60fps (on UI thread via Reanimated)

### Step 7: Haptic feedback
- Add haptic feedback on:
  - Button presses (light)
  - Toggle switches (medium)
  - Destructive actions like delete (heavy)
  - Pull-to-refresh trigger (medium)
  - Success actions (success notification)
- Use `expo-haptics`

### Step 8: Error handling audit
- Verify every screen has an ErrorBoundary
- Verify every async operation has try/catch
- Verify all error states show retry actions
- Verify toast notifications appear for errors
- Verify error logging to Supabase works
- Add global unhandled error handler

### Step 9: Polish
- Verify consistent spacing and alignment across all screens
- Verify consistent use of theme colors (no hardcoded values)
- Verify loading skeletons on all data-fetching screens
- Verify empty states on all lists
- Verify keyboard dismissal when tapping outside inputs
- Verify status bar style matches theme
- Add splash screen configuration
- Add app loading screen with brand animation

## Quality Checklist
- [ ] App works offline for reading cached data
- [ ] Shopping items can be added offline and sync when online
- [ ] Network banner appears when offline
- [ ] No unnecessary re-renders (check with React DevTools Profiler)
- [ ] All FlatLists scroll smoothly at 60fps
- [ ] All images have explicit dimensions
- [ ] All interactive elements have accessibility labels
- [ ] VoiceOver can navigate all screens
- [ ] Haptic feedback on key actions
- [ ] Screen transitions are smooth
- [ ] Error boundaries catch all render errors
- [ ] Bundle size < 5MB JS bundle
- [ ] Cold start < 3 seconds
- [ ] No console warnings in production mode

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_11_HANDOFF.md` with:
   - Performance benchmarks (cold start, scroll FPS, bundle size)
   - Accessibility audit results
   - Offline scenarios tested
   - Known remaining issues
3. Git commit

## Next Agent Context
Phase 12 (final) will write tests, configure builds, and prepare for release. All features should be complete and polished.
