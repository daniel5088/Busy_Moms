/**
 * Shared weather cache key generation utility
 *
 * This ensures consistent cache keys between:
 * - Frontend (useEventWeather hook)
 * - AI Assistant (Sara)
 * - Edge function (weather-mcp)
 */

export function generateWeatherCacheKey(
  location: string,
  eventDate: string,
  eventTime?: string | null,
  unitsSystem: 'metric' | 'imperial' = 'imperial'
): string {
  // Normalize location: lowercase, replace special chars with underscores
  const normalizedLocation = location
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '_');

  // Normalize date
  const normalizedDate = eventDate.trim();

  // Normalize time: remove colons, or use 'allday'
  const normalizedTime = eventTime
    ? eventTime.trim().replace(/:/g, '')
    : 'allday';

  // Format: event_location_date_time_units
  const key = `event_${normalizedLocation}_${normalizedDate}_${normalizedTime}_${unitsSystem}`;

  return key;
}

/**
 * Parse cache key back into components (for debugging)
 */
export function parseWeatherCacheKey(key: string): {
  location: string;
  eventDate: string;
  eventTime: string;
  unitsSystem: string;
} | null {
  const pattern = /^event_(.+)_(\d{4}-\d{2}-\d{2})_([^_]+)_(metric|imperial)$/;
  const match = key.match(pattern);

  if (!match) return null;

  return {
    location: match[1],
    eventDate: match[2],
    eventTime: match[3],
    unitsSystem: match[4],
  };
}
