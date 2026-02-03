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

    if (this.isAggregatedDailyForecast(data)) {
      const unitsSystem: UnitsSystem = data.unitsSystem === "IMPERIAL" ? "IMPERIAL" : "METRIC";
      const first = data.daily?.[0]?.response;
      if (first && this.isLookupWeatherResponse(first)) {
        const currentFromFirst = this.lookupToCurrent(first);
        if (currentFromFirst) result.current = currentFromFirst;

        const loc = this.lookupToLocation(first);
        if (loc) result.location = loc;
      }

      const dailyArr: WeatherData["daily"] = [];
      for (const item of data.daily ?? []) {
        const d = item?.date;
        const wx = item?.response;
        if (!d || !wx || !this.isLookupWeatherResponse(wx)) continue;

        const day = this.lookupToDaily(wx, `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`);
        if (day) dailyArr.push(day);
      }
      if (dailyArr.length) result.daily = dailyArr;

      result.hourly = [];
      result.fullHourly = [];
      result.timezone = undefined;
      result.utc_offset_seconds = undefined;

      return result;
    }

    if (this.isLocationWeatherShape(data)) {
      const loc = this.extractLocationFromReturnedLocation(data.returnedLocation, data.location_label || data.geocodedAddress || "Selected location");
      if (loc) result.location = loc;

      const current = this.locationWeatherToCurrent(data);
      if (current) result.current = current;

      result.hourly = [];
      result.fullHourly = [];
      result.daily = [];
      result.timezone = undefined;
      result.utc_offset_seconds = undefined;

      return result;
    }

    if (this.isLookupWeatherResponse(data)) {
      const current = this.lookupToCurrent(data);
      if (current) result.current = current;

      const loc = this.lookupToLocation(data);
      if (loc) result.location = loc;

      result.hourly = [];
      result.fullHourly = [];
      result.daily = [];
      result.timezone = undefined;
      result.utc_offset_seconds = undefined;

      return result;
    }

    return result;
  }

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

    const precipProb = this.readPrecipProbability(wx.precipitation) ?? 0;
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
