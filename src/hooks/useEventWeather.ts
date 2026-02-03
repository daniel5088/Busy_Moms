import { useState, useCallback, useEffect } from 'react';
import { weatherService, EventWeatherData } from '../services/weatherService';
import { generateWeatherCacheKey } from '../utils/weatherCacheKey';
import { supabase } from '../lib/supabase';

const MORNING_PREFETCH_KEY = 'weather_morning_prefetch_timestamp';
const WEATHER_CACHE_KEY = 'event_weather_cache';
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
 * Load weather cache from localStorage
 */
function loadCacheFromStorage(): Map<string, EventWeatherData> {
  try {
    const stored = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored);
    const cache = new Map<string, EventWeatherData>(Object.entries(parsed));
    return cache;
  } catch (error) {
    console.error('[Weather] Error loading cache:', error);
    return new Map();
  }
}

/**
 * Save weather cache to localStorage
 */
function saveCacheToStorage(cache: Map<string, EventWeatherData>): void {
  try {
    const obj = Object.fromEntries(cache.entries());
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(obj));
  } catch (error) {
    console.error('[Weather] Error saving cache:', error);
  }
}

/**
 * Hook to manage event-specific weather data
 */
export function useEventWeather() {
  const [eventWeatherCache, setEventWeatherCache] = useState<Map<string, EventWeatherData>>(() => {
    return loadCacheFromStorage();
  });
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  const [cacheLoaded, setCacheLoaded] = useState(true); // Always true since we use in-memory cache
  const [cacheVersion, setCacheVersion] = useState(0); // Increment to force component updates
  const [unitsSystem, setUnitsSystem] = useState<'imperial' | 'metric'>('imperial');

  // Load user settings once on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await weatherService.getSettings();
      const units = settings?.temperature_unit === 'celsius' ? 'metric' : 'imperial';
      setUnitsSystem(units);
    }
    loadSettings();
  }, []);

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    if (eventWeatherCache.size > 0) {
      saveCacheToStorage(eventWeatherCache);
    }
  }, [eventWeatherCache]);

  /**
   * Generate a cache key for an event (synchronous)
   */
  const getCacheKey = useCallback((location: string, eventDate: string, eventTime?: string | null): string => {
    return generateWeatherCacheKey(location, eventDate, eventTime, unitsSystem);
  }, [unitsSystem]);

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
      console.log(`[Weather] ✓ Cache hit: ${location}`);
      return eventWeatherCache.get(cacheKey)!;
    }

    // Check Supabase cache before calling API
    if (!force) {
      try {
        const { data: cachedRow } = await supabase
          .from('weather_cache')
          .select('weather_data, expires_at')
          .eq('location_key', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cachedRow?.weather_data) {
          console.log(`[Weather] ✓ DB cache hit: ${location}`);
          const parsed = weatherService.parseEventWeatherFromCache(cachedRow.weather_data);

          if (parsed) {
            // Store in memory cache for faster subsequent access
            setEventWeatherCache((prev: Map<string, EventWeatherData>) => {
              const newCache = new Map(prev);
              newCache.set(cacheKey, parsed);
              return newCache;
            });

            setCacheVersion((v) => v + 1);
            return parsed;
          }
        }
      } catch (error) {
        console.error('[Weather] Cache check error:', error);
      }
    }

    console.log(`[Weather] → API call: ${location}, ${eventDate}`);

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

        setCacheVersion((v) => v + 1);
      }

      return weatherData;
    } catch (error) {
      console.error('[Weather] API error:', error);
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
    const cached = eventWeatherCache.get(cacheKey) || null;

    if (cached) {
      console.log(`   ✅ Cache HIT:`, {
        condition: cached.condition,
        temperature: cached.temperature,
        location: cached.location,
      });
    } else {
      console.log(`   ❌ Cache MISS`);
      console.log(`   Total items in cache: ${eventWeatherCache.size}`);
      console.log(`   All cached keys:`, Array.from(eventWeatherCache.keys()));
    }

    return cached;
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
    console.log('%c[useEventWeather] 🗑️ Clearing weather cache', 'color: #ef4444');
    setEventWeatherCache(new Map());
    localStorage.removeItem(WEATHER_CACHE_KEY);
  }, []);

  return {
    getEventWeather,
    getCachedWeather,
    isLoading,
    cacheLoaded,
    cacheVersion,
    checkMorningPrefetch,
    clearCache,
  };
}

export type { EventWeatherData };
