import React from 'react';
import {
  Calendar,
  ShoppingBag,
  MessageCircle,
  Clock,
  Heart,
  Users,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { DailyAffirmations } from './DailyAffirmations';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDashboardData } from '../hooks/useDashboardData';
import { Affirmation } from '../lib/supabase';
import { affirmationService } from '../services/affirmationService';
import { formatEventTime } from '../utils/timeFormatters';
import {
  DashboardPopup,
  EventsList,
  TasksList,
  RemindersList,
} from './shared/DashboardPopup';

import { SubScreen } from '../App';

interface DashboardProps {
  onNavigate: (screen: 'calendar' | 'family' | 'more') => void;
  onNavigateToSubScreen: (screen: SubScreen) => void;
  onVoiceChatOpen?: () => void;
}

export function Dashboard({ onNavigate, onNavigateToSubScreen, onVoiceChatOpen }: DashboardProps) {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { events, todayEvents, tasks, reminders, loading, reload } = useDashboardData();

  const [isWhatsAppOpen, setIsWhatsAppOpen] = React.useState(false);
  const [showAffirmations, setShowAffirmations] = React.useState(false);
  const [showEventsPopup, setShowEventsPopup] = React.useState(false);
  const [showTasksPopup, setShowTasksPopup] = React.useState(false);
  const [showRemindersPopup, setShowRemindersPopup] = React.useState(false);
  const [todayAffirmation, setTodayAffirmation] = React.useState<Affirmation | null>(null);

  React.useEffect(() => {
    if (user) {
      loadTodayAffirmation();
    }
  }, [user]);

  const loadTodayAffirmation = async () => {
    try {
      let affirmation = await affirmationService.getTodaysAffirmation();

      if (!affirmation) {
        console.log('No affirmation for today, generating automatically...');
        affirmation = await affirmationService.generateAffirmation(false);
      }

      setTodayAffirmation(affirmation);
    } catch (error) {
      console.error("Error loading today's affirmation:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Alvaros onlykeyboard - Softer quick action colors for better background integration
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
      action: () => onNavigate('calendar'),
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
      action: () => onNavigateToSubScreen('shopping'),
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
      action: () => onNavigate('family'),
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
      action: () => onVoiceChatOpen?.(),
    },
  ];

  // Alvaros Skeletons
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="pb-20 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white p-4 pb-6 dark:border-b dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Good Morning Awesome,{' '}
              {profile?.full_name ||
                user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                user?.email?.split('@')[0] ||
                'User'}
              !
            </h1>
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
        {/* Daily Affirmation */}
        {todayAffirmation && (
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

        {!todayAffirmation && (
          <div className="bg-gradient-to-br from-rose-100 to-pink-100 dark:from-gray-800 dark:to-gray-700 border-2 border-rose-300 dark:border-rose-700 p-6 rounded-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-rose-200 dark:bg-rose-900 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-300" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Generating Your Daily Affirmation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Creating personalized encouragement based on your schedule...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {/* Alvaros onlykeyboard - Redesigned with soft backgrounds, subtle borders, and refined interactions */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
            Quick Actions
          </h2>
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
                <div
                  className={`${action.iconBgColor} p-2 sm:p-3 rounded-xl mb-2 sm:mb-3 inline-block`}
                >
                  <action.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${action.iconColor}`} />
                </div>
                <h3 className={`font-semibold ${action.textColor} mb-1 text-sm sm:text-base`}>
                  {action.title}
                </h3>
                <p className={`text-xs sm:text-sm ${action.descColor}`}>{action.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
            Today's Schedule
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-rose-500"></div>
            </div>
          ) : todayEvents.length > 0 ? (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onNavigate('calendar')}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-300" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                          {event.title}
                        </h3>
                        <span className="text-xs sm:text-sm text-rose-600 font-medium">
                          {formatEventTime(event.start_time)}
                        </span>
                      </div>
                      {event.location && (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {event.location}
                        </p>
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

        {/* Smart Reminders */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
            Smart Reminders
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : reminders.length > 0 ? (
            <div className="space-y-2">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${reminder.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'}`}
                  ></div>
                  <div className="flex-1">
                    <span className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium">
                      {reminder.title}
                    </span>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {new Date(reminder.reminder_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {reminder.reminder_time && ` at ${formatEventTime(reminder.reminder_time)}`}
                    </div>
                    {reminder.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {reminder.description}
                      </p>
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
              <p className="text-gray-500 dark:text-gray-400 mb-3">No upcoming reminders</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Ask Sarah to set reminders for you!
              </p>
            </div>
          )}
        </div>

        {/* AI Voice Assistant */}
        <div
          className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 p-4 sm:p-6 rounded-xl border border-rose-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all"
          onClick={() => onVoiceChatOpen?.()}
        >
          <div className="flex items-center space-x-3 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                Sarah - Your Voice Assistant
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Talk to me anytime!
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 rounded-lg shadow-sm">
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
              "Hey Sarah, what can you help me with today?"
            </p>
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
      </div>

      <WhatsAppIntegration
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        onEventCreated={() => reload()}
      />

      {/* Events Popup */}
      <DashboardPopup
        isOpen={showEventsPopup}
        onClose={() => setShowEventsPopup(false)}
        title="Upcoming Events"
        loading={loading}
        loadingColor="border-purple-500"
      >
        <EventsList events={events} />
      </DashboardPopup>

      {/* Tasks Popup */}
      <DashboardPopup
        isOpen={showTasksPopup}
        onClose={() => setShowTasksPopup(false)}
        title="Shopping List"
        loading={loading}
        loadingColor="border-green-500"
      >
        <TasksList tasks={tasks} />
      </DashboardPopup>

      {/* Reminders Popup */}
      <DashboardPopup
        isOpen={showRemindersPopup}
        onClose={() => setShowRemindersPopup(false)}
        title="Upcoming Reminders"
        loading={loading}
        loadingColor="border-blue-500"
      >
        <RemindersList reminders={reminders} />
      </DashboardPopup>

      <DailyAffirmations
        isOpen={showAffirmations}
        onClose={() => {
          setShowAffirmations(false);
          loadTodayAffirmation();
        }}
      />
    </div>
  );
}
