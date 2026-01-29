import { supabase } from '../lib/supabase';

export interface WeatherSettings {
  id?: string;
  user_id?: string;
  default_location?: string;
  latitude?: number;
  longitude?: number;
  temperature_unit?: 'celsius' | 'fahrenheit';
  wind_speed_unit?: 'kmh' | 'mph' | 'ms' | 'kn';
  precipitation_unit?: 'mm' | 'inch';
  timezone?: string;
  include_current?: boolean;
  include_hourly?: boolean;
  include_daily?: boolean;
  hourly_hours?: number;
  daily_days?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WeatherData {
  current?: {
    temperature: number;
    weather_code: number;
    wind_speed: number;
    wind_direction: number;
    humidity: number;
    pressure: number;
    condition: string;
    icon: string;
  };
  hourly?: Array<{
    time: string;
    temperature: number;
    weather_code: number;
    precipitation_probability: number;
    condition: string;
    icon: string;
  }>;
  daily?: Array<{
    date: string;
    temperature_max: number;
    temperature_min: number;
    weather_code: number;
    precipitation_sum: number;
    precipitation_probability: number;
    condition: string;
    icon: string;
  }>;
  location?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

interface WeatherResponse {
  data: any;
  cached?: boolean;
  error?: string;
}

class WeatherService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-mcp`;
  }

  private async makeRequest(body: any): Promise<any> {
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch weather data');
    }

    return response.json();
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({
      action: 'get_current',
      latitude,
      longitude,
    });
  }

  async getForecast(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({
      action: 'get_forecast',
      latitude,
      longitude,
    });
  }

  async getSettings(): Promise<WeatherSettings | null> {
    const response = await this.makeRequest({
      action: 'get_settings',
    });
    return response.data;
  }

  async updateSettings(settings: Partial<WeatherSettings>): Promise<WeatherSettings> {
    const response = await this.makeRequest({
      action: 'update_settings',
      settings,
    });
    return response.data;
  }

  async getWeatherForLocation(location?: { latitude: number; longitude: number }): Promise<WeatherData> {
    let coords = location;

    if (!coords) {
      const settings = await this.getSettings();
      if (settings?.latitude && settings?.longitude) {
        coords = {
          latitude: settings.latitude,
          longitude: settings.longitude,
        };
      }
    }

    if (!coords) {
      throw new Error('No location provided and no default location set');
    }

    const response = await this.getForecast(coords.latitude, coords.longitude);
    return this.parseWeatherData(response.data);
  }

  private parseWeatherData(data: any): WeatherData {
    const result: WeatherData = {};

    if (data.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(data.content[0].text);

        if (parsed.current_weather) {
          result.current = {
            temperature: parsed.current_weather.temperature,
            weather_code: parsed.current_weather.weathercode,
            wind_speed: parsed.current_weather.windspeed,
            wind_direction: parsed.current_weather.winddirection,
            humidity: parsed.hourly?.relative_humidity_2m?.[0] || 0,
            pressure: parsed.hourly?.surface_pressure?.[0] || 0,
            condition: this.getWeatherCondition(parsed.current_weather.weathercode),
            icon: this.getWeatherIcon(parsed.current_weather.weathercode),
          };
        }

        if (parsed.hourly) {
          result.hourly = parsed.hourly.time?.slice(0, 24).map((time: string, i: number) => ({
            time,
            temperature: parsed.hourly.temperature_2m[i],
            weather_code: parsed.hourly.weathercode[i],
            precipitation_probability: parsed.hourly.precipitation_probability?.[i] || 0,
            condition: this.getWeatherCondition(parsed.hourly.weathercode[i]),
            icon: this.getWeatherIcon(parsed.hourly.weathercode[i]),
          }));
        }

        if (parsed.daily) {
          result.daily = parsed.daily.time?.map((date: string, i: number) => ({
            date,
            temperature_max: parsed.daily.temperature_2m_max[i],
            temperature_min: parsed.daily.temperature_2m_min[i],
            weather_code: parsed.daily.weathercode[i],
            precipitation_sum: parsed.daily.precipitation_sum?.[i] || 0,
            precipitation_probability: parsed.daily.precipitation_probability_max?.[i] || 0,
            condition: this.getWeatherCondition(parsed.daily.weathercode[i]),
            icon: this.getWeatherIcon(parsed.daily.weathercode[i]),
          }));
        }
      } catch (e) {
        console.error('Failed to parse weather data:', e);
      }
    }

    return result;
  }

  private getWeatherCondition(code: number): string {
    const conditions: Record<number, string> = {
      0: 'Clear',
      1: 'Mainly Clear',
      2: 'Partly Cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Foggy',
      51: 'Light Drizzle',
      53: 'Moderate Drizzle',
      55: 'Dense Drizzle',
      61: 'Slight Rain',
      63: 'Moderate Rain',
      65: 'Heavy Rain',
      71: 'Slight Snow',
      73: 'Moderate Snow',
      75: 'Heavy Snow',
      77: 'Snow Grains',
      80: 'Slight Rain Showers',
      81: 'Moderate Rain Showers',
      82: 'Violent Rain Showers',
      85: 'Slight Snow Showers',
      86: 'Heavy Snow Showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Hail',
      99: 'Thunderstorm with Hail',
    };
    return conditions[code] || 'Unknown';
  }

  private getWeatherIcon(code: number): string {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 55) return '🌦️';
    if (code <= 65) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌧️';
    if (code <= 86) return '❄️';
    return '⛈️';
  }
}

export const weatherService = new WeatherService();
