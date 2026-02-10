export interface TutorialStep {
  title: string;
  description: string;
  placement: 'top' | 'center' | 'bottom';
}

export const dashboardTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to BusyMoms!',
    description:
      "Let's take a quick tour of your dashboard. This is your command center for managing family life.",
    placement: 'center',
  },
  {
    title: 'Weather at a Glance',
    description:
      "Check today's weather and plan your day accordingly. The weather widget shows current conditions.",
    placement: 'top',
  },
  {
    title: 'Daily Affirmations',
    description: 'Start your day with positive affirmations. Get personalized messages to stay motivated.',
    placement: 'top',
  },
  {
    title: "Today's Schedule",
    description:
      'View your upcoming events and tasks. Stay organized and never miss an important moment.',
    placement: 'center',
  },
  {
    title: 'Quick Actions',
    description:
      'Access frequently used features quickly. Add events, create shopping lists, and more with just one tap.',
    placement: 'bottom',
  },
  {
    title: "You're All Set!",
    description:
      "Great job! Explore the tabs below to access Calendar, Shopping, Family Hub, and More features.",
    placement: 'bottom',
  },
];

export const calendarTutorialSteps: TutorialStep[] = [
  {
    title: 'Your Family Calendar',
    description:
      'Keep track of all family events, appointments, and activities in one place.',
    placement: 'center',
  },
  {
    title: 'View Your Events',
    description:
      'Browse through months and view all your scheduled events. Each event shows time, location, and details.',
    placement: 'top',
  },
  {
    title: 'Add New Events',
    description:
      'Tap the + button to create new events. Set reminders, assign to family members, and add locations.',
    placement: 'top',
  },
  {
    title: 'Sync with Google Calendar',
    description:
      'Connect your Google Calendar to sync events automatically. Never miss an appointment!',
    placement: 'bottom',
  },
];

export const familyHubTutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Family Hub',
    description:
      'This is your central place to manage family members, contacts, and important information.',
    placement: 'center',
  },
  {
    title: 'Family Members',
    description:
      'Add and manage family members. Track birthdays, allergies, and other important details.',
    placement: 'top',
  },
  {
    title: 'Contacts',
    description:
      'Keep all your important contacts in one place. Sync with Google Contacts for easy access.',
    placement: 'center',
  },
  {
    title: 'Task Assignment',
    description: 'Assign tasks and events to specific family members to keep everyone organized.',
    placement: 'bottom',
  },
];

export const shoppingTutorialSteps: TutorialStep[] = [
  {
    title: 'Shopping Lists',
    description: 'Create and manage your shopping lists. Add items, organize by category, and more.',
    placement: 'center',
  },
  {
    title: 'Recipe Browser',
    description: 'Browse recipes and automatically add ingredients to your shopping list.',
    placement: 'center',
  },
  {
    title: 'Instacart Integration',
    description:
      'Send your shopping list to Instacart for convenient grocery delivery.',
    placement: 'bottom',
  },
];

export const tasksTutorialSteps: TutorialStep[] = [
  {
    title: 'Task Management',
    description: 'Create and track tasks for yourself and family members. Stay on top of everything.',
    placement: 'center',
  },
  {
    title: 'Priority & Due Dates',
    description: 'Set priorities and due dates to focus on what matters most.',
    placement: 'top',
  },
  {
    title: 'Google Tasks Sync',
    description: 'Connect with Google Tasks to sync across all your devices.',
    placement: 'bottom',
  },
];
