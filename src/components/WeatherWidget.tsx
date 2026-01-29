import { Cloud, Droplets, Wind, RefreshCw, MapPin, Loader } from 'lucide-react';
import { WeatherData } from '../services/weatherService';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  locationName?: string;
  onRefresh?: () => void;
}

export function WeatherWidget({ weather, loading, error, locationName, onRefresh }: WeatherWidgetProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
        <div className="flex items-center justify-center h-48">
          <Loader className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg shadow-md p-6 text-white">
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <Cloud className="w-12 h-12 opacity-50" />
          <p className="text-sm text-center">{error}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!weather?.current) {
    return (
      <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg shadow-md p-6 text-white">
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <MapPin className="w-12 h-12 opacity-50" />
          <p className="text-sm text-center">Set your location in settings to see weather</p>
        </div>
      </div>
    );
  }

  const { current, daily } = weather;
  const gradient = getWeatherGradient(current.weather_code);

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-lg shadow-md p-6 text-white`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {locationName || 'Current Location'}
          </h3>
          <p className="text-sm opacity-90">{current.condition}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Refresh weather"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-6xl">{current.icon}</span>
          <div className="text-5xl font-bold">{Math.round(current.temperature)}°</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 opacity-75" />
          <div>
            <div className="text-xs opacity-75">Wind</div>
            <div className="text-sm font-semibold">{Math.round(current.wind_speed)} mph</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 opacity-75" />
          <div>
            <div className="text-xs opacity-75">Humidity</div>
            <div className="text-sm font-semibold">{current.humidity}%</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 opacity-75" />
          <div>
            <div className="text-xs opacity-75">Pressure</div>
            <div className="text-sm font-semibold">{Math.round(current.pressure)} mb</div>
          </div>
        </div>
      </div>

      {daily && daily.length > 0 && (
        <div className="border-t border-white/20 pt-4">
          <div className="text-xs opacity-75 mb-3">7-Day Forecast</div>
          <div className="grid grid-cols-7 gap-2">
            {daily.slice(0, 7).map((day, index) => {
              const date = new Date(day.date);
              const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={day.date} className="text-center">
                  <div className="text-xs opacity-75 mb-1">{dayName}</div>
                  <div className="text-lg mb-1">{day.icon}</div>
                  <div className="text-xs font-semibold">
                    {Math.round(day.temperature_max)}°
                  </div>
                  <div className="text-xs opacity-75">
                    {Math.round(day.temperature_min)}°
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getWeatherGradient(weatherCode: number): string {
  if (weatherCode === 0) return 'from-yellow-400 to-orange-500';
  if (weatherCode <= 3) return 'from-blue-400 to-blue-600';
  if (weatherCode <= 48) return 'from-gray-400 to-gray-600';
  if (weatherCode <= 65) return 'from-blue-500 to-blue-700';
  if (weatherCode <= 77) return 'from-cyan-400 to-blue-500';
  if (weatherCode <= 86) return 'from-cyan-300 to-blue-400';
  return 'from-gray-700 to-gray-900';
}
