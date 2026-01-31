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
    // 1) If backend already returns the open-meteo JSON payload, use it directly.
    const openMeteoPayload =
      this.isOpenMeteoPayload(data) ? data : this.extractOpenMeteoPayloadFromMcp(data);

    const result: WeatherData = {};
    if (!openMeteoPayload) return result;

    const parsed = openMeteoPayload;

    // Current
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

    // Hourly (first 24)
    if (parsed.hourly?.time && Array.isArray(parsed.hourly.time)) {
      const times = parsed.hourly.time.slice(0, 24);
      result.hourly = times.map((time: string, i: number) => ({
        time,
        temperature: parsed.hourly.temperature_2m?.[i] ?? 0,
        weather_code: parsed.hourly.weathercode?.[i] ?? 0,
        precipitation_probability: parsed.hourly.precipitation_probability?.[i] ?? 0,
        condition: this.getWeatherCondition(parsed.hourly.weathercode?.[i] ?? 0),
        icon: this.getWeatherIcon(parsed.hourly.weathercode?.[i] ?? 0),
      }));
    }

    // Daily
    if (parsed.daily?.time && Array.isArray(parsed.daily.time)) {
      result.daily = parsed.daily.time.map((date: string, i: number) => ({
        date,
        temperature_max: parsed.daily.temperature_2m_max?.[i] ?? 0,
        temperature_min: parsed.daily.temperature_2m_min?.[i] ?? 0,
        weather_code: parsed.daily.weathercode?.[i] ?? 0,
        precipitation_sum: parsed.daily.precipitation_sum?.[i] ?? 0,
        precipitation_probability: parsed.daily.precipitation_probability_max?.[i] ?? 0,
        condition: this.getWeatherCondition(parsed.daily.weathercode?.[i] ?? 0),
        icon: this.getWeatherIcon(parsed.daily.weathercode?.[i] ?? 0),
      }));
    }

    // Location (optional)
    if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
      result.location = {
        name: "Selected location",
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      };
    }

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
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 55) return "🌦️";
    if (code <= 65) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌧️";
    if (code <= 86) return "❄️";
    return "⛈️";
  }
}

export const weatherService = new WeatherService();
