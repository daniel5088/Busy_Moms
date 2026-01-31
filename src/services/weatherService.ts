import { supabase } from "../lib/supabase";

export interface WeatherSettings {
  id?: string;
  user_id?: string;
  default_location?: string;
  latitude?: number;
  longitude?: number;
  temperature_unit?: "celsius" | "fahrenheit";
  wind_speed_unit?: "kmh" | "mph" | "ms" | "kn";
  precipitation_unit?: "mm" | "inch";
  timezone?: string;
  include_current?: boolean;
  include_hourly?: boolean;
  include_daily?: boolean;
  hourly_hours?: number;
  daily_days?: number;
  // Display settings
  show_hourly_forecast?: boolean;
  show_uv_index?: boolean;
  show_air_quality?: boolean;
  show_wind?: boolean;
  show_humidity?: boolean;
  show_pressure?: boolean;
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
    uv_index?: number;
    condition: string;
    icon: string;
  };
  air_quality?: {
    aqi?: number;
    pm2_5?: number;
    pm10?: number;
    category?: string;
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
  timezone?: string; // Location's timezone (e.g., "Asia/Kolkata", "America/New_York")
  utc_offset_seconds?: number; // UTC offset in seconds
}

interface WeatherResponse {
  data: any;
  cached?: boolean;
  error?: string;
}

/**
 * This service supports BOTH response formats:
 * 1) New backend format: { data: <open-meteo payload>, cached: boolean }
 * 2) MCP "tool" format: response.data.content[0].text = JSON string (older)
 *
 * Your error came from JSON.parse on a non-JSON string ("Error: ...")
 * so we now parse safely.
 */
class WeatherService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-mcp`;
  }

  private async makeRequest(body: any): Promise<WeatherResponse> {
    console.log("[WeatherService] Making request to:", this.baseUrl);
    console.log("[WeatherService] Request body:", body);

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      console.error("[WeatherService] Not authenticated");
      throw new Error("Not authenticated");
    }

    console.log("[WeatherService] Authenticated, sending request...");

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    console.log("[WeatherService] Response status:", response.status);

    // Always try to read JSON, but fall back to text for debugging
    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Not JSON; keep raw text
      json = null;
    }

    if (!response.ok) {
      const message =
        (json && (json.error || json.message)) ||
        text ||
        "Failed to fetch weather data";
      console.error("[WeatherService] Request failed:", json ?? text);
      throw new Error(message);
    }

    // For ok responses, we expect JSON
    if (!json) {
      console.error("[WeatherService] Expected JSON but got:", text);
      throw new Error("Weather function returned non-JSON response");
    }

    console.log("[WeatherService] Request successful:", json);
    return json as WeatherResponse;
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({
      action: "get_current",
      latitude,
      longitude,
    });
  }

  async getForecast(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({
      action: "get_forecast",
      latitude,
      longitude,
    });
  }

  async getSettings(): Promise<WeatherSettings | null> {
    const response = await this.makeRequest({ action: "get_settings" });
    return response.data;
  }

  async updateSettings(settings: Partial<WeatherSettings>): Promise<WeatherSettings> {
    const response = await this.makeRequest({
      action: "update_settings",
      settings,
    });
    return response.data;
  }

  async getWeatherForLocation(location?: { latitude: number; longitude: number }): Promise<WeatherData> {
    console.log("[WeatherService] getWeatherForLocation called with:", location);

    let coords = location;

    if (!coords) {
      console.log("[WeatherService] No coords provided, fetching settings...");
      const settings = await this.getSettings();
      console.log("[WeatherService] Settings fetched:", settings);

      if (settings?.latitude && settings?.longitude) {
        coords = { latitude: settings.latitude, longitude: settings.longitude };
        console.log("[WeatherService] Using coords from settings:", coords);
      } else {
        console.warn("[WeatherService] Settings missing latitude or longitude:", {
          hasLatitude: !!settings?.latitude,
          hasLongitude: !!settings?.longitude,
          latitude: settings?.latitude,
          longitude: settings?.longitude,
        });
      }
    }

    if (!coords) {
      const error = "No location provided and no default location set";
      console.error("[WeatherService]", error);
      throw new Error(error);
    }

    console.log("[WeatherService] Fetching forecast for coords:", coords);
    const response = await this.getForecast(coords.latitude, coords.longitude);
    console.log("[WeatherService] Forecast response:", response);

    const parsedData = this.parseWeatherData(response.data);
    console.log("[WeatherService] Parsed weather data:", parsedData);

    return parsedData;
  }

  /**
   * Accepts:
   * - open-meteo payload object (preferred): { current_weather, hourly, daily, ... }
   * - MCP tool content wrapper: { content: [{ text: "<json string>" }] }
   */
  private parseWeatherData(data: any): WeatherData {
    console.log('[WeatherService] parseWeatherData called with:', data);
    
    // 1) If backend already returns the open-meteo JSON payload, use it directly.
    const openMeteoPayload =
      this.isOpenMeteoPayload(data) ? data : this.extractOpenMeteoPayloadFromMcp(data);

    console.log('[WeatherService] Extracted OpenMeteo payload:', openMeteoPayload);

    const result: WeatherData = {};
    if (!openMeteoPayload) {
      console.error('[WeatherService] No valid OpenMeteo payload found');
      return result;
    }

    const parsed = openMeteoPayload;

    // Get timezone info from the API response - this tells us the location's timezone
    const locationTimezone = parsed.timezone; // e.g., "Asia/Kolkata", "America/New_York"
    const utcOffsetSeconds = parsed.utc_offset_seconds ?? 0;
    
    // Calculate current time in the location's timezone
    // UTC offset in milliseconds
    const locationOffsetMs = utcOffsetSeconds * 1000;
    // Browser's offset in milliseconds (getTimezoneOffset returns minutes and is inverted)
    const browserOffsetMs = -new Date().getTimezoneOffset() * 60 * 1000;
    // Difference between location and browser timezone
    const offsetDiff = locationOffsetMs - browserOffsetMs;
    
    // Current time adjusted to the location's timezone
    const nowInLocationTz = new Date(Date.now() + offsetDiff);
    const locationHour = nowInLocationTz.getHours();
    const locationDateStr = `${nowInLocationTz.getFullYear()}-${String(nowInLocationTz.getMonth() + 1).padStart(2, '0')}-${String(nowInLocationTz.getDate()).padStart(2, '0')}`;
    
    console.log('[WeatherService] Location timezone:', locationTimezone, 'UTC offset:', utcOffsetSeconds);
    console.log('[WeatherService] Browser time:', new Date().toISOString());
    console.log('[WeatherService] Location local time:', nowInLocationTz.toISOString().replace('Z', ''), 'hour:', locationHour, 'date:', locationDateStr);

    // Current - handle multiple formats
    if (parsed.current) {
      // New format with "current" object
      const weatherCode = parsed.current.weather_code ?? 0;
      console.log('[WeatherService] Current weather_code:', weatherCode);
      console.log('[WeatherService] Current data keys:', Object.keys(parsed.current));
      
      result.current = {
        temperature: parsed.current.temperature_2m,
        weather_code: weatherCode,
        wind_speed: parsed.current.wind_speed_10m || 0,
        wind_direction: parsed.current.wind_direction_10m || 0,
        humidity: parsed.current.relative_humidity_2m || 0,
        pressure: parsed.current.surface_pressure || 0,
        uv_index: parsed.current.uv_index || parsed.hourly?.uv_index?.[0] || undefined,
        condition: this.getWeatherCondition(weatherCode),
        icon: "",
      };
    } else if (parsed.current_weather) {
      // Old format with "current_weather" object
      console.log('[WeatherService] Using current_weather format');
      console.log('[WeatherService] current_weather data:', parsed.current_weather);
      console.log('[WeatherService] hourly data available:', !!parsed.hourly);
      result.current = {
        temperature: parsed.current_weather.temperature,
        weather_code: parsed.current_weather.weathercode,
        wind_speed: parsed.current_weather.windspeed,
        wind_direction: parsed.current_weather.winddirection,
        humidity: parsed.hourly?.relative_humidity_2m?.[0] || 0,
        pressure: parsed.hourly?.surface_pressure?.[0] || 0,
        uv_index: parsed.hourly?.uv_index?.[0] || undefined,
        condition: this.getWeatherCondition(parsed.current_weather.weathercode),
        icon: "",
      };
      console.log('[WeatherService] Parsed current with humidity:', result.current.humidity, 'pressure:', result.current.pressure);
    } else if (parsed.hourly?.time && parsed.hourly.time.length > 0) {
      // Fallback: synthesize current weather from hourly data at current hour in location's timezone
      console.log('[WeatherService] No current weather data, synthesizing from hourly');
      console.log('[WeatherService] Hourly keys:', Object.keys(parsed.hourly));
      
      // Find the index matching current time in the location's timezone
      let currentIndex = 0;
      for (let i = 0; i < parsed.hourly.time.length; i++) {
        const timeStr = parsed.hourly.time[i];
        // Times are in format "YYYY-MM-DDTHH:00" in the location's timezone
        if (timeStr.startsWith(locationDateStr)) {
          const hourMatch = timeStr.match(/T(\d{1,2})/);
          if (hourMatch) {
            const hour = parseInt(hourMatch[1], 10);
            if (hour === locationHour) {
              currentIndex = i;
              break;
            } else if (hour > locationHour) {
              currentIndex = Math.max(0, i - 1);
              break;
            }
          }
        }
      }
      
      console.log('[WeatherService] Using hourly index', currentIndex, 'time:', parsed.hourly.time[currentIndex], 'location hour:', locationHour);
      
      const weatherCode = parsed.hourly.weather_code?.[currentIndex] ?? parsed.hourly.weathercode?.[currentIndex] ?? 0;
      result.current = {
        temperature: parsed.hourly.temperature_2m?.[currentIndex] ?? 0,
        weather_code: weatherCode,
        wind_speed: parsed.hourly.wind_speed_10m?.[currentIndex] ?? 0,
        wind_direction: parsed.hourly.wind_direction_10m?.[currentIndex] ?? 0,
        humidity: parsed.hourly.relative_humidity_2m?.[currentIndex] ?? 0,
        pressure: parsed.hourly.surface_pressure?.[currentIndex] ?? 0,
        uv_index: parsed.hourly.uv_index?.[currentIndex] || undefined,
        condition: this.getWeatherCondition(weatherCode),
        icon: "",
      };
      console.log('[WeatherService] Synthesized from hourly - temp:', result.current.temperature, 'wind:', result.current.wind_speed, 'humidity:', result.current.humidity);
    } else if (parsed.daily?.time && parsed.daily.time.length > 0) {
      // Last fallback: synthesize from daily data (today)
      console.log('[WeatherService] No current/hourly data, synthesizing from daily');
      const weatherCodes = parsed.daily.weather_code || parsed.daily.weathercode || [];
      const weatherCode = weatherCodes[0] ?? 0;
      const tempMax = parsed.daily.temperature_2m_max?.[0] ?? 0;
      const tempMin = parsed.daily.temperature_2m_min?.[0] ?? 0;
      result.current = {
        temperature: Math.round((tempMax + tempMin) / 2), // Average of max/min
        weather_code: weatherCode,
        wind_speed: 0,
        wind_direction: 0,
        humidity: 0,
        pressure: 0,
        uv_index: parsed.daily.uv_index_max?.[0] || undefined,
        condition: this.getWeatherCondition(weatherCode),
        icon: "",
      };
    }

    // Hourly - find current hour and start from there using location's timezone
    if (parsed.hourly?.time && Array.isArray(parsed.hourly.time)) {
      console.log('[WeatherService] Parsing hourly data, has', parsed.hourly.time.length, 'hours');
      const hourlyWeatherCodes = parsed.hourly.weather_code || parsed.hourly.weathercode || [];
      
      // Find the starting index - match the current hour in the location's timezone
      let startIndex = 0;
      
      for (let i = 0; i < parsed.hourly.time.length; i++) {
        const timeStr = parsed.hourly.time[i];
        // Times are in format "YYYY-MM-DDTHH:00" in the location's timezone
        if (timeStr.startsWith(locationDateStr)) {
          const hourMatch = timeStr.match(/T(\d{1,2})/);
          if (hourMatch) {
            const hour = parseInt(hourMatch[1], 10);
            if (hour >= locationHour) {
              startIndex = i;
              break;
            }
          }
        } else if (timeStr > locationDateStr) {
          // We've passed today, use first hour of next day
          startIndex = i;
          break;
        }
      }
      
      console.log('[WeatherService] Location time:', locationDateStr, 'hour:', locationHour);
      console.log('[WeatherService] Hourly forecast starting at index', startIndex, 'time:', parsed.hourly.time[startIndex]);
      
      // Get 24 hours starting from current hour
      const times = parsed.hourly.time.slice(startIndex, startIndex + 24);
      result.hourly = times.map((time: string, i: number) => {
        const actualIndex = startIndex + i;
        return {
          time,
          temperature: parsed.hourly.temperature_2m?.[actualIndex] ?? 0,
          weather_code: hourlyWeatherCodes[actualIndex] ?? 0,
          precipitation_probability: parsed.hourly.precipitation_probability?.[actualIndex] ?? 0,
          condition: this.getWeatherCondition(hourlyWeatherCodes[actualIndex] ?? 0),
          icon: "", // No longer using emoji icons
        };
      });
    }

    // Daily - ensure we start from today in the location's timezone
    if (parsed.daily?.time && Array.isArray(parsed.daily.time)) {
      const weatherCodes = parsed.daily.weather_code || parsed.daily.weathercode || [];
      console.log('[WeatherService] Daily weather_code array from API:', weatherCodes);
      
      // Find the index of today (in location's timezone) in the daily data
      let startIndex = 0;
      for (let i = 0; i < parsed.daily.time.length; i++) {
        if (parsed.daily.time[i] >= locationDateStr) {
          startIndex = i;
          break;
        }
      }
      
      console.log('[WeatherService] Daily forecast starting from index', startIndex, 'date:', parsed.daily.time[startIndex], 'location today:', locationDateStr);
      
      // Get 7 days starting from today
      const times = parsed.daily.time.slice(startIndex, startIndex + 7);
      result.daily = times.map((date: string, i: number) => {
        const actualIndex = startIndex + i;
        const weatherCode = weatherCodes[actualIndex] ?? 0;
        console.log(`[WeatherService] Daily forecast for ${date}: weather_code=${weatherCode}, condition=${this.getWeatherCondition(weatherCode)}`);
        return {
          date,
          temperature_max: parsed.daily.temperature_2m_max?.[actualIndex] ?? 0,
          temperature_min: parsed.daily.temperature_2m_min?.[actualIndex] ?? 0,
          weather_code: weatherCode,
          precipitation_sum: parsed.daily.precipitation_sum?.[actualIndex] ?? 0,
          precipitation_probability: parsed.daily.precipitation_probability_max?.[actualIndex] ?? 0,
          condition: this.getWeatherCondition(weatherCode),
          icon: "", // No longer using emoji icons
        };
      });
    }

    // Location (optional)
    if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
      result.location = {
        name: "Selected location",
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };
    }

    // Store timezone info for display purposes
    result.timezone = locationTimezone;
    result.utc_offset_seconds = utcOffsetSeconds;

    console.log('[WeatherService] Final parsed result:', result);
    return result;
  }

  private isOpenMeteoPayload(obj: any): boolean {
    // open-meteo payload usually has at least latitude/longitude + hourly/daily/current_weather
    if (!obj || typeof obj !== "object") return false;
    const hasCoords = typeof obj.latitude === "number" && typeof obj.longitude === "number";
    const hasWeather =
      !!obj.current_weather ||
      !!obj.hourly ||
      !!obj.daily;
    return hasCoords && hasWeather;
  }

  /**
   * Older MCP tool format:
   * data.content[0].text is a JSON string OR an error string ("Error: ...")
   */
  private extractOpenMeteoPayloadFromMcp(data: any): any | null {
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string") return null;

    const trimmed = text.trim();

    // If it's not JSON, don't JSON.parse it (prevents "Unexpected token 'E'")
    const looksJson =
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"));

    if (!looksJson) {
      console.error("Weather MCP returned non-JSON text:", trimmed.slice(0, 200));
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.error("Failed to parse weather JSON text:", e);
      return null;
    }
  }

  private getWeatherCondition(code: number): string {
    const conditions: Record<number, string> = {
      0: "Clear",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Foggy",
      51: "Light Drizzle",
      53: "Moderate Drizzle",
      55: "Dense Drizzle",
      61: "Slight Rain",
      63: "Moderate Rain",
      65: "Heavy Rain",
      71: "Slight Snow",
      73: "Moderate Snow",
      75: "Heavy Snow",
      77: "Snow Grains",
      80: "Slight Rain Showers",
      81: "Moderate Rain Showers",
      82: "Violent Rain Showers",
      85: "Slight Snow Showers",
      86: "Heavy Snow Showers",
      95: "Thunderstorm",
      96: "Thunderstorm with Hail",
      99: "Thunderstorm with Hail",
    };
    return conditions[code] || "Unknown";
  }

  private getWeatherIcon(code: number): string {
    // No longer used - icons are generated by WeatherIcon component based on weather_code
    return "";
  }
}

export const weatherService = new WeatherService();