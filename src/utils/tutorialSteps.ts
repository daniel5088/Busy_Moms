import { TutorialStep } from '../components/TutorialOverlay';

export const dashboardTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to BusyMoms!',
    description: 'Let\'s take a quick tour of your dashboard. This is your command center for managing family life.',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Weather at a Glance',
    description: 'Check today\'s weather and plan your day accordingly. The weather widget shows current conditions and forecasts.',
    targetId: 'weather-widget',
    placement: 'bottom',
  },
  {
    title: 'Daily Affirmations',
    description: 'Start your day with positive affirmations. Get personalized messages to keep you motivated.',
    targetId: 'daily-affirmations',
    placement: 'bottom',
  },
  {
    title: 'Today\'s Schedule',
    description: 'View your daily schedule on the left and your weekly schedule on the right. Stay organized and never miss an important moment.',
    targetId: 'todays-schedule',
    placement: 'bottom',
  },
  {
    title: 'Smart Reminders',
    description: 'See all your upcoming reminders and tasks. These are personalized notifications to keep you on track.',
    targetId: 'smart-reminders',
    placement: 'bottom',
  },
  {
    title: 'Quick Actions',
    description: 'Access frequently used features quickly. Add events, create shopping lists, and more with just one tap.',
    targetId: 'quick-links',
    placement: 'top',
  },
  {
    title: 'Meet Sarah - Your AI Assistant',
    description: `Sarah is your intelligent assistant who helps manage your family life. Tap the microphone button to talk to Sarah or type your requests.

**What Sarah can do:**

📅 **Calendar Management**
• "Schedule dentist appointment tomorrow at 2pm"
• "What's my schedule today?"
• "Am I free Friday afternoon?"
• "Move my dentist appointment to next week"
• "Cancel my meeting tomorrow"
• "Share the piano lesson with Emma"

✅ **Task Management**
• "Create a task for Emma to clean her room"
• "Show me all pending tasks"
• "Remind Jack to do his homework at 5pm"
• "Mark homework task as completed"
• "What tasks does Emma have?"

🛒 **Shopping Lists**
• "Add milk and bread to my shopping list"
• "Send items to Instacart"
• "What's on my shopping list?"
• "Mark milk as purchased"
• "Add 2 loaves of bread, urgent"

👨‍👩‍👧 **Family Management**
• "Add my daughter Emma, age 8"
• "Who's in my family?"
• "Update Emma's age to 9"
• "Set Emma's school to Lincoln Elementary"

🔔 **Smart Reminders**
• "Remind me to call mom tomorrow at 3pm"
• "Remind Jack to take out the trash at 6pm"
• "Set a reminder for Emma's soccer practice"
• "Share the dentist reminder with Emma"

🌤️ **Weather & Events**
• "What's the weather today?"
• "Will it rain tomorrow?"
• "What's the forecast for this week?"
• "What's the weather for my dentist appointment?"

💬 **Natural Conversation**
Sarah understands natural language, so just talk to her like you would to a friend! She remembers your conversation context and can help with follow-up questions.`,
    targetId: 'sarah-button',
    placement: 'top',
  },
  {
    title: 'You\'re All Set!',
    description: 'Great job! Now let\'s explore your Calendar to see how you can manage all your family events.',
    targetId: null,
    placement: 'center',
  },
];

export const calendarTutorialSteps: TutorialStep[] = [
  {
    title: 'Your Family Calendar',
    description: 'Welcome to your calendar! Keep track of all family events, appointments, and activities in one place.',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Calendar View',
    description: 'Browse through months and view all your scheduled events. Each event shows time, location, and who it\'s assigned to.',
    targetId: 'calendar-view',
    placement: 'bottom',
  },
  {
    title: 'Add New Events',
    description: 'Click the + button to create new events. You can set reminders, assign them to family members, and add locations.',
    targetId: 'add-event-button',
    placement: 'left',
  },
  {
    title: 'Google Calendar Sync',
    description: 'Connect your Google Calendar to sync events automatically. Never miss an appointment!',
    targetId: 'google-calendar-sync',
    placement: 'bottom',
  },
  {
    title: 'Event Details',
    description: 'Click on any event to view full details, get directions, or make changes.',
    targetId: 'calendar-events',
    placement: 'right',
  },
  {
    title: 'Use Sarah for Calendar',
    description: `Pro tip: You can manage your calendar with Sarah!

Try saying:
• "Schedule dentist appointment tomorrow at 2pm"
• "What's on my calendar this week?"
• "Move my meeting to Friday"
• "Share this event with Emma"
• "Check if I'm free on Monday"

Sarah understands natural language and makes scheduling effortless!`,
    targetId: null,
    placement: 'center',
  },
];

export const familyHubTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Family Hub',
    description: 'This is your central place to manage family members, contacts, and stay organized together.',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Family Folders',
    description: 'Organize important documents and information by family member. Keep everything in one place.',
    targetId: 'family-folders-section',
    placement: 'bottom',
  },
  {
    title: 'Contacts',
    description: 'Store important contacts for schools, doctors, and other frequently needed information.',
    targetId: 'contacts-section',
    placement: 'bottom',
  },
  {
    title: 'Tasks & Reminders',
    description: 'Create tasks and reminders for yourself or assign them to family members. Keep everyone on track!',
    targetId: 'tasks-section',
    placement: 'bottom',
  },
  {
    title: 'Shopping Lists',
    description: 'Create shared shopping lists. Send them directly to Instacart for easy ordering.',
    targetId: 'shopping-section',
    placement: 'bottom',
  },
  {
    title: 'Wellness Tracking',
    description: 'Track menstrual cycles and health insights. Keep your wellness data private and organized.',
    targetId: 'wellness-section',
    placement: 'top',
  },
  {
    title: 'Sarah Helps with Everything',
    description: `Sarah is your assistant for all family management!

**Family Members:**
• "Add my daughter Emma, age 8"
• "Update Jack's school to Washington Elementary"
• "Who's in my family?"

**Tasks:**
• "Create a task for Emma to clean her room"
• "Remind Jack to do homework at 5pm"
• "Show me Emma's tasks"

**Shopping:**
• "Add milk, bread, and eggs to shopping list"
• "Send my shopping list to Instacart"
• "What's on my shopping list?"
• "Assign bread to Emma"

Just ask Sarah naturally, and she'll take care of it!`,
    targetId: null,
    placement: 'center',
  },
];

export const shoppingTutorialSteps: TutorialStep[] = [
  {
    title: 'Smart Shopping Lists',
    description: 'Manage your shopping with AI-powered lists. Sarah makes shopping effortless!',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Add Items with Sarah',
    description: `Sarah makes adding items super easy!

**Try these:**
• "Add milk and bread to my shopping list"
• "I need eggs, butter, and cheese"
• "Put apples, bananas, and oranges on my list"
• "Add 2 gallons of milk, urgent"
• "Send chicken, beef, and fish to Instacart"

Sarah understands natural language and can add multiple items at once!`,
    targetId: 'shopping-list',
    placement: 'bottom',
  },
  {
    title: 'Organize by Category',
    description: 'Items are automatically organized by category: dairy, produce, meat, bakery, household, and more. Sarah assigns categories intelligently!',
    targetId: 'category-filters',
    placement: 'top',
  },
  {
    title: 'Assign to Family Members',
    description: `Delegate shopping to family members!

Say to Sarah:
• "Remind Emma to pick up milk"
• "Assign bread to Jack"
• "Tell Cody to get groceries"

Family members will get reminders for their assigned items!`,
    targetId: 'family-assignments',
    placement: 'bottom',
  },
  {
    title: 'Instacart Integration',
    description: `Send items directly to Instacart!

Tell Sarah:
• "Send milk and bread to Instacart"
• "Add eggs to my Instacart cart"
• "Put these items on Instacart"

Sarah creates a link you can open to complete your order!`,
    targetId: 'instacart-button',
    placement: 'top',
  },
  {
    title: 'Manage Your List',
    description: `Update and manage items with Sarah:

• "Mark milk as purchased"
• "Remove bread from my list"
• "Change milk quantity to 2"
• "What's on my shopping list?"
• "Show me pending items"

Sarah keeps your list up to date!`,
    targetId: null,
    placement: 'center',
  },
];

export const tasksTutorialSteps: TutorialStep[] = [
  {
    title: 'Family Task Management',
    description: 'Keep everyone on track with organized tasks and assignments.',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Create Tasks with Sarah',
    description: `Sarah makes task creation effortless!

**Try these commands:**
• "Create a task for Emma to clean her room"
• "Add homework task for Jack, due Friday"
• "Remind Emma to practice piano tomorrow at 4pm"
• "Task for Cody: take out trash tonight"
• "High priority task: call school tomorrow"

Sarah understands who, what, when, and priority!`,
    targetId: 'task-list',
    placement: 'bottom',
  },
  {
    title: 'Task Categories',
    description: 'Tasks are organized by category: chores, homework, sports, music, health, social, and more. Sarah assigns categories automatically!',
    targetId: 'task-categories',
    placement: 'top',
  },
  {
    title: 'Priority & Status',
    description: `Manage task priorities and track progress!

Tell Sarah:
• "Show me all high priority tasks"
• "What tasks does Emma have?"
• "Mark homework as completed"
• "Change dentist task to high priority"
• "Show me all pending tasks"

Sarah keeps everyone accountable!`,
    targetId: 'task-filters',
    placement: 'bottom',
  },
  {
    title: 'Due Dates & Reminders',
    description: `Never miss a deadline!

Ask Sarah:
• "When is Emma's homework due?"
• "Remind Jack to do homework at 5pm"
• "Move soccer practice task to Saturday"
• "What tasks are due today?"

Sarah sends reminders when tasks are due!`,
    targetId: 'due-dates',
    placement: 'top',
  },
];

export const remindersTutorialSteps: TutorialStep[] = [
  {
    title: 'Smart Reminders',
    description: 'Never forget important moments with intelligent reminders.',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Set Reminders with Sarah',
    description: `Sarah makes reminders simple!

**Personal reminders:**
• "Remind me to call mom tomorrow at 3pm"
• "Set a reminder to refill prescriptions on Friday"
• "Remind me to pay bills on the 1st"

**Family reminders:**
• "Remind Emma to do homework at 5pm"
• "Tell Jack to take out the trash tonight"
• "Remind Cody about soccer practice Saturday at 9am"

Sarah understands dates, times, and who needs the reminder!`,
    targetId: 'reminders-list',
    placement: 'bottom',
  },
  {
    title: 'Recurring Reminders',
    description: 'Set up reminders that repeat daily, weekly, or monthly. Great for regular activities like medications, chores, or appointments!',
    targetId: 'recurring-options',
    placement: 'top',
  },
  {
    title: 'Share Reminders',
    description: `Share reminders with family members!

Tell Sarah:
• "Share the dentist reminder with Emma"
• "Send the homework reminder to Jack"
• "Share this reminder with the whole family"

Everyone stays in the loop!`,
    targetId: 'share-button',
    placement: 'left',
  },
  {
    title: 'Reminder Priorities',
    description: `Organize by priority!

Ask Sarah:
• "Show me high priority reminders"
• "What reminders do I have today?"
• "Mark dentist reminder as completed"
• "Change piano practice to high priority"`,
    targetId: 'priority-filters',
    placement: 'bottom',
  },
];

// Sarah Quick Reference Guide
export const sarahQuickReference = {
  calendar: [
    'Schedule dentist appointment tomorrow at 2pm',
    'What\'s my schedule today?',
    'Am I free Friday afternoon?',
    'Move my dentist appointment to next week',
    'Cancel my meeting tomorrow',
    'Share the piano lesson with Emma',
    'What\'s on my calendar this week?',
  ],
  tasks: [
    'Create a task for Emma to clean her room',
    'Show me all pending tasks',
    'Remind Jack to do his homework at 5pm',
    'Mark homework task as completed',
    'What tasks does Emma have?',
    'High priority task: call school',
    'Task for Cody due Friday',
  ],
  shopping: [
    'Add milk and bread to my shopping list',
    'Send items to Instacart',
    'What\'s on my shopping list?',
    'Mark milk as purchased',
    'Add 2 loaves of bread, urgent',
    'Remind Emma to pick up milk',
    'Remove bread from my list',
  ],
  family: [
    'Add my daughter Emma, age 8',
    'Who\'s in my family?',
    'Update Emma\'s age to 9',
    'Set Emma\'s school to Lincoln Elementary',
    'Show me family members',
  ],
  reminders: [
    'Remind me to call mom tomorrow at 3pm',
    'Remind Jack to take out the trash at 6pm',
    'Set a reminder for Emma\'s soccer practice',
    'Share the dentist reminder with Emma',
    'What reminders do I have today?',
  ],
  weather: [
    'What\'s the weather today?',
    'Will it rain tomorrow?',
    'What\'s the forecast for this week?',
    'What\'s the weather for my dentist appointment?',
    'How\'s the weather in New York?',
  ],
};

export default dashboardTutorialSteps;