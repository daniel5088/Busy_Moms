# Agent Session 7 -- Phase 7: Tasks, Contacts, and Family Hub

## Context from Previous Sessions
- Phases 1-4 complete: Foundation, UI, Auth, Dashboard
- Service layer patterns established in shopping (Phase 6) and calendar (Phase 5)

## Required Reading
1. `MOBILE_REBUILD_MASTER_PLAN.md` -- Phase 7 section
2. `REBUILD_PROGRESS.md` and most recent handoff
3. `Busy_Moms/src/components/Tasks.tsx` -- web tasks
4. `Busy_Moms/src/components/forms/TaskForm.tsx` -- web task form
5. `Busy_Moms/src/components/Contacts.tsx` -- web contacts
6. `Busy_Moms/src/components/forms/ContactForm.tsx` -- web contact form
7. `Busy_Moms/src/components/FamilyHub.tsx` -- web family hub
8. `Busy_Moms/src/components/FamilyFolders.tsx` -- web family folders
9. `Busy_Moms/src/components/forms/FamilyMemberForm.tsx`
10. `Busy_Moms/src/services/taskSync.ts` -- Google Tasks sync
11. `Busy_Moms/src/services/googleContacts.ts` -- Google Contacts sync
12. `Busy_Moms/src/services/googleTasks.ts` -- Google Tasks API

## Your Mission
Build Tasks, Contacts, and Family Hub screens with CRUD operations, Google Tasks sync, Google Contacts sync, and family member management with task/event assignment.

## Prerequisites Check
- [ ] Phases 1-4 completed
- [ ] Google OAuth tokens available (from Phase 3)
- [ ] UI components and service layer patterns established

## Implementation Steps

### Step 1: Build task service and components
**src/services/taskService.ts**
- getTasks(userId, filters) -- with status, priority, category filters
- createTask(task), updateTask(id, data), deleteTask(id)
- toggleTaskStatus(id)
- assignTask(id, assigneeEmail)

**src/components/tasks/TaskList.tsx**
- FlatList with filter chips (All, Pending, In Progress, Completed)
- Sort by priority, due date, or status
- TaskCard components

**src/components/tasks/TaskCard.tsx**
- Title, description preview, priority badge, due date
- Assigned-to avatar/name
- Checkbox to toggle status
- Swipe to delete

**src/components/tasks/TaskForm.tsx**
- Title, description, category, priority selector
- Due date and time
- Recurring toggle with pattern
- Assign to family member (email dropdown)
- Points input
- Notes

**app/task/[id].tsx** and **app/task/create.tsx**

### Step 2: Build Google Tasks sync
**src/services/taskSyncService.ts**
- Call `google-tasks` edge function
- Sync tasks bidirectionally
- Handle conflict detection (similar to calendar sync)

**src/components/tasks/TaskSyncStatus.tsx**
- Sync status indicator
- Manual sync button

### Step 3: Build contact service and components
**src/services/contactService.ts**
- getContacts(userId, filters)
- createContact, updateContact, deleteContact
- getContactCategories

**src/services/googleContactsService.ts**
- Sync contacts with Google Contacts via `google-contacts` edge function

**src/components/contacts/ContactList.tsx**
- SectionList grouped by category (or alphabetical)
- Search input at top
- Contact cards with name, role, phone, email

**src/components/contacts/ContactCard.tsx**
- Name, role, phone, email, rating stars
- Tap to call/email (Linking.openURL)
- Category badge

**src/components/contacts/ContactForm.tsx**
- Name, role, phone, email, category selector, rating, notes
- Background check fields

**app/contact/[id].tsx** and **app/contact/create.tsx**

### Step 4: Build family service and components
**src/services/familyService.ts**
- getFamilyMembers(userId)
- createFamilyMember, updateFamilyMember, deleteFamilyMember

**src/components/family/FamilyHub.tsx**
- Grid of family member cards
- Quick action buttons: Folders, Contacts, Tasks, Shopping
- "Add Family Member" button

**src/components/family/FamilyMemberCard.tsx**
- Avatar with color, name, relationship, age
- Tap to edit

**src/components/family/FamilyMemberForm.tsx**
- Name, email, relationship, birthday, gender
- Color picker
- Allergies (text input)
- Medical notes
- School, grade

**src/components/family/FamilyFolders.tsx**
- List of family members as folder headers
- Under each: their assigned tasks, events, reminders

**app/family-member/[id].tsx**

### Step 5: Build the Family Hub screen
**app/(tabs)/family.tsx** (complete rewrite)
- Family members grid
- Quick action cards (Contacts, Tasks, Folders)
- "Add Member" FAB

### Step 6: Wire up task assignment
- When creating a task/event, allow selecting a family member by email
- Assigned items show in the family member's folder
- Family member's email is stored in the `assigned_to_email` field

## Quality Checklist
- [ ] Tasks display with filtering and sorting
- [ ] Task CRUD works
- [ ] Google Tasks sync works (if connected)
- [ ] Contacts display with categories
- [ ] Contact CRUD works
- [ ] Tap phone/email opens native dialer/email
- [ ] Family Hub shows members with colors
- [ ] Family member CRUD works
- [ ] Family Folders show assigned items per member
- [ ] Task assignment to family members works
- [ ] Works on both iOS and Android

## Handoff Requirements
1. Update `REBUILD_PROGRESS.md`
2. Create `PHASE_7_HANDOFF.md`
3. Git commit

## Next Agent Context
Phase 8 (AI Voice) is independent. Phase 9 (Settings) will need the task sync and contact sync patterns.
