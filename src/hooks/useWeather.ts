import { useState, useEffect, useCallback } from 'react';
import { weatherService, WeatherData, WeatherSettings } from '../services/weatherService';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [settings, setSettings] = useState<WeatherSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    console.log('[useWeather] Loading settings...');
    try {
      const data = await weatherService.getSettings();
      console.log('[useWeather] Settings loaded:', data);
      setSettings(data);
      return data;
    } catch (err) {
      console.error('[useWeather] Failed to load weather settings:', err);
      return null;
    }
  }, []);

  const loadWeather = useCallback(async (coords?: { latitude: number; longitude: number }) => {
    console.log('[useWeather] loadWeather called with coords:', coords);
    setLoading(true);
    setError(null);
    try {
      const data = await weatherService.getWeatherForLocation(coords);
      console.log('[useWeather] Weather data received:', data);
      setWeather(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load weather';
      console.error('[useWeather] Failed to load weather:', err);
      console.error('[useWeather] Error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
      console.log('[useWeather] Loading complete');
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<WeatherSettings>) => {
    try {
      const updated = await weatherService.updateSettings(newSettings);
      setSettings(updated);
      if (updated.latitude && updated.longitude) {
        await loadWeather({ latitude: updated.latitude, longitude: updated.longitude });
      }
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    }
  }, [loadWeather]);

  useEffect(() => {
    const init = async () => {
      console.log('[useWeather] Initializing...');
      const userSettings = await loadSettings();
      console.log('[useWeather] Init - User settings:', userSettings);

      if (userSettings?.latitude && userSettings?.longitude) {
        console.log('[useWeather] Init - Loading weather with coordinates:', {
          latitude: userSettings.latitude,
          longitude: userSettings.longitude
        });
        await loadWeather({ latitude: userSettings.latitude, longitude: userSettings.longitude });
      } else {
        console.warn('[useWeather] Init - No coordinates in settings, skipping weather load');
        setLoading(false);
      }
      console.log('[useWeather] Init complete');
    };
    init();
  }, [loadSettings, loadWeather]);

  return {
    weather,
    settings,
    loading,
    error,
    loadWeather,
    updateSettings,
    refresh: loadWeather,
  };
}
