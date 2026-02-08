# Agent Session 10 -- Phase 10: Life Receipts, Gift Finder, and Remaining Features

## Context from Previous Sessions
- Phases 1-9 should be substantially complete
- Core features (auth, dashboard, calendar, shopping, tasks, family, AI, settings) done

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 10 section
2. `REBUILD_PROGRESS.md` and most recent handoff
3. `Busy_Moms/src/components/LifeReceipts.tsx` -- web life receipts
4. `Busy_Moms/src/components/LifeReceiptsView.tsx` -- view
5. `Busy_Moms/src/components/ReceiptTriageFlow.tsx` -- triage
6. `Busy_Moms/src/services/lifeReceiptsService.ts`
7. `Busy_Moms/src/services/lifeReceiptsAI.ts`
8. `Busy_Moms/src/components/GiftFinder.tsx` -- gift finder
9. `Busy_Moms/src/components/GiftFinderForm.tsx`
10. `Busy_Moms/src/components/GiftFinderModal.tsx`
11. `Busy_Moms/src/components/AffiliateResults.tsx`
12. `Busy_Moms/src/services/affiliateMatrixService.ts`
13. `Busy_Moms/src/components/QuickLinks.tsx`
14. `Busy_Moms/src/components/TutorialOverlay.tsx`
15. `Busy_Moms/src/services/tutorialService.ts`
16. `Busy_Moms/src/utils/tutorialSteps.ts`
17. `Busy_Moms/src/services/birthdayEventsService.ts`

## Your Mission
Build Life Receipts (capture via text/voice/camera, triage, view), Gift Finder with affiliate matrix, Quick Links, Tutorial overlay system, and birthday event automation.

## Prerequisites Check
- [ ] Phases 1-4 completed (at minimum)
- [ ] Camera and audio permissions configured (expo-camera, expo-av)
- [ ] AI chat service available (for Life Receipts AI triage)

## Implementation Steps

### Step 1: Build Life Receipts service
**src/services/lifeReceiptsService.ts**
Port from web:
- createReceipt(content, where, who, when, obligation)
- listReceipts()
- clearAllReceipts()
- updateReceipt(id, data)
- deleteReceipt(id)

**src/services/lifeReceiptsAIService.ts**
- triageReceipt(content) -- calls `life-receipts-text-agent` edge function
- triageImage(imageBase64) -- calls `life-receipts-image-agent` edge function
- triageAudio(audioBase64) -- calls `life-receipts-audio-agent` edge function
- Returns: where, who, when_bucket, obligation classification

### Step 2: Build Life Receipts components
**src/components/life-receipts/CaptureFlow.tsx**
- Three capture modes: Text, Voice, Camera
- Text: Simple text input for quick capture
- Voice: Record audio (expo-av), send for transcription and triage
- Camera: Take photo of note/receipt (expo-camera), send for image analysis
- After capture, show triage result
- "Save" button

**src/components/life-receipts/TriageFlow.tsx**
- Shows AI-classified fields: where, who, when, obligation
- User can edit any field
- Confirm and save

**src/components/life-receipts/ReceiptCard.tsx**
- Content preview
- Tags: where, who, when_bucket, obligation, status
- Tap to expand
- Delete action

**app/life-receipts/index.tsx** -- list view
**app/life-receipts/capture.tsx** -- capture mode selector + flow
**app/life-receipts/triage.tsx** -- triage confirmation
**app/life-receipts/view.tsx** -- full receipt view

### Step 3: Build Gift Finder
**src/services/affiliateMatrixService.ts**
Port from web:
- getLookupOptions() -- relationships, age groups, genders, budgets
- searchAffiliate(criteria) -- find matching affiliate links
- Cache lookup options for 1 hour

**src/hooks/useAffiliateMatrix.ts**
- Manages search state and results

**src/components/gift-finder/GiftFinderForm.tsx**
- Step-by-step form:
  1. Relationship selector (daughter, son, mom, dad, friend, etc.)
  2. Age group selector
  3. Gender selector
  4. Budget range selector
- "Find Gifts" button

**src/components/gift-finder/AffiliateResults.tsx**
- Grid of gift suggestions
- Each card: search phrase, affiliate link
- Tap opens affiliate URL in browser (Linking.openURL)

**app/gift-finder.tsx**
- GiftFinderForm + AffiliateResults

### Step 4: Build Quick Links
**app/quick-links.tsx**
- Customizable list of quick-access links
- Uses quickActionsService from Phase 4
- Each link opens a specific screen or external URL

### Step 5: Build Tutorial system
**src/services/tutorialService.ts**
Port from web:
- getTutorialStatus(userId, tutorialName)
- completeTutorial(userId, tutorialName)
- resetAllTutorials(userId)

**src/hooks/useTutorial.ts**
- Check if tutorial should show for current screen
- Return current step, next/back/skip functions
- Mark as complete

**src/utils/tutorialSteps.ts**
Define tutorial steps for each screen. Mobile version should use different targeting than web (no DOM element IDs; use position-based overlay or highlight areas).

Tutorial screens:
- Dashboard: 5 steps (weather, affirmations, schedule, quick actions, navigation)
- Calendar: 4 steps (calendar view, add event, sync, event list)
- Family Hub: 5 steps (members, folders, contacts, tasks, shopping)

**src/components/tutorials/TutorialOverlay.tsx**
- Semi-transparent overlay
- Highlighted area (cutout in overlay)
- Speech bubble with step text
- Progress dots
- Back/Next/Skip buttons
- Adaptive positioning

### Step 6: Build birthday event automation
**src/services/birthdayEventsService.ts**
Port from web:
- createBirthdayEvents(userId) -- scans family members with birthdays, creates annual events
- Called after onboarding and when family members are added/updated
- Creates events with source='birthday'

### Step 7: Connect everything to navigation
- Dashboard quick actions include Life Receipts and Gift Finder
- More menu includes Quick Links
- Tutorial auto-starts on first visit to each screen
- Birthday events appear in calendar after family member creation

## Quality Checklist
- [ ] Life Receipts text capture works
- [ ] Life Receipts voice capture records and triages
- [ ] Life Receipts camera capture takes photo and triages
- [ ] Life Receipts triage shows classified fields
- [ ] Life Receipts list displays saved receipts
- [ ] Gift Finder form collects criteria
- [ ] Gift Finder shows affiliate results
- [ ] Affiliate links open in browser
- [ ] Quick Links screen works
- [ ] Tutorial overlay shows on first visit
- [ ] Tutorial can be skipped and completed
- [ ] Tutorial can be reset from settings
- [ ] Birthday events auto-create for family members with birthdays
- [ ] Works on both iOS and Android

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_10_HANDOFF.md`
3. Git commit

## Next Agent Context
Phase 11 will focus on offline support, performance, and polish. All features should be functional by now.
