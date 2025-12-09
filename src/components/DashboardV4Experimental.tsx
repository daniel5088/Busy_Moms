//Alvaros - V4: Dashboard V4 Experimental - Full-screen affirmation overlay with side-by-side schedules and 6-action grid
import React from 'react';
import { Calendar, ShoppingBag, MessageCircle, Clock, Heart, Users, LogOut, Sparkles, X, BookOpen, Shield, ListTodo, Link } from 'lucide-react';
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

export function DashboardV4Experimental({ onNavigate, onNavigateToSubScreen, onVoiceChatOpen }: DashboardProps) {
  const { signOut } = useAuth();
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [todayEvents, setTodayEvents] = React.useState<Event[]>([]);
  const [thisWeekEvents, setThisWeekEvents] = React.useState<Event[]>([]);
  const [tasks, setTasks] = React.useState<ShoppingItem[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [todayAffirmation, setTodayAffirmation] = React.useState<Affirmation | null>(null);
  const [showAffirmation, setShowAffirmation] = React.useState(true);

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

  // Helper function to format time range for display
  const formatEventTimeRange = (startTime: string | null | undefined, endTime: string | null | undefined): string => {
    if (!startTime) return 'All day';
    if (startTime && endTime) {
      return `${formatEventTime(startTime)} – ${formatEventTime(endTime)}`;
    }
    return formatEventTime(startTime);
  };

  // Load events, tasks, and reminders
  const loadDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Load upcoming events for next 7 days
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
            if (!a.start_time && !b.start_time) return 0;
            if (!a.start_time) return 1;
            if (!b.start_time) return -1;
            return a.start_time.localeCompare(b.start_time);
          });

        setTodayEvents(todayEventsFiltered);

        // Filter this week's events (excluding today)
        const thisWeekEventsFiltered = (eventsData || [])
          .filter(event => event.event_date !== today);

        setThisWeekEvents(thisWeekEventsFiltered);
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

  // Keyboard escape handler for affirmation overlay
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAffirmation) {
        setShowAffirmation(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAffirmation]);

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

  // Quick Actions - 3x2 grid with specific actions
  const quickActions = [
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
      icon: ListTodo,
      title: 'Tasks',
      desc: 'Manage your to-do list',
      bgColor: 'bg-green-50 dark:bg-gray-800',
      borderColor: 'border-green-200 dark:border-gray-700',
      iconBgColor: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-gray-700',
      action: () => onNavigateToSubScreen('tasks')
    },
    {
      icon: Link,
      title: 'Quick Links',
      desc: 'Your favorite shortcuts',
      bgColor: 'bg-purple-50 dark:bg-gray-800',
      borderColor: 'border-purple-200 dark:border-gray-700',
      iconBgColor: 'bg-purple-100 dark:bg-purple-900',
      iconColor: 'text-purple-600 dark:text-purple-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-gray-700',
      action: () => onNavigateToSubScreen('quick-links')
    },
    {
      icon: Shield,
      title: 'Background Screening',
      desc: 'Coming soon',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      iconBgColor: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-400 dark:text-gray-500',
      textColor: 'text-gray-500 dark:text-gray-400',
      descColor: 'text-gray-400 dark:text-gray-500',
      hoverBg: 'hover:bg-gray-100 dark:hover:bg-gray-750',
      action: () => {}
    },
    {
      icon: BookOpen,
      title: 'My Recipes',
      desc: 'Browse and save recipes',
      bgColor: 'bg-rose-50 dark:bg-gray-800',
      borderColor: 'border-rose-200 dark:border-gray-700',
      iconBgColor: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-gray-700',
      action: () => onNavigateToSubScreen('shopping')
    }
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {/* Full-screen affirmation overlay */}
      {showAffirmation && todayAffirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affirmation-overlay-title"
        >
          {/* Affirmation Card */}
          <div className="relative w-full max-w-3xl overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-16 -mb-16"></div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center space-x-2 mb-6">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                <span
                  id="affirmation-overlay-title"
                  className="text-white font-semibold text-base sm:text-lg"
                >
                  Today's Affirmation
                </span>
              </div>

              <p className="text-white text-xl sm:text-2xl md:text-3xl leading-relaxed font-light my-8 px-4">
                {todayAffirmation.affirmation_text}
              </p>

              <div className="mt-8">
                <button
                  onClick={() => setShowAffirmation(false)}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-white text-sm font-medium transition-colors flex items-center space-x-2 mx-auto focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-rose-400"
                  aria-label="Close affirmation"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Greeting Header */}
        <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white p-4 pb-6 dark:border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Good Morning, {profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}!</h1>
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

          {/* Mini Stats */}
          <div className="bg-white bg-opacity-10 dark:bg-gray-900 dark:bg-opacity-50 rounded-xl p-3">
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
              <button
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{events.length} events</span>
              </button>
              <button
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
              >
                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{tasks.length} shopping list</span>
              </button>
              <button
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{reminders.length} reminders</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 sm:p-6 sm:space-y-6">
          {/* Side-by-side Schedule Cards */}
          <div className="flex gap-3 sm:gap-4">
            {/* Today's Schedule */}
            <div className="w-1/2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                Today&apos;s Schedule
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-80 flex flex-col">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4"> {/* //Alvaros - V4 */}
                  {todayEvents.length > 0 ? (
                    <div className="space-y-3">
                      {todayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer" //Alvaros - V4
                          onClick={() => onNavigate('calendar')}
                        >
                          <div className="flex items-center space-x-1.5"> {/* //Alvaros - V4 */}
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0"> {/* //Alvaros - V4 */}
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-300" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5"> {/* //Alvaros - V4 */}
                              <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                {formatEventTimeRange(event.start_time, event.end_time)}
                              </p>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm"> {/* //Alvaros - V4 */}
                                {event.title}
                              </h3>
                              {event.location && (
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400"> {/* //Alvaros - V4 */}
                                  {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-3">
                        No events scheduled for today
                      </p>
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
            </div>
          
            {/* This Week's Schedule */}
            <div className="w-1/2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                This Week&apos;s Schedule
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-80 flex flex-col">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4"> {/* //Alvaros - V4 */}
                  {thisWeekEvents.length > 0 ? (
                    <div className="space-y-3">
                      {thisWeekEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer" //Alvaros - V4
                          onClick={() => onNavigate('calendar')}
                        >
                          <div className="flex items-center space-x-1.5"> {/* //Alvaros - V4 */}
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0"> {/* //Alvaros - V4 */}
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-300" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5"> {/* //Alvaros - V4 */}
                              <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400">
                                {new Date(event.event_date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                                {event.start_time && ` at ${formatEventTimeRange(event.start_time, event.end_time)}`}
                              </p>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm"> {/* //Alvaros - V4 */}
                                {event.title}
                              </h3>
                              {event.location && (
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400"> {/* //Alvaros - V4 */}
                                  {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 mb-3">
                        No events scheduled for this week
                      </p>
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
            </div>
          </div>

          {/* Quick Actions - 3x2 Grid */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
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

          {/* Smart Reminders */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Smart Reminders</h2>
            {reminders.length > 0 ? (
              <div className="space-y-2">
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800 transition-colors cursor-pointer">
                    <div className={`w-2 h-2 rounded-full ${reminder.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'}`}></div>
                    <div className="flex-1">
                      <span className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium">{reminder.title}</span>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(reminder.reminder_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                        {reminder.reminder_time && ` at ${formatEventTime(reminder.reminder_time)}`}
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{reminder.description}</p>
                      )}
                    </div>
                    {reminder.priority === 'high' && (
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                        High Priority
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No reminders for today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
