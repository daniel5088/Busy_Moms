import { useEffect, useState } from 'react';
import {
  X,
  Navigation,
  MapPin,
  Clock,
  Car,
  PersonStanding,
  Bike,
  Train,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useDirections } from '../hooks/useDirections';
import { calculateDepartureTime, formatTravelTime } from '../services/googleDirections';
import type { TravelMode } from '../services/googleDirections';
import { Button } from './ui/button';

interface DirectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  origin: string;
  destination: string;
  eventStartTime?: Date;
  mode?: TravelMode;
}

const TRAVEL_MODE_ICONS: Record<TravelMode, React.ReactNode> = {
  driving: <Car className="h-4 w-4" />,
  walking: <PersonStanding className="h-4 w-4" />,
  bicycling: <Bike className="h-4 w-4" />,
  transit: <Train className="h-4 w-4" />,
};

const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  driving: 'Driving',
  walking: 'Walking',
  bicycling: 'Bicycling',
  transit: 'Transit',
};

export function DirectionsModal({
  isOpen,
  onClose,
  origin,
  destination,
  eventStartTime,
  mode = 'driving',
}: DirectionsModalProps) {
  const { directions, loading, error, fetchDirections } = useDirections();
  const [selectedMode, setSelectedMode] = useState<TravelMode>(mode);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  useEffect(() => {
    if (isOpen && origin && destination) {
      fetchDirections({
        origin,
        destination,
        mode: selectedMode,
        departureTime: eventStartTime,
        alternatives: true,
      });
    }
  }, [isOpen, origin, destination, selectedMode, eventStartTime, fetchDirections]);

  if (!isOpen) return null;

  const selectedRoute = directions?.routes[selectedRouteIndex];

  const departureTime = selectedRoute && eventStartTime
    ? calculateDepartureTime(
        eventStartTime,
        Math.ceil(selectedRoute.duration.value / 60)
      )
    : null;

  const openInGoogleMaps = () => {
    if (directions?.mapsUrl) {
      window.open(directions.mapsUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Navigation className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Directions</h2>
                <p className="text-sm text-gray-500">Route planning</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Origin and Destination */}
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">From</p>
                <p className="text-sm font-medium text-gray-900">{origin}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">To</p>
                <p className="text-sm font-medium text-gray-900">{destination}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Travel Mode Selector */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            {(['driving', 'walking', 'bicycling', 'transit'] as TravelMode[]).map((travelMode) => (
              <button
                key={travelMode}
                onClick={() => setSelectedMode(travelMode)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  selectedMode === travelMode
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {TRAVEL_MODE_ICONS[travelMode]}
                <span className="text-sm font-medium">{TRAVEL_MODE_LABELS[travelMode]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-gray-600">Loading directions...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Unable to get directions</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && directions && directions.routes.length > 0 && (
            <div className="space-y-6">
              {/* Route Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Distance</p>
                    <p className="text-lg font-bold text-blue-900">
                      {selectedRoute?.distance.text}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Duration</p>
                    <p className="text-lg font-bold text-blue-900">
                      {selectedRoute?.durationInTraffic?.text || selectedRoute?.duration.text}
                    </p>
                    {selectedRoute?.durationInTraffic && (
                      <p className="text-xs text-blue-600">
                        (in current traffic)
                      </p>
                    )}
                  </div>
                </div>

                {eventStartTime && departureTime && (
                  <div className="flex items-center space-x-2 text-sm text-blue-800">
                    <Clock className="h-4 w-4" />
                    <span>
                      Leave by {departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' '}to arrive on time
                    </span>
                  </div>
                )}
              </div>

              {/* Alternative Routes */}
              {directions.routes.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Route Options ({directions.routes.length})
                  </h3>
                  <div className="space-y-2">
                    {directions.routes.map((route, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedRouteIndex(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          index === selectedRouteIndex
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {route.summary || `Route ${index + 1}`}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {route.distance.text} • {route.durationInTraffic?.text || route.duration.text}
                            </p>
                          </div>
                          {index === selectedRouteIndex && (
                            <ChevronRight className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Turn-by-Turn Directions */}
              {selectedRoute && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Turn-by-Turn Directions
                  </h3>
                  <div className="space-y-3">
                    {selectedRoute.steps.map((step, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-gray-700">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{step.instruction}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {step.distance} • {step.duration}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && directions && directions.routes.length === 0 && (
            <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">No routes found</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Unable to find a route between these locations. Try a different travel mode or check the addresses.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          {directions && directions.routes.length > 0 && (
            <Button
              onClick={openInGoogleMaps}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
