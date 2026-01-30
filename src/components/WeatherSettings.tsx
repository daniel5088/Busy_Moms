import { useState, useEffect } from 'react';
import { MapPin, Save, Loader, Locate } from 'lucide-react';
import { WeatherSettings as IWeatherSettings } from '../services/weatherService';
import { LocationAutocomplete } from './LocationAutocomplete';

interface WeatherSettingsProps {
  settings: IWeatherSettings | null;
  onSave: (settings: Partial<IWeatherSettings>) => Promise<void>;
}

export function WeatherSettings({ settings, onSave }: WeatherSettingsProps) {
  const [formData, setFormData] = useState<Partial<IWeatherSettings>>({
    default_location: '',
    latitude: undefined,
    longitude: undefined,
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    include_current: true,
    include_hourly: true,
    include_daily: true,
    hourly_hours: 24,
    daily_days: 7,
  });
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        default_location: settings.default_location || '',
        latitude: settings.latitude,
        longitude: settings.longitude,
        temperature_unit: settings.temperature_unit || 'fahrenheit',
        wind_speed_unit: settings.wind_speed_unit || 'mph',
        precipitation_unit: settings.precipitation_unit || 'inch',
        include_current: settings.include_current !== false,
        include_hourly: settings.include_hourly !== false,
        include_daily: settings.include_daily !== false,
        hourly_hours: settings.hourly_hours || 24,
        daily_days: settings.daily_days || 7,
      });
    }
  }, [settings]);

  const handleLocationSelect = (location: { name: string; latitude: number; longitude: number }) => {
    setFormData(prev => ({
      ...prev,
      default_location: location.name,
      latitude: location.latitude,
      longitude: location.longitude,
    }));
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation is not supported by your browser' });
      return;
    }

    setGettingLocation(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const locationName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          setFormData(prev => ({
            ...prev,
            default_location: locationName,
            latitude,
            longitude,
          }));
          setMessage({ type: 'success', text: 'Location detected successfully' });
        } catch (error) {
          setFormData(prev => ({
            ...prev,
            default_location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            latitude,
            longitude,
          }));
          setMessage({ type: 'success', text: 'Location detected' });
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Unable to get your location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'Location request timed out';
        }
        setMessage({ type: 'error', text: errorMessage });
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await onSave(formData);
      setMessage({ type: 'success', text: 'Weather settings saved successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Weather Settings
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Location
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <LocationAutocomplete
                value={formData.default_location || ''}
                onSelect={handleLocationSelect}
                placeholder="Enter city or location"
              />
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={gettingLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              title="Use current location"
            >
              {gettingLocation ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Locate className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Auto Detect</span>
            </button>
          </div>
          {formData.latitude && formData.longitude && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temperature Unit
            </label>
            <select
              value={formData.temperature_unit}
              onChange={(e) => setFormData(prev => ({ ...prev, temperature_unit: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="fahrenheit">Fahrenheit (°F)</option>
              <option value="celsius">Celsius (°C)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wind Speed Unit
            </label>
            <select
              value={formData.wind_speed_unit}
              onChange={(e) => setFormData(prev => ({ ...prev, wind_speed_unit: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="mph">Miles per hour (mph)</option>
              <option value="kmh">Kilometers per hour (km/h)</option>
              <option value="ms">Meters per second (m/s)</option>
              <option value="kn">Knots (kn)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Precipitation Unit
            </label>
            <select
              value={formData.precipitation_unit}
              onChange={(e) => setFormData(prev => ({ ...prev, precipitation_unit: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="inch">Inches (in)</option>
              <option value="mm">Millimeters (mm)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Forecast Settings
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.include_current}
                onChange={(e) => setFormData(prev => ({ ...prev, include_current: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include current weather</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.include_hourly}
                onChange={(e) => setFormData(prev => ({ ...prev, include_hourly: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include hourly forecast</span>
            </label>

            {formData.include_hourly && (
              <div className="ml-6">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Hours to include (1-168)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={formData.hourly_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourly_hours: parseInt(e.target.value) }))}
                  className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.include_daily}
                onChange={(e) => setFormData(prev => ({ ...prev, include_daily: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Include daily forecast</span>
            </label>

            {formData.include_daily && (
              <div className="ml-6">
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Days to include (1-16)
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={formData.daily_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_days: parseInt(e.target.value) }))}
                  className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !formData.latitude || !formData.longitude}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </form>
    </div>
  );
}
