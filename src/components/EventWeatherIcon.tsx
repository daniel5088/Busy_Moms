import React from 'react';
import {
  Umbrella,
  Snowflake,
  Sun,
  Cloud,
  CloudSun,
  CloudLightning,
  CloudFog,
  Wind,
  Loader2,
  Droplets,
  Thermometer,
  Eye,
  X,
} from 'lucide-react';
import { EventWeatherData, WeatherSuggestion } from '../services/weatherService';

interface EventWeatherIconProps {
  weather: EventWeatherData | null;
  loading?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Get the appropriate icon component based on weather suggestion
 */
function getSuggestionIcon(icon: WeatherSuggestion['icon'], className: string) {
  switch (icon) {
    case 'umbrella':
      return <Umbrella className={className} />;
    case 'snowflake':
      return <Snowflake className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'cloud':
      return <Cloud className={className} />;
    case 'cloud-sun':
      return <CloudSun className={className} />;
    case 'cloud-lightning':
      return <CloudLightning className={className} />;
    case 'cloud-fog':
      return <CloudFog className={className} />;
    case 'wind':
      return <Wind className={className} />;
    default:
      return <Cloud className={className} />;
  }
}

/**
 * Get color classes based on severity
 */
function getSeverityClasses(severity: WeatherSuggestion['severity']): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'good':
      return {
        bg: 'bg-green-100 dark:bg-green-900/50',
        text: 'text-green-600 dark:text-green-400',
        border: 'border-green-200 dark:border-green-700',
      };
    case 'info':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/50',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-700',
      };
    case 'warning':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/50',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-700',
      };
    case 'danger':
      return {
        bg: 'bg-red-100 dark:bg-red-900/50',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-700',
      };
  }
}

/**
 * Small weather icon shown next to events with location
 */
export function EventWeatherIcon({ weather, loading, onClick, size = 'sm' }: EventWeatherIconProps) {
  console.log('%c[EventWeatherIcon] Rendering', 'color: #f59e0b; font-weight: bold', {
    hasWeather: !!weather,
    loading,
    weather: weather ? {
      condition: weather.condition,
      location: weather.location,
      hasSuggestion: !!weather.suggestion,
      severity: weather.suggestion?.severity,
      icon: weather.suggestion?.icon,
      hasCoordinates: !!(weather.latitude && weather.longitude),
      latitude: weather.latitude,
      longitude: weather.longitude,
    } : null,
  });

  if (loading) {
    console.log('[EventWeatherIcon] 🔄 Showing loading spinner');
    const containerSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10';
    const spinnerSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';
    return (
      <div className={`flex items-center justify-center ${containerSize}`}>
        <Loader2 className={`${spinnerSize} text-gray-400 animate-spin`} />
      </div>
    );
  }

  // Show placeholder icon when no weather data loaded yet - click to fetch
  if (!weather) {
    console.log('[EventWeatherIcon] ⚪ Showing placeholder (no weather data)');

    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6';
    const containerSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10';
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={`
          ${containerSize} rounded-full 
          bg-gray-100 dark:bg-gray-700
          text-gray-400 dark:text-gray-500
          flex items-center justify-center
          hover:bg-blue-100 dark:hover:bg-blue-900
          hover:text-blue-500 dark:hover:text-blue-400
          hover:scale-110 transition-all
          border border-gray-200 dark:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
        `}
        title="Click to check weather for this event"
        aria-label="Check weather for this event location"
      >
        <CloudSun className={iconSize} />
      </button>
    );
  }

  // Safety check: if weather doesn't have suggestion, show placeholder
  if (!weather.suggestion) {
    console.log('[EventWeatherIcon] ⚠️ Weather data missing suggestion field, showing placeholder');
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6';
    const containerSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10';

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={`
          ${containerSize} rounded-full
          bg-gray-100 dark:bg-gray-700
          text-gray-400 dark:text-gray-500
          flex items-center justify-center
          hover:bg-blue-100 dark:hover:bg-blue-900
          hover:text-blue-500 dark:hover:text-blue-400
          hover:scale-110 transition-all
          border border-gray-200 dark:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
        `}
        title="Click to check weather for this event"
        aria-label="Check weather for this event location"
      >
        <CloudSun className={iconSize} />
      </button>
    );
  }

  console.log('[EventWeatherIcon] 🎨 Showing colored weather icon:', {
    condition: weather.condition,
    severity: weather.suggestion.severity,
    icon: weather.suggestion.icon,
  });

  const colors = getSeverityClasses(weather.suggestion.severity);
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6';
  const containerSize = size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        ${containerSize} rounded-full ${colors.bg} ${colors.text} 
        flex items-center justify-center
        hover:scale-110 transition-transform
        border ${colors.border}
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
      `}
      title={weather.suggestion.text}
      aria-label={`Weather: ${weather.condition}. ${weather.suggestion.text}`}
    >
      {getSuggestionIcon(weather.suggestion.icon, iconSize)}
    </button>
  );
}

interface EventWeatherInsightsModalProps {
  weather: EventWeatherData;
  onClose: () => void;
}

/**
 * Modal showing detailed weather insights for an event
 */
export function EventWeatherInsightsModal({ weather, onClose }: EventWeatherInsightsModalProps) {
  const colors = getSeverityClasses(weather.suggestion.severity);

  // Format date for display
  const eventDateDisplay = new Date(weather.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Format time if available
  const eventTimeDisplay = weather.eventTime
    ? new Date(`2000-01-01T${weather.eventTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'All day';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weather-insights-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className={`${colors.bg} px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-white/80 dark:bg-gray-800/80 flex items-center justify-center ${colors.text}`}>
              {getSuggestionIcon(weather.suggestion.icon, 'w-6 h-6')}
            </div>
            <div>
              <h2 id="weather-insights-title" className="font-semibold text-gray-900 dark:text-gray-100">
                {weather.condition}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {weather.location}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/50 dark:bg-gray-700/50 flex items-center justify-center hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Date & Time */}
          <div className="text-center pb-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{eventDateDisplay}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{eventTimeDisplay}</p>
          </div>

          {/* Suggestion banner */}
          <div className={`${colors.bg} ${colors.text} rounded-xl p-3 flex items-center gap-2`}>
            {getSuggestionIcon(weather.suggestion.icon, 'w-5 h-5')}
            <p className="text-sm font-medium">{weather.suggestion.text}</p>
          </div>

          {/* Weather details grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Temperature */}
            {weather.temperature !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Thermometer className="w-4 h-4" />
                  <span className="text-xs">Temperature</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {Math.round(weather.temperature)}°F
                </p>
                {(weather.temperatureMax !== undefined || weather.temperatureMin !== undefined) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {weather.temperatureMin !== undefined && `L: ${Math.round(weather.temperatureMin)}°`}
                    {weather.temperatureMax !== undefined && weather.temperatureMin !== undefined && ' / '}
                    {weather.temperatureMax !== undefined && `H: ${Math.round(weather.temperatureMax)}°`}
                  </p>
                )}
              </div>
            )}

            {/* Precipitation */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Droplets className="w-4 h-4" />
                <span className="text-xs">Precipitation</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {weather.precipitationProbability}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {weather.precipitationType !== 'none' ? weather.precipitationType : 'chance'}
              </p>
            </div>

            {/* Wind */}
            {weather.windSpeed !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Wind className="w-4 h-4" />
                  <span className="text-xs">Wind</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {Math.round(weather.windSpeed)} mph
                </p>
              </div>
            )}

            {/* Humidity */}
            {weather.humidity !== undefined && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs">Humidity</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {weather.humidity}%
                </p>
              </div>
            )}
          </div>

          {/* UV Index if available and notable */}
          {weather.uvIndex !== undefined && weather.uvIndex >= 6 && (
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    High UV Index: {weather.uvIndex}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Consider wearing sunscreen
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
