import { weatherService } from './weatherService';

export interface WeatherToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class WeatherAgentService {
  async getCurrentWeather(latitude?: number, longitude?: number): Promise<WeatherToolResult> {
    try {
      if (!latitude || !longitude) {
        const settings = await weatherService.getSettings();
        if (!settings?.latitude || !settings?.longitude) {
          return {
            success: false,
            error: 'No location specified and no default location set'
          };
        }
        latitude = settings.latitude;
        longitude = settings.longitude;
      }

      const response = await weatherService.getCurrentWeather(latitude, longitude);
      const weather = await weatherService.getWeatherForLocation({ latitude, longitude });

      if (!weather.current) {
        return {
          success: false,
          error: 'Failed to retrieve weather data'
        };
      }

      return {
        success: true,
        data: weather.current,
        message: this.formatCurrentWeather(weather.current)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get weather'
      };
    }
  }

  async getForecast(latitude?: number, longitude?: number, days: number = 7): Promise<WeatherToolResult> {
    try {
      if (!latitude || !longitude) {
        const settings = await weatherService.getSettings();
        if (!settings?.latitude || !settings?.longitude) {
          return {
            success: false,
            error: 'No location specified and no default location set'
          };
        }
        latitude = settings.latitude;
        longitude = settings.longitude;
      }

      const weather = await weatherService.getWeatherForLocation({ latitude, longitude });

      if (!weather.daily) {
        return {
          success: false,
          error: 'Failed to retrieve forecast data'
        };
      }

      const forecast = weather.daily.slice(0, days);

      return {
        success: true,
        data: forecast,
        message: this.formatForecast(forecast)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get forecast'
      };
    }
  }

  async getHourlyForecast(latitude?: number, longitude?: number, hours: number = 24): Promise<WeatherToolResult> {
    try {
      if (!latitude || !longitude) {
        const settings = await weatherService.getSettings();
        if (!settings?.latitude || !settings?.longitude) {
          return {
            success: false,
            error: 'No location specified and no default location set'
          };
        }
        latitude = settings.latitude;
        longitude = settings.longitude;
      }

      const weather = await weatherService.getWeatherForLocation({ latitude, longitude });

      if (!weather.hourly) {
        return {
          success: false,
          error: 'Failed to retrieve hourly forecast data'
        };
      }

      const hourlyForecast = weather.hourly.slice(0, hours);

      return {
        success: true,
        data: hourlyForecast,
        message: this.formatHourlyForecast(hourlyForecast)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get hourly forecast'
      };
    }
  }

  private formatCurrentWeather(current: any): string {
    return `Current weather: ${current.condition}, ${Math.round(current.temperature)}°F. ` +
      `Wind: ${Math.round(current.wind_speed)} mph. Humidity: ${current.humidity}%. ` +
      `Pressure: ${Math.round(current.pressure)} mb.`;
  }

  private formatForecast(forecast: any[]): string {
    const days = forecast.map(day => {
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      return `${dayName}: ${day.condition}, High ${Math.round(day.temperature_max)}°F, Low ${Math.round(day.temperature_min)}°F`;
    });
    return `Forecast:\n${days.join('\n')}`;
  }

  private formatHourlyForecast(hourly: any[]): string {
    const hours = hourly.slice(0, 12).map(hour => {
      const time = new Date(hour.time);
      const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      return `${timeStr}: ${Math.round(hour.temperature)}°F, ${hour.condition}`;
    });
    return `Hourly forecast (next 12 hours):\n${hours.join('\n')}`;
  }

  getWeatherTools() {
    return [
      {
        name: 'get_current_weather',
        description: 'Get current weather conditions for a location. If no coordinates provided, uses user default location.',
        parameters: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location'
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location'
            }
          }
        }
      },
      {
        name: 'get_weather_forecast',
        description: 'Get weather forecast for upcoming days. If no coordinates provided, uses user default location.',
        parameters: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location'
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location'
            },
            days: {
              type: 'number',
              description: 'Number of days to forecast (1-16)',
              default: 7
            }
          }
        }
      },
      {
        name: 'get_hourly_forecast',
        description: 'Get hourly weather forecast. If no coordinates provided, uses user default location.',
        parameters: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location'
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location'
            },
            hours: {
              type: 'number',
              description: 'Number of hours to forecast (1-168)',
              default: 24
            }
          }
        }
      }
    ];
  }

  async handleToolCall(toolName: string, args: any): Promise<WeatherToolResult> {
    switch (toolName) {
      case 'get_current_weather':
        return this.getCurrentWeather(args.latitude, args.longitude);

      case 'get_weather_forecast':
        return this.getForecast(args.latitude, args.longitude, args.days);

      case 'get_hourly_forecast':
        return this.getHourlyForecast(args.latitude, args.longitude, args.hours);

      default:
        return {
          success: false,
          error: `Unknown weather tool: ${toolName}`
        };
    }
  }
}

export const weatherAgentService = new WeatherAgentService();
