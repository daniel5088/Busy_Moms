import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";

declare global {
  interface Window {
    google: any;
  }
}

export function LocationAutocomplete({ value, onChange, apiKey, onSelect }) {
  const [predictions, setPredictions] = useState([]);
  const loaded = useGoogleMaps(apiKey);
  const serviceRef = useRef(null);

  useEffect(() => {
    if (!loaded || !window.google) return;

    if (!serviceRef.current) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }

    if (!value) {
      setPredictions([]);
      return;
    }

    serviceRef.current.getPlacePredictions({ input: value }, (res) => {
      setPredictions(res || []);
    });
  }, [value, loaded]);

  const handleSelect = (p) => {
    onChange(p.description);
    setPredictions([]);

    if (!onSelect) return;

    const placesService = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );

    placesService.getDetails(
      { placeId: p.place_id, fields: ["geometry.location"] },
      (details, status) => {
        if (status !== "OK" || !details?.geometry?.location) {
          onSelect({
            name: p.description,
            placeId: p.place_id,
          });
          return;
        }

        onSelect({
          name: p.description,
          placeId: p.place_id,
          lat: details.geometry.location.lat(),
          lng: details.geometry.location.lng(),
        });
      }
    );
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search for a location"
      />

      {predictions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            width: "100%",
            background: "white",
            border: "1px solid #ddd",
            zIndex: 1000,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onClick={() => handleSelect(p)}
              style={{
                padding: "8px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
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
