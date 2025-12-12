// src/hooks/useGoogleMaps.ts
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

export function useGoogleMaps(apiKey: string) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.google?.maps) {
      setLoaded(true);
      return;
    }

    const existing = document.getElementById('google-maps-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };

    document.head.appendChild(script);
  }, [apiKey]);

  return loaded;
}
