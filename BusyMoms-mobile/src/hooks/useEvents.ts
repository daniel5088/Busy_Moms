/**
 * useEvents - React Query hook for fetching and managing events
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Event } from '../types/database';

/**
 * Fetch events for a specific date range
 */
export function useEvents(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', startDate, endDate],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (startDate) {
        query = query.gte('event_date', startDate);
      }

      if (endDate) {
        query = query.lte('event_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as Event[]) || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch events for a specific date
 */
export function useEventsForDate(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', 'date', date],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_date', date)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return (data as Event[]) || [];
    },
    enabled: !!user && !!date,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch events for current month
 */
export function useEventsForMonth(year: number, month: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['events', 'month', year, month],
    queryFn: async () => {
      if (!user) return [];

      // Calculate start and end of month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return (data as Event[]) || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
