# Weather MCP Integration Guide

This guide explains how to set up and use the MCP-first weather system with Open-Meteo.

## Security Update: API Key Authentication

The weather MCP integration now requires API key authentication for enhanced security. All requests to your MCP server are authenticated using the `WEATHER_MCP_KEY` secret stored securely in Supabase.

**What's New:**
- API key authentication required for all MCP server requests
- Secrets stored securely in Supabase (never exposed to frontend)
- Both `Authorization: Bearer` and `X-API-Key` headers sent for compatibility
- Clear error messages if secrets are not configured

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│   Components    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Weather Service │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Edge Function  │
│  (weather-mcp)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   MCP Server    │
│  (open-meteo)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Open-Meteo API │
└─────────────────┘
```

## Quick Setup Checklist

- [ ] Set up and run your MCP server
- [ ] Obtain your MCP server API key
- [ ] Set `WEATHER_MCP_URL` secret in Supabase Dashboard
- [ ] Set `WEATHER_MCP_KEY` secret in Supabase Dashboard
- [ ] Verify edge function is deployed
- [ ] Test weather functionality in your app

## Setup Instructions

### 1. Set Up MCP Server

Clone and run the open-meteo-mcp server:

```bash
git clone https://github.com/cmer81/open-meteo-mcp
cd open-meteo-mcp
npm install
npm start
```

The MCP server will typically run on `http://localhost:3000`.

**Obtain Your API Key:**
1. Check your MCP server documentation for how to generate an API key
2. Some MCP servers may require registration or configuration to enable API key authentication
3. Keep your API key secure and never commit it to version control

### 2. Configure Environment Variables

Add the MCP server URL and API key to your Supabase edge function environment:

**In Supabase Dashboard:**
1. Go to **Edge Functions** > **Secrets**
2. Add the following secrets:

```bash
# Required: Your MCP server URL
WEATHER_MCP_URL=https://your-mcp-server.com

# Required: Your MCP server API key for authentication
WEATHER_MCP_KEY=your-api-key-here
```

**Important Notes:**
- The `WEATHER_MCP_KEY` is used to authenticate requests to your MCP server
- Both secrets are required for the edge function to work
- These secrets are never exposed to the frontend - all requests go through the secure edge function
- For local development, you can set these in your local `.env` file

### 3. Deploy Edge Function

The edge function `weather-mcp` has been created at:
`supabase/functions/weather-mcp/index.ts`

**Deploy via Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. The function should deploy automatically, or you can trigger a deployment

**Note:** Make sure to set the secrets (WEATHER_MCP_URL and WEATHER_MCP_KEY) BEFORE deploying the function, or redeploy after setting them.

### 4. Apply Database Migration

Run the migration to create the weather tables:

```sql
-- The migration file is at:
-- supabase/migrations/20260129000000_create_weather_system.sql

-- It creates:
-- - weather_settings (user preferences)
-- - weather_cache (cached API responses)
```

Apply via Supabase CLI or dashboard.

## Usage

### Frontend Integration

#### 1. Use the Weather Hook

```typescript
import { useWeather } from '../hooks/useWeather';

function MyComponent() {
  const { weather, settings, loading, error, updateSettings, refresh } = useWeather();

  // Weather data is automatically loaded based on user settings
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Current: {weather?.current?.temperature}°F</h2>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

#### 2. Display Weather

```typescript
import { WeatherWidget } from '../components/WeatherWidget';

function Dashboard() {
  const { weather, loading, error } = useWeather();

  return (
    <WeatherWidget
      weather={weather}
      loading={loading}
      error={error}
      locationName="New York"
      onRefresh={refresh}
    />
  );
}
```

#### 3. Configure Settings

```typescript
import { WeatherSettings } from '../components/WeatherSettings';

function Settings() {
  const { settings, updateSettings } = useWeather();

  return (
    <WeatherSettings
      settings={settings}
      onSave={updateSettings}
    />
  );
}
```

### AI Agent Integration

The weather system includes AI agent tools:

```typescript
import { weatherAgentService } from '../services/weatherAgentService';

// Get tool definitions for AI
const tools = weatherAgentService.getWeatherTools();

// Handle tool calls from AI
const result = await weatherAgentService.handleToolCall('get_current_weather', {
  latitude: 40.7128,
  longitude: -74.0060
});

console.log(result.message); // "Current weather: Clear, 72°F..."
```

### Available Tools for AI

1. **get_current_weather**
   - Get current weather conditions
   - Parameters: latitude, longitude (optional if default set)

2. **get_weather_forecast**
   - Get multi-day forecast
   - Parameters: latitude, longitude (optional), days (1-16)

3. **get_hourly_forecast**
   - Get hourly forecast
   - Parameters: latitude, longitude (optional), hours (1-168)

## API Reference

### Edge Function Endpoints

**POST** `/functions/v1/weather-mcp`

Request body:
```json
{
  "action": "get_forecast",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

Actions:
- `get_current` - Current weather
- `get_forecast` - Multi-day forecast
- `get_settings` - Get user settings
- `update_settings` - Update user settings

### Weather Service Methods

```typescript
// Get current weather
await weatherService.getCurrentWeather(lat, lon);

// Get forecast
await weatherService.getForecast(lat, lon);

// Get/update settings
await weatherService.getSettings();
await weatherService.updateSettings({ temperature_unit: 'celsius' });

// Get weather for default location
await weatherService.getWeatherForLocation();
```

## Database Schema

### weather_settings

Stores user weather preferences:
- `default_location` - City/location name
- `latitude`, `longitude` - Coordinates
- `temperature_unit` - celsius or fahrenheit
- `wind_speed_unit` - kmh, mph, ms, kn
- `precipitation_unit` - mm or inch
- `include_current`, `include_hourly`, `include_daily` - What to fetch
- `hourly_hours`, `daily_days` - Forecast ranges

### weather_cache

Caches API responses (1 hour TTL):
- `location_key` - Unique location identifier
- `weather_data` - Cached JSON response
- `expires_at` - Cache expiration

## Caching Strategy

1. Edge function checks cache before calling MCP
2. Cache key: `{lat}_{lon}` rounded to 2 decimals
3. Cache TTL: 1 hour
4. Automatic cleanup via `clean_expired_weather_cache()` function

## MCP Communication Protocol

The edge function communicates with the MCP server using:

```typescript
POST /mcp/v1/call
{
  "method": "tools/call",
  "params": {
    "name": "get-forecast",
    "arguments": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

## Troubleshooting

### MCP Server Connection Issues

1. Verify MCP server is running: `curl https://your-mcp-server.com/health`
2. Check `WEATHER_MCP_URL` environment variable is set correctly
3. Review edge function logs in Supabase dashboard

### Authentication Issues

1. **401 Unauthorized Error:**
   - Verify `WEATHER_MCP_KEY` is set correctly in Supabase secrets
   - Ensure your MCP server is configured to accept the API key
   - Check that the API key hasn't expired

2. **Missing API Key Error:**
   - Confirm `WEATHER_MCP_KEY` secret is set in Supabase Dashboard
   - Redeploy the edge function after setting secrets

3. **API Key Format:**
   - The edge function sends the API key in two formats:
     - `Authorization: Bearer <key>` header
     - `X-API-Key: <key>` header
   - Check which format your MCP server expects

### No Weather Data

1. Ensure location is set in settings
2. Check browser console for errors
3. Verify user is authenticated

### Cache Issues

Clear expired cache:
```sql
SELECT clean_expired_weather_cache();
```

Clear all cache for user:
```sql
DELETE FROM weather_cache WHERE user_id = 'user-uuid';
```

## Next Steps

1. **Customize Weather Display**: Modify `WeatherWidget.tsx` for your design
2. **Add More Locations**: Support multiple saved locations
3. **Weather Alerts**: Integrate severe weather notifications
4. **Historical Data**: Add historical weather analysis
5. **AI Insights**: Use AI to provide weather-based recommendations

## Resources

- [Open-Meteo API Docs](https://open-meteo.com/en/docs)
- [Open-Meteo MCP Server](https://github.com/cmer81/open-meteo-mcp)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
