import React, { useState, useEffect } from 'react';
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
  Clock,
  Calendar,
} from 'lucide-react';
import { EventWeatherData, WeatherSuggestion } from '../services/weatherService';
import { useEventWeather } from '../hooks/useEventWeather';
import { EventWeatherInsightsModal } from './EventWeatherIcon';

interface MiniEventWeatherIconProps {
  eventId: string;
  location?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  eventDate: string;
  eventTime?: string | null;
  fallbackIcon?: 'clock' | 'calendar';
  onClick?: (e: React.MouseEvent) => void;
}

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

function getSeverityClasses(severity: WeatherSuggestion['severity']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (severity) {
    case 'good':
      return {
        bg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-600 dark:text-green-300',
        border: 'border-green-200 dark:border-green-700',
      };
    case 'info':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-600 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-700',
      };
    case 'warning':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900',
        text: 'text-amber-600 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-700',
      };
    case 'danger':
      return {
        bg: 'bg-red-100 dark:bg-red-900',
        text: 'text-red-600 dark:text-red-300',
        border: 'border-red-200 dark:border-red-700',
      };
  }
}

export function MiniEventWeatherIcon({
  eventId,
  location,
  locationLat,
  locationLng,
  eventDate,
  eventTime,
  fallbackIcon = 'clock',
  onClick,
}: MiniEventWeatherIconProps) {
  const { getEventWeather, getCachedWeather, isLoading } = useEventWeather();
  const [weather, setWeather] = useState<EventWeatherData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (!location || !location.trim() || fetchAttempted) return;

    const cachedWeather = getCachedWeather(location, eventDate, eventTime);
    if (cachedWeather) {
      setWeather(cachedWeather);
      setFetchAttempted(true);
      return;
    }

    const fetchWeather = async () => {
      const weatherData = await getEventWeather(location, eventDate, eventTime);
      if (weatherData) {
        setWeather(weatherData);
      }
      setFetchAttempted(true);
    };

    fetchWeather();
  }, [location, eventDate, eventTime, getEventWeather, getCachedWeather, fetchAttempted]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (weather) {
      setShowModal(true);
    } else if (onClick) {
      onClick(e);
    }
  };

  const loading = isLoading(location || '', eventDate, eventTime);

  if (loading) {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full">
        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!location || !location.trim() || (!weather && fetchAttempted)) {
    const FallbackIcon = fallbackIcon === 'clock' ? Clock : Calendar;
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 dark:bg-rose-900 rounded-full flex items-center justify-center flex-shrink-0">
        <FallbackIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-300" aria-hidden="true" />
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
        <CloudSun className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" aria-hidden="true" />
      </div>
    );
  }

  const colors = getSeverityClasses(weather.suggestion.severity);

  return (
    <>
      <button
        onClick={handleClick}
        className={`
          relative w-10 h-10 sm:w-12 sm:h-12 rounded-full ${colors.bg} ${colors.text}
          flex items-center justify-center flex-shrink-0
          hover:scale-110 transition-transform
          border ${colors.border}
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
          shadow-sm
        `}
        title={`${weather.condition} - ${weather.temperature !== undefined ? Math.round(weather.temperature) + '°F' : ''}`}
        aria-label={`Weather: ${weather.condition}. ${weather.suggestion.text}. Click for details.`}
      >
        {getSuggestionIcon(weather.suggestion.icon, 'w-5 h-5 sm:w-6 sm:h-6')}
        {weather.temperature !== undefined && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-white dark:bg-gray-800 rounded-full px-1.5 py-0.5 shadow-md border border-gray-200 dark:border-gray-600">
            <span className="text-[9px] sm:text-[10px] font-semibold text-gray-900 dark:text-gray-100">
              {Math.round(weather.temperature)}°
            </span>
          </div>
        )}
      </button>

      {showModal && weather && (
        <EventWeatherInsightsModal weather={weather} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
