/**
 * Google Directions API Service
 * Provides route planning, travel time estimation, and distance calculations
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';
export type TrafficModel = 'best_guess' | 'pessimistic' | 'optimistic';

export interface DirectionsRequest {
  origin: string;
  destination: string;
  mode?: TravelMode;
  departureTime?: Date;
  trafficModel?: TrafficModel;
  alternatives?: boolean;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
}

export interface RouteDetails {
  summary: string;
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
  durationInTraffic?: {
    text: string;
    value: number; // seconds
  };
  startAddress: string;
  endAddress: string;
  steps: RouteStep[];
  polyline: string; // Encoded polyline for map display
}

export interface DirectionsResult {
  routes: RouteDetails[];
  status: string;
  mapsUrl: string;
  errorMessage?: string;
}

export interface DistanceMatrixRequest {
  origins: string[];
  destinations: string[];
  mode?: TravelMode;
  departureTime?: Date;
  trafficModel?: TrafficModel;
}

export interface DistanceMatrixElement {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  durationInTraffic?: {
    text: string;
    value: number;
  };
  status: string;
}

export interface DistanceMatrixResult {
  originAddresses: string[];
  destinationAddresses: string[];
  rows: {
    elements: DistanceMatrixElement[];
  }[];
  status: string;
  errorMessage?: string;
}

/**
 * Get directions from origin to destination
 */
export async function getDirections(
  request: DirectionsRequest
): Promise<DirectionsResult> {
  const {
    origin,
    destination,
    mode = 'driving',
    departureTime,
    trafficModel = 'best_guess',
    alternatives = true,
  } = request;

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured');
  }

  if (!origin || !destination) {
    throw new Error('Origin and destination are required');
  }

  // Build URL parameters
  const params = new URLSearchParams({
    origin: origin,
    destination: destination,
    mode: mode,
    key: GOOGLE_MAPS_API_KEY,
    alternatives: alternatives.toString(),
  });

  // Add departure time for traffic-aware routing (only for driving/transit)
  if (departureTime && (mode === 'driving' || mode === 'transit')) {
    const departureTimeSeconds = Math.floor(departureTime.getTime() / 1000);
    params.append('departure_time', departureTimeSeconds.toString());

    if (mode === 'driving') {
      params.append('traffic_model', trafficModel);
    }
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return {
        routes: [],
        status: data.status,
        mapsUrl: generateMapsUrl(origin, destination, mode),
        errorMessage: getDirectionsErrorMessage(data.status),
      };
    }

    const routes: RouteDetails[] = data.routes.map((route: any) => ({
      summary: route.summary,
      distance: route.legs[0].distance,
      duration: route.legs[0].duration,
      durationInTraffic: route.legs[0].duration_in_traffic,
      startAddress: route.legs[0].start_address,
      endAddress: route.legs[0].end_address,
      steps: route.legs[0].steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
        distance: step.distance.text,
        duration: step.duration.text,
        maneuver: step.maneuver,
      })),
      polyline: route.overview_polyline.points,
    }));

    return {
      routes,
      status: data.status,
      mapsUrl: generateMapsUrl(origin, destination, mode, departureTime),
    };
  } catch (error) {
    console.error('Error fetching directions:', error);
    throw new Error('Failed to fetch directions from Google Maps API');
  }
}

/**
 * Calculate travel time and distance for multiple origin-destination pairs
 * Useful for batch calculating travel times for multiple events
 */
export async function getDistanceMatrix(
  request: DistanceMatrixRequest
): Promise<DistanceMatrixResult> {
  const {
    origins,
    destinations,
    mode = 'driving',
    departureTime,
    trafficModel = 'best_guess',
  } = request;

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key is not configured');
  }

  if (!origins.length || !destinations.length) {
    throw new Error('Origins and destinations are required');
  }

  // Build URL parameters
  const params = new URLSearchParams({
    origins: origins.join('|'),
    destinations: destinations.join('|'),
    mode: mode,
    key: GOOGLE_MAPS_API_KEY,
  });

  // Add departure time for traffic-aware calculations
  if (departureTime && (mode === 'driving' || mode === 'transit')) {
    const departureTimeSeconds = Math.floor(departureTime.getTime() / 1000);
    params.append('departure_time', departureTimeSeconds.toString());

    if (mode === 'driving') {
      params.append('traffic_model', trafficModel);
    }
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return {
        originAddresses: [],
        destinationAddresses: [],
        rows: [],
        status: data.status,
        errorMessage: getDistanceMatrixErrorMessage(data.status),
      };
    }

    return {
      originAddresses: data.origin_addresses,
      destinationAddresses: data.destination_addresses,
      rows: data.rows,
      status: data.status,
    };
  } catch (error) {
    console.error('Error fetching distance matrix:', error);
    throw new Error('Failed to fetch distance matrix from Google Maps API');
  }
}

/**
 * Get travel time for a single origin-destination pair
 * Simplified wrapper around getDistanceMatrix for single queries
 */
export async function getTravelTime(
  origin: string,
  destination: string,
  mode: TravelMode = 'driving',
  departureTime?: Date
): Promise<{
  distance: string;
  duration: string;
  durationInTraffic?: string;
  durationMinutes: number;
} | null> {
  const result = await getDistanceMatrix({
    origins: [origin],
    destinations: [destination],
    mode,
    departureTime,
  });

  if (result.status !== 'OK' || !result.rows.length) {
    return null;
  }

  const element = result.rows[0].elements[0];

  if (element.status !== 'OK') {
    return null;
  }

  return {
    distance: element.distance.text,
    duration: element.duration.text,
    durationInTraffic: element.durationInTraffic?.text,
    durationMinutes: Math.ceil(element.duration.value / 60),
  };
}

/**
 * Generate a Google Maps URL for directions
 * Opens the route in Google Maps web or mobile app
 */
export function generateMapsUrl(
  origin: string,
  destination: string,
  mode: TravelMode = 'driving',
  departureTime?: Date
): string {
  const params = new URLSearchParams({
    api: '1',
    origin: origin,
    destination: destination,
    travelmode: mode,
  });

  // Note: departure_time is not supported in the URL scheme
  // Users will see current traffic conditions when they open the link

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Calculate departure time based on event time and travel duration
 */
export function calculateDepartureTime(
  eventStartTime: Date,
  travelMinutes: number,
  bufferMinutes: number = 10
): Date {
  const departureTime = new Date(eventStartTime);
  departureTime.setMinutes(departureTime.getMinutes() - travelMinutes - bufferMinutes);
  return departureTime;
}

/**
 * Format travel time for display
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
}

/**
 * Error message helpers
 */
function getDirectionsErrorMessage(status: string): string {
  const errorMessages: Record<string, string> = {
    NOT_FOUND: 'One or more locations could not be found',
    ZERO_RESULTS: 'No route could be found between the origin and destination',
    MAX_WAYPOINTS_EXCEEDED: 'Too many waypoints provided',
    INVALID_REQUEST: 'Invalid request parameters',
    OVER_QUERY_LIMIT: 'API query limit exceeded',
    REQUEST_DENIED: 'Request denied - check API key permissions',
    UNKNOWN_ERROR: 'Unknown error occurred, please try again',
  };

  return errorMessages[status] || 'Failed to get directions';
}

function getDistanceMatrixErrorMessage(status: string): string {
  const errorMessages: Record<string, string> = {
    INVALID_REQUEST: 'Invalid request parameters',
    MAX_ELEMENTS_EXCEEDED: 'Too many origin-destination pairs',
    OVER_QUERY_LIMIT: 'API query limit exceeded',
    REQUEST_DENIED: 'Request denied - check API key permissions',
    UNKNOWN_ERROR: 'Unknown error occurred, please try again',
  };

  return errorMessages[status] || 'Failed to calculate distances';
}
