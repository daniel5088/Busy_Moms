import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * Custom hook to load and manage user profile
 * @returns Profile data and loading state
 */
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (mounted) {
          if (profileError) {
            setError(profileError);
          } else if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Error loading profile:', err);
          setError(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return { profile, loading, error };
}
