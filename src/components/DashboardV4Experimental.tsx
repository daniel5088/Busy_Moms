//Alvaros - V4: Dashboard V4 Experimental - Full-screen affirmation overlay with side-by-side schedules and 6-action grid
import React from 'react';
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
  BookOpen,
  Shield,
  ListTodo,
  Link,
  Loader2,
  Settings,
  RefreshCw,
  Camera,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDashboardData } from '../hooks/useDashboardData';
import { Affirmation } from '../lib/supabase';
import { affirmationService } from '../services/affirmationService';
import { formatEventTime, formatEventTimeRange, formatDate } from '../utils/timeFormatters';
import {
  DashboardPopup,
  EventsList,
  TasksList,
  RemindersList,
} from './shared/DashboardPopup';
import {
  findDueSlot,
  markAsAutoShown,
  clearOldAutoShowData,
} from '../utils/affirmationScheduler';

import { SubScreen } from '../App';

const formatReminderDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const getWeekLabel = (offset: number): string => {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === 2) return 'This Week';
  if (offset > 2) {
    const weeksAhead = offset - 2;
    return weeksAhead === 1 ? 'Next Week' : `+${weeksAhead} Weeks`;
  }
  return 'Past';
};

type AffirmationStage = 'hidden' | 'burst' | 'logo' | 'content' | 'closing' | 'disabled';

interface DashboardProps {
  onNavigate: (screen: 'calendar' | 'family' | 'more') => void;
  onNavigateToSubScreen: (screen: SubScreen) => void;
  onVoiceChatOpen?: () => void;
  onOpenAffirmationSettings?: () => void;
  onNavigateToCalendarCamera?: () => void;
  onNavigateToRecipes?: () => void;
}

export function DashboardV4Experimental({
  onNavigate,
  onNavigateToSubScreen,
  onVoiceChatOpen,
  onOpenAffirmationSettings,
  onNavigateToCalendarCamera,
  onNavigateToRecipes,
}: DashboardProps) {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const {
    events,
    todayEvents,
    thisWeekEvents,
    tasks,
    reminders,
    loading,
    reminderWeekOffset,
    setReminderWeekOffset,
  } = useDashboardData();

  const [todayAffirmation, setTodayAffirmation] = React.useState<Affirmation | null>(null);
  const [affirmationStage, setAffirmationStage] = React.useState<AffirmationStage>('hidden');
  const [isAffirmationButtonGlowing, setIsAffirmationButtonGlowing] = React.useState(false);
  const [affirmationLoading, setAffirmationLoading] = React.useState(false);
  const [affirmationError, setAffirmationError] = React.useState<string | null>(null);
  const [affirmationsDisabled, setAffirmationsDisabled] = React.useState(false);
  const [showEventsPopup, setShowEventsPopup] = React.useState(false);
  const [showTasksPopup, setShowTasksPopup] = React.useState(false);
  const [showRemindersPopup, setShowRemindersPopup] = React.useState(false);
  const [isAutoOpened, setIsAutoOpened] = React.useState(false);
  const [autoOpenedSlotIndex, setAutoOpenedSlotIndex] = React.useState<number | null>(null);

  // Reminders are already filtered by the hook based on reminderWeekOffset
  const filteredReminders = React.useMemo(() => {
    return reminders;
  }, [reminders]);

  React.useEffect(() => {
    if (user) {
      loadTodayAffirmation();
    }
  }, [user]);

  // Keyboard escape handler for affirmation overlay
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (affirmationStage === 'content' || affirmationStage === 'disabled')) {
        if (affirmationStage === 'content') {
          handleCloseAffirmation();
        } else {
          setAffirmationStage('hidden');
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [affirmationStage]);

  const loadTodayAffirmation = async () => {
    setAffirmationLoading(true);
    setAffirmationError(null);
    setAffirmationsDisabled(false);

    try {
      const settings = await affirmationService.getSettings();

      if (!settings || !settings.enabled) {
        setAffirmationsDisabled(true);
        setTodayAffirmation(null);
        setAffirmationError(null);
        setAffirmationLoading(false);
        return;
      }

      let affirmation = await affirmationService.getTodaysAffirmation();

      if (!affirmation) {
        console.log('No affirmation for today, generating automatically...');
        affirmation = await affirmationService.generateAffirmation(false);
      }

      setTodayAffirmation(affirmation);
      setAffirmationError(null);

      clearOldAutoShowData();

      if (user?.id && affirmation) {
        const dueSlot = findDueSlot(settings, user.id);
        if (dueSlot) {
          setAutoOpenedSlotIndex(dueSlot.slotIndex);
          handleOpenAffirmation(true);
        }
      }
    } catch (error: any) {
      console.error("Error loading today's affirmation:", error);

      if (error?.message?.includes('disabled') || error?.message?.includes('403')) {
        setAffirmationsDisabled(true);
        setTodayAffirmation(null);
        setAffirmationError(null);
      } else {
        setAffirmationError(error?.message || 'Unable to load affirmation');
      }
    } finally {
      setAffirmationLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleOpenAffirmation = (isAutomatic: boolean = false) => {
    if (affirmationStage !== 'hidden') return;

    if (affirmationsDisabled) {
      setAffirmationStage('disabled');
      return;
    }

    setIsAutoOpened(isAutomatic);

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
      if (isAutoOpened && user?.id && autoOpenedSlotIndex !== null) {
        const todayStr = new Date().toISOString().split('T')[0];
        markAsAutoShown(user.id, todayStr, autoOpenedSlotIndex);
      }
      setIsAutoOpened(false);
      setAutoOpenedSlotIndex(null);
      setAffirmationStage('closing');
    }
  };

  // Handle closing animation timing
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

  // Quick Actions - 3x2 grid with specific actions
  const quickActions = [
    {
      icon: ShoppingBag,
      title: 'Shopping',
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
      icon: ListTodo,
      title: 'Tasks',
      desc: 'Manage your to-do list',
      bgColor: 'bg-green-50 dark:bg-gray-800',
      borderColor: 'border-green-200 dark:border-gray-700',
      iconBgColor: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-700 dark:text-green-400', 
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-gray-700',
      action: () => onNavigateToSubScreen('tasks'),
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
      action: () => onNavigateToSubScreen('quick-links'),
    },
    {
      icon: Camera,
      title: 'Scan Event',
      desc: 'Add from photo',
      bgColor: 'bg-teal-50 dark:bg-gray-800',
      borderColor: 'border-teal-200 dark:border-gray-700',
      iconBgColor: 'bg-teal-100 dark:bg-teal-900',
      iconColor: 'text-teal-700 dark:text-teal-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-teal-100 dark:hover:bg-gray-700',
      action: () => onNavigateToCalendarCamera?.(),
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
      action: () => onNavigateToRecipes?.(),
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {/* Burst Stage - Growing and fading icon */}
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

      {/* Logo Stage - Spinning icon */}
      {affirmationStage === 'logo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-spin">
            <Sparkles className="w-24 h-24 sm:w-32 sm:h-32 text-white" />
          </div>
        </div>
      )}

      {/* Content Stage - Affirmation modal */}
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
              <X className="w-5 h-5 text-white" aria-hidden="true" />
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

      {/* Disabled Stage - Feature disabled message */}
      {affirmationStage === 'disabled' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="affirmation-disabled-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setAffirmationStage('hidden')}
          />

          <div className="relative bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setAffirmationStage('hidden')}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
            </button>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
                <Sparkles className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>

              <h2
                id="affirmation-disabled-title"
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4"
              >
                Daily Affirmations Disabled
              </h2>

              <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg mb-8 leading-relaxed">
                This feature is currently turned off. Enable it in Settings to receive personalized
                daily affirmations that inspire and motivate you.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setAffirmationStage('hidden');
                    onOpenAffirmationSettings?.();
                  }}
                  className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Go to Settings
                </button>
                <button
                  onClick={() => setAffirmationStage('hidden')}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                >
                  Close
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
              <h1 className="text-xl sm:text-2xl font-bold">
                Hello,{' '}
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
                title={
                  affirmationsDisabled
                    ? 'Daily affirmations (Click to learn how to enable)'
                    : 'Open daily affirmation'
                }
                aria-label={
                  affirmationsDisabled
                    ? 'Daily affirmations - currently disabled'
                    : 'Open daily affirmation'
                }
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </button>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 sm:w-6 sm:h-6" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* Mini Stats */}
          <div className="bg-white bg-opacity-10 dark:bg-gray-900 dark:bg-opacity-50 rounded-xl p-3">
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
              <button
                onClick={() => setShowEventsPopup(true)}
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
                aria-label={`View all ${events.length} events`}
                aria-haspopup="dialog"
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
                <span>{events.length} events</span>
              </button>
              <button
                onClick={() => setShowTasksPopup(true)}
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
                aria-label={`View all ${tasks.length} shopping items`}
                aria-haspopup="dialog"
              >
                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
                <span>{tasks.length} shopping items</span>
              </button>
              <button
                onClick={() => setShowRemindersPopup(true)}
                className="flex items-center space-x-1 hover:bg-white hover:bg-opacity-20 px-1.5 py-1 rounded transition-colors"
                aria-label={`View all ${reminders.length} reminders`}
                aria-haspopup="dialog"
              >
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" aria-hidden="true" />
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
                Daily Schedule
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-80 flex flex-col">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
                  {' '}
                  {/* //Alvaros - V4 */}
                  {todayEvents.length > 0 ? (
                    <div className="space-y-3">
                      {todayEvents.map((event) => (
                        <button
                          key={event.id}
                          className="w-full text-left p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer" //Alvaros - V4
                          onClick={() => onNavigate('calendar')}
                          aria-label={`${event.title}, ${formatEventTimeRange(event.start_time, event.end_time)}${event.location ? `, ${event.location}` : ''}. Tap to view calendar.`}
                        >
                          <div className="flex items-center space-x-1.5">
                            {' '}
                            {/* //Alvaros - V4 */}
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                              {' '}
                              {/* //Alvaros - V4 */}
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              {' '}
                              {/* //Alvaros - V4 */}
                              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                                {formatEventTimeRange(event.start_time, event.end_time)}
                              </p>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                                {' '}
                                {/* //Alvaros - V4 */}
                                {event.title}
                              </h3>
                              {event.location && (
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                                  {' '}
                                  {/* //Alvaros - V4 */}
                                  {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
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
                Weekly Schedule
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm h-80 flex flex-col">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4">
                  {' '}
                  {/* //Alvaros - V4 */}
                  {thisWeekEvents.length > 0 ? (
                    <div className="space-y-3">
                      {thisWeekEvents.map((event) => (
                        <button
                          key={event.id}
                          className="w-full text-left p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer" //Alvaros - V4
                          onClick={() => onNavigate('calendar')}
                          aria-label={`${event.title}, ${formatDate(event.event_date)}${event.start_time ? ` at ${formatEventTimeRange(event.start_time, event.end_time)}` : ''}${event.location ? `, ${event.location}` : ''}. Tap to view calendar.`}
                        >
                          <div className="flex items-center space-x-1.5">
                            {' '}
                            {/* //Alvaros - V4 */}
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                              {' '}
                              {/* //Alvaros - V4 */}
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              {' '}
                              {/* //Alvaros - V4 */}
                              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                                {formatDate(event.event_date)}
                                {event.start_time &&
                                  ` at ${formatEventTimeRange(event.start_time, event.end_time)}`}
                              </p>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                                {' '}
                                {/* //Alvaros - V4 */}
                                {event.title}
                              </h3>
                              {event.location && (
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                                  {' '}
                                  {/* //Alvaros - V4 */}
                                  {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" aria-hidden="true" />
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
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.action) {
                      action.action();
                    }
                  }}
                  className={`p-3 sm:p-4 rounded-xl ${action.bgColor} border ${action.borderColor} shadow-sm flex flex-col items-center
                    transition-all duration-200 ease-in-out
                    ${action.hoverBg} hover:shadow-md hover:border-opacity-80
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2`}
                  aria-label={`${action.title}: ${action.desc}`}
                >
                  <div
                    className={`${action.iconBgColor} p-2 sm:p-3 rounded-xl mb-2 sm:mb-3`}
                  >
                    <action.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${action.iconColor}`} aria-hidden="true" />
                  </div>
                  <h3 className={`font-semibold ${action.textColor} mb-1 text-sm sm:text-base text-center`}>
                    {action.title}
                  </h3>
                  <p className={`text-xs sm:text-sm ${action.descColor} text-center`}>{action.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Reminders */}
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                Smart Reminders
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setReminderWeekOffset(Math.max(0, reminderWeekOffset - 1));
                  }}
                  disabled={reminderWeekOffset === 0}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:dark:hover:bg-gray-700"
                  title="Previous period"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center">
                  {getWeekLabel(reminderWeekOffset)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setReminderWeekOffset(reminderWeekOffset + 1);
                  }}
                  className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Next period"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            {filteredReminders.length > 0 ? (
              <div className="space-y-2">
                {filteredReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800 transition-colors cursor-pointer"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${reminder.priority === 'high' ? 'bg-red-400' : 'bg-yellow-400'}`}
                      aria-hidden="true"
                    ></div>
                    <div className="flex-1">
                      <span className="text-sm sm:text-base text-gray-800 dark:text-gray-200 font-medium">
                        {reminder.title}
                      </span>
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {formatReminderDate(reminder.reminder_date)}
                        {reminder.reminder_time && ` at ${formatEventTime(reminder.reminder_time)}`}
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {reminder.description}
                        </p>
                      )}
                    </div>
                    {reminder.priority === 'high' && (
                      <span className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full text-xs font-medium" aria-hidden="true">
                        High Priority
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-gray-500 dark:text-gray-400">
                  No reminders for {getWeekLabel(reminderWeekOffset).toLowerCase()}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Ask Sarah to set a reminder for you</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
    </>
  );
}
