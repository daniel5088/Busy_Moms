# Agent Session 8 -- Phase 8: AI Voice Chat and Affirmations

## Context from Previous Sessions
- Phases 1-4 complete: Foundation, UI, Auth, Dashboard
- Affirmation banner placeholder exists on Dashboard

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 8 section
2. `REBUILD_PROGRESS.md` and most recent handoff
3. `Busy_Moms/src/components/AIVoiceChat.tsx` -- web AI voice chat
4. `Busy_Moms/src/components/VoiceChat.tsx` -- web voice chat
5. `Busy_Moms/src/services/openai.ts` -- OpenAI service
6. `Busy_Moms/src/services/openaiRealtimeService.ts` -- realtime voice
7. `Busy_Moms/src/services/aiAssistantService.ts` -- AI assistant
8. `Busy_Moms/src/services/aiVoicePreferences.ts` -- voice preferences
9. `Busy_Moms/src/components/DailyAffirmations.tsx` -- web affirmations
10. `Busy_Moms/src/components/AffirmationSettings.tsx`
11. `Busy_Moms/src/services/affirmationService.ts`
12. `Busy_Moms/src/hooks/useAffirmationNotifier.ts`

## Your Mission
Build the AI voice chat interface (text and voice), daily affirmations system with scheduling and notifications, and voice/personality preferences.

## Prerequisites Check
- [ ] Phases 1-4 completed
- [ ] Edge functions `openai-chat` and `openai-token` are deployed
- [ ] Edge function `generate-affirmation` is deployed

## Implementation Steps

### Step 1: Build AI chat service
**src/services/aiChatService.ts**
- sendMessage(messages) -- calls `openai-chat` edge function
- Maintains conversation context
- Handles system prompt with personality instructions
- Family context injection (user's events, tasks, family members)

### Step 2: Build AI voice service
**src/services/aiVoiceService.ts**
- Use `expo-av` for audio recording
- Record audio -> send to edge function for transcription
- Receive text response -> use TTS (text-to-speech) if available
- Fallback: just show text response

**Approach for voice:**
1. Primary: Record audio with expo-av, send to `openai-chat` edge function with audio
2. Fallback: Use expo-speech for TTS of text responses
3. Future: WebSocket to OpenAI Realtime API (complex, defer if time-constrained)

### Step 3: Build voice preference service
**src/services/aiVoicePreferences.ts**
Port from web:
- getOrCreatePreferences(userId)
- updatePreferences(userId, { voice, personality })
- getPersonalityInstructions(personality)

### Step 4: Build chat UI components
**src/components/ai/VoiceChat.tsx**
- Full-screen chat interface
- Message list (FlatList, inverted for chat UX)
- Text input at bottom
- Microphone button for voice input
- Send button
- AI typing indicator
- Chat bubbles (user = right aligned, AI = left aligned)

**src/components/ai/ChatBubble.tsx**
- Message bubble with text
- Timestamp
- Avatar for AI messages
- Different colors for user vs AI

**src/components/ai/VoiceRecorder.tsx**
- Hold-to-record button
- Recording indicator (pulsing animation)
- Cancel gesture (slide away)
- Audio playback of recording (optional)

**app/voice-chat.tsx**
- Modal presentation (full screen)
- Close button in header
- VoiceChat component

### Step 5: Build affirmation service
**src/services/affirmationService.ts**
Port from web:
- generateAffirmation(userId) -- calls `generate-affirmation` edge function
- getAffirmations(userId) -- fetch history
- getTodayAffirmation(userId)
- markAsViewed(id)
- toggleFavorite(id)
- getSettings(userId), updateSettings(userId, settings)

### Step 6: Build affirmation components
**src/components/affirmations/DailyAffirmation.tsx**
- Full-screen modal with today's affirmation
- Beautiful gradient background
- Favorite button (heart)
- Share button
- Previous/next affirmation navigation
- "Open Voice Chat" button

**src/components/affirmations/AffirmationSettings.tsx**
- Enable/disable toggle
- Frequency: once daily, twice daily, custom
- Preferred time(s)
- Include context: calendar, tasks, family, shopping checkboxes

**src/components/affirmations/AffirmationNotification.tsx**
- In-app notification banner when affirmation is due
- "View" and "Dismiss" buttons
- Schedule via Expo local notifications

### Step 7: Build affirmation notifier hook
**src/hooks/useAffirmationNotifier.ts**
- Check settings on app start
- Schedule local notifications for affirmation times
- Show in-app notification when due
- Track pending/dismissed state

### Step 8: Connect to Dashboard
Update the AffirmationBanner in Dashboard (from Phase 4):
- Show real affirmation data
- Tap opens DailyAffirmation modal
- Settings gear icon opens AffirmationSettings

## Quality Checklist
- [ ] Text chat with AI works (sends/receives messages)
- [ ] Voice recording works (if mic permission granted)
- [ ] AI personality affects responses
- [ ] Daily affirmation generates and displays
- [ ] Affirmation scheduling works
- [ ] Affirmation favorites work
- [ ] Affirmation settings persist
- [ ] In-app notification appears when affirmation is due
- [ ] Voice/personality preferences save and load
- [ ] Works on both iOS and Android

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_8_HANDOFF.md` with:
   - Voice implementation approach chosen (REST vs WebSocket)
   - Audio recording setup details
   - Any platform-specific voice issues
3. Git commit

## Next Agent Context
Phase 9 (Settings) will add voice preferences to the settings screen.
