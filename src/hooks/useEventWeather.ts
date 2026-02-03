import { useState, useCallback } from 'react';
import { weatherService, EventWeatherData } from '../services/weatherService';

const MORNING_PREFETCH_KEY = 'weather_morning_prefetch_timestamp';
const MORNING_HOUR = 6; // 6 AM local time

/**
 * Check if we need to do a morning prefetch
 * Returns true if it's after 6 AM and we haven't prefetched today
 */
function shouldPrefetchMorning(): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Only prefetch if it's after 6 AM
  if (currentHour < MORNING_HOUR) return false;
  
  const lastPrefetch = localStorage.getItem(MORNING_PREFETCH_KEY);
  if (!lastPrefetch) return true;
  
  const lastPrefetchDate = new Date(lastPrefetch);
  const today = new Date();
  today.setHours(MORNING_HOUR, 0, 0, 0);
  
  // If last prefetch was before 6 AM today, we need to prefetch
  return lastPrefetchDate < today;
}

/**
 * Mark morning prefetch as done
 */
function markMorningPrefetchDone(): void {
  localStorage.setItem(MORNING_PREFETCH_KEY, new Date().toISOString());
}

/**
 * Hook to manage event-specific weather data
 */
export function useEventWeather() {
  const [eventWeatherCache, setEventWeatherCache] = useState<Map<string, EventWeatherData>>(new Map());
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  const [cacheLoaded, setCacheLoaded] = useState(true); // Always true since we use in-memory cache

  /**
   * Generate a cache key for an event
   */
  const getCacheKey = useCallback((location: string, eventDate: string, eventTime?: string | null): string => {
    return `${location.toLowerCase().trim()}_${eventDate}_${eventTime || 'allday'}`;
  }, []);

  /**
   * Get weather for a specific event
   * Only calls API if not cached or forced
   */
  const getEventWeather = useCallback(async (
    location: string,
    eventDate: string,
    eventTime?: string | null,
    force = false
  ): Promise<EventWeatherData | null> => {
    if (!location || !location.trim()) return null;
    
    const cacheKey = getCacheKey(location, eventDate, eventTime);
    
    // Return cached data if available and not forcing refresh
    if (!force && eventWeatherCache.has(cacheKey)) {
      console.log('%c[useEventWeather] 💾 Using local cache (no API call)', 'color: #10b981');
      console.log(`[useEventWeather]   Key: ${cacheKey}`);
      return eventWeatherCache.get(cacheKey)!;
    }
    
    console.log('%c[useEventWeather] 🔄 Fetching weather from API', 'color: #3b82f6; font-weight: bold');
    console.log(`[useEventWeather]   Location: ${location}`);
    console.log(`[useEventWeather]   Date: ${eventDate}`);
    
    // Mark as loading
    setLoadingEvents((prev: Set<string>) => new Set(prev).add(cacheKey));
    
    try {
      const weatherData = await weatherService.getEventWeather(location, eventDate, eventTime, force);
      
      if (weatherData) {
        setEventWeatherCache((prev: Map<string, EventWeatherData>) => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, weatherData);
          return newCache;
        });
      }
      
      return weatherData;
    } catch (error) {
      console.error('[useEventWeather] Error fetching weather:', error);
      return null;
    } finally {
      setLoadingEvents((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
  }, [eventWeatherCache, getCacheKey]);

  /**
   * Check if weather is loading for a specific event
   */
  const isLoading = useCallback((location: string, eventDate: string, eventTime?: string | null): boolean => {
    const cacheKey = getCacheKey(location, eventDate, eventTime);
    return loadingEvents.has(cacheKey);
  }, [loadingEvents, getCacheKey]);

  /**
   * Get cached weather data without fetching
   */
  const getCachedWeather = useCallback((location: string, eventDate: string, eventTime?: string | null): EventWeatherData | null => {
    const cacheKey = getCacheKey(location, eventDate, eventTime);
    return eventWeatherCache.get(cacheKey) || null;
  }, [eventWeatherCache, getCacheKey]);

  /**
   * Perform morning prefetch if needed
   */
  const checkMorningPrefetch = useCallback(async (): Promise<void> => {
    if (!shouldPrefetchMorning()) {
      console.log('%c[useEventWeather] ⏭️ Morning prefetch skipped (already done today)', 'color: #6b7280');
      return;
    }
    
    console.log('%c[useEventWeather] 🌅 Starting morning prefetch...', 'color: #f59e0b; font-weight: bold');
    try {
      await weatherService.prefetchMorningWeather();
      markMorningPrefetchDone();
      console.log('%c[useEventWeather] ✅ Morning prefetch completed and marked', 'color: #22c55e');
    } catch (error) {
      console.error('%c[useEventWeather] ❌ Morning prefetch failed:', 'color: #ef4444', error);
    }
  }, []);

  /**
   * Clear all cached weather data
   */
  const clearCache = useCallback(() => {
    setEventWeatherCache(new Map());
  }, []);

  return {
    getEventWeather,
    getCachedWeather,
    isLoading,
    cacheLoaded,
    checkMorningPrefetch,
    clearCache,
  };
}

export type { EventWeatherData };
