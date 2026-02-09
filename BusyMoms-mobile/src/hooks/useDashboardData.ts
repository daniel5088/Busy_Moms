import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { getTodayISO, getDateInDays } from '../utils/timeFormatters';
import { Event, ShoppingItem, Reminder } from '../types/database';

interface DashboardDataResult {
  todayEvents: Event[];
  thisWeekEvents: Event[];
  tasks: ShoppingItem[];
  reminders: Reminder[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch today's events for the dashboard
 */
export function useTodayEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', 'today', user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.email) {
        return [];
      }

      const today = getTodayISO();

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to_email.eq.${user.email}`)
        .eq('event_date', today)
        .order('start_time', { ascending: true, nullsFirst: true });

      if (error) throw error;

      return data || [];
    },
    enabled: !!user?.id && !!user?.email,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch this week's events (excluding today)
 */
export function useThisWeekEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', 'thisWeek', user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.email) {
        return [];
      }

      const today = getTodayISO();
      const nextWeek = getDateInDays(7);

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to_email.eq.${user.email}`)
        .gt('event_date', today)
        .lte('event_date', nextWeek)
        .order('event_date', { ascending: true });

      if (error) throw error;

      return data || [];
    },
    enabled: !!user?.id && !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch active shopping items
 */
export function useShoppingTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shopping', 'active', user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.email) {
        return [];
      }

      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .or(`user_id.eq.${user.id},assigned_to_email.eq.${user.email}`)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!user?.id && !!user?.email,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch active reminders for this week
 */
export function useReminders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reminders', 'thisWeek', user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.email) {
        return [];
      }

      const today = getTodayISO();
      const nextWeek = getDateInDays(7);

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .or(`user_id.eq.${user.id},family_member_email.eq.${user.email}`)
        .eq('completed', false)
        .gte('reminder_date', today)
        .lte('reminder_date', nextWeek)
        .order('reminder_date', { ascending: true })
        .order('reminder_time', { ascending: true });

      if (error) throw error;

      return data || [];
    },
    enabled: !!user?.id && !!user?.email,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Combined hook for dashboard data
 * Fetches all dashboard data and provides a unified interface
 */
export function useDashboardData(): DashboardDataResult {
  const queryClient = useQueryClient();
  const todayEventsQuery = useTodayEvents();
  const thisWeekEventsQuery = useThisWeekEvents();
  const tasksQuery = useShoppingTasks();
  const remindersQuery = useReminders();

  const loading =
    todayEventsQuery.isLoading ||
    thisWeekEventsQuery.isLoading ||
    tasksQuery.isLoading ||
    remindersQuery.isLoading;

  const error =
    todayEventsQuery.error ||
    thisWeekEventsQuery.error ||
    tasksQuery.error ||
    remindersQuery.error;

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    queryClient.invalidateQueries({ queryKey: ['shopping'] });
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
  };

  return {
    todayEvents: todayEventsQuery.data || [],
    thisWeekEvents: thisWeekEventsQuery.data || [],
    tasks: tasksQuery.data || [],
    reminders: remindersQuery.data || [],
    loading,
    error: error as Error | null,
    refetch,
  };
}
