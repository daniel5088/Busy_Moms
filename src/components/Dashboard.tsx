import React from 'react';
import {
  Calendar,
  ShoppingBag,
  MessageCircle,
  Clock,
  Users,
  UserCircle,
  LogOut,
  Sparkles,
  X,
  BookOpen,
  Heart,
  ListTodo,
  Link,
  Loader2,
  Settings,
  Camera,
  ChevronLeft,
  ChevronRight,
  Gift,
  Bell,
  Star,
  CloudSun,
  XCircle,
} from 'lucide-react';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDashboardData } from '../hooks/useDashboardData';
import { Affirmation } from '../lib/supabase';
import { WeatherWidget } from './WeatherWidget';
import { weatherService, WeatherData, WeatherSettings } from '../services/weatherService';
import { affirmationService } from '../services/affirmationService';
import { formatEventTime, formatEventTimeRange, formatDate, getTodayISO } from '../utils/timeFormatters';
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
  onNavigateToWellness?: () => void;
  onNavigateToEvent?: (eventDate: string) => void;
  openAboutDialog?: boolean;
  onAboutDialogOpened?: () => void;
  affirmationSettings?: { enabled: boolean } | null;
}

export function Dashboard({
  onNavigate,
  onNavigateToSubScreen,
  onVoiceChatOpen,
  onOpenAffirmationSettings,
  onNavigateToCalendarCamera,
  onNavigateToWellness,
  onNavigateToEvent,
  openAboutDialog = false,
  onAboutDialogOpened,
  affirmationSettings,
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
    reload,
    reminderWeekOffset,
    setReminderWeekOffset,
  } = useDashboardData();

  const [weather, setWeather] = React.useState<WeatherData | null>(null);
  const [weatherSettings, setWeatherSettings] = React.useState<WeatherSettings | null>(null);
  const [weatherLoading, setWeatherLoading] = React.useState(false);
  const [weatherError, setWeatherError] = React.useState<string | null>(null);

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
  const [affirmationStatus, setAffirmationStatus] = React.useState<string>('');
  const [showAboutMenu, setShowAboutMenu] = React.useState(false);
  const [showWeatherModal, setShowWeatherModal] = React.useState(false);

  const shouldShowReminder = React.useCallback((reminder: Reminder, now: Date): boolean => {
    const today = getTodayISO();
    const reminderDate = reminder.reminder_date;

    console.log(`🔍 Checking reminder "${reminder.title}":`, {
      reminderDate,
      today,
      comparison: reminderDate === today ? 'TODAY' : reminderDate > today ? 'FUTURE' : 'PAST'
    });

    if (reminderDate > today) {
      return true;
    }

    if (reminderDate < today) {
      return false;
    }

    if (reminderDate === today) {
      return true;
    }

    return true;
  }, []);

  const filteredReminders = React.useMemo(() => {
    const now = new Date();
    return reminders.filter(reminder => shouldShowReminder(reminder, now));
  }, [reminders, shouldShowReminder]);

  // Filter reminders to show:
  // 1. ALL reminders I created (whether assigned or not)
  // 2. Reminders assigned TO me (by others)
  // Separate tracking to show which category each falls into
  const myAssignedReminders = React.useMemo(() => {
    const now = new Date();
    const userEmail = user?.email?.toLowerCase();

    console.log('📋 Filtering reminders:', {
      totalReminders: reminders.length,
      userId: user?.id,
      userEmail: user?.email,
      reminders: reminders.map(r => ({
        id: r.id,
        title: r.title,
        date: r.reminder_date,
        creatorId: r.user_id,
        assignedEmail: r.family_member_email,
        matchesCreator: r.user_id === user?.id,
        matchesAssignee: r.family_member_email?.toLowerCase() === userEmail && r.user_id !== user?.id
      }))
    });

    const filtered = reminders.filter(reminder => {
      // Show ALL reminders I created
      if (reminder.user_id === user?.id) {
        const shouldShow = shouldShowReminder(reminder, now);
        console.log(`✓ Reminder "${reminder.title}" - Created by me, shouldShow: ${shouldShow}`);
        return shouldShow;
      }

      // Show reminders assigned to me by others
      if (reminder.family_member_email?.toLowerCase() === userEmail && reminder.user_id !== user?.id) {
        const shouldShow = shouldShowReminder(reminder, now);
        console.log(`✓ Reminder "${reminder.title}" - Assigned to me, shouldShow: ${shouldShow}`);
        return shouldShow;
      }

      console.log(`✗ Reminder "${reminder.title}" - Does not match criteria`);
      return false;
    });

    console.log('✅ Filtered reminders:', {
      count: filtered.length,
      reminders: filtered.map(r => ({ title: r.title, date: r.reminder_date }))
    });

    return filtered;
  }, [reminders, shouldShowReminder, user?.email, user?.id]);

  React.useEffect(() => {
    if (user) {
      loadTodayAffirmation();
    }
  }, [user]);

  const prevAffirmationEnabledRef = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    const currentEnabled = affirmationSettings?.enabled ?? false;
    const prevEnabled = prevAffirmationEnabledRef.current;

    if (prevEnabled === false && currentEnabled === true) {
      console.log('Affirmations enabled: refreshing today\'s affirmation');
      loadTodayAffirmation();
    }

    prevAffirmationEnabledRef.current = currentEnabled;
  }, [affirmationSettings?.enabled]);

  // Define refreshWeather before useEffects that use it
  const refreshWeather = React.useCallback(async (coords?: { latitude: number; longitude: number }) => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await weatherService.getWeatherForLocation(coords);
      setWeather(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weather';
      setWeatherError(errorMessage);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // Load weather settings on mount
  React.useEffect(() => {
    const loadWeatherSettings = async () => {
      try {
        const settings = await weatherService.getSettings();
        setWeatherSettings(settings);
      } catch (error) {
        console.error('Failed to load weather settings:', error);
      }
    };
    loadWeatherSettings();
  }, []);

  // Weather is fetched on-demand when the user clicks the weather icon

  // Auto-load weather on mount if location is set
  React.useEffect(() => {
    if (weatherSettings?.latitude && weatherSettings?.longitude) {
      refreshWeather({
        latitude: weatherSettings.latitude,
        longitude: weatherSettings.longitude,
      });
    }
  }, [weatherSettings?.latitude, weatherSettings?.longitude, refreshWeather]);

  // Auto-open About dialog when triggered from Settings
  React.useEffect(() => {
    if (openAboutDialog) {
      setShowAboutMenu(true);
      onAboutDialogOpened?.();
    }
  }, [openAboutDialog, onAboutDialogOpened]);

  // Keyboard escape handler for affirmation overlay and about menu
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAboutMenu) {
          setShowAboutMenu(false);
        } else if (affirmationStage === 'content' || affirmationStage === 'disabled') {
          if (affirmationStage === 'content') {
            handleCloseAffirmation();
          } else {
            setAffirmationStage('hidden');
          }
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [affirmationStage, showAboutMenu]);

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
        const currentDate = new Date();
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth() + 1;
        const d = currentDate.getDate();
        const mm = m < 10 ? '0' + m : '' + m;
        const dd = d < 10 ? '0' + d : '' + d;
        const todayStr = `${y}-${mm}-${dd}`;

        const dueSlot = findDueSlot(settings, user.id, currentDate);
        if (dueSlot) {
          markAsAutoShown(user.id, todayStr, dueSlot.slotIndex);
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
    setAffirmationStatus('Loading your daily affirmation');

    setAffirmationStage('burst');

    setTimeout(() => {
      setAffirmationStage('logo');
    }, 450);

    setTimeout(() => {
      setAffirmationStage('content');
      setAffirmationStatus('');
    }, 900);
  };

  const handleCloseAffirmation = () => {
    if (affirmationStage === 'content') {
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
      icon: UserCircle,
      title: 'Contacts',
      desc: 'Your trusted network',
      bgColor: 'bg-blue-50 dark:bg-gray-800',
      borderColor: 'border-blue-200 dark:border-gray-700',
      iconBgColor: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-gray-700',
      action: () => onNavigateToSubScreen('contacts'),
    },
    {
      icon: Camera,
      title: 'Scan Events',
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
      icon: Heart,
      title: 'Cycle tracker',
      desc: 'Track your wellness',
      bgColor: 'bg-rose-50 dark:bg-gray-800',
      borderColor: 'border-rose-200 dark:border-gray-700',
      iconBgColor: 'bg-rose-100 dark:bg-rose-900',
      iconColor: 'text-rose-600 dark:text-rose-400',
      textColor: 'text-gray-900 dark:text-gray-100',
      descColor: 'text-gray-600 dark:text-gray-400',
      hoverBg: 'hover:bg-rose-100 dark:hover:bg-gray-700',
      action: () => onNavigateToWellness?.(),
    },
    {
      icon: Gift,
      title: 'Gift Finder',
      desc: 'Coming soon',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      iconBgColor: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-400 dark:text-gray-500',
      textColor: 'text-gray-500 dark:text-gray-400',
      descColor: 'text-gray-400 dark:text-gray-500',
      hoverBg: '',
      action: undefined,
    },
    {
      icon: Bell,
      title: 'Notifications',
      desc: 'Coming soon',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      iconBgColor: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-400 dark:text-gray-500',
      textColor: 'text-gray-500 dark:text-gray-400',
      descColor: 'text-gray-400 dark:text-gray-500',
      hoverBg: '',
      action: undefined,
    },
    {
      icon: Star,
      title: 'Favorites',
      desc: 'Coming soon',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      borderColor: 'border-gray-200 dark:border-gray-700',
      iconBgColor: 'bg-gray-100 dark:bg-gray-700',
      iconColor: 'text-gray-400 dark:text-gray-500',
      textColor: 'text-gray-500 dark:text-gray-400',
      descColor: 'text-gray-400 dark:text-gray-500',
      hoverBg: '',
      action: undefined,
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      {/* Screen reader status announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {affirmationStatus}
      </div>

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
                onClick={() => {
                  refreshWeather({
                    latitude: weatherSettings?.latitude,
                    longitude: weatherSettings?.longitude,
                  });
                  setShowWeatherModal(true);
                }}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-white hover:bg-opacity-30 transition-all active:scale-95"
                title="View weather"
                aria-label="View weather"
              >
                <CloudSun className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              </button>
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
              <button
                onClick={() => setShowAboutMenu(!showAboutMenu)}
                className="hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                aria-label="About Busy Moms Assistant AI"
              >
                <img src="/bmalogo.png" alt="" className="h-11 w-auto object-contain" />
              </button>
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
                  {todayEvents.length > 0 ? (
                    <div className="space-y-3">
                      {todayEvents.map((event) => (
                        <button
                          key={event.id}
                          className="w-full text-left p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => onNavigateToEvent?.(event.event_date)}
                          aria-label={`${event.title}, ${formatEventTimeRange(event.start_time, event.end_time)}${event.location ? `, ${event.location}` : ''}. Tap to view event in calendar.`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                                {formatEventTimeRange(event.start_time, event.end_time)}
                              </p>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                                {event.title}
                              </h3>
                              {event.location && (
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
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
                  {thisWeekEvents.length > 0 ? (
                    <div className="space-y-3">
                      {thisWeekEvents.map((event) => (
                        <button
                          key={event.id}
                          className="w-full text-left p-2 sm:p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => onNavigateToEvent?.(event.event_date)}
                          aria-label={`${event.title}, ${formatDate(event.event_date)}${event.start_time ? ` at ${formatEventTimeRange(event.start_time, event.end_time)}` : ''}${event.location ? `, ${event.location}` : ''}. Tap to view event in calendar.`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 dark:text-rose-300" aria-hidden="true" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400">
                                {formatDate(event.event_date)}
                                {event.start_time &&
                                  ` at ${formatEventTimeRange(event.start_time, event.end_time)}`}
                              </p>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                                {event.title}
                              </h3>
                              {event.location && (
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
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
                  disabled={!action.action}
                  className={`p-3 sm:p-4 rounded-xl ${action.bgColor} border ${action.borderColor} shadow-sm flex flex-col items-center
                    transition-all duration-200 ease-in-out
                    ${action.action ? `${action.hoverBg} hover:shadow-md hover:border-opacity-80` : 'cursor-not-allowed opacity-60'}
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
                  aria-label="Go to previous week"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" aria-hidden="true" />
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
                  aria-label="Go to next week"
                >
                  <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" aria-hidden="true" />
                </button>
              </div>
            </div>
            {myAssignedReminders.length > 0 ? (
              <div className="space-y-2">
                {myAssignedReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800 transition-colors cursor-pointer"
                    onClick={() => onNavigateToEvent?.(reminder.reminder_date)}
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
                        {reminder.assigned_by_name && reminder.user_id !== user?.id && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            • By {reminder.assigned_by_name}
                          </span>
                        )}
                        {reminder.assigned_to_name && reminder.user_id === user?.id && (
                          <span className="ml-2 text-purple-600 dark:text-purple-400">
                            • To {reminder.assigned_to_name}
                          </span>
                        )}
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
                  No reminders assigned to you for {getWeekLabel(reminderWeekOffset).toLowerCase()}
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
        <RemindersList reminders={reminders} onDelete={reload} />
      </DashboardPopup>

      {/* About BMA Modal */}
      {showAboutMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-dialog-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAboutMenu(false)}
          />

          <div className="relative bg-white dark:bg-gray-800 p-8 sm:p-12 rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAboutMenu(false)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
            </button>

            <div className="text-center">
              <img src="/bmalogo.png" alt="" className="h-16 w-auto object-contain mb-10 mx-auto" />

              <h2
                id="about-dialog-title"
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6"
              >
                About Busy Moms Assistant AI
              </h2>

              <div className="space-y-4 text-gray-900 dark:text-gray-700 text-base sm:text-lg leading-relaxed">
                <p>We're currently in alpha testing and improving fast based on feedback.</p>
                <p>If you have any questions, please reach out to the person who introduced you to the app.</p>


                <hr className="border-gray-200 dark:border-gray-700 my-6" />

                <div className="text-center">
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Link to report a bug:</p>
                  <a
                    href="https://forms.office.com/Pages/ResponsePage.aspx?id=FqzrK_LZBEicaaNhjeeB6nQIHTzhQi1FkSfPlx9GeRlUNVczSUxKMkJCNUJRWjNBU0VVVFE5Slk2Ui4u"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded"
                  >
                    Report a bug
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weather Modal */}
      {showWeatherModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="weather-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowWeatherModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 id="weather-modal-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Weather
              </h2>
              <button
                onClick={() => setShowWeatherModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close weather"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <WeatherWidget
                weather={weather}
                loading={weatherLoading}
                error={weatherError}
                locationName={weatherSettings?.default_location || 'Your Location'}
                onOpenSettings={() => {
                  setShowWeatherModal(false);
                  onNavigate('more');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
