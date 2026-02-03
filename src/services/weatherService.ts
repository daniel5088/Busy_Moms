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

// ─── Hourly synthesis helpers ────────────────────────────────────────────────
// The Google Weather MCP does not expose an hourly endpoint.  When we have daily
// min / max we can produce a convincing 24-hour curve using the standard
// diurnal temperature model:
//   • minimum occurs around 05:00  (trough)
//   • maximum occurs around 14:00  (peak)
//   • the curve between them is sinusoidal
//
// This gives the Hourly Forecast strip and the per-day detail strip real data
// to render without waiting for an API that doesn't exist yet.

/** Hours-since-midnight for the daily temperature trough and peak. */
const TROUGH_HOUR = 5;   // ~5 AM
const PEAK_HOUR   = 14;  // ~2 PM

/**
 * Attempt a sinusoidal interpolation between min and max for a given hour.
 *
 * The model splits the day into two halves:
 *   trough  →  peak   : rising half (cos goes from -1 → +1)
 *   peak    →  next trough : falling half
 *
 * We map hour 0-23 onto that curve so that:
 *   hour == TROUGH_HOUR  → returns tmin
 *   hour == PEAK_HOUR    → returns tmax
 */
function interpTemp(hour: number, tmin: number, tmax: number): number {
  const mid   = (tmax + tmin) / 2;
  const amp   = (tmax - tmin) / 2;

  // Normalise hour so that TROUGH_HOUR maps to 0 on a 24-h cycle
  const shifted = ((hour - TROUGH_HOUR) + 24) % 24;
  // Full cycle period = 24 h.  cos(0)= 1 at trough (we want min there)
  // so we use  -cos  to flip: -cos(0)= -1 → mid + amp*(-1) = tmin  ✓
  //                            -cos(π)= +1 → mid + amp*(+1) = tmax  ✓
  // Peak should land at PEAK_HOUR.  shifted at peak = (14-5)=9 h.
  // We want cos(angle) = -1  →  angle = π.
  // angle = (shifted / peakShifted) * π  where peakShifted = 9
  // For hours past the peak (shifted > 9) the temperature falls back to tmin
  // over the remaining 15 hours → second half of the cosine from π to 2π.
  const peakShifted = ((PEAK_HOUR - TROUGH_HOUR) + 24) % 24; // 9

  let angle: number;
  if (shifted <= peakShifted) {
    // Rising leg: 0 … peakShifted  →  angle 0 … π
    angle = (shifted / peakShifted) * Math.PI;
  } else {
    // Falling leg: peakShifted … 24  →  angle π … 2π
    angle = Math.PI + ((shifted - peakShifted) / (24 - peakShifted)) * Math.PI;
  }

  return mid + amp * (-Math.cos(angle));
}

/**
 * Build 24 synthetic hourly entries for a single day.
 * @param dateStr   "YYYY-MM-DD"
 * @param tmax      daily high
 * @param tmin      daily low
 * @param code      WMO weather code for the day
 * @param condition human-readable condition string
 * @param precipProb day-level precipitation probability (0-100)
 * @param icon      icon URL (passed through unchanged)
 */
function synthesiseHoursForDay(
  dateStr: string,
  tmax: number,
  tmin: number,
  code: number,
  condition: string,
  precipProb: number,
  icon: string,
): WeatherData["hourly"] {
  const hours: WeatherData["hourly"] = [];

  for (let h = 0; h < 24; h++) {
    const HH = String(h).padStart(2, "0");
    hours.push({
      time: `${dateStr}T${HH}:00`,
      temperature: Math.round(interpTemp(h, tmin, tmax) * 10) / 10,
      weather_code: code,
      precipitation_probability: precipProb,
      condition,
      icon,
    });
  }

  return hours;
}

/**
 * Given the parsed `daily` array, produce a full `fullHourly` array (all days)
 * and a `hourly` array (today's remaining hours only, starting from now).
 */
function synthesiseHourlyFromDaily(
  dailyArr: WeatherData["daily"],
): { hourly: WeatherData["hourly"]; fullHourly: WeatherData["hourly"] } {
  const fullHourly: WeatherData["hourly"] = [];

  for (const day of dailyArr ?? []) {
    const dayHours = synthesiseHoursForDay(
      day.date,
      day.temperature_max,
      day.temperature_min,
      day.weather_code,
      day.condition,
      day.precipitation_probability,
      day.icon,
    );
    fullHourly.push(...dayHours);
  }

  // `hourly` = today's hours from current hour onward (what the "Hourly Forecast"
  // strip at the top of the widget renders — it slices to 24 entries itself).
  const now = new Date();
  const todayStr =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentHour = now.getHours();

  const hourly = fullHourly.filter((entry) => {
    if (!entry.time.startsWith(todayStr)) return false;
    const entryHour = parseInt(entry.time.slice(11, 13), 10);
    return entryHour >= currentHour;
  });

  return { hourly, fullHourly };
}

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
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const message = (json && (json.error || json.message)) || text || "Failed to fetch weather data";
      throw new Error(message);
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
    const response = await this.makeRequest({ action: "get_settings" });
    return response.data;
  }

  async updateSettings(settings: Partial<WeatherSettings>): Promise<WeatherSettings> {
    const response = await this.makeRequest({ action: "update_settings", settings });
    return response.data;
  }

  async getWeatherForLocation(location?: { latitude: number; longitude: number }): Promise<WeatherData> {
    let coords = location;

    if (!coords) {
      const settings = await this.getSettings();
      if (settings?.latitude && settings?.longitude) coords = { latitude: settings.latitude, longitude: settings.longitude };
    }

    if (!coords) throw new Error("No location provided and no default location set");

    const response = await this.getForecast(coords.latitude, coords.longitude);
    return this.parseWeatherData(response.data);
  }

  private parseWeatherData(data: any): WeatherData {
    const result: WeatherData = {};
    if (!data || typeof data !== "object") return result;

    // ─── Aggregated daily forecast (the main path for get_forecast) ─────────
    if (this.isAggregatedDailyForecast(data)) {
      const first = data.daily?.[0]?.response;
      if (first && this.isLookupWeatherResponse(first)) {
        const currentFromFirst = this.lookupToCurrent(first);
        if (currentFromFirst) result.current = currentFromFirst;

        const loc = this.lookupToLocation(first);
        if (loc) result.location = loc;
      }

      // ── Parse daily array ──
      const dailyArr: WeatherData["daily"] = [];
      for (const item of data.daily ?? []) {
        const d = item?.date;
        const wx = item?.response;
        if (!d || !wx || !this.isLookupWeatherResponse(wx)) continue;

        const day = this.lookupToDaily(wx, `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`);
        if (day) dailyArr.push(day);
      }
      if (dailyArr.length) result.daily = dailyArr;

      // ── Hourly: use real data if the MCP ever starts returning it,
      //     otherwise synthesise from daily min/max ──────────────────
      if (Array.isArray(data.hourly) && data.hourly.length > 0) {
        // Real hourly data arrived from the edge function — pass it through.
        // Each entry is expected to already have: time, temperature, weather_code,
        // precipitation_probability, condition, icon  (or close enough).
        console.log("[weatherService] Using real hourly data from MCP (" + data.hourly.length + " entries)");
        result.hourly     = data.hourly as WeatherData["hourly"];
        result.fullHourly = data.hourly as WeatherData["hourly"];
      } else {
        // MCP confirmed no hourly endpoint → synthesise from daily.
        console.log("[weatherService] No real hourly data — synthesising from daily min/max");
        const { hourly, fullHourly } = synthesiseHourlyFromDaily(dailyArr);
        result.hourly     = hourly;
        result.fullHourly = fullHourly;
      }

      result.timezone            = undefined;
      result.utc_offset_seconds  = undefined;

      return result;
    }

    // ─── Single location-weather response (get_location_weather) ─────────────
    if (this.isLocationWeatherShape(data)) {
      const loc = this.extractLocationFromReturnedLocation(data.returnedLocation, data.location_label || data.geocodedAddress || "Selected location");
      if (loc) result.location = loc;

      const current = this.locationWeatherToCurrent(data);
      if (current) result.current = current;

      result.hourly     = [];
      result.fullHourly = [];
      result.daily      = [];
      result.timezone            = undefined;
      result.utc_offset_seconds  = undefined;

      return result;
    }

    // ─── Raw lookup_weather response (get_current) ──────────────────────────
    if (this.isLookupWeatherResponse(data)) {
      const current = this.lookupToCurrent(data);
      if (current) result.current = current;

      const loc = this.lookupToLocation(data);
      if (loc) result.location = loc;

      result.hourly     = [];
      result.fullHourly = [];
      result.daily      = [];
      result.timezone            = undefined;
      result.utc_offset_seconds  = undefined;

      return result;
    }

    return result;
  }

  // ── Shape detectors ───────────────────────────────────────────────────────

  private isAggregatedDailyForecast(obj: any): boolean {
    return !!obj && typeof obj === "object" && Array.isArray(obj.daily) && (obj.current || obj.unitsSystem);
  }

  private isLookupWeatherResponse(obj: any): boolean {
    if (!obj || typeof obj !== "object") return false;
    const hasCondition = !!obj.weatherCondition && typeof obj.weatherCondition === "object";
    const hasWind = !!obj.wind && typeof obj.wind === "object";
    const hasReturnedLocation = !!obj.returnedLocation && typeof obj.returnedLocation === "object";
    return hasCondition && hasWind && hasReturnedLocation;
  }

  private isLocationWeatherShape(obj: any): boolean {
    return (
      !!obj &&
      typeof obj === "object" &&
      ("weatherCondition" in obj || "temperature" in obj || "wind" in obj) &&
      ("returnedLocation" in obj || "latitude" in obj || "longitude" in obj)
    );
  }

  // ── Field extractors ──────────────────────────────────────────────────────

  private lookupToCurrent(wx: any): WeatherData["current"] | undefined {
    const temp = this.readTemperatureDegrees(wx.temperature) ??
      this.readTemperatureDegrees(wx.feelsLikeTemperature) ??
      this.readTemperatureDegrees(wx.maxTemperature) ??
      this.readTemperatureDegrees(wx.minTemperature);

    if (typeof temp !== "number") return undefined;

    const conditionText = wx.weatherCondition?.description?.text || "Weather";
    const type = wx.weatherCondition?.type;
    const weather_code = this.mapGoogleTypeToWeatherCode(type);

    const windSpeed = this.readSpeedValue(wx.wind?.speed) ?? 0;
    const windDir = this.readWindDirectionDegrees(wx.wind?.direction) ?? 0;

    const humidity = typeof wx.relativeHumidity === "number" ? wx.relativeHumidity : 0;
    const pressure = this.readAirPressure(wx.airPressure) ?? 0;

    const uv = typeof wx.uvIndex === "number" ? wx.uvIndex : undefined;

    const iconBaseUri = wx.weatherCondition?.iconBaseUri || "";
    const icon = iconBaseUri ? `${iconBaseUri}.svg` : "";

    return {
      temperature: temp,
      weather_code,
      wind_speed: windSpeed,
      wind_direction: windDir,
      humidity,
      pressure,
      uv_index: uv,
      condition: conditionText,
      icon,
    };
  }

  private lookupToDaily(wx: any, dateStr: string): WeatherData["daily"][number] | undefined {
    const tmax = this.readTemperatureDegrees(wx.maxTemperature);
    const tmin = this.readTemperatureDegrees(wx.minTemperature);

    if (typeof tmax !== "number" && typeof tmin !== "number") return undefined;

    const conditionText = wx.weatherCondition?.description?.text || "Weather";
    const type = wx.weatherCondition?.type;
    const weather_code = this.mapGoogleTypeToWeatherCode(type);

    const qpf = this.readQpfQuantity(wx.precipitation) ?? 0;
    const precipProb = this.readPrecipProbability(wx.precipitation) ?? 0;

    const iconBaseUri = wx.weatherCondition?.iconBaseUri || "";
    const icon = iconBaseUri ? `${iconBaseUri}.svg` : "";

    return {
      date: dateStr,
      temperature_max: typeof tmax === "number" ? tmax : (typeof tmin === "number" ? tmin : 0),
      temperature_min: typeof tmin === "number" ? tmin : (typeof tmax === "number" ? tmax : 0),
      weather_code,
      precipitation_sum: qpf,
      precipitation_probability: precipProb,
      condition: conditionText,
      icon,
    };
  }

  private lookupToLocation(wx: any): WeatherData["location"] | undefined {
    const name = wx.returnedLocation?.address || wx.DEPRECATEDGeocodedAddress || "Selected location";
    return this.extractLocationFromReturnedLocation(wx.returnedLocation, name) ?? undefined;
  }

  private extractLocationFromReturnedLocation(rl: any, fallbackName: string): WeatherData["location"] | null {
    const ll = rl?.latLng;
    const lat = ll?.latitude;
    const lng = ll?.longitude;
    if (typeof lat === "number" && typeof lng === "number") {
      return { name: fallbackName, latitude: lat, longitude: lng };
    }
    return null;
  }

  private locationWeatherToCurrent(obj: any): WeatherData["current"] | undefined {
    const temp = this.readTemperatureDegrees(obj.temperature) ??
      this.readTemperatureDegrees(obj.feelsLikeTemperature);

    if (typeof temp !== "number") return undefined;

    const conditionText = obj.weatherCondition?.description?.text || "Weather";
    const type = obj.weatherCondition?.type;
    const weather_code = this.mapGoogleTypeToWeatherCode(type);

    const windSpeed = this.readSpeedValue(obj.wind?.speed) ?? 0;
    const windDir = this.readWindDirectionDegrees(obj.wind?.direction) ?? 0;

    const humidity = typeof obj.relativeHumidity === "number" ? obj.relativeHumidity : 0;
    const pressure = this.readAirPressure(obj.airPressure) ?? 0;

    const iconBaseUri = obj.weatherCondition?.iconBaseUri || "";
    const icon = iconBaseUri ? `${iconBaseUri}.svg` : "";

    return {
      temperature: temp,
      weather_code,
      wind_speed: windSpeed,
      wind_direction: windDir,
      humidity,
      pressure,
      uv_index: typeof obj.uvIndex === "number" ? obj.uvIndex : undefined,
      condition: conditionText,
      icon,
    };
  }

  // ── Primitive readers ─────────────────────────────────────────────────────

  private readTemperatureDegrees(t: any): number | null {
    const deg = t?.degrees;
    return typeof deg === "number" ? deg : null;
  }

  private readAirPressure(ap: any): number | null {
    const msl = ap?.meanSeaLevelMillibars;
    return typeof msl === "number" ? msl : null;
  }

  private readSpeedValue(ws: any): number | null {
    const v = ws?.value;
    return typeof v === "number" ? v : null;
  }

  private readWindDirectionDegrees(wd: any): number | null {
    const deg = wd?.degrees;
    return typeof deg === "number" ? deg : null;
  }

  private readPrecipProbability(p: any): number | null {
    const percent = p?.probability?.percent;
    return typeof percent === "number" ? percent : null;
  }

  private readQpfQuantity(p: any): number | null {
    const q = p?.qpf?.quantity;
    return typeof q === "number" ? q : null;
  }

  // ── Weather-code mapping ──────────────────────────────────────────────────

  private mapGoogleTypeToWeatherCode(type: any): number {
    const t = String(type || "").toUpperCase();
    if (!t) return 3;

    const map: Record<string, number> = {
      CLEAR: 0,
      MOSTLY_CLEAR: 1,
      PARTLY_CLOUDY: 2,
      MOSTLY_CLOUDY: 3,
      CLOUDY: 3,
      FOG: 45,
      HAZE: 45,
      MIST: 45,
      DRIZZLE: 51,
      LIGHT_RAIN: 61,
      RAIN: 63,
      HEAVY_RAIN: 65,
      SHOWERS: 80,
      THUNDERSTORM: 95,
      LIGHT_SNOW: 71,
      SNOW: 73,
      HEAVY_SNOW: 75,
      FLURRIES: 77,
      SLEET: 67,
      FREEZING_RAIN: 66,
      ICE_PELLETS: 77,
      WINDY: 3,
      DUST: 45,
      SMOKE: 45,
    };

    if (t in map) return map[t];

    if (t.includes("THUNDER")) return 95;
    if (t.includes("SNOW")) return 73;
    if (t.includes("SLEET") || t.includes("FREEZ")) return 66;
    if (t.includes("RAIN")) return 63;
    if (t.includes("DRIZZ")) return 51;
    if (t.includes("FOG") || t.includes("MIST") || t.includes("HAZE")) return 45;
    if (t.includes("CLEAR")) return 0;
    if (t.includes("CLOUD")) return 3;

    return 3;
  }
}

export const weatherService = new WeatherService();