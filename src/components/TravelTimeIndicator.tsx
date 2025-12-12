import { useEffect, useState } from 'react';
import { Car, Clock, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useDirections } from '../hooks/useDirections';
import { formatTravelTime, calculateDepartureTime } from '../services/googleDirections';
import type { TravelMode } from '../services/googleDirections';

interface TravelTimeIndicatorProps {
  origin?: string;
  destination: string;
  eventStartTime?: Date;
  cachedTravelTime?: number; // In minutes
  mode?: TravelMode;
  showDepartureTime?: boolean;
  compact?: boolean;
  className?: string;
}

export function TravelTimeIndicator({
  origin,
  destination,
  eventStartTime,
  cachedTravelTime,
  mode = 'driving',
  showDepartureTime = true,
  compact = false,
  className = '',
}: TravelTimeIndicatorProps) {
  const { travelTime, loading, error, fetchTravelTime } = useDirections();
  const [shouldFetch, setShouldFetch] = useState(false);

  // Use cached travel time if available, otherwise fetch
  const travelMinutes = travelTime?.durationMinutes ?? cachedTravelTime;

  useEffect(() => {
    // Only fetch if we don't have cached data and user has set an origin
    if (!cachedTravelTime && origin && destination && shouldFetch) {
      fetchTravelTime(origin, destination, mode, eventStartTime);
    }
  }, [shouldFetch, origin, destination, cachedTravelTime, mode, eventStartTime, fetchTravelTime]);

  if (!destination) {
    return null;
  }

  if (!origin) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 text-sm ${className}`}>
        <MapPin className="h-4 w-4" />
        <span>{destination}</span>
      </div>
    );
  }

  const departureTime = travelMinutes && eventStartTime
    ? calculateDepartureTime(eventStartTime, travelMinutes)
    : null;

  // Hover to load travel time if not cached
  const handleMouseEnter = () => {
    if (!cachedTravelTime && !travelTime && !loading) {
      setShouldFetch(true);
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center space-x-1.5 text-sm ${className}`}
        onMouseEnter={handleMouseEnter}
        title={origin ? `Travel time from ${origin}` : undefined}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin" />}
        {!loading && !error && travelMinutes && (
          <>
            <Car className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-gray-600">{formatTravelTime(travelMinutes)}</span>
          </>
        )}
        {error && <AlertCircle className="h-3.5 w-3.5 text-red-500" title={error} />}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col space-y-1 ${className}`}
      onMouseEnter={handleMouseEnter}
    >
      {/* Location */}
      <div className="flex items-center space-x-2 text-sm text-gray-700">
        <MapPin className="h-4 w-4 text-gray-500" />
        <span>{destination}</span>
      </div>

      {/* Travel Time */}
      {loading && (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Calculating travel time...</span>
        </div>
      )}

      {!loading && !error && travelMinutes && (
        <div className="flex items-center space-x-2 text-sm">
          <Car className="h-4 w-4 text-blue-600" />
          <span className="text-blue-700 font-medium">
            {formatTravelTime(travelMinutes)} from {origin.split(',')[0]}
          </span>
        </div>
      )}

      {/* Departure Time */}
      {!loading && !error && showDepartureTime && departureTime && (
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="h-4 w-4 text-orange-600" />
          <span className="text-orange-700">
            Leave by {departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs">Unable to calculate travel time</span>
        </div>
      )}
    </div>
  );
}

interface TravelTimeBadgeProps {
  travelMinutes?: number;
  className?: string;
}

/**
 * Compact badge showing just the travel time
 * Perfect for calendar grid views
 */
export function TravelTimeBadge({ travelMinutes, className = '' }: TravelTimeBadgeProps) {
  if (!travelMinutes) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium ${className}`}
    >
      <Car className="h-3 w-3" />
      <span>{formatTravelTime(travelMinutes)}</span>
    </div>
  );
}
