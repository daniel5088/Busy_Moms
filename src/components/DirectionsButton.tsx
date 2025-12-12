import { useState } from 'react';
import { Navigation } from 'lucide-react';
import { DirectionsModal } from './DirectionsModal';
import { generateMapsUrl } from '../services/googleDirections';
import type { TravelMode } from '../services/googleDirections';

interface DirectionsButtonProps {
  destination: string;
  origin?: string;
  eventStartTime?: Date;
  mode?: TravelMode;
  className?: string;
  showModal?: boolean; // If true, shows detailed modal. If false, opens Google Maps directly
}

export function DirectionsButton({
  destination,
  origin,
  eventStartTime,
  mode = 'driving',
  className = '',
  showModal = true,
}: DirectionsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!destination) {
    return null;
  }

  const handleClick = () => {
    if (showModal && origin) {
      // Show detailed directions modal
      setIsModalOpen(true);
    } else {
      // Open directly in Google Maps
      const mapsUrl = generateMapsUrl(
        origin || '',
        destination,
        mode,
        eventStartTime
      );
      window.open(mapsUrl, '_blank');
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors ${className}`}
        title="Get directions"
      >
        <Navigation className="h-4 w-4 mr-2" />
        {origin ? 'Get Directions' : 'Open in Maps'}
      </button>

      {showModal && origin && (
        <DirectionsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          origin={origin}
          destination={destination}
          eventStartTime={eventStartTime}
          mode={mode}
        />
      )}
    </>
  );
}

interface QuickDirectionsButtonProps {
  destination: string;
  origin?: string;
  className?: string;
}

/**
 * Compact icon-only button that opens Google Maps directly
 */
export function QuickDirectionsButton({
  destination,
  origin,
  className = '',
}: QuickDirectionsButtonProps) {
  if (!destination) {
    return null;
  }

  const handleClick = () => {
    const mapsUrl = generateMapsUrl(origin || '', destination);
    window.open(mapsUrl, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      title={origin ? `Get directions from ${origin}` : 'Open in Google Maps'}
    >
      <Navigation className="h-4 w-4" />
    </button>
  );
}
