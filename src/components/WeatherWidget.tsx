import React from 'react';
import { Cloud, Droplets, Wind, MapPin, Settings, Sun, Moon, CloudRain, CloudSnow, CloudDrizzle, CloudLightning, CloudFog, Zap, Gauge, Leaf } from 'lucide-react';
import { WeatherData, WeatherSettings } from '../services/weatherService';
import { useDarkMode } from '../hooks/useDarkMode';
import { WeatherSkeleton } from './WeatherSkeleton';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  locationName?: string;
  onOpenSettings?: () => void;
  settings?: WeatherSettings | null;
}

// Enhanced weather icon component
function WeatherIcon({ weatherCode, isNight, size = 'large' }: { weatherCode: number, isNight: boolean, size?: 'small' | 'large' }) {
  const iconSize = size === 'large' ? 'w-24 h-24' : 'w-14 h-14';
  const glowSize = size === 'large' ? '80px' : '40px';
  const dropletSize = size === 'large' ? 'w-6 h-6' : 'w-4 h-4';
  const accentSize = size === 'large' ? 'w-10 h-10' : 'w-5 h-5';
  const windSize = size === 'large' ? 'w-8 h-8' : 'w-4 h-4';
  
  // Clear sky
  if (weatherCode === 0) {
    if (isNight) {
      return (
        <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
          <div 
            className="absolute inset-0 blur-xl opacity-60"
            style={{
              background: 'radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, transparent 70%)',
              width: glowSize,
              height: glowSize,
              margin: 'auto',
            }}
          />
          <Moon className={`${iconSize} text-blue-200 relative z-10 drop-shadow-2xl`} fill="currentColor" />
        </div>
      );
    }
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <div 
          className="absolute inset-0 blur-2xl opacity-70 animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.5) 0%, transparent 70%)',
            width: glowSize,
            height: glowSize,
            margin: 'auto',
          }}
        />
        <Sun className={`${iconSize} text-yellow-400 relative z-10 drop-shadow-2xl`} fill="currentColor" />
      </div>
    );
  }
  
  // Partly cloudy
  if (weatherCode <= 3) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        {isNight ? (
          <>
            <Moon className={`${iconSize} text-blue-200 absolute ${size === 'large' ? 'top-2 left-2' : 'top-0 left-0'} opacity-70`} fill="currentColor" />
            <Cloud className={`${iconSize} text-slate-300 absolute ${size === 'large' ? 'bottom-2 right-2' : 'bottom-0 right-0'}`} fill="currentColor" strokeWidth={1} />
          </>
        ) : (
          <>
            <Sun className={`${iconSize} text-yellow-400 absolute ${size === 'large' ? 'top-2 left-2' : 'top-0 left-0'} opacity-80`} fill="currentColor" />
            <Cloud className={`${iconSize} text-white absolute ${size === 'large' ? 'bottom-2 right-2' : 'bottom-0 right-0'} drop-shadow-lg`} fill="currentColor" strokeWidth={1} />
          </>
        )}
      </div>
    );
  }
  
  // Fog
  if (weatherCode <= 48) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <CloudFog className={`${iconSize} text-gray-400 drop-shadow-xl relative z-10`} strokeWidth={1.5} />
        <div className="absolute inset-0 blur-md opacity-50 flex items-center justify-center">
          <CloudFog className={`${iconSize} text-gray-300`} />
        </div>
      </div>
    );
  }
  
  // Drizzle
  if (weatherCode <= 57) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <CloudDrizzle className={`${iconSize} text-blue-300 drop-shadow-xl`} strokeWidth={1.5} />
        <Droplets className={`${dropletSize} text-blue-400 absolute ${size === 'large' ? 'bottom-4 right-4' : 'bottom-1 right-1'} opacity-60 animate-bounce`} />
      </div>
    );
  }
  
  // Rain
  if (weatherCode <= 65) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <CloudRain className={`${iconSize} text-blue-400 drop-shadow-xl`} strokeWidth={1.5} fill="rgba(59, 130, 246, 0.2)" />
        <div className="absolute inset-0 animate-pulse flex items-center justify-center">
          <Droplets className={`${dropletSize} text-blue-500 absolute ${size === 'large' ? 'bottom-3 left-3' : 'bottom-1 left-1'} opacity-70`} />
        </div>
      </div>
    );
  }
  
  // Freezing rain
  if (weatherCode <= 67) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <CloudRain className={`${iconSize} text-cyan-300 drop-shadow-xl`} strokeWidth={1.5} />
        <div className="absolute inset-0">
          <div className={`${size === 'large' ? 'w-2 h-2' : 'w-1.5 h-1.5'} bg-cyan-200 rounded-full absolute ${size === 'large' ? 'bottom-4 left-4' : 'bottom-2 left-2'} animate-ping`} />
          <div className={`${size === 'large' ? 'w-2 h-2' : 'w-1.5 h-1.5'} bg-cyan-200 rounded-full absolute ${size === 'large' ? 'bottom-5 right-5' : 'bottom-2 right-2'} animate-ping`} style={{ animationDelay: '0.5s' }} />
        </div>
      </div>
    );
  }
  
  // Snow
  if (weatherCode <= 77) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <CloudSnow className={`${iconSize} text-blue-100 drop-shadow-2xl`} strokeWidth={1.5} fill="rgba(219, 234, 254, 0.3)" />
        <div className="absolute inset-0">
          <div className={`${size === 'large' ? 'text-base' : 'text-xs'} text-white opacity-80 absolute ${size === 'large' ? 'bottom-3 left-4' : 'bottom-1 left-1'} animate-bounce`}>❄</div>
          <div className={`${size === 'large' ? 'text-base' : 'text-xs'} text-white opacity-80 absolute ${size === 'large' ? 'bottom-5 right-4' : 'bottom-2 right-1'} animate-bounce`} style={{ animationDelay: '0.3s' }}>❄</div>
        </div>
      </div>
    );
  }
  
  // Rain showers
  if (weatherCode <= 82) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <CloudRain className={`${iconSize} text-blue-500 drop-shadow-xl animate-pulse`} strokeWidth={1.5} fill="rgba(59, 130, 246, 0.3)" />
        <Wind className={`${windSize} text-slate-400 absolute ${size === 'large' ? 'top-2 right-2' : 'top-0 right-0'} opacity-40`} />
      </div>
    );
  }
  
  // Snow showers
  if (weatherCode <= 86) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
        <CloudSnow className={`${iconSize} text-blue-200 drop-shadow-xl animate-pulse`} strokeWidth={1.5} fill="rgba(219, 234, 254, 0.4)" />
        <Wind className={`${windSize} text-slate-300 absolute ${size === 'large' ? 'top-2 right-2' : 'top-0 right-0'} opacity-40`} />
      </div>
    );
  }
  
  // Thunderstorm
  return (
    <div className="relative flex items-center justify-center" style={{ width: size === 'large' ? '120px' : '60px', height: size === 'large' ? '120px' : '60px' }}>
      <CloudLightning className={`${iconSize} text-slate-600 drop-shadow-2xl`} strokeWidth={1.5} fill="rgba(71, 85, 105, 0.4)" />
      <div className="absolute inset-0 animate-pulse flex items-center justify-center">
        <Zap className={`${accentSize} text-yellow-400 absolute ${size === 'large' ? 'bottom-2' : 'bottom-0'} left-1/2 -translate-x-1/2 drop-shadow-lg`} fill="currentColor" />
      </div>
      <div 
        className="absolute inset-0 blur-xl opacity-40 animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.4) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

// Get the hour in the location's timezone
function getLocationHour(utcOffsetSeconds?: number): number {
  if (utcOffsetSeconds !== undefined) {
    const now = new Date();
    // Get current UTC time in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    // Add the location's offset to get local time at that location
    const locationTime = new Date(utcTime + (utcOffsetSeconds * 1000));
    return locationTime.getHours();
  }
  // Fallback to browser time
  return new Date().getHours();
}

// Get time-based gradient using location's timezone
function getTimeBasedGradient(isDark: boolean, utcOffsetSeconds?: number): string {
  const hour = getLocationHour(utcOffsetSeconds);
  
  if (isDark) {
    // Night time (8pm - 6am)
    if (hour >= 20 || hour < 6) {
      return 'from-[#0f0f23] via-[#1a1a3e] to-[#0f172a]';
    }
    // Dawn/Dusk (6am-8am or 6pm-8pm)
    else if ((hour >= 6 && hour < 8) || (hour >= 18 && hour < 20)) {
      return 'from-[#1e1e3f] via-[#2d1b4e] to-[#1a1a3e]';
    }
    // Daytime
    else {
      return 'from-[#1e2a47] via-[#2d3e5f] to-[#1a2a47]';
    }
  } else {
    // Night time (8pm - 6am)
    if (hour >= 20 || hour < 6) {
      return 'from-[#2d3561] via-[#4a5578] to-[#2d3561]';
    }
    // Sunrise (6am-8am)
    else if (hour >= 6 && hour < 8) {
      return 'from-[#FFE5B4] via-[#FFD6A0] to-[#FFC680]';
    }
    // Morning (8am-12pm)
    else if (hour >= 8 && hour < 12) {
      return 'from-[#87CEEB] via-[#B0E2FF] to-[#87CEEB]';
    }
    // Afternoon (12pm-6pm)
    else if (hour >= 12 && hour < 18) {
      return 'from-[#FFE89C] via-[#FFD67A] to-[#FFA07A]';
    }
    // Sunset (6pm-8pm)
    else {
      return 'from-[#FF9A76] via-[#FF6B9D] to-[#C06C84]';
    }
  }
}

// Get weather-based gradient overlay
function getWeatherGradient(weatherCode: number, isDark: boolean): string {
  // Clear sky
  if (weatherCode === 0) {
    return isDark 
      ? 'from-[#1a1f3a]/90 via-[#2a3555]/80 to-[#1a1f3a]/90'
      : 'from-[#FFD93D]/20 via-[#FFA500]/10 to-transparent';
  }
  // Partly cloudy
  if (weatherCode <= 3) {
    return isDark
      ? 'from-[#2d3e5f]/90 via-[#3d4e6f]/80 to-[#2d3e5f]/90'
      : 'from-[#87CEEB]/30 via-[#B0E2FF]/20 to-transparent';
  }
  // Foggy
  if (weatherCode <= 48) {
    return isDark
      ? 'from-[#3a3a4a]/90 via-[#4a4a5a]/80 to-[#3a3a4a]/90'
      : 'from-[#D3D3D3]/40 via-[#C0C0C0]/30 to-transparent';
  }
  // Rainy
  if (weatherCode <= 65) {
    return isDark
      ? 'from-[#1e2a3a]/90 via-[#2e3a4a]/80 to-[#1e2a3a]/90'
      : 'from-[#4682B4]/30 via-[#5F9EA0]/20 to-transparent';
  }
  // Snowy
  if (weatherCode <= 77) {
    return isDark
      ? 'from-[#2d3e50]/90 via-[#3d4e60]/80 to-[#2d3e50]/90'
      : 'from-[#E0F2F7]/40 via-[#B0E0E6]/30 to-transparent';
  }
  // Stormy
  if (weatherCode <= 86) {
    return isDark
      ? 'from-[#1a1a2e]/90 via-[#2a2a3e]/80 to-[#1a1a2e]/90'
      : 'from-[#4B4B5E]/40 via-[#5B5B6E]/30 to-transparent';
  }
  // Thunderstorm
  return isDark
    ? 'from-[#0f0f1a]/90 via-[#1f1f2a]/80 to-[#0f0f1a]/90'
    : 'from-[#2C2C3E]/50 via-[#3C3C4E]/40 to-transparent';
}

// Get background gradient that combines time and weather
function getBackgroundGradient(weatherCode: number | undefined, isDark: boolean, utcOffsetSeconds?: number): string {
  const timeGradient = getTimeBasedGradient(isDark, utcOffsetSeconds);
  return timeGradient;
}

// Check if it's night time in the location's timezone
function isNightTime(utcOffsetSeconds?: number): boolean {
  // If we have UTC offset from the weather data, use it to calculate the location's local time
  if (utcOffsetSeconds !== undefined) {
    const now = new Date();
    // Get current UTC time in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    // Add the location's offset to get local time at that location
    const locationTime = new Date(utcTime + (utcOffsetSeconds * 1000));
    const hour = locationTime.getHours();
    return hour >= 20 || hour < 6;
  }
  // Fallback to browser time
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

function getHourInfo(timeString: string): { label: string; hour: number } {
  const match = timeString.match(/T(\d{2}):/);
  const hour = match ? parseInt(match[1], 10) : 0;
  const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
  return { label, hour };
}

export function WeatherWidget({ weather, loading, error, locationName, onOpenSettings, settings }: WeatherWidgetProps) {
  const { darkMode } = useDarkMode();
  const isDark = darkMode;
  const isNight = isNightTime(weather?.utc_offset_seconds);
  const bgGradient = getBackgroundGradient(weather?.current?.weather_code, isDark, weather?.utc_offset_seconds);
  const weatherOverlay = weather?.current?.weather_code 
    ? getWeatherGradient(weather.current.weather_code, isDark)
    : '';

  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (weather?.daily?.length) {
      setSelectedDay((prev) => (prev && weather.daily.some((day) => day.date === prev) ? prev : weather.daily[0].date));
    } else {
      setSelectedDay(null);
    }
  }, [weather?.daily]);

  const selectedDayDetails = React.useMemo(() => {
    if (!selectedDay || !weather?.daily) {
      return null;
    }
    return weather.daily.find((day) => day.date === selectedDay) ?? null;
  }, [selectedDay, weather?.daily]);

  const selectedDayHourly = React.useMemo(() => {
    if (!selectedDay) {
      return [];
    }
    const source = weather?.fullHourly && weather.fullHourly.length > 0 ? weather.fullHourly : weather?.hourly ?? [];
    if (!source.length) {
      return [];
    }
    return source
      .filter((hour) => hour.time.startsWith(selectedDay))
      .sort((a, b) => (a.time > b.time ? 1 : -1));
  }, [selectedDay, weather?.fullHourly, weather?.hourly]);

  const selectedDayLabel = React.useMemo(() => {
    if (!selectedDay) {
      return '';
    }
    const [year, month, day] = selectedDay.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDay]);
  
  // Display settings with defaults
  const showWind = settings?.show_wind !== false;
  const showHumidity = settings?.show_humidity !== false;
  const showPressure = settings?.show_pressure !== false;
  const showUvIndex = settings?.show_uv_index === true;
  const showAirQuality = settings?.show_air_quality === true;
  const showHourlyForecast = settings?.show_hourly_forecast !== false;

  if (loading) {
    return <WeatherSkeleton isDark={isDark} />;
  }

  const isLocationError = error && (error.includes('latitude') || error.includes('longitude') || error.includes('location'));

  if (error || !weather?.current) {
    const errorTitle = error ? 'Weather Error' : 'Location Not Set';
    const errorMessage = error || 'Set your location to see weather information';

    return (
      <div className={`rounded-[32px] shadow-2xl p-12 transition-all duration-1000 relative overflow-hidden bg-gradient-to-br ${bgGradient}`}>
        {/* Decorative glow */}
        <div className={`absolute -top-1/2 -right-1/4 w-[400px] h-[400px] rounded-full blur-3xl animate-float transition-all duration-1000 ${
          isDark ? 'bg-[#6478b4]/20' : 'bg-[#a8c5d1]/15'
        }`} />

        <div className="relative z-10 flex flex-col items-center justify-center h-64 gap-6">
          <MapPin className={`w-20 h-20 ${isDark ? 'text-[#e8e8f0]/30' : 'text-[#2a2a2e]/30'}`} />
          <div className="text-center max-w-md">
            <p className={`text-2xl font-light mb-2 ${isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'}`}
               style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {errorTitle}
            </p>
            <p className={`text-sm mb-6 ${isDark ? 'text-[#e8e8f0]/70' : 'text-[#2a2a2e]/60'}`}>
              {errorMessage}
            </p>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className={`px-6 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 transition-all duration-300 hover:scale-105 ${
                isDark 
                  ? 'bg-[#28283c]/60 hover:bg-[#323246]/80 text-[#e8e8f0]' 
                  : 'bg-white/60 hover:bg-white/80 text-[#2a2a2e]'
              }`}
              style={{ backdropFilter: 'blur(10px)' }}
            >
              <Settings className="w-4 h-4" />
              Go to Settings
            </button>
          )}
        </div>
      </div>
    );
  }

  const { current, daily } = weather;

  return (
    <div className="relative">
      <div className={`rounded-[32px] shadow-2xl p-12 transition-all duration-1000 relative overflow-hidden bg-gradient-to-br ${bgGradient}`}>
        {/* Weather-specific overlay */}
        {weatherOverlay && (
          <div className={`absolute inset-0 bg-gradient-to-br ${weatherOverlay} transition-all duration-1000`} />
        )}

        {/* Animated decorative glow */}
        <div className={`absolute -top-1/2 -right-1/4 w-[400px] h-[400px] rounded-full blur-3xl transition-all duration-1000 ${
          isDark ? 'bg-[#6496c8]/20' : 'bg-[#a8c5d1]/15'
        }`} 
        style={{ 
          animation: 'float 20s ease-in-out infinite',
        }} />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between mb-9 animate-fadeIn">
          <div className="flex-1">
            <h3 className={`text-[42px] font-light leading-tight mb-1 tracking-tight transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
            }`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {locationName || 'Current Location'}
            </h3>
            <p className={`text-sm uppercase tracking-wider transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]/70' : 'text-[#2a2a2e]/60'
            }`}>
              {current.condition}
            </p>
          </div>
        </div>

        {/* Current Weather */}
        <div className="relative z-10 flex items-center gap-8 mb-12 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="relative" style={{ width: '120px', height: '120px' }}>
            <WeatherIcon weatherCode={current.weather_code} isNight={isNight} size="large" />
          </div>
          <div className={`text-[96px] font-light leading-none tracking-tighter transition-colors duration-500 ${
            isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
          }`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {Math.round(current.temperature)}°
          </div>
        </div>

        {/* Weather Details - dynamically show based on settings */}
        {(() => {
          const detailCards = [];
          
          // Wind
          if (showWind && current.wind_speed > 0) {
            detailCards.push(
              <div key="wind" className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isDark 
                  ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
                  : 'bg-white/60 border border-[#a8c5d1]/20'
              }`} style={{ backdropFilter: 'blur(10px)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Wind className={`w-4 h-4 ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`} />
                  <div className={`text-[11px] uppercase tracking-wider transition-colors duration-500 ${
                    isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                  }`}>
                    Wind
                  </div>
                </div>
                <div className={`text-[28px] transition-colors duration-500 ${
                  isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                }`}>
                  {Math.round(current.wind_speed)} mph
                </div>
              </div>
            );
          }
          
          // Humidity
          if (showHumidity && current.humidity > 0) {
            detailCards.push(
              <div key="humidity" className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isDark 
                  ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
                  : 'bg-white/60 border border-[#a8c5d1]/20'
              }`} style={{ backdropFilter: 'blur(10px)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className={`w-4 h-4 ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`} />
                  <div className={`text-[11px] uppercase tracking-wider transition-colors duration-500 ${
                    isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                  }`}>
                    Humidity
                  </div>
                </div>
                <div className={`text-[28px] transition-colors duration-500 ${
                  isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                }`}>
                  {current.humidity}%
                </div>
              </div>
            );
          }
          
          // Pressure
          if (showPressure && current.pressure > 0) {
            detailCards.push(
              <div key="pressure" className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isDark 
                  ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
                  : 'bg-white/60 border border-[#a8c5d1]/20'
              }`} style={{ backdropFilter: 'blur(10px)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className={`w-4 h-4 ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`} />
                  <div className={`text-[11px] uppercase tracking-wider transition-colors duration-500 ${
                    isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                  }`}>
                    Pressure
                  </div>
                </div>
                <div className={`text-[28px] transition-colors duration-500 ${
                  isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                }`}>
                  {Math.round(current.pressure)} mb
                </div>
              </div>
            );
          }
          
          // UV Index
          if (showUvIndex && current.uv_index !== undefined && current.uv_index > 0) {
            const uvLevel = current.uv_index <= 2 ? 'Low' : current.uv_index <= 5 ? 'Moderate' : current.uv_index <= 7 ? 'High' : current.uv_index <= 10 ? 'Very High' : 'Extreme';
            detailCards.push(
              <div key="uv" className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isDark 
                  ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
                  : 'bg-white/60 border border-[#a8c5d1]/20'
              }`} style={{ backdropFilter: 'blur(10px)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sun className={`w-4 h-4 ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`} />
                  <div className={`text-[11px] uppercase tracking-wider transition-colors duration-500 ${
                    isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                  }`}>
                    UV Index
                  </div>
                </div>
                <div className={`text-[28px] transition-colors duration-500 ${
                  isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                }`}>
                  {Math.round(current.uv_index)}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`}>
                  {uvLevel}
                </div>
              </div>
            );
          }
          
          // Air Quality
          if (showAirQuality && weather?.air_quality?.aqi !== undefined) {
            const aqiCategory = weather.air_quality.category || (
              weather.air_quality.aqi <= 50 ? 'Good' : 
              weather.air_quality.aqi <= 100 ? 'Moderate' : 
              weather.air_quality.aqi <= 150 ? 'Unhealthy (Sensitive)' : 
              weather.air_quality.aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy'
            );
            detailCards.push(
              <div key="aqi" className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isDark 
                  ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
                  : 'bg-white/60 border border-[#a8c5d1]/20'
              }`} style={{ backdropFilter: 'blur(10px)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className={`w-4 h-4 ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`} />
                  <div className={`text-[11px] uppercase tracking-wider transition-colors duration-500 ${
                    isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                  }`}>
                    Air Quality
                  </div>
                </div>
                <div className={`text-[28px] transition-colors duration-500 ${
                  isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                }`}>
                  {weather.air_quality.aqi}
                </div>
                <div className={`text-xs mt-1 ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`}>
                  {aqiCategory}
                </div>
              </div>
            );
          }
          
          if (detailCards.length === 0) return null;
          
          // Determine grid columns based on number of cards
          const gridCols = detailCards.length === 1 ? 'grid-cols-1' : 
                          detailCards.length === 2 ? 'grid-cols-2' : 
                          detailCards.length <= 3 ? 'grid-cols-3' : 
                          detailCards.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 
                          'grid-cols-3 md:grid-cols-5';
          
          return (
            <div className={`relative z-10 grid ${gridCols} gap-6 mb-12 animate-fadeIn`} style={{ animationDelay: '0.2s' }}>
              {detailCards}
            </div>
          );
        })()}

        {/* Hourly Forecast */}
        {showHourlyForecast && weather?.hourly && weather.hourly.length > 0 && (
          <div className="relative z-10 animate-fadeIn mb-12" style={{ animationDelay: '0.25s' }}>
            <h2 className={`text-2xl font-normal mb-6 tracking-tight transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
            }`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Hourly Forecast
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
              {weather.hourly.slice(0, 24).map((hour, index) => {
                const { hour: hourNum, label: hourLabel } = getHourInfo(hour.time);
                const isCurrentHour = index === 0;
                const isNightHour = hourNum >= 20 || hourNum < 6;
                
                return (
                  <div
                    key={hour.time}
                    className={`flex-shrink-0 rounded-2xl p-4 text-center transition-all duration-300 hover:-translate-y-1 min-w-[80px] ${
                      isDark
                        ? 'bg-[#232337]/50 border border-[#6478b4]/20'
                        : 'bg-white/50 border border-[#a8c5d1]/15'
                    } ${isCurrentHour ? 'ring-2 ring-blue-400/50' : ''}`}
                    style={{ backdropFilter: 'blur(10px)' }}
                  >
                    <div className={`text-xs uppercase tracking-wider mb-2 ${
                      isDark ? 'text-[#e8e8f0]/60' : 'text-[#2a2a2e]/60'
                    }`}>
                      {isCurrentHour ? 'Now' : hourLabel}
                    </div>
                    <div className="mb-2 flex justify-center">
                      <div className="scale-50">
                        <WeatherIcon weatherCode={hour.weather_code} isNight={isNightHour} size="small" />
                      </div>
                    </div>
                    <div className={`text-lg font-medium ${
                      isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                    }`}>
                      {Math.round(hour.temperature)}°
                    </div>
                    {hour.precipitation_probability > 0 && (
                      <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                        isDark ? 'text-blue-300' : 'text-blue-600'
                      }`}>
                        <Droplets className="w-3 h-3" />
                        {hour.precipitation_probability}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 7-Day Forecast */}
        {daily && daily.length > 0 && (
          <>
          <div className="relative z-10 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <h2 className={`text-2xl font-normal mb-6 tracking-tight transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
            }`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              7-Day Forecast
            </h2>
            <div className="grid grid-cols-7 gap-3">
              {daily.slice(0, 7).map((day, index) => {
                // Parse date as local time (day.date is in format YYYY-MM-DD)
                const [year, month, dayOfMonth] = day.date.split('-').map(Number);
                const date = new Date(year, month - 1, dayOfMonth);

                // Calculate today's date in the location's timezone
                let locationTodayStr: string;
                if (weather?.utc_offset_seconds !== undefined) {
                  const now = new Date();
                  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
                  const locationTime = new Date(utcTime + (weather.utc_offset_seconds * 1000));
                  locationTodayStr = `${locationTime.getFullYear()}-${String(locationTime.getMonth() + 1).padStart(2, '0')}-${String(locationTime.getDate()).padStart(2, '0')}`;
                } else {
                  const now = new Date();
                  locationTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                }

                // Check if this date is today in the location's timezone
                const isToday = day.date === locationTodayStr;
                const isSelected = selectedDay === day.date;

                const dayName = isToday ? 'TODAY' : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();

                // Debug: Log weather code for each day
                if (index === 0) {
                  console.log('[WeatherWidget] Daily forecast weather codes:', daily.map(d => ({ date: d.date, code: d.weather_code, condition: d.condition })));
                }

                return (
                  <button
                    type="button"
                    key={day.date}
                    onClick={() => setSelectedDay(day.date)}
                    className={`rounded-[20px] p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                      isDark
                        ? 'bg-[#232337]/50 border border-[#6478b4]/20 hover:bg-[#323246]/80'
                        : 'bg-white/50 border border-[#a8c5d1]/15 hover:bg-white/80'
                    } ${isSelected ? 'ring-2 ring-rose-300/70' : ''}`}
                    style={{
                      backdropFilter: 'blur(10px)',
                      animation: 'fadeInUp 0.6s both',
                      animationDelay: `${0.4 + index * 0.05}s`
                    }}
                    aria-pressed={isSelected}
                    aria-label={`${dayName} forecast. High ${Math.round(day.temperature_max)} degrees, low ${Math.round(day.temperature_min)} degrees.`}
                  >
                    <div className={`text-[13px] uppercase tracking-wider mb-3 font-medium transition-colors duration-500 ${
                      isDark ? 'text-[#e8e8f0]/60' : 'text-[#2a2a2e]/60'
                    }`}>
                      {dayName}
                    </div>
                    <div className="mb-3 flex justify-center items-center" style={{ height: '70px' }}>
                      <div className="scale-90">
                        <WeatherIcon weatherCode={day.weather_code} isNight={false} size="small" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className={`text-2xl font-medium transition-colors duration-500 ${
                        isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                      }`}>
                        {Math.round(day.temperature_max)}°
                      </div>
                      <div className={`text-base transition-colors duration-500 ${
                        isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                      }`}>
                        {Math.round(day.temperature_min)}°
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {selectedDay && (
            <div className="mt-8 animate-fadeIn" style={{ animationDelay: '0.35s' }}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
                <div>
                  <h3
                    className={`text-xl font-semibold tracking-tight ${
                      isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                    }`}
                  >
                    Daily Insights
                  </h3>
                  <p className={`${isDark ? 'text-[#e8e8f0]/70' : 'text-[#2a2a2e]/70'} text-sm`}>
                    {selectedDayLabel}
                    {selectedDayDetails &&
                      ` · High ${Math.round(selectedDayDetails.temperature_max)}° / Low ${Math.round(selectedDayDetails.temperature_min)}°`}
                  </p>
                  {selectedDayDetails?.condition && (
                    <p className={`${isDark ? 'text-[#e8e8f0]/60' : 'text-[#2a2a2e]/60'} text-xs`}>
                      {selectedDayDetails.condition}
                    </p>
                  )}
                </div>
                <p className={`text-xs ${isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'}`}>
                  Hourly timeline · 12 AM through midnight (local time)
                </p>
              </div>

              {selectedDayHourly.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
                  {selectedDayHourly.map((hourEntry) => {
                    const { hour: hourNum, label: hourLabel } = getHourInfo(hourEntry.time);
                    const isNightHour = hourNum >= 20 || hourNum < 6;
                    return (
                      <div
                        key={`${selectedDay}-${hourEntry.time}`}
                        className={`flex-shrink-0 rounded-2xl p-4 text-center min-w-[100px] transition-all duration-300 ${
                          isDark
                            ? 'bg-[#232337]/60 border border-[#6478b4]/25'
                            : 'bg-white/60 border border-[#a8c5d1]/20'
                        }`}
                        style={{ backdropFilter: 'blur(10px)' }}
                      >
                        <div className={`text-xs uppercase tracking-wider mb-2 ${
                          isDark ? 'text-[#e8e8f0]/60' : 'text-[#2a2a2e]/60'
                        }`}>
                          {hourLabel}
                        </div>
                        <div className="mb-2 flex justify-center">
                          <div className="scale-50">
                            <WeatherIcon weatherCode={hourEntry.weather_code} isNight={isNightHour} size="small" />
                          </div>
                        </div>
                        <div className={`text-lg font-medium ${
                          isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                        }`}>
                          {Math.round(hourEntry.temperature)}°
                        </div>
                        {hourEntry.precipitation_probability > 0 && (
                          <div className={`text-xs mt-1 flex items-center justify-center gap-1 ${
                            isDark ? 'text-blue-300' : 'text-blue-600'
                          }`}>
                            <Droplets className="w-3 h-3" />
                            {hourEntry.precipitation_probability}%
                          </div>
                        )}
                        <div className={`text-[11px] mt-2 ${
                          isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                        }`}>
                          {hourEntry.condition}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  className={`rounded-2xl p-6 text-center ${
                    isDark ? 'bg-[#232337]/40 border border-[#6478b4]/20' : 'bg-white/60 border border-[#a8c5d1]/20'
                  }`}
                  style={{ backdropFilter: 'blur(12px)' }}
                >
                  <p className={`${isDark ? 'text-[#e8e8f0]/70' : 'text-[#2a2a2e]/70'} text-sm`}>
                    Hourly data is not available for this day yet.
                  </p>
                </div>
              )}
            </div>
          )}
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Sans:wght@400;500&display=swap');

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -30px) scale(1.1); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out both;
        }

        .animate-bounce-slow {
          animation: bounce 3s ease-in-out infinite;
        }

        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}