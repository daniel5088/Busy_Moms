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
} from 'lucide-react';

import { EventForm } from './forms/EventForm';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { CalendarSkeleton } from './CalendarSkeleton';
import { DirectionsButton } from './DirectionsButton';
import { TravelTimeIndicator, TravelTimeBadge } from './TravelTimeIndicator';
import { googleCalendarService, GoogleCalendarEvent } from '../services/googleCalendar';
import { supabase } from '../lib/supabase';
import type { Event as DbEvent } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCalendarSync } from '../hooks/useCalendarSync';
import { useDefaultAddress } from '../hooks/useDefaultAddress';
import type { SubScreen } from '../App';

// --- Helpers -----------------------------------------------------------------
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

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

// --- Component ---------------------------------------------------------------
interface CalendarProps {
  onNavigateToSubScreen?: (screen: SubScreen) => void;
  onNavigateToGiftFinder?: () => void;
}

export function Calendar({ onNavigateToSubScreen, onNavigateToGiftFinder }: CalendarProps) {
  const { user } = useAuth();
  const { defaultAddress } = useDefaultAddress();
  const { pendingConflicts, resolveConflict, performSync, loadPendingConflicts } =
    useCalendarSync();

  // Core state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedCalendarEvent[] | null>(null);
  const [editingEvent, setEditingEvent] = useState<ExtractedCalendarEvent | null>(null);
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

  // Data
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DbEvent | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [syncedGoogleEventIds, setSyncedGoogleEventIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showGiftSuggestion, setShowGiftSuggestion] = useState(false);
  const [giftEventTitle, setGiftEventTitle] = useState('');

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Data loading: only load the visible month to reduce payload -----------
  const loadEvents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      // Load events
      const { data: eventsData, error: eventsErr } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', toLocalISODate(monthStart))
        .lte('event_date', toLocalISODate(monthEnd))
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (eventsErr) throw eventsErr;
      setEvents(eventsData ?? []);

      // Load reminders for the same date range
      const { data: remindersData, error: remindersErr } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .gte('reminder_date', toLocalISODate(monthStart))
        .lte('reminder_date', toLocalISODate(monthEnd))
        .eq('completed', false)
        .order('reminder_date', { ascending: true })
        .order('reminder_time', { ascending: true });

      if (remindersErr) throw remindersErr;
      setReminders(remindersData ?? []);

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
    }
  }, [user?.id, monthStart, monthEnd, supabase]);

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
  }, []);

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

  const handleEditEvent = (event: ExtractedCalendarEvent, _index: number) => {
    setEditingEvent({ ...event });
  };

  const handleSaveEditedEvent = () => {
    if (!editingEvent || !extractedInfo) return;

    const updatedEvents = extractedInfo.map((ev) =>
      ev.date === editingEvent.date && ev.title === editingEvent.title ? editingEvent : ev
    );

    setExtractedInfo(updatedEvents);
    setEditingEvent(null);
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
  if (loading) {
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
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-4 shadow-lg" data-google-banner>
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
                    onClick={() => {
                      // Navigate to settings or trigger Google OAuth
                      if (onNavigateToSubScreen) {
                        onNavigateToSubScreen('settings');
                      }
                    }}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="white"
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
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
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
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={goPrevMonth}
                        className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <button
                        onClick={goNextMonth}
                        className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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

                    return (
                      <button
                        key={i}
                        onClick={() => onDayClick(day)}
                        onDoubleClick={() => onDayDoubleClick(day)}
                        className={`
                          relative aspect-square rounded-xl p-2 transition-all
                          flex flex-col items-center justify-center
                          ${
                            isSelected
                              ? 'bg-rose-500 text-white shadow-lg scale-105'
                              : isToday
                                ? 'bg-rose-50 dark:bg-rose-900 text-rose-600 dark:text-rose-300 font-bold border-2 border-rose-500 dark:border-rose-400'
                                : inCurrentMonth
                                  ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                                  : 'text-gray-300 dark:text-gray-600'
                          }
                        `}
                      >
                        <span className="text-sm">{day.getDate()}</span>
                        {count > 0 && (
                          <div className="flex gap-0.5 mt-1">
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

                {/* Add Event Button */}
                <div className="flex gap-3 mt-6">
                  <button
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
                    <Camera className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            {/* Events List - Right Side */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {selectedDate && isSameDay(selectedDate, new Date()) ? 'Today' : 'Selected Day'}
                </h3>

                <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
                  {itemsForSelectedDate.events.length === 0 &&
                  itemsForSelectedDate.reminders.length === 0 &&
                  (itemsForSelectedDate.googleEvents?.length || 0) === 0 ? (
                    <div className="text-center py-12">
                      <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
                        <div
                          key={`event-${ev.id}-${i}`}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setShowEventDetails(true);
                          }}
                          className="group bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-900 dark:to-pink-900 border border-orange-200 dark:border-orange-700 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all"
                        >
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
                              <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                              {ev.travel_time_minutes && (
                                <TravelTimeBadge travelMinutes={ev.travel_time_minutes} />
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Google Calendar Events */}
                      {(itemsForSelectedDate.googleEvents || []).map((ev, i) => (
                        <div
                          key={`google-event-${ev.id}-${i}`}
                          className="group bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2 flex-1">
                              <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">
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
                              <MapPin className="w-3 h-3" />
                              <span>{ev.location}</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Reminders */}
                      {itemsForSelectedDate.reminders.map((reminder, i) => (
                        <div
                          key={`reminder-${reminder.id}-${i}`}
                          onClick={() => {
                            setSelectedReminder(reminder);
                            setShowEventDetails(true);
                          }}
                          className="group bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Bell className="w-4 h-4 text-amber-600" />
                              <h3 className="font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">
                                {reminder.title}
                              </h3>
                            </div>
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                              {reminder.reminder_time
                                ? formatTimeRange(reminder.reminder_time, null)
                                : 'All day'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-xl text-gray-900 dark:text-gray-100">
                  {selectedEvent ? 'Edit Event' : 'Create Event'}
                </h4>
                <button
                  onClick={() => {
                    setShowEventForm(false);
                    setSelectedEvent(null);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedEvent ? 'Event Details' : 'Reminder Details'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowEventDetails(false);
                      setSelectedEvent(null);
                      setSelectedReminder(null);
                    }}
                    className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {selectedEvent && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedEvent.title}
                      </h3>
                      <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-700">
                        {selectedEvent.event_type}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{new Date(selectedEvent.event_date).toLocaleDateString()}</span>
                      </div>

                      {(selectedEvent.start_time || selectedEvent.end_time) && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="w-4 h-4" />
                          <span>
                            {formatTimeRange(selectedEvent.start_time, selectedEvent.end_time)}
                          </span>
                        </div>
                      )}

                      {selectedEvent.location && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <MapPin className="w-4 h-4" />
                          <span>{selectedEvent.location}</span>
                        </div>
                      )}

                      {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Users className="w-4 h-4" />
                          <span>{selectedEvent.participants.join(', ')}</span>
                        </div>
                      )}

                      {selectedEvent.description && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-200">{selectedEvent.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-3 pt-4">
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
                          <>
                            <button
                              onClick={() => {
                                const url = `https://waze.com/ul?q=${encodeURIComponent(selectedEvent.location!)}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-lg hover:from-rose-500 hover:to-pink-500 transition-colors"
                            >
                              Open in Waze
                            </button>
                            <button
                              onClick={() => {
                                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location!)}`;
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-lg hover:from-rose-500 hover:to-pink-500 transition-colors"
                            >
                              Open in Google Maps
                            </button>
                          </>
                        );
                      })()}
                    </div>

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
                              const { error } = await supabase
                                .from('events')
                                .delete()
                                .eq('id', selectedEvent.id);

                              if (!error) {
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
                      <div className="flex items-center space-x-2">
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
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{new Date(selectedReminder.reminder_date).toLocaleDateString()}</span>
                      </div>

                      {selectedReminder.reminder_time && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <Clock className="w-4 h-4" />
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Event from Image</h3>
                <button
                  onClick={() => setShowCamera(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Capture or select an image with event details
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={startCamera}
                  className="aspect-square bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-2xl font-medium hover:from-rose-600 hover:to-rose-700 transition flex flex-col items-center justify-center gap-3 shadow-lg"
                >
                  <Camera className="w-12 h-12" />
                  <span className="text-sm">Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl font-medium hover:from-amber-600 hover:to-amber-700 transition flex flex-col items-center justify-center gap-3 shadow-lg"
                >
                  <Image className="w-12 h-12" />
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
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Camera Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center justify-between">
                <button
                  onClick={closeCamera}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={switchCamera}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition"
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
                >
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <Camera className="w-8 h-8 text-gray-800" />
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl text-center">
              <Loader2 className="w-16 h-16 text-rose-500 animate-spin mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Processing Image</h3>
              <p className="text-gray-600 dark:text-gray-300">AI is analyzing the image for event information...</p>
            </div>
          </div>
        )}

        {/* Extracted Info Modal */}
        {extractedInfo && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Events Found</h3>
              <div className="space-y-4 mb-6">
                {extractedInfo.map((event, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-gray-900 dark:text-gray-100 font-semibold flex-1">{event.title}</h4>
                      <button
                        onClick={() => handleEditEvent(event, i)}
                        className="ml-2 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        title="Edit event"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">📅 {event.date}</p>
                    {event.time && <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">🕐 {event.time}</p>}
                    {event.location && <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">📍 {event.location}</p>}
                    {event.description && <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{event.description}</p>}
                    <button
                      onClick={() => addEventFromImage(event)}
                      className="w-full mt-3 py-2 bg-gradient-to-r from-rose-400 to-pink-400 text-white rounded-lg font-medium hover:from-rose-500 hover:to-pink-500 transition"
                    >
                      Add to Calendar
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setExtractedInfo(null)}
                className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Edit Event Modal */}
        {editingEvent && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Event</h3>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
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
                  <input
                    type="text"
                    value={editingEvent.location || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                    placeholder="Add location"
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
                  onClick={() => setEditingEvent(null)}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
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
              className={`flex items-center space-x-3 px-6 py-4 rounded-xl shadow-2xl border ${
                toast.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
              }`}
            >
              {toast.type === 'success' ? (
                <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              >
                <X className={`w-4 h-4 ${
                  toast.type === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
