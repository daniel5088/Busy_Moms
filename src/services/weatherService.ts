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
  fullHourly?: Array<{
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
  timezone?: string;
  utc_offset_seconds?: number;
}

interface WeatherResponse {
  data: any;
  cached?: boolean;
  error?: string;
}

type UnitsSystem = "IMPERIAL" | "METRIC";

// ─── Hourly synthesis ────────────────────────────────────────────────────────
// Google Weather MCP has no hourly endpoint.  We synthesise a 24-hour strip
// per day from the daily min/max using a standard diurnal temperature model:
//   • trough at 05:00, peak at 14:00, sinusoidal between them.
const TROUGH_HOUR = 5;
const PEAK_HOUR   = 14;

function interpTemp(hour: number, tmin: number, tmax: number): number {
  const mid = (tmax + tmin) / 2;
  const amp = (tmax - tmin) / 2;
  const shifted      = ((hour - TROUGH_HOUR) + 24) % 24;
  const peakShifted  = ((PEAK_HOUR - TROUGH_HOUR) + 24) % 24; // 9

  const angle = shifted <= peakShifted
    ? (shifted / peakShifted) * Math.PI                                          // rising  0→π
    : Math.PI + ((shifted - peakShifted) / (24 - peakShifted)) * Math.PI;       // falling π→2π

  return mid + amp * (-Math.cos(angle));
}

function synthesiseHoursForDay(
  dateStr: string, tmax: number, tmin: number,
  code: number, condition: string, precipProb: number, icon: string,
): WeatherData["hourly"] {
  const hours: WeatherData["hourly"] = [];
  for (let h = 0; h < 24; h++) {
    hours.push({
      time: `${dateStr}T${String(h).padStart(2, "0")}:00`,
      temperature: Math.round(interpTemp(h, tmin, tmax) * 10) / 10,
      weather_code: code,
      precipitation_probability: precipProb,
      condition,
      icon,
    });
  }
  return hours;
}

function synthesiseHourlyFromDaily(dailyArr: WeatherData["daily"]): { hourly: WeatherData["hourly"]; fullHourly: WeatherData["hourly"] } {
  const fullHourly: WeatherData["hourly"] = [];

  for (const day of dailyArr ?? []) {
    fullHourly.push(...synthesiseHoursForDay(
      day.date, day.temperature_max, day.temperature_min,
      day.weather_code, day.condition, day.precipitation_probability, day.icon,
    ));
  }

  // `hourly` = today from current hour onward (the top strip shows 24 entries max)
  const now      = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const curHour  = now.getHours();

  const hourly = fullHourly.filter((e) =>
    e.time.startsWith(todayStr) && parseInt(e.time.slice(11, 13), 10) >= curHour
  );

  return { hourly, fullHourly };
}

// ─────────────────────────────────────────────────────────────────────────────

class WeatherService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-mcp`;
  }

  private async makeRequest(body: any): Promise<WeatherResponse> {
    const session = await supabase.auth.getSession();
    if (!session.data.session) throw new Error("Not authenticated");

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.data.session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }

    if (!response.ok) {
      throw new Error((json && (json.error || json.message)) || text || "Failed to fetch weather data");
    }
    if (!json) throw new Error("Weather function returned non-JSON response");
    return json as WeatherResponse;
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({ action: "get_current", latitude, longitude });
  }

  async getForecast(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({ action: "get_forecast", latitude, longitude });
  }

  async getSettings(): Promise<WeatherSettings | null> {
    return (await this.makeRequest({ action: "get_settings" })).data;
  }

  async updateSettings(settings: Partial<WeatherSettings>): Promise<WeatherSettings> {
    return (await this.makeRequest({ action: "update_settings", settings })).data;
  }

  async getWeatherForLocation(location?: { latitude: number; longitude: number }): Promise<WeatherData> {
    let coords = location;
    if (!coords) {
      const s = await this.getSettings();
      if (s?.latitude && s?.longitude) coords = { latitude: s.latitude, longitude: s.longitude };
    }
    if (!coords) throw new Error("No location provided and no default location set");

    const response = await this.getForecast(coords.latitude, coords.longitude);
    return this.parseWeatherData(response.data);
  }

  // ── Main parser ─────────────────────────────────────────────────────────

  private parseWeatherData(data: any): WeatherData {
    const result: WeatherData = {};
    if (!data || typeof data !== "object") return result;

    // ── Aggregated forecast (get_forecast path) ──────────────────────────
    if (this.isAggregatedDailyForecast(data)) {

      // ── Current observation ──
      // Priority: data.current (the undated observation the edge function fetches
      // — has live temperature, wind, humidity, pressure).
      // Fallback: daily[0].response (only has max/min temps; wind/humidity may be 0).
      const currentSource =
        (data.current && this.isLookupWeatherResponse(data.current))
          ? data.current                          // ← undated observation ✓
          : data.daily?.[0]?.response ?? null;    // ← fallback

      if (currentSource && this.isLookupWeatherResponse(currentSource)) {
        const cur = this.lookupToCurrent(currentSource);
        if (cur) result.current = cur;

        const loc = this.lookupToLocation(currentSource);
        if (loc) result.location = loc;
      }

      // ── Daily array ───────────────────────────────────────────────────
      const dailyArr: WeatherData["daily"] = [];
      for (const item of data.daily ?? []) {
        const d  = item?.date;
        const wx = item?.response;
        if (!d || !wx || !this.isLookupWeatherResponse(wx)) continue;

        const dateStr = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
        const day = this.lookupToDaily(wx, dateStr);
        if (day) dailyArr.push(day);
      }
      if (dailyArr.length) result.daily = dailyArr;

      // ── Hourly ────────────────────────────────────────────────────────
      // If the edge function ever starts returning real hourly data, use it.
      // Otherwise synthesise from daily min/max.
      if (Array.isArray(data.hourly) && data.hourly.length > 0) {
        console.log("[weatherService] real hourly from MCP:", data.hourly.length);
        result.hourly     = data.hourly;
        result.fullHourly = data.hourly;
      } else {
        console.log("[weatherService] synthesising hourly from", dailyArr.length, "daily entries");
        const { hourly, fullHourly } = synthesiseHourlyFromDaily(dailyArr);
        result.hourly     = hourly;
        result.fullHourly = fullHourly;
      }

      result.timezone           = undefined;
      result.utc_offset_seconds = undefined;
      return result;
    }

    // ── Single location-weather response ──────────────────────────────────
    if (this.isLocationWeatherShape(data)) {
      const loc = this.extractLocationFromReturnedLocation(
        data.returnedLocation, data.location_label || data.geocodedAddress || "Selected location"
      );
      if (loc) result.location = loc;

      const current = this.locationWeatherToCurrent(data);
      if (current) result.current = current;

      result.hourly = []; result.fullHourly = []; result.daily = [];
      result.timezone = undefined; result.utc_offset_seconds = undefined;
      return result;
    }

    // ── Raw lookup_weather (get_current) ──────────────────────────────────
    if (this.isLookupWeatherResponse(data)) {
      const current = this.lookupToCurrent(data);
      if (current) result.current = current;

      const loc = this.lookupToLocation(data);
      if (loc) result.location = loc;

      result.hourly = []; result.fullHourly = []; result.daily = [];
      result.timezone = undefined; result.utc_offset_seconds = undefined;
      return result;
    }

    return result;
  }

  // ── Shape detectors ───────────────────────────────────────────────────

  private isAggregatedDailyForecast(obj: any): boolean {
    return !!obj && typeof obj === "object" && Array.isArray(obj.daily) && (obj.current || obj.unitsSystem);
  }

  private isLookupWeatherResponse(obj: any): boolean {
    if (!obj || typeof obj !== "object") return false;
    return (
      !!obj.weatherCondition && typeof obj.weatherCondition === "object" &&
      !!obj.wind             && typeof obj.wind             === "object" &&
      !!obj.returnedLocation && typeof obj.returnedLocation === "object"
    );
  }

  private isLocationWeatherShape(obj: any): boolean {
    return (
      !!obj && typeof obj === "object" &&
      ("weatherCondition" in obj || "temperature" in obj || "wind" in obj) &&
      ("returnedLocation" in obj || "latitude" in obj || "longitude" in obj)
    );
  }

  // ── Field extractors ──────────────────────────────────────────────────

  private lookupToCurrent(wx: any): WeatherData["current"] | undefined {
    const temp =
      this.readTemperatureDegrees(wx.temperature) ??
      this.readTemperatureDegrees(wx.feelsLikeTemperature) ??
      this.readTemperatureDegrees(wx.maxTemperature) ??
      this.readTemperatureDegrees(wx.minTemperature);

    if (typeof temp !== "number") return undefined;

    const conditionText = wx.weatherCondition?.description?.text || "Weather";
    const weather_code  = this.mapGoogleTypeToWeatherCode(wx.weatherCondition?.type);
    const windSpeed     = this.readSpeedValue(wx.wind?.speed) ?? 0;
    const windDir       = this.readWindDirectionDegrees(wx.wind?.direction) ?? 0;
    const humidity      = typeof wx.relativeHumidity === "number" ? wx.relativeHumidity : 0;
    const pressure      = this.readAirPressure(wx.airPressure) ?? 0;
    const uv            = typeof wx.uvIndex === "number" ? wx.uvIndex : undefined;
    const iconBaseUri   = wx.weatherCondition?.iconBaseUri || "";
    const icon          = iconBaseUri ? `${iconBaseUri}.svg` : "";

    return { temperature: temp, weather_code, wind_speed: windSpeed, wind_direction: windDir, humidity, pressure, uv_index: uv, condition: conditionText, icon };
  }

  private lookupToDaily(wx: any, dateStr: string): WeatherData["daily"][number] | undefined {
    const tmax = this.readTemperatureDegrees(wx.maxTemperature);
    const tmin = this.readTemperatureDegrees(wx.minTemperature);
    if (typeof tmax !== "number" && typeof tmin !== "number") return undefined;

    const conditionText = wx.weatherCondition?.description?.text || "Weather";
    const weather_code  = this.mapGoogleTypeToWeatherCode(wx.weatherCondition?.type);
    const qpf           = this.readQpfQuantity(wx.precipitation) ?? 0;
    const precipProb    = this.readPrecipProbability(wx.precipitation) ?? 0;
    const iconBaseUri   = wx.weatherCondition?.iconBaseUri || "";
    const icon          = iconBaseUri ? `${iconBaseUri}.svg` : "";

    return {
      date: dateStr,
      temperature_max: typeof tmax === "number" ? tmax : (tmin as number),
      temperature_min: typeof tmin === "number" ? tmin : (tmax as number),
      weather_code, precipitation_sum: qpf, precipitation_probability: precipProb,
      condition: conditionText, icon,
    };
  }

  private lookupToLocation(wx: any): WeatherData["location"] | undefined {
    const name = wx.returnedLocation?.address || wx.DEPRECATEDGeocodedAddress || "Selected location";
    return this.extractLocationFromReturnedLocation(wx.returnedLocation, name) ?? undefined;
  }

  private extractLocationFromReturnedLocation(rl: any, fallbackName: string): WeatherData["location"] | null {
    const ll = rl?.latLng;
    if (typeof ll?.latitude === "number" && typeof ll?.longitude === "number")
      return { name: fallbackName, latitude: ll.latitude, longitude: ll.longitude };
    return null;
  }

  private locationWeatherToCurrent(obj: any): WeatherData["current"] | undefined {
    const temp = this.readTemperatureDegrees(obj.temperature) ?? this.readTemperatureDegrees(obj.feelsLikeTemperature);
    if (typeof temp !== "number") return undefined;

    const conditionText = obj.weatherCondition?.description?.text || "Weather";
    const weather_code  = this.mapGoogleTypeToWeatherCode(obj.weatherCondition?.type);
    const windSpeed     = this.readSpeedValue(obj.wind?.speed) ?? 0;
    const windDir       = this.readWindDirectionDegrees(obj.wind?.direction) ?? 0;
    const humidity      = typeof obj.relativeHumidity === "number" ? obj.relativeHumidity : 0;
    const pressure      = this.readAirPressure(obj.airPressure) ?? 0;
    const iconBaseUri   = obj.weatherCondition?.iconBaseUri || "";
    const icon          = iconBaseUri ? `${iconBaseUri}.svg` : "";

    return { temperature: temp, weather_code, wind_speed: windSpeed, wind_direction: windDir, humidity, pressure, uv_index: typeof obj.uvIndex === "number" ? obj.uvIndex : undefined, condition: conditionText, icon };
  }

  // ── Primitive readers ───────────────────────────────────────────────────

  private readTemperatureDegrees(t: any): number | null {
    return typeof t?.degrees === "number" ? t.degrees : null;
  }
  private readAirPressure(ap: any): number | null {
    return typeof ap?.meanSeaLevelMillibars === "number" ? ap.meanSeaLevelMillibars : null;
  }
  private readSpeedValue(ws: any): number | null {
    return typeof ws?.value === "number" ? ws.value : null;
  }
  private readWindDirectionDegrees(wd: any): number | null {
    return typeof wd?.degrees === "number" ? wd.degrees : null;
  }
  private readPrecipProbability(p: any): number | null {
    return typeof p?.probability?.percent === "number" ? p.probability.percent : null;
  }
  private readQpfQuantity(p: any): number | null {
    return typeof p?.qpf?.quantity === "number" ? p.qpf.quantity : null;
  }

  // ── Weather-code mapping ────────────────────────────────────────────────

  private mapGoogleTypeToWeatherCode(type: any): number {
    const t = String(type || "").toUpperCase();
    if (!t) return 3;

    const map: Record<string, number> = {
      CLEAR: 0, MOSTLY_CLEAR: 1, PARTLY_CLOUDY: 2, MOSTLY_CLOUDY: 3, CLOUDY: 3,
      FOG: 45, HAZE: 45, MIST: 45,
      DRIZZLE: 51, LIGHT_RAIN: 61, RAIN: 63, HEAVY_RAIN: 65, SHOWERS: 80,
      THUNDERSTORM: 95,
      LIGHT_SNOW: 71, SNOW: 73, HEAVY_SNOW: 75, FLURRIES: 77,
      SLEET: 67, FREEZING_RAIN: 66, ICE_PELLETS: 77,
      WINDY: 3, DUST: 45, SMOKE: 45,
    };
    if (t in map) return map[t];

    if (t.includes("THUNDER"))                              return 95;
    if (t.includes("SNOW"))                                 return 73;
    if (t.includes("SLEET") || t.includes("FREEZ"))         return 66;
    if (t.includes("RAIN"))                                 return 63;
    if (t.includes("DRIZZ"))                                return 51;
    if (t.includes("FOG") || t.includes("MIST") || t.includes("HAZE")) return 45;
    if (t.includes("CLEAR"))                                return 0;
    if (t.includes("CLOUD"))                                return 3;
    return 3;
  }
}

export const weatherService = new WeatherService();