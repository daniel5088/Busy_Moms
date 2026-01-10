/**
 * Geocoding service for converting addresses to coordinates
 */

import { getGoogleMapsApiKey } from './googleMapsKeyService';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Geocode a location string to get coordinates
 * Returns null if geocoding fails or API key is not configured
 */
export async function geocodeLocation(location: string): Promise<GeocodeResult | null> {
  if (!location || !location.trim()) {
    return null;
  }

  try {
    const apiKey = await getGoogleMapsApiKey();

    if (!apiKey) {
      console.warn('Google Maps API key not configured, skipping geocoding');
      return null;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        location
      )}&key=${apiKey}`
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };
    } else {
      console.warn('Geocoding failed:', data.status);
      return null;
    }
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

/**
 * Batch geocode multiple locations
 */
export async function geocodeLocations(
  locations: string[]
): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>();

  // Process sequentially to avoid rate limiting
  for (const location of locations) {
    if (!location || !location.trim()) continue;

    const result = await geocodeLocation(location);
    if (result) {
      results.set(location, result);
    }

    // Small delay to avoid rate limiting (40 requests per second limit)
    await new Promise((resolve) => setTimeout(resolve, 30));
  }

  return results;
}
