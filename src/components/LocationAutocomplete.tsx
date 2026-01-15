import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type PlaceSelection = {
  name: string;
  placeId: string;
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: PlaceSelection) => void;
}

export function LocationAutocomplete({ value, onChange, onSelect }: Props) {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const justSelectedRef = useRef<boolean>(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPredictions([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setPredictions([]);
      return;
    }

    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          setPredictions([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
          body: { input: value },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (error) {
          console.error('[LocationAutocomplete] Error:', error);
          setPredictions([]);
        } else if (data && data.predictions) {
          setPredictions(data.predictions);
        } else {
          setPredictions([]);
        }
      } catch (err) {
        console.error('[LocationAutocomplete] Exception:', err);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [value]);

  const handleSelect = (p: any) => {
    const name = p.description || '';

    justSelectedRef.current = true;
    onChange(name);
    setPredictions([]);

    if (onSelect) {
      onSelect({
        name,
        placeId: p.place_id,
      });
    }
  };

  const handleAddManually = () => {
    justSelectedRef.current = true;
    setPredictions([]);
    if (onSelect) {
      onSelect({
        name: value,
        placeId: '',
      });
    }
  };

  const showDropdown = predictions.length > 0 || (loading && value.trim().length >= 2);

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
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto text-sm">
          {loading && predictions.length === 0 && (
            <li className="px-3 py-2 text-gray-500 dark:text-gray-400 italic">
              Searching...
            </li>
          )}

          {!loading && value.trim().length > 0 && (
            <li
              className="px-3 py-2 text-rose-700 dark:text-rose-400 font-medium hover:bg-rose-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600"
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
              className="px-3 py-2 text-gray-900 dark:text-gray-100 hover:bg-rose-50 dark:hover:bg-gray-700 cursor-pointer"
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
