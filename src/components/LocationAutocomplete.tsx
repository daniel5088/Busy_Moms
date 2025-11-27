import React, { useEffect, useRef, useState } from "react";

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
  onSelect?: (place: PlaceSelection) => void;
}

export function LocationAutocomplete({
  value,
  onChange,
  apiKey,
  onSelect,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const serviceRef = useRef<any | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Load Google Maps JS once
useEffect(() => {
  if (typeof window === "undefined") return;

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (window.google?.maps) {
    setLoaded(true);
    return;
  }

  if (document.getElementById("google-maps-js")) return;

  const script = document.createElement("script");
  script.id = "google-maps-js";
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => setLoaded(true);
  script.onerror = () => {
    console.error("Failed to load Google Maps script");
  };

  document.head.appendChild(script);
}, []);


  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPredictions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch predictions with debounce
  useEffect(() => {
    if (!loaded || !window.google) return;

    if (!serviceRef.current) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }

    if (!value || value.trim().length < 2) {
      setPredictions([]);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      serviceRef.current.getPlacePredictions(
        { input: value },
        (results: any[] | null, status: string) => {
          if (status !== "OK" || !results) {
            setPredictions([]);
            return;
          }

          const unique = Array.from(
            new Map(results.map((p) => [p.place_id, p])).values()
          );
          setPredictions(unique);
        }
      );
    }, 200);
  }, [value, loaded]);

  const handleSelect = (p: any) => {
    const name = p.description || "";

    // 1) set final value
    onChange(name);

    // 2) close dropdown
    setPredictions([]);

    // 3) notify parent if needed
    if (onSelect) {
      onSelect({
        name,
        placeId: p.place_id,
      });
    }
  };

  // Manual add handler
  const handleAddManually = () => {
    // Just keep current value and close the dropdown
    setPredictions([]);
    if (onSelect) {
      onSelect({
        name: value,
        placeId: "",
      });
    }
  };

  if (!loaded) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Loading location..."
        disabled
        className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-lg text-sm sm:text-base bg-gray-50"
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
        className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
      />

      {showDropdown && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm">
          {/* Add manually – only when dropdown is open */}
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
