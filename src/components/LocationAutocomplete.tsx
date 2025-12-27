import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

type PlaceSelection = {
  name: string;
  placeId: string;
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  apiKey?: string;
  onSelect?: (place: PlaceSelection) => void;
}

export function LocationAutocomplete({ value, onChange, apiKey, onSelect }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Load Google Maps script ONCE, using the apiKey prop
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!apiKey) {
      console.warn(
        '[LocationAutocomplete] No Google Maps API key provided. Autocomplete disabled.'
      );
      return;
    }

    if (window.google?.maps?.places) {
      setLoaded(true);
      return;
    }

    if (document.getElementById('google-maps-js')) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      setTimeout(() => clearInterval(checkInterval), 5000);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          setLoaded(true);
          clearInterval(checkInterval);
        }
      }, 50);
      setTimeout(() => clearInterval(checkInterval), 5000);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };

    document.head.appendChild(script);
  }, [apiKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPredictions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions with debounce using NEW API
  useEffect(() => {
    if (!loaded || !window.google?.maps?.places) return;

    if (!value || value.trim().length < 2) {
      setPredictions([]);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        // Use the NEW AutocompleteSuggestion API
        const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value,
          includedPrimaryTypes: ['establishment', 'geocode'],
        });

        if (suggestions && suggestions.length > 0) {
          // Convert to format compatible with old predictions
          const formattedPredictions = suggestions.map((s: any) => ({
            description: s.placePrediction?.text?.text || '',
            place_id: s.placePrediction?.placeId || '',
          }));
          
          setPredictions(formattedPredictions);
        } else {
          setPredictions([]);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setPredictions([]);
      }
    }, 200);
  }, [value, loaded]);

  const handleSelect = (p: any) => {
    const name = p.description || '';

    onChange(name);
    setPredictions([]);

    if (onSelect) {
      onSelect({
        name,
        placeId: p.place_id,
      });
    }
  };

  // Manual add handler
  const handleAddManually = () => {
    setPredictions([]);
    if (onSelect) {
      onSelect({
        name: value,
        placeId: '',
      });
    }
  };

  // If script hasn't loaded (or key missing), fall back to plain input
  if (!loaded || !apiKey) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Event location"
        className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
      />
    );
  }

  const showDropdown = predictions.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for a location"
        autoComplete="off"
        className="w-full px-3 py-2 sm:px-4 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
      />

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm">
          {value.trim().length > 0 && (
            <li
              className="px-3 py-2 text-purple-700 font-medium hover:bg-purple-50 cursor-pointer border-b border-gray-100"
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddManually();
              }}
            >
              + Add manually: {value}
            </li>
          )}

          {predictions.map((p) => (
            <li
              key={p.place_id}
              className="px-3 py-2 hover:bg-purple-50 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(p);
              }}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}