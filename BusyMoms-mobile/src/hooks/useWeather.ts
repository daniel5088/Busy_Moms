import { useQuery } from '@tanstack/react-query';
import { weatherService } from '../services/weatherService';

interface UseWeatherOptions {
  location?: { latitude: number; longitude: number };
  enabled?: boolean;
}

export function useWeather(options: UseWeatherOptions = {}) {
  return useQuery({
    queryKey: ['weather', options.location],
    queryFn: async () => {
      try {
        const data = await weatherService.getWeatherForLocation(options.location);
        return data;
      } catch (error) {
        console.error('[useWeather] Error fetching weather:', error);
        throw error;
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: options.enabled !== false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

export function useEventWeather(
  location: string,
  eventDate: string,
  eventTime?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['eventWeather', location, eventDate, eventTime],
    queryFn: async () => {
      try {
        const data = await weatherService.getEventWeather(location, eventDate, eventTime);
        return data;
      } catch (error) {
        console.error('[useEventWeather] Error fetching event weather:', error);
        return null;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (event weather changes less frequently)
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: enabled && !!location && !!eventDate,
    retry: 1,
  });
}

export function useWeatherSettings() {
  return useQuery({
    queryKey: ['weatherSettings'],
    queryFn: async () => {
      return await weatherService.getSettings();
    },
    staleTime: Infinity, // Settings rarely change
    gcTime: Infinity,
  });
}
