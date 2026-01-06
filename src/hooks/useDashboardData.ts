import { useState, useEffect, useCallback } from 'react';
import { supabase, Event, ShoppingItem, Reminder } from '../lib/supabase';
import { useAuth } from './useAuth';
import { getTodayISO, getDateInDays } from '../utils/timeFormatters';

interface DashboardData {
  events: Event[];
  todayEvents: Event[];
  thisWeekEvents: Event[];
  tasks: ShoppingItem[];
  reminders: Reminder[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Custom hook to load and manage dashboard data (events, tasks, reminders)
 * @returns Dashboard data, loading state, error, and reload function
 */
export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [thisWeekEvents, setThisWeekEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<ShoppingItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const today = getTodayISO();
      const nextWeek = getDateInDays(7);

      // Load upcoming events for next 7 days
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', today)
        .lte('event_date', nextWeek)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;

      setEvents(eventsData || []);

      // Filter and sort today's events
      const todayEventsFiltered = (eventsData || [])
        .filter((event) => event.event_date === today)
        .sort((a, b) => {
          // Sort by start_time, putting all-day events (no start_time) first
          if (!a.start_time && !b.start_time) return 0;
          if (!a.start_time) return -1;
          if (!b.start_time) return 1;
          return a.start_time.localeCompare(b.start_time);
        });

      setTodayEvents(todayEventsFiltered);

      // Filter this week's events (excluding today)
      const thisWeekEventsFiltered = (eventsData || []).filter(
        (event) => event.event_date !== today
      );

      setThisWeekEvents(thisWeekEventsFiltered);

      // Load incomplete shopping items (tasks)
      const { data: tasksData, error: tasksError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      setTasks(tasksData || []);

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

      if (remindersError) throw remindersError;

      setReminders(remindersData || []);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('📊 Dashboard data update event received, reloading...');
      loadDashboardData();
    };

    window.addEventListener('dashboard-data-updated', handleDataUpdate);

    return () => {
      window.removeEventListener('dashboard-data-updated', handleDataUpdate);
    };
  }, [loadDashboardData]);

  return {
    events,
    todayEvents,
    thisWeekEvents,
    tasks,
    reminders,
    loading,
    error,
    reload: loadDashboardData,
  };
}
