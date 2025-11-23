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
  apiKey: string;
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const serviceRef = useRef<any | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Load Google Maps JS
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.maps) {
      setLoaded(true);
      return;
    }

    if (document.getElementById("google-maps-js")) return;

    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
    };

    document.head.appendChild(script);
  }, [apiKey]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPredictions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch predictions when value changes
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

          // De-duplicate by place_id
          const unique = Array.from(
            new Map(results.map((p) => [p.place_id, p])).values()
          );
          setPredictions(unique);
        }
      );
    }, 200);
  }, [value, loaded]);

  const blurInput = () => {
    // blur on next frame so the click still registers
    requestAnimationFrame(() => {
      inputRef.current?.blur();
    });
  };

  const handleSelect = (p: any) => {
    const name = p.description || "";

    // 1) set final value
    onChange(name);

    // 2) close dropdown
    setPredictions([]);

    // 3) blur to prevent re-opening
    blurInput();

    // 4) notify parent if needed
    if (onSelect) {
      onSelect({
        name,
        placeId: p.place_id,
      });
    }
  };

  const handleManualAdd = () => {
    // We keep whatever the user typed as-is
    setPredictions([]);
    blurInput();

    if (onSelect && value.trim()) {
      onSelect({
        name: value.trim(),
        placeId: "manual", // sentinel value
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

  const hasInput = value.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for a location"
        autoComplete="off"
        className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
      />

      {hasInput && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm">
          {/* Add manually button at the top */}
          <li
            className="px-3 py-2 bg-gray-50 text-gray-800 font-medium hover:bg-gray-100 cursor-pointer border-b border-gray-200"
            onMouseDown={(e) => {
              e.preventDefault();
              handleManualAdd();
            }}
          >
            + Add manually: <span className="font-semibold">{value}</span>
          </li>

          {/* Only show Google suggestions if we have any */}
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
