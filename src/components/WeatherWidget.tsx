import { Cloud, Droplets, Wind, RefreshCw, MapPin, Loader, Settings, Sun, Moon } from 'lucide-react';
import { WeatherData } from '../services/weatherService';
import { useState, useEffect } from 'react';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  locationName?: string;
  onRefresh?: () => void;
  onOpenSettings?: () => void;
}

export function WeatherWidget({ weather, loading, error, locationName, onRefresh, onOpenSettings }: WeatherWidgetProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className={`rounded-[32px] shadow-2xl p-12 transition-all duration-500 ${
        isDark 
          ? 'bg-gradient-to-br from-[#1e1e2e]/95 to-[#19192840]/90' 
          : 'bg-gradient-to-br from-white/95 to-[#fbf8f3]/90'
      }`}>
        <div className="flex items-center justify-center h-64">
          <Loader className={`w-12 h-12 animate-spin ${isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'}`} />
        </div>
      </div>
    );
  }

  const isLocationError = error && (error.includes('latitude') || error.includes('longitude') || error.includes('location'));

  if (error || !weather?.current) {
    return (
      <div className={`rounded-[32px] shadow-2xl p-12 transition-all duration-500 relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-[#1e1e2e]/95 to-[#19192840]/90' 
          : 'bg-gradient-to-br from-white/95 to-[#fbf8f3]/90'
      }`}>
        {/* Decorative glow */}
        <div className={`absolute -top-1/2 -right-1/4 w-[400px] h-[400px] rounded-full blur-3xl animate-float ${
          isDark ? 'bg-[#6478b4]/20' : 'bg-[#a8c5d1]/15'
        }`} />
        
        <div className="relative z-10 flex flex-col items-center justify-center h-64 gap-6">
          <MapPin className={`w-20 h-20 ${isDark ? 'text-[#e8e8f0]/30' : 'text-[#2a2a2e]/30'}`} />
          <div className="text-center">
            <p className={`text-2xl font-light mb-2 ${isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'}`} 
               style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Location Not Set
            </p>
            <p className={`text-sm mb-6 ${isDark ? 'text-[#e8e8f0]/70' : 'text-[#2a2a2e]/60'}`}>
              Set your location to see weather information
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
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`absolute -top-4 -right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 z-50 ${
          isDark 
            ? 'bg-[#28283c]/80 hover:bg-[#323246]' 
            : 'bg-white/80 hover:bg-white'
        }`}
        style={{ backdropFilter: 'blur(10px)' }}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Moon className="w-6 h-6 text-[#e8e8f0]" />
        ) : (
          <Sun className="w-6 h-6 text-[#fdb44b]" fill="currentColor" />
        )}
      </button>

      <div className={`rounded-[32px] shadow-2xl p-12 transition-all duration-500 relative overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-[#1e1e2e]/95 to-[#19192840]/90' 
          : 'bg-gradient-to-br from-white/95 to-[#fbf8f3]/90'
      }`}>
        {/* Animated decorative glow */}
        <div className={`absolute -top-1/2 -right-1/4 w-[400px] h-[400px] rounded-full blur-3xl transition-all duration-500 ${
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
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 hover:rotate-180 ${
                isDark 
                  ? 'bg-[#6478b4]/20 hover:bg-[#6478b4]/35' 
                  : 'bg-[#a8c5d1]/15 hover:bg-[#a8c5d1]/25'
              }`}
              title="Refresh weather"
            >
              <RefreshCw className={`w-5 h-5 ${isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'}`} />
            </button>
          )}
        </div>

        {/* Current Weather */}
        <div className="relative z-10 flex items-center gap-8 mb-12 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="text-8xl drop-shadow-2xl animate-bounce-slow" style={{ 
            filter: 'drop-shadow(0 10px 30px rgba(168,197,209,0.3))',
            animation: 'bounce 3s ease-in-out infinite'
          }}>
            {current.icon}
          </div>
          <div className={`text-[96px] font-light leading-none tracking-tighter transition-colors duration-500 ${
            isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
          }`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {Math.round(current.temperature)}°
          </div>
        </div>

        {/* Weather Details */}
        <div className="relative z-10 grid grid-cols-3 gap-6 mb-12 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            isDark 
              ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
              : 'bg-white/60 border border-[#a8c5d1]/20'
          }`} style={{ backdropFilter: 'blur(10px)' }}>
            <div className={`text-[11px] uppercase tracking-wider mb-2 transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
            }`}>
              Wind
            </div>
            <div className={`text-[28px] transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
            }`}>
              {Math.round(current.wind_speed)} mph
            </div>
          </div>

          <div className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            isDark 
              ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
              : 'bg-white/60 border border-[#a8c5d1]/20'
          }`} style={{ backdropFilter: 'blur(10px)' }}>
            <div className={`text-[11px] uppercase tracking-wider mb-2 transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
            }`}>
              Humidity
            </div>
            <div className={`text-[28px] transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
            }`}>
              {current.humidity}%
            </div>
          </div>

          <div className={`rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
            isDark 
              ? 'bg-[#28283c]/50 border border-[#6478b4]/20' 
              : 'bg-white/60 border border-[#a8c5d1]/20'
          }`} style={{ backdropFilter: 'blur(10px)' }}>
            <div className={`text-[11px] uppercase tracking-wider mb-2 transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
            }`}>
              Pressure
            </div>
            <div className={`text-[28px] transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
            }`}>
              {Math.round(current.pressure)} mb
            </div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        {daily && daily.length > 0 && (
          <div className="relative z-10 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <h2 className={`text-2xl font-normal mb-6 tracking-tight transition-colors duration-500 ${
              isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
            }`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              7-Day Forecast
            </h2>
            <div className="grid grid-cols-7 gap-3">
              {daily.slice(0, 7).map((day, index) => {
                const date = new Date(day.date);
                const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <div
                    key={day.date}
                    className={`rounded-[20px] p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] ${
                      isDark 
                        ? 'bg-[#232337]/50 border border-[#6478b4]/20 hover:bg-[#323246]/80' 
                        : 'bg-white/50 border border-[#a8c5d1]/15 hover:bg-white/80'
                    }`}
                    style={{ 
                      backdropFilter: 'blur(10px)',
                      animation: 'fadeInUp 0.6s both',
                      animationDelay: `${0.4 + index * 0.05}s`
                    }}
                  >
                    <div className={`text-[13px] uppercase tracking-wider mb-4 font-medium transition-colors duration-500 ${
                      isDark ? 'text-[#e8e8f0]/60' : 'text-[#2a2a2e]/60'
                    }`}>
                      {dayName}
                    </div>
                    <div className="text-5xl mb-3" style={{ 
                      filter: 'drop-shadow(0 4px 12px rgba(168,197,209,0.2))' 
                    }}>
                      {day.icon}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className={`text-xl font-medium transition-colors duration-500 ${
                        isDark ? 'text-[#e8e8f0]' : 'text-[#2a2a2e]'
                      }`}>
                        {Math.round(day.temperature_max)}°
                      </div>
                      <div className={`text-[15px] transition-colors duration-500 ${
                        isDark ? 'text-[#e8e8f0]/50' : 'text-[#2a2a2e]/50'
                      }`}>
                        {Math.round(day.temperature_min)}°
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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