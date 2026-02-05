import React, { useCallback, useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react';
import {
  Plus,
  MapPin,
  Clock,
  Users,
  MessageCircle,
  Gift,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  X,
  Info,
  Loader2,
  Bell,
  Camera,
  Image,
  Heart,
  Droplet,
  Activity,
  Sparkles,
  TrendingUp,
  Moon,
  Sun,
  Zap,
  AlertCircle,
} from 'lucide-react';

import { EventForm } from './forms/EventForm';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { CalendarSkeleton } from './CalendarSkeleton';
import { DirectionsButton } from './DirectionsButton';
import { TravelTimeIndicator, TravelTimeBadge } from './TravelTimeIndicator';
import { LocationAutocomplete } from './LocationAutocomplete';
import { EventWeatherIcon, EventWeatherInsightsModal } from './EventWeatherIcon';
import { googleCalendarService, GoogleCalendarEvent } from '../services/googleCalendar';
import { cycleTrackerService, CycleSymptom } from '../services/cycleTrackerService';
import { supabase } from '../lib/supabase';
import type { Event as DbEvent } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCalendarSync } from '../hooks/useCalendarSync';
import { useDefaultAddress } from '../hooks/useDefaultAddress';
import { useEventWeather, EventWeatherData } from '../hooks/useEventWeather';
import { TutorialOverlay } from './TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';
import { calendarTutorialSteps } from '../utils/tutorialSteps';
import type { SubScreen } from '../App';

// --- Helpers -----------------------------------------------------------------
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const COMMON_SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Mood Swings', 'Breast Tenderness', 'Acne', 'Back Pain', 'Cravings', 'Insomnia'];

interface ExtractedCalendarEvent {
  title: string;
  date: string;
  time?: string | null;
  description?: string;
  location?: string | null;
}

// Local YYYY-MM-DD (no UTC shift)
const toLocalISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Parse YYYY-MM-DD string to local date without timezone shift
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const formatTimeRange = (startTime?: string | null, endTime?: string | null) => {
  if (!startTime) return '';
  const fmt = (t: string) =>
    new Date(`2000-01-01T${t}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  const start = fmt(startTime);
  if (endTime) return `${start} - ${fmt(endTime)}`;
  return start;
};

const isMappableLocation = (loc?: string | null) => {
  if (!loc) return false;
  const trimmed = loc.trim();

  return trimmed.includes(',') || /[0-9]/.test(trimmed);
};

const openInGoogleMaps = (location: string) => {
  if (!location) return;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

const openInAppleMaps = (location: string) => {
  if (!location) return;
  const url = `https://maps.apple.com/?q=${encodeURIComponent(location)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// --- Weather Icon Wrapper Component ------------------------------------------
interface EventWeatherIconWrapperProps {
  location: string;
  eventDate: string;
  eventTime?: string | null;
  getEventWeather: (location: string, eventDate: string, eventTime?: string | null, force?: boolean) => Promise<EventWeatherData | null>;
  getCachedWeather: (location: string, eventDate: string, eventTime?: string | null) => EventWeatherData | null;
  isWeatherLoading: (location: string, eventDate: string, eventTime?: string | null) => boolean;
  onShowInsights: (weather: EventWeatherData) => void;
}

function EventWeatherIconWrapper({
  location,
  eventDate,
  eventTime,
  getEventWeather,
  getCachedWeather,
  isWeatherLoading,
  onShowInsights,
}: EventWeatherIconWrapperProps) {
  const [weather, setWeather] = useState<EventWeatherData | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Check for cached weather on mount
  useEffect(() => {
    const cached = getCachedWeather(location, eventDate, eventTime);
    if (cached) {
      setWeather(cached);
      setHasLoaded(true);
    }
  }, [location, eventDate, eventTime, getCachedWeather]);

  const handleClick = async () => {
    // If we have weather data, show insights
    if (weather) {
      onShowInsights(weather);
      return;
    }

    // Otherwise, fetch weather for this specific event location and date/time
    const data = await getEventWeather(location, eventDate, eventTime, false);
    if (data) {
      setWeather(data);
      setHasLoaded(true);
      onShowInsights(data);
    }
  };

  const loading = isWeatherLoading(location, eventDate, eventTime);

  return (
    <EventWeatherIcon
      weather={weather}
      loading={loading}
      onClick={handleClick}
      size="sm"
    />
  );
}

// --- Component ---------------------------------------------------------------
interface CalendarProps {
  onNavigateToSubScreen?: (screen: SubScreen) => void;
  onNavigateToGiftFinder?: () => void;
  openCalendarCamera?: boolean;
  onCalendarCameraOpened?: () => void;
  initialSelectedDate?: string | null;
  onDateSelected?: () => void;
  onNavigateToGoogleCalendarSettings?: () => void;
  onNavigate?: (screen: 'dashboard' | 'family' | 'more') => void;
  autoStartTutorial?: boolean;
}

export function Calendar({ onNavigateToSubScreen, onNavigateToGiftFinder, openCalendarCamera, onCalendarCameraOpened, initialSelectedDate, onDateSelected, onNavigateToGoogleCalendarSettings, onNavigate, autoStartTutorial }: CalendarProps) {
  const { user } = useAuth();
  const { defaultAddress } = useDefaultAddress();
  const { pendingConflicts, resolveConflict, performSync, loadPendingConflicts } =
    useCalendarSync();
  const { getEventWeather, getCachedWeather, isLoading: isWeatherLoading, checkMorningPrefetch } = useEventWeather();

  // Core state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedCalendarEvent[] | null>(null);
  const [editingEvent, setEditingEvent] = useState<ExtractedCalendarEvent | null>(null);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI modals
  const [showEventForm, setShowEventForm] = useState(false);
  const [showWhatsAppForm, setShowWhatsAppForm] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showNoEventFoundModal, setShowNoEventFoundModal] = useState(false);

  // Weather insights modal state
  const [weatherInsightsEvent, setWeatherInsightsEvent] = useState<EventWeatherData | null>(null);
  const [eventWeatherCache, setEventWeatherCache] = useState<Map<string, EventWeatherData>>(new Map());

  // Data
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DbEvent | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [syncedGoogleEventIds, setSyncedGoogleEventIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showGiftSuggestion, setShowGiftSuggestion] = useState(false);
  const [giftEventTitle, setGiftEventTitle] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());

  // Cycle Tracker state
  const [cycleTrackerMode, setCycleTrackerMode] = useState(false);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [symptoms, setSymptoms] = useState<Record<string, CycleSymptom>>({});
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [symptomAnalysis, setSymptomAnalysis] = useState<any>(null);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [loadingType, setLoadingType] = useState('');
  const [cycleHistory, setCycleHistory] = useState<any[]>([]);
  const [showAIPanel, setShowAIPanel] = useState(false);

  // Tutorial
  const {
    visible: tutorialVisible,
    currentStep: tutorialStep,
    handleNext: handleTutorialNext,
    handleBack: handleTutorialBack,
    handleSkip: handleTutorialSkip,
  } = useTutorial('calendar', calendarTutorialSteps, {
    autoStart: autoStartTutorial,
    onComplete: () => {
      if (onNavigate) {
        setTimeout(() => onNavigate('family'), 500);
      }
    },
  });

  // Handle initial selected date from dashboard navigation
  useEffect(() => {
    if (initialSelectedDate) {
      const date = parseLocalDate(initialSelectedDate);
      setSelectedDate(date);
      setCurrentDate(date);
      onDateSelected?.();
    }
  }, [initialSelectedDate, onDateSelected]);

  // Morning weather prefetch - runs once on component mount
  useEffect(() => {
    if (user?.id) {
      checkMorningPrefetch();
    }
  }, [user?.id, checkMorningPrefetch]);

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Data loading: only load the visible month to reduce payload -----------
  const loadEvents = useCallback(async () => {
    if (!user?.id || !user?.email) return;
    setLoading(true);
    setError(null);
    try {
      // Load events - let RLS handle access control (same as reminders)
      const { data: eventsData, error: eventsErr } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', toLocalISODate(monthStart))
        .lte('event_date', toLocalISODate(monthEnd));

      if (eventsErr) throw eventsErr;
      
      // Client-side filtering to show:
      // 1. All events I created (including those assigned to others)
      // 2. Events others assigned to me
      const filteredEvents = (eventsData ?? []).filter((ev) => {
        // If I created this event, always show it (regardless of assignment)
        if (ev.user_id === user.id) {
          return true;
        }
        // If I didn't create it, show it only if it's assigned to me
        return ev.assigned_to_email && ev.assigned_to_email.toLowerCase() === user.email.toLowerCase();
      }).sort((a, b) => {
        const aDate = new Date(a.event_date);
        const bDate = new Date(b.event_date);
        if (aDate.getTime() !== bDate.getTime()) return aDate.getTime() - bDate.getTime();
        
        const aTime = a.start_time ? parseInt(a.start_time.replace(/:/g, '')) : 2400;
        const bTime = b.start_time ? parseInt(b.start_time.replace(/:/g, '')) : 2400;
        return aTime - bTime;
      });
      
      setEvents(filteredEvents);
      
      console.log('📅 Events Loaded:', {
        total: eventsData?.length || 0,
        filtered: filteredEvents.length,
        userEmail: user.email,
        debugSample: filteredEvents.slice(0, 3).map((e) => ({
          title: e.title,
          createdByMe: e.user_id === user.id,
          assignedTo: e.assigned_to_email,
          showReason: e.user_id === user.id
            ? (!e.assigned_to_email ? 'My event (unassigned)' : `My event (assigned to ${e.assigned_to_email})`)
            : 'Assigned to me by other',
        })),
      });

      // Load reminders with the same logic
      const { data: remindersData, error: remindersErr } = await supabase
        .from('reminders')
        .select('*')
        .gte('reminder_date', toLocalISODate(monthStart))
        .lte('reminder_date', toLocalISODate(monthEnd))
        .eq('completed', false);

      if (remindersErr) throw remindersErr;
      
      // Filter reminders: show all my reminders (including those assigned to others) + reminders assigned to me
      const filteredReminders = (remindersData ?? []).filter((rem) => {
        // If I created this reminder, always show it (regardless of assignment)
        if (rem.user_id === user.id) {
          return true;
        }
        // If I didn't create it, show it only if it's assigned to me
        return rem.family_member_email && rem.family_member_email.toLowerCase() === user.email.toLowerCase();
      }).sort((a, b) => {
        const aDate = new Date(a.reminder_date);
        const bDate = new Date(b.reminder_date);
        if (aDate.getTime() !== bDate.getTime()) return aDate.getTime() - bDate.getTime();
        
        const aTime = a.reminder_time ? parseInt(a.reminder_time.replace(/:/g, '')) : 2400;
        const bTime = b.reminder_time ? parseInt(b.reminder_time.replace(/:/g, '')) : 2400;
        return aTime - bTime;
      });
      
      setReminders(filteredReminders);

      console.log('🔔 Reminders Loaded:', {
        total: remindersData?.length || 0,
        filtered: filteredReminders.length,
        userEmail: user.email,
      });

      // Load sync mappings to identify which Google events are already in local DB
      const { data: mappingsData, error: mappingsErr } = await supabase
        .from('calendar_sync_mappings')
        .select('google_event_id')
        .eq('user_id', user.id);

      if (!mappingsErr && mappingsData) {
        const googleIds = new Set(mappingsData.map((m) => m.google_event_id));
        setSyncedGoogleEventIds(googleIds);
      }
    } catch (e) {
      console.error('❌ Error loading calendar data:', e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [user?.id, user?.email, monthStart, monthEnd, supabase]);

  useEffect(() => {
    if (user?.id) loadEvents();
  }, [user?.id, loadEvents]);

  // Check Google Calendar connection and load events
  useEffect(() => {
    let mounted = true;

    const checkGoogleAndSync = async () => {
      if (!user?.id || !mounted) return;

      try {
        const connected = await googleCalendarService.isConnected();
        if (!mounted) return;

        setIsGoogleConnected(connected);

        if (connected && mounted) {
          try {
            await loadGoogleEvents();
          } catch (loadError: any) {
            console.error('Failed to load Google events:', loadError);
            
            // If it's an auth error, disconnect
            if (loadError.message?.includes('authentication') || 
                loadError.message?.includes('401') ||
                loadError.message?.includes('Unauthorized')) {
              console.log('Authentication failed, disconnecting Google Calendar');
              setIsGoogleConnected(false);
              setGoogleEvents([]);
            }
          }
        }
      } catch (error) {
        console.error('Error checking Google Calendar:', error);
        if (mounted) {
          setIsGoogleConnected(false);
          setGoogleEvents([]);
        }
      }
    };

    checkGoogleAndSync();

    return () => {
      mounted = false;
    };
  }, [user?.id, monthStart]); // ✅ add monthStart so it reruns when month changes

  // Auto-open camera menu if navigated from Dashboard quick action
  useEffect(() => {
    if (openCalendarCamera) {
      setShowCamera(true);
      if (onCalendarCameraOpened) {
        onCalendarCameraOpened();
      }
    }
  }, [openCalendarCamera, onCalendarCameraOpened]);

  const loadGoogleEvents = async () => {
    if (!user?.id) return;

    try {
      const connected = await googleCalendarService.isConnected();
      if (!connected) {
        setGoogleEvents([]);
        setIsGoogleConnected(false);
        return;
      }

      // ✅ Use [monthStart, nextMonthStart) instead of endOfMonth midnight
      const timeMin = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString();
      const timeMax = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1).toISOString();

      console.log('📅 Loading Google Calendar events...', { timeMin, timeMax });

      const events = await googleCalendarService.getEvents({
        timeMin,
        timeMax,
        maxResults: 100,
      });

      // Filter out Google Tasks that appear as calendar events
      const calendarOnlyEvents = events.filter((event) => {
        // Exclude events that are actually tasks
        // Google Tasks in calendar have a description pointing to tasks.google.com
        if (event.description && event.description.includes('tasks.google.com')) {
          console.log('🚫 Filtering out Google Task:', event.summary);
          return false;
        }
        return true;
      });

      setGoogleEvents(calendarOnlyEvents);
    } catch (error: any) {
      console.error('Error loading Google events:', error);

      // Clear events on any error
      setGoogleEvents([]);

      // If it's an auth error, also clear the connection status
      const isAuthError =
        error.message?.includes('authentication') ||
        error.message?.includes('401') ||
        error.message?.includes('Unauthorized') ||
        error.message?.includes('auth');

      if (isAuthError) {
        console.log('🔓 Authentication error detected, clearing Google connection');
        setIsGoogleConnected(false);

        // Show user-friendly error message
        showToast('Google Calendar connection expired. Please reconnect.', 'error');
      }
    }
  };

  // --- Derived day agenda ----------------------------------------------------
  const itemsForSelectedDate = useMemo(() => {
    if (!selectedDate) return { events: [] as DbEvent[], reminders: [] as any[] };
    const d = toLocalISODate(selectedDate);

    const dayDbEvents = events.filter((ev) => ev.event_date === d);
    const dayReminders = reminders.filter((rem) => rem.reminder_date === d);

    // Filter out Google events that are already synced to local DB
    const dayGoogleEvents = googleEvents.filter((ev) => {
      // Skip if this Google event is already in local database
      if (syncedGoogleEventIds.has(ev.id)) {
        return false;
      }

      if (ev.start?.date) return ev.start.date === d;
      if (ev.start?.dateTime) return ev.start.dateTime.split('T')[0] === d;
      return false;
    });

    const sorted = dayDbEvents.sort((a, b) => {
      const minutesKey = (it: DbEvent) => {
        if (it.start_time) {
          const [h, m] = String(it.start_time)
            .split(':')
            .map((n: string) => parseInt(n, 10));
          return (isNaN(h) ? 23 : h) * 60 + (isNaN(m) ? 59 : m);
        }
        return 24 * 60;
      };
      return minutesKey(a) - minutesKey(b);
    });

    const sortedReminders = dayReminders.sort((a, b) => {
      const minutesKey = (it: any) => {
        if (it.reminder_time) {
          const [h, m] = String(it.reminder_time)
            .split(':')
            .map((n: string) => parseInt(n, 10));
          return (isNaN(h) ? 23 : h) * 60 + (isNaN(m) ? 59 : m);
        }
        return 24 * 60;
      };
      return minutesKey(a) - minutesKey(b);
    });

    return { events: sorted, reminders: sortedReminders, googleEvents: dayGoogleEvents };
  }, [selectedDate, events, reminders, googleEvents, syncedGoogleEventIds]);

  // --- Calendar grid helpers -------------------------------------------------
  const monthLabel = useMemo(
    () =>
      currentDate.toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [currentDate]
  );

  const firstDayOfGrid = useMemo(() => {
    const start = new Date(monthStart);
    const weekday = start.getDay(); // 0=Sun..6=Sat
    start.setDate(start.getDate() - weekday); // back to Sunday of the first row
    return start;
  }, [monthStart]);

  const calendarGrid = useMemo(() => {
    // Always render 6 weeks (6 * 7 = 42) so the grid is stable
    const days: Date[] = [];
    const d = new Date(firstDayOfGrid);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [firstDayOfGrid]);

  // --- Handlers --------------------------------------------------------------
  const goPrevMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);
  const goNextMonth = useCallback(() => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);
  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
    // Exit cycle tracker mode when going to today
    setCycleTrackerMode(false);
    setShowAIPanel(false);
  }, []);

  // Cycle Tracker functions
  const loadCycleData = useCallback(async () => {
    try {
      const [cycleData, symptomsData, historyData] = await Promise.all([
        cycleTrackerService.getCycleData(),
        cycleTrackerService.getSymptoms(),
        cycleTrackerService.getCycleHistory(),
      ]);

      if (cycleData) {
        setPeriodStart(new Date(cycleData.period_start_date));
        setCycleLength(cycleData.cycle_length);
        setPeriodLength(cycleData.period_length);
      }

      const symptomsMap: Record<string, CycleSymptom> = {};
      symptomsData.forEach(symptom => {
        symptomsMap[symptom.symptom_date] = symptom;
      });
      setSymptoms(symptomsMap);
      setCycleHistory(historyData);
    } catch (error) {
      console.error('Error loading cycle data:', error);
    }
  }, []);

  const calculatePhase = useCallback((date: Date) => {
    if (!periodStart) return null;
    const daysSinceStart = Math.floor((date.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const dayInCycle = ((daysSinceStart % cycleLength) + cycleLength) % cycleLength;
    if (dayInCycle < periodLength) return { phase: 'period', cycleDay: dayInCycle + 1 };
    if (dayInCycle < 14) return { phase: 'follicular', cycleDay: dayInCycle + 1 };
    if (dayInCycle >= 12 && dayInCycle <= 16) return { phase: 'ovulation', cycleDay: dayInCycle + 1 };
    return { phase: 'luteal', cycleDay: dayInCycle + 1 };
  }, [periodStart, cycleLength, periodLength]);

  const getPhaseColor = useCallback((phase: string) => {
    const colors = {
      period: 'bg-pink-500/20 border-pink-500',
      follicular: 'bg-teal-500/20 border-teal-500',
      ovulation: 'bg-amber-500/20 border-amber-500',
      luteal: 'bg-blue-500/20 border-blue-500'
    };
    return colors[phase as keyof typeof colors] || '';
  }, []);

  const toggleCycleTracker = useCallback(() => {
    if (!cycleTrackerMode) {
      loadCycleData();
    }
    setCycleTrackerMode(!cycleTrackerMode);
    setShowAIPanel(false);
  }, [cycleTrackerMode, loadCycleData]);

  const getAIInsights = async () => {
    setCycleLoading(true);
    setLoadingType('insights');
    const currentPhase = calculatePhase(new Date());
    if (!currentPhase) {
      alert('Set your period start date first!');
      setCycleLoading(false);
      return;
    }
    try {
      const symptomsList = (Object.entries(symptoms) as [string, CycleSymptom][])
        .filter(([_, data]) => data.symptoms?.length > 0)
        .map(([date, data]) => ({ date, symptoms: data.symptoms }));

      const insights = await cycleTrackerService.callEdgeFunction('get_insights', {
        currentPhase: currentPhase.phase as any,
        cycleDay: currentPhase.cycleDay,
        cycleLength,
        periodLength,
        symptoms: symptomsList,
        cycleHistory,
      });
      setAiInsights(insights);
      setShowAIPanel(true);
    } catch (error) {
      console.error('Error getting insights:', error);
      alert('Failed to get AI insights');
    }
    setCycleLoading(false);
    setLoadingType('');
  };

  const predictNextPeriod = async () => {
    setCycleLoading(true);
    setLoadingType('prediction');
    const currentPhase = calculatePhase(new Date());
    if (!currentPhase) {
      alert('Set your period start date first!');
      setCycleLoading(false);
      return;
    }
    try {
      const predictionData = await cycleTrackerService.callEdgeFunction('predict_period', {
        currentPhase: currentPhase.phase as any,
        cycleDay: currentPhase.cycleDay,
        cycleLength,
        periodLength,
        cycleHistory,
      });
      setPrediction(predictionData);
      setShowAIPanel(true);
    } catch (error) {
      console.error('Error predicting period:', error);
      alert('Failed to predict next period');
    }
    setCycleLoading(false);
    setLoadingType('');
  };

  const analyzeSymptoms = async () => {
    setCycleLoading(true);
    setLoadingType('analysis');
    const symptomsList = (Object.entries(symptoms) as [string, CycleSymptom][])
      .filter(([_, data]) => data.symptoms?.length > 0)
      .map(([date, data]) => ({ date, symptoms: data.symptoms }));
    if (symptomsList.length === 0) {
      alert('Log some symptoms first!');
      setCycleLoading(false);
      return;
    }
    const currentPhase = calculatePhase(new Date());
    try {
      const analysis = await cycleTrackerService.callEdgeFunction('analyze_symptoms', {
        currentPhase: currentPhase?.phase as any || 'period',
        cycleDay: currentPhase?.cycleDay || 0,
        cycleLength,
        periodLength,
        symptoms: symptomsList,
      });
      setSymptomAnalysis(analysis);
      setShowAIPanel(true);
    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      alert('Failed to analyze symptoms');
    }
    setCycleLoading(false);
    setLoadingType('');
  };

  const logSymptom = async (symptom: string) => {
    if (!selectedDate) return;
    const dateKey = toLocalISODate(selectedDate);
    const currentSymptoms = symptoms[dateKey]?.symptoms || [];
    const updatedSymptoms = currentSymptoms.includes(symptom)
      ? currentSymptoms.filter(s => s !== symptom)
      : [...currentSymptoms, symptom];

    try {
      await cycleTrackerService.saveSymptom({
        symptom_date: dateKey,
        symptoms: updatedSymptoms,
      });

      setSymptoms({
        ...symptoms,
        [dateKey]: {
          ...symptoms[dateKey],
          symptom_date: dateKey,
          symptoms: updatedSymptoms,
        },
      });
    } catch (error) {
      console.error('Error saving symptom:', error);
    }
  };

  const handlePeriodStart = async (date: Date) => {
    try {
      setPeriodStart(date);

      await cycleTrackerService.saveCycleData({
        period_start_date: toLocalISODate(date),
        cycle_length: cycleLength,
        period_length: periodLength,
      });

      await cycleTrackerService.addCycleHistory({
        period_start_date: toLocalISODate(date),
        cycle_length: cycleLength,
        period_length: periodLength,
      });

      const historyData = await cycleTrackerService.getCycleHistory();
      setCycleHistory(historyData);
    } catch (error) {
      console.error('Error saving period start:', error);
    }
  };

  const updateCycleSettings = async (newCycleLength: number, newPeriodLength: number) => {
    try {
      setCycleLength(newCycleLength);
      setPeriodLength(newPeriodLength);

      if (periodStart) {
        await cycleTrackerService.saveCycleData({
          period_start_date: toLocalISODate(periodStart),
          cycle_length: newCycleLength,
          period_length: newPeriodLength,
        });
      }
    } catch (error) {
      console.error('Error updating cycle settings:', error);
    }
  };

  const onDayClick = useCallback((day: Date) => {
    setSelectedDate(day);
  }, []);

  const onDayDoubleClick = useCallback((day: Date) => {
    setSelectedDate(day);
    setShowEventForm(true);
  }, []);

  const processImage = async (file: File) => {
    setIsProcessing(true);
    setShowCamera(false);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('calendar-image-agent', {
        body: {
          action: 'process_image',
          image_data: base64Data,
          image_type: file.type,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data.events && data.events.length > 0) {
        setExtractedInfo(data.events);
      } else {
        setShowNoEventFoundModal(true);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const startCamera = async () => {
    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setCameraStream(stream);
      setShowCameraView(true);

      // Wait for next tick to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        await videoRef.current.play().catch(err => {
          console.log('Video play error (can be ignored):', err);
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions or use the gallery option.');
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // Restart camera with new facing mode
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: newFacingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      setCameraStream(stream);

      // Wait for next tick to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        await videoRef.current.play().catch(err => {
          console.log('Video play error (can be ignored):', err);
        });
      }
    } catch (error) {
      console.error('Error switching camera:', error);
      alert('Unable to switch camera.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        // Stop camera stream
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
        }
        setShowCameraView(false);
        setShowCamera(false);

        // Convert blob to file and process
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        await processImage(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
    setShowCamera(false);
  };

  const addEventFromImage = async (event: ExtractedCalendarEvent) => {
    if (!user?.id) {
      showToast('You must be logged in to add events', 'error');
      return;
    }

    try {
      // Parse the time if it exists
      let startTime = event.time || null;
      
      // Ensure time is in HH:MM format
      if (startTime && !startTime.includes(':')) {
        startTime = null;
      }

      // Create the event directly in the database
      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: event.title,
          event_date: event.date,
          start_time: startTime,
          end_time: null,
          description: event.description || null,
          location: event.location || null,
          event_type: 'other',
          participants: [],
          rsvp_required: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        showToast('Failed to add event. Please try again.', 'error');
        return;
      }

      // Success! Close the modal and reload events
      setExtractedInfo(null);
      await loadEvents();
      
      // Select the date of the new event
      setSelectedDate(new Date(event.date));
      
      // Show success message
      showToast(`"${event.title}" added to your calendar!`, 'success');

      // Check if it's a gift-worthy event
      const titleLower = event.title.toLowerCase();
      const descriptionLower = (event.description || '').toLowerCase();
      const combinedText = titleLower + ' ' + descriptionLower;
      
      const isGiftEvent = 
        combinedText.includes('birthday') ||
        combinedText.includes('anniversary') ||
        combinedText.includes('wedding') ||
        combinedText.includes('graduation') ||
        combinedText.includes('baby shower') ||
        combinedText.includes('housewarming') ||
        combinedText.includes('retirement') ||
        combinedText.match(/\b(gift|present)\b/);

      if (isGiftEvent) {
        // Show gift suggestion modal after a short delay
        console.log('🎁 Gift event detected:', event.title);
        setTimeout(() => {
          console.log('🎁 Showing gift suggestion modal');
          setGiftEventTitle(event.title);
          setShowGiftSuggestion(true);
        }, 1500);
      }
    } catch (error) {
      console.error('Error adding event:', error);
      showToast('Failed to add event. Please try again.', 'error');
    }
  };

  const addMultipleEventsFromImage = async (indices: number[]) => {
    if (!user?.id || !extractedInfo) {
      showToast('You must be logged in to add events', 'error');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const index of indices) {
      const event = extractedInfo[index];
      try {
        let startTime = event.time || null;
        if (startTime && !startTime.includes(':')) {
          startTime = null;
        }

        const { error } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            title: event.title,
            event_date: event.date,
            start_time: startTime,
            end_time: null,
            description: event.description || null,
            location: event.location || null,
            event_type: 'other',
            participants: [],
            rsvp_required: false,
          });

        if (error) {
          console.error('Error creating event:', error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('Error adding event:', error);
        errorCount++;
      }
    }

    // Clear selected events and close modal
    setSelectedEvents(new Set());
    setExtractedInfo(null);
    await loadEvents();

    // Show summary message
    if (successCount > 0) {
      showToast(
        `${successCount} event${successCount > 1 ? 's' : ''} added successfully!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
        errorCount > 0 ? 'error' : 'success'
      );
    } else {
      showToast('Failed to add events. Please try again.', 'error');
    }
  };

  const toggleEventSelection = (index: number) => {
    setSelectedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!extractedInfo) return;

    if (selectedEvents.size === extractedInfo.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(extractedInfo.map((_, i) => i)));
    }
  };

  const handleEditEvent = (event: ExtractedCalendarEvent, index: number) => {
    setEditingEvent({ ...event });
    setEditingEventIndex(index);
  };

  const handleSaveEditedEvent = () => {
    if (!editingEvent || !extractedInfo || editingEventIndex === null) return;

    const updatedEvents = [...extractedInfo];
    updatedEvents[editingEventIndex] = { ...editingEvent };

    setExtractedInfo(updatedEvents);
    setEditingEvent(null);
    setEditingEventIndex(null);
  };

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevMonth();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNextMonth();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        goToday();
      }
    },
    [goPrevMonth, goNextMonth, goToday]
  );

  const handleEventSaved = useCallback(() => {
    setShowEventForm(false);
    setSelectedEvent(null);
    void loadEvents();
  }, [loadEvents]);

  // --- Render helpers --------------------------------------------------------
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const dayEventsCount = useCallback(
    (day: Date) => {
      const d = toLocalISODate(day);
      const eventCount = events.filter((ev) => ev.event_date === d).length;
      const reminderCount = reminders.filter((rem) => rem.reminder_date === d).length;

      // Only count Google events that are NOT already synced to local DB
      const googleEventCount = googleEvents.filter((ev) => {
        if (syncedGoogleEventIds.has(ev.id)) return false;

        if (ev.start?.date) return ev.start.date === d;
        if (ev.start?.dateTime) return ev.start.dateTime.split('T')[0] === d;
        return false;
      }).length;

      return eventCount + reminderCount + googleEventCount;
    },
    [events, reminders, googleEvents, syncedGoogleEventIds]
  );

  const isCurrentMonth = (day: Date) => day.getMonth() === currentDate.getMonth();

  // --- Diagnostics ----------------------------------------------------------
  const runGoogleCalendarDiagnostics = async () => {
    if (!user?.id) {
      console.log('❌ No user logged in');
      return;
    }

    console.log('🔍 Running Google Calendar Diagnostics...');
    console.log('================================');

    try {
      // Check 1: Environment variables
      console.log('\n1️⃣ Checking Environment...');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      console.log('✅ Supabase URL:', supabaseUrl ? 'Configured' : '❌ Missing');
      console.log('✅ Anon Key:', anonKey ? 'Configured' : '❌ Missing');

      // Check 2: Database tokens
      console.log('\n2️⃣ Checking Database Tokens...');
      const { data: tokenData, error: tokenError } = await supabase
        .from('google_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tokenError) {
        console.error('❌ Database error:', tokenError);
      } else if (!tokenData) {
        console.log('⚠️ No tokens found in database - Google Calendar not connected');
      } else {
        console.log('✅ Token record found');
        console.log('   - Has access_token:', !!tokenData.access_token);
        console.log('   - Has refresh_token:', !!tokenData.refresh_token);
        console.log('   - Expiry:', tokenData.expiry_ts);
        
        const now = new Date();
        const expiry = new Date(tokenData.expiry_ts);
        const minutesUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60);
        
        console.log('   - Status:', minutesUntilExpiry > 0 ? 
          `✅ Valid (${Math.round(minutesUntilExpiry)} minutes remaining)` : 
          '⚠️ Expired');
      }

      // Check 3: Connection status via API
      console.log('\n3️⃣ Checking API Connection...');
      try {
        const connected = await googleCalendarService.isConnected();
        console.log('✅ API Connection Status:', connected ? '✅ Connected' : '⚠️ Not Connected');
      } catch (error: any) {
        console.error('❌ API Connection Check Failed:', error.message);
      }

      // Check 4: Try to load events
      console.log('\n4️⃣ Testing Event Load...');
      try {
        const events = await googleCalendarService.getEvents({
          maxResults: 1,
          timeMin: new Date().toISOString(),
        });
        console.log('✅ Event Load Successful - Found', events.length, 'events');
      } catch (error: any) {
        console.error('❌ Event Load Failed:', error.message);
        
        if (error.message.includes('authentication') || error.message.includes('401')) {
          console.log('💡 Suggestion: Token needs refresh or reconnection');
        }
      }

      // Check 5: Edge Function diagnostics
      console.log('\n5️⃣ Edge Function Diagnostics...');
      try {
        const session = await supabase.auth.getSession();
        if (session.data.session) {
          const response = await fetch(`${supabaseUrl}/functions/v1/google-calendar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.data.session.access_token}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({
              action: 'diagnostics',
              userId: user.id,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Edge Function Response:', data);
          } else {
            console.error('❌ Edge Function Error:', response.status, await response.text());
          }
        }
      } catch (error: any) {
        console.error('❌ Edge Function Diagnostics Failed:', error.message);
      }

    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
    }

    console.log('\n================================');
    console.log('✅ Diagnostics Complete');
  };

  // --- UI -------------------------------------------------------------------
  // Alvaros Skeletons
  if (loading && isInitialLoad) {
    return <CalendarSkeleton />;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-24">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            {isGoogleConnected && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Google Connected
                </span>
              </div>
            )}
          </div>

          {/* Google Calendar Connection Banner */}
          {user?.id && !isGoogleConnected && (
            <div id="google-calendar-sync" className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-4 shadow-lg" data-google-banner>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Connect Google Calendar
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Sync your Google Calendar events to see all your appointments in one place. 
                    Your events stay private and secure.
                  </p>
                  <button
                    id="google-calendar-sync"
                    onClick={() => {
                      onNavigateToGoogleCalendarSettings?.();
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Connect Google Calendar</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    // Option to dismiss the banner
                    const banner = document.querySelector('[data-google-banner]');
                    if (banner) {
                      (banner as HTMLElement).style.display = 'none';
                    }
                  }}
                  className="flex-shrink-0 p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid - Left Side */}
            <div className="lg:col-span-2">
              <div id="calendar-view" className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {monthLabel}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={goToday}
                      className="px-4 py-2 text-sm font-medium bg-rose-50 dark:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-800 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={toggleCycleTracker}
                      className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        cycleTrackerMode
                          ? 'bg-pink-500 text-white hover:bg-pink-600'
                          : 'bg-pink-50 dark:bg-pink-900 text-pink-600 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        <span>Cycle Tracker</span>
                      </div>
                    </button>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={goPrevMonth}
                        className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" aria-hidden="true" />
                      </button>
                      <button
                        onClick={goNextMonth}
                        className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {WEEKDAYS_SHORT.map((day, idx) => (
                    <div key={idx} className="text-center py-2">
                      <span
                        className={`text-sm font-semibold ${
                          idx === 0 || idx === 6
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarGrid.map((day, i) => {
                    const count = dayEventsCount(day);
                    const inCurrentMonth = isCurrentMonth(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const phaseInfo = cycleTrackerMode ? calculatePhase(day) : null;
                    const phaseColorClass = phaseInfo ? getPhaseColor(phaseInfo.phase) : '';

                    const dateLabel = day.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
                    const eventLabel = count > 0 ? `, ${count} event${count > 1 ? 's' : ''}` : '';
                    const selectedLabel = isSelected ? ', selected' : '';
                    const todayLabel = isToday ? ', today' : '';
                    const phaseLabel = phaseInfo ? `, ${phaseInfo.phase} phase` : '';
                    const ariaLabel = `${dateLabel}${eventLabel}${selectedLabel}${todayLabel}${phaseLabel}`;

                    return (
                      <button
                        key={i}
                        onClick={() => onDayClick(day)}
                        onDoubleClick={() => onDayDoubleClick(day)}
                        aria-label={ariaLabel}
                        aria-pressed={isSelected}
                        className={`
                          relative aspect-square rounded-xl p-2 transition-all border-2
                          flex flex-col items-center justify-center
                          ${
                            cycleTrackerMode && phaseInfo
                              ? `${phaseColorClass} text-gray-900 dark:text-gray-100 ${isSelected ? 'ring-2 ring-white shadow-lg scale-105' : ''}`
                              : isSelected
                              ? 'bg-rose-500 text-white shadow-lg scale-105 border-rose-500'
                              : isToday
                                ? 'bg-rose-50 dark:bg-rose-900 text-rose-600 dark:text-rose-300 font-bold border-rose-500 dark:border-rose-400'
                                : inCurrentMonth
                                  ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent'
                                  : 'text-gray-400 dark:text-gray-600 border-transparent'
                          }
                        `}
                      >
                        <span className="text-sm">{day.getDate()}</span>
                        {count > 0 && (
                          <div className="flex gap-0.5 mt-1" aria-hidden="true">
                            {Array.from({ length: Math.min(count, 3) }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-1 h-1 rounded-full ${
                                  isSelected ? 'bg-white' : 'bg-rose-500'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Add Event Button - hidden in cycle tracker mode */}
                {!cycleTrackerMode && (
                  <div className="flex gap-3 mt-6">
                    <button
                      id="add-event-button"
                      onClick={() => {
                        setSelectedEvent(null);
                        setShowEventForm(true);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Add Event</span>
                    </button>
                    <button
                      onClick={() => setShowCamera(true)}
                      className="w-14 h-14 bg-gray-700 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 text-white rounded-xl transition-all flex items-center justify-center shadow-lg flex-shrink-0"
                      aria-label="Add event from image"
                    >
                      <Camera className="w-6 h-6" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {/* Cycle Tracker AI Buttons */}
                {cycleTrackerMode && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={getAIInsights}
                        disabled={cycleLoading && loadingType === 'insights'}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm text-white"
                      >
                        {cycleLoading && loadingType === 'insights' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
                        ) : (
                          <><Sparkles className="w-4 h-4" />Insights</>
                        )}
                      </button>
                      <button
                        onClick={predictNextPeriod}
                        disabled={cycleLoading && loadingType === 'prediction'}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm text-white"
                      >
                        {cycleLoading && loadingType === 'prediction' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
                        ) : (
                          <><TrendingUp className="w-4 h-4" />Predict</>
                        )}
                      </button>
                      <button
                        onClick={analyzeSymptoms}
                        disabled={cycleLoading && loadingType === 'analysis'}
                        className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm text-white"
                      >
                        {cycleLoading && loadingType === 'analysis' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Loading...</>
                        ) : (
                          <><Activity className="w-4 h-4" />Analyze</>
                        )}
                      </button>
                    </div>

                    {/* Phase Legend */}
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      {[
                        { color: 'pink', label: 'Period' },
                        { color: 'teal', label: 'Follicular' },
                        { color: 'amber', label: 'Ovulation' },
                        { color: 'blue', label: 'Luteal' }
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded bg-${color}-500/20 border-2 border-${color}-500`} />
                          <span className="text-gray-700 dark:text-gray-300">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights Panel with Roll-out Animation */}
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    showAIPanel ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                  }`}
                >
                  {aiInsights && (
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-pink-500" />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">AI Insights</h3>
                        </div>
                        <button
                          onClick={() => setShowAIPanel(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3 text-sm">
                        <p className="text-gray-700 dark:text-gray-300">{aiInsights.currentPhaseInsight}</p>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Recommendations:</h4>
                          <ul className="space-y-1">
                            {aiInsights.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                <span className="text-pink-400">•</span><span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {prediction && (
                    <div className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-teal-200 dark:border-teal-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-teal-500" />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Period Prediction</h3>
                        </div>
                        <button
                          onClick={() => setShowAIPanel(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{prediction.nextPeriodDate}</p>
                        <p className="text-gray-600 dark:text-gray-400">Confidence: {prediction.confidenceLevel}</p>
                      </div>
                    </div>
                  )}

                  {symptomAnalysis && (
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-rose-200 dark:border-rose-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-rose-500" />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Symptom Analysis</h3>
                        </div>
                        <button
                          onClick={() => setShowAIPanel(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Insights:</h4>
                          <ul className="space-y-1">
                            {symptomAnalysis.insights.map((ins: string, i: number) => (
                              <li key={i} className="text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                <span className="text-rose-400">•</span><span>{ins}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side Panel */}
            <div className="lg:col-span-1">
              {/* Cycle Tracker Symptoms & Settings Panel */}
              {cycleTrackerMode ? (
                <div className="space-y-4">
                  {/* Symptoms Panel */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Symptoms</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Select a date'}
                    </p>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {COMMON_SYMPTOMS.map(symptom => {
                        const dateKey = selectedDate ? toLocalISODate(selectedDate) : '';
                        const selectedSymptoms = symptoms[dateKey]?.symptoms || [];
                        return (
                          <button key={symptom} onClick={() => logSymptom(symptom)}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-all text-sm ${
                              selectedSymptoms.includes(symptom)
                                ? 'bg-pink-500/30 border-2 border-pink-500 text-gray-900 dark:text-gray-100'
                                : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                            }`}>
                            {symptom}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cycle Settings Panel */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cycle Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Last Period Start</label>
                        <input type="date" value={periodStart ? toLocalISODate(periodStart) : ''}
                          onChange={(e) => handlePeriodStart(new Date(e.target.value + 'T00:00:00'))}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Cycle Length (days)</label>
                        <input type="number" value={cycleLength}
                          onChange={(e) => updateCycleSettings(parseInt(e.target.value), periodLength)}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" min="20" max="40" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Period Length (days)</label>
                        <input type="number" value={periodLength}
                          onChange={(e) => updateCycleSettings(cycleLength, parseInt(e.target.value))}
                          className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" min="2" max="10" />
                      </div>
                    </div>

                    {/* Phase Info Cards */}
                    {(() => {
                      const currentPhase = selectedDate ? calculatePhase(selectedDate) : null;
                      const nextPeriod = periodStart ? new Date(periodStart.getTime() + cycleLength * 24 * 60 * 60 * 1000) : null;
                      return (
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 border border-pink-200 dark:border-pink-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Next Period</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                              {nextPeriod ? nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Set date'}
                            </p>
                          </div>
                          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 border border-teal-200 dark:border-teal-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Current Phase</p>
                            <p className="text-sm font-bold capitalize text-gray-900 dark:text-gray-100">{currentPhase ? currentPhase.phase : 'N/A'}</p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cycle Day</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{currentPhase ? currentPhase.cycleDay : '-'}</p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cycle Length</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{cycleLength}d</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
              <div id="calendar-events" className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {selectedDate && isSameDay(selectedDate, new Date()) ? 'Today' : 'Selected Day'}
                </h3>

                <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
                  {itemsForSelectedDate.events.length === 0 &&
                  itemsForSelectedDate.reminders.length === 0 &&
                  (itemsForSelectedDate.googleEvents?.length || 0) === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" aria-hidden="true" />
                      <p className="text-gray-500 dark:text-gray-400">No events for this day</p>
                      <button
                        onClick={() => {
                          setSelectedEvent(null);
                          setShowEventForm(true);
                        }}
                        className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors"
                      >
                        Add Event
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Events */}
                      {itemsForSelectedDate.events.map((ev, i) => (
                        <button
                          type="button"
                          key={`event-${ev.id}-${i}`}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setShowEventDetails(true);
                          }}
                          className="group bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900 dark:to-pink-900 border border-orange-200 dark:border-orange-700 rounded-2xl p-4 hover:shadow-md transition-all w-full text-left"
                        >
                          {/* Assignment info row */}
                          {(ev.assigned_by_name || ev.assigned_to_email) && user && (
                            <div className="flex items-center flex-wrap gap-2 mb-2 text-xs">
                              {/* Show "By" if current user is the receiver */}
                              {ev.assigned_by_name && ev.user_id !== user.id && (
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                  By: {ev.assigned_by_name}
                                </span>
                              )}
                              {/* Show "To" if current user is the sender */}
                              {ev.assigned_to_email && ev.user_id === user.id && (
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                                  To: {ev.assigned_to_email.split('@')[0]}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors break-words flex-1 pr-2">
                              {ev.title}
                            </h3>
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                              {formatTimeRange(ev.start_time, ev.end_time) || 'All day'}
                            </span>
                          </div>
                          {ev.location && (
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 flex-1 min-w-0">
                                {/* Weather icon for events with location */}
                                <EventWeatherIconWrapper
                                  location={ev.location}
                                  eventDate={ev.event_date}
                                  eventTime={ev.start_time}
                                  getEventWeather={getEventWeather}
                                  getCachedWeather={getCachedWeather}
                                  isWeatherLoading={isWeatherLoading}
                                  onShowInsights={setWeatherInsightsEvent}
                                />
                                <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                              {ev.travel_time_minutes && (
                                <TravelTimeBadge travelMinutes={ev.travel_time_minutes} />
                              )}
                            </div>
                          )}
                        </button>
                      ))}

                      {/* Google Calendar Events */}
                      {(itemsForSelectedDate.googleEvents || []).map((ev, i) => (
                        <div
                          key={`google-event-${ev.id}-${i}`}
                          className="bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-2xl p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <h3 className="font-semibold text-gray-900">
                                {ev.summary || 'Untitled Event'}
                              </h3>
                              <div className="flex items-center space-x-1 px-2 py-0.5 bg-white rounded-full border border-cyan-300">
                                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                                  <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                  />
                                  <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                  />
                                  <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                  />
                                  <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                  />
                                </svg>
                                <span className="text-xs font-medium text-cyan-600">Google</span>
                              </div>
                            </div>
                            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full font-medium ml-2">
                              {ev.start?.dateTime
                                ? new Date(ev.start.dateTime).toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })
                                : 'All day'}
                            </span>
                          </div>
                          {ev.location && (
                            <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {/* Weather icon for Google Calendar events with location */}
                              <EventWeatherIconWrapper
                                location={ev.location}
                                eventDate={ev.start?.date || (ev.start?.dateTime ? ev.start.dateTime.split('T')[0] : toLocalISODate(selectedDate || new Date()))}
                                eventTime={ev.start?.dateTime ? ev.start.dateTime.split('T')[1]?.substring(0, 5) : null}
                                getEventWeather={getEventWeather}
                                getCachedWeather={getCachedWeather}
                                isWeatherLoading={isWeatherLoading}
                                onShowInsights={setWeatherInsightsEvent}
                              />
                              <MapPin className="w-3 h-3" aria-hidden="true" />
                              <span>{ev.location}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Reminders */}
                      {itemsForSelectedDate.reminders.map((reminder, i) => (
                        <button
                          type="button"
                          key={`reminder-${reminder.id}-${i}`}
                          onClick={() => {
                            setSelectedReminder(reminder);
                            setShowEventDetails(true);
                          }}
                          className="group bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900 dark:to-yellow-900 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 hover:shadow-md transition-all w-full text-left"
                        >
                          {/* Assignment info row */}
                          {reminder.assigned_to_name && user && reminder.user_id === user.id && (
                            <div className="flex items-center flex-wrap gap-2 mb-2 text-xs">
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full font-medium">
                                To: {reminder.assigned_to_name}
                              </span>
                            </div>
                          )}
                          {reminder.assigned_by_name && user && reminder.user_id !== user.id && (
                            <div className="flex items-center flex-wrap gap-2 mb-2 text-xs">
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                                By: {reminder.assigned_by_name}
                              </span>
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {reminder.title}
                              </h3>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                              {reminder.reminder_time
                                ? formatTimeRange(reminder.reminder_time, null)
                                : 'All day'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
              )}
            </div>
          </div>

          {/* Conflicts Alert Banner */}
          {pendingConflicts.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowConflicts(true)}
                className="w-full px-6 py-4 bg-orange-50 border-2 border-orange-200 rounded-2xl hover:bg-orange-100 transition-colors flex items-center justify-center space-x-3"
              >
                <Bell className="w-5 h-5 text-orange-600" />
                <span className="text-orange-700 font-semibold">
                  Resolve {pendingConflicts.length} Sync Conflict
                  {pendingConflicts.length !== 1 ? 's' : ''}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Event form modal */}
        {showEventForm && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6" role="dialog" aria-modal="true" aria-labelledby="event-form-title">
              <div className="flex items-center justify-between mb-4">
                <h4 id="event-form-title" className="font-semibold text-xl text-gray-900 dark:text-gray-100">
                  {selectedEvent ? 'Edit Event' : 'Create Event'}
                </h4>
                <button
                  onClick={() => {
                    setShowEventForm(false);
                    setSelectedEvent(null);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <EventForm
                defaultDate={selectedDate ? toLocalISODate(selectedDate) : undefined}
                event={selectedEvent ?? undefined}
                onCancel={() => setShowEventForm(false)}
                onSaved={handleEventSaved}
              />
            </div>
          </div>
        )}

        {/* Event/Reminder Details Modal */}
        {showEventDetails && (selectedEvent || selectedReminder) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="event-details-title">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 id="event-details-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedEvent ? 'Event Details' : 'Reminder Details'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowEventDetails(false);
                      setSelectedEvent(null);
                      setSelectedReminder(null);
                    }}
                    className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    aria-label="Close dialog"
                  >
                    <X className="w-4 h-4 text-gray-600" aria-hidden="true" />
                  </button>
                </div>

                {selectedEvent && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedEvent.title}
                      </h3>
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700">
                          {selectedEvent.event_type}
                        </div>
                        {selectedEvent.assigned_by_name && (
                          <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                            By: {selectedEvent.assigned_by_name}
                          </div>
                        )}
                        {selectedEvent.assigned_to_name && (
                          <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                            To: {selectedEvent.assigned_to_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <CalendarIcon className="w-4 h-4" aria-hidden="true" />
                        <span>{parseLocalDate(selectedEvent.event_date).toLocaleDateString()}</span>
                      </div>

                      {(selectedEvent.start_time || selectedEvent.end_time) && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          <span>
                            {formatTimeRange(selectedEvent.start_time, selectedEvent.end_time)}
                          </span>
                        </div>
                      )}

                      {selectedEvent.location && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <MapPin className="w-4 h-4" aria-hidden="true" />
                          <span>{selectedEvent.location}</span>
                        </div>
                      )}

                      {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Users className="w-4 h-4" aria-hidden="true" />
                          <span>{selectedEvent.participants.join(', ')}</span>
                        </div>
                      )}

                      {selectedEvent.description && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-200">{selectedEvent.description}</p>
                        </div>
                      )}
                    </div>

                    {selectedEvent.location && (() => {
                      const locationLower = selectedEvent.location.toLowerCase();
                      const isPrivateLocation =
                        locationLower.includes('house') ||
                        locationLower.includes('home') ||
                        locationLower.includes("'s place") ||
                        locationLower.includes('my place') ||
                        locationLower.match(/\b(at|to) \w+['']s\b/); // matches "at John's" or "to Sarah's"

                      if (isPrivateLocation) return null;

                      return (
                        <div className="pt-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                            Open in:
                          </p>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => {
                                const url = `https://waze.com/ul?q=${encodeURIComponent(selectedEvent.location!)}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-400 to-pink-400 rounded-lg hover:from-rose-500 hover:to-pink-500 transition-colors flex items-center justify-center"
                              title="Open in Waze"
                              aria-label="Open location in Waze"
                            >
                              <img
                                src="/waze_logo.svg"
                                alt="Waze"
                                className="h-10 w-auto object-contain"
                              />
                            </button>
                            <button
                              onClick={() => {
                                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location!)}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-400 to-pink-400 rounded-lg hover:from-rose-500 hover:to-pink-500 transition-colors flex items-center justify-center"
                              title="Open in Google Maps"
                              aria-label="Open location in Google Maps"
                            >
                              <img
                                src="/google_maps_logo.svg"
                                alt="Google Maps"
                                className="h-10 w-auto object-contain"
                              />
                            </button>
                            <button
                              onClick={() => {
                                const { location, location_lat, location_lng } = selectedEvent;

                                const params = new URLSearchParams();

                                if (location_lat && location_lng) {
                                  params.append('drop-off[0][latitude]', location_lat.toString());
                                  params.append('drop-off[0][longitude]', location_lng.toString());
                                  params.append('drop-off[0][formatted-address]', location!);
                                } else {
                                  params.append('drop-off[0][formatted-address]', location!);
                                }

                                params.append('pickup[formatted-address]', 'Current Location');

                                const url = `https://m.uber.com/go/home?${params.toString()}`;
                                console.log('Uber URL:', url);
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-400 to-pink-400 rounded-lg hover:from-rose-500 hover:to-pink-500 transition-colors flex items-center justify-center"
                              title="Open in Uber"
                              aria-label="Request an Uber to this location"
                            >
                              <img
                                src="/uber_logo.svg"
                                alt="Uber"
                                className="h-10 w-auto object-contain"
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => {
                          setShowEventDetails(false);
                          setShowEventForm(true);
                        }}
                        className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
                      >
                        Edit Event
                      </button>
                      {/* Add Gift Finder button for gift-worthy events */}
                      {(() => {
                        const titleLower = selectedEvent.title.toLowerCase();
                        const descriptionLower = (selectedEvent.description || '').toLowerCase();
                        const combinedText = titleLower + ' ' + descriptionLower;

                        const isGiftEvent =
                          combinedText.includes('birthday') ||
                          combinedText.includes('anniversary') ||
                          combinedText.includes('wedding') ||
                          combinedText.includes('graduation') ||
                          combinedText.includes('baby shower') ||
                          combinedText.includes('housewarming') ||
                          combinedText.includes('retirement') ||
                          combinedText.match(/\b(gift|present)\b/);

                        if (!isGiftEvent) return null;

                        return (
                          <button
                            onClick={() => {
                              setGiftEventTitle(selectedEvent.title);
                              setShowEventDetails(false);
                              setShowGiftSuggestion(true);
                            }}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-lg hover:from-rose-500 hover:to-pink-500 transition-colors flex items-center justify-center gap-2"
                          >
                            <Gift className="w-4 h-4" />
                            Find Gift
                          </button>
                        );
                      })()}
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this event?')) {
                            try {
                              // Check if this event is synced with Google Calendar
                              const { data: mapping } = await supabase
                                .from('calendar_sync_mappings')
                                .select('google_event_id')
                                .eq('local_event_id', selectedEvent.id)
                                .eq('user_id', user?.id!)
                                .maybeSingle();

                              // Delete from local database
                              const { error } = await supabase
                                .from('events')
                                .delete()
                                .eq('id', selectedEvent.id);

                              if (!error) {
                                // If synced with Google, delete from Google Calendar too
                                if (mapping?.google_event_id) {
                                  try {
                                    await googleCalendarService.deleteEvent(mapping.google_event_id);

                                    // Clean up the sync mapping
                                    await supabase
                                      .from('calendar_sync_mappings')
                                      .delete()
                                      .eq('local_event_id', selectedEvent.id)
                                      .eq('user_id', user?.id!);

                                    console.log('✅ Deleted event from both local and Google Calendar');
                                  } catch (googleError) {
                                    console.error('Failed to delete from Google Calendar:', googleError);
                                  }
                                }

                                setShowEventDetails(false);
                                setSelectedEvent(null);
                                loadEvents(); // Refresh events list
                              } else {
                                alert('Error deleting event. Please try again.');
                              }
                            } catch (error) {
                              console.error('Error deleting event:', error);
                              alert('Error deleting event. Please try again.');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setShowEventDetails(false);
                          setSelectedEvent(null);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {selectedReminder && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedReminder.title}
                      </h3>
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        <div
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            selectedReminder.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : selectedReminder.priority === 'low'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {selectedReminder.priority || 'medium'} priority
                        </div>
                        <div className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Reminder
                        </div>
                        {selectedReminder.assigned_by_name && (
                          <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            By: {selectedReminder.assigned_by_name}
                          </div>
                        )}
                        {selectedReminder.assigned_to_name && (
                          <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            To: {selectedReminder.assigned_to_name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <CalendarIcon className="w-4 h-4" aria-hidden="true" />
                        <span>{parseLocalDate(selectedReminder.reminder_date).toLocaleDateString()}</span>
                      </div>

                      {selectedReminder.reminder_time && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          <span>{formatTimeRange(selectedReminder.reminder_time, null)}</span>
                        </div>
                      )}

                      {selectedReminder.description && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-200">{selectedReminder.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('reminders')
                              .update({ completed: true })
                              .eq('id', selectedReminder.id);

                            if (!error) {
                              setShowEventDetails(false);
                              setSelectedReminder(null);
                              loadEvents(); // Refresh to remove completed reminder
                            }
                          } catch (error) {
                            console.error('Error completing reminder:', error);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this reminder?')) {
                            try {
                              const { error } = await supabase
                                .from('reminders')
                                .delete()
                                .eq('id', selectedReminder.id);

                              if (!error) {
                                setShowEventDetails(false);
                                setSelectedReminder(null);
                                loadEvents(); // Refresh reminders list
                              } else {
                                alert('Error deleting reminder. Please try again.');
                              }
                            } catch (error) {
                              console.error('Error deleting reminder:', error);
                              alert('Error deleting reminder. Please try again.');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => {
                          setShowEventDetails(false);
                          setSelectedReminder(null);
                        }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conflict Resolution Modal */}
        {showConflicts && pendingConflicts.length > 0 && (
          <ConflictResolutionModal
            conflicts={pendingConflicts}
            onResolve={async (conflictId, resolution) => {
              const success = await resolveConflict(conflictId, resolution);
              if (success) {
                await loadEvents();
                await loadPendingConflicts();
              }
              return success;
            }}
            onClose={() => setShowConflicts(false)}
          />
        )}

        {/* Camera/Gallery Selection Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[60vh] sm:max-h-[520px] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="camera-modal-title">
              <div className="flex items-center justify-between mb-4">
                <h3 id="camera-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Event from Image</h3>
                <button
                  onClick={() => setShowCamera(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  aria-label="Close dialog"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Capture or select an image with event details
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startCamera}
                  className="h-32 bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl font-medium hover:from-rose-600 hover:to-rose-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
                >
                  <Camera className="w-8 h-8" aria-hidden="true" />
                  <span className="text-sm">Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl font-medium hover:from-amber-600 hover:to-amber-700 transition flex flex-col items-center justify-center gap-2 shadow-lg"
                >
                  <Image className="w-8 h-8" aria-hidden="true" />
                  <span className="text-sm">Gallery</span>
                </button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Live Camera View Modal */}
        {showCameraView && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col" role="dialog" aria-modal="true" aria-labelledby="camera-view-title">
            {/* Camera Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
              <h2 id="camera-view-title" className="sr-only">Camera View</h2>
              <div className="flex items-center justify-between">
                <button
                  onClick={closeCamera}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition"
                  aria-label="Close camera"
                >
                  <X className="w-6 h-6 text-white" aria-hidden="true" />
                </button>
                <button
                  onClick={switchCamera}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition"
                  aria-label="Switch camera"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Hidden canvas for capturing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Capture Button */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-8 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-4 border-white/30 hover:scale-110 transition-transform shadow-lg"
                  aria-label="Capture photo"
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-800" aria-hidden="true" />
                  </div>
                </button>
              </div>
              <p className="text-white text-center mt-4 text-sm">
                Tap to capture • {facingMode === 'user' ? 'Front' : 'Back'} Camera
              </p>
            </div>
          </div>
        )}

        {/* Processing Modal */}
        {isProcessing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl text-center" role="dialog" aria-modal="true" aria-labelledby="processing-title">
              <Loader2 className="w-16 h-16 text-rose-500 animate-spin mx-auto mb-4" aria-hidden="true" />
              <h3 id="processing-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Processing Image</h3>
              <p className="text-gray-600 dark:text-gray-300">AI is analyzing the image for event information...</p>
            </div>
          </div>
        )}

        {/* Extracted Info Modal */}
        {extractedInfo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="extracted-events-title">
              <div className="flex items-center justify-between mb-4">
                <h3 id="extracted-events-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {extractedInfo.length === 1 ? 'Event Found' : 'Events Found'}
                </h3>
                {extractedInfo.length > 1 && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition"
                  >
                    {selectedEvents.size === extractedInfo.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="space-y-4 mb-6">
                {extractedInfo.map((event, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedEvents.has(i)
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-600'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {extractedInfo.length > 1 && (
                        <input
                          type="checkbox"
                          checked={selectedEvents.has(i)}
                          onChange={() => toggleEventSelection(i)}
                          aria-label={event.title}
                          className="mt-1 w-5 h-5 text-rose-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-rose-500 cursor-pointer"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-gray-900 dark:text-gray-100 font-semibold flex-1">
                            {event.title}
                          </h4>
                          <button
                            onClick={() => handleEditEvent(event, i)}
                            className="ml-2 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                            aria-label={`Edit ${event.title}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">📅 {event.date}</p>
                        {event.time && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">🕐 {event.time}</p>
                        )}
                        {event.location && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">
                            📍 {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {extractedInfo.length === 1 ? (
                  <button
                    onClick={() => addEventFromImage(extractedInfo[0])}
                    className="w-full py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl font-semibold hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add to Calendar</span>
                  </button>
                ) : selectedEvents.size > 0 ? (
                  <button
                    onClick={() => addMultipleEventsFromImage(Array.from(selectedEvents))}
                    className="w-full py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl font-semibold hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Selected ({selectedEvents.size})</span>
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    setExtractedInfo(null);
                    setSelectedEvents(new Set());
                  }}
                  className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {editingEvent && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="edit-event-title">
              <div className="flex items-center justify-between mb-6">
                <h3 id="edit-event-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Event</h3>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setEditingEventIndex(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  aria-label="Close dialog"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time (optional)</label>
                  <input
                    type="time"
                    value={editingEvent.time || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location (optional)</label>
                  <LocationAutocomplete
                    value={editingEvent.location || ''}
                    onChange={(value: string) => setEditingEvent({ ...editingEvent, location: value || null })}
                    onSelect={(place: any) => {
                      const name = place.name || place.description || '';
                      setEditingEvent({ ...editingEvent, location: name || editingEvent.location });
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (optional)</label>
                  <textarea
                    value={editingEvent.description || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value || null })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    placeholder="Add description"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setEditingEventIndex(null);
                  }}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedEvent}
                  className="flex-1 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Event Found Modal */}
        {showNoEventFoundModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="no-event-title">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>
                <h3 id="no-event-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  No Events Found
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  We couldn't find any calendar event information in this image. Please try another image with clearer event details.
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-200 font-medium mb-2">Tips for better results:</p>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Make sure the image is clear and well-lit</li>
                  <li>• Include event title, date, and time</li>
                  <li>• Avoid blurry or low-quality images</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowNoEventFoundModal(false);
                    setShowCamera(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl font-medium hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg hover:shadow-xl"
                >
                  Try Another Image
                </button>
                <button
                  onClick={() => setShowNoEventFoundModal(false)}
                  className="w-full py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gift Suggestion Modal */}
        {showGiftSuggestion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="gift-modal-title">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-white" aria-hidden="true" />
                </div>
                <h3 id="gift-modal-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Need a Gift?
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Would you like to find a gift for <span className="font-semibold text-gray-900 dark:text-gray-100">{giftEventTitle}</span>?
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowGiftSuggestion(false);
                    if (onNavigateToGiftFinder) {
                      onNavigateToGiftFinder();
                    }
                  }}
                  className="w-full py-3 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-xl font-medium hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg hover:shadow-xl"
                >
                  Yes, Find Gift Ideas 🎁
                </button>
                <button
                  onClick={() => setShowGiftSuggestion(false)}
                  className="w-full py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  No, Maybe Later
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                We can help you find the perfect gift based on relationship, budget, and preferences
              </p>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
          <div className="fixed top-4 right-4 z-[70] animate-in slide-in-from-top-2 duration-300">
            <div
              role="alert"
              className={`flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl border ${
                toast.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
              }`}
            >
              {toast.type === 'success' ? (
                <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`font-medium ${
                toast.type === 'success'
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {toast.message}
              </span>
              <button
                onClick={() => setToast(null)}
                className={`ml-2 p-1 rounded-lg transition ${
                  toast.type === 'success'
                    ? 'hover:bg-green-100 dark:hover:bg-green-800'
                    : 'hover:bg-red-100 dark:hover:bg-red-800'
                }`}
                aria-label="Dismiss notification"
              >
                <X className={`w-4 h-4 ${
                  toast.type === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        <TutorialOverlay
          steps={calendarTutorialSteps}
          currentStep={tutorialStep}
          visible={tutorialVisible}
          onNext={handleTutorialNext}
          onBack={handleTutorialBack}
          onSkip={handleTutorialSkip}
        />

        {/* Weather Insights Modal */}
        {weatherInsightsEvent && (
          <EventWeatherInsightsModal
            weather={weatherInsightsEvent}
            onClose={() => setWeatherInsightsEvent(null)}
          />
        )}
      </div>
    </>
  );
}
