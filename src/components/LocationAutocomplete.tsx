import React, { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";

declare global {
  interface Window {
    google: any;
  }
}

type PlaceSelection = {
  name: string;
  placeId: string;
  lat?: number;
  lng?: number;
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  apiKey: string;
  onSelect?: (place: PlaceSelection) => void;
}

export function LocationAutocomplete({ value, onChange, apiKey, onSelect }: Props) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const loaded = useGoogleMaps(apiKey);
  const serviceRef = useRef<any | null>(null);

  useEffect(() => {
    if (!loaded || !window.google) return;

    if (!serviceRef.current) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }

    if (!value) {
      setPredictions([]);
      return;
    }

    serviceRef.current.getPlacePredictions({ input: value }, (res: any[] | null) => {
      setPredictions(res || []);
    });
  }, [value, loaded]);

  const handleSelect = (p: any) => {
    const name = p.description || "";
    onChange(name);
    setPredictions([]);

    if (!onSelect || !window.google) return;

    const placesService = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );

    placesService.getDetails(
      { placeId: p.place_id, fields: ["geometry.location", "name"] },
      (details: any, status: string) => {
        if (status !== "OK" || !details?.geometry?.location) {
          onSelect({
            name,
            placeId: p.place_id,
          });
          return;
        }

        onSelect({
          name: details.name || name,
          placeId: p.place_id,
          lat: details.geometry.location.lat(),
          lng: details.geometry.location.lng(),
        });
      }
    );
  };

  if (!loaded) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Loading location..."
        disabled
        className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-lg text-sm sm:text-base"
      />
    );
  }

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for a location"
        autoComplete="off"
        className="w-full px-3 py-2 sm:px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
      />
      {predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              className="px-3 py-2 hover:bg-purple-50 cursor-pointer"
              onClick={() => handleSelect(p)}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
