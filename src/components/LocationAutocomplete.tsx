import React, { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  apiKey: string;
  onChange: (v: string) => void;
  onSelect: (place: any) => void;
}

export function LocationAutocomplete({ value, apiKey, onChange, onSelect }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Google script once
  useEffect(() => {
    if ((window as any).google) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    document.body.appendChild(script);
  }, [apiKey]);

  // Fetch predictions
  async function fetchPredictions(input: string) {
    if (!(window as any).google || !input) {
      setSuggestions([]);
      return;
    }

    setLoading(true);

    const service = new (window as any).google.maps.places.AutocompleteService();

    service.getPlacePredictions(
      { input },
      (predictions: any[], status: any) => {
        setLoading(false);
        if (status === "OK" && predictions) {
          setSuggestions(predictions);
          setOpen(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }

  // Trigger API search
  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    fetchPredictions(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true); // Keep dropdown open while typing
        }}
        placeholder="Search location..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 bg-white border w-full rounded-lg mt-1 shadow-lg max-h-60 overflow-auto">
          {suggestions.map((place) => (
            <div
              key={place.place_id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                // Set the selected value
                onChange(place.description);

                // Notify parent
                onSelect(place);

                // CLOSE DROPDOWN immediately
                setOpen(false);

                // Clear suggestions
                setSuggestions([]);
              }}
            >
              {place.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
