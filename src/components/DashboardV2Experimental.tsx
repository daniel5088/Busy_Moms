//Alvaro-dashboardv2: Experimental Dashboard V2 Layout
import React from 'react';
//Alvaro-dashboardv2: Added X icon for close button in affirmation overlay
import {
  Calendar,
  ShoppingBag,
  MessageCircle,
  Clock,
  Heart,
  Users,
  LogOut,
  Sparkles,
  X,
} from 'lucide-react';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { DailyAffirmations } from './DailyAffirmations';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDashboardData } from '../hooks/useDashboardData';
import { Affirmation } from '../lib/supabase';
import { affirmationService } from '../services/affirmationService';
import { formatEventTime, formatDate } from '../utils/timeFormatters';
import {
  DashboardPopup,
  EventsList,
  TasksList,
  RemindersList,
} from './shared/DashboardPopup';

import { SubScreen } from '../App';

type AffirmationStage = 'hidden' | 'burst' | 'logo' | 'content' | 'closing';

interface DashboardProps {
  onNavigate: (screen: 'calendar' | 'family' | 'more') => void;
  onNavigateToSubScreen: (screen: SubScreen) => void;
  onVoiceChatOpen?: () => void;
}

export function DashboardV2Experimental({
  onNavigate,
  onNavigateToSubScreen,
  onVoiceChatOpen,
}: DashboardProps) {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const { events, todayEvents, thisWeekEvents, tasks, reminders, loading, reload } =
    useDashboardData();

  const [isWhatsAppOpen, setIsWhatsAppOpen] = React.useState(false);
  const [showAffirmations, setShowAffirmations] = React.useState(false);
  const [showEventsPopup, setShowEventsPopup] = React.useState(false);
  const [showTasksPopup, setShowTasksPopup] = React.useState(false);
  const [showRemindersPopup, setShowRemindersPopup] = React.useState(false);
  const [todayAffirmation, setTodayAffirmation] = React.useState<Affirmation | null>(null);
  const [affirmationStage, setAffirmationStage] = React.useState<AffirmationStage>('hidden');
  const [isAffirmationButtonGlowing, setIsAffirmationButtonGlowing] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      loadTodayAffirmation();
    }
  }, [user]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && affirmationStage === 'content') {
        handleCloseAffirmation();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [affirmationStage]);

  React.useEffect(() => {
    if (affirmationStage === 'closing') {
      const timer = setTimeout(() => {
        setAffirmationStage('hidden');
        setIsAffirmationButtonGlowing(true);

        setTimeout(() => {
          setIsAffirmationButtonGlowing(false);
        }, 600);
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [affirmationStage]);

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

  const handleOpenAffirmation = () => {
    if (affirmationStage !== 'hidden') return;

    setAffirmationStage('burst');

    setTimeout(() => {
      setAffirmationStage('logo');
    }, 450);

    setTimeout(() => {
      setAffirmationStage('content');
    }, 900);
  };

  const handleCloseAffirmation = () => {
    if (affirmationStage === 'content') {
      setAffirmationStage('closing');
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {affirmationStage === 'burst' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center animate-ping opacity-75">
                <Sparkles className="w-16 h-16 text-rose-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {affirmationStage === 'logo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin">
            <Sparkles className="w-24 h-24 sm:w-32 sm:h-32 text-white" />
          </div>
        </div>
      )}

      {(affirmationStage === 'content' || affirmationStage === 'closing') && todayAffirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affirmation-overlay-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleCloseAffirmation}
          />

          <div
            className={`relative bg-gradient-to-br from-rose-400 via-pink-400 to-orange-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 dark:border dark:border-rose-500 p-8 sm:p-12 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden transition-all duration-200 ease-out ${
              affirmationStage === 'closing' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-16 -mb-16"></div>

            <button
              onClick={handleCloseAffirmation}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-rose-400"
              aria-label="Close affirmation"
            >
              <X className="w-5 h-5 text-white" />
            </button>

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
                onClick={handleOpenAffirmation}
                className={`w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-30 transition-all active:scale-95 ${
                  isAffirmationButtonGlowing
                    ? 'ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                    : ''
                }`}
                title="Open daily affirmation"
                aria-label="Open daily affirmation"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-30 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
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

            {/* This Week's Schedule - New, duplicated from Today's Schedule */}
            {/* //Alvaro-dashboardv2: New this week's schedule column */}
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
                This Week's Schedule
              </h2>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-rose-500"></div>
                </div>
              ) : thisWeekEvents.length > 0 ? (
                <div className="space-y-3">
                  {thisWeekEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onNavigate('calendar')}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-300" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                              {event.title}
                            </h3>
                            <span className="text-xs sm:text-sm text-rose-600 font-medium">
                              {formatDate(event.event_date)}
                            </span>
                          </div>
                          {event.start_time && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {formatEventTime(event.start_time)}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {event.location}
                            </p>
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
                      View {thisWeekEvents.length - 3} more event
                      {thisWeekEvents.length - 3 === 1 ? '' : 's'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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

          {/* Quick Actions - Reused from original Dashboard */}
          {/* //Alvaro-dashboardv2: Moved Quick Actions after schedule row */}
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

          {affirmationStage === 'hidden' && todayAffirmation && (
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

          {affirmationStage === 'hidden' && !todayAffirmation && (
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
          <RemindersList reminders={reminders} onDelete={reload} />
        </DashboardPopup>

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
