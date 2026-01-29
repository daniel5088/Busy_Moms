import { useState, useEffect, useCallback } from 'react';
import { weatherService, WeatherData, WeatherSettings } from '../services/weatherService';

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [settings, setSettings] = useState<WeatherSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await weatherService.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      console.error('Failed to load weather settings:', err);
      return null;
    }
  }, []);

  const loadWeather = useCallback(async (coords?: { latitude: number; longitude: number }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await weatherService.getWeatherForLocation(coords);
      setWeather(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weather');
      console.error('Failed to load weather:', err);
    } finally {
      setLoading(false);
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
      const userSettings = await loadSettings();
      if (userSettings?.latitude && userSettings?.longitude) {
        await loadWeather({ latitude: userSettings.latitude, longitude: userSettings.longitude });
      } else {
        setLoading(false);
      }
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
