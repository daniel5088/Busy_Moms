/**
 * useEventWeather - Hook for fetching weather forecast for events
 * Reuses weatherService from Phase 4
 */

import { useQuery } from '@tanstack/react-query';
import { Event } from '../types/database';
import { weatherService } from '../services/weatherService';

/**
 * Fetch weather forecast for an event
 * Only works for events within the next 7 days and with a location
 */
export function useEventWeather(event: Event | null) {
  const eventDate = event?.event_date ? new Date(event.event_date) : null;
  const today = new Date();
  const daysUntilEvent = eventDate
    ? Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const shouldFetch =
    !!event &&
    !!event.location &&
    !!eventDate &&
    daysUntilEvent !== null &&
    daysUntilEvent >= 0 &&
    daysUntilEvent <= 7;

  return useQuery({
    queryKey: ['event-weather', event?.id],
    queryFn: async () => {
      if (!event || !event.location) {
        return null;
      }

      return weatherService.getEventWeather(
        event.location,
        event.event_date,
        event.start_time
      );
    },
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
