import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * Hook for managing dark mode preference
 * - Database is source of truth for authenticated users
 * - Falls back to localStorage → system preference
 * - null in DB means "follow system preference"
 * - Automatically migrates localStorage to DB on first login
 */
export function useDarkMode() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    // Initial state from localStorage or system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load dark mode preference from database for authenticated users
  useEffect(() => {
    let mounted = true;

    const loadDarkModePreference = async () => {
      if (!user?.id) {
        // Not authenticated: use localStorage/system preference
        setIsLoading(false);
        return;
      }

      try {
        // Fetch user's dark mode preference from database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('dark_mode')
          .eq('id', user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error('Error loading dark mode preference:', error);
          setIsLoading(false);
          return;
        }

        if (profile) {
          if (profile.dark_mode === null) {
            // null = follow system preference or migrate localStorage
            const savedMode = localStorage.getItem('darkMode');
            if (savedMode !== null) {
              // Migrate localStorage to database (one-time migration)
              const migratedValue = savedMode === 'true';
              setDarkMode(migratedValue);

              // Save to database in background
              await supabase
                .from('profiles')
                .update({ dark_mode: migratedValue })
                .eq('id', user.id);
            } else {
              // Use system preference
              const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
              setDarkMode(systemPreference);
            }
          } else {
            // Use database value
            setDarkMode(profile.dark_mode);
          }
        }
      } catch (err) {
        console.error('Error in loadDarkModePreference:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadDarkModePreference();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Always keep localStorage in sync as backup
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = async () => {
    const newValue = !darkMode;

    // Update local state immediately (no UI lag)
    setDarkMode(newValue);

    // Update localStorage (backup/fallback)
    localStorage.setItem('darkMode', String(newValue));

    // Update database for authenticated users (background)
    if (user?.id) {
      try {
        await supabase
          .from('profiles')
          .update({ dark_mode: newValue })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error saving dark mode preference:', error);
        // Don't revert the UI change - localStorage still works
      }
    }
  };

  return { darkMode, toggleDarkMode, isLoading };
}
