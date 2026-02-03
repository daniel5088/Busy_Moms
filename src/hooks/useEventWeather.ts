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
    if (!stored) {
      console.log('%c[useEventWeather] 💾 No cached weather in localStorage', 'color: #6b7280');
      return new Map();
    }

    const parsed = JSON.parse(stored);
    const cache = new Map<string, EventWeatherData>(Object.entries(parsed));
    console.log(`%c[useEventWeather] 💾 Loaded ${cache.size} cached weather items from localStorage`, 'color: #10b981');
    console.log('[useEventWeather] 📦 Cached locations:', Array.from(cache.keys()));
    return cache;
  } catch (error) {
    console.error('[useEventWeather] ❌ Error loading cache from localStorage:', error);
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
    console.log(`%c[useEventWeather] 💾 Saved ${cache.size} weather items to localStorage`, 'color: #10b981');
  } catch (error) {
    console.error('[useEventWeather] ❌ Error saving cache to localStorage:', error);
  }
}

/**
 * Hook to manage event-specific weather data
 */
export function useEventWeather() {
  const [eventWeatherCache, setEventWeatherCache] = useState<Map<string, EventWeatherData>>(() => {
    console.log('%c[useEventWeather] 🚀 Initializing hook, loading cache from localStorage', 'color: #3b82f6; font-weight: bold');
    return loadCacheFromStorage();
  });
  const [loadingEvents, setLoadingEvents] = useState<Set<string>>(new Set());
  const [cacheLoaded, setCacheLoaded] = useState(true); // Always true since we use in-memory cache
  const [cacheVersion, setCacheVersion] = useState(0); // Increment to force component updates

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    if (eventWeatherCache.size > 0) {
      console.log(`%c[useEventWeather] 📝 Cache changed, persisting ${eventWeatherCache.size} items to localStorage`, 'color: #8b5cf6');
      saveCacheToStorage(eventWeatherCache);
    }
  }, [eventWeatherCache]);

  /**
   * Generate a cache key for an event
   */
  const getCacheKey = useCallback(async (location: string, eventDate: string, eventTime?: string | null): Promise<string> => {
    const settings = await weatherService.getSettings();
    const unitsSystem = settings?.temperature_unit === 'celsius' ? 'metric' : 'imperial';

    const key = generateWeatherCacheKey(location, eventDate, eventTime, unitsSystem);

    console.log(`[useEventWeather] Generated cache key:`, {
      location,
      eventDate,
      eventTime,
      unitsSystem,
      key
    });

    return key;
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

    const cacheKey = await getCacheKey(location, eventDate, eventTime);

    // Return cached data if available and not forcing refresh
    if (!force && eventWeatherCache.has(cacheKey)) {
      console.log('%c[useEventWeather] 💾 Using in-memory cache (no API call)', 'color: #10b981');
      console.log(`[useEventWeather]   Key: ${cacheKey}`);
      return eventWeatherCache.get(cacheKey)!;
    }

    // Check Supabase cache before calling API
    if (!force) {
      console.log('%c[useEventWeather] 🔍 Checking Supabase cache...', 'color: #8b5cf6');
      try {
        const { data: cachedRow } = await supabase
          .from('weather_cache')
          .select('weather_data, expires_at')
          .eq('location_key', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cachedRow?.weather_data) {
          console.log('%c[useEventWeather] ✅ Supabase cache HIT', 'color: #22c55e; font-weight: bold');
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
        } else {
          console.log('%c[useEventWeather] ⚠️ Supabase cache MISS', 'color: #f59e0b');
        }
      } catch (error) {
        console.error('[useEventWeather] ❌ Error checking Supabase cache:', error);
      }
    }

    console.log('%c[useEventWeather] 🔄 Fetching weather from API', 'color: #3b82f6; font-weight: bold');
    console.log(`[useEventWeather]   Location: ${location}`);
    console.log(`[useEventWeather]   Date: ${eventDate}`);

    // Mark as loading
    setLoadingEvents((prev: Set<string>) => new Set(prev).add(cacheKey));

    try {
      const weatherData = await weatherService.getEventWeather(location, eventDate, eventTime, force);

      console.log(`[useEventWeather] ✅ Fetched weather data for ${cacheKey}:`, weatherData ? {
        condition: weatherData.condition,
        temperature: weatherData.temperature,
        location: weatherData.location
      } : null);

      if (weatherData) {
        setEventWeatherCache((prev: Map<string, EventWeatherData>) => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, weatherData);
          console.log(`[useEventWeather] 💾 Stored in cache with key ${cacheKey}. Total cached: ${newCache.size}`);
          console.log(`[useEventWeather] 📦 All cache keys:`, Array.from(newCache.keys()));
          return newCache;
        });

        // Increment cache version to trigger component updates
        setCacheVersion((v) => {
          const newVersion = v + 1;
          console.log(`[useEventWeather] 🔄 Cache version updated: ${v} -> ${newVersion}`);
          return newVersion;
        });
      }

      return weatherData;
    } catch (error) {
      console.error('[useEventWeather] ❌ Error fetching weather:', error);
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
  const isLoading = useCallback(async (location: string, eventDate: string, eventTime?: string | null): Promise<boolean> => {
    const cacheKey = await getCacheKey(location, eventDate, eventTime);
    return loadingEvents.has(cacheKey);
  }, [loadingEvents, getCacheKey]);

  /**
   * Get cached weather data without fetching
   */
  const getCachedWeather = useCallback(async (location: string, eventDate: string, eventTime?: string | null): Promise<EventWeatherData | null> => {
    const cacheKey = await getCacheKey(location, eventDate, eventTime);
    const cached = eventWeatherCache.get(cacheKey) || null;

    console.log(`%c[useEventWeather] 🔍 Cache lookup`, 'color: #8b5cf6; font-weight: bold');
    console.log(`   Looking for key: "${cacheKey}"`);
    console.log(`   Key components:`, {
      originalLocation: location,
      normalizedLocation: location.trim().toLowerCase(),
      originalDate: eventDate,
      normalizedDate: eventDate.trim(),
      originalTime: eventTime,
      normalizedTime: eventTime?.trim() || 'allday',
    });
    console.log(`   Found: ${!!cached}`);

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
