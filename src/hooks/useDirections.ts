/**
 * React hook for getting directions and travel time
 */

import { useState, useCallback } from 'react';
import {
  getDirections,
  getTravelTime,
  DirectionsRequest,
  DirectionsResult,
  TravelMode,
} from '../services/googleDirections';

interface UseDirectionsResult {
  directions: DirectionsResult | null;
  travelTime: {
    distance: string;
    duration: string;
    durationInTraffic?: string;
    durationMinutes: number;
  } | null;
  loading: boolean;
  error: string | null;
  fetchDirections: (request: DirectionsRequest) => Promise<void>;
  fetchTravelTime: (
    origin: string,
    destination: string,
    mode?: TravelMode,
    departureTime?: Date
  ) => Promise<void>;
  reset: () => void;
}

export function useDirections(): UseDirectionsResult {
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [travelTime, setTravelTime] = useState<{
    distance: string;
    duration: string;
    durationInTraffic?: string;
    durationMinutes: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirections = useCallback(async (request: DirectionsRequest) => {
    setLoading(true);
    setError(null);
    setDirections(null);

    try {
      const result = await getDirections(request);

      if (result.status !== 'OK') {
        setError(result.errorMessage || 'Failed to get directions');
      } else {
        setDirections(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get directions';
      setError(errorMessage);
      console.error('Error fetching directions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTravelTime = useCallback(
    async (
      origin: string,
      destination: string,
      mode: TravelMode = 'driving',
      departureTime?: Date
    ) => {
      setLoading(true);
      setError(null);
      setTravelTime(null);

      try {
        const result = await getTravelTime(origin, destination, mode, departureTime);

        if (!result) {
          setError('Could not calculate travel time');
        } else {
          setTravelTime(result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate travel time';
        setError(errorMessage);
        console.error('Error fetching travel time:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setDirections(null);
    setTravelTime(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    directions,
    travelTime,
    loading,
    error,
    fetchDirections,
    fetchTravelTime,
    reset,
  };
}
