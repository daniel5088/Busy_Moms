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
    description: 'Click the Sarah button at the bottom to chat with your AI assistant. Ask questions, create events, or get help anytime!',
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
];

export const sarahTutorialSteps: TutorialStep[] = [
  {
    title: 'Meet Sarah - Your AI Assistant',
    description: 'Hi! I\'m Sarah, your personal AI assistant. I can help you manage your family life with simple voice or text commands. Let me show you what I can do!',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Calendar Management',
    description: 'Try saying:\n\n• "Schedule dentist appointment tomorrow at 2pm"\n• "What\'s my schedule today?"\n• "Am I free Friday afternoon?"\n• "Move my dentist appointment to next week"\n• "Share the piano lesson with Emma"',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Task Management',
    description: 'Try saying:\n\n• "Create a task for Emma to clean her room"\n• "Show me all pending tasks"\n• "Remind Jack to do his homework at 5pm"\n• "What tasks does Emma have?"\n• "High priority task: call school"',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Shopping Lists',
    description: 'Try saying:\n\n• "Add milk and bread to my shopping list"\n• "Send items to Instacart"\n• "What\'s on my shopping list?"\n• "Mark milk as purchased"\n• "Remind Emma to pick up milk"',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Reminders',
    description: 'Try saying:\n\n• "Remind me to call mom tomorrow at 3pm"\n• "Remind Jack to take out the trash at 6pm"\n• "Set a reminder for Emma\'s soccer practice"\n• "What reminders do I have today?"',
    targetId: null,
    placement: 'center',
  },
  {
    title: 'Weather & More',
    description: 'Try saying:\n\n• "What\'s the weather today?"\n• "Will it rain tomorrow?"\n• "What\'s the forecast for this week?"\n• "What\'s the weather for my dentist appointment?"\n\nI\'m here to help make your life easier!',
    targetId: null,
    placement: 'center',
  },
];