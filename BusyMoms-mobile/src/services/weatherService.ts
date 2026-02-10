import * as Location from 'expo-location';
import { callEdgeFunction } from '../lib/supabase';
import { logger } from '../utils/logger';

// ---- Google Weather API Response Types -------------------------------------------

interface TemperatureValue {
  degrees?: number;
}

interface SpeedValue {
  value?: number;
}

interface DirectionValue {
  degrees?: number;
}

interface AirPressureValue {
  meanSeaLevelMillibars?: number;
}

interface PrecipitationProbability {
  percent?: number;
}

interface PrecipitationQpf {
  quantity?: number;
}

interface PrecipitationData {
  probability?: PrecipitationProbability;
  qpf?: PrecipitationQpf;
}

interface WeatherConditionDescription {
  text?: string;
}

interface WeatherCondition {
  type?: string;
  description?: WeatherConditionDescription;
  iconBaseUri?: string;
}

interface WindData {
  speed?: SpeedValue;
  direction?: DirectionValue;
}

interface LatLng {
  latitude?: number;
  longitude?: number;
}

interface ReturnedLocation {
  address?: string;
  latLng?: LatLng;
}

interface LookupWeatherResponse {
  weatherCondition?: WeatherCondition;
  temperature?: TemperatureValue;
  feelsLikeTemperature?: TemperatureValue;
  maxTemperature?: TemperatureValue;
  minTemperature?: TemperatureValue;
  wind?: WindData;
  returnedLocation?: ReturnedLocation;
  relativeHumidity?: number;
  airPressure?: AirPressureValue;
  uvIndex?: number;
  heatIndex?: TemperatureValue;
  cloudCover?: number;
  thunderstormProbability?: number;
  precipitation?: PrecipitationData;
  DEPRECATEDGeocodedAddress?: string;
}

interface LocationWeatherResponse extends LookupWeatherResponse {
  location_label?: string;
  geocodedAddress?: string;
  latitude?: number;
  longitude?: number;
}

interface DailyForecastItem {
  date?: {
    year: number;
    month: number;
    day: number;
  };
  response?: LookupWeatherResponse;
}

interface AggregatedDailyForecast {
  current?: LookupWeatherResponse;
  unitsSystem?: string;
  daily?: DailyForecastItem[];
  hourly?: Array<{
    time: string;
    temperature: number;
    weather_code: number;
    precipitation_probability: number;
    condition: string;
    icon: string;
  }>;
}

interface EventWeatherResponse extends LookupWeatherResponse {
  location_label?: string;
  eventDate: string;
  eventTime?: string;
  latitude?: number;
  longitude?: number;
}

interface WeatherApiRequestBody extends Record<string, unknown> {
  action: string;
  latitude?: number;
  longitude?: number;
  settings?: Partial<WeatherSettings>;
  location?: string;
  eventDate?: string;
  eventTime?: string;
  force?: boolean;
}

// ---- Exported Types -------------------------------------------

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
  show_hourly_forecast?: boolean;
  show_wind?: boolean;
  show_humidity?: boolean;
  show_pressure?: boolean;
  show_feels_like?: boolean;
  show_heat_index?: boolean;
  show_uv_index?: boolean;
  show_cloud_cover?: boolean;
  show_thunderstorm_probability?: boolean;
  show_sun_events?: boolean;
  show_moon_events?: boolean;
  show_air_quality?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CurrentWeather {
  temperature: number;
  weather_code: number;
  wind_speed: number;
  wind_direction: number;
  humidity: number;
  pressure: number;
  uv_index?: number;
  feels_like?: number;
  heat_index?: number;
  cloud_cover?: number;
  thunderstorm_probability?: number;
  condition: string;
  icon: string;
}

export interface WeatherData {
  current?: CurrentWeather;
  location?: {
    name: string;
    latitude: number;
    longitude: number;
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
}

export interface WeatherSuggestion {
  icon: 'umbrella' | 'snowflake' | 'sun' | 'cloud' | 'cloud-sun' | 'cloud-lightning' | 'cloud-fog' | 'wind';
  text: string;
  severity: 'good' | 'info' | 'warning' | 'danger';
}

export interface EventWeatherData {
  location: string;
  eventDate: string;
  eventTime?: string | null;
  condition: string;
  conditionType: string;
  weatherCode: number;
  temperature?: number;
  temperatureMax?: number;
  temperatureMin?: number;
  precipitationProbability: number;
  precipitationType: 'rain' | 'snow' | 'sleet' | 'none';
  windSpeed?: number;
  humidity?: number;
  uvIndex?: number;
  icon: string;
  suggestion: WeatherSuggestion;
  latitude?: number;
  longitude?: number;
}

interface WeatherResponse {
  data: LookupWeatherResponse | AggregatedDailyForecast | LocationWeatherResponse | EventWeatherResponse | WeatherSettings | null;
  cached?: boolean;
  error?: string;
}

// Hourly synthesis from daily data
const TROUGH_HOUR = 5;
const PEAK_HOUR = 14;

function interpTemp(hour: number, tmin: number, tmax: number): number {
  const mid = (tmax + tmin) / 2;
  const amp = (tmax - tmin) / 2;
  const shifted = ((hour - TROUGH_HOUR) + 24) % 24;
  const peakShifted = ((PEAK_HOUR - TROUGH_HOUR) + 24) % 24;

  const angle = shifted <= peakShifted
    ? (shifted / peakShifted) * Math.PI
    : Math.PI + ((shifted - peakShifted) / (24 - peakShifted)) * Math.PI;

  return mid + amp * (-Math.cos(angle));
}

function synthesiseHoursForDay(
  dateStr: string,
  tmax: number,
  tmin: number,
  code: number,
  condition: string,
  precipProb: number,
  icon: string,
): WeatherData['hourly'] {
  const hours: WeatherData['hourly'] = [];
  for (let h = 0; h < 24; h++) {
    hours.push({
      time: `${dateStr}T${String(h).padStart(2, '0')}:00`,
      temperature: Math.round(interpTemp(h, tmin, tmax) * 10) / 10,
      weather_code: code,
      precipitation_probability: precipProb,
      condition,
      icon,
    });
  }
  return hours;
}

function synthesiseHourlyFromDaily(dailyArr: WeatherData['daily']): Array<{
  time: string;
  temperature: number;
  weather_code: number;
  precipitation_probability: number;
  condition: string;
  icon: string;
}> {
  const fullHourly: Array<{
    time: string;
    temperature: number;
    weather_code: number;
    precipitation_probability: number;
    condition: string;
    icon: string;
  }> = [];

  if (!dailyArr) return [];

  for (const day of dailyArr) {
    const hours = synthesiseHoursForDay(
      day.date,
      day.temperature_max,
      day.temperature_min,
      day.weather_code,
      day.condition,
      day.precipitation_probability,
      day.icon,
    );
    if (hours) {
      fullHourly.push(...hours);
    }
  }

  // Return today from current hour onward
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const curHour = now.getHours();

  return fullHourly.filter((e) =>
    e.time.startsWith(todayStr) && parseInt(e.time.slice(11, 13), 10) >= curHour
  );
}

class WeatherService {
  private totalApiCalls = 0;

  private async makeRequest(body: WeatherApiRequestBody): Promise<WeatherResponse> {
    this.totalApiCalls++;
    logger.debug(`[WeatherService] 📡 API Call #${this.totalApiCalls}`, body.action);

    const response = await callEdgeFunction<WeatherResponse>('weather-mcp', body);

    logger.debug(`[WeatherService] ✅ API Call #${this.totalApiCalls} completed`);
    return response;
  }

  /**
   * Request location permission and get current coordinates
   */
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        logger.debug('[WeatherService] Location permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error: unknown) {
      logger.error('[WeatherService] Error getting location:', error);
      return null;
    }
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({ action: 'get_current', latitude, longitude });
  }

  async getForecast(latitude: number, longitude: number): Promise<WeatherResponse> {
    return this.makeRequest({ action: 'get_forecast', latitude, longitude });
  }

  async getSettings(): Promise<WeatherSettings | null> {
    return (await this.makeRequest({ action: 'get_settings' })).data as WeatherSettings | null;
  }

  async updateSettings(settings: Partial<WeatherSettings>): Promise<WeatherSettings> {
    return (await this.makeRequest({ action: 'update_settings', settings })).data as WeatherSettings;
  }

  async getWeatherForLocation(location?: { latitude: number; longitude: number }): Promise<WeatherData> {
    let coords = location;

    if (!coords) {
      // Try to get from settings first
      const settings = await this.getSettings();
      if (settings?.latitude && settings?.longitude) {
        coords = { latitude: settings.latitude, longitude: settings.longitude };
      } else {
        // Fall back to device location
        const deviceLocation = await this.getCurrentLocation();
        if (deviceLocation) {
          coords = deviceLocation;
        }
      }
    }

    if (!coords) {
      throw new Error('Unable to determine location. Please enable location services or set a default location.');
    }

    const response = await this.getForecast(coords.latitude, coords.longitude);
    return this.parseWeatherData(response.data);
  }

  /**
   * Get weather for a specific event location and date/time
   */
  async getEventWeather(
    location: string,
    eventDate: string,
    eventTime?: string | null,
    force?: boolean
  ): Promise<EventWeatherData | null> {
    try {
      const response = await this.makeRequest({
        action: 'get_event_weather',
        location,
        eventDate,
        eventTime: eventTime ?? undefined,
        force,
      });

      if (!response.data) {
        return null;
      }

      // Type guard: ensure the response is EventWeatherResponse
      const eventData = response.data as EventWeatherResponse;
      return this.parseEventWeatherData(eventData);
    } catch (error: unknown) {
      logger.error('[WeatherService] Event weather error:', error);
      return null;
    }
  }

  private parseWeatherData(data: LookupWeatherResponse | AggregatedDailyForecast | LocationWeatherResponse | EventWeatherResponse | WeatherSettings | null): WeatherData {
    const result: WeatherData = {};
    if (!data || typeof data !== 'object') return result;

    // Aggregated forecast
    if (this.isAggregatedDailyForecast(data)) {
      const currentSource = (data.current && this.isLookupWeatherResponse(data.current))
        ? data.current
        : data.daily?.[0]?.response ?? null;

      if (currentSource && this.isLookupWeatherResponse(currentSource)) {
        const cur = this.lookupToCurrent(currentSource);
        if (cur) result.current = cur;

        const loc = this.lookupToLocation(currentSource);
        if (loc) result.location = loc;
      }

      // Daily array
      const dailyArr: WeatherData['daily'] = [];
      const dailyData = data.daily || [];
      for (const item of dailyData) {
        const d = item?.date;
        const wx = item?.response;
        if (!d || !wx || !this.isLookupWeatherResponse(wx)) continue;

        const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        const day = this.lookupToDaily(wx, dateStr);
        if (day) dailyArr.push(day);
      }
      if (dailyArr.length) result.daily = dailyArr;

      // Hourly (synthesized from daily)
      if (Array.isArray(data.hourly) && data.hourly.length > 0) {
        result.hourly = data.hourly;
      } else {
        const synthesizedHourly = synthesiseHourlyFromDaily(dailyArr);
        result.hourly = synthesizedHourly || [];
      }

      return result;
    }

    // Single location-weather response
    if (this.isLocationWeatherShape(data)) {
      const loc = this.extractLocationFromReturnedLocation(
        data.returnedLocation,
        data.location_label || data.geocodedAddress || 'Selected location'
      );
      if (loc) result.location = loc;

      const current = this.locationWeatherToCurrent(data);
      if (current) result.current = current;

      result.hourly = [];
      result.daily = [];
      return result;
    }

    // Raw lookup_weather
    if (this.isLookupWeatherResponse(data)) {
      const current = this.lookupToCurrent(data);
      if (current) result.current = current;

      const loc = this.lookupToLocation(data);
      if (loc) result.location = loc;

      result.hourly = [];
      result.daily = [];
      return result;
    }

    return result;
  }

  private parseEventWeatherData(data: EventWeatherResponse | null): EventWeatherData | null {
    if (!data) return null;

    const conditionType = data.weatherCondition?.type || '';
    const conditionText = data.weatherCondition?.description?.text || 'Weather';
    const weatherCode = this.mapGoogleTypeToWeatherCode(conditionType);

    const precipProb = data.precipitation?.probability?.percent ?? 0;
    const precipType = this.getPrecipitationType(conditionType, weatherCode);

    const temp = this.readTemperatureDegrees(data.temperature) ??
      this.readTemperatureDegrees(data.maxTemperature) ??
      this.readTemperatureDegrees(data.minTemperature);
    const tempMax = this.readTemperatureDegrees(data.maxTemperature);
    const tempMin = this.readTemperatureDegrees(data.minTemperature);

    const iconBaseUri = data.weatherCondition?.iconBaseUri || '';
    const icon = iconBaseUri ? `${iconBaseUri}.svg` : '';

    const latitude = typeof data.latitude === 'number' ? data.latitude : undefined;
    const longitude = typeof data.longitude === 'number' ? data.longitude : undefined;

    return {
      location: data.location_label || 'Unknown',
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      condition: conditionText,
      conditionType: conditionType,
      weatherCode,
      temperature: temp ?? undefined,
      temperatureMax: tempMax ?? undefined,
      temperatureMin: tempMin ?? undefined,
      precipitationProbability: precipProb,
      precipitationType: precipType,
      windSpeed: this.readSpeedValue(data.wind?.speed) ?? undefined,
      humidity: typeof data.relativeHumidity === 'number' ? data.relativeHumidity : undefined,
      uvIndex: typeof data.uvIndex === 'number' ? data.uvIndex : undefined,
      icon,
      suggestion: this.getWeatherSuggestion(weatherCode, precipProb, precipType),
      latitude,
      longitude,
    };
  }

  private getPrecipitationType(conditionType: string, weatherCode: number): 'rain' | 'snow' | 'sleet' | 'none' {
    const t = conditionType.toUpperCase();
    if (t.includes('SNOW') || t.includes('FLURR')) return 'snow';
    if (t.includes('SLEET') || t.includes('ICE') || t.includes('FREEZ')) return 'sleet';
    if (t.includes('RAIN') || t.includes('DRIZZ') || t.includes('SHOWER') || (weatherCode >= 51 && weatherCode <= 67)) return 'rain';
    if (weatherCode >= 71 && weatherCode <= 77) return 'snow';
    return 'none';
  }

  private getWeatherSuggestion(weatherCode: number, precipProb: number, precipType: string): WeatherSuggestion {
    if ((precipType === 'rain' && precipProb >= 30) || (weatherCode >= 51 && weatherCode <= 67)) {
      return {
        icon: 'umbrella',
        text: precipProb >= 60 ? 'Bring an umbrella!' : 'Rain possible - consider an umbrella',
        severity: precipProb >= 60 ? 'warning' : 'info',
      };
    }

    if ((precipType === 'snow' && precipProb >= 30) || (weatherCode >= 71 && weatherCode <= 77)) {
      return {
        icon: 'snowflake',
        text: 'Snow expected - dress warmly',
        severity: 'warning',
      };
    }

    if (weatherCode >= 95) {
      return {
        icon: 'cloud-lightning',
        text: 'Thunderstorm expected - stay safe',
        severity: 'danger',
      };
    }

    if (weatherCode >= 45 && weatherCode <= 48) {
      return {
        icon: 'cloud-fog',
        text: 'Foggy conditions - drive carefully',
        severity: 'info',
      };
    }

    if (weatherCode === 0) {
      return {
        icon: 'sun',
        text: 'Clear skies!',
        severity: 'good',
      };
    }

    if (weatherCode <= 3) {
      return {
        icon: 'cloud-sun',
        text: 'Partly cloudy',
        severity: 'good',
      };
    }

    return {
      icon: 'cloud',
      text: 'Cloudy',
      severity: 'info',
    };
  }

  private isAggregatedDailyForecast(obj: unknown): obj is AggregatedDailyForecast {
    return !!obj && typeof obj === 'object' && 'daily' in obj && Array.isArray(obj.daily) && ('current' in obj || 'unitsSystem' in obj);
  }

  private isLookupWeatherResponse(obj: unknown): obj is LookupWeatherResponse {
    if (!obj || typeof obj !== 'object') return false;
    return (
      'weatherCondition' in obj && !!obj.weatherCondition && typeof obj.weatherCondition === 'object' &&
      'wind' in obj && !!obj.wind && typeof obj.wind === 'object' &&
      'returnedLocation' in obj && !!obj.returnedLocation && typeof obj.returnedLocation === 'object'
    );
  }

  private isLocationWeatherShape(obj: unknown): obj is LocationWeatherResponse {
    return (
      !!obj && typeof obj === 'object' &&
      ('weatherCondition' in obj || 'temperature' in obj || 'wind' in obj) &&
      ('returnedLocation' in obj || 'latitude' in obj || 'longitude' in obj)
    );
  }

  private lookupToCurrent(wx: LookupWeatherResponse): CurrentWeather | undefined {
    const temp =
      this.readTemperatureDegrees(wx.temperature) ??
      this.readTemperatureDegrees(wx.feelsLikeTemperature) ??
      this.readTemperatureDegrees(wx.maxTemperature) ??
      this.readTemperatureDegrees(wx.minTemperature);

    if (typeof temp !== 'number') return undefined;

    const conditionText = wx.weatherCondition?.description?.text || 'Weather';
    const weather_code = this.mapGoogleTypeToWeatherCode(wx.weatherCondition?.type);
    const windSpeed = this.readSpeedValue(wx.wind?.speed) ?? 0;
    const windDir = this.readWindDirectionDegrees(wx.wind?.direction) ?? 0;
    const humidity = typeof wx.relativeHumidity === 'number' ? wx.relativeHumidity : 0;
    const pressure = this.readAirPressure(wx.airPressure) ?? 0;
    const uv = typeof wx.uvIndex === 'number' ? wx.uvIndex : undefined;
    const feelsLike = this.readTemperatureDegrees(wx.feelsLikeTemperature) ?? undefined;
    const heatIndex = this.readTemperatureDegrees(wx.heatIndex) ?? undefined;
    const cloudCover = typeof wx.cloudCover === 'number' ? wx.cloudCover : undefined;
    const thunderProb = typeof wx.thunderstormProbability === 'number' ? wx.thunderstormProbability : undefined;
    const iconBaseUri = wx.weatherCondition?.iconBaseUri || '';
    const icon = iconBaseUri ? `${iconBaseUri}.svg` : '';

    return {
      temperature: temp,
      weather_code,
      wind_speed: windSpeed,
      wind_direction: windDir,
      humidity,
      pressure,
      uv_index: uv,
      feels_like: feelsLike,
      heat_index: heatIndex,
      cloud_cover: cloudCover,
      thunderstorm_probability: thunderProb,
      condition: conditionText,
      icon,
    };
  }

  private lookupToDaily(wx: LookupWeatherResponse, dateStr: string): NonNullable<WeatherData['daily']>[number] | undefined {
    const tmax = this.readTemperatureDegrees(wx.maxTemperature);
    const tmin = this.readTemperatureDegrees(wx.minTemperature);
    if (typeof tmax !== 'number' && typeof tmin !== 'number') return undefined;

    const conditionText = wx.weatherCondition?.description?.text || 'Weather';
    const weather_code = this.mapGoogleTypeToWeatherCode(wx.weatherCondition?.type);
    const qpf = this.readQpfQuantity(wx.precipitation) ?? 0;
    const precipProb = this.readPrecipProbability(wx.precipitation) ?? 0;
    const iconBaseUri = wx.weatherCondition?.iconBaseUri || '';
    const icon = iconBaseUri ? `${iconBaseUri}.svg` : '';

    return {
      date: dateStr,
      temperature_max: typeof tmax === 'number' ? tmax : (tmin ?? 0),
      temperature_min: typeof tmin === 'number' ? tmin : (tmax ?? 0),
      weather_code,
      precipitation_sum: qpf,
      precipitation_probability: precipProb,
      condition: conditionText,
      icon,
    };
  }

  private lookupToLocation(wx: LookupWeatherResponse): WeatherData['location'] | undefined {
    const name = wx.returnedLocation?.address || wx.DEPRECATEDGeocodedAddress || 'Selected location';
    return this.extractLocationFromReturnedLocation(wx.returnedLocation, name) ?? undefined;
  }

  private extractLocationFromReturnedLocation(rl: ReturnedLocation | undefined, fallbackName: string): WeatherData['location'] | null {
    const ll = rl?.latLng;
    if (typeof ll?.latitude === 'number' && typeof ll?.longitude === 'number') {
      return { name: fallbackName, latitude: ll.latitude, longitude: ll.longitude };
    }
    return null;
  }

  private locationWeatherToCurrent(obj: LocationWeatherResponse): CurrentWeather | undefined {
    const temp = this.readTemperatureDegrees(obj.temperature) ?? this.readTemperatureDegrees(obj.feelsLikeTemperature);
    if (typeof temp !== 'number') return undefined;

    const conditionText = obj.weatherCondition?.description?.text || 'Weather';
    const weather_code = this.mapGoogleTypeToWeatherCode(obj.weatherCondition?.type);
    const windSpeed = this.readSpeedValue(obj.wind?.speed) ?? 0;
    const windDir = this.readWindDirectionDegrees(obj.wind?.direction) ?? 0;
    const humidity = typeof obj.relativeHumidity === 'number' ? obj.relativeHumidity : 0;
    const pressure = this.readAirPressure(obj.airPressure) ?? 0;
    const feelsLike = this.readTemperatureDegrees(obj.feelsLikeTemperature) ?? undefined;
    const heatIndex = this.readTemperatureDegrees(obj.heatIndex) ?? undefined;
    const cloudCover = typeof obj.cloudCover === 'number' ? obj.cloudCover : undefined;
    const thunderProb = typeof obj.thunderstormProbability === 'number' ? obj.thunderstormProbability : undefined;
    const iconBaseUri = obj.weatherCondition?.iconBaseUri || '';
    const icon = iconBaseUri ? `${iconBaseUri}.svg` : '';

    return {
      temperature: temp,
      weather_code,
      wind_speed: windSpeed,
      wind_direction: windDir,
      humidity,
      pressure,
      uv_index: typeof obj.uvIndex === 'number' ? obj.uvIndex : undefined,
      feels_like: feelsLike,
      heat_index: heatIndex,
      cloud_cover: cloudCover,
      thunderstorm_probability: thunderProb,
      condition: conditionText,
      icon,
    };
  }

  private readTemperatureDegrees(t: TemperatureValue | undefined): number | null {
    return typeof t?.degrees === 'number' ? t.degrees : null;
  }

  private readAirPressure(ap: AirPressureValue | undefined): number | null {
    return typeof ap?.meanSeaLevelMillibars === 'number' ? ap.meanSeaLevelMillibars : null;
  }

  private readSpeedValue(ws: SpeedValue | undefined): number | null {
    return typeof ws?.value === 'number' ? ws.value : null;
  }

  private readWindDirectionDegrees(wd: DirectionValue | undefined): number | null {
    return typeof wd?.degrees === 'number' ? wd.degrees : null;
  }

  private readPrecipProbability(p: PrecipitationData | undefined): number | null {
    return typeof p?.probability?.percent === 'number' ? p.probability.percent : null;
  }

  private readQpfQuantity(p: PrecipitationData | undefined): number | null {
    return typeof p?.qpf?.quantity === 'number' ? p.qpf.quantity : null;
  }

  private mapGoogleTypeToWeatherCode(type: string | undefined): number {
    const t = String(type || '').toUpperCase();
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
    if (t in map) return map[t] as number;

    if (t.includes('THUNDER')) return 95;
    if (t.includes('SNOW')) return 73;
    if (t.includes('SLEET') || t.includes('FREEZ')) return 66;
    if (t.includes('RAIN')) return 63;
    if (t.includes('DRIZZ')) return 51;
    if (t.includes('FOG') || t.includes('MIST') || t.includes('HAZE')) return 45;
    if (t.includes('CLEAR')) return 0;
    if (t.includes('CLOUD')) return 3;
    return 3;
  }
}

export const weatherService = new WeatherService();
