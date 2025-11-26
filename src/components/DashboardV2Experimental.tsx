//Alvaro-dashboardv2: Experimental Dashboard V2 Layout
import React from 'react';
//Alvaro-dashboardv2: Added X icon for close button in affirmation overlay
import { Calendar, ShoppingBag, MessageCircle, Clock, Heart, Users, LogOut, Sparkles, X } from 'lucide-react';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { DailyAffirmations } from './DailyAffirmations';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { supabase, Profile, Event, ShoppingItem, Reminder, Affirmation } from '../lib/supabase';
import { affirmationService } from '../services/affirmationService';

import { SubScreen } from '../App';

interface DashboardProps {
  onNavigate: (screen: 'calendar' | 'family' | 'more') => void;
  onNavigateToSubScreen: (screen: SubScreen) => void;
  onVoiceChatOpen?: () => void;
}

export function DashboardV2Experimental({ onNavigate, onNavigateToSubScreen, onVoiceChatOpen }: DashboardProps) {
  const { signOut } = useAuth();
  const { user } = useAuth();
  const [isWhatsAppOpen, setIsWhatsAppOpen] = React.useState(false);
  const [showAffirmations, setShowAffirmations] = React.useState(false);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [showEventsPopup, setShowEventsPopup] = React.useState(false);
  const [showTasksPopup, setShowTasksPopup] = React.useState(false);
  const [showRemindersPopup, setShowRemindersPopup] = React.useState(false);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [todayEvents, setTodayEvents] = React.useState<Event[]>([]);
  const [tasks, setTasks] = React.useState<ShoppingItem[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [todayAffirmation, setTodayAffirmation] = React.useState<Affirmation | null>(null);
  //Alvaro-dashboardv2: State to control full-screen affirmation overlay on page load
  const [showAffirmationOverlay, setShowAffirmationOverlay] = React.useState(true);

  // Load user profile
  React.useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (mounted && !error && profileData) {
          setProfile(profileData);
        }
      } catch (error: any) {
        if (mounted) {
          console.error('Error loading profile:', error);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false
    }
  }, [user]);

  // Helper function to format time for display
  const formatEventTime = (timeString: string | null | undefined): string => {
    if (!timeString) return 'All day';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  // Load events, tasks, and reminders
  const loadDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Load upcoming events for next 7 days (for event count)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', today)
        .lte('event_date', nextWeek)
        .order('event_date', { ascending: true });

      if (!eventsError) {
        setEvents(eventsData || []);

        // Filter and sort today's events
        const todayEventsFiltered = (eventsData || [])
          .filter(event => event.event_date === today)
          .sort((a, b) => {
            // Sort by start_time, putting all-day events (no start_time) first
            if (!a.start_time && !b.start_time) return 0;
            if (!a.start_time) return -1;
            if (!b.start_time) return 1;
            return a.start_time.localeCompare(b.start_time);
          });

        setTodayEvents(todayEventsFiltered);
      }

      // Load incomplete shopping items (tasks)
      const { data: tasksData, error: tasksError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (!tasksError) {
        setTasks(tasksData || []);
      }

      // Load upcoming reminders (next 7 days)
      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gte('reminder_date', today)
        .lte('reminder_date', nextWeek)
        .order('reminder_date', { ascending: true })
        .order('reminder_time', { ascending: true });

      if (!remindersError) {
        setReminders(remindersData || []);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      loadDashboardData();
      loadTodayAffirmation();
    }
  }, [user]);

  //Alvaro-dashboardv2: Keyboard escape handler for affirmation overlay accessibility
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAffirmationOverlay) {
        setShowAffirmationOverlay(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAffirmationOverlay]);

  const loadTodayAffirmation = async () => {
    try {
      let affirmation = await affirmationService.getTodaysAffirmation();

      if (!affirmation) {
        console.log('No affirmation for today, generating automatically...');
        affirmation = await affirmationService.generateAffirmation(false);
      }

      setTodayAffirmation(affirmation);
    } catch (error) {
      console.error('Error loading today\'s affirmation:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const quickActions = [
    {
      icon: Calendar,
      title: 'View Calendar',
      desc: 'See all your events',
      bgColor: 'bg-rose-50 dark:bg-gray-800',
      borderColor: 'border-rose-200 dark:border-gray-700',
      iconBgColor: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-gray-700',
      action: () => onNavigate('calendar')
    },
    {
      icon: ShoppingBag,
      title: 'Shopping List',
      desc: `${tasks.length} item${tasks.length === 1 ? '' : 's'} needed`,
      bgColor: 'bg-amber-50 dark:bg-gray-800',
      borderColor: 'border-amber-200 dark:border-gray-700',
      iconBgColor: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-amber-100 dark:hover:bg-gray-700',
      action: () => onNavigateToSubScreen('shopping')
    },
    {
      icon: Users,
      title: 'Family Hub',
      desc: 'Organize by family member',
      bgColor: 'bg-blue-50 dark:bg-gray-800',
      borderColor: 'border-blue-200 dark:border-gray-700',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-gray-700',
      action: () => onNavigate('family')
    },
    {
      icon: MessageCircle,
      title: 'AI Assistant',
      desc: 'Get help with anything',
      bgColor: 'bg-pink-50 dark:bg-gray-800',
      borderColor: 'border-pink-200 dark:border-gray-700',
      iconBgColor: 'bg-pink-100 dark:bg-pink-900',
      iconColor: 'text-pink-600 dark:text-pink-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-pink-100',
      action: () => onVoiceChatOpen?.()
    }
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  //Alvaro-dashboardv2: Get this week's events (excluding today)
  const thisWeekEvents = events.filter(event => event.event_date !== new Date().toISOString().split('T')[0]);

  return (
    <>
      {/* Alvaro-dashboardv2: Full-screen affirmation overlay shown on page load */}
      {showAffirmationOverlay && todayAffirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affirmation-overlay-title"
        >
          {/* Background overlay - click to close */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAffirmationOverlay(false)}
          />

          {/* Affirmation Card */}
          <div className="relative bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 dark:border dark:border-rose-500 p-8 sm:p-12 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-16 -mb-16"></div>

            {/* Close button */}
            <button
              onClick={() => setShowAffirmationOverlay(false)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-rose-400"
              aria-label="Close affirmation"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-6">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                <span
                  id="affirmation-overlay-title"
                  className="text-white font-semibold text-base sm:text-lg"
                >
                  Today's Affirmation
                </span>
              </div>

              <p className="text-white text-xl sm:text-2xl md:text-3xl leading-relaxed font-light text-center my-8">
                {todayAffirmation.affirmation_text}
              </p>

              <div className="text-center mt-6">
                <p className="text-white/80 text-sm sm:text-base">
                  Take a moment to embrace this message
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Greeting Header - Reused from original Dashboard */}
        <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white p-4 pb-6 dark:border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Good Morning Awesome, {profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}!</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSignOut}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="bg-white bg-opacity-10 dark:bg-gray-900 dark:bg-opacity-50 rounded-xl p-3">
          <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
            <button
              onClick={() => setShowEventsPopup(true)}
              className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{events.length} events</span>
            </button>
            <button
              onClick={() => setShowTasksPopup(true)}
              className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
            >
              <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{tasks.length} shopping list</span>
            </button>
            <button
              onClick={() => setShowRemindersPopup(true)}
              className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{reminders.length} reminders</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
        {/* Schedule Row - Today and This Week side by side */}
        {/* //Alvaro-dashboardv2: New two-column schedule layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Today's Schedule - Reused from original Dashboard */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Today's Schedule</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-rose-500"></div>
              </div>
            ) : todayEvents.length > 0 ? (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div key={event.id} className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('calendar')}>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{event.title}</h3>
                          <span className="text-xs sm:text-sm text-rose-600 font-medium">{formatEventTime(event.start_time)}</span>
                        </div>
                        {event.location && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-3">No events scheduled for today</p>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  Add Event
                </button>
              </div>
            )}
          </div>

          {/* This Week's Schedule - New, duplicated from Today's Schedule */}
          {/* //Alvaro-dashboardv2: New this week's schedule column */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">This Week's Schedule</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-rose-500"></div>
              </div>
            ) : thisWeekEvents.length > 0 ? (
              <div className="space-y-3">
                {thisWeekEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('calendar')}>
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">{event.title}</h3>
                          <span className="text-xs sm:text-sm text-rose-600 font-medium">
                            {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {event.start_time && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{formatEventTime(event.start_time)}</p>
                        )}
                        {event.location && (
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {thisWeekEvents.length > 3 && (
                  <button
                    onClick={() => onNavigate('calendar')}
                    className="w-full text-center text-sm text-rose-600 dark:text-rose-400 hover:underline py-2"
                  >
                    View {thisWeekEvents.length - 3} more event{thisWeekEvents.length - 3 === 1 ? '' : 's'}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 mb-3">No events scheduled for this week</p>
                <button
                  onClick={() => onNavigate('calendar')}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  Add Event
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions - Reused from original Dashboard */}
        {/* //Alvaro-dashboardv2: Moved Quick Actions after schedule row */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  if (action.action) {
                    action.action();
                  }
                }}
                className={`p-3 sm:p-4 rounded-xl ${action.bgColor} border ${action.borderColor} shadow-sm text-left
                  transition-all duration-200 ease-in-out
                  ${action.hoverBg} hover:shadow-md hover:border-opacity-80
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
                aria-label={`${action.title}: ${action.desc}`}
              >
                <div className={`${action.iconBgColor} p-2 sm:p-3 rounded-xl mb-2 sm:mb-3 inline-block`}>
                  <action.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${action.iconColor}`} />
                </div>
                <h3 className={`font-semibold ${action.textColor} mb-1 text-sm sm:text-base`}>{action.title}</h3>
                <p className={`text-xs sm:text-sm ${action.descColor}`}>{action.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* //Alvaro-dashboardv2: Smart Reminders section removed from experimental layout */}

        {/* AI Voice Assistant - Reused from original Dashboard */}
        {/* //Alvaro-dashboardv2: Moved AI Assistant to bottom of main content */}
        <div
          className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 sm:p-6 rounded-xl border border-rose-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all"
          onClick={() => onVoiceChatOpen?.()}
        >
          <div className="flex items-center space-x-3 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">Sarah - Your Voice Assistant</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Talk to me anytime!</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-lg shadow-sm">
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">"Hey Sarah, what can you help me with today?"</p>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVoiceChatOpen?.();
                }}
                className="px-2 py-1 sm:px-3 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-xs sm:text-sm hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
              >
                Add reminder for tomorrow
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVoiceChatOpen?.();
                }}
                className="px-2 py-1 sm:px-3 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-xs sm:text-sm hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
              >
                Schedule dentist appointment
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVoiceChatOpen?.();
                }}
                className="px-2 py-1 sm:px-3 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-xs sm:text-sm hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
              >
                Add milk to shopping list
              </button>
            </div>
          </div>
        </div>

        {/* Affirmation Card - Reused from original Dashboard */}
        {/* //Alvaro-dashboardv2: Moved affirmation to bottom, shown only after overlay is closed */}
        {!showAffirmationOverlay && todayAffirmation && (
          <div
            onClick={() => setShowAffirmations(true)}
            className="bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 dark:border dark:border-rose-500 p-6 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12"></div>

            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-white" />
                <span className="text-white font-semibold text-sm">Today's Affirmation</span>
              </div>

              <p className="text-white text-lg leading-relaxed mb-4">
                {todayAffirmation.affirmation_text}
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAffirmations(true);
                }}
                className="text-white text-sm font-medium hover:underline flex items-center space-x-1"
              >
                <span>View all affirmations</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {!showAffirmationOverlay && !todayAffirmation && (
          <div className="bg-gradient-to-br from-rose-100 to-pink-100 dark:from-gray-800 dark:to-gray-700 border-2 border-rose-300 dark:border-rose-700 p-6 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-rose-200 dark:bg-rose-900 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Generating Your Daily Affirmation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Creating personalized encouragement based on your schedule...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <WhatsAppIntegration
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        onEventCreated={(event) => {
          loadDashboardData();
        }}
      />

      {/* Events Popup */}
      {showEventsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming Events</h2>
                <button
                  onClick={() => setShowEventsPopup(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">{event.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {new Date(event.event_date).toLocaleDateString()}
                        {event.start_time && ` at ${event.start_time}`}
                      </p>
                      {event.location && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{event.location}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No upcoming events</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tasks Popup */}
      {showTasksPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Shopping List</h2>
                <button
                  onClick={() => setShowTasksPopup(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-500"></div>
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">{task.item}</h3>
                        {task.urgent && (
                          <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 text-red-700 rounded-full text-xs">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <p className="capitalize">{task.category}</p>
                      </div>
                      {task.quantity && task.quantity > 1 && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Quantity: {task.quantity}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No pending items</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reminders Popup */}
      {showRemindersPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming Reminders</h2>
                <button
                  onClick={() => setShowRemindersPopup(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : reminders.length > 0 ? (
                <div className="space-y-3">
                  {reminders.map((reminder) => (
                    <div key={reminder.id} className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">{reminder.title}</h3>
                        {reminder.priority === 'high' && (
                          <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 text-red-700 rounded-full text-xs">
                            High Priority
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {new Date(reminder.reminder_date).toLocaleDateString()}
                        {reminder.reminder_time && ` at ${reminder.reminder_time}`}
                      </p>
                      {reminder.description && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{reminder.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No upcoming reminders</p>
              )}
            </div>
          </div>
        </div>
      )}

      <DailyAffirmations
        isOpen={showAffirmations}
        onClose={() => {
          setShowAffirmations(false);
          loadTodayAffirmation();
        }}
      />
      </div>
    </>
  );
}
